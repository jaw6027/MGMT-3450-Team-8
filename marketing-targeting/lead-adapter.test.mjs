import test from 'node:test';
import assert from 'node:assert/strict';
import { mapLead, mapLeads, opportunityEstimate } from './lead-adapter.mjs';
import * as A from './analytics.mjs';

// Small test-only records in Brandon's shape; not another browser demonstration store.
const legacy = { id: 'old', company: 'Fictional legacy example', industry: 'Agriculture', status: 'New', contact: '', follow: '', opportunityValue: '', notes: 'Hypothetical test only' };
const raw = [
  { ...legacy, id: 'a', leadSource: 'Referral', customerSegment: 'Growers', priority: 'High', status: 'Qualified', opportunityValue: '100', follow: '2026-11-20', productInterest: 'Reusable harvest bins' },
  { ...legacy, id: 'b', leadSource: 'Referral', customerSegment: 'Growers', priority: 'Low', opportunityValue: '0' },
  { ...legacy, id: 'c', industry: 'Manufacturing', leadSource: 'Trade Show', customerSegment: 'Equipment', status: 'Proposal', priority: 'High', opportunityValue: '200', follow: '2026-11-22' },
  { ...legacy, id: 'd', status: 'Closed', leadSource: 'Referral', opportunityValue: '999', priority: 'High', follow: '2026-11-01' },
  { ...legacy, id: 'e', industry: 'Recycling', status: 'Contacted' },
];

test('adapter maps exact Brandon fields without inventing provenance or outcomes', () => {
  const mapped = mapLead(raw[0]);
  assert.deepEqual(mapped, {
    lead_id: 'a', company_name: 'Fictional legacy example', industry: 'Agriculture',
    customer_segment: 'Growers', plastic_application_need: 'Reusable harvest bins',
    lead_source: 'Referral', lead_status: 'Qualified', priority: 'High',
    estimated_opportunity_value: 100, currency: 'USD', last_contact_date: null,
    next_follow_up_date: '2026-11-20', notes: 'Hypothetical test only', is_demo: null,
  });
  assert.equal(mapLead(raw[3]).lead_status, 'Closed');
});

test('blank estimates stay unknown and zero stays known', () => {
  for (const blank of ['', '  ', null, undefined]) assert.equal(opportunityEstimate(blank), null);
  assert.equal(opportunityEstimate('0'), 0);
  assert.equal(opportunityEstimate(' 12.50 '), 12.5);
  for (const invalid of ['invalid', '-1', Infinity, {}, true]) assert.throws(() => opportunityEstimate(invalid), /Invalid opportunity/);
});

test('legacy fields remain Unassigned, with missing estimates reported', () => {
  const mapped = mapLead(legacy);
  for (const field of ['lead_source', 'customer_segment', 'priority']) assert.equal(mapped[field], 'Unassigned');
  const summary = A.pipelineSummary([mapped]);
  assert.equal(summary.missing_estimates, 1);
  assert.equal(summary.value_available, false);
  assert.equal(A.filterLeads([mapped], { lead_source: 'Unassigned', customer_segment: 'Unassigned', priority: 'Unassigned' }).length, 1);
});

test('Closed, open, active, priority and follow-up definitions match the existing app', () => {
  const leads = mapLeads(raw);
  assert.equal(A.totalLeadCount(leads), 5);
  assert.equal(A.openLeadCount(leads), 4);
  assert.equal(A.qualifiedActiveOpportunityCount(leads), 2);
  assert.equal(A.highPriorityActiveOpportunities(leads).length, 2);
  assert.equal(A.estimatedOpenPipeline(leads), 300);
  assert.equal(A.followUpsOverdue(leads, '2026-11-22').length, 1);
  assert.equal(A.followUpsDueToday(leads, '2026-11-22').length, 1);
  assert.equal(A.openLeadsMissingFollowUp(leads).length, 2);
});

test('source, industry and customer-segment summaries use the same mapped records', () => {
  const leads = mapLeads(raw);
  const sources = A.sourcePerformanceComparison(leads);
  const referral = sources.find(row => row.lead_source === 'Referral');
  assert.equal(referral.total_leads, 3);
  assert.equal(referral.qualified_active_opportunities, 1);
  assert.equal(referral.estimated_open_pipeline, 100);
  assert.equal(A.pipelineByIndustry(leads).find(row => row.industry === 'Manufacturing').estimated_open_pipeline, 200);
  const agriculture = A.targetIndustryAnalysis(leads).find(row => row.industry === 'Agriculture');
  assert.equal(agriculture.total_leads, 3);
  assert.equal(agriculture.open_leads, 2);
  assert.equal(agriculture.active_opportunities, 1);
  assert.equal(agriculture.high_priority_open_prospects, 1);
  const growers = agriculture.segments.find(row => row.customer_segment === 'Growers');
  assert.equal(growers.total_leads, 2);
  assert.equal(growers.active_opportunities, 1);
  assert.equal(growers.estimated_open_pipeline, 100);
  assert.equal(growers.high_priority_open_prospects, 1);
  assert.equal(A.targetIndustryAnalysis(leads).find(row => row.industry === 'Recycling').missing_estimates, 1);
});

test('analytical filters combine with OR/AND and support empty results', () => {
  const leads = mapLeads(raw);
  const filtered = A.filterLeads(leads, { industry: ['Agriculture', 'Manufacturing'], lead_source: ['Referral', 'Trade Show'], priority: ['High'], lead_status: ['Qualified', 'Proposal'], customer_segment: ['Growers', 'Equipment'] });
  assert.deepEqual(filtered.map(row => row.lead_id), ['a', 'c']);
  assert.equal(A.estimatedOpenPipeline(filtered), 300);
  const empty = A.filterLeads(leads, { customer_segment: 'No such segment' });
  assert.deepEqual(A.sourcePerformanceComparison(empty), []);
  assert.deepEqual(A.targetIndustryAnalysis(empty), []);
  assert.equal(A.pipelineSummary(empty).open_leads, 0);
});

test('mapping, filtering and targeting do not mutate original application records', () => {
  const input = structuredClone(raw);
  const before = structuredClone(input);
  const mapped = mapLeads(input);
  A.filterLeads(mapped, { priority: 'High' });
  A.targetIndustryAnalysis(mapped);
  assert.deepEqual(input, before);
  mapped[0].company_name = 'Changed mapped copy';
  assert.deepEqual(input, before);
});

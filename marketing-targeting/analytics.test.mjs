import test from 'node:test';
import assert from 'node:assert/strict';
import { demoLeads, DEMO_REFERENCE_DATE as DATE } from './demo-leads.mjs';
import * as analytics from './analytics.mjs';

const ids = leads => leads.map(lead => lead.lead_id);
const changed = (id, overrides) => ({ ...demoLeads.find(lead => lead.lead_id === id), ...overrides });

test('all 18 fictional records have shared fields and preserve unknown information', () => {
  const fields = ['lead_id', 'company_name', 'industry', 'customer_segment', 'plastic_application_need', 'lead_source', 'lead_status', 'priority', 'estimated_opportunity_value', 'currency', 'last_contact_date', 'next_follow_up_date', 'is_demo', 'domino_relevance', 'plastic_use_fit', 'fit_reason', 'priority_reason', 'relationship_type', 'next_action'];
  assert.equal(demoLeads.length, 18);
  assert.equal(new Set(ids(demoLeads)).size, 18);
  for (const lead of demoLeads) {
    for (const field of fields) assert.ok(Object.hasOwn(lead, field), `${lead.lead_id}: ${field}`);
    assert.equal(lead.is_demo, true);
    assert.equal(lead.currency, 'USD');
    assert.ok(lead.company_name.startsWith('Demo '));
    assert.notEqual(lead.plastic_use_fit, 'Strong');
  }
  assert.equal(demoLeads.filter(lead => lead.plastic_use_fit === 'Possible').length, 3);
  assert.ok(demoLeads.filter(lead => lead.industry === 'Recycling').every(lead => lead.relationship_type === 'Undetermined'));
  assert.equal(changed('L04', {}).last_contact_date, null);
});

test('approved Marketing Analytics baseline', () => {
  assert.equal(analytics.totalLeadCount(demoLeads), 18);
  assert.equal(analytics.openLeadCount(demoLeads), 15);
  assert.equal(analytics.qualifiedActiveOpportunityCount(demoLeads), 8);
  assert.equal(analytics.estimatedOpenPipeline(demoLeads), 658000);
  assert.equal(analytics.highPriorityActiveOpportunities(demoLeads).length, 7);
  assert.equal(analytics.followUpsOverdue(demoLeads, DATE).length, 4);
  assert.equal(analytics.followUpsDueToday(demoLeads, DATE).length, 3);
  assert.equal(analytics.openLeadsMissingFollowUp(demoLeads).length, 2);
});

test('complete industry pipeline and source comparison agree with approved totals', () => {
  const industries = Object.fromEntries(analytics.pipelineByIndustry(demoLeads).map(row => [row.industry, row.estimated_open_pipeline]));
  assert.deepEqual(industries, { Agriculture: 140000, Recycling: 155000, Manufacturing: 190000, Packaging: 73000, Construction: 50000, Logistics: 18000, 'Healthcare Supplies': 32000 });
  const sources = Object.fromEntries(analytics.sourcePerformanceComparison(demoLeads).map(row => [row.lead_source, [row.total_leads, row.qualified_active_opportunities, row.estimated_open_pipeline]]));
  assert.deepEqual(sources, {
    Referral: [3, 2, 120000], 'Website Inquiry': [4, 1, 141000], 'Trade Show': [3, 2, 105000],
    'Email Outreach': [3, 0, 45000], 'Social Media': [2, 0, 52000], 'Direct Outreach': [3, 3, 195000],
  });
  assert.equal(analytics.pipelineByLeadSource(demoLeads).reduce((sum, row) => sum + row.estimated_open_pipeline, 0), 658000);
});

test('marketing insights are derived from supplied records', () => {
  const result = analytics.marketingInsights(demoLeads, DATE);
  assert.deepEqual(result.highest_value_industry, { names: ['Manufacturing'], value: 190000 });
  assert.deepEqual(result.highest_value_source, { names: ['Direct Outreach'], value: 195000 });
  assert.deepEqual(result.most_leads_source, { names: ['Website Inquiry'], value: 4 });
  assert.deepEqual(result.follow_ups, { overdue: 4, due_today: 3, unscheduled: 2 });
  const subset = analytics.filterLeads(demoLeads, { industry: 'Agriculture' });
  assert.deepEqual(analytics.marketingInsights(subset, DATE).highest_value_industry, { names: ['Agriculture'], value: 140000 });
});

test('relationship selection shares records and excludes closed follow-ups', () => {
  assert.deepEqual(ids(analytics.highPriorityAgricultureProspects(demoLeads)), ['L01', 'L03']);
  assert.deepEqual(ids(analytics.prospectsNeedingFollowUp(demoLeads, DATE)), ['L01', 'L03', 'L05', 'L07', 'L09', 'L14', 'L16']);
  assert.deepEqual(ids(analytics.openLeadsMissingFollowUp(demoLeads)), ['L04', 'L11']);
  const closed = [changed('L08', { next_follow_up_date: '2026-11-01' }), changed('L12', { next_follow_up_date: DATE })];
  assert.deepEqual(analytics.prospectsNeedingFollowUp(closed, DATE), []);
  assert.deepEqual(analytics.openTargetProspects(closed), []);
});

test('shared filters use OR within selections and AND across fields', () => {
  const selected = analytics.filterLeads(demoLeads, {
    industry: ['Agriculture', 'Recycling'], priority: ['High'], lead_status: ['Qualified', 'Proposal'],
  });
  assert.deepEqual(ids(selected), ['L01', 'L03', 'L05', 'L06']);
  assert.deepEqual(ids(analytics.filterLeads(demoLeads, { customer_segment: ['Greenhouse operations'], lead_source: ['Trade Show'] })), ['L03']);
  assert.deepEqual(ids(analytics.filterLeads(demoLeads, { plastic_use_fit: 'Possible', follow_up_state: ['overdue', 'due_today'] }, DATE)), ['L01', 'L05']);
  assert.equal(analytics.filterLeads(demoLeads, { industry: [] }).length, 18);
  assert.equal(analytics.filterLeads(demoLeads, { industry: 'Nonexistent' }).length, 0);
  assert.equal(analytics.estimatedOpenPipeline(analytics.filterLeads(demoLeads, { lead_status: ['Won', 'Lost'] })), 0);
});

test('follow-up states respect calendar boundaries and reject malformed dates', () => {
  assert.equal(analytics.followUpState(changed('L01', { next_follow_up_date: '2026-11-21' }), DATE), 'overdue');
  assert.equal(analytics.followUpState(changed('L01', { next_follow_up_date: DATE }), DATE), 'due_today');
  assert.equal(analytics.followUpState(changed('L01', { next_follow_up_date: '2026-11-23' }), DATE), 'upcoming');
  assert.equal(analytics.followUpState(changed('L04', {}), DATE), 'unscheduled');
  assert.throws(() => analytics.followUpState(demoLeads[0], '2026-02-30'), /valid YYYY-MM-DD/);
  assert.throws(() => analytics.followUpState(changed('L01', { next_follow_up_date: '2026-11-31' }), DATE), /valid YYYY-MM-DD/);
  assert.throws(() => analytics.filterLeads([], { follow_up_state: 'overdue' }), /valid YYYY-MM-DD/);
  assert.throws(() => analytics.filterLeads([], { typo: 'High' }), /Unsupported filter/);
});

test('unknown estimates differ from zero, and currencies are never mixed', () => {
  const unknown = [changed('L01', { estimated_opportunity_value: null })];
  assert.deepEqual(analytics.pipelineSummary(unknown), { estimated_open_pipeline: 0, currency: 'USD', open_leads: 1, missing_estimates: 1, value_available: false });
  assert.equal(analytics.pipelineSummary([changed('L01', { estimated_opportunity_value: 0 })]).value_available, true);
  assert.equal(analytics.pipelineSummary([...unknown, demoLeads[1]]).estimated_open_pipeline, 25000);
  assert.equal(analytics.pipelineSummary([...unknown, demoLeads[1]]).missing_estimates, 1);
  assert.throws(() => analytics.estimatedOpenPipeline([changed('L01', { currency: 'EUR' })]), /Expected USD/);
  assert.equal(analytics.estimatedOpenPipeline([changed('L01', { currency: 'EUR' })], 'EUR'), 40000);
  for (const value of [-1, NaN, Infinity, '40000']) {
    assert.throws(() => analytics.estimatedOpenPipeline([changed('L01', { estimated_opportunity_value: value })]), /nonnegative finite/);
  }
  assert.equal(analytics.estimatedOpenPipeline([changed('L01', { estimated_opportunity_value: 0.1 }), changed('L02', { estimated_opportunity_value: 0.2 })]), 0.3);
});

test('ties and empty or zero-value inputs do not invent winners', () => {
  const tied = [changed('L01', { estimated_opportunity_value: 10 }), changed('L05', { estimated_opportunity_value: 10 })];
  assert.deepEqual(analytics.industryWithHighestOpenOpportunity(tied), { names: ['Agriculture', 'Recycling'], value: 10 });
  assert.deepEqual(analytics.sourceGeneratingMostLeads([demoLeads[0], demoLeads[1]]), { names: ['Referral', 'Website Inquiry'], value: 1 });
  assert.deepEqual(analytics.industryWithHighestOpenOpportunity([changed('L01', { estimated_opportunity_value: 0 })]), { names: [], value: null });
  assert.deepEqual(analytics.industryWithHighestOpenOpportunity([]), { names: [], value: null });
  assert.deepEqual(analytics.sourceGeneratingMostLeads([]), { names: [], value: null });
  assert.equal(analytics.totalLeadCount([]), 0);
  assert.equal(analytics.estimatedOpenPipeline([]), 0);
  assert.deepEqual(analytics.sourcePerformanceComparison([]), []);
});

test('fit insights distinguish missing information from labelled Unknown fit', () => {
  const absent = [changed('L04', { plastic_use_fit: null })];
  assert.deepEqual(analytics.prospectsNeedingQualification(absent), { available: false, count: null, leads: [], missing_fit_count: 1 });
  const result = analytics.prospectsNeedingQualification(demoLeads);
  assert.equal(result.available, true);
  assert.deepEqual(ids(result.leads), ['L02', 'L04', 'L07', 'L11', 'L14', 'L17', 'L18']);
  assert.equal(result.count, 7);
  assert.equal(analytics.prospectsNeedingQualification([changed('L04', { plastic_use_fit: 'Strong' })]).count, 0);
  assert.equal(analytics.strongFitProspectsNeedingContact(absent, DATE).count, null);
  assert.equal(analytics.strongFitProspectsNeedingContact(demoLeads, DATE).count, 0);
  const strong = [changed('L01', { plastic_use_fit: 'Strong' }), changed('L04', { plastic_use_fit: 'Strong' }), changed('L06', { plastic_use_fit: 'Strong' })];
  assert.deepEqual(ids(analytics.strongFitProspectsNeedingContact(strong, DATE).leads), ['L01', 'L04']);
  const insights = analytics.relationshipInsights(demoLeads, DATE);
  assert.equal(insights.high_priority_agriculture.length, 2);
  assert.equal(insights.follow_ups_needed.length, 7);
  assert.equal(insights.missing_follow_up.length, 2);
});

test('duplicate IDs cannot inflate metrics and conflicting copies fail explicitly', () => {
  assert.equal(analytics.totalLeadCount([...demoLeads, { ...demoLeads[0] }]), 18);
  assert.equal(analytics.estimatedOpenPipeline([...demoLeads, demoLeads[0]]), 658000);
  assert.throws(() => analytics.totalLeadCount([...demoLeads, changed('L01', { priority: 'Low' })]), /Conflicting copies/);
  assert.throws(() => analytics.totalLeadCount([{ lead_id: '' }]), /nonempty lead_id/);
});

test('functions do not mutate supplied records or arrays', () => {
  const input = structuredClone(demoLeads);
  const before = structuredClone(input);
  analytics.filterLeads(input, { industry: 'Agriculture' });
  analytics.marketingInsights(input, DATE);
  analytics.relationshipInsights(input, DATE);
  assert.deepEqual(input, before);
  assert.ok(Object.isFrozen(demoLeads));
  assert.ok(demoLeads.every(Object.isFrozen));
});

test('target workload summary retains approved relationship baseline', () => {
  assert.deepEqual(analytics.targetCustomerSummary(demoLeads, DATE), {
    open_target_prospects: 15,
    high_priority_open_prospects: 7,
    overdue_follow_ups: 4,
    due_today_follow_ups: 3,
    unscheduled_follow_ups: 2,
  });
  assert.equal(analytics.filterTargetProspects(demoLeads).length, 15);
  assert.deepEqual(analytics.filterTargetProspects(demoLeads, { lead_status: ['Won', 'Lost'] }), []);
  // All-record filtering still allows closed records for historical views.
  assert.equal(analytics.filterLeads(demoLeads, { lead_status: ['Won', 'Lost'] }).length, 3);
});

test('company search and relationship filters combine with all shared selections', () => {
  assert.deepEqual(ids(analytics.filterTargetProspects(demoLeads, {
    company_search: ['  AMBER acre ', 'Loopstone'],
    industry: ['Agriculture', 'Recycling'],
    priority: ['High'], lead_status: ['Qualified', 'Proposal'],
    customer_segment: ['Irrigation equipment', 'Plastics reclamation'],
    lead_source: ['Referral'], plastic_use_fit: ['Possible'],
    follow_up_state: ['overdue'], relationship_type: ['Potential customer', 'Undetermined'],
  }, DATE)), ['L01', 'L05']);
  assert.deepEqual(ids(analytics.filterTargetProspects(demoLeads, { company_search: 'loopstone', relationship_type: 'Potential customer' })), []);
  assert.equal(analytics.filterTargetProspects(demoLeads, { company_search: '  ' }).length, 15);
  assert.equal(analytics.filterTargetProspects(demoLeads, { company_search: 'missing company' }).length, 0);
  assert.equal(analytics.filterTargetProspects([changed('L01', { company_name: null })], { company_search: 'amber' }).length, 0);
});

test('default target sorting follows priority, state, then earliest date', () => {
  assert.deepEqual(ids(analytics.sortTargetProspects(demoLeads, DATE)), [
    'L05', 'L01', 'L09', 'L03', 'L06', 'L13', 'L10',
    'L14', 'L07', 'L16', 'L11', 'L02', 'L18', 'L04', 'L17',
  ]);
  // A later High-priority date still precedes an earlier Medium-priority date.
  const varied = [changed('L01', { next_follow_up_date: '2026-11-21' }), changed('L14', { next_follow_up_date: '2026-11-01' })];
  assert.deepEqual(ids(analytics.sortTargetProspects(varied, DATE)), ['L01', 'L14']);
});

test('follow-up-first sorting places urgency before priority', () => {
  assert.deepEqual(ids(analytics.sortTargetProspects(demoLeads, DATE, 'follow_up_first')), [
    'L05', 'L01', 'L09', 'L14', 'L03', 'L07', 'L16',
    'L11', 'L04', 'L06', 'L13', 'L10', 'L02', 'L18', 'L17',
  ]);
  const varied = [demoLeads[5], demoLeads[13]];
  assert.deepEqual(ids(analytics.sortTargetProspects(varied, DATE, 'follow_up_first')), ['L14', 'L06']);
  assert.throws(() => analytics.sortTargetProspects([], DATE, 'invalid'), /Sorting mode/);
  assert.throws(() => analytics.sortTargetProspects([changed('L01', { next_follow_up_date: '2026-02-30' })], DATE), /valid YYYY-MM-DD/);
});

test('segment summaries are derived from open shared records and preserve value availability', () => {
  const summaries = analytics.targetSegmentSummaries(demoLeads, DATE);
  assert.deepEqual(summaries.map(row => [row.industry, row.open_leads, row.high_priority_open_prospects, row.estimated_open_pipeline, row.needing_follow_up]), [
    ['Agriculture', 4, 2, 140000, 2],
    ['Recycling', 3, 2, 155000, 2],
    ['Manufacturing', 3, 2, 190000, 1],
  ]);
  assert.ok(summaries.every(row => row.description.includes('Potential targets')));
  const filtered = analytics.targetSegmentSummaries(analytics.filterLeads(demoLeads, { priority: 'High' }), DATE);
  assert.equal(filtered[0].open_leads, 2);
  assert.equal(filtered[0].estimated_open_pipeline, 100000);
  const unknown = analytics.targetSegmentSummaries([changed('L01', { estimated_opportunity_value: null })], DATE);
  assert.equal(unknown[0].value_available, false);
  assert.equal(unknown[0].missing_estimates, 1);
  assert.equal(unknown[1].open_leads, 0);
  assert.equal(analytics.filterTargetProspects(demoLeads, { industry: 'Packaging' }).length, 2);
});

test('prospect detail model exposes relationship fields and explicit hypothetical status', () => {
  const detail = analytics.prospectDetailViewModel(demoLeads[0], DATE);
  for (const field of ['company_name', 'industry', 'customer_segment', 'plastic_application_need', 'domino_relevance', 'plastic_use_fit', 'fit_reason', 'priority', 'priority_reason', 'lead_source', 'relationship_type', 'lead_status', 'estimated_opportunity_value', 'last_contact_date', 'next_follow_up_date', 'next_action']) {
    assert.equal(detail[field], demoLeads[0][field]);
  }
  assert.equal(detail.follow_up_state, 'overdue');
  assert.equal(detail.is_demo, true);
  assert.equal(detail.demonstration_status, 'hypothetical');
  assert.match(detail.demonstration_notice, /not actual Domino Plastics customer information/);
  assert.equal(analytics.prospectDetailViewModel(demoLeads[7], DATE).follow_up_state, 'closed');
  const missing = analytics.prospectDetailViewModel({ lead_status: 'New' }, DATE);
  assert.equal(missing.last_contact_date, null);
  assert.equal(missing.estimated_opportunity_value, null);
  assert.equal(missing.plastic_use_fit, null);
  assert.equal(missing.is_demo, null);
  assert.equal(missing.demonstration_status, 'unknown');
  assert.equal(missing.demonstration_notice, null);
  assert.equal(analytics.prospectDetailViewModel({ lead_status: 'New', is_demo: false }, DATE).demonstration_status, 'not_marked_demo');
});

test('target filtering, sorting, summaries, and details never mutate source data', () => {
  const input = structuredClone(demoLeads);
  const before = structuredClone(input);
  analytics.filterTargetProspects(input, { company_search: 'Demo', relationship_type: 'Undetermined' });
  const sorted = analytics.sortTargetProspects(input, DATE);
  analytics.sortTargetProspects(input, DATE, 'follow_up_first');
  analytics.targetCustomerSummary(input, DATE);
  analytics.targetSegmentSummaries(input, DATE);
  const detail = analytics.prospectDetailViewModel(input[0], DATE);
  detail.company_name = 'Changed detail copy';
  assert.notEqual(sorted, input);
  assert.deepEqual(input, before);
  assert.deepEqual(analytics.sortTargetProspects([], DATE), []);
  assert.equal(analytics.targetCustomerSummary([], DATE).open_target_prospects, 0);
});

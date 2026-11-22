/** Pure analytics over supplied lead records. No demo import, UI, I/O, or clock. */
const OPEN = new Set(['New', 'Contacted', 'Qualified', 'Proposal']);
const ACTIVE = new Set(['Qualified', 'Proposal']);
const FIT = new Set(['Strong', 'Possible', 'Unknown']);

// A repeated ID is counted once. Reject conflicting copies instead of guessing.
function uniqueLeads(leads) {
  const unique = new Map();
  for (const lead of leads) {
    if (typeof lead.lead_id !== 'string' || !lead.lead_id.trim()) {
      throw new TypeError('Every lead needs a nonempty lead_id.');
    }
    if (unique.has(lead.lead_id)) {
      const existing = unique.get(lead.lead_id);
      const keys = new Set([...Object.keys(existing), ...Object.keys(lead)]);
      if ([...keys].some(key => existing[key] !== lead[key])) {
        throw new TypeError(`Conflicting copies of lead ${lead.lead_id}.`);
      }
    } else unique.set(lead.lead_id, lead);
  }
  return [...unique.values()];
}

function dateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TypeError('Dates must be valid YYYY-MM-DD strings.');
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new TypeError('Dates must be valid YYYY-MM-DD strings.');
  }
  return value;
}

export function openTargetProspects(leads) {
  return uniqueLeads(leads).filter(lead => OPEN.has(lead.lead_status));
}

export function followUpState(lead, referenceDate) {
  const today = dateOnly(referenceDate);
  if (!OPEN.has(lead.lead_status)) return 'closed';
  if (lead.next_follow_up_date == null || lead.next_follow_up_date === '') return 'unscheduled';
  const next = dateOnly(lead.next_follow_up_date);
  return next < today ? 'overdue' : next === today ? 'due_today' : 'upcoming';
}

/** Arrays (or a single value) per field: OR within a field, AND across fields.
 * Empty selections impose no restriction. Missing fit is not the 'Unknown' label.
 */
export function filterLeads(leads, filters = {}, referenceDate) {
  const allowed = ['industry', 'customer_segment', 'lead_source', 'lead_status', 'priority', 'plastic_use_fit', 'follow_up_state'];
  for (const field of Object.keys(filters)) {
    if (!allowed.includes(field)) throw new TypeError(`Unsupported filter: ${field}`);
  }
  const followUp = filters.follow_up_state;
  if (followUp != null && (!Array.isArray(followUp) || followUp.length)) dateOnly(referenceDate);
  return uniqueLeads(leads).filter(lead => Object.entries(filters).every(([field, selection]) => {
    if (selection == null) return true;
    const values = Array.isArray(selection) ? selection : [selection];
    if (!values.length) return true;
    const value = field === 'follow_up_state' ? followUpState(lead, referenceDate) : lead[field];
    return values.includes(value);
  }));
}

export const totalLeadCount = leads => uniqueLeads(leads).length;
export const openLeadCount = leads => openTargetProspects(leads).length;
export const qualifiedActiveOpportunities = leads => uniqueLeads(leads).filter(lead => ACTIVE.has(lead.lead_status));
export const qualifiedActiveOpportunityCount = leads => qualifiedActiveOpportunities(leads).length;
export const highPriorityActiveOpportunities = leads => qualifiedActiveOpportunities(leads).filter(lead => lead.priority === 'High');

// Currency is explicit: never silently combine USD with other currencies.
export function estimatedOpenPipeline(leads, currency = 'USD') {
  let cents = 0;
  for (const lead of openTargetProspects(leads)) {
    const value = lead.estimated_opportunity_value;
    if (value == null) continue;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new TypeError('Opportunity estimates must be nonnegative finite numbers or null.');
    }
    if (lead.currency !== currency) throw new TypeError(`Expected ${currency}; filter currencies before aggregation.`);
    cents += Math.round(value * 100);
  }
  return cents / 100;
}

export const followUpsOverdue = (leads, date) => filterLeads(leads, { follow_up_state: 'overdue' }, date);
export const followUpsDueToday = (leads, date) => filterLeads(leads, { follow_up_state: 'due_today' }, date);
export const openLeadsMissingFollowUp = leads => openTargetProspects(leads).filter(lead => lead.next_follow_up_date == null || lead.next_follow_up_date === '');
export const prospectsNeedingFollowUp = (leads, date) => filterLeads(leads, { follow_up_state: ['overdue', 'due_today'] }, date);
export const highPriorityAgricultureProspects = leads => filterLeads(openTargetProspects(leads), { industry: 'Agriculture', priority: 'High' });

export function pipelineSummary(leads, currency = 'USD') {
  const open = openTargetProspects(leads);
  const missing = open.filter(lead => lead.estimated_opportunity_value == null).length;
  return {
    estimated_open_pipeline: estimatedOpenPipeline(open, currency),
    currency,
    open_leads: open.length,
    missing_estimates: missing,
    value_available: open.length === 0 || missing < open.length,
  };
}

function groups(leads, field) {
  const result = new Map();
  for (const lead of uniqueLeads(leads)) {
    const key = lead[field] || 'Unspecified';
    if (!result.has(key)) result.set(key, []);
    result.get(key).push(lead);
  }
  return [...result].sort(([a], [b]) => a.localeCompare(b));
}

export const pipelineByLeadSource = (leads, currency = 'USD') => groups(leads, 'lead_source').map(([lead_source, records]) => ({ lead_source, ...pipelineSummary(records, currency) }));
export const pipelineByIndustry = (leads, currency = 'USD') => groups(leads, 'industry').map(([industry, records]) => ({ industry, ...pipelineSummary(records, currency) }));
export const sourcePerformanceComparison = (leads, currency = 'USD') => groups(leads, 'lead_source').map(([lead_source, records]) => ({
  lead_source,
  total_leads: totalLeadCount(records),
  qualified_active_opportunities: qualifiedActiveOpportunityCount(records),
  ...pipelineSummary(records, currency),
}));

// Structured results let Brandon's application choose its own wording and UI.
// Include every tie. Zero/unknown values do not produce a 'highest' claim.
function leaders(rows, nameField, valueField) {
  const value = rows.reduce((max, row) => Math.max(max, row[valueField]), 0);
  return { names: value > 0 ? rows.filter(row => row[valueField] === value).map(row => row[nameField]) : [], value: value > 0 ? value : null };
}

export const industryWithHighestOpenOpportunity = (leads, currency = 'USD') => leaders(pipelineByIndustry(leads, currency), 'industry', 'estimated_open_pipeline');
export const sourceWithHighestOpenOpportunity = (leads, currency = 'USD') => leaders(pipelineByLeadSource(leads, currency), 'lead_source', 'estimated_open_pipeline');
export const sourceGeneratingMostLeads = leads => leaders(groups(leads, 'lead_source').map(([lead_source, records]) => ({ lead_source, total_leads: records.length })), 'lead_source', 'total_leads');

/** Missing fit cannot support this calculation; explicitly labelled Unknown can. */
export function prospectsNeedingQualification(leads) {
  const early = filterLeads(leads, { lead_status: ['New', 'Contacted'] });
  const assessed = early.filter(lead => FIT.has(lead.plastic_use_fit));
  const matches = assessed.filter(lead => ['Possible', 'Unknown'].includes(lead.plastic_use_fit));
  return {
    available: assessed.length > 0,
    count: assessed.length > 0 ? matches.length : null,
    leads: matches,
    missing_fit_count: early.length - assessed.length,
  };
}

export function strongFitProspectsNeedingContact(leads, date) {
  dateOnly(date);
  const open = openTargetProspects(leads);
  const populated = open.filter(lead => FIT.has(lead.plastic_use_fit));
  const matches = filterLeads(populated, { plastic_use_fit: 'Strong', follow_up_state: ['overdue', 'due_today', 'unscheduled'] }, date);
  return {
    available: populated.length > 0,
    count: populated.length > 0 ? matches.length : null,
    leads: matches,
    missing_fit_count: open.length - populated.length,
  };
}

export function marketingInsights(leads, referenceDate, currency = 'USD') {
  dateOnly(referenceDate);
  return {
    highest_value_industry: industryWithHighestOpenOpportunity(leads, currency),
    highest_value_source: sourceWithHighestOpenOpportunity(leads, currency),
    most_leads_source: sourceGeneratingMostLeads(leads),
    high_priority_active_count: highPriorityActiveOpportunities(leads).length,
    follow_ups: {
      overdue: followUpsOverdue(leads, referenceDate).length,
      due_today: followUpsDueToday(leads, referenceDate).length,
      unscheduled: openLeadsMissingFollowUp(leads).length,
    },
  };
}

export function relationshipInsights(leads, referenceDate, currency = 'USD') {
  dateOnly(referenceDate);
  return {
    high_priority_agriculture: highPriorityAgricultureProspects(leads),
    follow_ups_needed: prospectsNeedingFollowUp(leads, referenceDate),
    missing_follow_up: openLeadsMissingFollowUp(leads),
    highest_value_industry: industryWithHighestOpenOpportunity(leads, currency),
    strong_fit_needing_contact: strongFitProspectsNeedingContact(leads, referenceDate),
    needing_qualification: prospectsNeedingQualification(leads),
  };
}

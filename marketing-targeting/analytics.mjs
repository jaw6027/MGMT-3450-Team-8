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
  const allowed = ['company_search', 'industry', 'customer_segment', 'lead_source', 'lead_status', 'priority', 'plastic_use_fit', 'follow_up_state', 'relationship_type'];
  for (const field of Object.keys(filters)) {
    if (!allowed.includes(field)) throw new TypeError(`Unsupported filter: ${field}`);
  }
  const followUp = filters.follow_up_state;
  if (followUp != null && (!Array.isArray(followUp) || followUp.length)) dateOnly(referenceDate);
  return uniqueLeads(leads).filter(lead => Object.entries(filters).every(([field, selection]) => {
    if (selection == null) return true;
    const values = Array.isArray(selection) ? selection : [selection];
    if (!values.length) return true;
    if (field === 'company_search') {
      const company = (lead.company_name ?? '').toLowerCase();
      return values.some(term => company.includes(String(term).trim().toLowerCase()));
    }
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

/** The default relationship workload always excludes Won/Lost prospects. */
export function filterTargetProspects(leads, filters = {}, referenceDate) {
  return filterLeads(openTargetProspects(leads), filters, referenceDate);
}

/** Returns a new open-prospect array; stable ID breaks otherwise equal ties.
 * Priority is considered before follow-up date in both modes. In follow-up-first
 * mode, the follow-up category is considered before priority.
 */
export function sortTargetProspects(leads, referenceDate, mode = 'priority_first') {
  dateOnly(referenceDate);
  if (!['priority_first', 'follow_up_first'].includes(mode)) {
    throw new TypeError('Sorting mode must be priority_first or follow_up_first.');
  }
  const priorityRank = { High: 0, Medium: 1, Low: 2 };
  const followUpRank = { overdue: 0, due_today: 1, unscheduled: 2, upcoming: 3 };
  // Compute and validate states before sorting, including single-record inputs.
  const ranked = openTargetProspects(leads).map(lead => ({
    lead,
    priority: priorityRank[lead.priority] ?? 3,
    followUp: followUpRank[followUpState(lead, referenceDate)],
  }));
  ranked.sort((a, b) => {
    const priority = a.priority - b.priority;
    const followUp = a.followUp - b.followUp;
    const groupOrder = mode === 'follow_up_first' ? followUp || priority : priority || followUp;
    if (groupOrder) return groupOrder;
    const dateOrder = (a.lead.next_follow_up_date || '').localeCompare(b.lead.next_follow_up_date || '');
    return dateOrder || a.lead.lead_id.localeCompare(b.lead.lead_id);
  });
  return ranked.map(item => item.lead);
}

export function targetCustomerSummary(leads, referenceDate) {
  dateOnly(referenceDate);
  const open = openTargetProspects(leads);
  return {
    open_target_prospects: open.length,
    high_priority_open_prospects: filterLeads(open, { priority: 'High' }).length,
    overdue_follow_ups: followUpsOverdue(open, referenceDate).length,
    due_today_follow_ups: followUpsDueToday(open, referenceDate).length,
    unscheduled_follow_ups: openLeadsMissingFollowUp(open).length,
  };
}

// Descriptions explain potential targeting categories, not verified capabilities.
const TARGET_SEGMENTS = [
  ['Agriculture', 'Potential targets include irrigation, crop, and greenhouse businesses using plastic parts or containers; suitability requires verification.'],
  ['Recycling', 'Potential targets include reclaimers and material processors; customer, supplier, or partnership direction requires clarification.'],
  ['Manufacturing', 'Potential targets include businesses using plastic components or handling products; material and production fit require verification.'],
];

export function targetSegmentSummaries(leads, referenceDate, currency = 'USD') {
  dateOnly(referenceDate);
  return TARGET_SEGMENTS.map(([industry, description]) => {
    const open = filterTargetProspects(leads, { industry }, referenceDate);
    return {
      industry,
      ...pipelineSummary(open, currency),
      high_priority_open_prospects: filterLeads(open, { priority: 'High' }).length,
      needing_follow_up: prospectsNeedingFollowUp(open, referenceDate).length,
      description,
    };
  });
}

/** Data only. Missing information stays null; an unmarked record is not
 * evidence of an actual customer. Follow-up keys match existing filter keys.
 */
export function prospectDetailViewModel(lead, referenceDate) {
  const fields = [
    'lead_id', 'company_name', 'industry', 'customer_segment',
    'plastic_application_need', 'domino_relevance', 'plastic_use_fit', 'fit_reason',
    'priority', 'priority_reason', 'lead_source', 'relationship_type', 'lead_status',
    'estimated_opportunity_value', 'currency', 'last_contact_date',
    'next_follow_up_date', 'next_action',
  ];
  const isDemo = typeof lead.is_demo === 'boolean' ? lead.is_demo : null;
  return {
    ...Object.fromEntries(fields.map(field => [field, lead[field] ?? null])),
    follow_up_state: followUpState(lead, referenceDate),
    is_demo: isDemo,
    demonstration_status: isDemo === true ? 'hypothetical' : isDemo === false ? 'not_marked_demo' : 'unknown',
    demonstration_notice: isDemo === true
      ? 'Hypothetical demonstration data — not actual Domino Plastics customer information.'
      : null,
  };
}

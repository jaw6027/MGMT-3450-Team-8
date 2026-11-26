/* Pure mapping of the existing application's records; no storage or fixture import.
 * Classic script preserves direct file opening. The .mjs facade shares this code.
 */
(function (root) {
  'use strict';
  const unassigned = value => typeof value === 'string' && value.trim() ? value.trim() : 'Unassigned';

  function opportunityEstimate(value) {
    if (value == null || (typeof value === 'string' && !value.trim())) return null;
    if (!['string', 'number'].includes(typeof value)) throw new TypeError('Invalid opportunity estimate.');
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) throw new TypeError('Invalid opportunity estimate.');
    return number;
  }

  function mapLead(record) {
    return {
      lead_id: record.id,
      company_name: record.company,
      industry: record.industry,
      customer_segment: unassigned(record.customerSegment),
      plastic_application_need: record.productInterest || null,
      lead_source: unassigned(record.leadSource),
      lead_status: record.status, // Closed stays Closed, never interpreted as Won/Lost.
      priority: unassigned(record.priority),
      estimated_opportunity_value: opportunityEstimate(record.opportunityValue),
      currency: 'USD', // The existing editor explicitly defines USD estimates.
      last_contact_date: record.contact || null,
      next_follow_up_date: record.follow || null,
      notes: record.notes || null,
      // Missing per-record provenance stays unknown; the host labels its demo scope.
      is_demo: typeof record.is_demo === 'boolean' ? record.is_demo : null,
    };
  }

  function mapLeads(records) { return records.map(mapLead); }
  root.ProspectLeadAdapter = Object.freeze({ opportunityEstimate, mapLead, mapLeads });
})(globalThis);

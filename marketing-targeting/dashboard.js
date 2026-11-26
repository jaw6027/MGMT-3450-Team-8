/* Kayleen's analytics/targeting view integration. Uses the existing lead store.
 * No fixture, separate database, storage writes, framework, or module imports.
 */
(function (root) {
  'use strict';
  function create({ getLeads, industries }) {
    const A = root.ProspectAnalytics;
    const filters = {};
    const $ = id => document.getElementById(id);
    const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
    const estimate = row => row.value_available ? money(row.estimated_open_pipeline) : 'Value unavailable';
    const filterLabels = { lead_source: 'Lead source', industry: 'Industry', customer_segment: 'Customer segment', lead_status: 'Status', priority: 'Priority' };

    function renderFilters(records) {
      const choices = {
        lead_source: ['Referral', 'Website Inquiry', 'Trade Show', 'Email Outreach', 'Social Media', 'Direct Outreach', 'Unassigned'],
        industry: industries.map(industry => industry.name),
        customer_segment: [...new Set(records.map(record => record.customer_segment))].sort(),
        lead_status: ['New', 'Contacted', 'Qualified', 'Proposal', 'Closed'],
        priority: ['High', 'Medium', 'Low', 'Unassigned'],
      };
      const focused = document.activeElement?.id;
      for (const container of document.querySelectorAll('[data-analytical-filters]')) {
        container.innerHTML = Object.entries(filterLabels).map(([field, label]) => {
          const values = [...new Set([...choices[field], ...(filters[field] ? [filters[field]] : [])])];
          return `<label>${label}<select id="${container.id}-${field}" data-analysis-filter="${field}"><option value="">All</option>${values.map(value => `<option value="${esc(value)}"${filters[field] === value ? ' selected' : ''}>${esc(value)}</option>`).join('')}</select></label>`;
        }).join('') + '<button type="button" data-reset-analysis>Reset analytical filters</button>';
      }
      if (focused) $(focused)?.focus({ preventScroll: true });
    }

    function bars(rows, field) {
      const max = Math.max(1, ...rows.map(row => row.estimated_open_pipeline));
      return rows.map(row => `<div class="analysis-bar-row"><span>${esc(row[field])}</span><span class="track" aria-hidden="true"><span class="bar" style="width:${row.estimated_open_pipeline / max * 100}%"></span></span><strong>${estimate(row)}</strong><small>${row.missing_estimates} open estimate(s) missing</small></div>`).join('') || '<p>No matching leads.</p>';
    }

    function valueInsight(result, label) {
      return result.names.length
        ? `Highest known open estimated value by ${label}: ${result.names.join(', ')} — ${money(result.value)}${result.names.length > 1 ? ' each (tie)' : ''}.`
        : `No positive known open estimated value to rank by ${label}.`;
    }

    function renderIndustry(records) {
      const valueMode = $('industry-measure').value === 'value';
      $('chart').hidden = valueMode; // Original all-lead chart remains intact.
      $('industry-value-chart').hidden = !valueMode;
      $('industry-value-chart').innerHTML = bars(A.pipelineByIndustry(records), 'industry');
      $('industry-view-title').textContent = valueMode ? 'Open Estimated Opportunity Value by Industry' : 'Leads by industry';
      $('industry-view-scope').textContent = valueMode ? 'ANALYTICAL FILTERS' : 'ALL LEADS';
      $('industry-view-description').textContent = valueMode ? 'Known hypothetical USD estimates for open leads; not sales or a forecast.' : 'Where the sample pipeline is taking shape';
      $('industry-view-foot').textContent = valueMode ? 'Value view uses analytical filters below. Count view always includes all leads.' : 'Sample lead distribution • not market demand';
      $('industry-value-insight').textContent = valueInsight(A.industryWithHighestOpenOpportunity(records), 'industry');
      $('industry-value-insight').hidden = !valueMode;
    }

    function renderTargets(records) {
      const summaries = A.targetIndustryAnalysis(records);
      const priorityIndustries = ['Agriculture', 'Recycling'];
      const ordered = [...industries.filter(item => priorityIndustries.includes(item.name)), ...industries.filter(item => !priorityIndustries.includes(item.name))];
      $('targets').innerHTML = ordered.map(industry => {
        const summary = summaries.find(row => row.industry === industry.name) || {
          total_leads: 0, active_opportunities: 0, high_priority_open_prospects: 0,
          estimated_open_pipeline: 0, value_available: true, missing_estimates: 0, segments: [],
        };
        const prospects = records.filter(record => record.industry === industry.name);
        return `<article class="target"><div class="target-icon" aria-hidden="true">${industry.icon}</div><div class="target-analysis"><strong>${esc(industry.name)}${priorityIndustries.includes(industry.name) ? ' · Priority focus' : ''}</strong><p>${esc(industry.idea)}</p><dl class="target-metrics"><div><dt>Leads</dt><dd>${summary.total_leads}</dd></div><div><dt>Active</dt><dd>${summary.active_opportunities}</dd></div><div><dt>Known open value</dt><dd>${estimate(summary)}</dd></div><div><dt>High-priority open</dt><dd>${summary.high_priority_open_prospects}</dd></div></dl><p>${summary.missing_estimates} open estimate(s) missing. Industry focus does not assign individual priority.</p><details><summary>Customer segments and plastic needs</summary><div class="table-wrap"><table><caption class="sr-only">${esc(industry.name)} segment analysis</caption><thead><tr><th>Segment</th><th>Leads</th><th>Active</th><th>Known open value</th><th>Missing estimates</th></tr></thead><tbody>${summary.segments.map(segment => `<tr><td>${esc(segment.customer_segment)}</td><td>${segment.total_leads}</td><td>${segment.active_opportunities}</td><td>${estimate(segment)}</td><td>${segment.missing_estimates}</td></tr>`).join('') || '<tr><td colspan="5">No matching leads.</td></tr>'}</tbody></table></div><ul>${prospects.map(prospect => `<li><strong>${esc(prospect.company_name)}</strong>: ${esc(prospect.plastic_application_need || 'Plastic need unassigned')}</li>`).join('')}</ul></details></div></article>`;
      }).join('');
    }

    function render() {
      try {
        const records = root.ProspectLeadAdapter.mapLeads(getLeads());
        renderFilters(records);
        const selected = A.filterLeads(records, filters);
        const summary = A.pipelineSummary(selected);
        $('analysis-summary').textContent = `${selected.length} matching hypothetical leads • ${summary.open_leads} open • Known open estimated value: ${estimate(summary)} • ${summary.missing_estimates} open estimate(s) missing`;
        $('analysis-scope').textContent = Object.entries(filters).filter(([, value]) => value).map(([field, value]) => `${filterLabels[field]}: ${value}`).join(' • ') || 'All lead sources, industries, segments, statuses, and priorities';
        $('target-analysis-scope').textContent = $('analysis-scope').textContent;
        $('source-value-chart').innerHTML = bars(A.pipelineByLeadSource(selected), 'lead_source');
        $('source-performance-rows').innerHTML = A.sourcePerformanceComparison(selected).map(row => `<tr><td>${esc(row.lead_source)}</td><td>${row.total_leads}</td><td>${row.qualified_active_opportunities}</td><td>${estimate(row)}</td><td>${row.missing_estimates}</td></tr>`).join('') || '<tr><td colspan="5">No matching leads.</td></tr>';
        $('source-value-insight').textContent = valueInsight(A.sourceWithHighestOpenOpportunity(selected), 'lead source');
        renderIndustry(selected);
        renderTargets(selected);
        $('analysis-warning').textContent = '';
        $('target-analysis-warning').textContent = '';
      } catch (error) {
        // Never let malformed analytical data break the existing lead manager.
        $('analysis-warning').textContent = `Analytics unavailable: ${error.message} Existing lead management remains available.`;
        $('target-analysis-warning').textContent = $('analysis-warning').textContent;
        $('analysis-summary').textContent = 'Analytics unavailable; review the warning.';
        for (const id of ['source-value-chart', 'source-performance-rows', 'industry-value-chart', 'source-value-insight', 'industry-value-insight', 'analysis-scope', 'target-analysis-scope']) $(id).textContent = '';
        // Clear stale calculated summaries while preserving teammate descriptions.
        renderTargets([]);
      }
    }

    for (const container of document.querySelectorAll('[data-analytical-filters]')) {
      container.addEventListener('change', event => {
        const field = event.target.dataset.analysisFilter;
        if (field) { filters[field] = event.target.value; render(); }
      });
      container.addEventListener('click', event => {
        if (event.target.closest('[data-reset-analysis]')) {
          for (const field of Object.keys(filters)) delete filters[field];
          render();
        }
      });
    }
    $('industry-measure').addEventListener('change', render);
    return { render };
  }
  root.ProspectDashboard = Object.freeze({ create });
})(globalThis);

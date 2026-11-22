# Shared marketing and targeting analytics

Framework-independent JavaScript for Kayleen's Marketing Analytics and Target
Customer Relationships contributions. There is no interface, server, database,
framework, or dependency installation. The initial dashboard integration covers
only pipeline by source, pipeline by industry, and source performance comparison.
Lead Status Distribution is deferred.

## Demonstration data

`demo-leads.mjs` exports 18 fictional records and `DEMO_REFERENCE_DATE`
(`2026-11-22`). **These are hypothetical demonstration data, not actual Domino
Plastics customers, transactions, performance, or verified capabilities.**
Values are potential order estimates in USD, not revenue or profit. One lead
represents one opportunity for this initial module. Won/Lost estimates remain in
the records for context but are excluded from open pipeline.

The three approved illustrative Possible-fit records are L01, L05, and L10.
Other records retain Unknown fit. No Strong fit is invented. Recycling
relationship types remain Undetermined pending clarification. Last-contact and
follow-up dates intentionally left blank in the baseline remain null. Proposed
next actions and reasons are fictional demonstration enrichment, not evidence.

## Run verification

From `/workspace/MGMT-3450-Team-8`, using Node.js 18 or newer:

```sh
node --test marketing-targeting/analytics.test.mjs
```

The tests use Node's built-in test runner and the fixed demonstration date.
No package manifest or external packages are required.

## Use with the eventual application

```js
import { filterLeads, marketingInsights, relationshipInsights,
  pipelineByLeadSource, pipelineByIndustry, sourcePerformanceComparison,
} from './analytics.mjs';

// existingLeads comes from Brandon's existing data layer after field mapping.
// Supply the business date explicitly; the module never reads the system clock.
const businessDate = '2026-11-22';
const selected = filterLeads(existingLeads, {
  industry: ['Agriculture', 'Recycling'],
  priority: ['High', 'Medium'],
}, businessDate);
const marketing = marketingInsights(selected, businessDate);
const relationships = relationshipInsights(selected, businessDate);
const sourcePipeline = pipelineByLeadSource(selected);
const industryPipeline = pipelineByIndustry(selected);
const sourceComparison = sourcePerformanceComparison(selected);
```

The analytics module never imports the demonstration dataset. Map existing
records into its shared flat field names, reuse stable IDs, and pass the same
filtered records to both sets of functions. Keep demonstration and actual data
scopes separate in the host application. No second editable lead database is
needed. Reuse existing interactions to derive last contact when available.

## Rules and return values

- Open statuses: New, Contacted, Qualified, Proposal. Qualified/active: Qualified
  or Proposal. Unknown statuses are not silently treated as open.
- Counts use distinct nonempty string `lead_id` values. Repeated identical flat
  records count once; conflicting copies of an ID throw instead of choosing one.
  Inputs are not mutated. Returned record lists reference the original objects;
  treat those references as read-only.
- `filterLeads` accepts `company_search`, `industry`, `customer_segment`,
  `lead_source`, `lead_status`, `priority`, `plastic_use_fit`, `follow_up_state`,
  and `relationship_type`.
  Use a string or array; OR within each selection and AND across fields. Empty
  arrays/null impose no restriction. Values are case-sensitive. Unsupported
  filter fields throw. Apply filters once before aggregating.
- Follow-up states: `overdue`, `due_today`, `upcoming`, `unscheduled`, `closed`.
  Date-dependent functions require a valid `YYYY-MM-DD` reference date. The host
  application supplies its current business date/timezone; there is no hidden
  clock. Missing follow-up dates are null/empty, never interpreted as overdue.
  Closed records are excluded from follow-up work even if they contain dates.
- `totalLeadCount`, `openLeadCount`, `qualifiedActiveOpportunityCount`, and
  `estimatedOpenPipeline` return numbers. `highPriorityActiveOpportunities`,
  `followUpsOverdue`, `followUpsDueToday`, `openLeadsMissingFollowUp`,
  `openTargetProspects`, `highPriorityAgricultureProspects`, and
  `prospectsNeedingFollowUp` return records; use `.length` for counts.
- High-priority active opportunities require High plus Qualified/Proposal.
  High-priority Agriculture prospects require High plus any open status.
- Pipeline sums known open estimates, rounding each estimate to cents. Null or
  absent estimates are unknown; invalid/negative numeric values throw.
  `pipelineSummary` also returns `missing_estimates` and `value_available` so an
  all-unknown pipeline can display "Value unavailable" instead of a misleading
  zero. Empty scope gives zero with no missing values. Grouped results include
  the same metadata and retain zero-pipeline groups from closed leads.
- Currency defaults to USD and can be supplied as the final currency argument
  to pipeline/value-insight functions. Valued open records must all match that
  currency or aggregation throws. No exchange-rate conversions are performed.
- Grouped arrays are alphabetized. Source performance includes total leads
  (including closed), qualified/active count, and open pipeline. Missing source
  or industry is grouped as Unspecified.
- Highest-value and most-leads insights return `{ names, value }`, including
  every tie. No positive value/no records returns `{ names: [], value: null }`.
  Pipeline leaders are based on known values; inspect grouped missing-estimate
  metadata and describe results as known estimates if information is incomplete.
- Fit insights return `available`, `count`, `leads`, and `missing_fit_count`.
  Explicit Unknown fit is a populated category, unlike null/absent fit.
  Qualification candidates are New/Contacted with Possible or Unknown fit.
  Strong-fit contact candidates are open, Strong, and overdue/due/unscheduled.
  If no eligible records have a recognized fit label, count is null, not an
  invented zero. Partial coverage is reported with `missing_fit_count`.
- `marketingInsights` and `relationshipInsights` return structured results,
  leaving wording, labels, colors, and components to the existing application.
  They do not calculate ROI, profit, acquisition cost, or historical conversion.

## Target Customer Relationships data functions

These extend the same module and shared records; no UI exists yet. They are
intended for integration into the team's existing application.

- `filterTargetProspects(leads, filters, referenceDate)` applies shared filters
  to open prospects only. Use `filterLeads` for history including Won/Lost.
  `company_search` matches case-insensitive company-name substrings, trims search
  terms, and accepts one term or an OR array. Blank search means no restriction.
  Other selections use exact values, with AND across fields as before.
- `sortTargetProspects(leads, referenceDate, mode)` returns a new open-prospect
  list. The default `priority_first` mode sorts High/Medium/Low, then
  overdue/due_today/unscheduled/upcoming. Optional `follow_up_first` mode orders
  those follow-up categories before priority. Within equal priority/state groups,
  dates are earliest first, then stable lead ID. Missing/unrecognized priorities
  follow Low. Neither mode mutates the input or includes closed records.
- `targetCustomerSummary(leads, referenceDate)` returns open target count,
  High-priority open count, overdue count, due-today count, and unscheduled count.
  High-priority open count includes New/Contacted, unlike the separate Marketing
  Analytics High-priority qualified/active count.
- `targetSegmentSummaries(leads, referenceDate, currency)` returns Agriculture,
  Recycling, and Manufacturing summaries, including zero-count industries. Each
  includes `industry`, `open_leads`, `high_priority_open_prospects`,
  `estimated_open_pipeline`, `needing_follow_up` (overdue plus due today), a
  cautious targeting description, currency, and missing-value metadata.
  Packaging and all other industries remain available through normal filters.
- `relationshipInsights` reuses the existing calculated Agriculture, follow-up,
  industry-value, Strong-fit, and qualification insights. No company list or
  insight result is hard-coded. Fit availability rules above still apply.
- `prospectDetailViewModel(lead, referenceDate)` returns a new flat data object
  with shared field names, relationship details, currency, and `follow_up_state`.
  Missing fields stay null. `is_demo: true` produces a `hypothetical` status and
  an explicit demonstration notice. False means `not_marked_demo`, not verified
  actual customer information; absent status remains `unknown`.

For a working list, filter with `filterTargetProspects`, then call
`sortTargetProspects` on the result. Pass the selected records to summary and
insight functions when those should reflect current filters. Keep the original
records in Brandon's data layer; these functions do not maintain another store.

Before integration, confirm Brandon's status vocabulary, currency conventions,
opportunity model, existing lead-management features, and data scope. Multiple
opportunities per lead require an adapter using distinct opportunity IDs for
value totals and distinct lead IDs for lead counts; do not flatten joins and
double-count. Review/add fields only where the existing model has gaps.

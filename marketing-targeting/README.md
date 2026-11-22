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
- `filterLeads` accepts `industry`, `customer_segment`, `lead_source`,
  `lead_status`, `priority`, `plastic_use_fit`, and `follow_up_state`.
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

Before integration, confirm Brandon's status vocabulary, currency conventions,
opportunity model, existing lead-management features, and data scope. Multiple
opportunities per lead require an adapter using distinct opportunity IDs for
value totals and distinct lead IDs for lead counts; do not flatten joins and
double-count. Review/add fields only where the existing model has gaps.

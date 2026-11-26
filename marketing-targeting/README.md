# Shared marketing and targeting analytics

Shared JavaScript for Kayleen's Marketing Analytics and Target Customer/Industry
contributions, integrated into Brandon's existing static application. No framework,
backend, database, build step, or runtime dependency installation is introduced.
The additions cover source value/comparison, an industry count/value switch, and
data-driven summaries on the existing Target industries page. Lead Status
Distribution by source remains deferred; Brandon's overall status chart is intact.

## Demonstration data

`demo-leads.mjs` exports 18 fictional records and `DEMO_REFERENCE_DATE`
(`2026-11-22`). **These are hypothetical demonstration data, not actual Domino
Plastics customers, transactions, performance, or verified capabilities.**
Values are potential order estimates in USD, not revenue or profit. One lead
represents one opportunity for this initial module. Won/Lost estimates remain in
the records for context but are excluded from open pipeline.

This 18-record fixture is for automated tests only and is **not** loaded by the
browser application. The interface continues using Brandon's existing sample
leads and browser-local saved records. Default sample objects are enriched with
explicitly fictional sources, segments, and priorities. Saved records are not
assigned those values; missing metadata stays blank/Unassigned. Only an explicit
user-requested Reset replaces saved leads with the current defaults, as before.

The three approved illustrative Possible-fit records in the test fixture are L01, L05, and L10.
Other records retain Unknown fit. No Strong fit is invented. Recycling
relationship types remain Undetermined pending clarification. Last-contact and
follow-up dates intentionally left blank in the baseline remain null. Proposed
next actions and reasons are fictional demonstration enrichment, not evidence.

## Run verification

From `/workspace/MGMT-3450-Team-8`, using Node.js 18 or newer:

```sh
node --test marketing-targeting/*.test.mjs
```

The tests use Node's built-in test runner and the fixed demonstration date.
No package manifest or external packages are required.

An optional browser regression script uses an already installed Playwright and
Chromium. Serve the repository with a static server (for example,
`python3 -m http.server 8765 --bind 127.0.0.1`), then run:

```sh
node marketing-targeting/browser-regression.mjs http://127.0.0.1:8765
```

If those tools are outside Node's normal resolution path, set
`PROSPECT_PLAYWRIGHT_MODULE` to the Playwright module's absolute path and
`PROSPECT_CHROMIUM_EXECUTABLE` to the browser executable. This is an optional test
tool requirement, not an application dependency. Tests use isolated contexts and
fictional records, including a fixed November 22, 2026 clock.

## Current application integration

- `analytics-core.js` contains the single pure calculation implementation in a
  classic-script wrapper, exposing `ProspectAnalytics`. `analytics.mjs` exports
  those same functions for Node tests; calculations are not duplicated.
- `lead-adapter.js` maps the current application model, exposing
  `ProspectLeadAdapter`. Its `.mjs` facade exports the same adapter for tests.
- `dashboard.js` renders only the approved additions into the existing pages.
  It reads the existing `leads` array through a callback and never writes storage.
- `index.html` loads these files as ordered classic deferred scripts before
  `app.js`. No runtime imports/fetches or HTTP-only module loading is required;
  the intended direct-file launch method remains supported by the code.

Exact adapter mapping:

| Application field | Analytical field |
| --- | --- |
| `id`, `company` | `lead_id`, `company_name` |
| `industry`, `customerSegment` | `industry`, `customer_segment` |
| `productInterest` | `plastic_application_need` |
| `leadSource`, `status`, `priority` | `lead_source`, `lead_status`, `priority` |
| `opportunityValue` | `estimated_opportunity_value` (number or null) |
| `contact`, `follow`, `notes` | `last_contact_date`, `next_follow_up_date`, `notes` |

The existing editor specifies USD, so the adapter supplies USD. Blank/whitespace
estimates map to null, `"0"` maps to zero, and invalid/negative values throw an
explicit analytics error without replacing records. Missing provenance remains
unknown rather than marking arbitrary records as verified real or fictional.
Closed remains Closed: no won/lost outcome is inferred. Open = New, Contacted,
Qualified, Proposal; active = Qualified/Proposal. The original fixture's Won/Lost
statuses remain useful closed-input tests but are not added to the application.

Analytical filters (source, industry, segment, status, priority) are single-select,
shared between the new source analysis and Target industries summaries, and also
affect the industry **value** view. The original overview metrics, industry **count**
view, status chart, table filters, CSV row selection, and calendar are unchanged.
CSV appends the three new fields while retaining the original column order and
fictional-data notice. Blank legacy fields display as Unassigned in analytics
and the editor. Adding optional fields to defaults does not backfill them from
industry or source assumptions. All five original industries remain available.

`targetIndustryAnalysis` returns total leads, active opportunities, High-priority
open prospects, known open value and missing-value metadata, plus the same
metrics grouped by customer segment. Industry descriptions and suitability
cautions are reused from Brandon's `industries` metadata. Existing `productInterest`
values supply the prospect plastic-need details; there is no parallel lead store.

## Pure-function usage

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

These pure functions share records with the integrated marketing calculations.
The current dashboard integration uses industry/segment summaries. The optional
relationship working-list/detail helpers remain data-only utilities, not another
CRM page or competing interface.

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

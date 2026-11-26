# Fictional pipeline preview

“Show fictional demo data” switches pipeline analytics and work-hour summaries to a separate in-memory sample. It starts enabled only when there are no saved work entries or added/moved pipeline events; otherwise it preserves the view of saved activity by default. Switch it off to log real prototype work time. It does not change the lead table, calendar, lead storage, pipeline history or saved work logs. Demo samples are regenerated relative to today so Weekly/Monthly/Yearly views can be compared. Labels identify them as fictional. Sample time: the current week contains 6 hours across 2 demo prospects (3 hours average); older examples demonstrate wider periods. Demo entries cannot be saved via the time form.

---

# Logged work hours

The current-stage watchlist has been replaced by manual work-time logging. Log a prospect, date of work (not in the future) and 0.01–24 decimal hours per entry. These are actual entered work hours, never elapsed stage time. Entries are appended under the separate `polymer-prospect-v1-work-hours-v1` storage key. Existing leads and pipeline events are not rewritten. Invalid pre-existing logs are preserved; logging pauses if they cannot be read.

Weekly (Monday–Sunday), monthly and yearly pipeline periods also filter time totals. The summary shows hours logged in the period, distinct prospects with logged time, and total period hours divided by that prospect count. An empty period shows 0 hours and an unavailable average (—), rather than inventing time. The table shows each prospect’s hours in the selected period and across all logged dates; — means no entry. Closed or deleted prospects’ recorded effort remains in totals. Sample resets do not delete work logs. Logging a past work date is allowed because the date is explicitly supplied rather than inferred.

Logs stay in the same browser/origin/file location, and are not embedded in HTML downloads or included in the existing lead CSV. The log form selects the prospect to assign a time entry; pipeline analytics still cover all prospects together. Entries currently append only; corrections require a separate change.

---

# Pipeline progress tracking

Business leads now includes weekly (Monday–Sunday), monthly and yearly pipeline activity across all prospects, recorded stage-entry counts, a work-hours summary and a journey log. Periods use the browser’s local timezone; the date input selects a date within the requested period. Work-hour summaries follow the same selected period.

Tracking starts when this version is first opened in a browser/origin/file location. Existing lead statuses are baseline observations with unknown prior history, not new leads or conversions. Subsequent saved status changes and additions are counted in their recorded periods. Notes-only edits do not create stage movements. Deletions retain journey history; explicit sample resets are labeled separately and excluded from activity metrics. Changes first noticed after reopening are observations with an unknown actual change time. Repeated entries into a stage count as separate entries, so entry counts are not conversion rates. Closed does not distinguish won from lost.

Lead records retain the existing storage key and fields. Pipeline history uses the separate `polymer-prospect-v1-pipeline-history-v1` browser-storage key. Opening this version does not rewrite existing lead records to add history fields. Invalid existing history is preserved and recording pauses with a visible message. No stage-age threshold or verified business problem is assumed.

History is local to the browser and origin/file location; it is not a shared team audit log and is not included in the lead CSV or downloaded HTML. Keep the same origin/file location to retain it. Use fictional data for this prototype.

Browser checks passed for baseline preservation, real saved status transitions, all period boundaries, aggregate prospect totals, notes-only edits, sample reset exclusions, retained deletion history, reload persistence, mobile layout, and preservation of malformed existing history. Both repository files and standalone HTML were exercised.

---

# Agriculture and Recycling focus update

Recycling is the fifth industry; four additional fictional leads bring a fresh sample database to 16 leads, 5 industries and 7 active opportunities. Follow-ups remain date-dependent. Agriculture and Recycling appear first in the existing target list, marked Priority focus, with HDPE/LDPE application examples. These examples are hypotheses requiring material, contamination, certification and blend-suitability checks, not approved product claims.

Existing browser records use the same storage key. A one-time update appends the four samples using stable IDs, without changing existing records. Existing records with a matching ID are retained instead of overwritten. A separate migration marker prevents deleted new samples from reappearing after reload. Reset still requires confirmation and restores the full 16-record sample set. Browser storage belongs to the same browser/origin/file location; downloading to another folder may use different storage. Export your records before moving files.

To view: select **agriculture-recycling-focus** on GitHub, choose **Code → Download ZIP**, extract, then open **index.html** in Chrome with **app.js** and **style.css** beside it. This branch is not deployed.

---

# CRM extension v0.2 — fictional prototype

Use each lead's **Edit** button (or **Add lead**) for contact name, email, phone, product interest, estimated opportunity value in USD, and multiline interaction notes/next steps. All fields are optional. A blank estimated value means unknown; zero is allowed. Email formatting and nonnegative values with up to two decimals are validated by the form.

These are student-proposed fields, not approved requirements from Domino Plastics. Sample emails use example.com; sample phone numbers use the reserved 202-555-0100–0199 range. Values are illustrative, not sales or forecasts. Notes are a single editable text field, not an audited interaction history.

## Compatibility
The existing `polymer-prospect-v1` storage key remains unchanged. Existing records retain their IDs, company data, status, dates, and any additional properties; missing CRM fields receive blank defaults. Loading does not overwrite stored records or replace them with samples. Saving a lead persists the additional fields in the same browser. Reset remains an explicit action that replaces all records with samples. Keep the same browser and website origin/local file location to access the same storage; downloading to a different folder does not transfer browser data automatically. Export before switching locations.

CSV exports include all CRM fields for the filtered records, with quoted multiline notes. Existing marketing metrics, industry chart, table and filters retain their definitions.

## View this branch without publishing
Select the CRM branch on GitHub, choose **Code → Download ZIP**, extract it, and open **index.html** with **app.js** and **style.css** beside it. No deployment is needed. This update does not enable Pages or deploy Sites.

Chromium/Playwright regression checks passed: legacy-record migration, CRM save/reload, email and value validation, blank/zero values, multiline CSV quoting, marketing chart and filters, add/delete/reset, mobile editor, and no JavaScript errors. Tests used locally supplied pages without deployment.

Agriculture/Recycling update verification: browser checks passed for 16 sample leads, 5 industries, 7 opportunities, Recycling chart/filter/add workflow, priority order, legacy-record preservation (including unknown fields and ID collisions), one-time migration, deleted-sample persistence, CRM validation/save/reload/CSV, marketing filters and mobile editor.

## CRM verification checklist
- Open an original saved record: new fields start blank and original details remain.
- Enter fictional contact details, multiline notes, product interest, and a USD estimate. Save, reload and reopen: all fields persist.
- Try an invalid email or negative value: the form prevents saving. Check blank and zero values separately.
- Export a filtered CSV and verify CRM columns and quoted multiline notes.
- Check industry/status/search/follow-up filters, chart totals, add/edit/delete, reset and the mobile editor.

---

# Open the existing dashboard without coding

## Easiest: download and open
1. On this repository's main page, click **Code → Download ZIP**.
2. Extract/unzip the downloaded folder. Do not open index.html while it is still inside the ZIP.
3. Open the extracted **index.html** in a current Google Chrome browser. Keep **style.css** and **app.js** beside it.
No terminal, Python, server, or coding is needed for this static prototype. Browser storage for local files can vary; export any sample edits you want to keep.

## Optional: browser URL using GitHub Pages
If GitHub Pages is available for your repository and account:
1. Open **Settings → Pages**.
2. Under Build and deployment, choose **Deploy from a branch**.
3. Select **main** and **/(root)**, then **Save**.
4. Wait for GitHub to finish deployment, then use the **Visit site** link shown on that page.
Pages may make the website publicly accessible. The prototype contains fictional data only. Do not change repository visibility just to enable Pages without considering that choice.
These instructions do not mean Pages is already enabled or that deployment has been verified.

## Why the Codex localhost link failed
localhost:8000 in your own Chrome refers to your own computer, not the Codex Cloud environment. Nothing was listening on port 8000 in the cloud workspace when checked. The managed cloud preview relay is unavailable, and the configured outbound proxy cannot be reached, preventing Sites source publication from that environment. Binding a server to 0.0.0.0 would allow an available relay to reach it, but would not itself create an externally accessible URL. No supported cloud preview URL was created.

## Files saved here
index.html, style.css, and app.js are unchanged copies of the existing prototype's dist files. They are at the repository root for easy local opening or GitHub Pages hosting. The original repository README is preserved. The guide below retains the development and test notes; its dist/ paths refer to the original workspace layout. In this repository, use the root files instead. Optional local server command here: python3 -m http.server 8000 --bind 127.0.0.1 (only for running on your own computer).

---

# Polymer Prospect — marketing prototype
CSUB MGMT 3450 Small Business Management student project about Domino Plastics.
All businesses, activity, metrics, and industry ideas are fictional or unverified hypotheses. No sales or marketing performance is claimed. No company website content or branding is reproduced.

## Run
Requires only Python 3 and a modern browser. No installation, framework, backend, account, or build step.
From this folder run:

    python3 -m http.server 8000 --directory dist

Open http://localhost:8000. Stop with Ctrl+C. Use the same browser and address to retain local changes.

## Features
Four overview metrics, industry bar chart with accessible text counts, potential industry/application ideas, searchable and filterable customer table, add/edit/delete leads, localStorage persistence, CSV export, and reset sample data. Filters affect the table and CSV; overview/chart always describe all records.
Active opportunities are Qualified or Proposal leads. Follow-ups are non-Closed leads due on or before the browser's local date. Initial snapshot on Nov 5, 2026: 12 leads, 4 industries, 5 active opportunities, 5 follow-ups. Follow-up totals change with the date.

## Test
1. Confirm initial totals above on the snapshot date (or calculate follow-ups against today's date).
2. Select Packaging: 5 records. Search Aster: 1 record. Search an unknown name: empty state. Clear filters.
3. Add a fictional lead, change its status to Qualified and set a follow-up date to today. Total leads, industry bars, opportunities, and follow-ups update.
4. Reload: changes remain. Edit last contact and follow-up; reopen to confirm. Future last-contact dates are rejected by the form.
5. Enable follow-up filter and export CSV; check only matching rows export and the fictional-data notice is included.
6. Delete the added record. Reset sample data and confirm 12 records return.
7. Test keyboard navigation, dialog Escape, and a narrow mobile viewport. Tables scroll horizontally.
8. If storage is disabled/full, confirm the warning in Project guide and export before leaving.
JavaScript syntax can be checked with Node (optional): node --check dist/app.js.
Automated simulated DOM smoke checks during development passed: initial totals, active/follow-up definitions, filters, add/edit/delete, persistence, empty results. Browser visual QA was unavailable in this environment.

## Modify
- dist/app.js: industry definitions, sample leads, status lists, metric rules, storage version key.
- dist/style.css: colors, layout, responsive styles.
- dist/index.html: labels, explanatory copy, fields.
Keep status options in HTML and JS aligned. Preserve the storage key and migrate optional fields with defaults to keep old records accessible; existing browser records override edited samples. Browser records are not shared or backed up; use fictional data only.

## Ask Domino Plastics before expanding
- What exactly are the HDPE/LDPE blended products: formats, blend ratios, grades, specifications, testing/certifications, approved applications, and limitations?
- Which industries, buyer roles, regions, and customer sizes are priorities? Which applications should be excluded?
- What are minimum order quantities, capacity, lead times, pricing/quotation steps, and sample availability?
- How are leads sourced and qualified? What defines an active opportunity, status transitions, ownership, and follow-up timing?
- Which marketing channels, goals, and KPIs matter? What are the agreed definitions, reporting periods, and baselines?
- What existing CRM/spreadsheets can be used, which fields are needed, and who may access or edit customer data?
- Who will approve requirements, product claims, privacy practices, and the final dashboard?

Next step: validate these assumptions and the prototype with the company before adding integrations, shared storage, campaign analytics, or a full CRM.

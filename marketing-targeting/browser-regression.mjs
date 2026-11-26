// Optional integration checks using an already installed Playwright and Chromium.
// Run against a local static server. New isolated contexts never touch user data.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const { chromium } = await import(process.env.PROSPECT_PLAYWRIGHT_MODULE || 'playwright');
const url = process.argv[2] || 'http://127.0.0.1:8765';
const browser = await chromium.launch({
  executablePath: process.env.PROSPECT_CHROMIUM_EXECUTABLE || undefined,
  headless: true,
});
let passed = 0;
const check = (description, fn) => async () => { await fn(); passed++; console.log(`PASS ${description}`); };
const errors = [];
async function navigate(page, id) {
  await page.locator(`nav a[href="#${id}"]`).click();
  await page.locator(`#${id}`).waitFor({ state: 'visible' });
}
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  await page.clock.install({ time: new Date('2026-11-22T12:00:00Z') });
  await page.goto(url);
  await page.waitForSelector('#source-performance-rows tr');

  await check('initial application and approved default samples load', async () => {
    assert.match(await page.locator('#analysis-summary').innerText(), /20 matching hypothetical leads.*19 open.*39,500.00.*6 open estimate/);
    assert.equal(await page.locator('#source-performance-rows tr').count(), 6);
    assert.equal(await page.locator('#analysis-warning').textContent(), '');
    assert.equal(await page.locator('#stats .stat strong').nth(0).textContent(), '20');
    assert.equal(await page.locator('#stats .stat strong').nth(2).textContent(), '09');
  })();

  await check('existing navigation, lead table and status chart work', async () => {
    for (const id of ['customers', 'industries', 'guide', 'overview']) {
      await navigate(page, id);
      assert.equal(await page.locator(`#${id}`).isVisible(), true);
    }
    await navigate(page, 'customers');
    assert.equal(await page.locator('#rows tr').count(), 20);
    assert.equal(await page.locator('#status-chart button').count(), 5);
    await page.locator('#status-chart button[data-filter-status="Qualified"]').click();
    assert.equal(await page.locator('#status').inputValue(), 'Qualified');
    assert.equal(await page.locator('#rows tr').count(), 5);
    await page.locator('#clear').click();
  })();

  await check('analytical filters do not alter original table, calendar or overview scope', async () => {
    await page.locator('#industry').selectOption('Agriculture');
    const calendar = await page.locator('#calendar-summary').textContent();
    const chart = await page.locator('#status-chart').textContent();
    await navigate(page, 'overview');
    await page.locator('#overview-analysis-filters-industry').selectOption('Recycling');
    assert.match(await page.locator('#analysis-summary').innerText(), /^5 matching hypothetical leads/);
    assert.equal(await page.locator('#target-analysis-filters-industry').inputValue(), 'Recycling');
    assert.equal(await page.locator('#stats .stat strong').nth(0).textContent(), '20');
    assert.equal(await page.locator('#rows tr').count(), 5);
    assert.equal(await page.locator('#industry').inputValue(), 'Agriculture');
    assert.equal(await page.locator('#calendar-summary').textContent(), calendar);
    assert.equal(await page.locator('#status-chart').textContent(), chart);
  })();

  await check('industry count/value switch preserves the all-lead count view', async () => {
    const oldCounts = await page.locator('#chart').textContent();
    await page.locator('#industry-measure').selectOption('value');
    assert.equal(await page.locator('#chart').isVisible(), false);
    assert.match(await page.locator('#industry-value-chart').innerText(), /Recycling/);
    assert.match(await page.locator('#industry-value-chart').innerText(), /6,500.00/);
    assert.equal(await page.locator('#industry-value-insight').isVisible(), true);
    await page.locator('#industry-measure').selectOption('count');
    assert.equal(await page.locator('#chart').isVisible(), true);
    assert.equal(await page.locator('#chart').textContent(), oldCounts);
  })();

  await check('Target industries retain teammate descriptions and show filtered segment calculations', async () => {
    await navigate(page, 'industries');
    const recycling = page.locator('#targets article').filter({ has: page.locator('strong').filter({ hasText: /^Recycling/ }) });
    assert.match(await recycling.innerText(), /Validate sorting, contamination & blend specifications/);
    assert.match(await recycling.innerText(), /6,500.00/);
    await recycling.locator('summary').click();
    assert.match(await recycling.innerText(), /Material processing|Plastics reclamation/);
    await page.locator('#target-analysis-filters-priority').selectOption('High');
    assert.equal(await page.locator('#overview-analysis-filters-priority').inputValue(), 'High');
    assert.match(await page.locator('#target-analysis-scope').innerText(), /Priority: High/);
    await page.locator('#target-analysis-filters [data-reset-analysis]').click();
  })();

  await check('existing calendar controls retain open-status behavior', async () => {
    await navigate(page, 'customers');
    await page.locator('#calendar-monthly').click();
    assert.equal(await page.locator('#calendar-monthly').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('.calendar-event[data-lead-status="Closed"]').count(), 0);
    await page.locator('[data-calendar-status="Qualified"]').click();
    assert.equal(await page.locator('.calendar-event:not([data-lead-status="Qualified"])').count(), 0);
    await page.locator('[data-calendar-status="all"]').click();
    await page.locator('#calendar-weekly').click();
    assert.match(await page.locator('#calendar-summary').innerText(), /Closed leads are excluded/);
  })();

  await check('add and edit persist the new shared fields', async () => {
    await page.locator('#clear').click();
    await page.locator('#add-customer').click();
    await page.locator('#company-field').fill('Demo Integration Test Company');
    await page.locator('#industry-field').selectOption('Agriculture');
    await page.locator('#status-field').selectOption('Qualified');
    await page.locator('#leadSource-field').selectOption('Website Inquiry');
    await page.locator('#customerSegment-field').fill('Greenhouse operations');
    await page.locator('#priority-field').selectOption('High');
    await page.locator('#opportunityValue-field').fill('1234.50');
    await page.locator('#follow-field').fill('2026-11-22');
    await page.locator('#form .dialog-actions .primary').click();
    await page.reload();
    const row = page.locator('#rows tr').filter({ hasText: 'Demo Integration Test Company' });
    await row.locator('button.edit').click();
    assert.equal(await page.locator('#leadSource-field').inputValue(), 'Website Inquiry');
    assert.equal(await page.locator('#customerSegment-field').inputValue(), 'Greenhouse operations');
    assert.equal(await page.locator('#priority-field').inputValue(), 'High');
    await page.locator('#leadSource-field').selectOption('Referral');
    await page.locator('#form .dialog-actions .primary').click();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('polymer-prospect-v1')));
    assert.equal(saved.find(row => row.company === 'Demo Integration Test Company').leadSource, 'Referral');
  })();

  await check('analytics react to edits and Closed exclusion without changing records', async () => {
    await navigate(page, 'overview');
    await page.locator('#overview-analysis-filters-customer_segment').selectOption('Greenhouse operations');
    assert.match(await page.locator('#analysis-summary').innerText(), /^1 matching hypothetical leads.*1 open.*1,234.50/);
    await navigate(page, 'customers');
    await page.locator('#rows tr').filter({ hasText: 'Demo Integration Test Company' }).locator('button.edit').click();
    await page.locator('#status-field').selectOption('Closed');
    await page.locator('#form .dialog-actions .primary').click();
    assert.match(await page.locator('#analysis-summary').textContent(), /^1 matching hypothetical leads.*0 open.*\$0.00/);
  })();

  await check('CSV retains table filtering and includes new field values', async () => {
    await page.locator('#search').fill('Demo Integration Test Company');
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#export').click();
    const download = await downloadPromise;
    const csv = await readFile(await download.path(), 'utf8');
    assert.match(csv, /FICTIONAL SAMPLE DATA/);
    assert.match(csv, /Lead source \(hypothetical\)/);
    assert.match(csv, /Demo Integration Test Company/);
    assert.match(csv, /Referral/);
    assert.match(csv, /Greenhouse operations/);
    assert.ok(!csv.includes('Aster Packaging Works'));
  })();

  await check('delete and explicit sample reset preserve existing workflows', async () => {
    await page.locator('#rows tr').filter({ hasText: 'Demo Integration Test Company' }).locator('button.edit').click();
    await page.locator('#delete').click();
    assert.match(await page.locator('#rows').innerText(), /No leads match/);
    await navigate(page, 'guide');
    await page.locator('#guide details > summary').click();
    await page.locator('#reset').click();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('polymer-prospect-v1')));
    assert.equal(saved.length, 20);
    assert.ok(saved.every(row => Object.hasOwn(row, 'leadSource')));
  })();

  await check('light/dark mode and mobile pages remain usable without page overflow', async () => {
    await page.locator('#theme-toggle').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.reload();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.setViewportSize({ width: 390, height: 844 });
    for (const id of ['overview', 'industries', 'customers']) {
      await navigate(page, id);
      assert.equal(await page.locator(`#${id}`).isVisible(), true);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${id} overflows viewport`);
    }
    await page.locator('#theme-toggle').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  })();
  await context.close();

  await check('legacy saved records are neither overwritten nor assigned invented metadata', async () => {
    const legacyContext = await browser.newContext();
    await legacyContext.addInitScript(() => {
      if (!localStorage.getItem('test-seeded')) {
        localStorage.setItem('polymer-prospect-v1', JSON.stringify([{ id: 'legacy', company: 'Demo Legacy Company', industry: 'Agriculture', status: 'New', contact: '', follow: '', opportunityValue: '', notes: 'Keep this note' }]));
        localStorage.setItem('polymer-prospect-v1-recycling-samples-1', 'done');
        localStorage.setItem('polymer-prospect-v1-weekly-followups-1', 'done');
        localStorage.setItem('test-seeded', 'done');
      }
    });
    const legacy = await legacyContext.newPage();
    legacy.on('pageerror', error => errors.push(error.message));
    await legacy.goto(url);
    assert.match(await legacy.locator('#analysis-summary').textContent(), /1 matching hypothetical leads.*Value unavailable.*1 open estimate/);
    assert.match(await legacy.locator('#source-performance-rows').textContent(), /Unassigned/);
    const original = await legacy.evaluate(() => localStorage.getItem('polymer-prospect-v1'));
    assert.equal(JSON.parse(original)[0].leadSource, undefined);
    await navigate(legacy, 'customers');
    await legacy.locator('#rows button.edit').click();
    for (const field of ['leadSource', 'customerSegment', 'priority']) assert.equal(await legacy.locator(`#${field}-field`).inputValue(), '');
    await legacy.locator('#form .dialog-actions .primary').click();
    await legacy.reload();
    const saved = await legacy.evaluate(() => JSON.parse(localStorage.getItem('polymer-prospect-v1')));
    assert.equal(saved[0].leadSource, '');
    assert.equal(saved[0].notes, 'Keep this note');
    await legacyContext.close();
  })();

  assert.deepEqual(errors, []);
  console.log(`${passed} browser regression checks passed; no page errors.`);
} finally {
  await browser.close();
}

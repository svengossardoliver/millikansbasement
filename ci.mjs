// Runs tests.html in headless Chromium and fails the build if any check fails.
// Used by .github/workflows/tests.yml; you never need to run it yourself.
import { chromium } from 'playwright';
const url = process.env.TEST_URL || 'http://localhost:8080/tests.html';
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', e => console.error('page error:', e.message));
await page.goto(url);
await page.waitForFunction(() => window.TEST_DONE === true, null, { timeout: 180000 });
const r = await page.evaluate(() => window.TEST_RESULTS);
await browser.close();
console.log(`${r.total - r.failed} / ${r.total} checks passed`);
if (r.failed) { for (const f of r.failures) console.log('  ✗ ' + f); process.exit(1); }

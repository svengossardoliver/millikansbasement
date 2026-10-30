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
console.log(`${r.total - r.failed} / ${r.total} checks passed`);
let failed = r.failed ? r.failures.slice() : [];

// Real-click check (the stale edit-box bug): tap a display, type, tap another display, type,
// then press FIRE without pressing Enter. Both typed values must stick and the shot must use them.
const app = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
app.on('pageerror', e => errs.push(e.message));
await app.goto(url.replace(/tests\.html.*$/, 'index.html?test=1'));
await app.waitForFunction(() => typeof modules === 'function' && modules().length > 0);
await app.waitForTimeout(300);
const cv = await app.$eval('#cv', c => { const b = c.getBoundingClientRect(); return { x: b.left, y: b.top }; });
// Geometry is read fresh before every tap: committing a value can rescale the view.
const geo = () => app.evaluate(() => {
  const d = {}; for (const m of modules()) if (m.disp) d[m.key] = m.disp;
  const g = launcher(); return { d, fire: g && g.fire };
});
const tapDisp = async k => { const b = (await geo()).d[k]; return app.mouse.click(cv.x + b.x + b.w / 2, cv.y + b.y + b.h / 2); };
const typeIn = async v => { await app.keyboard.press('Control+A'); await app.keyboard.type(v); };
await tapDisp('d'); await typeIn('3');
await tapDisp('L'); await typeIn('4');
const f = (await geo()).fire;
await app.mouse.click(cv.x + f.x, cv.y + f.y);
await app.waitForTimeout(400);
const got = await app.evaluate(() => ({ d: ctlDefs.d.get(), L: ctlDefs.L.get(), boxOpen: document.getElementById('modInput').style.display !== 'none', shotD: shots[0] && shots[0].res && shots[0].res.st ? shots[0].res.st.d : null, nShots: shots.length }));
const ok = got.d === 3 && got.L === 4 && !got.boxOpen && got.nShots > 0;
console.log(`${ok ? 'PASS' : 'FAIL'}  real clicks: typed values stick and FIRE commits the open box  · ${JSON.stringify(got)}`);
if (!ok) failed.push('real clicks: typed values stick and FIRE commits the open box');
if (errs.length) { failed.push('script errors during real-click check: ' + errs.join('; ')); }

await browser.close();
if (failed.length) { for (const f of failed) console.log('  ✗ ' + f); process.exit(1); }

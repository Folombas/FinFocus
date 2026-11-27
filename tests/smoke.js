'use strict';
/* Playwright smoke по ТЗ (коммит 13): регрессионная сеть на классы дефектов
 * B1 (база SW) и B2 (мгновенное обновление трекера) + офлайн и поиск.
 * Скриншоты для G5 складываются в tests/artifacts/ и выгружаются артефактом CI. */
var fs = require('fs');
var path = require('path');
var chromium = require('playwright').chromium;

var BASE = 'http://127.0.0.1:8080';
var ART = path.join(__dirname, 'artifacts');

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg);
  console.log('OK: ' + msg);
}

(async function () {
  fs.mkdirSync(ART, { recursive: true });
  var browser = await chromium.launch();
  var ctx = await browser.newContext();
  var page = await ctx.newPage();
  var report = {};

  // 1. SW активен и его scriptURL на базе сайта
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(4000);
  report.swUrl = await page.evaluate(function () {
    return navigator.serviceWorker.ready.then(function (reg) { return reg.active ? reg.active.scriptURL : null; });
  });
  assert(String(report.swUrl).indexOf('/sw.js') !== -1, 'service worker active: ' + report.swUrl);
  await page.screenshot({ path: path.join(ART, 'g5-1-home.png') });

  // 2. Офлайн-перезагрузка с глубокого URL
  await ctx.setOffline(true);
  await page.goto(BASE + '/articles/start.html', { waitUntil: 'load' });
  var offlineH1 = await page.textContent('h1');
  assert(String(offlineH1).indexOf('Нет сети') === -1, 'deep offline reload served from cache: ' + offlineH1);
  await page.screenshot({ path: path.join(ART, 'g5-2-offline-deep.png') });
  await ctx.setOffline(false);

  // 3. Трекер: добавление сразу меняет сумму
  await page.goto(BASE + '/app.html', { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  var before = String(await page.textContent('#trackSaved'));
  await page.fill('#trackAmount', '5000');
  await page.click('#trackAdd');
  await page.waitForTimeout(1500);
  var after = String(await page.textContent('#trackSaved'));
  assert(before !== after, 'tracker updates immediately: ' + before + ' -> ' + after);
  await page.screenshot({ path: path.join(ART, 'g5-3-tracker.png') });

  // 4. Поиск находит слово «подушка»
  await page.goto(BASE + '/search.html?q=%D0%BF%D0%BE%D0%B4%D1%83%D1%88%D0%BA%D0%B0', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  var hits = await page.locator('#searchResults li').count();
  assert(hits > 0, 'search finds results for query, hits=' + hits);

  fs.writeFileSync(path.join(ART, 'smoke-report.json'), JSON.stringify(report, null, 2));
  await browser.close();
  console.log('SMOKE PASSED');
})().catch(function (e) { console.error(e && e.message || e); process.exit(1); });

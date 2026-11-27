'use strict';
/* Структурные гейты ТЗ (коммит 14): проверяем форму решения, а не счётчики подстрок.
 * Запуск в CI: node .github/scripts/structural-gates.js */
var fs = require('fs');

var failed = 0;
function check(name, cond) {
  console.log((cond ? 'OK   ' : 'FAIL ') + name);
  if (!cond) failed = 1;
}

// 1. База SW вычисляется вне load-обработчика
var theme = fs.readFileSync('js/theme.js', 'utf8');
var loadIdx = theme.indexOf("addEventListener('load'");
var baseIdx = theme.indexOf('var FF_BASE');
check('FF_BASE declared at parse time, before the load handler',
  baseIdx !== -1 && loadIdx !== -1 && baseIdx < loadIdx);
check('SW registered with explicit scope', theme.indexOf('scope: FF_BASE') !== -1);

// 2. Очистка кэшей фильтрует по префиксу finfocus- и текущему набору
var sw = fs.readFileSync('sw.js', 'utf8');
var actIdx = sw.indexOf("addEventListener('activate'");
var actSeg = actIdx === -1 ? '' : sw.slice(actIdx, actIdx + 900);
check('activate deletes only finfocus- caches outside the current set',
  actSeg.indexOf("indexOf('finfocus-') === 0") !== -1 && actSeg.indexOf('CACHES.indexOf(k)') !== -1);

// 3. offline.html без относительных путей к ассетам
var off = fs.readFileSync('offline.html', 'utf8');
check('offline.html has no relative asset links',
  off.indexOf('href="css/') === -1 && off.indexOf("href='css/") === -1 && off.indexOf('src="css/') === -1);

// 4. navigate-ветка проверяет res.ok перед cache.put
var navIdx = sw.indexOf("req.mode === 'navigate'");
var navSeg = navIdx === -1 ? '' : sw.slice(navIdx, navIdx + 600);
check('navigate branch requires res.ok before caching', navSeg.indexOf('res.ok') !== -1);


// 5. JSON-LD: все ld+json блоки парсятся как JSON (коммит 20)
function extractLd(html) {
  var out = [];
  var marker = '<script type="application/ld+json">';
  var parts = html.split(marker);
  for (var i = 1; i < parts.length; i++) {
    var end = parts[i].indexOf('</' + 'script>');
    if (end !== -1) out.push(parts[i].slice(0, end));
  }
  return out;
}
var ldPages = ['index.html'].concat(
  fs.readdirSync('articles').filter(function (f) { return f.slice(-5) === '.html'; }).map(function (f) { return 'articles/' + f; })
);
var ldCount = 0;
ldPages.forEach(function (p) {
  extractLd(fs.readFileSync(p, 'utf8')).forEach(function (raw, i) {
    ldCount += 1;
    try {
      var obj = JSON.parse(raw);
      check('JSON-LD parses: ' + p + ' #' + (i + 1), !!obj && typeof obj === 'object');
    } catch (e) {
      check('JSON-LD parses: ' + p + ' #' + (i + 1) + ' (' + String(e).slice(0, 80) + ')', false);
    }
  });
});
console.log('JSON-LD blocks validated: ' + ldCount);

process.exit(failed);

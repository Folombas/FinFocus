// @ts-check
(function () {
'use strict';

/* Курсы ЦБ: data/rates.json собирает CI (rates.yml). Файл может
 * отсутствовать или устареть: это не ошибка, а честная пометка. */
document.addEventListener('DOMContentLoaded', function () {
    var box = /** @type {HTMLElement|null} */ (document.getElementById('ratesBox'));
    if (!box) return;

    var sc = /** @type {HTMLScriptElement | null} */ (document.currentScript);
    var base = '';
    if (sc && sc.src) {
        base = new URL('../', sc.src).pathname;
    }

    function fmtNum(num) {
        return Math.round(num).toLocaleString('ru-RU');
    }

    fetch(base + 'data/rates.json').then(function (r) {
        if (!r.ok) throw new Error('no rates file');
        return r.json();
    }).then(function (d) {
        var date = d && d.date ? new Date(d.date) : null;
        var days = date ? Math.max(0, Math.round((Date.now() - date.getTime()) / 86400000)) : null;
        var line = 'USD ' + (d.usd ? fmtNum(d.usd.value) + ' ₽' : 'н/д')
            + ' · EUR ' + (d.eur ? fmtNum(d.eur.value) + ' ₽' : 'н/д')
            + ' · CNY ' + (d.cny ? fmtNum(d.cny.value) + ' ₽' : 'н/д');
        var when = date ? date.toLocaleDateString('ru-RU') : '';
        var stale = when
            ? (days !== null && days > 3 ? ' (данные от ' + when + ', ' + days + ' дн. назад)' : ' (данные от ' + when + ')')
            : '';
        box.textContent = '💱 Курсы ЦБ: ' + line + stale;
    }).catch(function () {
        box.textContent = '💱 Курсы ЦБ: пока нет данных (первый снимок появится после прогона rates.yml).';
    });
});
})();

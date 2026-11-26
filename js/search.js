// @ts-check
(function () {
'use strict';

/* Поиск по статическому индексу data/search-index.json: работает без сервера. */
document.addEventListener('DOMContentLoaded', function () {
    var input = /** @type {HTMLInputElement|null} */ (document.getElementById('searchInput'));
    var status = /** @type {HTMLElement|null} */ (document.getElementById('searchStatus'));
    var list = /** @type {HTMLElement|null} */ (document.getElementById('searchResults'));
    if (!input || !list) return;

    /** @type {Array<{title: string, emoji: string, url: string, description: string, keywords: string}>} */
    var index = [];

    function render() {
        var q = (input.value || '').trim().toLowerCase();
        list.textContent = '';
        if (!q) {
            if (status) status.textContent = 'Введите слово или две: индекс содержит все ' + index.length + ' страниц сайта.';
            return;
        }
        var words = q.split(/\s+/);
        var hits = index.filter(function (item) {
            var hay = (item.title + ' ' + item.description + ' ' + item.keywords).toLowerCase();
            return words.every(function (w) { return hay.indexOf(w) !== -1; });
        });
        if (status) {
            status.textContent = hits.length
                ? 'Найдено: ' + hits.length
                : 'Ничего не нашлось. Попробуйте другое слово.';
        }
        hits.forEach(function (item) {
            var li = document.createElement('li');
            li.className = 'search-hit';
            var a = document.createElement('a');
            a.href = item.url;
            a.textContent = (item.emoji ? item.emoji + ' ' : '') + item.title;
            var p = document.createElement('span');
            p.textContent = item.description;
            li.appendChild(a);
            li.appendChild(p);
            list.appendChild(li);
        });
    }

    fetch('data/search-index.json')
        .then(function (res) { return res.json(); })
        .then(function (data) {
            index = data;
            if (status) status.textContent = 'Индекс загружен: ' + index.length + ' страниц.';
            render();
        })
        .catch(function () {
            if (status) status.textContent = 'Индекс не загрузился (нужен http, а не file://).';
        });

    var timer = null;
    input.addEventListener('input', function () {
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(render, 120);
    });

    /* Поисковый запрос можно передать строкой адреса: search.html?q=подушка */
    var params = new URLSearchParams(location.search);
    var q = params.get('q');
    if (q) input.value = q;
});
})();

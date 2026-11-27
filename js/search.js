// @ts-check
(function () {
'use strict';

/* Поиск по статическому индексу data/search-index.json: работает без сервера.
 * Навигация стрелками и Enter, aria-live статус, последние запросы. */
document.addEventListener('DOMContentLoaded', function () {
    var input = /** @type {HTMLInputElement|null} */ (document.getElementById('searchInput'));
    var status = /** @type {HTMLElement|null} */ (document.getElementById('searchStatus'));
    var list = /** @type {HTMLElement|null} */ (document.getElementById('searchResults'));
    if (!input || !list) return;

    var REC_KEY = 'finfocus-search-recents';

    /** @type {Array<{title: string, emoji: string, url: string, description: string, keywords: string}>} */
    var index = [];

    function recents() {
        try {
            var raw = localStorage.getItem(REC_KEY);
            var arr = raw ? JSON.parse(String(raw)) : [];
            return Array.isArray(arr) ? arr.slice(0, 5) : [];
        } catch (e) { return []; }
    }

    function pushRecent(q) {
        if (!q) return;
        var arr = recents().filter(function (x) { return x !== q; });
        arr.unshift(q);
        try { localStorage.setItem(REC_KEY, JSON.stringify(arr.slice(0, 5))); } catch (e) {}
    }

    function showRecents() {
        var arr = recents();
        if (!arr.length) return;
        list.textContent = '';
        if (status) status.textContent = 'Недавние запросы:';
        arr.forEach(function (q) {
            var li = document.createElement('li');
            li.className = 'search-hit search-recent';
            var a = document.createElement('a');
            a.href = '#';
            a.textContent = '🕘 ' + q;
            a.addEventListener('click', function (e) {
                e.preventDefault();
                input.value = q;
                render();
            });
            li.appendChild(a);
            list.appendChild(li);
        });
    }

    var active = -1;

    function markActive() {
        var items = list.querySelectorAll('a');
        for (var i = 0; i < items.length; i++) {
            items[i].setAttribute('aria-selected', i === active ? 'true' : 'false');
            items[i].style.outline = i === active ? '2px solid #1f6feb' : '';
        }
    }

    function render() {
        var q = (input.value || '').trim().toLowerCase();
        active = -1;
        list.textContent = '';
        if (!q) {
            showRecents();
            if (!recents().length && status) status.textContent = 'Введите слово или две: индекс содержит все ' + index.length + ' страниц сайта.';
            return;
        }
        var words = q.split(/\s+/);
        var hits = index.filter(function (item) {
            var hay = (item.title + ' ' + item.description + ' ' + item.keywords).toLowerCase();
            return words.every(function (w) { return hay.indexOf(w) !== -1; });
        });
        if (status) {
            status.textContent = hits.length
                ? 'Найдено: ' + hits.length + '. Стрелки: выбрать, Enter: открыть.'
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
            if (status && !input.value) status.textContent = 'Индекс загружен: ' + index.length + ' страниц.';
        })
        .catch(function () {
            if (status) status.textContent = 'Индекс не загрузился (нужен http, а не file://).';
        });

    var timer = null;
    input.addEventListener('input', function () {
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(render, 120);
    });

    input.addEventListener('keydown', function (e) {
        var links = list.querySelectorAll('a');
        if (!links.length) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            active = Math.min(active + 1, links.length - 1);
            markActive();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            active = Math.max(active - 1, 0);
            markActive();
        } else if (e.key === 'Enter') {
            var i = active >= 0 ? active : 0;
            var href = links[i] && links[i].getAttribute('href');
            if (input.value.trim()) pushRecent(input.value.trim());
            if (href && href !== '#') window.location.href = href;
        } else if (e.key === 'Escape') {
            input.value = '';
            render();
        }
    });

    /* Поисковый запрос можно передать строкой адреса: search.html?q=подушка */
    var params = new URLSearchParams(location.search);
    var q = params.get('q');
    if (q) { input.value = q; pushRecent(q.trim()); }
    render();
});
})();

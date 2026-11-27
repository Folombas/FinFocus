/* FinFocus Service Worker: офлайн-режим и мгновенная повторная загрузка.
 * Версия кэша: при изменении набора файлов поднимите VERS, старый кэш удалится сам. */
var VERS = 'v2';
var SHELL_CACHE = 'finfocus-' + VERS + '-shell';
var PAGES_CACHE = 'finfocus-' + VERS + '-pages';
var DATA_CACHE = 'finfocus-' + VERS + '-data';
var CACHES = [SHELL_CACHE, PAGES_CACHE, DATA_CACHE];

/* Оболочка: то, без чего страница не выглядит и не работает сайтом */
var SHELL = [
    'offline.html',
    'css/style.css',
    'css/modern.css',
    'css/streaming.css',
    'js/theme.js',
    'js/menu.js',
    'js/effects.js',
    'js/main.js',
    'js/app.js',
    'js/streaming.js',
    'js/tracker.js',
    'js/search.js',
    'favicon.svg',
    'manifest.webmanifest'
];

/* Страницы и их данные */
var PAGES = [
    'index.html', 'budget.html', 'savings.html', 'discounts.html', 'finlit.html',
    'habits.html', 'loans.html', 'vyhod.html', 'health.html', 'streaming.html',
    'streaming-law.html', 'streaming-platforms.html', 'bicycle.html', 'app.html',
    'search.html', 'articles/index.html', 'articles/start.html',
    'articles/bezdenezhe.html', 'articles/inflyaciya.html', 'articles/github-pages.html',
    'data/search-index.json'
];


self.addEventListener('install', function (e) {
    /* Без self.skipWaiting(): новая версия активируется только после
     * подтверждения пользователем (кнопка в js/theme.js). */
    e.waitUntil(caches.open(SHELL_CACHE).then(function (shell) {
        return caches.open(PAGES_CACHE).then(function (pages) {
            /* Поштучно и через allSettled: addAll атомарен, и одна ошибка
             * отменила бы кэширование всего офлайн-ядра. */
            var jobs = SHELL.map(function (p) { return shell.add(p); })
                .concat(PAGES.map(function (p) { return pages.add(p); }));
            return Promise.allSettled(jobs);
        });
    }));
});

self.addEventListener('activate', function (e) {
    e.waitUntil(caches.keys().then(function (keys) {
        /* Удаляем только свои кэши: на общем origin (folombas.github.io)
         * живут кэши соседних проектов (web-games и других), их трогать нельзя. */
        return Promise.all(keys.map(function (k) {
            return (k.indexOf('finfocus-') === 0 && CACHES.indexOf(k) === -1) ? caches.delete(k) : null;
        }));
    }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('message', function (e) {
    if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', function (e) {
    var req = e.request;
    if (req.method !== 'GET') return;
    var url = new URL(req.url);
    if (url.origin !== location.origin) return;

    /* Данные (курсы валют): сеть первым делом, чтобы data/rates.json
     * не «залипал» в cache-first навсегда; при обрыве отдаём последний
     * успешный снимок из кэша. */
    if (url.pathname.indexOf('/data/') !== -1) {
        e.respondWith(caches.match(req).then(function (hit) {
            /* stale-while-revalidate: снимок из кэша отдаём мгновенно,
             * сеть параллельно обновляет data-кэш (курсы ЦБ не «залипают») */
            var net = fetch(req).then(function (res) {
                if (res && res.ok) {
                    var copy = res.clone();
                    caches.open(DATA_CACHE).then(function (c) { c.put(req, copy); });
                }
                return res;
            });
            if (hit) { net.catch(function () { /* снимок остаётся актуальным */ }); return hit; }
            return net;
        }));
        return;
    }

    /* Навигация: сеть первым делом, при обрыве кэш, затем offline.html.
     * Кэшируем только успешные ответы: 404/500 в кэш не попадают. */
    if (req.mode === 'navigate') {
        e.respondWith(fetch(req).then(function (res) {
            if (res && res.ok && !res.redirected) {
                var copy = res.clone();
                caches.open(PAGES_CACHE).then(function (c) { c.put(req, copy); });
            }
            return res;
        }).catch(function () {
            return caches.match(req).then(function (hit) {
                return hit || caches.match('offline.html');
            });
        }));
        return;
    }

    /* Статика: кэш первым, мимо кэша докачиваем в рантайме. */
    e.respondWith(caches.match(req).then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (res) {
            if (res && res.status === 200 && res.type === 'basic') {
                var copy = res.clone();
                caches.open(PAGES_CACHE).then(function (c) { c.put(req, copy); });
            }
            return res;
        }).catch(function () {
            /* Нет сети и нет кэша: явная ошибка вместо undefined,
             * который браузер считает сбоем respondWith. */
            return new Response('', { status: 504, statusText: 'Offline' });
        });
    }));
});

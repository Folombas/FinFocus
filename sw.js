/* FinFocus Service Worker: офлайн-режим и мгновенная повторная загрузка.
 * Версия кэша: при изменении набора файлов поднимите VERS, старый кэш удалится сам. */
var VERS = 'v1';
var CACHE = 'finfocus-' + VERS;
var CORE = [
    'offline.html',
    'index.html',
    'css/style.css',
    'css/modern.css',
    'js/theme.js',
    'js/menu.js',
    'js/effects.js',
    'js/main.js',
    'favicon.svg',
    'manifest.webmanifest'
];

self.addEventListener('install', function (e) {
    self.skipWaiting();
    e.waitUntil(caches.open(CACHE).then(function (c) {
        return c.addAll(CORE).catch(function () { /* кэшируем что смогли */ });
    }));
});

self.addEventListener('activate', function (e) {
    e.waitUntil(caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (k) {
            return k === CACHE ? null : caches.delete(k);
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

    /* Навигация: сеть первым делом, при обрыве кэш, затем offline.html */
    if (req.mode === 'navigate') {
        e.respondWith(fetch(req).then(function (res) {
            var copy = res.clone();
            caches.open(CACHE).then(function (c) { c.put(req, copy); });
            return res;
        }).catch(function () {
            return caches.match(req).then(function (hit) {
                return hit || caches.match('offline.html');
            });
        }));
        return;
    }

    /* Статика: кэш первым, мимо кэша докачиваем в рантайме */
    e.respondWith(caches.match(req).then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (res) {
            if (res && res.status === 200 && res.type === 'basic') {
                var copy = res.clone();
                caches.open(CACHE).then(function (c) { c.put(req, copy); });
            }
            return res;
        }).catch(function () { return hit; });
    }));
});

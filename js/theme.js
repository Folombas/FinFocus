// @ts-check
(function () {
'use strict';

/** @type {string} */ var KEY = 'finfocus-theme';
/** @type {HTMLElement} */ var root = document.documentElement;

/** База URL сайта, вычисленная из адреса текущего скрипта (js/theme.js):
 *  «/FinFocus/» на проектной странице Pages или «/» на пользовательском домене.
 *  @returns {string} */
function urlBase() {
    var script = /** @type {HTMLScriptElement | null} */ (document.currentScript);
    if (script && script.src) {
        var m = String(script.src).match(/^(.*\/)js\//i);
        if (m) return m[1];
    }
    return '';
}

/** Добавляет Speculation Rules: лёгкий prefetch внутренних страниц списка,
 *  чтобы навигация по сайту ощущалась мгновенной.
 *  Браузеры без поддержки просто игнорируют тег. */
function injectSpeculationRules() {
    var pages = ['index.html', 'budget.html', 'savings.html', 'discounts.html', 'finlit.html',
        'habits.html', 'loans.html', 'vyhod.html', 'health.html', 'streaming.html',
        'streaming-platforms.html', 'streaming-law.html', 'bicycle.html', 'app.html', 'articles/index.html'];
    var urls = pages.map(function (p) { return urlBase() + p; });
    var rules = { prefetch: [{ source: 'list', eagerness: 'conservative', urls: urls }] };
    var el = document.createElement('script');
    el.type = 'speculationrules';
    el.textContent = JSON.stringify(rules);
    document.head.appendChild(el);
}
injectSpeculationRules();

/** @returns {'light'|'dark'} текущая системная тема */
function systemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}
/** @returns {'light'|'dark'} тема, применённая к документу сейчас */
function current() {
    return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}
/** Применяет тему к html, meta theme-color и всем кнопкам .theme-toggle
 * @param {'light'|'dark'} theme */
function apply(theme) {
    root.setAttribute('data-theme', theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#eef2fa' : '#0e1118');
    var buttons = document.querySelectorAll('.theme-toggle');
    for (var i = 0; i < buttons.length; i++) {
        var b = buttons[i];
        b.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
        b.setAttribute('title', theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему');
    }
}

// Тема применяется сразу, до первой отрисовки (скрипт подключён в <head>)
/** @type {string|null} */ var stored = null;
try { stored = localStorage.getItem(KEY); } catch (e) {}
apply(stored === 'light' || stored === 'dark' ? stored : systemTheme());

document.addEventListener('DOMContentLoaded', function () {
    // Кнопки переключения темы
    var buttons = document.querySelectorAll('.theme-toggle');
    for (var i = 0; i < buttons.length; i++) {
        (function (btn) {
            btn.addEventListener('click', function () {
                /** @type {'light'|'dark'} */ var next = current() === 'light' ? 'dark' : 'light';
                try { localStorage.setItem(KEY, next); } catch (e) {}
                apply(next);
            });
        })(buttons[i]);
    }

    // Плавная кнопка «наверх»
    var toTop = document.createElement('button');
    toTop.type = 'button';
    toTop.className = 'to-top';
    toTop.setAttribute('aria-label', 'Наверх');
    toTop.setAttribute('title', 'Наверх');
    toTop.textContent = '↑';
    document.body.appendChild(toTop);

    var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var update = function () {
        toTop.classList.toggle('visible', window.scrollY > 480);
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
    toTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
    });
});
})();

/* PWA: офлайн-режим через Service Worker.
 * Регистрируем только на проде Pages (http(s)), в локальных file:// тихо пропускаем. */

/* База сайта для SW. Вычисляется на этапе выполнения скрипта: внутри
 * load-обработчика document.currentScript уже равен null, и база
 * ошибочно схлопнулась бы в '/'. */
var pwaBase = (function () {
    var sc = /** @type {HTMLScriptElement | null} */ (document.currentScript);
    if (sc && sc.src) {
        var mm = String(sc.src).match(/^(.*\/)js\//i);
        if (mm) return mm[1];
    }
    return '/';
})();

/* Был ли контролирующий SW на момент загрузки страницы: отличаем первый
 * перехват управления (claim, без перезагрузки) от смены версии (нужен reload). */
var hadController = 'serviceWorker' in navigator && !!navigator.serviceWorker.controller;

if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register(pwaBase + 'sw.js').then(function (reg) {
            /* Обновление только по действию пользователя: не перезагружаем
             * страницу молча посреди ввода данных (трекер, калькуляторы). */
            if (reg.waiting && hadController) showUpdateToast(reg.waiting);
            reg.addEventListener('updatefound', function () {
                var nw = reg.installing;
                if (!nw) return;
                nw.addEventListener('statechange', function () {
                    if (nw.state === 'installed' && hadController) showUpdateToast(nw);
                });
            });
        }).catch(function () { /* офлайн-режим не критичен */ });
    });
}

/** Кнопка «доступно обновление»: применяет новую версию SW по клику.
 * @param {ServiceWorker} worker */
function showUpdateToast(worker) {
    if (document.getElementById('sw-update')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'sw-update';
    btn.textContent = '🔄 Доступно обновление сайта. Нажмите, чтобы применить';
    btn.setAttribute('aria-label', 'Применить обновление сайта и перезагрузить страницу');
    btn.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:9999;cursor:pointer;'
        + 'padding:10px 14px;border-radius:10px;border:1px solid rgba(127,127,127,.4);'
        + 'font:inherit;font-size:14px;background:#1f6feb;color:#fff;';
    btn.addEventListener('click', function () { worker.postMessage('skipWaiting'); });
    document.body.appendChild(btn);
}

var swRefreshing = false;
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (!hadController || swRefreshing) return;
        swRefreshing = true;
        window.location.reload();
    });
}

// @ts-check
(function () {
'use strict';

/** @type {string} */ var KEY = 'finfocus-theme';
/** @type {HTMLElement} */ var root = document.documentElement;

/** Подключает css/modern.css с корректным префиксом пути для вложенных страниц:
 *  url скрипта js/theme.js разбирается на базу сайта (/FinFocus/ или /).
 *  Страница полностью рабоча и без этого слоя. */
function injectModernCss() {
    var script = document.currentScript;
    var prefix = '';
    if (script && script.src) {
        var m = String(script.src).match(/^(.*\/)js\//i);
        if (m) prefix = m[1];
    }
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = prefix + 'css/modern.css';
    document.head.appendChild(link);
}
injectModernCss();

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
                var next = current() === 'light' ? 'dark' : 'light';
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

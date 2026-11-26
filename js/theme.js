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

(function () {
'use strict';

var KEY = 'finfocus-theme';
var root = document.documentElement;

function systemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}
function current() {
    return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}
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
var stored = null;
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

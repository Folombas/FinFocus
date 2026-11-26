// @ts-check
/* js/streaming.js — интерактив раздела «Стриминг».
   Переиспользует глобальные initSliderCalc / formatNum / fmtRub из js/main.js.
   С проектным tsconfig (lib DOM) доступ к ним — обычный, через window.*;
   состав Window дополнен JSDoc-типом ниже вместо строковых обходов. */

/**
 * Глобалы FinFocus, объявленные в main.js.
 * @typedef {Window & {
 *   initSliderCalc: (opts: import("./main.js").SliderCalcOptions) => void,
 *   formatNum: (num: number) => string,
 *   fmtRub: (num: number) => string
 * }} FinFocusWindow
 */

(function () {
    'use strict';

    /** @type {FinFocusWindow} */
    var w = window;

    /* Калькулятор донатов: N зрителей -> доход в месяц и за эфир. */
    document.addEventListener('DOMContentLoaded', function () {
        var viewers = document.getElementById('viewersSlider');
        var service = document.getElementById('serviceSelect');
        if (!viewers || !service) return; // не наша страница — тихо выходим

        /* Комиссии как доля: актуально на 26.11.2026, значения в select#serviceSelect. */
        function computeFn(values) {
            var rate = parseFloat(service.value) || 0;
            var gross = values[0] * (values[1] / 100) * values[2] * values[3];
            var net = gross * (1 - rate);
            var perStream = values[3] > 0 ? net / values[3] : 0;
            return {
                labels: [
                    w.formatNum(values[0]) + ' зрителей',
                    values[1] + '% донатят',
                    w.fmtRub(values[2]) + ' средний донат',
                    values[3] + ' эфиров в месяц'
                ],
                results: [
                    w.fmtRub(gross),
                    w.fmtRub(net),
                    w.fmtRub(perStream)
                ]
            };
        }

        w.initSliderCalc({
            inputs: ['viewersSlider', 'convSlider', 'donateSlider', 'streamsSlider'],
            labels: ['viewersLabel', 'convLabel', 'donateLabel', 'streamsLabel'],
            results: ['calcGross', 'calcNet', 'calcPerStream'],
            compute: computeFn
        });

        /* Смена сервиса меняет комиссию — перезапускаем пересчёт слайдером. */
        service.addEventListener('change', function () {
            viewers.dispatchEvent(new Event('input'));
        });
    });
})();

/* Переключатель площадок: табы с клавиатурой (стрелки/Home/End). */
(function () {
    'use strict';
    document.addEventListener('DOMContentLoaded', function () {
        var tabs = Array.prototype.slice.call(document.querySelectorAll('.plat-tab'));
        if (!tabs.length) return;

        /** @param {HTMLElement} tab активирует вкладку и её панель */
        function selectTab(tab) {
            tabs.forEach(function (t) {
                var on = t === tab;
                t.setAttribute('aria-selected', on ? 'true' : 'false');
                t.tabIndex = on ? 0 : -1;
                var panel = document.getElementById(t.getAttribute('data-target'));
                if (panel) panel.hidden = !on;
            });
            tab.focus();
        }

        tabs.forEach(function (tab, idx) {
            tab.addEventListener('click', function () { selectTab(tab); });
            tab.addEventListener('keydown', function (e) {
                var next = null;
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    next = tabs[(idx + 1) % tabs.length];
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    next = tabs[(idx - 1 + tabs.length) % tabs.length];
                } else if (e.key === 'Home') {
                    next = tabs[0];
                } else if (e.key === 'End') {
                    next = tabs[tabs.length - 1];
                }
                if (next) { e.preventDefault(); selectTab(next); }
            });
        });
    });
})();

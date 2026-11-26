/* js/streaming.js — интерактив раздела «Стриминг».
   Переиспользует глобальные initSliderCalc / formatNum / fmtRub из js/main.js. */
(function () {
    'use strict';

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
                    window.formatNum(values[0]) + ' зрителей',
                    values[1] + '% донатят',
                    window.fmtRub(values[2]) + ' средний донат',
                    values[3] + ' эфиров в месяц'
                ],
                results: [
                    window.fmtRub(gross),
                    window.fmtRub(net),
                    window.fmtRub(perStream)
                ]
            };
        }

        window.initSliderCalc({
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

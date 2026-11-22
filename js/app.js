(function () {
'use strict';

function fmt(n) { return Math.round(n).toLocaleString('ru-RU') + ' ₽'; }

document.addEventListener('DOMContentLoaded', function () {

    // === Симулятор бюджета ===
    var income = document.getElementById('income');
    if (income) {
        var outMonth = document.getElementById('outMonth');
        var outYear = document.getElementById('outYear');
        var outCushion = document.getElementById('outCushion');
        var incomeVal = document.getElementById('incomeVal');
        var vMust = document.getElementById('vMust'), vImp = document.getElementById('vImp'), vFree = document.getElementById('vFree');
        var dMust = document.getElementById('dMust'), dImp = document.getElementById('dImp'), dFree = document.getElementById('dFree');
        var hint = document.getElementById('budgetHint');

        var impulses = function () {
            var s = 0;
            document.querySelectorAll('.habit').forEach(function (h) {
                if (h.checked) s += Number(h.getAttribute('data-price')) || 0;
            });
            return s;
        };
        var share = function () {
            var r = document.querySelector('input[name="scenario"]:checked');
            return r ? (Number(r.getAttribute('data-share')) || 55) / 100 : 0.55;
        };

        function update() {
            var inc = Number(income.value);
            incomeVal.textContent = fmt(inc);
            var must = inc * share();
            var imp = impulses();
            var free = Math.max(0, inc - must - imp);

            outMonth.textContent = fmt(free);
            outYear.textContent = fmt(free * 12);
            var cushion = 3 * (must + imp);
            outCushion.textContent = free > 0 ? Math.ceil(cushion / free) + ' мес.' : 'нет запаса';

            var pct = function (v) { return inc > 0 ? (v / inc * 100).toFixed(1) + '%' : '0%'; };
            dMust.style.width = pct(must);
            dImp.style.width = pct(imp);
            dFree.style.width = pct(free);
            vMust.textContent = fmt(must);
            vImp.textContent = fmt(imp);
            vFree.textContent = fmt(free);

            var impShare = inc > 0 ? imp / inc : 0;
            if (free <= 0) {
                hint.classList.add('warn');
                hint.textContent = '🚨 Расходы съедают весь доход. Выключи пару тумблеров или выбери сценарий с меньшей долей обязательного.';
            } else if (impShare > 0.25) {
                hint.classList.add('warn');
                hint.textContent = '⚠️ Импульсивные траты — это уже ' + Math.round(impShare * 100) + '% дохода. Правило 50/30/20 говорит: на «желания» должно уходить до ' + 30 + '%.';
            } else {
                hint.classList.remove('warn');
                hint.textContent = '💡 Крепко! Переводите Свободное на накопительный счёт в день зарплаты — до того, как заметишь эти деньги в кошельке.';
            }
        }

        income.addEventListener('input', update);
        document.querySelectorAll('.habit').forEach(function (h) { h.addEventListener('change', update); });
        document.querySelectorAll('input[name="scenario"]').forEach(function (r) { r.addEventListener('change', update); });
        update();
    }

    // === Квиз ===
    var quizCheck = document.getElementById('quizCheck');
    if (quizCheck) {
        var score = document.getElementById('quizScore');
        var names = ['q1', 'q2', 'q3', 'q4'];
        quizCheck.addEventListener('click', function () {
            var answered = 0, right = 0;
            names.forEach(function (name) {
                var checked = document.querySelector('input[name="' + name + '"]:checked');
                document.querySelectorAll('input[name="' + name + '"]').forEach(function (o) {
                    var label = o.closest('.quiz-opt');
                    if (label) label.classList.remove('correct', 'wrong');
                });
                if (!checked) return;
                answered++;
                if (checked.getAttribute('data-correct') === 'true') {
                    right++;
                    var lab = checked.closest('.quiz-opt');
                    if (lab) lab.classList.add('correct');
                } else {
                    var lab2 = checked.closest('.quiz-opt');
                    if (lab2) lab2.classList.add('wrong');
                }
            });
            if (answered === 0) { score.textContent = '🤔 Сначала выбери хотя бы один ответ'; }
            else if (right === names.length) { if (window.finfocusBurst) { var r0 = quizCheck.getBoundingClientRect(); finfocusBurst(r0.left + r0.width / 2, r0.top + r0.height / 2, 30); }
            score.textContent = '🏆 ' + right + ' из ' + names.length + ' — финансовый ниндзя!'; }
            else { score.textContent = '✅ ' + right + ' из ' + names.length + '. Красные подсвечены не зря — перечитай и попробуй ещё раз.'; }
        });
        var quizReset = document.getElementById('quizReset');
        quizReset.addEventListener('click', function () {
            document.querySelectorAll('.quiz-opt').forEach(function (l) { l.classList.remove('correct', 'wrong'); });
            document.querySelectorAll('.quiz input[type="radio"]').forEach(function (r) { r.checked = false; });
            score.textContent = '';
        });
    }
});
})();

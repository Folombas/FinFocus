// @ts-check
'use strict';

/* ============================================================
   FinFocus — main.js: интерактив калькуляторов, FAQ, reveal.
   Раньше здесь жили три копии форматтера чисел и две
   конфликтующие системы анимаций. Теперь: один форматтер,
   одна схема «ползунки -> подписи -> результаты».
   ============================================================ */

/** Единственный форматтер на весь сайт: 12345 -> "12 345"
 * @param {number} num
 * @returns {string} */
function formatNum(num) {
    return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
/** Деньги в строку с символом рубля
 * @param {number} num
 * @returns {string} */
function fmtRub(num) {
    return formatNum(num) + ' ₽';
}

/** Слово «год/года/лет», согласованное с числом
 * @param {number} years
 * @returns {string} */
function yearsWord(years) {
    const n = Math.abs(Math.round(Number(years) || 0)) % 100;
    const last = n % 10;
    if (n >= 11 && n <= 14) return 'лет';
    if (last === 1) return 'год';
    if (last >= 2 && last <= 4) return 'года';
    return 'лет';
}

/** Появление блоков при прокрутке (IntersectionObserver) */
function initScrollReveals() {
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.card, .content h2, .content p, .store-buttons, .interactive-block').forEach((el) => {
        el.classList.add('reveal-on-scroll');
        observer.observe(el);
    });
}

/** FAQ-аккордеон: открыт максимум один вопрос за раз */
function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    if (faqItems.length === 0) return;

    let idSeq = 0;
    faqItems.forEach((item) => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        if (!question || !answer) return;

        if (!answer.id) answer.id = 'faq-answer-' + (++idSeq);
        question.setAttribute('aria-controls', answer.id);
        question.setAttribute('aria-expanded', 'false');

        question.addEventListener('click', () => {
            const wasActive = item.classList.contains('active');

            faqItems.forEach((other) => {
                other.classList.remove('active');
                const ans = other.querySelector('.faq-answer');
                const q = other.querySelector('.faq-question');
                if (ans) ans.style.maxHeight = null;
                if (q) q.setAttribute('aria-expanded', 'false');
            });

            if (!wasActive) {
                item.classList.add('active');
                answer.style.maxHeight = answer.scrollHeight + 'px';
                question.setAttribute('aria-expanded', 'true');
            }
        });
    });
}

/** Схема «ползунки -> подписи -> результаты».
 * @typedef {Object} SliderCalcOutput
 * @property {string[]=} labels  новые тексты подписей (по id из opts.labels)
 * @property {string[]=} results новые тексты результатов (по id из opts.results)
 * @typedef {Object} SliderCalcOptions
 * @property {string[]} inputs   id ползунков
 * @property {string[]=} labels  id элементов подписей
 * @property {string[]=} results id элементов результатов
 * @property {(values: number[]) => SliderCalcOutput} compute пересчёт по значениям ползунков */
/** Единая схема калькулятора: ползунки -> подписи -> результаты.
 * opts = { inputs: [id...], labels: [id...], results: [id...], compute(values) }
 * @param {SliderCalcOptions} opts */
function initSliderCalc(opts) {
    const inputs = opts.inputs.map((id) => document.getElementById(id));
    if (inputs.some((x) => !x)) return; // не наша страница — тихо выходим

    const labels = (opts.labels || []).map((id) => document.getElementById(id));
    const results = (opts.results || []).map((id) => document.getElementById(id));

    function update() {
        const values = inputs.map((x) => parseInt(x.value, 10));
        const out = opts.compute(values);
        (out.labels || []).forEach((text, i) => { if (labels[i]) labels[i].textContent = text; });
        (out.results || []).forEach((text, i) => { if (results[i]) results[i].textContent = text; });
    }

    results.forEach((el) => el.setAttribute('aria-live', 'polite'));
    inputs.forEach((x) => x.addEventListener('input', update));
    update();
}

/** 1. Накопления: ₽/день -> месяц и год */
function initSavingsCalc() {
    initSliderCalc({
        inputs: ['savingsSlider'],
        labels: ['dailyAmount'],
        results: ['resMonth', 'resYear'],
        compute: ([daily]) => ({
            labels: [formatNum(daily) + ' ₽/день'],
            results: [fmtRub(daily * 30), fmtRub(daily * 365)]
        })
    });
}

/** 2. Скидки: траты и процент -> экономия в месяц и год */
function initDiscountsCalc() {
    initSliderCalc({
        inputs: ['spendSlider', 'discountSlider'],
        labels: ['spendAmount', 'discountAmount'],
        results: ['resMonth', 'resYear'],
        compute: ([spend, discount]) => {
            const month = Math.round(spend * discount / 100);
            return {
                labels: [formatNum(spend) + ' ₽/мес', discount + '%'],
                results: [fmtRub(month), fmtRub(month * 12)]
            };
        }
    });
}

/** 3. Инфляция: сумма и срок -> будущая стоимость и потери */
function initInflationCalc() {
    /** @type {number} годовой темп инфляции (доля) */ const RATE = 0.08;
    initSliderCalc({
        inputs: ['sumSlider', 'yearsSlider'],
        labels: ['sumAmount', 'yearsAmount'],
        results: ['resValue', 'resLoss'],
        compute: ([sum, years]) => {
            const future = Math.round(sum * Math.pow(1 - RATE, years));
            return {
                labels: [fmtRub(sum), years + ' ' + yearsWord(years)],
                results: [fmtRub(future), fmtRub(sum - future)]
            };
        }
    });
}

/** 4. Кредит: сумма и срок -> платёж и переплата (аннуитет) */
function initLoanCalc() {
    /** @type {number} годовая ставка (доля) */ const RATE = 0.25;
    initSliderCalc({
        inputs: ['amountSlider', 'termSlider'],
        labels: ['amountLabel', 'termLabel'],
        results: ['resPayment', 'resOverpay'],
        compute: ([amount, months]) => {
            const r = RATE / 12;
            const payment = Math.round(amount * r / (1 - Math.pow(1 + r, -months)));
            return {
                labels: [fmtRub(amount), months + ' мес'],
                results: [fmtRub(payment), fmtRub(payment * months - amount)]
            };
        }
    });
}

/** Вкладки (страница накоплений) */
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    if (tabBtns.length === 0) return;

    tabBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            tabBtns.forEach((b) => b.classList.remove('active'));
            tabContents.forEach((c) => c.classList.remove('active'));
            btn.classList.add('active');
            const target = document.getElementById(btn.getAttribute('data-tab'));
            if (target) target.classList.add('active');
        });
    });
}

/* Старт */
document.addEventListener('DOMContentLoaded', () => {
    initScrollReveals();
    initFAQ();
    initSavingsCalc();
    initDiscountsCalc();
    initInflationCalc();
    initLoanCalc();
    initTabs();
});

'use strict';

// 1. Плавное появление контента при загрузке страницы
function initPageLoadAnimations() {
    const animatedElements = document.querySelectorAll('header h1, header p, .back-link, .card, .content h2, .content p');
    animatedElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = `opacity 0.6s ease-out ${index * 0.05}s, transform 0.6s ease-out ${index * 0.05}s`;
        
        setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, 50);
    });
}

// 2. Анимация появления блоков при прокрутке (IntersectionObserver)
function initScrollReveals() {
    if (!('IntersectionObserver' in window)) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.card, .content h2, .content p, .store-buttons, .interactive-block').forEach(el => {
        el.classList.add('reveal-on-scroll');
        observer.observe(el);
    });
}

// 3. Улучшенный эффект нажатия на карточки (тактильный отклик)
function initTactileFeedback() {
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('mousedown', () => {
            card.style.transform = 'scale(0.98) translateY(-2px)';
        });
        card.addEventListener('mouseup', () => {
            card.style.transform = '';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });
}

// 4. Аккордеон для FAQ (ЧАСТЫЕ ВОПРОСЫ)
function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    if (faqItems.length === 0) return;

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');

        if (!question || !answer) return;

        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');

            // Закрываем остальные
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                    const otherAns = otherItem.querySelector('.faq-answer');
                    if (otherAns) otherAns.style.maxHeight = null;
                }
            });

            // Переключаем текущий
            if (isActive) {
                item.classList.remove('active');
                answer.style.maxHeight = null;
            } else {
                item.classList.add('active');
                answer.style.maxHeight = answer.scrollHeight + 'px';
            }
        });
    });
}

// 5. Интерактивный калькулятор накоплений (Ползунок)
function initSavingsCalculator() {
    const slider = document.getElementById('savingsSlider');
    if (!slider) return; // Если мы не на странице накоплений, выходим

    const dailyLabel = document.getElementById('dailyAmount');
    const resMonth = document.getElementById('resMonth');
    const resYear = document.getElementById('resYear');

    function updateCalculator() {
        const daily = parseInt(slider.value);
        if (dailyLabel) dailyLabel.textContent = `${daily} ₽/день`;
        
        const monthSum = daily * 30;
        const yearSum = daily * 365;
        const formatNum = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

        if (resMonth) resMonth.textContent = `${formatNum(monthSum)} ₽`;
        if (resYear) resYear.textContent = `${formatNum(yearSum)} ₽`;
    }

    slider.addEventListener('input', updateCalculator);
    updateCalculator(); 
}

// 6. Переключение вкладок (Tabs)
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    if (tabBtns.length === 0) return;

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            const targetContent = document.getElementById(targetId);
            if (targetContent) targetContent.classList.add('active');
        });
    });
}

// 🚀 ГЛАВНЫЙ ЗАПУСК ВСЕХ ФУНКЦИЙ
document.addEventListener('DOMContentLoaded', () => {
    initPageLoadAnimations();
    initScrollReveals();
    initTactileFeedback();
    initFAQ();
    initSavingsCalculator();
    initTabs();
});

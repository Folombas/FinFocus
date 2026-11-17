'use strict';

// 1. Плавное появление контента при загрузке страницы
function initPageLoadAnimations() {
    const animatedElements = document.querySelectorAll('header h1, header p, .back-link, .card, .content h2, .content p');
    animatedElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = `opacity 0.6s ease-out ${index * 0.05}s, transform 0.6s ease-out ${index * 0.05}s`;
        
        // Небольшая задержка, чтобы браузер применил начальные стили
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
                observer.unobserve(entry.target); // Анимируем только один раз
            }
        });
    }, { threshold: 0.1 });

    // Наблюдаем за всеми карточками и крупными блоками контента
    document.querySelectorAll('.card, .content h2, .content p, .store-buttons').forEach(el => {
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

// Запускаем всё после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    initPageLoadAnimations();
    initScrollReveals();
    initTactileFeedback();
});

// 4. Аккордеон для FAQ
function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');

        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');

            // Закрываем все остальные открытые вопросы (по желанию)
            // Если хочешь, чтобы можно было открывать несколько сразу, удали этот блок
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                    otherItem.querySelector('.faq-answer').style.maxHeight = null;
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

// Не забудь вызвать функцию внутри document.addEventListener('DOMContentLoaded', ...)
document.addEventListener('DOMContentLoaded', () => {
    initPageLoadAnimations();
    initScrollReveals();
    initTactileFeedback();
    initFAQ(); // <-- Добавляем вызов
});

// 5. Интерактивный калькулятор накоплений
function initSavingsCalculator() {
    const slider = document.getElementById('savingsSlider');
    if (!slider) return; // Если мы не на странице накоплений, выходим

    const dailyLabel = document.getElementById('dailyAmount');
    const resMonth = document.getElementById('resMonth');
    const resYear = document.getElementById('resYear');

    function updateCalculator() {
        const daily = parseInt(slider.value);
        
        // Обновляем текст над ползунком
        dailyLabel.textContent = `${daily} ₽/день`;
        
        // Считаем месяц (30 дней) и год (365 дней)
        const monthSum = daily * 30;
        const yearSum = daily * 365;

        // Форматируем числа с пробелами (например, 108 000)
        const formatNum = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

        resMonth.textContent = `${formatNum(monthSum)} ₽`;
        resYear.textContent = `${formatNum(yearSum)} ₽`;
    }

    slider.addEventListener('input', updateCalculator);
    updateCalculator(); // Инициализация при загрузке
}

// 6. Переключение вкладок (Tabs)
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    if (tabBtns.length === 0) return;

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Убираем активный класс у всех
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Добавляем активный класс текущей кнопке
            btn.classList.add('active');

            // Показываем нужный контент
            const targetId = btn.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active');
        });
    });
}

// НЕ ЗАБУДЬ ДОБАВИТЬ ВЫЗОВЫ В КОНЕЦ:
document.addEventListener('DOMContentLoaded', () => {
    // ... твои старые вызовы ...
    initFAQ();
    initSavingsCalculator(); // <-- Добавить
    initTabs();              // <-- Добавить
});

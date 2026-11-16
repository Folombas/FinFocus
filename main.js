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

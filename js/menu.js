// @ts-check
(function () {
'use strict';

document.addEventListener('DOMContentLoaded', function () {
    /** @type {HTMLElement|null} */
    var burger = document.querySelector('.burger');
    /** @type {HTMLElement|null} */
    var drawer = document.querySelector('.drawer');
    /** @type {HTMLElement|null} */
    var backdrop = document.querySelector('.drawer-backdrop');
    if (!burger || !drawer || !backdrop) return;

    /** @returns {boolean} открыто ли боковое меню прямо сейчас */
    var isOpen = function () { return document.body.classList.contains('drawer-open'); };

    function openDrawer() {
        document.body.classList.add('drawer-open');
        burger.classList.add('open');
        burger.setAttribute('aria-expanded', 'true');
        drawer.setAttribute('aria-hidden', 'false');
        var closeBtn = drawer.querySelector('.drawer-close');
        if (closeBtn) closeBtn.focus();
    }
    function closeDrawer() {
        document.body.classList.remove('drawer-open');
        burger.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        drawer.setAttribute('aria-hidden', 'true');
        burger.focus();
    }

    burger.addEventListener('click', function () {
        isOpen() ? closeDrawer() : openDrawer();
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-drawer-close]'), function (el) {
        el.addEventListener('click', closeDrawer);
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && isOpen()) closeDrawer();
    });
});
})();

/* FinFocus — спецэффекты: частицы, tilt, ripple, прогресс скролла, счётчики, конфетти.
   Всё отключается автоматически при prefers-reduced-motion и на тач-экранах где уместно. */
(function () {
'use strict';

var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;

function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
}

/* 1. Полоска прогресса скролла */
function initProgress() {
    if (document.getElementById('fx-progress')) return;
    var bar = document.createElement('div');
    bar.id = 'fx-progress';
    document.body.appendChild(bar);
    var ticking = false;
    var update = function () {
        ticking = false;
        var h = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, window.scrollY / h) : 0) + ')';
    };
    var onScroll = function () {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
}

/* 2. Парящие монетки-частицы на фоне */
function initParticles() {
    if (reduceMotion || document.getElementById('fx-canvas')) return;
    var c = document.createElement('canvas');
    c.id = 'fx-canvas';
    document.body.appendChild(c);
    var ctx = c.getContext('2d');
    if (!ctx) return;
    var w, h, parts, raf, running = true;
    var COLORS = ['blue', 'mint', 'violet'];
    function resize() {
        w = c.width = window.innerWidth;
        h = c.height = window.innerHeight;
    }
    function spawn() {
        var colorVar = '--' + COLORS[Math.floor(Math.random() * COLORS.length)];
        var col = cssVar(colorVar, '#6ea8ff');
        return {
            x: Math.random() * w,
            y: h + 20,
            r: 1.2 + Math.random() * 2.6,
            speed: 0.15 + Math.random() * 0.45,
            sway: Math.random() * Math.PI * 2,
            swaySpeed: 0.002 + Math.random() * 0.004,
            alpha: 0.15 + Math.random() * 0.3,
            color: col
        };
    }
    function count() {
        // PERF GUARD: меньше частиц; на слабых устройствах почти ноль
        var n = window.innerWidth < 720 ? 10 : 18;
        try {
            if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) n = Math.min(n, 8);
            if (navigator.deviceMemory || navigator.deviceMemory) {}
        } catch (e) {}
        return n;
    }
    function tick() {
        if (!running) return;
        ctx.clearRect(0, 0, w, h);
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i];
            p.y -= p.speed;
            p.sway += p.swaySpeed * 16;
            p.x += Math.sin(p.sway) * 0.3;
            if (p.y < -20) parts[i] = spawn(), parts[i].y = h + 20;
            ctx.globalAlpha = p.alpha * (0.6 + 0.4 * Math.sin(p.sway * 2));
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        raf = requestAnimationFrame(tick);
    }
    resize();
    parts = [];
    for (var i = 0; i < count(); i++) {
        var p = spawn();
        p.y = Math.random() * h;
        parts.push(p);
    }
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', function () {
        running = !document.hidden;
        if (running) tick(); else cancelAnimationFrame(raf);
    });
    tick();
}

/* 3. 3D-tilt карточек с бликом за курсором */
function initTilt() {
    if (!finePointer || reduceMotion) return;
    document.querySelectorAll('.card, .rule-card, .sale-card').forEach(function (card) {
        card.classList.add('fx-tilt');
        var pending = false, lastX = 0, lastY = 0;
        card.addEventListener('pointermove', function (e) {
            lastX = e.clientX; lastY = e.clientY;
            if (pending) return;
            pending = true;
            requestAnimationFrame(function () {
                pending = false;
                var r = card.getBoundingClientRect();
                var px = (lastX - r.left) / r.width;
                var py = (lastY - r.top) / r.height;
                card.classList.add('tilting');
                card.style.setProperty('--ry', ((px - 0.5) * 8).toFixed(2) + 'deg');
                card.style.setProperty('--rx', ((0.5 - py) * 8).toFixed(2) + 'deg');
                card.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
                card.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
            });
        });
        card.addEventListener('pointerleave', function () {
            card.classList.remove('tilting');
            card.style.removeProperty('--rx');
            card.style.removeProperty('--ry');
        });
    });
}

/* 4. Ripple-волна на кнопках */
function initRipple() {
    var selector = '.btn-primary, .btn-ghost, .ps-item, .theme-toggle, .burger, .to-top, .tab-btn, .drawer-close';
    document.querySelectorAll(selector).forEach(function (el) {
        if (el.classList.contains('fx-host')) return;
        el.classList.add('fx-host');
        el.addEventListener('pointerdown', function (e) {
            if (reduceMotion) return;
            var r = el.getBoundingClientRect();
            var d = Math.max(r.width, r.height) * 1.2;
            var s = document.createElement('span');
            s.className = 'fx-ripple';
            s.style.width = s.style.height = d + 'px';
            s.style.left = (e.clientX - r.left - d / 2) + 'px';
            s.style.top = (e.clientY - r.top - d / 2) + 'px';
            el.appendChild(s);
            setTimeout(function () { s.remove(); }, 600);
        });
    });
}

/* 5. Анимированный счётчик значений калькуляторов */
function parseMoney(text) {
    var m = String(text).replace(/\u00A0| /g, '').match(/-?[\d.,]+/);
    return m ? parseFloat(m[0].replace(',', '.').replace(/,/g, '')) : null;
}
function fmtLike(proto, value) {
    var hasRub = String(proto).indexOf('₽') >= 0;
    var suffix = (String(proto).match(/(мес.|₽|%)\s*$/) || [''])[0];
    return Math.round(value).toLocaleString('ru-RU') + (hasRub ? ' ₽' : suffix ? ' ' + suffix : '');
}
function initCountUp() {
    if (reduceMotion) return;
    var nodes = document.querySelectorAll('.result-value');
    if (!('MutationObserver' in window)) return;
    var prev = new WeakMap();
    var observer = new MutationObserver(function (records) {
        records.forEach(function (rec) {
            var el = rec.target;
            var next = parseMoney(el.textContent);
            if (next === null) return;
            var old = prev.has(el) ? prev.get(el) : 0;
            prev.set(el, next);
            if (old === next) return;
            var start = null, dur = 450;
            function step(ts) {
                if (!start) start = ts;
                var t = Math.min(1, (ts - start) / dur);
                var eased = 1 - Math.pow(1 - t, 3);
                el.textContent = fmtLike(el.getAttribute('data-proto') || el.textContent, old + (next - old) * eased);
                if (t < 1) requestAnimationFrame(step);
            }
            if (!el.getAttribute('data-proto')) el.setAttribute('data-proto', el.textContent);
            requestAnimationFrame(step);
        });
    });
    nodes.forEach(function (el) { observer.observe(el, { childList: true }); });
}

/* 6. Конфетти из эмодзи */
var CONFETTI = ['🪙', '💵', '✨', '🎉', '💰'];
function burst(x, y, amount) {
    if (reduceMotion) return;
    var n = amount || 24;
    for (var i = 0; i < n; i++) {
        var s = document.createElement('span');
        s.className = 'fx-confetti';
        s.textContent = CONFETTI[Math.floor(Math.random() * CONFETTI.length)];
        var ang = Math.random() * Math.PI * 2;
        var dist = 60 + Math.random() * 130;
        s.style.left = x + 'px';
        s.style.top = y + 'px';
        s.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
        s.style.setProperty('--dy', (Math.sin(ang) * dist - 60) + 'px');
        s.style.setProperty('--rot', (Math.random() * 540 - 270) + 'deg');
        s.style.fontSize = (0.9 + Math.random() * 1.1) + 'rem';
        document.body.appendChild(s);
        s.addEventListener('animationend', function () { this.remove(); });
    }
}
window.finfocusBurst = burst;

/* 7. Микро-подарок: выключил тумблер — конфетти экономии */
function initToggleReward() {
    document.querySelectorAll('.habit').forEach(function (h) {
        h.addEventListener('change', function () {
            if (!h.checked) {
                var r = h.closest('.ui-switch').getBoundingClientRect();
                burst(r.right - 30, r.top + r.height / 2, 10);
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', function () {
    initProgress();
    initParticles();
    initTilt();
    initRipple();
    initCountUp();
    initToggleReward();
    // PERF GUARD: частицы останавливаются, если вкладка долгое время в фоне
    var idleTimer = null;
    var canvas = document.getElementById('fx-canvas');
    document.addEventListener('visibilitychange', function () {
        if (document.hidden || !canvas) return;
        // лапочка: частицы уже сами ставятся на паузу; дополнительно размораживаем
        window.dispatchEvent(new Event('resize'));
    });
});
})();

// ===== Автоссылки-якоря на заголовках разделов =====
(function () {
  if (document.body.dataset.anchorsReady) return;
  document.body.dataset.anchorsReady = '1';
  const used = new Set();
  const slugify = (s) => {
    let id = s.toLowerCase()
      .replace(/[^a-zа-яё0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '');
    if (!id) id = 'section';
    let base = id, n = 2;
    while (used.has(id)) id = base + '-' + n++;
    used.add(id);
    return id;
  };
  document.querySelectorAll('.content h2, h2.faq-title').forEach((h) => {
    if (h.querySelector('.heading-anchor')) return;
    const text = h.textContent || '';
    const title = text.replace(/\s+#$/, '').trim();
    h.id = h.id || slugify(title);
    const a = document.createElement('a');
    a.className = 'heading-anchor';
    a.href = '#' + h.id;
    a.textContent = '#';
    a.setAttribute('aria-label', 'Ссылка на раздел: ' + title);
    a.addEventListener('click', () => {
      if (history.replaceState) history.replaceState(null, '', '#' + h.id);
    });
    h.classList.add('anchor-target');
    h.appendChild(a);
  });
})();

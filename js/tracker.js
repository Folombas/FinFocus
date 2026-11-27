// @ts-check
(function () {
'use strict';

/* Трекер накоплений: IndexedDB, экспорт/импорт JSON.
 * Данные не покидают браузер: у сайта нет бэкенда. */
var DB_NAME = 'finfocus-tracker';
var STORE = 'deposits';
var GOAL_KEY = 'finfocus-goal';

/** @type {HTMLElement|null} */ var listEl = /** @type {HTMLElement|null} */ (document.getElementById('trackList'));
/** @type {HTMLElement|null} */ var savedEl = /** @type {HTMLElement|null} */ (document.getElementById('trackSaved'));
/** @type {HTMLElement|null} */ var barEl = /** @type {HTMLElement|null} */ (document.getElementById('trackBar'));
/** @type {HTMLElement|null} */ var msgEl = /** @type {HTMLElement|null} */ (document.getElementById('trackMsg'));
/** @type {HTMLInputElement|null} */ var goalEl = /** @type {HTMLInputElement|null} */ (document.getElementById('trackGoal'));
/** @type {HTMLInputElement|null} */ var amountEl = /** @type {HTMLInputElement|null} */ (document.getElementById('trackAmount'));

function fmtNum(num) {
    return String(Math.round(num)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function openDb() {
    return new Promise(function (resolve, reject) {
        var req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = function () {
            var db = req.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
            }
        };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
    });
}

function getAll(db) {
    return new Promise(function (resolve, reject) {
        var store = db.transaction(STORE, 'readonly').objectStore(STORE);
        var req = store.getAll();
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror = function () { reject(req.error); };
    });
}

function addDeposit(db, amount) {
    return new Promise(function (resolve, reject) {
        var store = db.transaction(STORE, 'readwrite').objectStore(STORE);
        var req = store.add({ amount: amount, at: new Date().toISOString() });
        req.onsuccess = function () { resolve(db); };
        req.onerror = function () { reject(req.error); };
    });
}

function deleteDeposit(db, id) {
    return new Promise(function (resolve, reject) {
        var store = db.transaction(STORE, 'readwrite').objectStore(STORE);
        var req = store.delete(id);
        req.onsuccess = function () { resolve(db); };
        req.onerror = function () { reject(req.error); };
    });
}

function getGoal() {
    if (!goalEl) return 100000;
    var saved = null;
    try { saved = localStorage.getItem(GOAL_KEY); } catch (e) {}
    if (saved) goalEl.value = saved;
    var g = parseFloat(goalEl.value);
    return g > 0 ? g : 100000;
}

function render(db) {
    return getAll(db).then(function (rows) {
        var total = 0;
        rows.forEach(function (r) { total += Number(r.amount) || 0; });
        var goal = getGoal();
        var pct = goal > 0 ? Math.min(100, Math.round(total / goal * 100)) : 0;
        if (savedEl) savedEl.textContent = fmtNum(total) + ' из ' + fmtNum(goal) + ' ₽ (' + pct + '%)';
        if (barEl) barEl.style.width = pct + '%';
        if (listEl) {
            listEl.textContent = '';
            rows.slice().reverse().forEach(function (r) {
                var li = document.createElement('li');
                var txt = document.createElement('span');
                var d = new Date(r.at);
                txt.textContent = '+' + fmtNum(Number(r.amount)) + ' ₽ · ' + d.toLocaleDateString('ru-RU');
                var del = document.createElement('button');
                del.type = 'button';
                del.className = 'track-del';
                del.setAttribute('aria-label', 'Удалить запись');
                del.textContent = '✕';
                del.addEventListener('click', function () {
                    deleteDeposit(db, r.id).then(function (d) { return render(d); });
                });
                li.appendChild(txt);
                li.appendChild(del);
                listEl.appendChild(li);
            });
            if (!rows.length) {
                var li = document.createElement('li');
                li.className = 'track-empty';
                li.textContent = 'Пока пусто: добавь первое пополнение.';
                listEl.appendChild(li);
            }
        }
        if (msgEl) {
            if (goal > 0 && total >= goal) msgEl.textContent = '🎉 Цель достигнута! Поставь следующую.';
            else if (pct > 0) msgEl.textContent = 'До цели осталось ' + fmtNum(goal - total) + ' ₽.';
            else msgEl.textContent = '';
        }
        renderExtras(rows);
    });
}

function flash(text) {
    if (msgEl) msgEl.textContent = text;
}

/* --- Пресеты целей, месячный спарклайн и стрик --- */

var EXP_KEY = 'finfocus-expenses';

/** Суммы пополнений по месяцам, последние 6 месяцев (старые -> новые) */
function monthlySums(rows) {
    var now = new Date();
    var buckets = [];
    for (var i = 5; i >= 0; i--) {
        var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.push({ key: d.getFullYear() + '-' + d.getMonth(), label: d.toLocaleDateString('ru-RU', { month: 'short' }), sum: 0 });
    }
    rows.forEach(function (r) {
        var d = new Date(r.at);
        var key = d.getFullYear() + '-' + d.getMonth();
        for (var i = 0; i < buckets.length; i++) {
            if (buckets[i].key === key) { buckets[i].sum += Number(r.amount) || 0; return; }
        }
    });
    return buckets;
}

/** Сколько дней подряд с пополнениями, считая от сегодня (или вчера) */
function streakDays(rows) {
    var days = {};
    rows.forEach(function (r) {
        var d = new Date(r.at);
        days[d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate()] = true;
    });
    var cur = new Date();
    if (!days[cur.getFullYear() + '-' + cur.getMonth() + '-' + cur.getDate()]) {
        cur.setDate(cur.getDate() - 1);
        if (!days[cur.getFullYear() + '-' + cur.getMonth() + '-' + cur.getDate()]) return 0;
    }
    var streak = 0;
    while (days[cur.getFullYear() + '-' + cur.getMonth() + '-' + cur.getDate()]) {
        streak += 1;
        cur.setDate(cur.getDate() - 1);
    }
    return streak;
}

/** Достраивает блок пресетов и спарклайна после списка (разметка в js, чтобы не дублировать HTML) */
function buildExtras() {
    if (!listEl || document.getElementById('trackExtras')) return;
    var wrap = document.createElement('div');
    wrap.id = 'trackExtras';
    wrap.innerHTML = '<div class="track-presets">'
        + '<label>Расходы в месяц: <input type="number" id="trackExpenses" min="0" step="1000" placeholder="40000"></label> '
        + '<button type="button" class="track-preset" id="trackP3">🎯 Подушка ×3</button> '
        + '<button type="button" class="track-preset" id="trackP6">🛡️ Подушка ×6</button>'
        + '</div>'
        + '<p id="trackStreak" class="track-streak" role="status"></p>'
        + '<div id="trackSpark" class="track-spark" role="img" aria-label="Пополнения по месяцам"></div>';
    listEl.parentNode.insertBefore(wrap, listEl.nextSibling);

    var exp = /** @type {HTMLInputElement|null} */ (document.getElementById('trackExpenses'));
    var saved = null;
    try { saved = localStorage.getItem(EXP_KEY); } catch (e) {}
    if (saved && exp) exp.value = saved;

    function preset(mult) {
        if (!exp || !goalEl) return;
        var v = parseFloat(exp.value) || 0;
        if (v <= 0) { flash('⚠️ Сначала укажи расходы в месяц.'); return; }
        try { localStorage.setItem(EXP_KEY, String(v)); } catch (e) {}
        goalEl.value = String(Math.round(v * mult));
        try { localStorage.setItem(GOAL_KEY, String(goalEl.value)); } catch (e) {}
        dbPromiseCache.then(function (db) { return render(db); });
    }
    var p3 = document.getElementById('trackP3');
    var p6 = document.getElementById('trackP6');
    if (p3) p3.addEventListener('click', function () { preset(3); });
    if (p6) p6.addEventListener('click', function () { preset(6); });
}

function renderExtras(rows) {
    var spark = document.getElementById('trackSpark');
    var streakEl = document.getElementById('trackStreak');
    if (streakEl) {
        var s = streakDays(rows);
        streakEl.textContent = s > 0 ? '🔥 Дней подряд с пополнениями: ' + s : 'Стрик ждёт первого пополнения: сделай одно сегодня.';
    }
    if (spark) {
        var buckets = monthlySums(rows);
        var max = 1;
        buckets.forEach(function (b) { if (b.sum > max) max = b.sum; });
        var bars = buckets.map(function (b, i) {
            var h = Math.max(2, Math.round(b.sum / max * 60));
            var x = i * 44 + 6;
            var cap = b.sum >= 1000000 ? (b.sum / 1000000).toFixed(1) + 'М' : (b.sum >= 1000 ? Math.round(b.sum / 1000) + 'К' : String(b.sum));
            return '<rect x="' + x + '" y="' + (70 - h) + '" width="32" height="' + h + '" rx="4" fill="#1f6feb"></rect>'
                + '<text x="' + (x + 16) + '" y="84" text-anchor="middle" font-size="10" fill="currentColor">' + b.label + '</text>'
                + (b.sum > 0 ? '<text x="' + (x + 16) + '" y="' + (64 - h) + '" text-anchor="middle" font-size="10" fill="currentColor">' + cap + '</text>' : '');
        }).join('');
        spark.innerHTML = '<svg viewBox="0 0 272 88" width="100%" height="88" xmlns="http://www.w3.org/2000/svg">' + bars + '</svg>';
    }
}

/** @type {IDBDatabase|null} */ var dbCache = null;
var dbPromiseCache = openDb().then(function (db) { dbCache = db; return db; });

document.addEventListener('DOMContentLoaded', function () {
    if (!goalEl || !amountEl || !listEl) return;
    dbPromiseCache.then(function (db) { return render(db); }).then(function () { buildExtras(); }).catch(function () {
        if (msgEl) msgEl.textContent = 'IndexedDB недоступен в этом браузере.';
    });

    document.getElementById('trackAdd').addEventListener('click', function () {
        var amount = Math.round(parseFloat(amountEl.value) || 0);
        if (amount <= 0) { flash('⚠️ Введите сумму больше нуля.'); return; }
        try { localStorage.setItem(GOAL_KEY, String(goalEl.value)); } catch (e) {}
        dbPromiseCache
            .then(function (db) { return addDeposit(db, amount); })
            .then(function (db) { return render(db); })
            .then(function () { amountEl.value = '1000'; })
            .catch(function () { flash('⚠️ Не удалось сохранить пополнение.'); });
    });

    goalEl.addEventListener('change', function () {
        try { localStorage.setItem(GOAL_KEY, String(goalEl.value)); } catch (e) {}
        dbPromiseCache.then(function (db) { return render(db); });
    });

    document.getElementById('trackExport').addEventListener('click', function () {
        dbPromiseCache.then(function (db) { return getAll(db); }).then(function (rows) {
            var goal = getGoal();
            var data = JSON.stringify({ app: 'FinFocus tracker', version: 1, goal: goal, deposits: rows }, null, 2);
            var blob = new Blob([data], { type: 'application/json' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'finfocus-nakopleniya.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
        });
    });

    var fileEl = /** @type {HTMLInputElement|null} */ (document.getElementById('trackImportFile'));
    if (fileEl) {
        fileEl.addEventListener('change', function () {
            var file = fileEl.files && fileEl.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function () {
                try {
                    var parsed = JSON.parse(String(reader.result));
                    var rows = Array.isArray(parsed && parsed.deposits) ? parsed.deposits : [];
                    if (parsed && parsed.goal && goalEl) goalEl.value = String(parsed.goal);
                    dbPromiseCache.then(function (db) {
                        /* Одна readwrite-транзакция: все store.add выдаются
                         * синхронно, до первой паузы в скрипте. Резолв по
                         * tx.oncomplete, счётчики ok/bad честные. */
                        var tx = db.transaction(STORE, 'readwrite');
                        var store = tx.objectStore(STORE);
                        var okCount = 0;
                        rows.forEach(function (r) {
                            var req = store.add({ amount: Number(r.amount) || 0, at: String(r.at || new Date().toISOString()) });
                            req.onsuccess = function () { okCount += 1; };
                        });
                        return new Promise(function (resolve) {
                            tx.oncomplete = function () { resolve(okCount); };
                            tx.onabort = function () { resolve(okCount); };
                        }).then(function (okCount) {
                            return render(db).then(function () { return { ok: okCount, bad: rows.length - okCount }; });
                        });
                    }).then(function (res) {
                        if (res.bad === 0) flash('✅ Импорт завершён: ' + res.ok + ' записей.');
                        else flash('⚠️ Импортировано ' + res.ok + ' из ' + (res.ok + res.bad) + ', пропущено ' + res.bad + '.');
                    });
                } catch (e) { flash('⚠️ Не удалось прочитать файл.'); }
            };
            reader.readAsText(file);
            fileEl.value = '';
        });
    }
});
})();

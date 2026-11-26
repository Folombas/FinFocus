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
    return String(Math.round(num)).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ' ');
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
        req.onsuccess = function () { resolve(true); };
        req.onerror = function () { reject(req.error); };
    });
}

function deleteDeposit(db, id) {
    return new Promise(function (resolve, reject) {
        var store = db.transaction(STORE, 'readwrite').objectStore(STORE);
        var req = store.delete(id);
        req.onsuccess = function () { resolve(true); };
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
                    deleteDeposit(db, r.id).then(function () { return render(db); });
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
    });
}

function flash(text) {
    if (msgEl) msgEl.textContent = text;
}

/** @type {IDBDatabase|null} */ var dbCache = null;
var dbPromiseCache = openDb().then(function (db) { dbCache = db; return db; });

document.addEventListener('DOMContentLoaded', function () {
    if (!goalEl || !amountEl || !listEl) return;
    dbPromiseCache.then(function (db) { return render(db); }).catch(function () {
        if (msgEl) msgEl.textContent = 'IndexedDB недоступен в этом браузере.';
    });

    document.getElementById('trackAdd').addEventListener('click', function () {
        var amount = Math.round(parseFloat(amountEl.value) || 0);
        if (amount <= 0) { flash('⚠️ Введите сумму больше нуля.'); return; }
        try { localStorage.setItem(GOAL_KEY, String(goalEl.value)); } catch (e) {}
        /* addDeposit резолвит true, поэтому db передаём в замыкании:
         * следующий then в цепочке получает не db, а результат записи. */
        dbPromiseCache.then(function (db) {
            return addDeposit(db, amount).then(function () { return render(db); });
        })
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
                        var added = 0;
                        var chain = Promise.resolve();
                        rows.forEach(function (r) {
                            chain = chain.then(function () {
                                return new Promise(function (resolve) {
                                    /* Своя readwrite-транзакция на каждую запись:
                                     * транзакция авто-коммитится, как только цепочка
                                     * промисов уступает очередь, поэтому один store
                                     * на все записи использовать нельзя. */
                                    var store = db.transaction(STORE, 'readwrite').objectStore(STORE);
                                    var req = store.add({ amount: Number(r.amount) || 0, at: String(r.at || new Date().toISOString()) });
                                    req.onsuccess = function () { added += 1; resolve(true); };
                                    req.onerror = function () { resolve(true); };
                                });
                            });
                        });
                        return chain.then(function () { return render(db).then(function () { return added; }); });
                    }).then(function (added) {
                        if (added === rows.length) flash('✅ Импорт завершён: ' + added + ' записей.');
                        else flash('⚠️ Импортировано ' + added + ' из ' + rows.length + ' записей.');
                    });
                } catch (e) { flash('⚠️ Не удалось прочитать файл.'); }
            };
            reader.readAsText(file);
            fileEl.value = '';
        });
    }
});
})();

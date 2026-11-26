# FinFocus · План модернизации под GitHub Pages («Выжать максимум»)

Дата: 26.11.2026. База: main @ 48dcaae (после мержа PR #6, раздел «Стриминг-2026» в проде).
Исполнитель: Vibe. QA: Qwen. Мерж: только Алекс.

## Стратегия

FinFocus остаётся многостраничником (MPA) на vanilla JS. SPA-переписывание отклонено: контентный сайт с точечным интерактивом, SEO и скорость важнее. Модернизация = типы + платформенные API + PWA + «бэкенд на этапе сборки» (GitHub Actions).

## Честный ответ про бэкенд

Настоящий backend на Pages невозможен (только статика). Замена: Actions-cron тянет публичные данные → коммитит data/*.json → клиент читает статику. Личные данные пользователя — только в браузере (IndexedDB/OPFS), экспорт/импорт файлом. Секретов в клиенте нет и не будет.

## Лимиты Pages (учтены)

~1 ГБ на сайт, ~100 ГБ/мес трафика (soft), ~10 сборок/час (soft), только HTTPS. Тяжёлые зависимости и большие ассеты — мимо.

## План коммитов (Conventional, без монолита)

| # | Сообщение | Что |
|---|---|---|
| 1 | chore: verify base and record modernization plan in conveyor journal | этот файл + журнал |
| 2 | chore(ci): add type-check via JSDoc (tsc --checkJs) to CI | CI-джоба |
| 3 | refactor(js): add @ts-check and JSDoc types to theme/menu | типизация ядра |
| 4 | refactor(js): type main.js calculator scheme | типы калькуляторов |
| 5 | refactor(js): type effects/streaming modules | остальной JS |
| 6 | feat(css): modern layer with oklch/light-dark tokens and view transitions | css/modern.css |
| 7 | perf: add speculation rules for prefetch/prerender | мгновенная навигация |
| 8 | feat(pwa): web manifest + service worker offline shell | установка + офлайн |
| 9 | feat(data): personal savings tracker on IndexedDB | трекер целей |
| 10 | feat(search): build-time search index + client UI | поиск |
| 11 | chore(actions): cron job fetching public rates into data/rates.json | «бэкенд» на сборке |
| 12 | feat(seo): JSON-LD + автоматизация линк-чека в CI | структ. данные |

## Гейты

- G1: tsc --checkJs без ошибок; node --check зелёный (CI).
- G2: в каждом HTML один <body>, максимум один <header>; script-теги theme/menu/effects/main присутствуют (урок итерации «Стриминг»).
- G3: message == diff; пустых коммитов нет.
- G4: ни одного секрета в клиенте; Actions использует только публичные источники.

## Перф-бюджеты и деградация

LCP < 2.5s (4G), CLS < 0.1, JS на страницу < 100 КБ. Без поддержки View Transitions / Speculation Rules / Service Worker сайт полностью рабочий; prefers-reduced-motion уважается. Офлайн: оболочка + прочитанные страницы открываются без сети; есть offline-страница.

## Отклонения от исходного плана Qwen (фиксируются честно)

1. CSS-коммиты, требующие правки style.css (~55 КБ, не читается транспортом целиком), выполняются аддитивно: отдельный css/modern.css поверх существующего, подключается из theme.js с выводом path-prefix из currentScript.
2. Порядок коммитов может отличаться от каталога: сначала фундамент (CI/типы), потом фичи — чтобы каждый шаг проверялся CI.
3. Playwright-e2e в CI пока не вводится: тяжёлая установка; заменён npm-проверками + ручным чек-листом Qwen. Возврат к вопросу после стабилизации.
# Докази qa (власний прогін), 2026-08-02

> Джерело: `docs/acceptance/observer-timezone.verdict.md`,
> `docs/acceptance/observer-calendar-day.verdict.md` — розділи «Повторне приймання 2026-08-02».

Зроблено qa, бо в поданому наборі `proofs/2026-08-02/` шість PNG виявились трьома різними
зображеннями (звірено `md5`), і кадр, підписаний як доказ B1, не містить жодного з чисел,
яких B1 вимагає. Розбір — у вердикті по observer-timezone.

## Метод

Скрипт `qa-proof.mjs` (у цій же теці, відтворюваний):
`playwright-core` проєкту → Chromium, `timezoneId: America/Los_Angeles`,
`page.clock.setFixedTime('2026-08-01T06:30:00Z')`, локація — дефолтний Київ,
в'юпорт 440×956 @3x, локаль en, онбординг пропущено як у `tests/visual/appstore-shots.spec.js`.
Дев-сервер на `127.0.0.1:9010`.

Запуск (з кореня проєкту):

```
node docs/acceptance/proofs/2026-08-02-qa/qa-proof.mjs <вихідна-тека> "$(pwd)/node_modules/playwright-core/index.js"
```

**Кожен кадр несе банер із поясом і локальним часом пристрою** — кадр доводить сам себе,
README для цього не потрібен:

```
DEVICE TZ America/Los_Angeles · DEVICE LOCAL Fri Jul 31 2026 23:30:00 · UTC 2026-08-01T06:30Z
```

Це браузер, не iOS-симулятор. Рішення qa про достатність методу і його межі (дев-сервер,
тепла навігація, холодний старт без мережі не покритий) — у вердиктах.

## Файли

- `B1-home-sunset-row.png` — SkyHomePage: чип `Kyiv UTC+3`, «SKY TONIGHT · SATURDAY,
  AUGUST 1», плитка SUN `08:42 PM`. Критерій B1 (рядок «захід» на головній) + видима
  частина B2.
- `B1-home-sun-sheet.png` — шторка Сонця: Sunrise **05:25 AM**, Sunset **08:42 PM**,
  Day length **15h 17min (−3 min)**, рядок «Times are shown for Kyiv (UTC+3), not your
  device clock.» Головний кадр для B1 observer-timezone.
- `A1-sky-header-calendar.png` — SkyPage: заголовок «Saturday, August 1» + календар
  «August 2026» з підсвіченою клітинкою **1**, при пристрої на 31 липня.
  Критерій A1 observer-calendar-day.
- `D-offline-home.png`, `D-offline-sky.png`, `D-offline-journal.png` — обхід після
  `context.setOffline(true)`. Home і Sky рендеряться повністю; `D-offline-journal.png`
  показує Sky, бо чанк `JournalPage.vue` тягнеться з дев-сервера — **артефакт методу**,
  не дефект застосунку (у продакшн-білді чанки на пристрої).

Лог мережі в офлайні (D4 observer-timezone / D6 observer-calendar-day):

```
total intercepted: 3
  GET https://api.open-meteo.com/v1/forecast?…&hourly=cloud_cover…   ×2
  GET http://127.0.0.1:9010/src/pages/JournalPage.vue                 (чанк дев-сервера)
pageerrors: 0
```

`open-meteo` не новий — присутній у `src/services/skyWeather.js` і `src/services/geocode.js`
до правки поясів (`git show 0582b5b~1:<file> | grep open-meteo`).

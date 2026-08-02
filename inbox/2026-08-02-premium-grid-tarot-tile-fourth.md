# Плитка «Unlimited Tarot» на Premium — четверта, а не остання (B3 правив мертвий список)

Дата: 2026-08-02 · знайшов: dev (у сесії по брифу про compare-таблицю)

Т-B/B3 записано як «"Unlimited Tarot" — остання плитка `getPremiumDetailItems()`».
Проблема: `getPremiumDetailItems()` (`src/constants/premiumModel.js:101`) **ніде не рендериться** —
його імпортує лише `tests/premiumModel.test.js`. Живу сітку «What Premium gives» на
пейволлі малює `featureItems` у `src/components/main/PremiumInfoComponent.vue:251`,
де порядок інший: savedPlaces, insights, satellites, **tarot (4-та)**, spreads, ai,
love, compat, history — тексти з `premiumPage.feat.*`, не з `premiumPage.premiumDetails.*`.

Наслідок: на перезнятому шоті 8 (`app-store/screenshots/*/8-premium.png`) плитка
**«Unlimited Tarot · As many readings as you want» видно над згином** — саме те, що
розділ 5 звіту `artifacts/reports/2026-08-appstore-4-3-b-strategy.md` називав проблемою
активів. Тобто B3 фактично не виконано на тому, що бачить рев'юер.

Де дивитись: `PremiumInfoComponent.vue:251-315` (живий список), `premiumModel.js:101`
(мертвий), ключі `premiumPage.feat.*` у `src/i18n/messages.bundle.js`.

Не чіпав — поза обсягом брифу (бриф = compare-таблиця + accessModel). Рішення про
порядок плиток і перезняття шота 8 — за продакт-оунером/Олександром до сабміту.

## Розібрано 2026-08-02 (dev)

Рішення Олександра 2026-08-02: плитку `tarot` перенесено **останньою** в рендереному
`featureItems` (`src/components/main/PremiumInfoComponent.vue`). Живий порядок ґріду:
savedPlaces, insights, satellites, spreads, ai, love, compat, history, **tarot**.
Мертвий `getPremiumDetailItems()` не чіпано — він і далі тільки в тестах.

Регресія: lint exit 0, **370/370** (та сама база), шот 8 перегенеровано штатним
`tests/visual/appstore-shots.spec.js` в обох розмірах. Доказ: на 6.9in над згином
тепер Saved places / Reflection insights / Satellite pack / 3 & 5 Cards, на 6.5in —
Saved places / Reflection insights; «Unlimited Tarot» у кадр не потрапляє в жодному.

Генератор недетермінований: у тому ж прогоні змінилися ще шоти 1 і 3 (у 3-sky-moon
DISTANCE 386,862 → 386,678 км — ефемерида за ~19 хв, не наслідок правки). Обидва
відкочено до HEAD, бо 1–4 вже залиті в ASC; у діффі лишився **тільки 8-premium**.

Нове поза обсягом (не чіпав): `inbox/2026-08-02-premium-grid-spreads-tile-above-fold.md`.

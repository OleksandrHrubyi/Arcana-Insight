# Плитка «3 & 5 Cards» лишилась над згином шота 8 після виносу «Unlimited Tarot»

Дата: 2026-08-02 · знайшов: dev (у сесії по переносу плитки tarot)

Після перенесення `tarot` в кінець `featureItems` четвертою плиткою над згином
6.9in-шота 8 стала **«3 & 5 Cards · Full spread readings»** (ключ `spreads`,
`src/components/main/PremiumInfoComponent.vue`). Це теж таро — розкладами.
На 6.5in у кадр не потрапляє (там видно лише перші дві плитки).

Чому це може мати значення: розділ 5 звіту `artifacts/reports/2026-08-appstore-4-3-b-strategy.md`
називав проблемою активів саме дивінаційний контент у завантажених скріншотах.
Рішення Олександра 2026-08-02 стосувалось лише плитки «Unlimited Tarot», тому
`spreads` не чіпав — обсяг не розширюю.

Де дивитись: `PremiumInfoComponent.vue` → `featureItems`, ключ `spreads`
(`premiumPage.feat.spreads` / `.spreadsSub` у `src/i18n/messages.bundle.js`);
шот `app-store/screenshots/6.9in_1320x2868/8-premium.png`.

Варіанти, якщо вирішимо чіпати: перенести `spreads` слідом за `tarot` у хвіст
(тоді над згином — 4 астро/журнальні плитки) або лишити як є. Ціна — ще одне
перезняття шота 8. Рішення — за продакт-оунером/Олександром до сабміту.

## Розібрано 2026-08-02 (dev)

Рішення Олександра 2026-08-02 (продовження того самого рішення про пейволл, не нове):
все дивінаційне — `spreads` і решта таро/гороскопних плиток — стоїть ПІСЛЯ
астрономічних та `history` у рендереному `featureItems`
(`src/components/main/PremiumInfoComponent.vue`). Правка мінімальна: блок `history`
піднято з 8-ї позиції на 4-ту, решта порядку не чіпана.

Живий порядок ґріду: savedPlaces, insights, satellites, **history**, spreads, ai,
love, compat, tarot. Мертвий `getPremiumDetailItems()` (`premiumModel.js:101`) не
чіпано — він і далі тільки в тестах. Порядок ніде більше не зафіксований
(grep `featureItems` дає лише сам компонент і його `v-for`).

Регресія: lint exit 0, **370/370** (та сама база), шот 8 перегенеровано штатним
`tests/visual/appstore-shots.spec.js` в обох розмірах.
Доказ (перевірено на самих PNG): 6.9in над згином — Saved places / Reflection
insights / Satellite pack / Saved Readings; 6.5in — Saved places / Reflection
insights. «3 & 5 Cards», «Unlimited Tarot», «Compatibility» у кадр не потрапляють
у жодному розмірі.

Генератор недетермінований (як 2026-08-02 у попередній сесії): у тому ж прогоні
змінилися ще шоти 1, 2 і 3 в обох розмірах — усі шість відкочено до HEAD, бо 1–4
вже залиті в ASC. У діффі лишився **тільки 8-premium** (обидва розміри).

Лишається поза обсягом (не чіпав): копі самої плитки `history` —
«Saved Readings · Your personal history» — семантично про читання таро, хоча
Олександр явно назвав «історію» дозволеною над згином. Якщо рев'ювер прочитає
її як дивінаційну, тексту `premiumPage.feat.history*` знадобиться астро-нейтральне
формулювання: `inbox/2026-08-02-premium-history-tile-copy.md`.

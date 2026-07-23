# Repositioning after 4.3(b) — v1.1 plan (canonical tracker)

> **Живий трекер** виходу з реджекту **4.3(b) Design–Spam** (v1.0 build 62, reviewed 2026-07-15,
> submission `5a29fded-735d-445c-934a-b81aa28447b1`). Resolution-Center reply **відхилено 2026-07-22**
> (boilerplate «reconsider the app concept and submit a new app») — апеляційний шлях закритий,
> репозиціонування = єдиний шлях.
> Працює в парі з `docs/launch-readiness-plan.md` (той трекер — доставка v1.0; цей — концепт v1.1).

## Вердикт дослідження (2026-07-19, two-agent web research)

- Формальні апеляції 4.3(b) для астро-апок мають **~1.6% успіху**; аргументи «real data / AI / streak»
  отримують boilerplate повторний реджект. Навіть вирізання фіч не рятує.
- **Єдиний шлях із живими доказами в сторі:** змінити ПЕРВИННУ ідентичність апки так, щоб
  астрологія/таро були **двигуном, а не продуктом**. Живі прецеденти: CHANI, The Pattern, Soulloop,
  Moonly, Lunar Guide — усі живуть як wellness / self-reflection / lunar-calendar апки,
  а дивінація в них — вторинна фіча.

## Рішення (owner, 2026-07-19 + 2026-07-22)

- **Напрям A: щоденний ритуал рефлексії, керований реальним небом.** Журнал + mood check-in +
  промпти, згенеровані з реальних астро-даних (`build-astro-context`, astronomy-engine).
  Таро/гороскоп/сумісність лишаються в апці як supporting-фічі — НЕ в назві, НЕ в сабтайтлі,
  НЕ в перших скріншотах.
- **Той самий dev-акаунт + той самий app record**, нова версія v1.1 (build 63+), перейменування.
  «Submit a new app» в листі Apple — шаблонна мова; новий record = новий bundle ID + перестворення
  підписок і RevenueCat; новий акаунт = ризик бану за 4.3(a). НЕ робимо.
- **Метадані і перший запуск мають збігатися:** якщо назва каже «щоденний ритуал рефлексії»,
  то перший екран після онбордингу має вести саме туди.
- **Нумерологія (RP-11):** ТІЛЬКИ як вхід у engine (Life Path + Personal Day підмішуються в
  reflection-промпт) + маленький блок усередині ритуалу. Ніколи — в назві/сабтайтлі/перших
  скріншотах (той самий кластер дивінації, який Apple перерахував у реджекті). Повноцінний
  екран «Numbers» — v1.2, після апрува.
- Категорія: **Lifestyle** (або Health & Fitness — вирішити на RP-05).

## Чому зусилля не пропадають (asset reuse)

| Актив | Доля у v1.1 |
|---|---|
| Streak / daily-ритуал (`dailyRitual.js`, ritual-* functions) | стає **ядром** нового концепту |
| astronomy-engine + `build-astro-context` | джерело daily-промптів — головний диференціатор |
| AI-пайплайн (edge functions, fallback, guards) | генерує reflection-промпти замість/поряд з гороскопами |
| Таро (дані, AI-reading, saved readings) | supporting-фіча + вхід у журнал |
| Гороскопи | supporting-фіча, demoted з hero |
| Premium / RevenueCat / підписки | без змін (той самий record ⇒ ті самі продукти) |
| Push, auth, аналітика, тести | без змін |

## Робочі айтеми

> Статуси: `[ ] TODO` → `[~] IN PROGRESS` → `[x] DONE (дата + коміт)`.

### P0 — концепт (без цього нема чого сабмітити)

- [x] **RP-01 · Journal core — DONE 2026-07-23.** Нова сторінка `/journal` (`JournalPage.vue`):
  mood → sky-промпт (детермінований банк 47 промптів/локаль з реальних астрофактів через
  astronomy-engine; без AI) → запис (≤2000 знаків) → історія + delete. Free + guest-first
  (гість = локально, одноразова міграція на акаунт при логіні — `journalBackend.js`).
  БД: `journal_entries` (міграція `202607231200`, RLS CRUD `auth.uid()=user_id`, застосована на
  прод). `reflection` = 4-та ritual-активність (клієнт+сервер, whitelist; ritual-* функції
  задеплоєні); **повний день лишився ≥3 (будь-які 3 з 4)**. Home-чип: 4 пункти, reflection
  перший, `openNextRitual` → журнал. Sign-out чистить journal-ключі (PII). Тести 301 node
  (+20) + 33 Deno; E2E Playwright-прогін: /journal флоу + збереження + чип — пройдено.
- [x] **RP-02 · Mood check-in — DONE 2026-07-23** (в складі RP-01: 6 настроїв, mood-only
  save дозволений — «1 хвилина, 1 тап» тримається).
- [x] **RP-03 · Home hero reframe — DONE 2026-07-23** («середній» варіант за рішенням owner).
  `.ritual-band` у шапці = primary CTA (однорядкова: 4 крапки прогресу · адаптивний лейбл;
  тап → перший незроблений крок, reflection-first → /journal; рядок неба owner відхилив —
  дублював астро-картку і опускав стрічку карток). Таро-коло лишилось, але
  demoted: scale 0.92, eyebrow "DAILY CARD"/«КАРТА ДНЯ». Старий чип видалено. 6 візуальних
  бейзлайнів перегенеровано і переглянуто; contract-тести (daily-hero/QA/focus-today) цілі
  + новий `landingHomeRitualBandContracts`. E2E: тап по стрічці → журнал — пройдено.
- [ ] **RP-04 · Onboarding reframe** — онбординг продає рефлексію/ритуал, не «таро і гороскопи»;
  перший запуск має підтверджувати нову назву.
- [ ] **RP-11 · Numerology engine input** — Life Path + Personal Day → у reflection-промпт;
  маленький блок в ритуалі. Обмеження позиціонування — див. «Рішення» вище.

### P0 — метадані / сабмішн

- [ ] **RP-05 · Metadata** — нова назва (прибрати «Tarot & Horoscope» з headline), сабтайтл,
  keywords, опис; категорія Lifestyle vs H&F. Оновити `app-store/asc-metadata.md`.
- [ ] **RP-06 · Screenshots** — перші 2–3 скріни ведуть з reflection loop (mood → sky prompt →
  journal); таро/гороскоп — у хвості сету. Переробити `tests/visual/appstore-shots.spec.js`.
- [ ] **RP-07 · Review notes v3** — переписати `app-store/reviewer-notes.md` під нову ідентичність
  (не «чим наше таро краще», а «це reflection-апка на реальних астроданих»).

### P1 — узгодженість

- [ ] **RP-08 · Copy sweep** — `messages.bundle.js` (en+uk): tone-of-voice під рефлексію;
  узгодити з `docs/copy-bible.md`.
- [ ] **RP-09 · Nav naming** — назви табів/розділів у bottom-nav під новий концепт
  (`docs/flow-map.md`, routing-guardrails).
- [ ] **RP-10 · Premium matrix** — переглянути `docs/premium-matrix.md`: що з reflection-фіч
  free/premium; premium-сторінка не повинна продавати «більше таро» як головну цінність.

## Механіка сабмішну

1. Усі RP-P0 done → повний QA-прохід (`arcana-release-qa`) → нові скріншоти → метадані в ASC.
2. Той самий app record, версія **1.1**, build **63+**.
3. Нічого не міняти в record під час рев'ю; reply-канал по цьому сабмішну — тільки якщо запитають.

## Лог

- **2026-07-15** — v1.0 (62) rejected, 4.3(b).
- **2026-07-19** — research verdict + рішення: напрям A; reply v2 надіслано паралельно.
- **2026-07-22** — reply відхилено (boilerplate). Нумерологія додана в скоуп як RP-11. Старт v1.1.
  Цей файл відтворено (первинна версія трекера не була збережена на диск).
- **2026-07-23** — RP-01 + RP-02 реалізовані, верифіковані E2E, backend задеплоєний
  (міграція + 5 ritual-функцій). Наступне: RP-03 (hero) або RP-11 (нумерологія в промпт).

# Arcana Insight — Project Memory (index)

> Це **вхідна точка**, а не повний звід правил. Детальні правила, контракти й source-of-truth — у файлах нижче.
> Принцип: **одне джерело правди**. Не дублюй сюди те, що вже описано в `AGENTS.md` чи `docs/`.

## Що це
Мобільний застосунок: **таро + гороскопи + астрологія + сумісність**.
Стек: **Vue 3 (Options API) + Quasar**, обгорнутий у **Capacitor** як нативний застосунок.
Основний таргет — **iOS / Apple App Store**; `AGENTS.md` також згадує Google Play.
Соло-розробка. Статус: **підготовка до релізу** (доробка фіч + App Store prep).

---

## 🧭 Де шукати правду (читай ПЕРЕД роботою)

| Хочеш… | Дивись |
|--------|--------|
| **Правила роботи** (повний звід, 75 правил) | **`AGENTS.md`** ← головний рулбук |
| Який файл редагувати (канонічні vs дублі) | `docs/canonical-files.md` |
| Роль екрана, ієрархію CTA, above-the-fold | `docs/screen-contracts.md` |
| Статус кожного екрана + що ще доробити | `docs/screen-status.md` ← трекер посторінкової роботи |
| **План релізу до App Store** (блокери, P0/P1/P2, дати) | **`docs/launch-readiness-plan.md`** ← живий трекер, рухаємось по ньому щодня |
| Писати/міняти user-facing копі | `docs/copy-bible.md` |
| Free vs Premium UX, claims, lock-стани | `docs/premium-matrix.md` |
| Навігацію, редіректи, онбординг, auth-гейтинг | `docs/flow-map.md` |
| Хто володіє контентом / логікою завантаження | `docs/content-source-map.md` |
| Чи задача "готова" | `docs/definition-of-done-mobile.md` |
| Блок "Сьогодні" на головній | `docs/home-focus-today-block.md` |

## 🎯 Скіли (викликаються автоматично за описом, але знай що вони є)

- `arcana-core-product` — будь-яка product/UX/copy/navigation задача (дефолт)
- `arcana-content-guardrails` — копі таро/гороскопів/сумісності/нотифікацій
- `arcana-daily-ritual-ux` — daily card, streak, прогрес, нагороди, continue-state
- `arcana-premium-trust` — premium-сторінка, paywall, locked-стани, upsell
- `arcana-i18n-consistency` — i18n, en/uk parity, ключі перекладів
- `arcana-routing-and-flow-guardrails` — routes, redirects, bottom-nav, screen-entry
- `arcana-analytics-and-conversion` — CTA-аналітика, funnel, ritual milestones
- `arcana-edge-functions` — backend: Supabase Deno Edge Functions (AI-генерація, push, ritual, auth, billing)
- `docs/skills/*` — App Store UI, iOS safe-area QA, home-screen audit, screenshot readiness

---

## Source-of-truth код (НЕ вигадуй паралельні моделі)

| Концепт | Файл |
|---------|------|
| Дані таро | `src/data/cardsV2/tarot_full.json`, `src/helpers/tarotData.js` |
| Карта дня | `src/helpers/dailyCardCore.js` |
| Гороскоп (теми/завантаження) | `src/helpers/horoscopeContentCore.js` |
| Streak / daily-ритуал | `src/helpers/dailyRitual.js` |
| Premium-модель | `src/constants/premiumModel.js` |
| Аналітика | `src/constants/analyticsEvents.js`, `src/services/analytics.js` |
| Нативний сервіс (auth/db) | `src/services/supabaseNative.ts` |
| Локалі | `src/i18n/en.json`, `src/i18n/uk.json` |

**Головний екран** — `src/components/main/LandingScene.vue` (компонент у `MainLayout`, не окрема сторінка).

---

## Структура

```
src/
  pages/         — екрани (роутяться через src/router/routes.js)
  components/    — main/ (Landing, Horoscope, Menu…), auth/, ui/ (BottomNavigation)
  helpers/       — бізнес-логіка без UI (source-of-truth, див. таблицю вище)
  services/      — supabaseNative, analytics, premium billing
  stores/        — Pinia (auth, premium, appEpoch)
  i18n/          — uk.json (основна), en.json, messages.bundle.js
  constants/     — premiumModel, premiumBilling, analyticsEvents
supabase/functions/ — Deno Edge Functions (див. нижче)
tests/         — node --test (44 файли); запуск `npm test`
ios/           — Xcode/Capacitor проект
```

Повний список маршрутів і канонічних файлів — `docs/canonical-files.md`.

---

## Supabase Edge Functions

| Функція | Що робить | AI |
|---------|-----------|-----|
| `build-astro-context` | Реальні астро-дані (планети, фази) → `astro_context`. Cron. | ❌ |
| `generate-horoscopes` | Батч-генерація гороскопів 12 знаків → `zodiac_texts`. Cron. | gpt-4o-mini |
| `horoscope` | GET готового гороскопу зі `zodiac_texts` | ❌ |
| `personal-horoscope` | POST персональний гороскоп (знак + місячний знак), кеш | gpt-4o-mini |
| `tarot-reading` | POST AI-інтерпретація таро. Fallback: OpenAI → OpenRouter | OpenAI+OpenRouter |
| `tarot-draw` | POST витяг карт (seed-based) | ❌ |
| `register-device` / `push-worker` / `send-broadcast` | APNs push (реєстрація / відправка / розсилка) | ❌ |
| `ritual-*` (track/claim/consume/dashboard/inventory-sync) | Streak, поінти, нагороди, інвентар | ❌ |
| `delete-account` / `telegram-auth` | Видалення акаунта / Telegram-auth | ❌ |

---

## Стек (деталі)

| Шар | Технологія |
|-----|-----------|
| Backend / DB | Supabase (PostgreSQL + Auth + Edge Functions) |
| AI | OpenAI (`gpt-4o-mini`) + OpenRouter (fallback) через Edge Functions |
| Payments | RevenueCat (`@revenuecat/purchases-capacitor`) |
| Push | APNs через власний push-worker |
| Analytics | Firebase Analytics (`@capacitor-firebase/analytics`) |
| Анімації / Астрономія | GSAP / `astronomy-engine` |
| Auth | Supabase Auth + Apple Sign In |
| Локальне сховище | `@capacitor/preferences`, ключі `arcana_*_v1:{date}` |

---

## Робочі звички в цьому проєкті

- **Спочатку** прочитай `AGENTS.md` + релевантний `docs/`-контракт, потім дій.
- File hygiene: **ніколи** не створюй файли з суфіксами ` 2`, `copy`, `final`, `new`. Редагуй канонічний (`docs/canonical-files.md`).
- i18n: міняєш копі — онови **і** `en.json`, **і** `uk.json`; рендер через ключі, не `locale === 'uk' ? …`.
- Не видаляй файли без явного дозволу в поточному треді.
- Не використовуй "AI-шні" іконки (`auto_awesome`, `✨`), якщо користувач не просив.
- Знайшов нову проблему чи завершив фічу — онови відповідний `docs/`-контракт, а не цей індекс.

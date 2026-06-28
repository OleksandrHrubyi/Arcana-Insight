# Enterprise iOS Release Readiness Audit — 2026-06-28

> Джерело: багатоагентний аудит (Apple Review, Security, Native/Build, UX/i18n/Monetization, Code/QA/Perf).
> Це **робочий трекер** — закриваємо пункти по черзі, відмічаємо `[x]` та лишаємо нотатку про фікс.
> **Перевірка реальності:** це Capacitor (Vue 3 + Quasar) гібрид, не нативний Swift. Swift/SwiftUI-розділи N/A.

## Статус на момент аудиту
- Тести: **241/241 pass**, lint **0 errors / 0 warnings**.
- Вердикт: **CONDITIONAL GO** — гейт на 5 пунктах (P1×4 + 1 потенційний P0).

## Оцінки (0–100)
| Вимір | Оцінка |
|---|---|
| Готовність до релізу | 78 |
| Production Readiness | 82 |
| Apple Review | 72 |
| UX | 84 |
| Архітектура | 83 |
| Безпека | 80 |
| Продуктивність | 79 |
| Доступність | 70 |
| Підтримуваність | 74 |

---

## Дашборд проблем (трекер закриття)

| # | Проблема | Sev | Сфера | Зусилля | Статус |
|---|---|---|---|---|---|
| 1 | Google Sign-In без deep-link повернення → ймовірно «мертва» кнопка | P1 | Apple 2.1 | S–M | [x] |
| 2 | Відвантажується варіант FirebaseAnalytics AdIdSupport (IDFA) | P1 | Compliance | S | [x] |
| 3 | Преміум `detailed` гороскоп надсилається безкоштовним клієнтам (сервер) | P1 | Монетизація | M | ⏭️ v1.1 |
| 4 | Мертва i18n: en.json/uk.json не використовуються; CLAUDE.md вказує хибно | P1 | Підтримуваність | S–M | [~] |
| 5 | RLS не підтверджено на push_devices/app_users/tarot_readings | P1→P0 | Безпека | Перевірити | [x] |
| 6 | Кнопки назад/закрити < 44pt на ~14 екранах (paywall = 34px) | P2 | A11y/HIG | ~1.5 год | [x] |
| 7 | register-device приймає неавтентифіковані upserts | P2 | Безпека | ~1 год | ⏭️ v1.1 |
| 8 | Session/refresh токени в UserDefaults, не Keychain | P2 | Безпека | 2–4 год | ⏭️ v1.1 |
| 9 | 157 console.* у production (немає вирізання) | P2 | Гігієна | S | [x] |
| 10 | 6.27 МБ hero PNG + ~28 МБ артів карт (без WebP) | P2 | Перф/розмір | S–M | [x] |
| 11 | DailyCardComponent без error/empty-стану | P2 | UX | 30 хв | [x] |
| 12 | Telegram-auth деривація секрету може не збігатися з потоком | P2 | Backend | ~1 год | ⏭️ v1.1 |
| 13 | Відсутній ITSAppUsesNonExemptEncryption | P3 | Compliance | S | [x] |
| 14 | Privacy Policy: застаріла Effective date (січ 2025) | P3 | Legal | S | [x] |
| 15 | Зайві закомічені файли (Untitled.swift, prototype, .docx, .temp) | P3 | Гігієна | S | [x] |
| 16 | Дрейф доків (flow-map/screen-status/APP_STORE_RELEASE.md) | P3 | Docs | S | [x] |

### ⏭️ Перенесено у v1.1 (не блокери релізу)
Свідоме рішення owner (2026-06-28): не блокують подачу, потребують деплою БД/edge або харденінг із низьким реальним ризиком.
- **#3** — преміум-`detailed` у мережевій відповіді. Клієнт уже ховає з UI+кешу; залишкова дірка лише через MITM/raw-API з anon-ключем (низька загроза, дешевий щоденний контент). Не блокер Apple/приватності. Повний фікс (RPC+REVOKE) — масштабна зв'язана зміна БД+клієнт, у v1.1.
- **#7** — неавтентифікований `register-device`: лише забруднення таблиці push_devices, надсилати пуші не дає (admin-secret). У v1.1.
- **#8** — токени в UserDefaults замість Keychain: типово для Capacitor, ризик лише на jailbreak/бекапі. У v1.1.
- **#12** — деривація Telegram-auth: функціональний (логіни можуть падати), не безпековий; потребує підтвердження потоку. У v1.1.

---

## Деталі по пунктах

### [x] #1 — Google Sign-In без deep-link повернення (P1, Apple 2.1) ✅ ЗАКРИТО (прибрано для v1)
- **Уточнення:** Google вже був прихований на iOS (`showGoogleLogin = !isIOSNative`) — реальний ризик Apple був нижчий, ніж оцінив аудит. Зламаний OAuth з'являвся лише у web/Android.
- **Фікс:** повністю прибрано Google з `LoginView.vue` + `SignUpScene.vue` (кнопка, `loginWithGoogle`, `googleLoading`, `showGoogleLogin`, CSS). Лишилися Apple Sign In + email-OTP. lint+build+241 тестів зелені. Реалізація — в git-історії для майбутнього Android (там треба буде deep-link return).
- **v1.1 (Android):** повернути Google з коректним `appUrlOpen` deep-link.
- **Деталі (оригінал):**
- **Докази:** `src/components/auth/LoginView.vue:248`, `src/components/auth/SignUpScene.vue:322-325` — `signInWithOAuth({ provider:'google', options:{ redirectTo: window.location.origin + '/' } })`. У Capacitor `window.location.origin` = `capacitor://localhost`. У `Info.plist` немає `CFBundleURLTypes`/схем; в entitlements немає Associated Domains; у `src/` немає слухача `appUrlOpen`/`getLaunchUrl`.
- **Чому:** зовнішній Safari-OAuth не має куди повернути сесію → нефункціональна кнопка → Guideline 2.1.
- **Apple Sign In — ОК** (нативний плагін `signInWithIdToken`, без редіректу). 4.8 виконано.
- **Фікс:** спершу перевірити на пристрої. Якщо зламано → (а) URL-схема в Info.plist + `App.addListener('appUrlOpen', …)` → передати в `supabase.auth`; або (б) прибрати Google-кнопку для v1.

### [x] #2 — FirebaseAnalytics AdIdSupport / IDFA (P1, Compliance) ✅ ЗАКРИТО
- **Фікс:** у `ios/App/Podfile:30` замінено `CapacitorFirebaseAnalytics/Analytics` → `CapacitorFirebaseAnalytics/AnalyticsWithoutAdIdSupport` (готовий subspec пода → `FirebaseAnalytics/WithoutAdIdSupport`). `pod install` успішний; `Podfile.lock` тепер `WithoutAdIdSupport` для FirebaseAnalytics + GoogleAppMeasurement, `/AdIdSupport` = 0 збігів. Відповідає `NSPrivacyTracking=false` без ATT.

### [ ] #3 — Серверний витік преміум `detailed` гороскопу (P1, Монетизація)
- **Докази:** `src/services/supabaseNativeCore.js:264-279` (`selectHoroscopes`) тягне `summary,detailed` для всіх тем без фільтра entitlement; таблиця `horoscopes` без RLS. Клієнт вирізає на `horoscopeContentCore.js:58-73`, але сире тіло видобувне з мережевої відповіді.
- **Фікс:** читання з урахуванням entitlement на сервері / RLS, щоб не віддавати `detailed` без права.

### [~] #4 — Мертва i18n-система (P1, Підтримуваність) 🟡 ЧАСТКОВО
- ✅ Видалено `src/boot/i18n.js` (повністю мертвий — не в quasar.config boot-масиві, app.use ніколи не виконувався, ніхто не імпортує). Build+241 тестів зелені.
- ✅ Оновлено CLAUDE.md (3 місця) + skill `arcana-i18n-consistency` → `messages.bundle.js` названо LIVE-джерелом; `en.json`/`uk.json` позначено legacy.
- ⏳ **ЛИШИЛОСЬ (рішення owner):** `en.json`/`uk.json` ще використовує ai-ops `code-scan.js:175-237` (`detectI18nParity`) — перевіряє en/uk-parity на МЕРТВИХ файлах (фальшивий сигнал; реальний bundle не перевіряється). Щоб видалити JSON, треба перенацілити сканер на `messages.bundle.js` + переписати `tests/ai-ops/codeScan.test.js` + `tests/ai-ops/outputContracts.test.js`. Це зміна QA-тулінгу — потребує згоди.
- **Жива i18n здорова:** 1306/1306 EN-UK, 0 неперекладених.

### [x] #5 — RLS на немігрованих таблицях (P1→P0, Безпека) ✅ ЗАКРИТО (перевірено в дашборді 2026-06-29)
- **Результат діагностики:** RLS увімкнено на всіх 3 таблицях; усі політики owner-scoped до `auth.uid()`, лише для `authenticated`.
  - `push_devices`: insert/select/update_own з `qual`/`with_check = (user_id = auth.uid())` (NULL там, де норма). Device-токени захищені — P0 НЕ справдився.
  - `app_users`: insert/select/update **self** (authenticated).
  - `tarot_readings`: select/insert/update/delete own ({public} + auth.uid()-чек → anon отримує 0 рядків).
  - Гранти anon/authenticated у `role_table_grants` — нормальний дефолт Supabase, гейтиться RLS.
- ✅ Hand-written міграцію видалено (коміт `revert(db)`) — жива БД вже коректна.
- ⏳ Опційно (закрити дрейф): `supabase db pull`, щоб версіонувати реальні живі політики.

#### (історичне) первинний план до перевірки:
- **Аналіз доступу (з коду):** `push_devices` — клієнт НЕ чіпає (лише edge через service_role) → замкнути повністю. `app_users` (PII) — клієнт читає/upsert свій рядок по `id` → owner-scope `id=auth.uid()`. `tarot_readings` — клієнт read/insert/delete свої по `user_id` → owner-scope. `app_users`-міграція (`202606241300`) додала лише FK, БЕЗ RLS.
- ✅ Створено ідемпотентну міграцію `supabase/migrations/202606281600_rls_user_tables.sql`.
- ⏳ **ПОТРЕБУЄ OWNER:**
  1. Прогнати діагностичний SQL у Supabase (див. трекер/чат) → дізнатись поточний стан.
  2. Якщо RLS відсутній/неповний → `supabase db push`.
  3. Перевірити на пристрої: розклади таро + профіль читаються/зберігаються.
- **P0-тригер:** `push_devices` з `rls_enabled=false` + `SELECT` для anon/authenticated = чужі device-токени читаються будь-ким.

### [x] #6 — Tap-таргети < 44pt (P2, A11y/HIG) ✅ ЗАКРИТО
- **Фікс:** додано глобальну утиліту `.hit-44` у `src/css/app.scss` (прозорий `::after` 44×44, центрований, візуал не міняється). Застосовано до 14 реальних кнопок: `premium-back`, `daily-back`, `zodiac-back`, `head-fav-btn`, `compat-back`, `readings-back` (×2 — SavedReadings+PersonalHoroscope), `readings-sheet-back`, `rewards-back`, `account-back`, `cards-back`, `cards-sheet-back`, `faq-back`, `policy-back`. Перевірено: жодного `overflow:hidden` (overlay не обрізається), без конфлікту псевдоелементів. Декоративні 36px (`.sheet-handle`, `.reward-card__glyph`, `.compat-house__badge`, `.ok-arrow`) свідомо НЕ чіпав — аудит їх переоцінив як кнопки. lint+build+241 тестів зелені.
- **Деталі (оригінал):**
- **Докази (36×36, якщо не вказано):** `DailyCardComponent.vue:375`, `ZodiacGuideComponent.vue:1375,1676`, `CompatibilityPage.vue:1357,2584`, `SavedReadingsPage.vue:567,884`, `PersonalHoroscopePage.vue:531`, `RitualRewardsPage.vue:745`, `AccountPage.vue:1041`, `CardLibraryPage.vue:382,629`, `FaqSupportComponent.vue:157`, `PrivacyTermsComponent.vue:152`, `SignUpScene.vue:555`, `LoginView.vue:541`, `ConfirmEmailCode.vue:341`. **Найгірше:** `PremiumInfoComponent.vue:801` = **34×34** (paywall). Еталон 44×44: `TarotInterpretationPage.vue:378,411`.
- **Фікс:** до 44×44 або розширення hit-area через `::before`/padding (міксин).

### [ ] #7 — register-device без авторизації (P2, Безпека)
- **Докази:** `supabase/config.toml` `verify_jwt=false`; `register-device/index.ts:81-88,187-188` — `authUserId` best-effort, інакше `plainPayload` → upsert у `push_devices` з `service_role`. Єдиний гейт — regex формату APNs-токена.
- **Фікс:** вимагати валідний JWT для upsert (401 без user) або `verify_jwt=true`; як мінімум rate-limit за IP.

### [ ] #8 — Токени в UserDefaults, не Keychain (P2, Безпека)
- **Докази:** `src/services/supabaseClient.ts:11-57` — adapter зберігає сесію (вкл. `refresh_token`) через `Preferences.set` (iOS UserDefaults) на нативі.
- **Фікс:** Keychain-плагін (`@capacitor-community/secure-storage` / `capacitor-secure-storage-plugin`) як storage adapter для Supabase на нативі.

### [x] #9 — 157 console.* у production (P2, Гігієна) ✅ ЗАКРИТО
- **Фікс:** додано `extendViteConf` у `quasar.config.js` — `esbuild.drop = ['console','debugger']` лише при `ctx.prod` (dev-логи лишаються). Production-білд: усі 157 викликів додатку прибрано; лишилось 4 бібліотечні (`e.console.error` у Capacitor, `this.logger=console.log` у Supabase — не прямі виклики, не наш код, не чутливі).

### [x] #10 — Важкі зображення (P2, Перф/розмір) ✅ ЗАКРИТО
- **Фікс:** додано `sharp` (devDep) + `scripts/convert-images-webp.mjs` (re-runnable). Сконвертовано у WebP: hero **6.4 МБ → 178 КБ**, 78 карт **22 МБ → 6.5 МБ** = **−21.7 МБ (76%)**. PNG видалено. Оновлено референси: `tarot_full.json` (78 `file` + `examples` + `fileFormat` → webp), `LandingScene.vue` (CSS url + захардкоджений TheHermit). Перевірено: 0 битих .png-референсів, build OK (webp у dist: hero + 78 карт), 241 тест. WebP підтримується iOS 14+ (наш target).

### [x] #11 — DailyCardComponent без error/empty (P2, UX) ✅ ЗАКРИТО
- **Фікс:** додано `loadState` ('loading'|'ready'|'error') у `DailyCardComponent.vue`. Init тепер `throw` на `error || !nextCards.length`; safe-обгортка ставить `loadState='error'`. Шаблон: гілка loading (q-spinner) + error (`common.loadError` + кнопка `common.retry` → `retryDailyCard`). Стилі `.daily-state`. Lint+build+241 тестів зелені.

### [ ] #12 — Telegram-auth деривація секрету (P2, Backend)
- **Докази:** `supabase/functions/telegram-auth/index.ts:200-207` — `HMAC_SHA256(key="WebAppData", msg=botToken)` (схема Mini-App initData), але форма payload (`{id, first_name, auth_date, hash}`) — це Login Widget, де `secret = SHA256(botToken)`. Не діра форджингу (constant-time + length-check ок), але легітимні логіни можуть тихо падати.
- **Фікс:** підігнати деривацію під реальний потік; перевірити живим логіном.

### [x] #13 — Відсутній ITSAppUsesNonExemptEncryption (P3, Compliance) ✅ ЗАКРИТО
- **Фікс:** додано `<key>ITSAppUsesNonExemptEncryption</key><false/>` в `ios/App/App/Info.plist:51-52`. `plutil -lint` → OK. Тепер ASC не питатиме export compliance при кожному завантаженні.

### [x] #14 — Privacy Policy застаріла дата (P3, Legal) ✅ ЗАКРИТО
- **Фікс:** `privacy-policy.html:128` → `Effective date: 28 June 2026 · Last updated: 28 June 2026`; `© 2025`→`© 2026` у `privacy-policy.html` + `support.html`.
- ⚠️ Передеплоїти GitHub Pages після коміту, щоб онлайн-версія оновилась.

### [~] #15 — Зайві закомічені файли (P3, Гігієна) 🟡 ЧАСТКОВО
- ✅ `ios/App/App/Untitled.swift` (порожній плейсхолдер, не в pbxproj) — видалено через `git rm`.
- ✅ `bottom-nav-prototype.html` — видалено.
- ✅ `supabase/.temp/*` (8 файлів) — `git rm --cached` (лишені на диску) + додано `/supabase/.temp/` у `.gitignore`.
- ✅ `.docx`-аудити перенесено в `/docs/` (`git mv` для tracked, `mv` для untracked).

### [x] #16 — Дрейф документації (P3, Docs) ✅ ЗАКРИТО
- ✅ `flow-map.md` — прибрано 3 згадки неіснуючого `/my-day` (entry-sources, redirects) + застарілу «Important rule» про неіснуючий `CompatibilityPage 2.vue`.
- ✅ `screen-status.md` — Account 🔴→🟢 (email read-only через `accountPage.emailNote`); прибрано рядок про видалений `DailyRitualProgressComponent.vue`; debug-логи позначено як вирішені (#9); тести 194→241.
- ℹ️ `APP_STORE_RELEASE.md` — лишив як legacy (джерело правди — `docs/launch-readiness-plan.md`); за бажання можна окремо прунити.

---

## Операційні (owner) — поза кодом, для подачі
- [ ] Прогнати runbook пісочниці IAP: restore / скасування до кінця періоду / збереження після рестарту / negative-restore.
- [ ] Підписки `arcana.premium.monthly`/`yearly` → «Ready to Submit» + прикріплені до версії.
- [ ] Форми App Privacy + Age Rating в ASC відповідають `PrivacyInfo.xcprivacy`.
- [ ] Скріншоти завантажені.
- [ ] Hosted URL (Privacy/Support) повертають 200.
- [ ] Підтвердити `RC_ENFORCE_PREMIUM=true` у prod (інакше преміум-гейтинг обходиться).
- [ ] Підтвердити серверні секрети встановлені (CRON_SECRET, ADMIN_PUSH_SECRET, RC_WEBHOOK_SECRET, RC_SECRET_API_KEY, TELEGRAM_BOT_TOKEN, OPENAI/OPENROUTER ключі).
- [ ] Перевірити free-trial реально налаштований в ASC/RC (код готовий; важіль конверсії простоює).

---

## Сильні сторони (підтверджено)
- Apple-compliance фундамент реальний: Privacy Manifest, видалення акаунта (5.1.1(v)), Apple Sign In (4.8), розкриття 3.1.2 + Restore + Terms/Privacy на paywall, серверні AI-гардрейли, дисклеймери.
- Жодного секрету не закомічено/не відвантажено (у `dist` лише anon JWT + публічний RC-ключ).
- RLS у кожній міграції, що створює user-таблицю; cron/admin/webhook fail-closed з constant-time порівняннями.
- Дати/таймзони коректні (локальні day-keys, без UTC-дрейфу). Робота з пам'яттю збалансована.
- Майже всі баги нічного QA 2026-06-25 виправлені.
- Жива i18n: повний паритет 1306/1306, 0 неперекладених.

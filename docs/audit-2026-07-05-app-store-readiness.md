# Аудит готовності до App Store — 2026-07-05

> Зведений звіт 8 паралельних аудитів (billing, security, privacy/App Review, UX-флоу, native/iOS, performance, a11y/i18n, architecture/tests).
> **Вердикт: 🟡 Minor issues remain** — блокерів відхилення немає, але є обов'язкові дії перед першим архівом.
> Формат: чекбокси — закривай по одному, стався ✅ і додавай нотатку. Кожен пункт має «Як виправити» і «Як перевірити».
>
> Оцінки: Release readiness **7.5/10** · App Store compliance **8.5/10** · Security **7/10** · Performance **8/10** · Architecture **7/10**.
> Верифіковано в цій сесії: `npm test` → 250/250 pass; i18n паритет en/uk → 1313/1313 ключів, 0 розбіжностей; git-історія `.env` → лише публічні значення, ротація не потрібна.

---

## 🔴 БЛОК A — Обов'язково ПЕРЕД першим архівом (P0)

### A1. Підтвердити серверний premium-гейтинг у прод-Supabase 🟡 секрети існують (2026-07-06), лишилась поведінкова перевірка
> Статус: `RC_ENFORCE_PREMIUM` і `RC_SECRET_API_KEY` присутні в Edge Functions → Secrets (скріншот власника). Значення з дашборда не видно → фінальний тест: free-акаунт з витраченим подарунком → AI-таро → має бути відмова «premium required». Якщо прийшов AI-розклад — значення флага не рівне `true`. Заодно глянути Logs функції на `RevenueCat API error` (валідність sk-ключа v1).
- [ ] **Severity: HIGH (монетизація)** · `supabase/functions/_shared/premium.ts:118`, `tarot-reading/index.ts:60-69`, `personal-horoscope/index.ts:391`, `compatibility/index.ts:362`
- **Проблема:** уся серверна перевірка преміума працює лише якщо `RC_ENFORCE_PREMIUM === 'true'`. Якщо флаг не встановлений — весь преміум AI-контент безкоштовний для будь-якого залогіненого користувача (у `tarot-reading:69` явно: `isPremium = admin ? … : true`). Клієнтський гейтинг обходиться прямим викликом функції з JWT.
- **Як виправити:** у Supabase Dashboard → Edge Functions → Secrets перевірити/встановити `RC_ENFORCE_PREMIUM=true` і `RC_SECRET_API_KEY`. Це конфіг, не код.
- **Як перевірити:** викликати `tarot-reading` з JWT безкоштовного акаунта (без free-grant) → очікується 402/403, а не AI-відповідь.

### A2. Переасерт RevenueCat-ідентичності перед покупкою (money-in-no-access) ✅ (2026-07-05)
- [x] **Severity: HIGH** · Виправлено: `assertBillingIdentity(userId)` у `premiumBilling.js` — перед `purchasePackage` **і** `restorePurchases` перевіряє RC appUserID та за потреби робить `logIn` з перевіркою успіху; фейл → транзакція блокується (reason `no_user_id`/`network_error`), StoreKit не відкривається. Paywall передає `authStore.state.user?.id` в обидва виклики. Тести: 3 нові кейси в `tests/premiumBillingService.test.js` (анонімний id → logIn → покупка; збіг id → без logIn; фейл logIn → покупка/restore заблоковані), 254/254 pass. Лишається sandbox-підтвердження (A8).
- **Проблема:** RC appUserID прив'язується до Supabase user id лише при логіні, fire-and-forget (помилка → тільки `console.warn`). Якщо той `logIn` не вдався, покупка вішає entitlement на анонімний RC-id → сервер не бачить преміум → доступ відкликається при sync. Гроші зайшли — доступу нема.
- **Як виправити:** усередині `purchasePremiumPlan` (перед `purchasePackage`) викликати `Purchases.logIn(userId)` і **перевірити успіх**; при фейлі — не купувати, показати помилку з retry.
- **Як перевірити:** юніт-тест: мок RC, симулювати проваленний ранній logIn → purchase має спершу переасертити ідентичність. Плюс sandbox-прогін (A8).

### A3. Додати dSYM-аплоад Crashlytics (інакше краші прод — нечитабельні) ✅ (2026-07-05)
- [x] **Severity: HIGH** · Зроблено: фаза `[Firebase] Upload Crashlytics dSYMs` (`${PODS_ROOT}/FirebaseCrashlytics/run` + рекомендовані input-файли) додана останньою build-фазою; `plutil -lint` OK, `xcodebuild -list` OK, скрипт у Pods існує. Коміт `31ea2e4`. Залишок: після першого TestFlight-білда перевірити символіковані трейси у Firebase Console (Блок D).
- **Проблема:** FirebaseCrashlytics підключений і працює, але run-script фази аплоаду символів немає. Release генерує dSYM (`dwarf-with-dsym`), який нікуди не вивантажується → усі стек-трейси з TestFlight/проду будуть несимволіковані.
- **Як виправити:** Xcode → target App → Build Phases → + New Run Script Phase:
  `"${PODS_ROOT}/FirebaseCrashlytics/run"`, Input Files: `${DWARF_DSYM_FOLDER_PATH}/${DWARF_DSYM_FILE_NAME}/Contents/Resources/DWARF/${TARGET_NAME}`, `$(SRCROOT)/$(BUILT_PRODUCTS_DIR)/$(INFOPLIST_PATH)`.
- **Як перевірити:** зробити тестовий краш на TestFlight-білді → у Firebase Console стек-трейс має бути символікований.

### A4. Продифати і закомітити `project.pbxproj` ✅ (2026-07-05)
- [x] **Severity: MEDIUM-HIGH** · Переглянуто: diff містив лише `CURRENT_PROJECT_VERSION 14→55` (Debug+Release), без змін підпису/entitlements/фаз. Закомічено свідомо: `08bde45`.
- **Проблема:** файл керує підписом, версіями, entitlements, build-фазами. Непереглянуті правки можуть тихо зламати архів або підпис.
- **Як виправити:** `git diff ios/App/App.xcodeproj/project.pbxproj` → переглянути кожну зміну → закомітити свідомо (або відкотити зайве). Робити ДО A3 (фаза dSYM теж змінить цей файл).
- **Як перевірити:** `git status` чистий перед архівацією.

### A5. Виправити мертвий DB-fallback знака зодіаку на головній ✅ (2026-07-05)
- [x] **Severity: MEDIUM (реальний функціональний баг)** · `src/components/main/LandingScene.vue:1452` — виправлено (`data?.date_of_birth`), регресійний тест: `tests/landingHomeFocusTodayContracts.test.js` («DB fallback reads selectAppUser row as object»), 251/251 pass. Лишився девайс-чек ефекту (Блок D).
- **Проблема:** код читає `data?.[0]?.date_of_birth`, але `selectAppUser` (`supabaseNativeCore.js:169-170`) повертає **об'єкт**, не масив → завжди `''`. Після зміни акаунта / свіжого логіну (коли `profile_cache_v1` порожній) блок «Фокус дня» показує генерик замість персоналізованого гороскопу. Всі інші виклики коректні (`HoroscopeComponent.vue:957`, `PersonalHoroscopePage.vue:294`, `CompatibilityPage.vue:1329`).
- **Як виправити:** `return data?.date_of_birth || ''` (прибрати `[0]`).
- **Як перевірити:** юніт-тест на цей резолвер (мок selectAppUser → об'єкт з date_of_birth) + девайс: розлогін → логін → головна одразу показує персоналізований фокус.

### A6. Чисті залежності перед білдом: Pods і node_modules з « 2»-дублікатами
- [ ] **Severity: MEDIUM (build hygiene)** · `ios/App/Pods/FirebaseAnalytics/Frameworks 2/`, `ios/App/Pods/GoogleAppMeasurement/Frameworks 2/`, `node_modules/@quasar 2/`, `node_modules/…app-vite 2/`
- **Проблема:** Finder-дублікати всередині Pods/node_modules. Фаза `[CP] Check Pods Manifest.lock` (pbxproj:251) впаде, якщо Pods розійдеться з Podfile.lock; дублікати роздувають чекаут.
- **Як виправити:** `cd ios/App && pod deintegrate && pod install`; у корені — `rm -rf node_modules && npm ci`.
- **Як перевірити:** `find ios/App/Pods node_modules -name '* 2*' -maxdepth 3` → порожньо; білд проходить.

### A7. Виправити/прибрати відсутній `logo.png` на Launch Screen
- [ ] **Severity: MEDIUM** · `ios/App/App/Base.lproj/LaunchScreen.storyboard:14,30`
- **Проблема:** storyboard посилається на `logo.png` (1024×216), але в `Assets.xcassets` є лише AppIcon і Splash — ассета немає → запуск показує порожній темний екран (фон коректний #0a0a0f, білого флешу нема, але бренд-лого відсутнє).
- **Як виправити:** або додати `logo` imageset у Assets.xcassets, або видалити imageView зі storyboard.
- **Як перевірити:** запуск на девайсі/симуляторі — launch-екран виглядає як задумано.

### A8. Один повний sandbox-прогін IAP (закриває одразу кілька ризиків)
- [ ] **Severity: HIGH (верифікація, не код)** · RC Dashboard + StoreKit sandbox
- **Проблема:** з коду неможливо перевірити: (а) чи резолвляться offerings і реальні ціни (якщо ні — paywall показує «Price from App Store.» з активною кнопкою — ризик 3.1.2, `PremiumInfoComponent.vue:334-338`); (б) чи entitlement `premium` замаплений на `arcana.premium.monthly/yearly`; (в) transfer behavior між акаунтами; (г) intro offer для «Start free trial».
- **Як виправити/перевірити:** sandbox-акаунт → купівля → преміум відкривається → розлогін/логін → Restore повертає доступ → перевірити другий акаунт на тому ж девайсі. Звірити RC Dashboard: entitlement mapping, transfer behavior, intro offers.

### A9. Перевірити RLS на всіх користувацьких таблицях Supabase ✅ (2026-07-06)
- [x] **Severity: HIGH (верифікація)** · Перевірено власником через SQL (`pg_tables.rowsecurity`): **усі 23 таблиці public-схеми мають RLS enabled** — включно з `app_users`, `push_devices`, `tarot_readings`, `user_entitlements`, `ai_*`, `ritual_*`, `subscriptions`. Жодного `false`.

### A10. App Store Connect: метадані
- [ ] **Severity: MEDIUM (ризик відхилення)** · не код — ASC
- **Що зробити:**
  - Вікова категорія: для fortune-telling ставити чесно (зазвичай 17+ або відповідні дескриптори) — Guideline 1.4.3/2.3.
  - App Privacy nutrition-label = точне дзеркало `PrivacyInfo.xcprivacy` (Name, Email, UserID, DeviceID, ProductInteraction, PurchaseHistory, OtherUserContent, CrashData; все Linked, нічого для Tracking).
  - **Reviewer note:** «Restore Purchases вимагає входу — підписка прив'язана до акаунта; тестовий акаунт: …» (закриває ризик 3.1.1, бо `onRestore` → `ensureSignedInForBilling`, `PremiumInfoComponent.vue:599-601`).
  - У маркетинговому копі — жодних «guaranteed predictions».
- **Як перевірити:** чекліст ASC заповнений до сабміту.

### A11. Релізити тільки через `scripts/release-ios.sh`
- [ ] **Severity: MEDIUM (процес)** · `scripts/release-ios.sh`
- **Проблема:** шипнуті web-ассети в `ios/App/App/public/` актуальні лише станом на останній `cap sync`. Скрипт має freshness-перевірку; відкриття Xcode напряму її обходить.
- **Як перевірити:** перед архівом запускати скрипт, не `open ios/App`.

---

## 🟠 БЛОК B — Треба виправити, але не блокує архів (P1)

### B1. AI-ендпоінти без стелі витрат: rate limit / квота ✅ код (2026-07-06) — ⚠️ потребує деплою
- [x] **HIGH (кости)** · Зроблено: міграція `202607060900_ai_usage_daily.sql` (таблиця + атомарні RPC `increment_ai_usage`/`refund_ai_usage`, RLS, service-role-only); хелпер `_shared/aiQuota.ts` (ліміти: tarot 30, personal 10, compat 20 на день, env-оверрайд `AI_DAILY_LIMIT_*`, fail-open з notifyError при збої лічильника); вбудовано в усі 3 функції ПІСЛЯ кешу/ПЕРЕД AI, з рефандом при фейлі провайдерів (без рефанду на content-guard — інакше crafted input палив би бюджет безкоштовними ретраями); квота працює незалежно від `RC_ENFORCE_PREMIUM`. Клієнт: `isDailyLimitError` (429), i18n `aiLimits.dailyReached` + `tarotOracle.ui.aiDailyLimitNotify` (en+uk), підключено в PersonalHoroscope / Compatibility (без кнопки retry) / TarotOracle (чесний notify + структурний fallback). Тести: `tests/aiQuotaContracts.test.js`, 260/260 pass.
- **Задеплоєно 2026-07-06:** міграція застосована (`supabase migration list` — 202607060900 у remote), функції розкочені (`tarot-reading`, `personal-horoscope`, `compatibility`). Смоук: зробити 1 AI-виклик з застосунку → рядок у `ai_usage_daily`.

### B2. Deno-тести для грошових шляхів ✅ топ-пріоритети (2026-07-06)
- [x] **HIGH (QA)** · Зроблено (25 тестів, усі зелені, `npm run test:functions`):
  - `supabase/functions/tests/premium.test.ts` (10) — кеш fast-path, авторитетний RC-чек по Supabase user id, fail-OPEN на 5xx/401/429/network/non-JSON, fail-CLOSED лише на авторитетне «нема entitlement», expiry кешу, точна семантика `RC_ENFORCE_PREMIUM==='true'`.
  - `supabase/functions/tests/revenuecat-webhook.test.ts` (10, інтеграційні: реальний HTTP до хендлера, перехоплений RPC) — 401 на невірний секрет, INITIAL_PURCHASE/RENEWAL/EXPIRATION/REFUND/TRANSFER-мапінг, анонімні id ігноруються, FK 23503 → 200 (RC перестає ретраїти), інший фейл → 500.
  - `supabase/functions/tests/aiQuota.test.ts` (5) — ліміти/env-оверрайди, deny на -1, fail-open на збої лічильника, best-effort refund.
  - CI: новий джоб `edge_function_tests` у `.github/workflows/ci-tests.yml` (denoland/setup-deno). Deno 2.9.1 встановлено локально (brew).
- [ ] **Залишок (менший пріоритет, окремим заходом):** `delete-account` (GDPR), AI-функції fallback-ланцюг, `_shared/ritual.ts` — хендлери на `Deno.serve`, потребують того ж інтеграційного патерна.

### B3. Неогороджений `JSON.parse` — краш-вектор екрана Налаштувань ✅ (2026-07-06)
- [x] **MEDIUM (crash)** · Виправлено сильніше, ніж try/catch: обидва читання (`SettingsComponent.vue` data(), `boot/push.js`) переведені на строге порівняння `localStorage.getItem(LS_DAILY_PUSH) === 'true'` — не може кинути виняток у принципі; пошкоджене значення = «вимкнено». Семантика без змін (writer пише `'true'`/`'false'`). Регресія: `tests/dailyPushFlagContracts.test.js` (заборона JSON.parse на цьому ключі + контракт writer'а), 262/262 pass.

### B4. Відео Оракула ніколи не пауситься (батарея) ⏸ ВІДКЛАДЕНО СВІДОМО (2026-07-06)
- [ ] **MEDIUM → парковка post-launch** · `src/components/TarotOraclePage.vue:943,948,2363`
- **Рішення власника:** не чіпати до релізу. Обґрунтування: iOS заморожує JS-таймери повністю згорнутого застосунку, тож реальна економія — лише перехідні моменти (шторка/app switcher); а агресивний watchdog — чинний захист від класу багів «відео не відновилось» (чорний фон Оракула). Ризик регресії > виграш.
- **Якщо повертатись (post-launch):** watchdog не чіпати; лише на `document.hidden` зупиняти watchdog + `video.pause()`, відновлення віддати наявному механізму на visible. Мерж тільки після перевірки на реальному девайсі.

### B5. Home refetch на кожен foreground (мигання + зайва мережа) ✅ (2026-07-06)
- [x] **MEDIUM** · Виправлено: у `onHomeResume` перезавантаження контенту загейчено `if (dayRolled || !this.dailyCardData)` — той самий патерн, що вже стояв для `computeAstro`. Захист N1 (ніч у фоні → свіжий день) збережено; запобіжник відновлення: якщо mount-завантаження не завершилось (офлайн), resume добере контент. Локальні стрік/прогрес оновлюються на кожен foreground як і раніше (`refreshHomeProgressState` тепер викликається прямо в resume). `boot/auth.ts` свідомо не чіпав (сесія на resume — коректно). Регресія: тест у `tests/landingHomeQaContracts.test.js` (reload не може стати безумовним), 263/263 pass. Девайс-чек мигання — Блок D.

### B6. Кеш-трешинг гороскопу для преміум-користувачів ✅ (2026-07-06)
- [x] **LOW** · Виправлено: home-прев'ю тепер передає `isEntitled: premiumAccessStore.hasPremiumAccess.value` у `loadHoroscopeRegistry` (стор підключено module-scope — той самий патерн, що в HoroscopeComponent). Кеш дня пишеться в одній формі з екраном Гороскопу → жодних форс-рефетчів на Home↔Horoscope; Home і далі рендерить лише безкоштовний teaser; захисний мізматч-рефетч при втраті преміума працює як і раніше. Регресія: тест у `tests/landingHomeFocusTodayContracts.test.js`, 264 тестів pass, lint чистий. Девайс-чек мережі — Блок D.

### B7. `horoscope_sign_key_v1` не чиститься на sign-out ✅ (2026-07-06)
- [x] **LOW** · Виправлено: ключ додано в `clearAccountScopedLocalState` (`authStoreCore.js`) — покриває обидва шляхи виходу (SIGNED_OUT і синхронний clearUser). Після зміни акаунта знак попереднього користувача більше не показується; свіжий знак підтягне виправлений у A5 DB-fallback. Регресія: розширено `tests/authAccountScopedClear.test.js` (ключ чиститься; неакаунтні ключі виживають), усі тести pass.

### B8. `register-device` приймає неавтентифіковані записи ✅ код (2026-07-06) — ⚠️ потребує деплою
- [x] **MEDIUM (security)** · Виправлено **ownership-гейтом**, а не тупим «JWT завжди» (анонімний пуш — підтримуваний продуктовий флоу: тогл доступний розлогіненим): claimed-рядок (з `user_id`) може змінювати лише його власник — анонім або інший акаунт отримує 403 `device_owned_by_account`; unclaimed-рядки відкриті як і були; помилка ownership-перевірки → fail-CLOSED (500). Нова дія `unlink` (тільки з auth, тільки свій рядок): при логауті клієнт відв'язує девайс ДО закриття сесії (`AccountPage.logout` → `unlinkDeviceForLogout`, best-effort) — розлогінений власник далі керує своїм пушем анонімно. Krайовий випадок: офлайн-логаут лишає рядок claimed до наступного входу (задокументовано в коді). `delete-account` каскадно видаляє рядки — без змін. Тести: `supabase/functions/tests/register-device.test.ts` (8 інтеграційних: атака на suppression → 403, чужий takeover → 403, owner ок, анонім на unclaimed ок, unlink auth-only, fail-closed, garbage token → 400 без DB), 33/33 Deno + 268/268 node pass, lint чистий.
- **Задеплоєно 2026-07-06.** Смоук: пуш-тогл у Налаштуваннях працює залогіненим і розлогіненим.

### B9. Токени сесії в UserDefaults замість Keychain ⏸ ПРИПАРКОВАНО (рішення власника 2026-07-06: post-launch)
- [ ] **MEDIUM (hardening)** · `src/services/supabaseClient.ts:45-49`
- **Обґрунтування парковки:** не вимога Apple (нуль впливу на рев'ю); токен захищає таро/дату народження/email, не платіжні дані; реалістична атака — таргетована (незашифрований бекап жертви або jailbreak). Ціна фікса перед релізом висока: новий нативний плагін + кастомний storage-адаптер + міграція наявних сесій (помилка = масовий розлогін після апдейту) у найчутливішому місці — session restore на холодному старті.
- **Коли повертатись (post-launch, окрема сесія):** кастомний storage-адаптер Supabase поверх Keychain-плагіна (напр. `capacitor-secure-storage-plugin`) з міграцією Preferences→Keychain при першому запуску; перевірка на TestFlight: сесія переживає апдейт і рестарт, ключ `sb-…-auth-token` зникає з Preferences.

### B10. Geocode-fetch без таймауту і AbortController ✅ (2026-07-06)
- [x] **LOW-MEDIUM** · Виправлено: `searchCities` тепер має AbortController + таймаут 8с (як у решти мережевого шару); кожен новий пошук скасовує попередній in-flight (out-of-order clobber неможливий), помилки/abort деградують у порожній список. У `CompatibilityPage` доданий guard за `citySearchReqId` (патерн aiRequestId) — результати і спінер не перетираються застарілим запитом. Тести: `tests/geocodeSearch.test.js` (4 поведінкові: суперседження, таймаут, короткі запити без мережі, malformed-відповіді), всі pass, lint чистий.

---

## 🟡 БЛОК C — Полірування / технічний борг (P2, після сабміту — ок)

### C1. Guard-тест паритету i18n en/uk ✅ (2026-07-06)
- [x] **MEDIUM (процес)** · Додано в `tests/i18nMessages.test.js`: (1) рекурсивна рівність множин ключів en↔uk (масиви = листя, довжини фраз можуть відрізнятись legally); (2) бонус — заборона порожніх рядків-значень з усвідомленим allowlist (`compatibilityPage.aspects.unknown` — порожній за дизайном). Будь-який майбутній дрифт копі = червоний тест, а не сирий dot-path у UI. 270/270 pass.

### C2. Апгрейд Capacitor 5 → 7 (EOL), RevenueCat 4 → 5, Firebase 10 → 11 ⏸ ПРИПАРКОВАНО (рішення власника 2026-07-06: тільки post-launch, окремою сесією)
- [ ] **HIGH (борг, післярелізний)** · `ios/App/Podfile.lock:2,36,125`, `package.json:44-54`
- 5.x без фіксів; заразом видалити ручний патч `PurchasesHybridCommon` у `Podfile:38-64`. До апгрейду — прогнати смоук на найновішому iOS.

### C3. Доступність: контраст і розміри ✅ (2026-07-06)
- [x] **MEDIUM** · Виправлено в `BottomNavigation.vue`: неактивні таби `0.42 → 0.62` альфи (розраховано: ~3.0:1 → ~5.1:1 поверх #0b1220 — проходить AA 4.5:1), лейбли 10px→11px (вузькі екрани 9px→10px). Регресія: `tests/bottomNavA11yContracts.test.js` пінить підлоги (альфа ≥ 0.6, лейбли ≥ 11/10px). 272/272 pass.
- Примітка: повноцінний Dynamic Type у WKWebView не мапиться на px/rem — це властивість Capacitor-підходу; актуальна частина (мінімальні розміри найдрібнішого тексту) закрита. Візуальну оцінку нового контрасту глянути оком на девайсі (Блок D).

### C4. VoiceOver: кастомні bottom-sheets поза q-dialog ✅ FALSE POSITIVE (верифіковано 2026-07-06)
- [x] **Знахідка не підтвердилась.** Усі реальні шторки — `<q-dialog>` (таро `TarotOraclePage:165,230`; налаштування `SettingsComponent:300,339`; astro `LandingScene:190`) — Quasar дає role="dialog"/aria/focus-management з коробки. Цитовані «fixed-діви»: `HoroscopeComponent:2724` — декоративна фонова смуга, `:2882` — fixed CTA-кнопка, `PremiumInfoComponent:781` — `::after`-градієнт з `pointer-events:none`. Коду виправляти нема чого.
- [ ] Лишається (Блок D): ручний VoiceOver-пас шторок на девайсі — семантика q-dialog правильна, але реальну поведінку читалки з коду не видно.

### C5. Touch-targets < 44pt поза hit-44 хелпером ✅ (2026-07-06)
- [x] **LOW-MEDIUM** · Проінспектовано код усіх підозрюваних: дата-колеса сумісності — 44px ✓, reltype-чипси ✓, емодзі-пікер 44×44 ✓, картки сітки великі ✓. Знайдено і виправлено 3 реальні: `cards-search__clear` (~18px) і `compat-savedconn__del` (38px) → додано `hit-44`; фільтр-чипси бібліотеки карт (~28px) → вертикальне 44px-розширення тап-зони через `::before` (візуально без змін; `::after` зайнятий підкресленням). Регресія: `tests/touchTargetContracts.test.js`. 274/274 pass. Фінальний тактильний чек — Блок D.

### C6. `UIBackgroundModes remote-notification` ✅ прибрано (2026-07-06)
- [x] **LOW (2.5.4)** · Перевірено: `content-available` не використовується ніде (push-worker:650 і send-broadcast:401 шлють тільки alert+sound; у src/ і Swift-коді нуль згадок). Background mode прибрано з Info.plist (`plutil -lint` OK). Alert-пуші доставляються без нього — приводу для питань рев'юера більше немає. Девайс-чек доставки пуша — Блок D.

### C7. Розкрити open-meteo geocoding у privacy policy ✅ УЖЕ БУЛО (верифіковано 2026-07-06)
- [x] **LOW (5.1.1/5.1.2)** · Політика вже розкриває: `app-store/privacy-policy.html:254-256` — розділ «Third-Party Services» містить «Open-Meteo (geocoding): Converting the birth city you enter into coordinates… Birth city name only (not linked to your identity)». Діяти не треба.

### C8. Прибрати повний `firebase` JS SDK, якщо не імпортується ✅ ВИПРАВДАНИЙ, НЕ ЧІПАТИ (верифіковано 2026-07-06)
- [x] **LOW-MEDIUM (bundle)** · Перевірено: (1) прямих імпортів у src/ нуль; (2) але `firebase` — обов'язковий **peerDependency** `@capacitor-firebase/analytics` (`^9||^10`), npm 7+ встановить його однаково; (3) головне — в шипнутий бандл він НЕ потрапляє: `ios/App/App/public/assets` = 2.6MB без жодного firebase-чанка (web-імплементація плагіна вантажиться динамічно і на iOS не використовується). Видалення нічого не заощадить і зламає dev-режим. Діяти не треба.

### C9. Документація бреше — виправлено ✅ (2026-07-06)
- [x] **LOW** · Виправлено 3 місця: `docs/canonical-files.md` (locale-секція → messages.bundle.js LIVE, en/uk.json — мертві фікстури), `AGENTS.md:45` (i18n-правило тепер вказує на bundle), `CLAUDE.md` (структура: стори — module-level ref()-синглтони, НЕ Pinia). Скіл `arcana-i18n-consistency` уже був коректний. Історичний звіт `pre-release-audit-2026-06-24.md` свідомо не чіпав (запис на дату).

### C10. Мертвий/дубльований код ✅ (2026-07-06, видалення схвалено власником)
- [x] **LOW** · Зроблено: (1) `appEpoch.js` — прибрано мертвий епох-лічильник (`appEpoch` ref + `bump()`, нуль прод-викликів), тест стереже від повернення; (2) видалено з дозволу власника: `src/layouts/MainLayout.vue` (нуль посилань, роути на BlankLayout), `src/data/tarot_full.json` (392KB) і `tarot_meta.json` (нуль імпортів, канонічний — cardsV2); (3) `ConfirmEmailCode.vue` — прибрано застарілий закоментований імпорт. Верифікація: 274/274 тестів, lint чистий, `quasar build` — Build succeeded.

### C11. Auth-логіка повз сервісний шар ⏸ ПРИПАРКОВАНО (рішення власника 2026-07-06: post-launch — зачіпає логін/OTP/логаут, ризик > цінність перед релізом)
- [ ] **MEDIUM (борг)** · `LoginView.vue:3`, `SignUpScene.vue:2`, `ConfirmEmailCode.vue:4`, `AccountPage.vue:202` — прямі виклики `supabase.auth.*` повз `supabaseNative`/`authStore` → логіка дубльована й не покрита тестами authStoreCore.
- **Як виправити:** винести ці виклики в сервіс/стор; компоненти лишають тільки UI.

### C12. God-компоненти ⏸ ПРИПАРКОВАНО (рішення власника 2026-07-06: post-launch)
- [ ] **MEDIUM (борг)** · `TarotOraclePage.vue` (3 587 рядків), `LandingScene.vue` (3 043), `HoroscopeComponent.vue` (2 910), `CompatibilityPage.vue` (2 717)
- Декомпозиція після релізу; трекати в `launch-readiness-plan.md`.

### C13. Преміум-стан потрійно джерельний ⏸ ПРИПАРКОВАНО (рішення власника 2026-07-06: post-launch — грошові шляхи щойно виправлені/протестовані й працюють у проді)
- [ ] **MEDIUM (борг)** · `premiumAccess.js:35,49`, `authStore.js:62` — localStorage + RC (девайс) + `user_entitlements` (сервер), реконсиляція ad-hoc → клас багів «оплачено, але закрито». Довгостроково: один резолвер-джерело правди.

### C14. Дрібне ✅ безпечна частина (2026-07-06)
- [x] `premiumBilling.js` — фолбек плану: додано евристику за product id (`/year|annual/` → yearly) для невідомих продуктів; тест у `premiumBillingService.test.js`.
- [x] `flushProfileQueue` — підтверджено: early-return і на відсутнього юзера, і на порожню чергу (`authStoreCore.js:136-141`). Діяти не треба.
- [x] `LandingScene.vue` — додано `pruneStaleHomeDailyCardRevealKeys` на mount: усі dated reveal-ключі, крім сьогоднішнього, зачищаються; контракт-тест у `landingHomeQaContracts.test.js`.
- [x] Медіа зважено: `oracle-loop.mp4` — 176KB, `landing-stars-bg.webp` — 180KB — легкі, дій не треба. Шрифти `JetBrainsMono-*.ttf` (540KB) — **мертві файли**: ніде не підключені, у бандл не потрапляють (кандидат на видалення, потрібен дозвіл).
- [ ] ⏸ ПРИПАРКОВАНО: спільний `requireUser()`/CORS для ~12 edge-функцій — зачіпає всі функції + повний редеплой, робити post-launch.
- [x] `telegram-auth` — підтверджено: Telegram-логіну в iOS-клієнті НЕМАЄ (єдина згадка — CSS-коментар); серверна функція застосунком не викликається (кандидат на декомішн post-launch).
- [x] Іконка 1024px: `sips -g hasAlpha` → **no** — ризику відхилення немає.

---

## 📱 БЛОК D — Девайс-пас (неможливо перевірити з коду; перед сабмітом)

- [ ] Sandbox IAP: purchase → unlock → logout/login → Restore (див. A8).
- [ ] APNs: реєстрація, доставка daily push, поведінка тапу по нотифікації.
- [ ] Ефект бага A5 наживо: зміна акаунта → «Фокус дня» персоналізований.
- [ ] VoiceOver-пас: оракул-шторка, astro-sheet, paywall (C4).
- [ ] Відео Оракула на Low Power Mode (poster-fallback) і після фікса B4.
- [ ] Швидкий app-switch: без мигання Home (після B5).
- [ ] Launch screen після A7; холодний старт на найновішому iOS (Capacitor 5!).
- [ ] Реальні розміри touch-targets (C5); Dynamic Type на максимумі (C3).

---

## ✅ Що вже підтверджено як добре (не чіпати, не переаудитовувати)

- Compliance: privacy manifest повний (+ у всіх подів), без ATT/IDFA (`AnalyticsWithoutAdIdSupport`), реєстрація не примусова, in-app видалення акаунта (5.1.1(v)), Sign in with Apple (4.8 не тригериться), повне розкриття підписки 3.1.2 (ціна/тривалість/автопродовження/Restore/Terms/Privacy), `ITSAppUsesNonExemptEncryption=false`, без UIWebView, без dev-server URL, 4.2 ок (push, IAP, haptics, share).
- Інваріант premium (логін + entitlement) послідовний на boot/resume/paywall; логаут чистить локальний флаг і RC; account-scoped флаги чистяться на обох шляхах виходу (крім B7).
- 11/12 історичних баг-класів — чисто. Секретів у бандлі/git-історії немає. Console стрипається в проді, sourcemaps не шипляться.
- Перфоманс: lazy-роути, лінивий таро-JSON, таймаути+bounded retry всюди (крім B10), day-rollover продумано, повна вирва JS-помилок у Crashlytics.
- `npm test`: 250/250. i18n: 1313/1313 ключів без дрифту.

## 🚨 Підсумкові ризики відхилення (усі керовані)

| Guideline | Ризик | Закривається |
|-----------|-------|--------------|
| 3.1.1 Restore за логіном | Середній | A10 (reviewer note) + A8 |
| 3.1.2 ціна-заглушка | Середній | A8 (sandbox) |
| Метадані: вік/лейбли/копі | Середній | A10 |
| 2.5.4 background mode | Низький | C6 |
| Іконка з альфою | Низький | C14 |

**Вердикт: 🟡 Minor issues remain.** Закрий Блок A (11 пунктів) + девайс-пас D — і можна сабмітити. Блок B — перший тиждень після/паралельно. Блок C — планово.

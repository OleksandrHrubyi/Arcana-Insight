# Next session — продовжити звідси (станом на 2026-06-29)

> Контекст: завершили enterprise-аудит (`docs/enterprise-release-audit-2026-06-28.md`).
> 10/16 пунктів закрито в коді + запушено в `main`. Збірку релізу зроблено
> (`npm run build` + `npx cap sync ios` — OK, IDFA-фікс і WebP підтверджені в нативці).

---

## 🔴 СПОЧАТКУ — дрібне
- [ ] `git push` — є 1 локальний коміт (трекер), ще не запушений (`main` ahead 1).

## 📱 Xcode — архів і аплоуд
- [ ] Відкрити `ios/App/App.xcworkspace` (`npm run ios:open`)
- [ ] Перевірити: версія `1.0` / білд `14`, Team `5J6P4Q932X`, Signing
- [ ] Product → Archive → Distribute → App Store Connect → Upload
- [ ] Export compliance НЕ питатимуть (додали `ITSAppUsesNonExemptEncryption=false`)

## 🌐 GitHub Pages
- [ ] Передеплоїти `app-store/privacy-policy.html` + `support.html` (нова дата 28.06.2026)

## 🏪 App Store Connect (найбільший блок)
- [ ] Підписки `arcana.premium.monthly` / `yearly` → «Ready to Submit» + прикріпити до версії
- [ ] **Sandbox IAP runbook** (найвищий ризик reject 2.1/3.1.1): купівля / restore / cancel-to-period-end / restart-persistence / negative-restore
- [ ] Скріншоти (всі розміри)
- [ ] Форми App Privacy + Age Rating (звірити з `PrivacyInfo.xcprivacy`)
- [ ] Перевірити hosted Privacy/Support URL → 200
- [ ] Підтвердити `RC_ENFORCE_PREMIUM=true` у проді
- [ ] Review Notes (чернетка `APP_STORE_REVIEW_NOTES_DRAFT.md`)

---

## 🆕 НОВІ ЗАДАЧІ (знайдено 2026-06-29, по сторінці Сумісність)

### A) ✅ ЗРОБЛЕНО (2026-06-29, коміт b789513) — Сумісність тепер показує нижнє меню
- Прибрано беззумовне `setHideBottomNav(true)` + `onBeforeUnmount` + невикористаний імпорт; додано `+84px` нижній padding для кліренсу нав-бару (як у ZodiacGuide/CardLibrary).
- q-dialog шити (DOB/save) меню не ховали й не потребували body-класу.
- Перевірено: lint 0, build OK, 241 тестів. ⏳ Опційно: візуальна перевірка на пристрої/в браузері.
- ✅ **Бонус-фікс (коміт faf8366):** виявлено, що підсвічена вкладка не натискалась — `onClick` гардив на `current.value` (=route.meta.tab), тож на всіх menu-підсторінках тап Menu нічого не робив (пастка). Виправлено на `route.name`. Стосувалось compatibility/cards/zodiac/readings/settings/account/premium + horoscope/tarot підсторінок.

### B) Сумісність — уточнити, що таке «Weekly reminder»
- **Де:** `src/pages/CompatibilityPage.vue:102-112` — тогл `compat-reminder` (`reminderAvailable` / `reminderEnabled` / `toggleReminder`).
- **Копі (messages.bundle.js):** `compatibilityPage.reminderLabel: 'Weekly reminder'`, `reminderTitle: 'Relationship weather'`, `reminderBody: "How's your week with {name}? See this week's weather."`
- **Питання для уточнення:**
  1. Що `toggleReminder` реально робить — планує справжній push/local-notification щотижня, чи лише локальний прапорець? (перевірити, чи воно взагалі підключене до push-бекенду / `@capacitor/local-notifications`).
  2. Невідповідність: всюди в застосунку «**Daily** reminder», а тут «**Weekly** reminder» — це навмисно чи плутанина? Узгодити концепцію нагадувань.
  3. Чи відповідає це premium-матриці й контенту (`docs/premium-matrix.md`, `arcana-content-guardrails`)?

---

## ⏭️ Відкладено у v1.1 (не блокери)
- #3 серверний витік преміум-гороскопу (RPC+REVOKE, потребує деплою БД)
- #7 авторизація `register-device`
- #8 токени в Keychain замість UserDefaults
- #12 деривація Telegram-auth (узгодити з реальним потоком)
- Google-логін повернути для Android (з deep-link return)
- #4-хвіст: перенацілити ai-ops i18n-сканер на `messages.bundle.js` + видалити `en.json`/`uk.json`
- `supabase db pull` (потребує Docker) — версіонувати живі RLS-політики

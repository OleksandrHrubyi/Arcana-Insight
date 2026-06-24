# Release Action Plan — work top-down, tick as we go

> Working checklist distilled from `docs/pre-release-audit-2026-06-24.md`.
> Owner: 🤖 = assistant can do solo · 👤 = needs you (Apple/dashboard/device) · 🤝 = both.
> Status: `[ ]` todo · `[~]` in progress · `[x]` done.
> Rule: do them in order. Don't submit to App Store until every **P0** is `[x]`.

---

## 🔴 P0 — BLOCKING (must be done before submission)

- [x] **P0-1 · Crash reporting (Firebase Crashlytics)** — DONE & VERIFIED 2026-06-24
  Code + native integration (cap sync, pod) committed; **verified live on a real device** — forced crash captured & uploaded, appears in the Firebase console. WebView JS errors forward via `error-handler`. Observability gap closed. *(dSYM upload Run Script was removed because it broke the Debug build; crashes still report — dSYMs auto-upload with the App Store/TestFlight archive. Re-add the Run Script later only if you want symbolicated Debug-build crashes.)*
  <details><summary>original native steps (done)</summary>
  **Done (🤖, committed):** `@capacitor-firebase/crashlytics` installed; fail-safe `src/services/crashReporting.js`; `boot/error-handler.js` forwards Vue/unhandledrejection/window errors → `recordException` (so WebView JS errors are visible, not just native crashes). eslint/tests/build green.
  **Remaining (👤, can't be done from here — needs Xcode/Firebase console):**
  1. `npx cap sync ios` (installs the Crashlytics pod).
  2. In Xcode → App target → Build Phases → add a **Run Script** for Crashlytics dSYM upload: `"${PODS_ROOT}/FirebaseCrashlytics/run"` with Input Files `${DWARF_DSYM_FOLDER_PATH}/${DWARF_DSYM_FILE_NAME}/Contents/Resources/DWARF/${TARGET_NAME}` and `$(SRCROOT)/$(BUILT_PRODUCTS_DIR)/$(INFOPLIST_PATH)`. Set **Debug Information Format = DWARF with dSYM File** for Release.
  3. Firebase console → Crashlytics → enable (lights up after the first report).
  4. Build to a device, trigger a test crash (`FirebaseCrashlytics.crash()`), confirm it appears in the console.
  *(GoogleService-Info.plist already present ✅.)*
  </details>

- [x] **P0-2 · Paywall auto-renew disclosure** — 🤖 DONE 2026-06-24
  Footnote was incomplete (only the 24h-cancel line). Expanded (en+uk) to full Apple 3.1.2 disclosure: charged to Apple ID at purchase · auto-renews unless cancelled ≥24h before period end · charged within 24h before end · manage/cancel in App Store settings. Plan tiles already show title/period/price + per-month; Terms (EULA) + Privacy links present. Binary now meets 3.1.2. *(Also ensure the same subscription info + Terms/Privacy URLs are in the ASC listing metadata — part of P0-6/metadata.)*

- [ ] **P0-3 · Real-device QA pass** — 👤 (🤖 provides the script)
  Run the full §10 test plan on a real iPhone (release build): smoke flow + subscription (purchase / **restore / cancel / survives app-kill / restore-as-non-subscriber**) + auth + edge cases + airplane/slow network + push timing.

- [ ] **P0-4 · IAP sandbox runbook finished** — 👤
  Complete the remaining checks in `docs/release-reviewer/references/ios-sandbox-billing-runbook.md` (restore, cancel, restart-survival, negative restore) and record results. (Purchase already verified.)

- [ ] **P0-5 · Subscriptions "Ready to Submit"** — 👤
  In ASC, both products (`arcana.premium.monthly`, `arcana.premium.yearly`) → state **Ready to Submit** + attached to the app version.

- [ ] **P0-6 · ASC Age-Rating + App-Privacy forms** — 👤
  Fill both forms in App Store Connect to match `app-store/asc-age-rating-and-privacy.md` (Age 4+, 8 data types, Tracking = No).

- [x] **P0-7 · AppIcon has no alpha channel** — 🤖 DONE 2026-06-24
  Verified via `sips`: `AppIcon-512@2x.png` is 1024×1024, **hasAlpha: no**, 8-bit RGB. Apple-compliant (no transparency). ✅

---

## 🟠 P1 — SHOULD FIX BEFORE RELEASE

- [ ] **P1-1 · Rotate `RC_WEBHOOK_SECRET`** — 🤝
  Replace the temporary test secret with your own; set in Supabase secrets AND the RevenueCat dashboard webhook (must match).

- [ ] **P1-2 · Host + verify Support and Privacy URLs** — 👤
  Ensure `support.html` is live and the Privacy Policy URL loads; both must be reachable from App Store + in-app.

- [ ] **P1-3 · `supabase db pull`** — 👤 (needs Docker, can't run from here)
  Requires Docker Desktop running (shadow DB). With Docker up, run `supabase db pull` → it generates a migration capturing the dashboard-only tables (`app_users`, `tarot_readings`, `push_devices`). ~2 min once Docker is running.

- [~] **P1-4 · Smoke automation + healthcheck** — 🤖 smoke DONE; healthcheck = infra follow-up
  **Done:** `tests/visual/smoke.spec.js` — 4 robust assertions (home/horoscope show nav; premium/tarot hide nav). Run `npx playwright test smoke`. Catches the navigation regressions that escaped before.
  **Remaining (optional, infra):** scheduled live "AI tarot returns 200" healthcheck (would've caught the 503). Needs a runner + alert channel (GitHub Action cron / uptime monitor). For now failures surface via Crashlytics + Supabase logs + RevenueCat. Wire post-launch if you want proactive alerts.

- [x] **P1-5 · Remove dangling "rewards/points" copy** — 🤖 DONE 2026-06-24
  Audited: no dangling value-prop copy. Ritual tracking is background-only (harmless); "points" in PremiumInfo/TarotInterpretation are sales bullet-points (unrelated); the streak badge is independent retention and still works. Removed the now-orphan `nav.rewards` i18n key (en+uk).

- [ ] **P1-6 · Review + upload screenshots** — 👤
  Review `app-store/screenshots/` (6.5"/6.9"); optionally add captioned marketing frames; upload to ASC.

- [~] **P1-7 · Privacy Policy names all processors** — 🤖 edited; 👤 must re-publish
  `app-store/privacy-policy.html` §4 now lists Supabase, RevenueCat, Firebase, APNs, OpenAI, **OpenRouter**, **Open-Meteo**, Apple; OpenAI/OpenRouter row corrected to state the optional tarot question text is sent (matches the nutrition-label "Other User Content"). DOB already covered. **Remaining (👤):** re-publish the updated HTML to `oleksandrhrubyi.github.io/Arcana-Insight/privacy-policy.html` so the live policy reflects it.

---

## 🟡 P2 — AFTER RELEASE (v1.1 / v1.2)

- [ ] **P2-1** Refactor God-components (TarotOraclePage 3287, LandingScene 3084, HoroscopeComponent 2859, CompatibilityPage 2586).
- [ ] **P2-2** Full accessibility pass: Dynamic Type, contrast tuning, VoiceOver polish.
- [ ] **P2-3** Tarot journal / patterns (LR-23, deferred).
- [ ] **P2-4** Web push (desktop notifications).
- [ ] **P2-5** Marketing-grade ASO screenshots + localized keyword optimization.
- [ ] **P2-6** Move premium gating literals into runtime `PREMIUM_MODEL_LIMITS`.
- [ ] **P2-7** On-device performance profiling (astronomy-engine main-thread calc, GSAP screens) → optimize if janky.

---

## Progress log
- 2026-06-24 — Plan created from the 15-role pre-release audit. Starting P0-1.

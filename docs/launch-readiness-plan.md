# Arcana Insight — App Store Launch Readiness Plan

> **Living tracker.** Source of truth for getting to a clean App Store submission.
> Created from a deep 5-dimension audit (iOS-native, ASO/compliance, Product/UX, Monetization, Backend/code-health) on **2026-06-16**.
> Pairs with: `docs/screen-status.md`, `docs/release-reviewer/references/launch-checklist.md`, `docs/release-reviewer/references/ios-sandbox-billing-report.md`.

## Current status
- **Readiness: 74 / 100.** Verdict: **B — Release After Fixes** (not architectural; ~1 week of focused work).
- **Biggest reject risk:** Apple tests the in-app purchase during review and IAP is unverified.
- **Target submission:** ~10–14 calendar days from 2026-06-16 (dev + sandbox + screenshots + ASC product approval). In-Store ~2–2.5 weeks.
- **2026-06 follow-up pass (post-plan, merged to `main` + deployed):** full tarot deep-audit (security: `tarot-reading` now auth-required; reliability; analytics funnel), tarot "real-session" depth (explained/theme-matched positions, woven AI narrative, adaptive clarifying question), oracle-dialogue redesign, a **unified app-wide button system** (`.arcana-btn` tokens), and a multi-agent **bug-hunt** (edge security hardening, billing/auth premium-leak fixes, error-leak removal). 7 edge functions deployed; **AI tarot verified live end-to-end**. Tests 194→**221**. This raised code-health/stability/UX but **does not change the submission gate** — remaining blockers are Apple-operational (LR-12/13/14/16 + LR-11 URL check), all yours.

### Launch Readiness Scorecard (1–10)
| Product | UX | UI | Stability | Performance | Security | Monetization | ASO | Compliance |
|---|---|---|---|---|---|---|---|---|
| 8 | 6 | 8 | 5 | 7 | 8 | 7 | 4 | 5 |

## How to use this doc
- Work top-down by section: **P0 (blockers) → Apple operational → P1 → P2.**
- Each item has a stable ID (`LR-NN`), severity, files/evidence, the fix, how to verify, effort, and a status box.
- Update the **Status** field as you go: `[ ] TODO` → `[~] IN PROGRESS` → `[x] DONE (date + commit)`.
- After any code change: `npm test` (221 baseline) + `npx eslint -c ./eslint.config.js <file>`; for UI use the Playwright QA screenshots (`npx playwright test --project=iphone-14 --update-snapshots`, QA route `/?qa=home`).
- Log each day in the **Daily Progress Log** at the bottom.
- Effort key: **S** <2h · **M** half-day · **L** 1–2 days.

---

## P0 — BLOCKERS (must fix before submission)

### Backend reliability

#### LR-01 · `generate-horoscopes`: add provider fallback + content-safety guard — 🔴 · M
- **Status:** [x] DONE — 2026-06-16 (commit pending push)
- **Done:** Added `callOpenRouterJson` + `callModelJson` (try OpenAI → OpenRouter → `AI_UNAVAILABLE`); both generation and translation now route through it. Added `containsDisallowed()` and a pre-upsert filter that drops any unsafe `sign:theme` (logs + reports `dropped`); empty-after-filter returns 502. Verified structurally (no local Deno) + `npm test` 194/194.
- **Note (calibration):** the guard is intentionally LESS strict than `tarot-reading`'s — horoscopes are longer/conversational, so it only catches hard fatalism / medical / financial-instruction patterns (EN+UK), NOT bare `will`/`should`, to avoid nuking legitimate copy.
- **⚠️ Operational:** fallback only works if **`OPENROUTER_API_KEY`** (+ optional `OPENROUTER_MODEL/URL`) is set in Supabase secrets for this function. Confirm before relying on it.
- **File:** `supabase/functions/generate-horoscopes/index.ts`
- **Problem:** Single-provider (OpenAI `/v1/responses` only). No OpenAI→OpenRouter fallback, no server-side `containsDisallowed()` guard. If OpenAI is down/rate-limited, the **daily horoscope cron for all 12 signs fails** → stale/empty horoscopes for everyone. Unsafe AI text (predictive/medical/advice) can ship unfiltered.
- **Fix:** Mirror `supabase/functions/tarot-reading/index.ts`: wrap OpenAI in try/catch, add OpenRouter fallback (`OPENROUTER_*` env), collect `providerErrors`, and run a `containsDisallowed()` regex guard (EN+UK future/directive/medical patterns) before persisting to `zodiac_texts`. Skip/flag a sign rather than writing bad text.
- **Verify:** Force-fail OpenAI (bad key) and confirm OpenRouter path; feed a banned phrase and confirm rejection. Follow `.claude/skills/arcana-edge-functions/SKILL.md`.

#### LR-02 · `personal-horoscope`: fallback + guard + CORS/OPTIONS + timeout + stop error leak — 🔴 · M
- **Status:** [x] DONE — 2026-06-16 (commit pending push)
- **Done:** Added CORS const + `json()` helper (CORS on every response), OPTIONS handler, POST method guard (405). Split the OpenAI call into `requestReadingOpenAI`/`requestReadingOpenRouter` behind a fallback orchestrator (OpenAI → OpenRouter → `AI_UNAVAILABLE`), each via `fetchWithTimeout` (`OPENAI_TIMEOUT_MS`, default 60s). Added `containsDisallowed()` guard on the final reading. **Stopped the raw-error leak:** catch now logs the reason server-side and returns a structured `{ code: AI_UNAVAILABLE|server_error, error: <generic> }` (503/500) — no provider internals. 401/400/200 all go through `json()`. Verified: symbols, braces 133=133, `npm test` 194/194.
- **⚠️ Operational:** same as LR-01 — needs `OPENROUTER_API_KEY` in Supabase secrets for the fallback.
- **File:** `supabase/functions/personal-horoscope/index.ts`
- **Problem:** Single-provider OpenAI, no fallback, no content guard, **no CORS/OPTIONS handler, no method guard, no fetch timeout**. The 500 catch returns `String(e?.message)` which includes the **raw OpenAI error body** to the client (line ~204→312).
- **Fix:** Add the standard CORS const + OPTIONS + method(405) + body(400) guards (per skill). Add OpenRouter fallback + `containsDisallowed`. Add fetch timeout (see LR-03). Return a structured `{ error, code, reason }` (e.g. `AI_UNAVAILABLE`) — never the raw provider body.
- **Verify:** OPTIONS returns CORS; OpenAI-fail → OpenRouter; error response contains no provider internals; client (`PersonalHoroscopePage.vue:320`) still shows its localized message.

#### LR-03 · Shared fetch-timeout helper for all edge functions — 🔴 · S/M
- **Status:** [x] DONE — 2026-06-16 (commit pending push)
- **Done:** `_shared/ritual.ts` now has `fetchWithTimeout` (10s) used in `restRequest` + `rpcRequest` → covers all `ritual-*` functions. `tarot-reading` got its own `fetchWithTimeout` (`AI_TIMEOUT_MS`, 60s) on both provider fetches. `personal-horoscope` (LR-02) and `generate-horoscopes` (pre-existing) already have timeouts. **`push-worker` timeouts are folded into LR-10** (editing it there anyway for the secret + per-send catch). Verified: no bare `await fetch(` left outside the helpers, braces balanced, `npm test` 194/194.
- **Files:** `supabase/functions/_shared/ritual.ts` (add helper) + apply in `personal-horoscope`, `tarot-reading`, `push-worker`, `ritual-*`.
- **Problem:** Deno `fetch` has no default timeout → any stalled provider/Supabase connection can **hang indefinitely** (worst on the crons).
- **Fix:** Add `fetchWithTimeout(url, opts, ms=10000)` using `AbortSignal.timeout(ms)`; replace bare `fetch` calls to providers/Supabase REST. Only `generate-horoscopes` currently has any timeout.
- **Verify:** Point a call at a non-responsive endpoint → fails fast with a clear reason, not a hang.

#### LR-10 · `push-worker`: require `ADMIN_PUSH_SECRET` + per-send try/catch — 🔴 · M
- **Status:** [x] DONE — 2026-06-16 (commit pending push)
- **Done:** (1) **Auth now required** — if `ADMIN_PUSH_SECRET` is unset the worker returns 500 ("Server misconfigured") instead of running open; the `x-push-secret` header must match. (2) **Per-send try/catch** in `sendApns` map — a network error/timeout on one device now returns a `network_error` failure result instead of rejecting `Promise.all` and aborting the whole 50-device batch. (3) **Timeout** — added `fetchWithTimeout` (10s) on the APNs send + all 4 Supabase REST calls (this also completes the push-worker part of LR-03). Verified: only bare fetch is inside the helper, braces 150=150, `npm test` 194/194.
- **⚠️ Operational:** set `ADMIN_PUSH_SECRET` in Supabase secrets, and ensure the cron/caller sends the `x-push-secret` header — otherwise the worker now refuses to run.
- **File:** `supabase/functions/push-worker/index.ts`
- **Problem:** APNs sends use `Promise.all` with no per-fetch catch → one network rejection aborts a 50-device batch. Auth is gated **only** by `ADMIN_PUSH_SECRET`; **if that env var is unset, the worker is fully unauthenticated** (anyone can trigger a push blast).
- **Fix:** Hard-fail (401/500) if `ADMIN_PUSH_SECRET` is missing. Wrap each APNs send in try/catch (use `Promise.allSettled`) so one failure doesn't kill the batch; log per-device failures.
- **Verify:** Unset secret → request rejected. Simulate one bad token → rest of batch still delivers.

### Frontend stability

#### LR-04 · Horoscope: error + retry state (kill the infinite skeleton) — 🔴 · S
- **Status:** [x] DONE — 2026-06-16 (commit pending push)
- **Done:** Added `horoscopeLoadError` flag; `refreshHoroscopesForDay` sets it on failure **only when there's no cached content** for the current theme (otherwise fails silently and keeps content). Added `retryHoroscopes()` (`forceNetwork: true`). Template: each of the 3 theme panels now renders a `v-else-if="horoscopeLoadError"` error block (message + Retry button) ahead of the skeleton, so it can no longer loop forever. New i18n `common.loadError` + `common.retry` (en+uk) + `.horoscope-error*` CSS. Verified: eslint 0, i18n parity 0, `npm test` 194/194.
- **Note:** error-state can't be screenshotted in QA (no dev hook to force a load failure on `/horoscope`); change is additive + lint-parsed.
- **File:** `src/components/main/HoroscopeComponent.vue:712-718` (`refreshHoroscopesForDay`)
- **Problem:** On fetch failure (offline/Supabase down) it only `console.warn`s, leaving `horoscope = {}` → **permanent skeleton loader, no message, no retry**. This is a PRIMARY value screen — worst in-app failure mode.
- **Fix:** Track an error/empty state; render a visible message + "Retry" button that re-calls the loader. Distinguish loading vs error vs empty.
- **Verify:** Offline → see error + retry (not endless skeleton); retry recovers when back online.

#### LR-05 · Global error safety net (`errorHandler` + `unhandledrejection`) — 🔴 · S
- **Status:** [x] DONE — 2026-06-16 (commit pending push)
- **Done:** New boot file `src/boot/error-handler.js` (registered FIRST in `quasar.config.js` boot array so it catches errors during other boots' init). Sets `app.config.errorHandler` (Vue component errors), and `window` listeners for `unhandledrejection` (logged + `preventDefault()` to mark handled) and `error` (uncaught runtime). All tagged (`[vue-error]`/`[unhandledrejection]`/`[window-error]`). eslint 0, `npm test` 194/194.
- **Future (P2):** could forward these to analytics for crash visibility — left out to avoid boot-time coupling.
- **Files:** app bootstrap (e.g. `src/App.vue` / a boot file). No `app.config.errorHandler` or `window.onunhandledrejection` exists repo-wide.
- **Problem:** Any unhandled rejection → silent broken state, no logging, no recovery.
- **Fix:** Add `app.config.errorHandler` (log + optional analytics) and a `window.addEventListener('unhandledrejection', …)` that logs and fails gracefully.
- **Verify:** Throw an unhandled rejection in dev → caught + logged, app stays usable.

#### LR-06 · `MyDayPage`: guard onMounted + pull-to-refresh (offline hang) — 🔴/🟠 · S
- **Status:** [x] DONE (resolved by deletion) — 2026-06-16 (commit pending push)
- **Finding:** `MyDayPage.vue` was **dead code** — the `/my-day` route redirects to `arcana` (home) (`routes.js:18`), nothing imports it, and `openMyDay()` navigates to `name: 'daily'` (DailyCardPage). The flagged offline-hang could never occur because the component never mounts.
- **Done:** Deleted `src/pages/MyDayPage.vue` (with user permission) after a full-repo usage check (zero references). Removes the bug surface entirely + clears a chunk of dead code. `npm test` 194/194.
- **File:** `src/pages/MyDayPage.vue:661-678`
- **Problem:** `onMounted` awaits `loadDailyCard()` + `refreshMyDayState({includeRemote:true})` unguarded; `loadHoroscopeRegistry` throws on network error → unhandled rejection, `ready` never set (screen stuck loading), and focus/visibilitychange listeners (676-677) never register. `onPullRefresh` (661-665) unguarded → **pull-to-refresh spinner hangs forever offline** (`done()` never called).
- **Fix:** try/catch around the async work; always set `ready`; always call `done()` in `onPullRefresh` (finally). Register listeners regardless.
- **Verify:** Offline cold-load → screen settles (not stuck); pull-to-refresh offline → spinner stops.

#### LR-09 · Premium entitlement refresh on app resume — 🟠 · S
- **Status:** [x] DONE — 2026-06-16 (commit pending push)
- **Done:** `src/boot/auth.ts` now imports `getBillingPremiumStatus` + `usePremiumAccess` and adds `syncPremiumOnResume()` (same logic as `App.vue`'s launch sync: apply `{ active: hasPremium, plan, source: 'billing' }` when `status.ok && status.available`). Called via `runAuthTask('syncPremium(appState)', …)` in the resume (`isActive`) branch — already native-only. Premium state no longer goes stale after a background expire/renew/cancel. Tests 194/194 (premium UI-sync contracts preserved).
- **File:** `src/boot/auth.ts:38-51` (the `appStateChange` / `isActive` branch)
- **Problem:** Resume refreshes the Supabase session but **not** premium. If a sub expires/cancels/renews while backgrounded, premium state is stale until next cold start (fails sandbox runbook Test 5/7 intent).
- **Fix:** In the `isActive` branch, call `getBillingPremiumStatus()` + `applyPremiumAccessStatus(...)`.
- **Verify:** Sandbox: let entitlement change in background → resume reflects it.

### iOS / native (block upload or validation)

#### LR-07 · AppIcon set + `armv7`→`arm64` — 🔴 · S
- **Status:** [x] DONE — 2026-06-16 (commit pending push)
- **Done (armv7→arm64):** `ios/App/App/Info.plist` `UIRequiredDeviceCapabilities` changed `armv7` → `arm64` (real fix — armv7 is 32-bit, invalid on the iOS-14 64-bit-only target).
- **AppIcon — false alarm, no change needed:** verified the icon is actually valid. It's a single 1024×1024 "single-size" app icon (`idiom: universal, platform: ios`), which **Xcode 14+ supports** and Capacitor produces by default. The PNG checks out: **1024×1024, no alpha channel, 8-bit RGB** — exactly what Apple requires. The audit's "malformed" concern was based on the older multi-size requirement; it does not apply. (No `assets/` source + capacitor-assets not installed, so regeneration was neither possible nor warranted.)
- **⚠️ Operational:** archive the build with a recent Xcode (14+) so it expands the single-size icon to all required renditions for App Store Connect.
- **Files:** `ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json` (only one 1024 universal image — malformed); `ios/App/App/Info.plist:40-43` (`UIRequiredDeviceCapabilities → armv7`).
- **Problem:** Single-image appiconset risks "Missing app icon" upload rejection. `armv7` (32-bit) on an iOS-14 (64-bit-only) target is contradictory → "invalid bundle/unsupported architecture" risk.
- **Fix:** Run `npm run ios:assets` (capacitor-assets) to regenerate the full icon set. Change `armv7` → `arm64` in Info.plist.
- **Verify:** Xcode archive validates without icon/architecture warnings.

#### LR-08 · Populate `PrivacyInfo.xcprivacy` — 🟠 · S/M
- **Status:** [x] DONE — 2026-06-16 (commit pending push)
- **Done:** Filled `ios/App/App/PrivacyInfo.xcprivacy` (validated with `plutil -lint: OK`):
  - `NSPrivacyAccessedAPITypes` → **UserDefaults `CA92.1`** (Capacitor Preferences) — the key fix to avoid ITMS-91053.
  - `NSPrivacyCollectedDataTypes` → Email, Other (DOB), User ID, Product Interaction, Purchase History — all `Linked: true`, `Tracking: false`, with App-Functionality/Analytics purposes. Matches `app-store/privacy-policy.html`.
  - `NSPrivacyTracking false` + empty `NSPrivacyTrackingDomains` (no IDFA / cross-app tracking).
- **Note:** keep this consistent with the App Store Connect App Privacy questionnaire (LR-16). Third-party SDKs (Firebase, RevenueCat) ship their own manifests, so this declares the app's own collection + required-reason API.
- **Related follow-up (P2):** `GoogleService-Info.plist` has `IS_ANALYTICS_ENABLED=false` while code calls `setEnabled(true)` — reconcile the analytics posture deliberately (Agent-1 finding #5). Not a submission blocker.
- **File:** `ios/App/App/PrivacyInfo.xcprivacy` (currently `NSPrivacyTracking=false`, empty `NSPrivacyCollectedDataTypes`, empty `NSPrivacyAccessedAPITypes`).
- **Problem:** App runs Firebase Analytics (`src/services/analytics.js:45,92,97` — `setUserId`/`setUserProperty`) and uses Capacitor Preferences (UserDefaults, required-reason API `CA92.1`). Empty manifest contradicts bundled SDKs → privacy reject / ITMS-91053.
- **Fix:** Declare `NSPrivacyAccessedAPITypes` with UserDefaults reason `CA92.1`; declare collected data types (analytics/identifiers). Decide tracking posture: keep `NSPrivacyTracking=false` only if Firebase is configured with **no IDFA** (avoid `GoogleAppMeasurementIdentitySupport`). Note `GoogleService-Info.plist` has `IS_ANALYTICS_ENABLED=false` conflicting with runtime `setEnabled(true)` — reconcile.
- **Verify:** Archive has no privacy-manifest warnings; App Privacy answers (LR-16) match this file + the policy.

### Apple operational (P0 — external/process, gate submission)

#### LR-12 · Run real-device iOS sandbox IAP flow + fill report — 🔴 · M
- **Status:** [ ] TODO
- **Files:** `docs/release-reviewer/references/ios-sandbox-billing-report.md` (all checks `pending`); runbook `docs/release-reviewer/references/ios-sandbox-billing-runbook.md`.
- **Problem:** Apple tests IAP during review. Catalog load / purchase / restore / cancel / entitlement-survives-restart / negative-restore all unrun. Highest reject probability.
- **Fix:** On a real device with a sandbox account, run the runbook; record pass/fail per check. Confirm prod `VITE_RC_IOS_API_KEY` in the release env.
- **Verify:** Report filled, all checks pass.

#### LR-13 · App Store Connect: create/approve subscriptions + RC offering — 🔴 · S/M (+Apple time)
- **Status:** [ ] TODO (external)
- **Evidence:** Product IDs `arcana.premium.monthly` / `arcana.premium.yearly`, entitlement `premium` (`src/constants/premiumBilling.js:1-11`).
- **Fix:** In ASC create both auto-renewable subscriptions (localized name, price, review screenshot), attach to the first build submission. In RevenueCat: "current" offering must expose both packages with the `premium` entitlement attached.
- **Verify:** Products "Ready to Submit"; RC offering returns both packages on device (ties to LR-12).

#### LR-14 · Produce App Store screenshots — 🟡 · M (raw set generated; review + upload = yours)
- **Status:** [~] RAW SET GENERATED — 2026-06-23. Tooling committed; PNGs on disk; upload + optional polish = yours.
- **Done:** `tests/visual/appstore-shots.spec.js` generates filled-content screenshots → `app-store/screenshots/<size>/` at exact Apple dims: **6.9″ 1320×2868** and **6.5″ 1242×2688**. 5 screens captured with real content (no placeholders): `1-home` (streak + astro strip + card of the day), `2-tarot` (oracle scene), `3-horoscope` (full Capricorn/Energy reading), `4-compatibility`, `5-premium`. Regenerate anytime: `npx playwright test tests/visual/appstore-shots.spec.js --project=iphone-14`.
- **⚠️ Yours:** review the 10 PNGs, optionally add marketing captions/frames, then upload in App Store Connect. (Raw device screenshots are Apple-valid as-is.)
- **Evidence:** `launch-checklist.md` line ~109 still open; metadata plans 5 screens.
- **Verify:** Screenshot set uploaded in ASC.

#### LR-11 · Privacy/Terms: contact link + 3rd-party processors + EULA terms + live URL — ✅ DONE
- **Status:** [x] DONE — code 2026-06-16; **hosted URLs verified 200 on 2026-06-23** (privacy-policy.html + support.html both live).
- **Done (in-app `PrivacyTermsComponent`):**
  - Contact dead-end fixed → working **`mailto:ghrubyi@ukr.net`** link.
  - Third-party **processors disclosed** (OpenAI/OpenRouter, Supabase, RevenueCat, Firebase) via `policyPage.privacyProcessors` + a "Full Privacy Policy" link to the hosted page.
  - **Subscription EULA terms** added (`policyPage.termsSubscription`: auto-renew, billing period, cancel ≥24h, manage in App Store) + a "Terms of Use (EULA)" link to Apple's standard EULA.
  - Bonus: `onBack` now uses history-or-home fallback (same fix as DailyCard).
  - i18n en+uk parity 0, eslint 0, tests 194/194.
- **Verified:** hosted `app-store/privacy-policy.html` already lists Supabase/RevenueCat/Firebase/OpenAI processors (§4) — the gap was only in-app.
- **⚠️ Ops (yours):** confirm the GitHub Pages URLs resolve at submission — `https://oleksandrhrubyi.github.io/Arcana-Insight/privacy-policy.html` + `support.html` (a 404 = instant 5.1.1 reject). Optionally add OpenRouter to the hosted policy's §4 (OpenAI is listed; OpenRouter is just the fallback).
- **Files:** `PrivacyTermsComponent.vue`, i18n `policyPage` (`messages.bundle.js` ~line 1758), `app-store/privacy-policy.html`, `app-store/support.html`.
- **Problems:** (1) Contact section says "contact support" with **no email/link** (dead-end) — FAQ page has a working `mailto:`, mirror it. (2) In-app **Terms** is 3 generic sentences — for auto-renew subs Apple 3.1.2 wants title/length, **price per period**, auto-renewal terms + link to a functional Terms of Use/EULA. (3) Policy should disclose third-party processors actually used: **OpenAI, RevenueCat, Firebase, Supabase**. (4) Confirm hosted Privacy + Terms URLs (GitHub Pages) resolve at submission — a 404 = instant 5.1.1 reject.
- **Verify:** Contact tappable; Terms states subscription terms or links to live EULA; processors listed; URLs return 200.

---

## P1 — SHOULD HAVE (strongly recommended before/at launch)

#### LR-15 · Monetization analytics lifecycle events — 🟠 · M
- **Status:** [x] DONE — 2026-06-16 (commit pending push)
- **Reassessment:** the **paywall funnel was already fully instrumented** (`PAYWALL_FUNNEL_EVENTS` emitted in `PremiumInfoComponent`: `paywall_view/close`, `purchase_click/success/error`, `restore_success`, `trial_start`). The audit overstated this gap. Trial-converted/churn come from RevenueCat webhooks, not the app. Install/First-Open are Firebase auto-events.
- **Done (the genuine gaps):** added `RETENTION_EVENTS` (`daily_active`, `ritual_complete`). `ritual_complete` fires from `markDailyActivity` on the **first completion of each activity per day** (`{ activity }`); `daily_active` fires once/day from `App.vue` startup. Engagement depth + DAU are now measurable for retention cohorts.
- **Note:** `markDailyActivity` uses a **dynamic** `import('../services/analytics.js')` (fire-and-forget, caught) to keep the Firebase/Capacitor deps out of the helper's static graph — it's unit-tested under `node --test`. Relative imports need the explicit `.js` ext for node ESM (Vite accepts it too). Tests 194/194, eslint 0.
- **Files:** `src/constants/analyticsEvents.js`, `src/services/analytics.js`, purchase paths.
- **Have:** `ONBOARDING_EVENTS`, `PAYWALL_ENTRY_POINTS`. **Missing:** `purchase_success/fail/restore`, `subscription_started`, (later `trial_started/converted`), `ritual_complete`, `daily_active`. Without these you can't measure conversion/retention.
- **Fix:** Add events; emit at purchase success/fail/restore in `premiumBilling`/`PremiumInfoComponent`, and on ritual completion. Retention/churn derive from Firebase + RevenueCat webhooks.

#### LR-16 · Age rating decision + App Privacy questionnaire mapping — 🟠 · S
- **Status:** [ ] TODO
- **Problem:** Metadata sets 4+ for a fortune-telling app (often lands 12+ under reviewer discretion). App Privacy "nutrition label" has no recorded data-type → answer mapping.
- **Fix:** Consciously pick the age rating; answer the questionnaire honestly. Map: Email + DOB = "linked to you"; Firebase = Usage Data (analytics); RevenueCat = Purchases. Keep consistent with `PrivacyInfo.xcprivacy` (LR-08) and the policy.

#### LR-17 · Saved Readings: distinguish fetch-error from empty + surface delete failure — 🟡 · S
- **Status:** [x] DONE — 2026-06-16 (commit pending push)
- **Done:** The core helper already returns `status: 'error'`; the component now uses it. Added `loadError` ref (set from `snapshot.error`, reset on locked/success, true on crash) + a `retryLoad`. Template shows a dedicated error+retry block (reusing `common.loadError`/`common.retry`) **before** the empty state, so a fetch failure no longer reads as "no readings yet". Delete failure now surfaces a `$q.notify` toast (`errors.generic`) on both the error result and the catch (Notify plugin already enabled). eslint 0, tests 194/194.
- **Files:** `src/helpers/savedReadingsCore.js:38-47` (error → `[]`, indistinguishable from genuine empty); `SavedReadingsPage.vue:340-345` (delete failure silent).
- **Fix:** Return an error status separate from empty; show a retry; toast/inline on delete failure.

#### LR-18 · Ritual Rewards: error/retry on authed dashboard + i18n keys — 🟡 · M
- **Status:** [x] ROBUSTNESS DONE — 2026-06-16 (commit pending push). i18n migration split out → P2 (LR-24).
- **Done:** `refreshRemoteDashboard` now returns a success boolean and catches errors; on a logged-in sync failure `onMounted` surfaces a non-blocking `$q.notify` **warning toast with a Retry action** (`notifyDashboardSyncFailed`) instead of silently falling back to local points. The 30s ticker now starts in a `finally` so a failed/throwing load can't leave timed unlocks frozen. eslint 0, tests 194/194.
- **Deferred (P2):** the **32 inline `locale === 'uk' ? … : …` ternaries** in this file are pure polish (they render correctly in both languages) and a large mechanical refactor (~64 i18n keys). Tracked under LR-24; better as its own focused task, not a launch blocker.
- **File:** `src/pages/RitualRewardsPage.vue:251-277`
- **Problem:** Authed dashboard fetch-failure silently falls back to local points (no error/retry). Pervasive hardcoded `uk?:en` ternaries instead of i18n keys; `pts` unit not localized. Also `tickTimer` setInterval sits after the guarded block → won't start if load throws.
- **Fix:** Add error/retry UI; move inline strings to i18n; start the timer regardless of load outcome.

#### LR-19 · Onboarding: Capacitor Preferences + birth-date capture — 🟡 · S/M
- **Status:** [x] DONE — 2026-06-16 (commit pending push)
- **Completion-flag persistence (the eviction risk):** kept localStorage as the fast **sync** hot-path (the router guard reads it synchronously), and added a **durable native Preferences backup**. `persistOnboardingPreferences` now also writes to native (`writeOnboardingToNative`). `hydrateOnboardingFromNative` (cached) restores localStorage from native if the WebView evicted it; the router guard `await`s it (cached → only the first nav pays a native read). Both native ops are guarded by a sync `window.Capacitor?.isNativePlatform()` check (no static `@capacitor/*` import) + dynamic `import('@capacitor/preferences')` — so the unit-tested helper stays node-safe. eslint 0, tests 194/194.
- **Birth date — confirmed no change needed:** DOB is captured in sign-up / Account (and `PersonalHoroscopePage` shows a no-DOB empty state with a CTA to `/account` or `/sign-up`). Onboarding is intentionally light (interests only); not gating it on DOB is the correct design.
- **File:** `src/components/main/OnboardingComponent.vue`
- **Problem:** Completion flag in `localStorage` (iOS eviction risk) not Capacitor Preferences. Captures interests only — **no birth date** (needed for personal horoscope); confirm where DOB is captured (sign-up/account) and that the path is obvious.
- **Fix:** Move completion to `@capacitor/preferences`; ensure a clear DOB capture path early.

#### LR-20 · Account: email affordance — 🟡 · S
- **Status:** [x] DONE — 2026-06-16 (commit pending push)
- **Done:** The read-only email row now shows a small hint under the value — `accountPage.emailNote` ("Your email is tied to your sign-in and can't be changed here." / uk) — so it reads as intentional instead of a silent dead-end next to the editable Name/DOB rows. New `.account-row__hint` style; i18n en+uk parity 0; eslint 0; tests 194/194. (Chose the note over building email-change, which is a larger feature.)
- **File:** `src/pages/AccountPage.vue:41-46` (email is a read-only `<div>`, no cue)
- **Fix:** Either allow email change or add a short note "email is tied to your sign-in" so it isn't a silent dead-end.

---

## P2 — COULD HAVE (post-launch / future versions)

#### LR-21 · Free trial (3–7 days) — High revenue impact · M
- **Status:** [x] CODE DONE — 2026-06-16 (commit pending push). Trial **creation** is an App Store Connect task (yours).
- **Found:** the paywall already extracts/displays/tracks intro offers (`getPlanOfferLabel` → `plan-tile__saving`, `trial_start` analytics, `has_offer`). The only code gap was that a free trial's intro phase is reported as `priceString "$0.00"`, so it rendered as "$0.00".
- **Done:** added `extractFreeTrial` in `premiumBilling.js` (detects intro price 0, derives trial length in days from the period) → new `freeTrial` field on each plan. `getPlanOfferLabel` now renders a human label — `premiumPage.billing.freeTrialDays` ("{days}-day free trial" / uk) or `freeTrial` ("Free trial" / "Безкоштовний період") — instead of "$0.00". `trial_start` detection still matches (free/trial/безкошт). Updated the billing-service test for the new plan shape. eslint 0, parity 0, tests 194/194.
- **⚠️ Ops (yours):** create the **introductory free-trial offer** (3–7 days) on both subscription products in App Store Connect and attach it to the RevenueCat offering — without that there is no trial to show. Then `trial_converted`/churn come from RevenueCat webhooks.

#### LR-22 · Retention loop on home (continue-state) + personal daily push — M
- **Status:** [x] DONE — 2026-06-16 (commit pending push). Design agreed with user (adaptive daily-track + light sign-aware push).
- **Part A — home continue-state (frontend):** the `daily-track` chip already showed progress + tapped to the next incomplete ritual; now when the loop is **complete** it reads "Revisit your readings" (`landing.progress.revisit`, en+uk) with a chevron and `openNextRitual` already routes to `/readings` — closing the loop into the journal instead of dead-ending. No new layout block (kept the tight hero safe). Verified via QA screenshot (no regression). The complete-state visual needs a device check (QA can't seed all-3-done).
- **Part B — light sign-aware push (backend):** `push-worker` now resolves a zodiac sign per device (best-effort `push_devices.user_id` → `app_users.zodiac_sign`, both column-optional with graceful fallback) and personalizes the notification **title** with the localized sign name (`ZODIAC_NAMES` en/uk) — e.g. "Virgo"/"Діва" instead of "Arcana". Buckets are now `env__locale__sign`; devices with no sign get the existing generic message (zero regression). braces balanced, tests 194/194, eslint 0.
- **Note:** sign-aware push only personalizes for signed-in users whose `zodiac_sign` is set; anonymous/no-sign devices stay generic. Verify on device once `user_id` column + signs are populated.

#### LR-23 · Tarot journal with patterns (Labyrinthos-style) — M
- **Status:** [ ] DEFERRED (post-launch) — decided 2026-06-16. Lowest-priority "could have"; **notes** need a new `note` DB column (Supabase migration), and the **weekly pattern** has marginal value until users have a real reading history. LR-22 already links "revisit your readings" → `/readings`. Revisit post-launch once there's data.
- Notes per reading + simple weekly pattern in `SavedReadingsPage` (don't add a new screen).

#### LR-24 · Tech debt — S each
- **Status:** [~] PARTIAL — 2026-06-16. Done the safe, release-relevant items; rest is backlog.
- **Done:** Removed the one ungated debug `console.log` (`supabaseClient.ts` session-refresh success) — the rest were already DEV/DEBUG-gated (audit overcounted). Deleted two confirmed-dead duplicates (with permission): `ios/App/App/config 2.xml` and `src/data/cardsV1/tarot_full.json` (399K; `cardsV1` unreferenced, active data is `cardsV2`). tests 194/194.
- **Remaining backlog (lower value / higher risk, post-launch):**
- `netStatus.js` is dead (no real offline detection) — wire `@capacitor/network`/`navigator.onLine` or delete.
- `PREMIUM_MODEL_LIMITS` (`premiumModel.js:89-95`) is dead config; gating uses inline literals — wire constants or annotate (docs point to it as source of truth → drift risk).
- `ritual-track` non-atomic point award → make transactional (mirror `ritual-claim`'s single RPC).
- `delete-account` partial-deletion → retry/queue orphaned rows.
- ~~Strip debug console.log/info~~ — DONE (was already gated; 1 ungated line removed).
- ~~Remove stray dup files (config 2.xml, cardsV1/tarot_full.json)~~ — DONE. (Note: `src/data/cardsV1/tarot_meta.json` still present — was out of the approved deletion scope; verify unused and remove later.)
- RitualRewards: migrate the 32 inline `locale === 'uk' ? … : …` ternaries to i18n keys (from LR-18; ~64 keys, mechanical, pure polish).
- Normalized per-period price on paywall ("$X/month").
- Guest purchase before login can orphan entitlement — gate purchase behind auth OR verify RC alias transfer in sandbox Test 4.
- Refactor giant components (TarotOraclePage 3185, LandingScene 3085) — maintainability only.
- **(2026-06 bug-hunt) PersonalHoroscope AI fn is ungated** — free users can call `personal-horoscope` (gpt-4o-mini) unlimited. Decide free vs premium; add server-side rate-limit/entitlement check either way.
- **(2026-06 bug-hunt) billing `configure_failed` latch** (`premiumBilling.js`) — intentional + tested (won't re-call `Purchases.configure()` after a failure). Review whether a transient failure should be retryable instead of latched for the session.
- **(2026-06) dead/orphaned edge fns** `horoscope` (reads stale `zodiac_texts`) + `tarot-draw` — not called by the client (client reads the `horoscopes` table directly / draws locally). Optional: delete both.
- **(2026-06) RitualRewards 32 `uk?:en` ternaries** still pending (the 2026-06 i18n sweep covered tarot screens only).

---

## Manual QA checklist (run on real device before submit)
- [ ] Purchase monthly + yearly (sandbox) → premium unlocks
- [ ] Restore purchases (fresh install) → premium returns
- [ ] Cancel → premium persists until period end, then revokes
- [ ] Entitlement survives app restart AND background→resume (LR-09)
- [ ] Negative restore (no purchase) → no unlock, correct message
- [ ] Guest purchase → sign in → entitlement follows (LR + RC alias)
- [ ] Offline: home, horoscope (LR-04), tarot, my-day (LR-06) → graceful, no hang
- [ ] AI failure (kill key): tarot + horoscope → fallback/error, recoverable
- [ ] Push: permission grant/deny, token registration, receive a test push
- [ ] Apple Sign In + Google sign in + sign out + delete account
- [ ] All bottom-sheet close buttons tappable (post pointer-events fix)
- [ ] Privacy + Terms URLs resolve (LR-11)

## ASO assets (for ASC)
- **Title (≤30):** `Arcana: Tarot & Horoscope`
- **Subtitle (≤30):** `Daily card & zodiac ritual`
- **Keywords (≤100):** `tarot,horoscope,astrology,zodiac,daily card,moon phase,compatibility,birth chart,oracle,reading`
- **Description hook:** grounded daily ritual (card + horoscope + compatibility + history/streaks); premium = unlimited + Love/Career themes + full compatibility + history. Keep the "for reflection and entertainment — does not predict the future" disclaimer line.
- Avoid: superlatives, "free", future-prediction claims.

---

## Daily Progress Log
> Append one line per work session: date — items moved — commit(s).

- 2026-06-16 — Plan created from deep audit. Baseline: 194/194 tests, readiness 74%. Earlier today: fixed bottom-sheet pointer-events bug across all dialogs (commits `6808838`, `43e47a1`); home screen finished + haptics/close-button/back-nav (`e5f0bc6`).
- 2026-06-16 — **LR-01 done**: OpenRouter fallback + horoscope-calibrated content guard in `generate-horoscopes`. Tests 194/194. Next: LR-02 (`personal-horoscope`). Reminder: set `OPENROUTER_API_KEY` secret.
- 2026-06-16 — **LR-02 done**: `personal-horoscope` — CORS/OPTIONS/405, OpenAI→OpenRouter fallback, `fetchWithTimeout`, content guard, and structured non-leaking errors. Tests 194/194. (Side effect: this function now has a fetch timeout, partially covering LR-03; `push-worker`/`ritual-*`/`tarot-reading` timeouts still pending in LR-03.) Next: LR-03 or LR-04.
- 2026-06-16 — **LR-04 done**: Horoscope error+retry state (kills the infinite skeleton); `common.loadError`/`common.retry` i18n. eslint 0, parity 0, tests 194/194. Next: LR-05 (global error handler) or LR-03.
- 2026-06-16 — **LR-05 done**: global error safety net boot file (`errorHandler` + `unhandledrejection` + `error` listeners), registered first. eslint 0, tests 194/194. Next: LR-06 (MyDayPage offline guard) or LR-03.
- 2026-06-16 — **LR-06 done (by deletion)**: `MyDayPage.vue` was dead (route redirects, no imports) → deleted with permission; offline-hang surface gone. tests 194/194. Next: LR-03 or LR-09/LR-10.
- 2026-06-16 — **LR-03 done**: `fetchWithTimeout` in `_shared/ritual.ts` (covers all ritual-*) + `tarot-reading`; personal-horoscope/generate-horoscopes already had timeouts. push-worker timeout deferred to LR-10. tests 194/194. Next: LR-09 or LR-10.
- 2026-06-16 — **LR-09 done**: resume-time premium entitlement refresh in `boot/auth.ts` (`syncPremiumOnResume`). tests 194/194. Next: LR-10 (push-worker secret + per-send catch + timeout) — last P0-code item before iOS-native LR-07/08.
- 2026-06-16 — **LR-10 done**: push-worker now requires `ADMIN_PUSH_SECRET`, per-send try/catch (one bad send no longer aborts the batch), and fetch timeouts on APNs + REST (completes LR-03 too). tests 194/194. **All P0 CODE items are now done** — remaining P0 is iOS-native (LR-07/08, needs Xcode) + Apple operational (LR-11..14). Ops reminders: set `OPENROUTER_API_KEY` + `ADMIN_PUSH_SECRET` secrets.
- 2026-06-16 — **LR-07 done**: Info.plist `armv7→arm64`; AppIcon verified valid (single-size 1024, no alpha, RGB) — the "malformed" concern was a false alarm (Xcode 14+ single-size format). tests 194/194. Next: LR-08 (privacy manifest).
- 2026-06-16 — **LR-08 done**: populated `PrivacyInfo.xcprivacy` (UserDefaults CA92.1 + collected data types, validated `plutil OK`). **All P0 code + iOS-native items are now done.** Remaining P0 is purely Apple operational (LR-11..14: legal URL/EULA, sandbox IAP, ASC products, screenshots) — needs you. Plus P1/P2 polish.
- 2026-06-16 — **LR-11 code done**: in-app Privacy/Terms now has a working contact mailto, third-party processor disclosure + Privacy Policy link, subscription EULA terms + Apple EULA link; `onBack` home-fallback. Hosted policy already lists processors. parity 0, eslint 0, tests 194/194. Remaining LR-11 = verify hosted URLs live (ops). Next pure-ops: LR-12 (sandbox IAP), LR-13 (ASC products), LR-14 (screenshots) — all need you.
- 2026-06-16 — **LR-15 done (P1)**: paywall funnel was already fully instrumented; added the genuine gaps — `ritual_complete` (per-activity, first-of-day, in `markDailyActivity`) + `daily_active` (once/day, App.vue). Dynamic analytics import keeps the tested helper's static graph clean. tests 194/194, eslint 0. Next P1: LR-17 (SavedReadings error state) / LR-18 / LR-20.
- 2026-06-16 — **LR-17 done (P1)**: SavedReadings now shows error+retry on fetch failure (was masked as empty) and a toast on delete failure. eslint 0, tests 194/194. Next P1: LR-18 (RitualRewards) / LR-20 (Account email affordance).
- 2026-06-16 — **LR-18 robustness done (P1)**: RitualRewards dashboard sync failure now surfaces a retry toast (was silent) + ticker starts in finally. The 32-ternary i18n migration deferred to P2 (LR-24). eslint 0, tests 194/194. Next P1: LR-20 (Account email affordance) / LR-19 (Onboarding).
- 2026-06-16 — **LR-20 done (P1)**: Account email row now has an explanatory hint (no longer a silent dead-end). parity 0, eslint 0, tests 194/194. Remaining P1: LR-19 (Onboarding Preferences + DOB capture).
- 2026-06-16 — **LR-19 done (P1)**: onboarding completion flag now has a durable native Preferences backup + guard-side hydration (localStorage stays the sync hot-path); native ops are platform-guarded so the node-tested helper is safe. DOB capture confirmed (signup/account). eslint 0, tests 194/194. **ALL P1 code items done.** Remaining: P2 polish + Apple operational (LR-12/13/14/16) — yours.
- 2026-06-16 — **LR-21 code done (P2)**: free-trial display — paywall already tracked/displayed intro offers; added `extractFreeTrial` + human "{days}-day free trial" label (was rendering "$0.00"). The trial itself must be created in App Store Connect. eslint 0, parity 0, tests 194/194.
- 2026-06-16 — **LR-22 done (P2)**: retention loop — (A) daily-track complete-state now reads "Revisit your readings" → /readings (journal); (B) push-worker is sign-aware (personalized title, best-effort + graceful fallback). Design agreed first. tests 194/194, eslint 0, home screenshot OK.
- 2026-06-16 — **Bugfix (hidden bottom-nav stole taps)**: on nav-hidden routes (`/daily`, `/tarot`, `/tarot-interpretation`, `/tarot/:id`) the `.bottom-nav-wrap--hidden` was `opacity:0 + pointer-events:none`, but the inner `.nav-tab` buttons re-enable `pointer-events:auto`, so the invisible nav (z-index 9999) still intercepted taps over page content (e.g. the Daily "Close" button). Fixed by adding `visibility:hidden` to `--hidden` (cascades, can't be overridden by a child's pointer-events). Verified via Playwright `elementFromPoint`. tests 194/194.
- 2026-06-16 — **LR-23 deferred** (post-launch: notes need a DB column, pattern is marginal without data). **LR-24 partial**: removed the one ungated debug log + deleted 2 dead dup files (config 2.xml, cardsV1/tarot_full.json) with permission; rest is post-launch backlog. tests 194/194. **All planned code work is now done or consciously deferred** — remaining is your Apple operational (LR-12/13/14/16) + secrets.
- 2026-06-19..23 — **Tarot deep-audit + real-session + button-system + bug-hunt** (outside the LR plan; merged to `main`, deployed). Tarot: `tarot-reading` auth-required (verify_jwt + internal check, `SUPABASE_*` env), client AI timeout 65s, DB-save premium-gated, woven-narrative prompt, **adaptive clarifying question** (`mode:'clarify'`), explained + theme-matched spread positions (`tarotSpreads`), intro-once-per-session, oracle-dialogue redesign, full mid-funnel analytics (`TAROT_SESSION_EVENTS`), i18n sweep (tarot screens), removed dead i18n namespace + orphaned `TarotResult`. **Unified button system** (`.arcana-btn`/`--primary`/`--secondary` tokens in `app.scss`) rolled out across ~20 files. **Multi-agent bug-hunt fixes:** edge `send-broadcast` auth required, timing-safe `telegram-auth`, stopped raw error-body leakage (4 fns); billing `freeTrial` carried + tightened entitlement match; auth premium-revoke on logout/delete/`SIGNED_OUT` + double-submit guards; tarot save-content, retriable tarot-data cache, i18n localStorage guard, ascendant `hour===24`, horoscope theme-lock guard; repaired button-migration border regressions + tarot i18n `ui` fallback. **Deployed all 7 edge functions**; **smoke-tested premium AI tarot end-to-end live** (real user → openai/gpt-4o-mini woven reading + clarify → cleaned up). Tests **221/221**. Branch `tarot-deep-audit` merged + deleted. New backlog/decisions logged under LR-24.

# Arcana Insight — App Store Launch Readiness Plan

> **Living tracker.** Source of truth for getting to a clean App Store submission.
> Created from a deep 5-dimension audit (iOS-native, ASO/compliance, Product/UX, Monetization, Backend/code-health) on **2026-06-16**.
> Pairs with: `docs/screen-status.md`, `docs/release-reviewer/references/launch-checklist.md`, `docs/release-reviewer/references/ios-sandbox-billing-report.md`.

## Current status
- **Readiness: 74 / 100.** Verdict: **B — Release After Fixes** (not architectural; ~1 week of focused work).
- **Biggest reject risk:** Apple tests the in-app purchase during review and IAP is unverified.
- **Target submission:** ~10–14 calendar days from 2026-06-16 (dev + sandbox + screenshots + ASC product approval). In-Store ~2–2.5 weeks.

### Launch Readiness Scorecard (1–10)
| Product | UX | UI | Stability | Performance | Security | Monetization | ASO | Compliance |
|---|---|---|---|---|---|---|---|---|
| 8 | 6 | 8 | 5 | 7 | 8 | 7 | 4 | 5 |

## How to use this doc
- Work top-down by section: **P0 (blockers) → Apple operational → P1 → P2.**
- Each item has a stable ID (`LR-NN`), severity, files/evidence, the fix, how to verify, effort, and a status box.
- Update the **Status** field as you go: `[ ] TODO` → `[~] IN PROGRESS` → `[x] DONE (date + commit)`.
- After any code change: `npm test` (194 baseline) + `npx eslint -c ./eslint.config.js <file>`; for UI use the Playwright QA screenshots (`npx playwright test --project=iphone-14 --update-snapshots`, QA route `/?qa=home`).
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
- **Status:** [ ] TODO
- **Files:** `supabase/functions/_shared/ritual.ts` (add helper) + apply in `personal-horoscope`, `tarot-reading`, `push-worker`, `ritual-*`.
- **Problem:** Deno `fetch` has no default timeout → any stalled provider/Supabase connection can **hang indefinitely** (worst on the crons).
- **Fix:** Add `fetchWithTimeout(url, opts, ms=10000)` using `AbortSignal.timeout(ms)`; replace bare `fetch` calls to providers/Supabase REST. Only `generate-horoscopes` currently has any timeout.
- **Verify:** Point a call at a non-responsive endpoint → fails fast with a clear reason, not a hang.

#### LR-10 · `push-worker`: require `ADMIN_PUSH_SECRET` + per-send try/catch — 🔴 · M
- **Status:** [ ] TODO
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
- **Status:** [ ] TODO
- **File:** `src/pages/MyDayPage.vue:661-678`
- **Problem:** `onMounted` awaits `loadDailyCard()` + `refreshMyDayState({includeRemote:true})` unguarded; `loadHoroscopeRegistry` throws on network error → unhandled rejection, `ready` never set (screen stuck loading), and focus/visibilitychange listeners (676-677) never register. `onPullRefresh` (661-665) unguarded → **pull-to-refresh spinner hangs forever offline** (`done()` never called).
- **Fix:** try/catch around the async work; always set `ready`; always call `done()` in `onPullRefresh` (finally). Register listeners regardless.
- **Verify:** Offline cold-load → screen settles (not stuck); pull-to-refresh offline → spinner stops.

#### LR-09 · Premium entitlement refresh on app resume — 🟠 · S
- **Status:** [ ] TODO
- **File:** `src/boot/auth.ts:38-51` (the `appStateChange` / `isActive` branch)
- **Problem:** Resume refreshes the Supabase session but **not** premium. If a sub expires/cancels/renews while backgrounded, premium state is stale until next cold start (fails sandbox runbook Test 5/7 intent).
- **Fix:** In the `isActive` branch, call `getBillingPremiumStatus()` + `applyPremiumAccessStatus(...)`.
- **Verify:** Sandbox: let entitlement change in background → resume reflects it.

### iOS / native (block upload or validation)

#### LR-07 · AppIcon set + `armv7`→`arm64` — 🔴 · S
- **Status:** [ ] TODO
- **Files:** `ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json` (only one 1024 universal image — malformed); `ios/App/App/Info.plist:40-43` (`UIRequiredDeviceCapabilities → armv7`).
- **Problem:** Single-image appiconset risks "Missing app icon" upload rejection. `armv7` (32-bit) on an iOS-14 (64-bit-only) target is contradictory → "invalid bundle/unsupported architecture" risk.
- **Fix:** Run `npm run ios:assets` (capacitor-assets) to regenerate the full icon set. Change `armv7` → `arm64` in Info.plist.
- **Verify:** Xcode archive validates without icon/architecture warnings.

#### LR-08 · Populate `PrivacyInfo.xcprivacy` — 🟠 · S/M
- **Status:** [ ] TODO
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

#### LR-14 · Produce App Store screenshots — 🔴 · M
- **Status:** [ ] TODO
- **Evidence:** `launch-checklist.md` line ~109 still open; metadata plans 5 screens, none captured.
- **Fix:** Capture filled-content screenshots for required device sizes (6.9″ + 6.5″ iPhone). Can reuse the Playwright QA harness / real device. No placeholders.
- **Verify:** Screenshot set uploaded in ASC.

#### LR-11 · Privacy/Terms: contact link + 3rd-party processors + EULA terms + live URL — 🔴 · M
- **Status:** [ ] TODO
- **Files:** `PrivacyTermsComponent.vue`, i18n `policyPage` (`messages.bundle.js` ~line 1758), `app-store/privacy-policy.html`, `app-store/support.html`.
- **Problems:** (1) Contact section says "contact support" with **no email/link** (dead-end) — FAQ page has a working `mailto:`, mirror it. (2) In-app **Terms** is 3 generic sentences — for auto-renew subs Apple 3.1.2 wants title/length, **price per period**, auto-renewal terms + link to a functional Terms of Use/EULA. (3) Policy should disclose third-party processors actually used: **OpenAI, RevenueCat, Firebase, Supabase**. (4) Confirm hosted Privacy + Terms URLs (GitHub Pages) resolve at submission — a 404 = instant 5.1.1 reject.
- **Verify:** Contact tappable; Terms states subscription terms or links to live EULA; processors listed; URLs return 200.

---

## P1 — SHOULD HAVE (strongly recommended before/at launch)

#### LR-15 · Monetization analytics lifecycle events — 🟠 · M
- **Status:** [ ] TODO
- **Files:** `src/constants/analyticsEvents.js`, `src/services/analytics.js`, purchase paths.
- **Have:** `ONBOARDING_EVENTS`, `PAYWALL_ENTRY_POINTS`. **Missing:** `purchase_success/fail/restore`, `subscription_started`, (later `trial_started/converted`), `ritual_complete`, `daily_active`. Without these you can't measure conversion/retention.
- **Fix:** Add events; emit at purchase success/fail/restore in `premiumBilling`/`PremiumInfoComponent`, and on ritual completion. Retention/churn derive from Firebase + RevenueCat webhooks.

#### LR-16 · Age rating decision + App Privacy questionnaire mapping — 🟠 · S
- **Status:** [ ] TODO
- **Problem:** Metadata sets 4+ for a fortune-telling app (often lands 12+ under reviewer discretion). App Privacy "nutrition label" has no recorded data-type → answer mapping.
- **Fix:** Consciously pick the age rating; answer the questionnaire honestly. Map: Email + DOB = "linked to you"; Firebase = Usage Data (analytics); RevenueCat = Purchases. Keep consistent with `PrivacyInfo.xcprivacy` (LR-08) and the policy.

#### LR-17 · Saved Readings: distinguish fetch-error from empty + surface delete failure — 🟡 · S
- **Status:** [ ] TODO
- **Files:** `src/helpers/savedReadingsCore.js:38-47` (error → `[]`, indistinguishable from genuine empty); `SavedReadingsPage.vue:340-345` (delete failure silent).
- **Fix:** Return an error status separate from empty; show a retry; toast/inline on delete failure.

#### LR-18 · Ritual Rewards: error/retry on authed dashboard + i18n keys — 🟡 · M
- **Status:** [ ] TODO
- **File:** `src/pages/RitualRewardsPage.vue:251-277`
- **Problem:** Authed dashboard fetch-failure silently falls back to local points (no error/retry). Pervasive hardcoded `uk?:en` ternaries instead of i18n keys; `pts` unit not localized. Also `tickTimer` setInterval sits after the guarded block → won't start if load throws.
- **Fix:** Add error/retry UI; move inline strings to i18n; start the timer regardless of load outcome.

#### LR-19 · Onboarding: Capacitor Preferences + birth-date capture — 🟡 · S/M
- **Status:** [ ] TODO
- **File:** `src/components/main/OnboardingComponent.vue`
- **Problem:** Completion flag in `localStorage` (iOS eviction risk) not Capacitor Preferences. Captures interests only — **no birth date** (needed for personal horoscope); confirm where DOB is captured (sign-up/account) and that the path is obvious.
- **Fix:** Move completion to `@capacitor/preferences`; ensure a clear DOB capture path early.

#### LR-20 · Account: email affordance — 🟡 · S
- **Status:** [ ] TODO
- **File:** `src/pages/AccountPage.vue:41-46` (email is a read-only `<div>`, no cue)
- **Fix:** Either allow email change or add a short note "email is tied to your sign-in" so it isn't a silent dead-end.

---

## P2 — COULD HAVE (post-launch / future versions)

#### LR-21 · Free trial (3–7 days) — High revenue impact · M
- Biggest conversion lever for this category. Add trial to the offering + paywall copy + `trial_started/converted` analytics.

#### LR-22 · Retention loop on home (continue-state) + personal daily push — M
- Tie saved readings + mood + streak into a visible "continue where you left off". Make daily push personal: "{sign}, your card today is {card}" (grounded tone). Push-worker already exists.

#### LR-23 · Tarot journal with patterns (Labyrinthos-style) — M
- Notes per reading + simple weekly pattern in `SavedReadingsPage` (don't add a new screen).

#### LR-24 · Tech debt — S each
- `netStatus.js` is dead (no real offline detection) — wire `@capacitor/network`/`navigator.onLine` or delete.
- `PREMIUM_MODEL_LIMITS` (`premiumModel.js:89-95`) is dead config; gating uses inline literals — wire constants or annotate (docs point to it as source of truth → drift risk).
- `ritual-track` non-atomic point award → make transactional (mirror `ritual-claim`'s single RPC).
- `delete-account` partial-deletion → retry/queue orphaned rows.
- Strip ~13 debug `console.log/info` from `src/` (the 86 `error`/59 `warn` are legit). Edge functions: confirm tagged `[fn-name]` prefix.
- Remove stray dup files: `ios/App/App/config 2.xml` (tracked), `src/data/cardsV1/tarot_full.json` (392K dup; active is `src/data/cardsV2/tarot_full.json`).
- Normalized per-period price on paywall ("$X/month").
- Guest purchase before login can orphan entitlement — gate purchase behind auth OR verify RC alias transfer in sandbox Test 4.
- Refactor giant components (TarotOraclePage 3185, LandingScene 3085) — maintainability only.

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

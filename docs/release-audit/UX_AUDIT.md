# Stage 2 — UX Audit & Full Screen/State Map

Date: 2026-07-01 · **[code]** = verified by reading · **[device]** = needs a real run.
Method: 6 read-only surface agents traced the auth × premium × entry-point matrix
(state → tap → what happens → why wrong → file:line). Consolidated below.

---

## A. Screen / dialog / state inventory (23 routes)

| # | Route | Screen | Key states | Bottom-nav |
|---|-------|--------|-----------|-----------|
| 1 | `/` | Home (GetStarted → LandingScene) | cold-start, reveal, no-sign, offline (astro strip silent-hides) | shown |
| 2 | `login` | Login (email OTP + Apple) | input, invalid, 429, offline, redirect | hidden |
| 3 | `sign-up` | Sign-up | input, invalid, success→OTP | hidden |
| 4 | `confirm-code` | OTP confirm | input, wrong/expired, resend | hidden |
| 5 | `reset-password` | Reset password | input, invalid-link, sent | hidden |
| 6 | `horoscope` | Daily horoscope (energy/love/career) | out/free/premium, no-sign, offline, load-error, empty, loading | shown |
| 7 | `personal-horoscope` | Personal AI horoscope | not-premium lock, no-DOB, loading, error, reading | hidden |
| 8 | `tarot` | Tarot oracle (stage machine) | intro/theme/…/ready/started, daily_spent, offline, mid-gen | hidden |
| 9 | `tarot-interpretation` | Reading result | reading, free-gift, gift-signin, aha-upsell, empty | hidden |
| 10 | `menu` | Menu | out/free/premium | shown |
| 11 | `daily` | Daily card | loading, error+retry, ready | hidden |
| 12 | `support` | FAQ / support | static | shown (menu tab) |
| 13 | `privacy-terms` | Privacy & Terms | static + links | shown (menu tab) |
| 14 | `onboarding` | Onboarding (interests + language) | first-run | hidden |
| 15 | `cards` | Card library | filter, search, skeleton, empty, error+retry, detail dialog | shown |
| 16 | `zodiac-guide` | Zodiac guide | static, favorites, expand, share | shown |
| 17 | `compatibility` | Compatibility | input, result, out/free/premium, no-sel, offline, error, empty, loading | shown |
| 18 | `readings` | Saved readings | gated, error+retry, empty, list, delete | shown |
| 19 | `premium` | Paywall | out/free/premium, trial | hidden |
| 20 | `rewards` | Ritual rewards | **redirects → menu** (parked, REWARDS_ENABLED=false) | — |
| 21 | `settings` | Settings | language/time/notifications/account/sign-out sheets | shown |
| 22 | `account` | Account (requiresAuth) | edit name/DOB, email note, delete-account | shown |
| 23 | `*` | 404 NotFound | catch-all | — |

**Bottom sheets / dialogs across app:** tarot actions-wheel + card-preview; compatibility DOB-wheel + save-sheet + delete-confirm; settings language/time wheels; astro sheet; card-library detail; premium (full screen). All custom (non-QCard) sheets set `pointer-events:auto` (q-dialog trap fix verified).

---

## B. Consolidated UX / correctness findings (surfaces audited so far)

Severity: **BLOCKER** none found · **SHOULD-FIX** ship-quality · **NICE** polish.

### Tarot [code]
- **T1 · SHOULD** Reward-spread gate bypass after failed token consume — `touchDeck` clears `pendingSpreadRewardKey`, returns with `stage=ready`/`selectedSpread=3`; next deck tap draws the 3/5 spread **free**, no token spent. `TarotOraclePage.vue:1654-1671`.
- **T2 · SHOULD** Deck-tap re-entrancy (rapid double-tap) — no top-level lock; `isDeckHotspotActive` cleared only after awaits → second tap double-marks daily / double-consumes token / double-reveals. Needs an `isChoiceTransitioning`-style guard. `:1624-1689`.
- **T3 · SHOULD** Free-AI "sign in for a free full reading" promise can break — signing in with an account that already spent its `ai_free_grants` → server `premium_required` → falls back to basic. Unfulfilled explicit promise. `:2071-2075`.
- **T4 · SHOULD** No entertainment/reflection disclaimer on tarot (oracle + interpretation). Disclaimer copy exists (`messages.bundle.js:1361`) but is wired only to Compatibility.
- **T5 · NICE** Empty interpretation page (reload/deep-link, no sessionStorage) still shows an inert Share button. `TarotInterpretationPage.vue:286`.
- **T6 · NICE** Free daily marked at draw-start not at result — kill-app between deck-tap and reveal spends the day's free reading. `:1655`.
- **T7 · NICE** `tarot-draw` edge fn is dead (client draws locally, divergent prob/deck) — delete.

### Paywall / billing [code]
- **B1 · SHOULD** Silent-charge path: StoreKit succeeds but `resolvePremiumStatus` finds no entitlement (product/entitlement-id mismatch vs RC dashboard) → user sees generic "Purchase failed", no premium, **but Apple charged**. Add "tap Restore/contact support" messaging + a startup assertion that RC ids resolve. `premiumBilling.js:358`, `PremiumInfoComponent.vue:562`.
- **B2 · SHOULD** Revoke-on-403 sync thrash — Compatibility/Personal `revokePremiumAccess()` on server 403; resume re-grants from RC; next call 403s again if client/server ever disagree. Add reconciliation/backoff. `CompatibilityPage.vue:911`, `PersonalHoroscopePage.vue:348`.
- **B3 · NICE** Discounted (non-free) intro offers show only raw `offerLabel` — verify Apple intro-offer disclosure (duration + then-price).
- **B4 · NICE** `pricePending` leaves Buy CTA enabled with no price → tap fails `product_unavailable`; disable CTA when price empty.
- **PASS** money-in-no-access (billing gated behind `ensureSignedInForBilling`), sign-in redirect, auto-bounce loop, cross-account flag leak, Restore, auto-renew/EULA disclosure — all verified good.

### Horoscope / astro [code]
- **H1 · SHOULD** **LR-26 premium `detailed` leak at source** — `horoscopes` read ships premium love/career text to non-entitled clients (client strips before cache/DOM, but plaintext is on the wire). Server entitlement-aware read still open. `supabaseNativeCore.js:264`.
- **H2 · SHOULD** No disclaimer on Horoscope / Personal / Zodiac Guide (only Compatibility has it). Reuse `messages.bundle.js:1361`.
- **H3 · SHOULD** Personal: switching app language calls `generate()` directly (skips cache) → a full model call + 30s spinner per language toggle. `PersonalHoroscopePage.vue:420`.
- **H4 · NICE** 401 (guest w/ stale premium flag) on Personal not special-cased → generic error, retry re-POSTs into 401.
- **H5 · NICE** No "drag to change sign" affordance on the horoscope wheel [device].
- **PASS** locked-theme tap → paywall (not inert), no auto-bounce, LR-04 infinite-skeleton fixed, server content-safety strong.

### Compatibility [code]
- **C1 · SHOULD** Reminder permission-denied / schedule-failure is silent — toggle doesn't move, no toast. `CompatibilityPage.vue:1269`.
- **C2 · SHOULD** Weekly reminder names `connections[0]` (newest save), but list is shown ranked by score → notification names the "wrong" person. `:1233` vs display `:1215`.
- **C3 · SHOULD** Logged-out/401 AI path → generic error + retry that re-fails (only 403 reconciled, not 401). `:907-915`.
- **C4 · NICE** `openConnection` overwrites partner state before confirm; dismiss backdrop → partner card silently changed. `:954-967`.
- **C5 · NICE** Free users see every locked dimension's numeric score + bar (only the paragraph is gated) — confirm teaser exposure is intended. `:252-257`.
- **C6 · NICE** No same-person / A==B guard → inflated self-match.
- **C7 · NICE** AI compatibility cache is global by sign-pair+type+locale → "personal reading" is shared across all same-sign couples (framing overstated).
- **PASS** bottom-nav visibility fixed, no mixed-language leftovers, prediction-copy guardrails, offline resilience, stale-response guards, delete/reminder sync.

### Auth / Account / Data [code]
- **A1 · SHOULD** Account-scoped PII leaks across accounts (bug-class 8) — `clearAccountScopedLocalState` clears profile/free-tarot/free-AI keys but **not** `arcana_compatibility_connections_v1` (global `_v1`), which holds **other people's names + birth dates + cities**. User A logs out → B logs in on same device → B sees A's saved connections. Also survives logout: reward-inventory cache, streak/journey keys. `authStoreCore.js:11-19`. Privacy + App-Store data-handling concern.
- **A2 · SHOULD** Reset-password is a dead/orphaned flow — login/sign-up are passwordless OTP; **no "Forgot password" entry point anywhere** (grep = 0). `ResetPasswordPage` + `updateUserPasswordNative` reachable only via a Supabase recovery deep-link the app never sends. Wire it or remove. `ResetPasswordPage.vue`, `routes.js:29`.
- **A3 · NICE** 429 on the *initial* OTP send is not mapped to `tooManyAttempts` (falls to `errors.generic`) on Login + Sign-up; ConfirmEmailCode maps it correctly — inconsistent. `LoginView.vue:269`, `SignUpScene.vue:171`.
- **A4 · NICE** Apple profile upsert is awaited in Sign-up but fire-and-forget in Login → a failed upsert is silent on login (name may not persist). `LoginView.vue:205`.
- **A5 · NICE** Offline profile edit reports success (queued + non-throwing flush) — no data loss but no "pending/offline" cue. `AccountPage.vue:641`.
- **PASS** sign-in redirect threading (bug-class 4 resolved), open-redirect hardening, no-user⇒no-premium, **Delete Account present & actually deletes** (cascade, 5.1.1(v)), Sign in with Apple offered, full localized error/empty/loading states, double-submit guards.

### Navigation / Onboarding / Home / Shell / Global states [code]
- **N1 · SHOULD** Home is stale after midnight / long-background resume — `LandingScene` has **no** `appStateChange`/`visibilitychange` listener; greeting/date/streak/daily-progress recompute only on mount. `MenuComponent` *does* listen — inconsistent. `LandingScene.vue:689`.
- **N2 · SHOULD** Deep-link / push intent dropped through onboarding — fresh install + deeplink to `/tarot-interpretation`, `/compatibility`, `/premium`, `/cards` → onboarding gate → non-whitelisted target → user replaced to **home**, losing the target. Hurts push conversion. `guard.js:11`, `onboardingRouteTarget.js:12`.
- **N3 · SHOULD** 404 unreachable for not-onboarded users — `catchAll` has no `allowWithoutOnboarding` → a bad URL sends a fresh user to onboarding, never the 404. `routes.js:41`.
- **N4 · SHOULD** Onboarding Continue vs Skip are functionally identical (both persist + complete; Continue enabled with 0 interests) → two primary-looking CTAs do the same thing. Require ≥1 for Continue, or collapse to one CTA + subtle skip. `OnboardingComponent.vue:273,289,299`.
- **N5 · SHOULD [device]** Launch-flash color mismatch — `capacitor.config.json #0a0a0f` vs statusbar `#0b0d16` vs web `#050d15/#0a2233` vs onboarding `#06111a`; and `src-capacitor/capacitor.config.json` has **no** `backgroundColor` — confirm which config the iOS build consumes (white-flash risk if the empty one).
- **N6 · SHOULD [device]** No offline state anywhere — no `@capacitor/network` in the shell; airplane-mode cold start silently drops the astro strip and per-page fetches fail with no app-level banner. Apple tests airplane mode.
- **N7 · NICE** Silent home content failure — `loadLandingContent` only `console.warn`s; astro failure empties the strip with no cue. `LandingScene.vue:1366`.
- **N8 · NICE** Orphan `/settings` route + duplicate Settings surface — Settings render **embedded** in Menu; the standalone `/settings` route is linked from no menu item, has **no back button** in its template, highlights no tab. `MenuComponent.vue:220`, `SettingsComponent.vue`.
- **N9 · NICE** `MainLayout.vue` is orphaned (not routed; would double-render nav). CLAUDE.md's "LandingScene у MainLayout" is inaccurate — app uses BlankLayout.
- **N10 · NICE** Duplicated markup — Settings template twice (embedded vs page); onboarding re-implements the whole language wheel instead of reusing SettingsComponent. Drift risk.
- **N11 · NICE** No real light mode — `boot/theme.js` honors `ai_theme='light'` but no toggle sets it and all backgrounds are hardcoded dark → light mode would break contrast. Effectively always dark.
- **PASS** hidden bottom-nav tap-theft (visibility:hidden fix verified), no raw i18n keys, push permission requested **contextually** (only on enabling Daily Push — good for Apple), resume premium re-sync, history-or-home back-nav on Support/Privacy.
- **Reconciliation note:** N5/ATT flagged "PrivacyInfo.xcprivacy not found" — but per launch-plan **LR-08 it IS populated** (UserDefaults CA92.1 + collected data types + Device ID + Other User Content, `plutil -lint OK`). The agent lacked that context. Manifest is in place; still verify it matches the ASC App-Privacy answers (LR-16).

---

## C. Cross-cutting UX themes (so far)
1. **Disclaimer coverage gap** — a "for reflection, not prediction" line exists but is wired only to Compatibility; tarot + horoscope + personal + zodiac lack it (T4, H2). Single highest-leverage compliance+trust fix.
2. **401 vs 403 handling** — several AI surfaces reconcile only the premium 403, not a stale-flag 401 → generic-error retry loops (H4, C3). A shared "auth-expired → re-auth" handler would close all of them.
3. **Silent failures on secondary actions** — reminder toggle (C1), some retries. Every async needs visible success/empty/error/retry.
4. **Server-side premium content leak (LR-26)** — the one item that is both a trust and a mild compliance concern; mitigated on device only.

## D. User flow map (happy paths)
- **First run:** onboarding (interests + language) → home → daily ritual (card / horoscope / tarot). No DOB gate (correct — DOB captured later in sign-up/account).
- **Tarot:** home/tab → oracle → theme → question → spread → draw → reveal → interpretation → (save=premium / upsell).
- **Premium:** any lock → `/premium` (never auto-redirect) → sign-in gate if logged-out → purchase → entitlement applied → back.
- **Auth:** gated action → `/login?redirect=…` → OTP/Apple → back to origin.

*(Flow map completes with the nav agent's onboarding/routing detail.)*

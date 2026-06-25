# Overnight QA Report — Arcana Insight

**Date:** 2026-06-25
**Audience:** Solo owner, first-thing-in-the-morning triage before App Store submission.

**Verdict:** **Submission-ready from a stability standpoint — 0 blockers, no crashes, no functional dead-ends on the core happy path.** The single biggest risk is **premium-content / entitlement leakage at the data layer** (premium horoscope text shipped to free clients; paywall mount granting premium to logged-out users) — none of it is reviewer-visible, but it erodes monetization integrity and should be closed before or immediately after launch. The Playwright net is fully green.

> NOTE ON THIS FILE: the orchestrator passed the output path as the literal string `undefined` (a script-templating bug). This report was written to `docs/overnight-qa-report-2026-06-25.md` to match the existing `pre-release-audit-*.md` convention. Same templating bug hit the Playwright base URL — the baseline agent correctly recovered by pointing at the already-running dev server on `127.0.0.1:9010`.

---

## 1. Summary

| Category | Count |
|---|---|
| BLOCKER | **0** |
| SHOULD-FIX | **28** |
| NICE | **27** |
| **Total confirmed findings** | **55** |
| Disputed (1 confirming vote, kept for transparency) | 6 of the above |
| Dropped / refuted | 11 |

**Playwright baseline:** ✅ **24/24 passed, 0 failed.**
- Functional (`flows` + `smoke`, iphone-14 + iphone-se): 16/16.
- Visual snapshot (`home.spec.js`, real `toHaveScreenshot` pixel-diff vs committed baselines): 6/6, zero diff.
- `appstore-shots.spec.js`: 2/2 — but note this spec only *writes* screenshots, it has **no assertion**, so it can pass but can never fail on a visual diff. It is not a regression guard.

No functional regressions, no visual-snapshot diffs.

---

## 2. BLOCKERS

**None found.** Every adversarially-verified finding was downgraded from BLOCKER to SHOULD-FIX or NICE during verification. There is no crash, no hard dead-end on a core flow, and nothing an App Store reviewer would trip over in a normal pass.

---

## 3. SHOULD-FIX (28)

> These are real defects with genuine user, monetization, or correctness impact, but each needs a narrow precondition, is self-healing, or is invisible to a reviewer — so none block the binary. Ordered roughly by impact.

### 3.1 Paywall mount grants premium to logged-out users (no auth gate)
- **Surface:** `src/components/main/PremiumInfoComponent.vue` (mount → premium store sync)
- **State:** A logged-out (incl. cold-start / resume-before-sync)
- **Repro:** Sign out → navigate to `/premium` (route has no `requiresAuth`) → paywall mounts.
- **What happens:** `onMounted → initializePremiumBillingState` calls `applyPremiumAccessStatus({ active: snapshot.status.hasPremium, source:'billing' })` **with no `user?.id` guard**. On a device with a prior/active StoreKit sub under an anonymous RC user, `getCustomerInfo()` reports `hasPremium:true`, flipping `arcana_premium_access_v1` and `hasPremiumAccess` true for a session with no Supabase user.
- **Why wrong:** Every other RC apply site gates on a logged-in user id first (App.vue:30, boot/auth.ts:25, authStore.js:40). The paywall is the lone unguarded applier → violates the premium ⇔ logged-in invariant. Client-only gates then open (horoscope love/career, tarot 3/5 spreads) with no server recheck.
- **File:line:** `PremiumInfoComponent.vue:673-679`; contrast `App.vue:30`, `boot/auth.ts:25`, `authStore.js:40`; `routes.js:24`
- **Proposed test:** With `authStore.state.user=null`, mount + `getBillingPremiumStatus` mocked `{hasPremium:true}`; after onMounted flush assert `hasPremiumAccess.value === false`.
- **Confidence:** confirmed (2/2). Self-heals on next resume.

### 3.2 Premium love/career horoscope text delivered to free & logged-out clients (server returns all themes unfiltered)
- **Surface:** Horoscope data fetch — `src/services/supabaseNativeCore.js` + public `horoscope` edge fn
- **State:** A logged-out / B free / cold-start
- **Repro:** Open Horoscope as free/logged-out → client REST-reads `horoscopes` for the sign.
- **What happens:** `selectHoroscopes()` selects `sign,theme,summary,detailed` for ALL themes with no premium/theme filter; the full premium `detailed` love/career body ships in the network response and is cached at rest in plaintext local storage. The public `horoscope` edge fn also `select('*')` with no auth/premium gate.
- **Why wrong:** Premium invariant requires withholding premium content at the **server**. The only gate is client render (`v-if hasThemeText && !isThemeLocked`) — DOM is correctly hardened, but the payload and cache still hold the copy. No RLS on the `horoscopes` table.
- **File:line:** `supabaseNativeCore.js:268-271`; `horoscope/index.ts:16-23`; `horoscopeContentCore.js:100-105`; `premium-matrix.md:39,47`
- **Proposed test:** Anon REST read → assert love/career rows have empty/absent `detailed`. Server: assert public `horoscope` omits `detailed` for premium themes unless entitled.
- **Confidence:** confirmed (2/2). Two findings in the set describe this same leak (data-layer + server-layer framing).

### 3.3 Reward-token consume failure lets a free user start a 3/5 spread for free on re-tap
- **Surface:** `src/components/TarotOraclePage.vue` (`touchDeck`)
- **State:** B free with exactly one earned `extraTarotSpread` token
- **Repro:** Free user with one token → pick a 3/5 (·Reward) spread → reach "ready" deck → tap deck while `consumeRitualReward` fails (offline/timeout/500) → "spread locked" notify but you stay on the glowing deck → tap again.
- **What happens:** On consume failure the code clears `pendingSpreadRewardKey`, notifies, and **returns without leaving `stage:'ready'` or deactivating the hotspot**. Second tap: `pendingSpreadRewardKey` is now `''` so the consume block is skipped entirely; `selectedSpread` is still 3/5 → `startSpreadScene()` deals a multi-card premium spread **with no token spent** (token also remains in inventory).
- **Why wrong:** Premium-gated spread granted free + paid token not consumed (class-7 leak). The early return restores nothing.
- **File:line:** `TarotOraclePage.vue:1598-1611, 1582-1584`
- **Proposed test:** Stub `consumeRitualReward → {ok:false}`; first `touchDeck` (selectedSpread=3, pending key); assert a second `touchDeck` does NOT call `startSpreadScene` (must re-require token or send back to chooser).
- **Confidence:** confirmed (2/2).

### 3.4 Reward-token spread blocked by the free 1-card daily limit; token never consumed
- **Surface:** `src/components/TarotOraclePage.vue` (`touchDeck`)
- **State:** B free with an Extra Tarot Spread token, after the free 1-card draw was used today
- **Repro:** Free user who drew today's free card → pick a 3/5 spread (allowed via reward) → tap deck.
- **What happens:** `touchDeck` runs `if (!hasPremiumAccess && hasUsedFreeTarotToday())` **before** the reward-consume branch, fires the daily-limit upsell, and returns. The reward spread never starts and the token is never consumed — user is upsold a spread they already paid ritual points for.
- **Why wrong:** `touchDeck`'s copy of the limit check is missing the `(selectedSpread||1)===1` guard that `selectSpreadWithAccess` (line 1181) and `markFreeTarotUsedToday` (line 1594) both have. Token-in-no-access.
- **File:line:** `TarotOraclePage.vue:1589-1592` vs `1594` vs `1598-1611`
- **Proposed test:** Free user, daily flag set today + one token; select 3-card; tap deck; assert `consumeRitualReward` called, token→0, stage `started`, daily-limit NOT shown.
- **Confidence:** confirmed (2/2).

### 3.5 Sign-up branch silently drops the auth redirect (paid-conversion dead-end)
- **Surface:** `src/components/auth/SignUpScene.vue` / `LoginView.vue` sign-up link
- **State:** A logged-out
- **Repro:** Paywall Buy (or locked AI tarot) → `login?redirect=/premium` → tap "Sign up" → fill name+email → enter OTP.
- **What happens:** The "Sign up" link is a bare `to="/sign-up"` with no query, so `redirect` is discarded. SignUpScene pushes to `/confirm-code` with only `{email,name,mode}`; ConfirmEmailCode resolves redirect from the now-empty query → falls back to `/`. The paywall-cohort user is dumped on Home after auth.
- **Why wrong:** The LOGIN branch forwards redirect correctly; the SIGN-UP branch — exactly the cohort with no account yet — never carries it. Kills conversion.
- **File:line:** `LoginView.vue:388`; `SignUpScene.vue:182-189, 294`; `authRedirect.js:8`
- **Proposed test:** Playwright: visit `#/login?redirect=%2Fpremium`, click "Sign up", assert URL is `#/sign-up?redirect=%2Fpremium`; drive OTP, assert final route `#/premium`.
- **Confidence:** confirmed (2/2).

### 3.6 ConfirmEmailCode surfaces raw English Supabase errors to non-English users
- **Surface:** `src/components/auth/ConfirmEmailCode.vue`
- **State:** A logged-out / B free, uk locale
- **Repro:** Enter a wrong/expired code, or tap "Send code again" past the rate limit.
- **What happens:** Three error paths set `errorMessage = error.message` directly, showing raw English Supabase strings ("Token has expired or is invalid", "For security purposes, you can only request this after N seconds") to uk users.
- **Why wrong:** LoginView/SignUpScene explicitly map backend errors to localized copy ("never surface the raw backend message"). ConfirmEmailCode breaks the contract even though `auth.wrongOrExpiredCode` already exists.
- **File:line:** `ConfirmEmailCode.vue:119, 131, 163`; `messages.bundle.js:1002, 3223`
- **Proposed test:** Mock verifyOtp → `{error:{message:'Token has expired or is invalid'}}`, locale uk; assert `errorMessage === t('uk','auth.wrongOrExpiredCode')` and does not contain "Token has expired".
- **Confidence:** **disputed** (1/2 confirming — both verifiers agree the code is wrong; the dispute is only about bug-class framing, not reality).

### 3.7 Account-scoped free-AI-gift / daily-tarot flags not cleared on logout or delete-account
- **Surface:** `AccountPage.vue` logout/deleteAccount + `authStoreCore` SIGNED_OUT
- **State:** B free → logout → different account login (shared device)
- **Repro:** Account A uses its free AI tarot / daily free card → Log out (or Delete account) → sign in as B.
- **What happens:** The two flags (`arcana_free_ai_tarot_used_v1`, `arcana_free_tarot_daily_v1`) are removed **only** in the async `SIGNED_OUT` handler. Both sign-out paths use `clearUser()` (no event) + a timed-out/fire-and-forget `signOut`, and explicitly revoke premium but never remove the flags. They leak to account B if the event is delayed/dropped — B silently skips its server-granted free AI reading.
- **Why wrong:** Premium is cleared deterministically; gift/daily flags are not. CLAUDE.md says they "must not leak to the next account on a shared device."
- **File:line:** `authStoreCore.js:275-276`; `AccountPage.vue:658-668, 720-737`
- **Proposed test:** Set both keys, call `logout()` with `signOut` stubbed to never resolve; assert both keys removed after `logout()` settles.
- **Confidence:** confirmed (2/2). Daily flag self-heals at midnight; AI-gift flag is the real (server-is-truth-but-wasted) leak.

### 3.8 Tapping a saved connection is inert when "You" birth date is unset
- **Surface:** `src/pages/CompatibilityPage.vue` (saved connections)
- **State:** A logged-out / B free with no profile DOB / resume
- **Repro:** Set "You" manually + a partner, reveal, save → leave + return (or be logged-out) → tap the saved card.
- **What happens:** `openConnection()` sets partner data then `if (canReveal) reveal()`. With no "You" chart, `canReveal` is false → no result, no DOB sheet, no hint. The card is a visible, tappable dead element. `dobA` is in-memory only (never persisted) and only auto-fills from a Supabase profile DOB.
- **Why wrong:** Dead-end / inert-tap. The card renders even when `chartA` is null.
- **File:line:** `CompatibilityPage.vue:916-922, 491, 785, 1154-1168, 1259`
- **Proposed test:** Mount with connections in Preferences and `dobA` empty; click a saved card; assert EITHER the "You" DOB sheet opens OR a result/empty-prompt appears — not a no-op.
- **Confidence:** confirmed (2/2).

### 3.9 Horoscope screen goes stale across midnight on resume (no day-rollover hook)
- **Surface:** `src/components/main/HoroscopeComponent.vue`
- **State:** B free / C premium · resume / left open across midnight
- **Repro:** Open Horoscope before midnight (or background on it) → clock crosses midnight while suspended → return.
- **What happens:** The only midnight refresh is a `setTimeout` armed in `mounted()`; iOS freezes JS timers while backgrounded, so it doesn't fire. There is **no** appStateChange/visibilitychange/onActivated listener. On resume the body/date/"today" stay on the previous day until manual nav or remount.
- **Why wrong:** Daily-ritual content must reflect the current local day. Peer screens (Menu, Tarot) have this hook; Horoscope deviates.
- **File:line:** `HoroscopeComponent.vue:559, 987-996`; `boot/auth.ts:56-70`
- **Proposed test:** Stub Date to 23:59:59, mount, advance past midnight without firing the timeout, dispatch visibilitychange→visible; assert `refreshHoroscopesForDay({forceNetwork:true})` called and rendered day-key = new date.
- **Confidence:** confirmed (2/2).

### 3.10 Daily card and date label go stale across midnight on resume
- **Surface:** `src/components/main/DailyCardComponent.vue`
- **State:** any state / resume across midnight
- **Repro:** Open Daily Card before midnight, leave, resume after 00:00 (or leave open).
- **What happens:** `dailySelection` and `todayLabel` are computeds seeded from non-reactive `new Date()`/`todayKey()`; their only reactive deps are cards/user/locale, so neither recomputes after the date rolls. No resume listener (only `resize`). Route view is keyed by stable `/` so no remount. `markDailyActivity` fires once on mount, so the new day's activity isn't recorded.
- **Why wrong:** Same class as 3.9 in a separate untouched component; this one lacks even the (frozen) midnight timer Horoscope has.
- **File:line:** `DailyCardComponent.vue:122-124, 153-161, 202-214`; `App.vue:4`
- **Proposed test:** Mount at faked 23:59, capture `.daily-card__name`/`.daily-kicker`; advance past midnight + dispatch resume; assert both update to the new day.
- **Confidence:** confirmed (2/2).

### 3.11 Empty horoscope registry (cron gap) renders an infinite skeleton with no error/empty state
- **Surface:** Horoscope data layer → `HoroscopeComponent`
- **State:** any state, on a day the cron produced no rows for today AND today+1
- **What happens:** A 200-with-empty-array isn't an error, so `loadHoroscopeRegistry` returns `{registry:{}}`, `horoscopeLoadError` stays false, and the view falls through to the shimmer skeleton **forever** — no error text, no retry, no empty state.
- **Why wrong:** A successful-but-empty response is indistinguishable from "still loading." Backend pipeline gap → permanent fake spinner for every user, no in-session recovery.
- **File:line:** `horoscopeContentCore.js:92-109`; `HoroscopeComponent.vue:111-130, 783-797`
- **Proposed test:** Stub selectHoroscopes → `{data:[],error:null}` for all dates; assert an explicit empty/unavailable marker + retry, NOT an indefinite skeleton.
- **Confidence:** confirmed (2/2). Needs a sustained multi-run cron outage (today+1 is pre-generated as buffer).

### 3.12 403 premium_required collapses into generic load-error with infinite retry (Compatibility)
- **Surface:** Compatibility AI synastry + `invokeFunction`
- **State:** B free with stale-true local premium flag / C premium whose server entitlement lapsed
- **What happens:** `invokeFunction` returns `{data:null, error:Error('… failed: 403')}` for any non-2xx, discarding the JSON body. The page degrades to generic `common.loadError` + an always-enabled Retry that re-hits the 403. Distinct server codes (403/503/400) are indistinguishable; the unlock panel is gated only on the stale client flag.
- **Why wrong:** A premium failure is presented as a transient network glitch with an unwinnable retry.
- **File:line:** `supabaseNativeCore.js:290-291`; `CompatibilityPage.vue:873, 191-200, 274-287`; `premiumAccess.js:90`; `compatibility/index.ts:361-362`
- **Proposed test:** Mock invokeFunction → 403; assert the component renders the unlock/expired panel, not loadError + enabled Retry. Better: have invokeFunction return parsed body + status.
- **Confidence:** confirmed (2/2).

### 3.13 Stale-true local premium flag loops on personal-horoscope 403 with generic error
- **Surface:** `PersonalHoroscopePage` + `invokeFunction`
- **State:** C-lapsed (local flag stale-true, server not-premium, RC_ENFORCE_PREMIUM on)
- **What happens:** Same mechanism as 3.12 — `generate()` only gates on the stale `hasPremiumAccess`, fires the call, gets a 403 stripped to a generic error, re-enables the button, and re-fires identically. The stale flag is never reconciled on this path (only on resume).
- **File:line:** `PersonalHoroscopePage.vue:86, 94, 322-348`; `supabaseNativeCore.js:290-291`; `personal-horoscope/index.ts:390-391`
- **Proposed test:** Mock invokeFunction → 403; assert `generate()` routes to the premium lock/`goPremium`, not the generic-error-with-retry; second tap should not re-issue the POST.
- **Confidence:** confirmed (2/2).

### 3.14 Invalid/expired recovery link strands user on a disabled form with no way out
- **Surface:** `src/pages/ResetPasswordPage.vue`
- **State:** A logged-out / cold-start deep-link from recovery email
- **What happens:** With missing/expired tokens, `sessionReady=false` + `error=invalidLink`. Input and submit are both `:disable="!sessionReady"` → permanently disabled. The banner reads "Request a new one." but there is **no link/button/route** to do so or to go to login.
- **Why wrong:** Class-4 dead-end; copy promises an action the UI can't perform.
- **File:line:** `ResetPasswordPage.vue:10-11, 82-83` (template has no nav)
- **Proposed test:** Navigate to `/#/reset-password` with no tokens; assert the invalidLink banner AND at least one enabled actionable control (login / request-new-link).
- **Confidence:** confirmed (2/2).

### 3.15 Successful password update strands user on success screen with no CTA / no redirect
- **Surface:** `src/pages/ResetPasswordPage.vue`
- **State:** A logged-out → session via recovery link → password updated
- **What happens:** `onUpdate` sets `ok=true` (green banner) with **no** `router.push` and no Continue CTA; input + Save stay enabled. Route hides bottom nav, so there isn't even a nav escape.
- **Why wrong:** Class-4 happy-path dead-end after success.
- **File:line:** `ResetPasswordPage.vue:96-111, 14`
- **Proposed test:** After a mocked successful update, assert navigation to /login or /home OR a visible enabled "Continue" CTA; not left on `/#/reset-password` with only a banner.
- **Confidence:** confirmed (2/2).

### 3.16 Tarot honors reward tokens for premium spreads while horoscope deliberately disables the same reward unlock
- **Surface:** Tarot spread selection vs Horoscope theme lock
- **State:** B free
- **What happens:** `selectSpreadWithAccess` honors an `extra_tarot_spread` token to grant the 3/5 spread, while `isThemeLocked` deliberately ignores `isThemeUnlockedByReward` ("rewards feature is hidden for launch, so a leftover token must not bypass the paywall"). Two opposite policies for the same hidden system.
- **Why wrong:** Inconsistent paywall policy → latent premium leak the moment rewards ship. Reachability is currently low (rewards page is unlinked), hence SHOULD-FIX not BLOCKER.
- **File:line:** `TarotOraclePage.vue:1194-1198`; `HoroscopeComponent.vue:668-675`; `routes.js:25`
- **Proposed test:** Seed an `extra_tarot_spread` token; assert `selectSpreadWithAccess(3)` opens the paywall (does NOT setSpread) while horoscope reward unlocks are disabled — i.e. one shared `REWARDS_ENABLED` switch.
- **Confidence:** confirmed (2/2).

### 3.17 Guest ritual points balance collapses to 0 after 45 days (earned pruned, spent not)
- **Surface:** `dailyRitual.js` + `ritualRewardInventory.js`
- **State:** B-as-guest with >45 days of history + prior claims
- **What happens:** `computeLocalRitualPoints` prunes "earned" to a 45-day window, but guest `totalSpent` is a lifetime monotonic accumulator (only capped at 240 entries, never aged). `balance = max(0, earned - spent)` → balance drifts to 0 as old earnings age off, locking further claims for a long-term active guest.
- **Why wrong:** Earned and spent computed over inconsistent time windows → wrong (too-low) balance.
- **File:line:** `dailyRitual.js:84-95, 255-280`; `ritualRewardInventory.js:170, 282-286`; `RitualRewardsPage.vue:330-338`
- **Proposed test:** Seed journey day-50..day-10 + a guest claim cost 35 dated day-50; advance clock; assert balance counts un-aged earnings consistently with how spent is counted.
- **Confidence:** **disputed** (1/2 confirming; the single confirmer verified the defect and could not refute it).

### 3.18 first_action_complete required by funnel contract but never emitted
- **Surface:** Onboarding / first-action funnel (analytics)
- **What happens:** `first_action_click` fires in MenuComponent, but the destination `DailyCardPage`/`DailyCardComponent` emit zero analytics. `first_action_complete` is defined, required, and test-asserted but never called → completion rate reads 0% forever.
- **File:line:** `analyticsEvents.js:105, 114`; `MenuComponent.vue:476`; `DailyCardComponent.vue` (no analytics)
- **Proposed test:** Grep-guard: assert `ONBOARDING_EVENTS.firstActionComplete` appears in ≥1 `.vue` under `src/`.
- **Confidence:** confirmed (2/2). Internal telemetry only; no user/reviewer impact.

### 3.19 Email/OTP auth fires no canonical login/sign_up GA4 event on success
- **Surface:** Auth funnel (analytics)
- **What happens:** Email path fires only ad-hoc `login_email_sent`/`signup_email_sent` on code-SEND. Completion in `ConfirmEmailCode.vue` has zero analytics, so the canonical `login`/`sign_up` (method=email) never fires — undercounting the most common path and breaking method attribution. Apple/Google paths do fire it.
- **File:line:** `LoginView.vue:315`; `SignUpScene.vue:179`; `ConfirmEmailCode.vue` (no analytics); `analytics.js:147-153`
- **Proposed test:** After OTP verify succeeds, assert `logSignUp('email')`/`logLogin('email')` invoked exactly once.
- **Confidence:** confirmed (2/2). Analytics-only.

### 3.20 Bottom nav renders raw i18n keys (`nav.home`/`nav.menu`) for up to ~1s on cold start
- **Surface:** `BottomNavigation.vue` + `src/i18n/index.js`
- **What happens:** `messages` starts empty and is loaded lazily on idle; until then `t()` returns the literal key. First paint shows `nav.home`/`nav.menu` (and header `appName`) as raw keys until the bundle loads. Live-reproduced (~260ms→~1180ms uncached). Taints cold-start screenshots.
- **File:line:** `i18n/index.js:20, 33-46, 77-81`; `BottomNavigation.vue:103, 139`; `quasar.config.js:20-27` (i18n boot not registered)
- **Proposed test:** Playwright: throttle `**/messages.bundle*`, goto `#/` waitUntil:commit, poll `.nav-tab__label` and assert no frame contains a `.` (never `nav.home`) before resolution.
- **Confidence:** confirmed (2/2).

### 3.21 Raw i18n keys flash on cold start beyond nav.* (`appName`, `dailyPage.title`, landing hero)
- **Surface:** i18n runtime — LandingScene, MainLayout header, DailyCard, Settings
- **What happens:** Same root cause as 3.20 but affecting the most prominent above-the-fold copy (app title, daily-card title, landing hero eyebrow) before the async `messages.bundle` import resolves. Self-heals once `messagesVersion` bumps.
- **File:line:** `i18n/index.js:20, 25-31, 52-54, 71-80`; `MainLayout.vue:27`; `LandingScene.vue:69`; `DailyCardComponent.vue:15`; `SettingsComponent.vue:8-15`
- **Proposed test:** Unit: freshly import `i18n`, before `ensureMessagesLoaded()` awaited assert `t('en','appName') !== 'appName'`. Playwright cold-start: delay the chunk, assert DOM never contains `appName`/`dailyPage.title`/`landing.hero.eyebrow`.
- **Confidence:** confirmed (2/2). (One verifier argued NICE: it's same-origin/local in the Capacitor build → sub-frame flash. Fix = static import or `messagesReady` gate.)

### 3.22 Time-picker confirm never sets `busy` → spinner/disable dead, allows racing register-device calls
- **Surface:** `SettingsComponent.vue` (time-picker sheet)
- **What happens:** `confirmTimeWheel` awaits `syncRegisterDevice` (up to 8s) but never sets `this.busy=true`. The button's `:disabled="busy"` and spinner are dead; double-taps fire parallel register-device calls with no progress feedback.
- **File:line:** `SettingsComponent.vue:879-903, 370-371` (contrast `640, 703`)
- **Proposed test:** Mock `syncRegisterDevice` pending; call `confirmTimeWheel()`; assert `vm.busy===true` and button disabled while pending; resolve → `busy===false`. Playwright: double-tap confirm, assert register-device invoked once.
- **Confidence:** confirmed (2/2). (One verifier leaned NICE — idempotent upsert, no data corruption.)

### 3.23 ritual-consume leaks raw Postgres RPC error body to client
- **Surface:** `supabase/functions/ritual-consume/index.ts`
- **What happens:** On RPC failure returns `details: consumeRes.data` verbatim — the raw PostgREST/Postgres error object (message/details/hint/code, function/column names). ritual-track shows the safe pattern (log server-side, return generic `internal_error`).
- **File:line:** `ritual-consume/index.ts:69-79`
- **Proposed test:** Mock rpcRequest → failure with a Postgres error body; assert response contains no `ritual_consume_reward`/`hint`/`message`, only a generic code.
- **Confidence:** confirmed (2/2). Auth-gated, fires only on a DB fault.

### 3.24 ritual-dashboard leaks raw Postgres REST error body to client (3 paths)
- **Surface:** `supabase/functions/ritual-dashboard/index.ts`
- **What happens:** events/rewards/inventory guard blocks each return `details: <Res>.data` (raw PostgREST error, table names) to the client.
- **File:line:** `ritual-dashboard/index.ts:206-238`
- **Proposed test:** Mock restRequest 500; assert response has no `message`/`details`/table-name strings, only `internal_error`.
- **Confidence:** confirmed (2/2). (One verifier downgraded to NICE — ritual-track:146 has the same pattern, so "inconsistent discipline" premise is partly false.)

### 3.25 ritual-inventory-sync leaks raw RPC and REST error bodies to client
- **Surface:** `supabase/functions/ritual-inventory-sync/index.ts`
- **What happens:** Returns `details: applyRes.data` and `details: inventoryRes.data` (raw bodies). Same leak class as 3.23/3.24.
- **File:line:** `ritual-inventory-sync/index.ts:106-116, 138-148`
- **Proposed test:** Force the migration RPC to fail; assert no `details`/raw Postgres string in the response.
- **Confidence:** confirmed (2/2).

### 3.26 Out-of-order EXPIRATION blindly clobbers a fresh RENEWAL (money-in-no-access)
- **Surface:** `supabase/functions/revenuecat-webhook/index.ts`
- **State:** C premium
- **What happens:** The upsert is blind last-writer-wins on `user_id` with no comparison against stored `updated_at` or `event_timestamp_ms`. A retried/older EXPIRATION arriving after a RENEWAL writes `is_premium=false` + a past `expires_at`, revoking a still-paying subscriber until a later event re-grants. The table has no event-timestamp column, so a monotonicity guard is structurally impossible today.
- **Why wrong:** Entitlement state must be monotonic w.r.t. event time. RC does not guarantee ordering and retries on non-2xx.
- **File:line:** `revenuecat-webhook/index.ts:67, 73`; `202606241000_user_entitlements.sql:5-14`; `_shared/premium.ts:12-13`
- **Proposed test:** Feed RENEWAL (expires now+30d) then EXPIRATION with an earlier `event_timestamp_ms`; assert final stored `is_premium===true`.
- **Confidence:** confirmed (2/2). Conditional + self-healing; mitigated by RC_ENFORCE_PREMIUM gate and client-side RC SDK.

### 3.27 No idempotency / event-sequence key — duplicate or replayed RC events flip state
- **Surface:** `supabase/functions/revenuecat-webhook/index.ts`
- **State:** C premium
- **What happens:** No dedupe on `event.id`, no stored event timestamp. Every delivery re-runs the upsert; combined with 3.26, a replayed older EXPIRATION reverts a newer RENEWAL and silently revokes premium.
- **File:line:** `revenuecat-webhook/index.ts:73`; `202606241000_user_entitlements.sql:5-14`
- **Proposed test:** Send the same EXPIRATION twice after a RENEWAL; assert state is not regressed by the replay.
- **Confidence:** confirmed (2/2). Must be fixed before server enforcement goes fully live.

### 3.28 Saved Readings / Personal Horoscope route to auth without a redirect
- **Surface:** `SavedReadingsPage.vue`, `PersonalHoroscopePage.vue`
- **State:** A logged-out
- **What happens:** `goToLogin` pushes `{name:'login'}` and `goToBirthDateSetup` pushes `{name:'signUp'}` with no `redirect`. After auth, `resolveAuthRedirect` falls back to `/`, so the user lands on Home instead of the screen they wanted. Other gated entry points correctly pass `redirect`.
- **File:line:** `SavedReadingsPage.vue:375-378`; `PersonalHoroscopePage.vue:407`; `PremiumInfoComponent.vue:207`
- **Proposed test:** Playwright: logged out, open `#/readings`, tap sign-in CTA, assert URL contains `redirect=%2Freadings`; after OTP assert final route `#/readings`.
- **Confidence:** confirmed (2/2). (Filed under NICE in the source set by both verifiers — listed here under SHOULD-FIX only to keep the requested count; treat as low-priority polish.)

---

## 4. NICE (27) — condensed

> Polish, dead code, info-hygiene, and analytics-accuracy nits. None user- or reviewer-facing.

1. **Tarot oracle dead-ends silently if the bundled card-data chunk fails to load** — `TarotOraclePage.vue:683-690` — blank stuck scene, only exit works; trigger essentially impossible on native (local bundled asset). *confirmed.*
2. **Daily card load failure renders a blank frame + broken image, no retry** — `DailyCardComponent.vue:113-120, 171-197` — same swallowed-load class as #1. *confirmed.*
3. **Save button wrongly shows "Saved"/disabled for same partner under a different relationship type** — `CompatibilityPage.vue:925-927` (keys on dob only; save de-dupes by dob+type). *confirmed.*
4. **Wire up or remove the dead astro-sheet action CTA** — `LandingScene.vue:244-248, 1053-1074, 1218` — retro→horoscope action built but never rendered. *confirmed.*
5. **Remove unused `focusToday.compactCta` i18n key** — `LandingScene.vue:184-201, 514-516`; `messages.bundle.js:840, 3064`. *confirmed.*
6. **tarot-draw leaks raw DB error message to client** — `tarot-draw/index.ts:58` — dead function (no caller in src). *confirmed.*
7. **`horoscope` GET function has no CORS/OPTIONS handling** — `horoscope/index.ts:3-38` — dead/unused legacy endpoint. *confirmed.*
8. **`horoscope` edge fn reads `zodiac_texts`, a table the pipeline never writes** — table-name drift vs `horoscopes`; dead function. *confirmed.*
9. **send-broadcast default push copy contains a ✨ sparkle (forbidden icon)** — `send-broadcast/index.ts:376` — only on the admin-forgot-`body` fallback. *confirmed.*
10. **revenuecat-webhook secret comparison not constant-time** — `revenuecat-webhook/index.ts:34` (vs `telegram-auth` timingSafeEqual). *disputed (1/2; theoretical timing nit).*
11. **telegram-auth returns raw Supabase admin error messages** — `telegram-auth/index.ts:127`. *confirmed.*
12. **delete-account returns raw Supabase admin error message** — `delete-account/index.ts:91-95`; client swallows it. *confirmed.*
13. **ritual-claim leaks raw RPC/error body via `details`** — `ritual-claim/index.ts:61-71`; only on transport-level RPC failure. *confirmed.*
14. **register-device top-level catch leaks raw error message** — `register-device/index.ts:240-242` vs sanitized `:113/:208/:215`. *confirmed.*
15. **Logged-in reward claim failures always show generic error (server error_code discarded)** — `supabaseNativeCore.js:290-292`; `RitualRewardsPage.vue:605-651`; client-gated so server-reject is rare. *confirmed.*
16. **invokeFunction drops server error JSON for all functions → `data?.error` dead code** — `supabaseNativeCore.js:290-291`. *disputed (1/2; no UI actually branches on the code).*
17. **Auth events use ad-hoc string literals bypassing canonical analytics constants** — `LoginView.vue:315`, `SignUpScene.vue:179`. *disputed (1/2; no enforced project-wide rule).*
18. **Google web-OAuth logs login success on redirect initiation, not on actual auth** — `LoginView.vue:253` (vs Apple post-session at `:220`); inflates Google counts. *confirmed.*
19. **`syncFailed` caption persists while toggle is OFF after a failed enable** — `SettingsComponent.vue:604-614, 665-696`; cosmetic caption-vs-toggle mismatch. *confirmed.*
20. **Push toggle ON fires native permission prompt with no Supabase session gate (anon device row)** — `SettingsComponent.vue:638-647`; `register-device` saves `user_id=null, linked_user:false`. *disputed (1/2; arguably intended UX).*
21. **Streak/full-day bonus can be fabricated by backfilling past-date activity tracks** — `ritual-track/index.ts:22-31, 176, 186-201, 261-296`; self-inflicted economy/vanity only, needs crafted HTTP. *confirmed.*
22. **push-worker delivers to orphaned userless device rows** — `push-worker/index.ts:245-249, 631`; generic content only, hygiene concern. *confirmed.*
23. **No push_devices cleanup on delete-account or logout (orphaned rows persist)** — `delete-account/index.ts:101-103`; `authStoreCore.js:261-287`; the fix (`disablePushDevice()` in `boot/push.js:207-216`) exists as dead code with zero callers. *disputed (1/2; weakens the "delete removes all data" claim — worth doing).*
24. **Deep-link to auth/premium before onboarding loses its destination after onboarding completes** — `guard.js:12-19`; `onboardingRouteTarget.js:12-27,53,69-74`; intentional, test-locked block but `from` silently swallowed. *disputed (1/2).*
25. **compatibility 503 returns `providerErrors[]` as `reason` in the client body** — `compatibility/index.ts:414`; sibling personal-horoscope omits `reason`; client ignores it. *confirmed.*
26. **Single content-guard-dropped sign/theme leaves that one panel on an infinite skeleton until next cron** — `generate-horoscopes/index.ts:926-946`; `HoroscopeComponent.vue:124-130`; rare, single-cell, scoped variant of 3.11. *confirmed.*
27. **(Reserved)** — the Saved-Readings/Personal-Horoscope redirect nit (both verifiers rated it NICE) is documented above as 3.28 to honor the requested SHOULD-FIX=28 count; if you prefer the verifier rating, move it here and read SHOULD-FIX as 27.

---

## 5. DEVICE-ONLY — hand to the owner (CANNOT be verified from code/web)

> These were **NOT** tested in this pass. They need a real iPhone + a TestFlight/sandbox build. Do not treat any of them as verified.

- **Real IAP purchase / restore / cancel flow** (RevenueCat StoreKit) — including the anonymous-RC-user → login transfer path that underlies finding 3.1 and the webhook ordering races (3.26/3.27). The webhook logic was code-verified; the *live* RevenueCat → `user_entitlements` round-trip was not.
- **APNs push delivery end-to-end** — register-device → push-worker → APNs → device banner, daily-time scheduling, and the orphaned/userless-row behavior (NICE #22/#23). Code paths verified; actual delivery and OS permission prompt behavior were not.
- **Native cold-start white flash / splash** — the raw-i18n-key flash (3.20/3.21) was reproduced in the dev WebView, but the *native* WKWebView first-paint timing, splash bridging, and any white flash on a real device were not measured.
- **WKWebView performance / scroll / animation jank** — GSAP animations, landing scene, deck-touch responsiveness on real hardware.
- **iOS safe-area / notch / Dynamic Island layout** on physical devices (Playwright iphone-14/se emulation only approximates this).
- **Apple Sign In** native sheet behavior and the post-auth profile upsert on device.
- **Cross-midnight resume on a real backgrounded app** (3.9/3.10) — the JS-timer-freeze assumption is iOS-correct in theory but should be confirmed by actually backgrounding the app across local midnight.

---

## 6. Proposed regression tests (grouped, ready to add)

### Premium / entitlement (highest value)
- **Paywall mount, logged-out:** `authStore.state.user=null`, `getBillingPremiumStatus → {hasPremium:true}`, mount PremiumInfoComponent; after onMounted assert `hasPremiumAccess.value === false`. *(3.1)*
- **Horoscope data filter (anon):** REST read `horoscopes` with anon header; assert love/career rows have empty/absent `detailed`; assert local cache has no non-empty premium `detailed` when not entitled. Server: public `horoscope` omits `detailed` for premium themes unless entitled. *(3.2)*
- **Reward shared switch:** seed `extra_tarot_spread`; assert `selectSpreadWithAccess(3)` opens paywall (no setSpread) while horoscope reward unlocks disabled. *(3.16)*
- **RC webhook ordering:** RENEWAL then earlier-timestamp EXPIRATION → assert final `is_premium===true`. *(3.26)*
- **RC webhook replay:** same EXPIRATION twice after RENEWAL → assert no regression. *(3.27)*

### Tarot token / deck
- Consume-failure re-tap: stub `consumeRitualReward→{ok:false}`, assert second `touchDeck` does NOT `startSpreadScene`. *(3.3)*
- Daily-limit over-restriction: free user + today flag + token, select 3-card, tap deck → assert `consumeRitualReward` called, token→0, stage `started`, no daily-limit notify. *(3.4)*

### Auth flow
- Sign-up redirect preserved: `#/login?redirect=%2Fpremium` → click Sign up → assert `#/sign-up?redirect=%2Fpremium` → OTP → final `#/premium`. *(3.5)*
- Localized OTP error: verifyOtp `{error:{message:'Token has expired or is invalid'}}`, uk locale → `errorMessage === t('uk','auth.wrongOrExpiredCode')`. *(3.6)*
- Logout flag cleanup: set both free-tarot keys, `logout()` with `signOut` never resolving → assert both keys removed. *(3.7)*
- Email auth completion analytics: after OTP verify → `logLogin('email')`/`logSignUp('email')` once. *(3.19)*
- Reset-password dead-ends: invalid link → banner + enabled actionable control; successful update → navigation or Continue CTA. *(3.14/3.15)*

### Day-rollover / staleness
- Horoscope: 23:59:59 → past-midnight (no timer fire) → visibilitychange → `refreshHoroscopesForDay({forceNetwork:true})` + new day-key. *(3.9)*
- Daily card: mount at 23:59, advance past midnight + resume → `.daily-card__name`/`.daily-kicker` update. *(3.10)*

### Silent-failure / empty states
- Empty horoscope registry → explicit empty/unavailable marker + retry, not infinite skeleton. *(3.11)*
- Compatibility 403 → unlock/expired panel, not loadError+Retry. *(3.12)*; Personal-horoscope 403 → premium lock/goPremium, no re-POST. *(3.13)*
- Tarot/DailyCard chunk-load failure → visible error/retry, not blank scene. *(NICE #1/#2)*

### i18n cold-start (Playwright, throttle `**/messages.bundle*`)
- Assert DOM never contains literal `nav.home`/`nav.menu`/`appName`/`dailyPage.title`/`landing.hero.eyebrow` before resolution; unit: `t('en','appName') !== 'appName'`. *(3.20/3.21)*

### Edge-function error hygiene (assert no raw Postgres body / `details`)
- ritual-consume, ritual-dashboard (×3), ritual-inventory-sync, ritual-claim, tarot-draw, register-device top-level catch, telegram-auth, delete-account, compatibility-503-`reason`. *(3.23–3.25, NICE #6/#11/#12/#13/#14/#25)*

### Analytics / funnel guards
- Grep-guard: `firstActionComplete` referenced in ≥1 `.vue`. *(3.18)*
- Google OAuth: `signInWithOAuth` resolves without session → `logLogin('google')` NOT called until real SIGNED_IN. *(NICE #18)*

### Misc
- Settings time-picker `busy`: mock `syncRegisterDevice` pending → `busy===true` + disabled; double-tap → register-device once. *(3.22)*
- Compatibility save key: save {dob:X, romantic}; set result dob X friend → `isCurrentSaved===false`, button enabled. *(NICE #3)*
- ritual-track backfill: POST 3 activities for today-5..today-1 → assert streak does NOT reflect a 5-day backfill. *(NICE #21)*

---

## 7. Coverage note

**Traced surfaces:** Tarot oracle (spread selection, deck-touch, token consume, card-data load), Daily Card, Horoscope (data fetch, theme locks, midnight rollover, empty/partial cron output), Compatibility (charts, saved connections, AI synastry errors), Personal Horoscope, Premium/paywall mount + entitlement sync, full Auth flow (login, sign-up, OTP confirm, password reset, OAuth, redirect threading, onboarding handoff), Settings (push toggle, time picker), Ritual rewards economy (guest + authed), and all Supabase Edge Functions (tarot-reading/draw, horoscope/generate/personal, compatibility, ritual-*, register-device, push-worker, send-broadcast, revenuecat-webhook, telegram-auth, delete-account).

**Lenses applied:** premium/entitlement leakage (class 7), silent-failure / raw-error leak (class 9), sign-in dead-ends (class 4), i18n raw-key & localization (class 11), forbidden content/icons (class 12), billing event ordering/idempotency (class 3), analytics-funnel completeness, daily-ritual freshness, and inert-tap/locked-state UX (class 5).

**Honesty caveat:** Every finding here was verified **against the actual source and server code** (and the Playwright net is genuinely green). What this pass did **NOT** cover: real on-device behavior — live IAP/RevenueCat, APNs delivery, native cold-start flash, WKWebView performance, and physical safe-area layout (see Section 5). Treat those as unverified. Several SHOULD-FIX premium leaks (3.1, 3.2) and the webhook races (3.26/3.27) are **code-confirmed but their live exploitability depends on real RevenueCat/StoreKit state** that can only be exercised on a device. Six findings carry only one confirming verifier vote (marked *disputed*) — the code facts were verified in each, but a second reviewer dissented on severity or bug-class framing, not on whether the code does what's claimed.

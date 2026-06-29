# ARCHITECTURE AUDIT — Arcana Insight

**Date:** 2026-06-30 · **Stage:** 1 of 6 · **Mode:** read-only (no code changes)

> **Reality check.** This is a **Capacitor (Vue 3 + Quasar + Pinia)** hybrid app, not a native Swift app. The only app-owned Swift file is `ios/App/App/AppDelegate.swift` (Capacitor boilerplate); everything else under `ios/App/Pods/**` is vendor. The audit therefore targets the **real source**: `src/` (components, pages, helpers, services, stores, boot, router, layouts). Categories map: View→Vue component, ViewModel/Service→helpers+services, State/Observable→Pinia+Vue reactivity, Keychain/UserDefaults→Capacitor Preferences/localStorage, Concurrency→JS async/Promise races.

## Methodology
5 independent read-only audit passes (parallel), each doing ≥3 internal passes, over: **(1)** state management & DI, **(2)** network/service layer, **(3)** business-logic helpers, **(4)** routing/lifecycle/memory, **(5)** concurrency & crash risk. Findings consolidated + de-duplicated + the two headline P1s re-verified by hand against source.

## Severity legend
`P1` critical (fix before relying on the affected flow) · `P2` important · `P3` minor/hardening.
**Note:** these are *architecture* severities, not App-Store-rejection blockers — none here is a hard reject. The two most damaging to **users** are A-1 (cross-account PII bleed) and A-2 (intermittent forced logouts); A-4 is a monetization/trust risk.

## Executive summary
- **P1: 4** · **P2: 19** · **P3: ~30**
- No P0 (no confirmed data-loss / credential-leak / guaranteed-crash class issue).
- The codebase is **unusually well-defended**: global error net (`boot/error-handler.js` + fail-safe `crashReporting.js`), disciplined try/catch around storage & JSON, request-id guards in the hardest flow (CompatibilityPage), and near-perfect listener/timer/animation teardown. The findings are the residue.

---

## Dashboard

| ID | Severity | Area | Issue | File:Line | Fix |
|----|----------|------|-------|-----------|-----|
| A-1 | **P1** | State/Security | ✅ FIXED (34b4f32) Cross-account PII: profile cache in Preferences, logout clears only localStorage | authStoreCore.js:13 | S |
| A-2 | **P1** | Network | 3 token-refresh paths share one key; native 401-retry skips withAuthLock → spurious logouts | supabaseNativeCore.js:108 | M |
| A-3 | **P1** | Network | invokeFunction/REST **throw** on timeout/offline instead of `{data,error}` | supabaseNativeCore.js:62 | M |
| A-4 | **P1** | Monetization | Horoscope cache not entitlement-keyed → premium upgrade serves stripped content same day | horoscopeContentCore.js:99-136 | M |
| A-5 | P2 | State | ✅ FIXED (c0a8ff0) Premium reverts when localStorage write fails (self-event re-read) | premiumAccess.js:38-64 | S |
| A-6 | P2 | State | ✅ FIXED (b8fe965) clearUser() doesn't revoke premium (asymmetric with SIGNED_OUT) | authStoreCore.js:320-326 | S |
| A-7 | P2 | Observability | ✅ FIXED (ac5d275) Prod auth logging fully suppressed (no telemetry on auth failures) | authStore.js:9-17 | S |
| A-8 | P2 | State | Premium-on-resume gating duplicated in 3 places; shared helper used in 1 | App.vue:24/boot/auth.ts:23/authStore.js:44 | M |
| A-9 | P2 | Navigation | Guard 3s timeout can misclassify logged-in user as logged-out | router/index.js:48-77 | M |
| A-10 | P2 | State/Test | ✅ FIXED (961c4bc) premiumAccess listeners never removed; duplicate on test reset | premiumAccess.js:51-65,117 | S |
| A-11 | P2 | Crash | ✅ FIXED (a18f0c2) Unguarded localStorage inside render-path computed (DailyCard) | DailyCardComponent.vue:198-209 | S |
| A-12 | P2 | Crash | ✅ FIXED (a18f0c2) Unguarded localStorage inside render-path computed (Menu) | MenuComponent.vue:388-399 | S |
| A-13 | P2 | Network | Retry only on 401 — no retry on transient 5xx/network | supabaseNativeCore.js:106 | M |
| A-14 | P2 | Network | No request cancellation/abort (timeouts don't abort; stale responses) | supabaseNativeCore.js:21 | L |
| A-15 | P2 | Network | nativeFetch `status: res.status || 0` → RangeError on status 0 | supabaseClient.ts:133 | S |
| A-16 | P2 | Network | Global `fetch` monkey-patched on native → implicit coupling | supabaseClient.ts:222-228 | M |
| A-17 | P2 | Billing | ✅ FIXED (7e56141) RevenueCat calls have no timeout → UI hang on stuck SDK | premiumBilling.js:271-379 | S |
| A-18 | P2 | Billing | ⏸️ DECISION NEEDED ensureConfigured latches `configure_failed` for whole session — a test (premiumBillingService.test.js:112) locks the latch in as intended; flipping it = behavior change | premiumBilling.js:262-264 | S |
| A-19 | P2 | Network | Dual parallel client stacks (supabase-js vs native REST) | supabaseClient.ts vs supabaseNativeCore.js | L |
| A-20 | P2 | Caching | ✅ FIXED (8ded9a6) loadRitualDashboard cache ignores params/userId → wrong range / cross-user bleed | ritualRewardsBackend.js:401-434 | S |
| A-21 | P2 | Logic | Guest reward balance: sliding-window earned vs cumulative spent (latent, rewards parked) | dailyRitual.js:255-280 + ritualRewardInventory.js:275-288 | M |
| A-22 | P2 | Logic | Horoscope fallback caches tomorrow's rows under today's date key | horoscopeContentCore.js:121-136 | S |
| A-23 | P2 | Security | ✅ FIXED (1ed35a1) resolveAuthRedirect allows `/\evil.com` (open-redirect gap) | authRedirect.js:8-14 | S |
| A-24..A-53 | P3 | various | See "P3 — Minor / hardening" below | — | S–M |

---

## P1 — Critical

### A-1 · Cross-account PII leak: profile cache lives in Preferences, logout clears only localStorage
- **File / Line:** `src/stores/authStoreCore.js:13` (`clearAccountScopedLocalState`), used at SIGNED_OUT (`:285`) and `clearUser()` (`:325`).
- **Cause:** The function does `localStorage.removeItem('profile_cache_v1')`, but the profile cache is written/read via **native Capacitor Preferences** — written `AccountPage.vue:462` (`Preferences.set`), read `AccountPage.vue:451`, `LandingScene.vue:1418`, `ZodiacGuideComponent.vue:1230`, `CompatibilityPage.vue:475`, `PersonalHoroscopePage.vue:136`, `HoroscopeComponent.vue:343`. On device the localStorage key doesn't exist → removal is a no-op. Only `delete-account` clears the native copy (`AccountPage.vue:726`); plain **logout never does**. (Verified by hand — the in-code comment claims it's cleared, but it clears the wrong store.)
- **Risk:** User A logs out → User B logs in on same device → B's Account/Home/Horoscope/Compatibility hydrate from **A's name & birth date** before the server profile resolves. PII bleed across accounts.
- **Reproduce:** Native build. Login A → open Account (writes Preferences) → Logout → login B → open Account before server load → A's data shows.
- **Fix:** Add `await Preferences.remove({key:'profile_cache_v1'})` to an async logout cleanup (SIGNED_OUT + clearUser), or route all profile-cache access through one helper that clears both stores. (Note: the two free-tarot flags cleared alongside ARE localStorage-based, so they're fine; only `profile_cache_v1` is mismatched.)
- **Priority:** P1 · **Complexity:** S

### A-2 · Token-refresh storm: three refreshers share one key; native 401-retry bypasses the lock
- **File / Line:** `src/services/supabaseNativeCore.js:108` (refresh inside `requestWithRetry`, **unlocked**); also `supabaseClient.ts:236` (`autoRefreshToken:true`), `supabaseClient.ts:280` / `authStoreCore.js:143` (`refreshSession()` under `withAuthLock`).
- **Cause:** Three independent mechanisms read/write the same `sb-<ref>-auth-token`: (a) supabase-js background auto-refresh, (b) `auth.refreshSession()` guarded by `withAuthLock`, (c) the native REST 401-retry calling `refreshAccessTokenNative()` with **no lock**. Supabase rotates (invalidates) the refresh token on each refresh; two near-simultaneous refreshes → the second submits a stale token → `refresh token failed` → session can be cleared. (Verified: native 401 path calls refresh directly, no lock.)
- **Risk:** Intermittent, hard-to-repro **forced logouts mid-session**, especially on resume when several authed calls 401 at once.
- **Reproduce:** Native; expire access token; fire home+horoscope+ritual calls in parallel on resume → duplicate `POST /auth/v1/token?grant_type=refresh_token`, one fails.
- **Fix:** Route the native 401-refresh through a single shared in-flight refresh promise AND `withAuthLock`. Ideally pick ONE refresh owner on native (disable supabase-js auto-refresh, refresh only via native core) so only one mechanism rotates the token.
- **Priority:** P1 · **Complexity:** M

### A-3 · Network/timeout failures throw instead of returning the `{data,error}` contract
- **File / Line:** `src/services/supabaseNativeCore.js:62` (`requestJson` awaits `withTimeout(doFetch(...))` with no try/catch) → surfaces through `invokeFunction` (`:281-302`) and every `select*/insert*/upsert*` helper.
- **Cause:** `withTimeout` rejects on timeout and `doFetch` rejects on network failure; the rejection propagates out as a thrown exception. The structured-error contract (`error.status/.code/.body`) only runs for **non-2xx HTTP responses** — the two commonest real failures (offline, slow/timeout) bypass it.
- **Risk:** Callers doing `const {data,error} = await invokeFunction(...)` (e.g. `CompatibilityPage.vue:884`, `PersonalHoroscopePage.vue:331`, `ritualRewardsBackend.js`, `pushBackendCore.js:125`) get a thrown error, not `{error}`. Callers without try/catch → unhandled rejection; with try/catch → lose the 403-premium-vs-transient discrimination (`functionErrors.isPremiumRequiredError`). The QA #12/#13 "distinguish premium from transient" design silently doesn't apply offline.
- **Reproduce:** Airplane mode (or throttle past 8s), invoke any function-backed feature → thrown `Timeout after 8000ms`/network error instead of `{data:null,error}`.
- **Fix:** try/catch in `requestJson`/`requestWithRetry`; map transport/timeout failures into the same `{data:null, error, status:0, code:'network'|'timeout'}` shape. One uniform contract.
- **Priority:** P1 · **Complexity:** M

### A-4 · Horoscope cache is not entitlement-keyed → premium upgrade serves stripped content
- **File / Line:** `src/helpers/horoscopeContentCore.js:99-113` (cache read), `:129-136` (save), `:58-73` (`stripPremiumDetailedFromRegistry`).
- **Cause:** For a non-entitled user, the premium `detailed` body (love/career) is stripped **before** persisting, so the cache holds `detailed:''`. The cache slot is keyed only on `date`+`locale`, **not** entitlement. Strip-on-read can only remove detail, never restore it.
- **Risk:** Free user browses (cache saved stripped) → purchases premium **same day** → keeps getting empty love/career `detailed` on every cache hit until the day rolls over or a forced network fetch. Paid user sees empty paid content.
- **Reproduce:** Free → open Horoscope → buy premium → reopen without forced refresh → love/career detail empty.
- **Fix:** Include `isEntitled` in cache validity/key (entitlement change forces refetch), OR cache full rows + strip only on read, OR guarantee the purchase-success path calls `loadHoroscopeRegistry({forceNetwork:true})`. (UNVERIFIED whether a purchase-completed hook forces refresh — none found.)
- **Priority:** P1 · **Complexity:** M

---

## P2 — Important

### A-5 · Premium state reverts on storage-write failure
- **File:** `src/stores/premiumAccess.js:38-49` (`writeToStorage`) + self-listener `:62-64`. **Cause:** sets `state.value`, `setItem` (catch swallows), then **unconditionally** dispatches `PREMIUM_CHANGED_EVENT`; the module's own synchronous listener re-reads `readFromStorage()` (old value) and overwrites the just-set state. **Risk:** after a successful purchase under storage pressure, premium flag flips back to false. **Reproduce:** stub `setItem` to throw → `applyPremiumAccessStatus({active:true})` → `hasPremiumAccess===false`. **Fix:** set memory from `next` directly; skip dispatch on write failure or ignore self-originated events. **P2 · S**

### A-6 · clearUser() doesn't revoke premium (asymmetric with SIGNED_OUT)
- **File:** `authStoreCore.js:320-326` vs `:276-293`. **Cause:** SIGNED_OUT revokes premium inside the store; the synchronous `clearUser()` relies on callers to revoke first (today AccountPage:670/729 do). **Risk:** any future `clearUser()` caller that forgets → stale `active:true` for a logged-out session. **Fix:** call injected `revokePremiumAccess()` inside `clearUser()`; drop redundant manual revokes. **P2 · S**

### A-7 · Production auth observability fully suppressed
- **File:** `authStore.js:9-17` (`authLogger` log/warn are no-ops; error only in DEV). **Cause:** combined with catch-all swallows (`authStoreCore.js:208-210`), every auth/session/profile failure is invisible in prod. **Risk:** silent session-restore / profile-upsert / RC-login failures are undiagnosable (contrast: edge functions now have Telegram alerts). **Fix:** route `authLogger.error/warn` to the existing observability sink in prod. **P2 · S**

### A-8 · Premium-on-resume gating duplicated in three places
- **File:** `App.vue:24-41`, `boot/auth.ts:23-32`, `authStore.js:44-55` vs canonical `premiumAccess.js:96-100` (`resolveBillingPremiumAction`, used only in `PremiumInfoComponent.vue:677`). **Cause:** the "defer/revoke/apply" decision is reimplemented inline 3×, with subtle divergences. **Risk:** premium/auth desync depending on which path last ran (cold start vs resume vs paywall). **Fix:** funnel all four paths through `resolveBillingPremiumAction` + one `applyOrRevoke`. **P2 · M**

### A-9 · Router guard 3s timeout can misclassify a logged-in user as logged-out
- **File:** `router/index.js:48-54,72-77`. **Cause:** guard races `waitForSession()` vs 3000ms; on slow native restore it proceeds with `hasUser=false` while `sessionLoaded` still false → `requiresAuth` (`/account`) redirects to `/login`; App.vue/boot premium sync (gated on sessionLoaded) also no-ops. **Risk:** authenticated user bounced to login on cold start / premium not applied. **Reproduce:** throttle session restore >3s, cold-launch `/account`. **Fix:** on timeout with `sessionLoaded` false, treat auth as *unresolved* (allow/neutral) and re-run gating once `waitForSession` resolves. **P2 · M** *(reported by two passes)*

### A-10 · premiumAccess listeners never removed; duplicate on test reset
- **File:** `premiumAccess.js:51-65` (`ensureListeners`), `:117-120` (`__resetPremiumAccessForTests`). **Cause:** anonymous `storage`/`PREMIUM_CHANGED_EVENT` handlers, no refs kept; reset flips `listenersAttached=false` without `removeEventListener` → next `usePremiumAccess()` adds a second set. **Risk:** test pollution + multiple state writes per event (amplifies A-5). **Fix:** keep handler refs, remove on reset. **P2 · S**

### A-11 · Unguarded localStorage inside a render-path computed (DailyCard)
- **File:** `DailyCardComponent.vue:198-209` (`getOrCreateAnonSeed`), called from `dailySelection` computed ~213. **Cause:** `localStorage.getItem/setItem` with no try/catch, invoked synchronously inside a computed. **Risk:** Safari Private Mode / storage-disabled WebView → throw on every re-render → daily card fails to render (component crash, only logged globally). **Reproduce:** simulate `localStorage.getItem` throwing, mount. **Fix:** try/catch + in-memory seed fallback (as `dailyRitual.js` does). **P2 · S**

### A-12 · Same unguarded localStorage in a computed (Menu)
- **File:** `MenuComponent.vue:388-399`, called from `dailySelection` ~402. Identical to A-11. **Fix:** same; extract one shared guarded helper to kill the duplication. **P2 · S**

### A-13 · Retry only on 401; no retry on transient 5xx/network
- **File:** `supabaseNativeCore.js:106` (`if status !== 401 return`). **Cause:** single retry, 401-only; transient 502/503/504 + network blips never retried (and per A-3 they throw earlier). **Risk:** one transient hiccup = hard user-facing failure. **Fix:** bounded jittered retry (1-2) for idempotent GETs on 502/503/504 + transport errors; keep non-idempotent POSTs out unless idempotent. **P2 · M**

### A-14 · No request cancellation/abort
- **File:** `supabaseNativeCore.js:15-22` (`withTimeout` races a timer, never aborts), `supabaseClient.ts:95-140` (`nativeFetch`/CapacitorHttp has no abort). **Risk:** on timeout the request keeps running (server keeps paying for the 65s tarot OpenAI call — acknowledged in `tarotOracleCore.js:6-9`); navigating away doesn't cancel; late responses resolve into unmounted state. **Fix:** thread `AbortController` through `withTimeout`; accept external signal wired to `onBeforeUnmount`; for CapacitorHttp (no native abort) at least guard stale responses with request-id. **P2 · L**

### A-15 · nativeFetch `status: res.status || 0` → RangeError
- **File:** `supabaseClient.ts:133`. **Cause:** `new Response(body,{status: res.status || 0})`; Response requires 200-599, `0` throws. **Risk:** if CapacitorHttp ever resolves with falsy status, the success branch throws a confusing RangeError instead of a usable error (UNVERIFIED that CapacitorHttp emits 0 on a resolved request, but the fallback is unsafe). **Fix:** safe in-range default (`|| 502`) or treat missing status as transport error. **P2 · S**

### A-16 · Global `fetch` monkey-patched on native
- **File:** `supabaseClient.ts:222-228` (`globalThis.fetch = nativeFetch`). **Cause:** every `fetch` (app + 3rd-party) silently rerouted through CapacitorHttp with `responseType:'text'`; `geocode.js` and future code inherit it. **Risk:** hidden global side effect; streaming/binary/`Response`-semantics consumers can break untraceably; couples unrelated modules to CapacitorHttp. **Fix:** inject `nativeFetch` explicitly (the supabase client & native core already accept it) instead of a global override; if unavoidable, scope+document. **P2 · M**

### A-17 · RevenueCat calls have no timeout
- **File:** `premiumBilling.js:271,292,329,342,379` (configure/getCustomerInfo/getOfferings/purchase/restore). **Cause:** every `Purchases.*` await is unbounded (unlike analytics/native core which use `withTimeout`). **Risk:** stuck native bridge → paywall/purchase/`getBillingPremiumStatus` spinner hangs forever. **Fix:** wrap in `withTimeout` → `{ok:false, reason:'timeout'}`. **P2 · S**

### A-18 · ensureConfigured latches `configure_failed` for the session
- **File:** `premiumBilling.js:262-264`. **Cause:** one failed `Purchases.configure` sets `configureAttempted=true` permanently → all later premium/paywall/restore short-circuit until app restart. **Risk:** a transient boot configure blip permanently disables billing for the session (user can't buy/restore). **Fix:** allow re-attempt (don't latch on transient reasons; reset after cooldown or on explicit purchase/restore tap). **P2 · S**

### A-19 · Dual parallel client stacks
- **File:** `supabaseClient.ts:249-302` (supabase-js wrapper) vs `supabaseNativeCore.js` (hand-rolled REST/functions/auth). **Cause:** two full HTTP/auth stacks share storage+refresh (root of A-2) and duplicate header/refresh logic; the `\n`-corrupted-token workaround exists only on the supabase-js side. **Risk:** divergent behavior, double maintenance, the refresh race. **Fix:** consolidate — native core as the single data+functions+refresh transport on native; restrict supabase-js to the auth handshake with auto-refresh off (or fully commit to one). **P2 · L**

### A-20 · loadRitualDashboard cache ignores params + user identity
- **File:** `ritualRewardsBackend.js:401-434` (globals `:24-26`). **Cause:** single global blob, 45s TTL, keyed on nothing → `days:30` within 45s of `days:7` returns 7-day data; not tagged with userId → account switch within TTL (no intervening invalidate) → B reads A's dashboard. **Risk:** wrong day-range; cross-user data bleed on fast switch. **Fix:** key cache on `(userId, days, dateKey)`; invalidate on auth change. **P2 · S**

### A-21 · Guest reward balance mixes sliding-window earned with cumulative spent
- **File:** `dailyRitual.js:255-280` (earned, pruned to `JOURNEY_RETENTION_DAYS=45`) + `ritualRewardInventory.js:275-288` (spent, cumulative). **Cause:** earned is a 45-day sliding window (`lifetime` is a misnomer, it shrinks); spent never pruned → after earning days age out, balance erodes (clamped 0). **Risk:** wrong balance/lifetime. **Latent** — rewards parked (`REWARDS_ENABLED=false`). **Fix:** persist a monotonic lifetime-earned counter, or prune claims on the same window. **P2 · M**

### A-22 · Horoscope fallback caches tomorrow's rows under today's key
- **File:** `horoscopeContentCore.js:121-136`. **Cause:** when today has no rows it fetches `getNextISODate(today)` but saves with `date: today`; cache guard checks only `local.date === today`. **Risk:** next-day horoscope shown as today's for the rest of the day. **Fix:** store the actual fetched date / surface "upcoming", or don't cache the fallback under today. **P2 · S**

### A-23 · resolveAuthRedirect open-redirect gap
- **File:** `authRedirect.js:8-14`. **Cause:** validation is only `startsWith('/') && !startsWith('//')`; `/\evil.com` passes (some UAs treat `/\` as protocol-relative). The sibling `onboardingRouteTarget.js:39-56` does proper `new URL()` + allowlist. **Risk:** open-redirect if the value ever feeds a full navigation rather than a router push; inconsistent hardening. **Fix:** reuse the `URL`-parse + pathname-allowlist approach (or at least reject backslashes + normalize). **P2 · S**

---

## P3 — Minor / hardening
Each is low-impact; file:line + one-line fix. (S unless noted.)

**State / stores**
- A-24 `appEpoch.js:3-22` — mostly dead reactive state (only `lastBackgroundAt` is read); remove unused or wire a real remount mechanism.
- A-25 `supabaseClient.ts:298-302` + `authStoreCore.js:254` — `resetSupabaseClient` orphans the single `onAuthStateChange` subscription (no callers today; latent). Store+unsubscribe on reset. (M)
- A-26 `authStoreCore.js:132-133` — `syncSession` in-flight dedupe ignores the `refresh` arg (a forced refresh can be downgraded). Key by `refresh`.
- A-27 `premiumAccess.js:76-78,112` — dead exported `syncPremiumAccess` (no callers). Remove/document.
- A-28 `boot/auth.ts:43-76` — `flushProfileQueue` 15s interval not stopped on logout (no-op wakeups). Gate on logged-in.

**Crash / error-handling**
- A-29 `SettingsComponent.vue:432` — `JSON.parse(localStorage...)` in `data()` init; corrupt value blanks the whole screen. Guarded read.
- A-30 `boot/push.js:38,34,147` — unguarded `JSON.parse`/`getLocale`/listener `setItem`; corrupt value aborts re-registration / uncaught async throw. try/catch + fallbacks.
- A-31 `TarotOraclePage.vue:1306` — `card.file` without optional chaining (others use `card?.file`). `card?.file ? ... : ''`.

**Concurrency / races (low-impact)**
- A-32 `boot/auth.ts:63-70` — resume launches `refreshSessionNative()` + `syncSession()` uncoordinated; a null result could clobber a freshly-set user (transient logged-out flicker). Chain refresh→sync; never downgrade non-null user to null without confirmed sign-out. (M, UNVERIFIED)
- A-33 `PersonalHoroscopePage.vue:322-355` — `generate()` has no leading `if (loading.value) return` re-entrancy guard (relies on `:disabled`). Add guard / request-id.
- A-34 `LandingScene.vue:~1405-1415` — home preview loaders write state with no request-id; rapid locale toggle could show stale sign. Add request-id guard. (M, UNVERIFIED)

**Network (hardening)**
- A-35 `supabaseNative.ts:20` — `fetchImpl: fetch` passed unbound (potential `Illegal invocation` on some web engines; moot on native). Bind it. (UNVERIFIED web)
- A-36 `geocode.js:12-13` — `searchCities` `fetch` has no timeout → city autocomplete can hang. AbortController + ~5s → `[]`.
- A-37 `pushBackendCore.js:35-101` — `ensureToken` has no in-flight dedup → concurrent calls double-register push listeners. Memoize in-flight promise.
- A-38 `supabaseNativeCore.js:296` — `error.code` can become an object if server returns `{error:{...}}` → `"[object Object]"` misclassification. Coerce to string when scalar.
- A-39 `supabaseClient.ts:174` — `readStoredSession` returns the cached parsed object by reference (mutation footgun). Return a clone.

**Logic / duplication**
- A-40 Duplicated local-date-key logic: `date.ts:1-7`, `dailyRitual.js:18-23`, `ritualRewardInventory.js:109-115` (byte-identical) + `getNextISODate` (horoscopeContentCore.js:75-87). Consolidate to one `localISODate`.
- A-41 `LandingScene.vue:1335` `_zodiacFromDate` (local components) vs `compatibilityCore.sunSignFromISO` (UTC) — **latent divergence on a sign cusp**. Consolidate on one.
- A-42 Duplicated snapshot helpers: `dailyCardCore.js:1-59` vs `tarotDataSnapshotCore.js:1-19` (identical bar names). Extract shared util.
- A-43 `tarotData.js:4-17` — success path can latch on a falsy resolution (`pending` never reset; error path does reset). Reset `pending=null` on empty payload.
- A-44 `ascendant.js:50-62` — single-iteration tz-offset correction wrong within the ~1h DST transition (Ascendant off by up to a sign). Add a 2nd iteration + policy for ambiguous wall times.
- A-45 `ascendant.js:65-84` — no latitude clamp (tan(phi)→∞ near poles); comment promises a Descendant 180° correction that isn't present (atan2 form likely fine). Clamp lat; fix comment or add correction. (UNVERIFIED)
- A-46 `ritualRewardsBackend.js:19,126-155` — `trackedKeys` Set grows for app lifetime (never pruned). Prune by date / cap.

**Lifecycle / memory (all masked today, latent)**
- A-47 `CompatibilityPage.vue:538-555` — `scoreRaf` not cancelled in `onBeforeUnmount` (RAF runs past unmount if you leave within ~750ms). Add `cancelAnimationFrame`.
- A-48 `CompatibilityPage.vue:567,804-817` — `citySearchTimer` not cleared on unmount (fires a pointless search after leaving). `clearTimeout` in unmount.
- A-49 `SettingsComponent.vue:521-523` — `beforeUnmount` no-op but sets `settings-sheet-open` body class (masked by BlankLayout route-watcher). Remove class on teardown.
- A-50 `BlankLayout.vue:19-26` — `cards-nav-dark` body class NOT in the route-watcher removal list (cleaned per-component today; asymmetric safety net). Add it for parity.
- A-51 `HoroscopeComponent.vue:1207-1209` — untracked 220ms `setTimeout` in `stopLoop()` writes `gpuOn` post-unmount (cosmetic, Vue swallows). Track+clear.
- A-52 `LandingScene.vue:889-895` — `body.dataset.navTapLockUntil` written, never deleted (litters `<body>`; harmless past-timestamp). Delete after the lock window.
- A-53 `MainLayout.vue` — **dead code** (every route uses BlankLayout; zero references). Renders a divergent shell with no nav-hide logic. Delete (with permission) or document.
- A-54 `OnboardingComponent.vue:181-183` — untracked 340ms feedback-reset `setTimeout` fires post-unmount (negligible). Track+clear.

---

## Well-architected (keep — verified strengths)
- **Global error net:** `boot/error-handler.js` (onunhandledrejection + onerror + Vue errorHandler) → fail-safe `crashReporting.js` (nothing in it can throw). Turns floating promises into logged non-fatals.
- **DI core:** `authStoreCore.js` is fully dependency-injected (supabase, locks, prefs, logger, premium-revoke, onUserAuthenticated) with a thin `authStore.js` shell + `__resetForTests` — clean, testable.
- **Storage/JSON discipline:** `localStorageSaver`, `zodiacUserSignCore`, `ritualRewardInventory` (`safeReadJson/safeWriteJson`), `dailyRitual`, `onboardingPrefs`, `supabaseClient` all wrap parse+storage in try/catch with typed fallbacks + `typeof window` guards.
- **Concurrency done right:** `syncSession` (`syncInFlight` + `withTimeout` + always-resolving `sessionReadyPromise`), `withAuthLock`, `storageReadsInFlight` read-coalescing, `ritualRewardsBackend` in-flight singletons, and **`CompatibilityPage.requestAiReading`'s request-id re-check** (textbook out-of-order protection).
- **Date math:** `dailyRitual` uses `Math.round` ms-delta day diffing (DST-safe); `parseDateKey` regex-validates before `new Date`; daily-card determinism is consistent across LandingScene/DailyCard/Menu.
- **Lifecycle teardown:** the heavy components (TarotOraclePage, HoroscopeComponent, LandingScene, MenuComponent, DailyCardComponent, RitualRewardsPage, ConfirmEmailCode) pair every listener/timer/RAF with matching cleanup; BlankLayout's `$route` watcher is a strong global body-class safety net. No GSAP/observer leaks exist.
- **Guard robustness:** both guard awaits are `Promise.race`-timed so a stalled native read can't hang the app; redirect targets carry `allowWithoutOnboarding` (no loops); `catchAll` clean.
- **Defensive parsing:** `premiumBilling` RC payload normalizers, `relationshipReminder` thenable-proxy trap avoidance, `authErrors`/`functionErrors` classification helpers (no raw backend strings to UI).

---

## Passes & completeness
- 5 dimensions × 3–4 internal passes each; last pass in every dimension yielded **0 new P1/P2** (only P3 hardening), indicating convergence.
- Headline P1s (A-1, A-2) re-verified by hand against source.
- **Out of scope for Stage 1** (covered in later stages): UX/visual (Stage 2), test coverage matrix (Stage 3), exhaustive edge cases (Stage 4), Apple Review compliance (Stage 5), final synthesis (Stage 6).

## Recommended fix order (architecture)
1. **A-1** (PII bleed) — S, privacy.
2. **A-2** (refresh storm / logouts) — M, UX integrity.
3. **A-3** (throw-on-offline) — M, robustness; unblocks correct error UX everywhere.
4. **A-4** (entitlement cache) — M, monetization/trust.
5. Then A-5/A-6/A-9 (premium+auth consistency), A-11/A-12 (storage-disabled crash), A-17/A-18 (billing resilience), A-20 (dashboard cache).

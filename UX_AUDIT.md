# UX AUDIT — Arcana Insight

**Date:** 2026-06-30 · **Stage:** 2 of 6 · **Mode:** read-only (audit only, no code changes)

> Capacitor (Vue 3 + Quasar) hybrid iOS app. Audited by 5 parallel read-only passes (navigation/flow, core daily-loop screens, auth/onboarding/account, premium/compatibility/saved, copy/dialogs), each ≥3 internal passes, grounded in the real `.vue` files + `src/i18n/messages.bundle.js` + docs.

## Severity legend
`P1` blocking / invisible failure on a critical path · `P2` real defect, disorientation, or trust/honesty issue · `P3` friction, polish, copy, dead code, doc drift.
**P1: 3 · P2: 12 · P3: ~30.** No flow has an unrecoverable hard dead-end (every gated screen has an escape), but several have invisible failures and broken back/tab affordances.

---

## 1. App Map — Screen Inventory

All screens render inside `BlankLayout.vue`. Bottom nav has **4 tabs only**: Home · Horoscope · Tarot · Menu.

| Path | Name | Role | Nav shown | Tab lit | Gating |
|------|------|------|-----------|---------|--------|
| `/` | arcana | Home / daily hub | ✅ | Home | onboarding |
| `/horoscope` | horoscope | Horoscope | ✅ | Horoscope | onboarding |
| `/personal-horoscope` | personalHoroscope | Drill-down (gated depth) | ❌ | — | onboarding |
| `/tarot` | tarot | Tarot session (tab dest) | ❌ *(F-UX4)* | — | onboarding |
| `/tarot-interpretation` | tarotInterpretation | Reading result | ❌ | — | onboarding |
| `/menu` | menu | Utility hub (+ Settings) | ✅ | Menu | onboarding |
| `/daily` | daily | Daily card drill-down | ❌ | — | onboarding |
| `/cards` | cards | Card library | ✅ | none | onboarding |
| `/zodiac-guide` | zodiacGuide | Zodiac guide | ✅ | none | onboarding |
| `/compatibility` | compatibility | Compatibility | ✅ | none | onboarding |
| `/readings` | readings | Saved readings (premium/anon gated) | ✅ | none | onboarding |
| `/premium` | premium | Paywall | ❌ | — | onboarding |
| `/settings` | settings | Settings | ✅ | none | onboarding |
| `/account` | account | Account | ✅ | none | **requiresAuth** |
| `/support` | support | FAQ | ✅ | none | allowWithoutOnboarding |
| `/privacy-terms` | privacyTerms | Legal | ✅ | none | allowWithoutOnboarding |
| `/login` `/sign-up` `/confirm-code` `/reset-password` | auth | Auth (passwordless OTP + Apple) | ❌ | — | allowWithoutOnboarding |
| `/onboarding` | onboarding | Setup gate | ❌ | — | allowWithoutOnboarding |
| `/rewards` | ritualRewards | **Parked** (REWARDS_ENABLED=false → /menu) | n/a | — | redirect |
| `/:catchAll` | — | ErrorNotFound (→ home) | ❌ | — | none |

## 2. User-Flow Map
```
COLD LAUNCH → guard (≤3s session + ≤2s onboarding hydrate)
  ├─ onboarding incomplete → /onboarding?from=<target> → resolveOnboardingRouteTarget
  │        from ∈ {/,/menu,/horoscope,/tarot,/daily} → push(from);  else → replace('/')
  └─ complete → requested route (or '/')

HOME ── hero → /daily ;  focus-today → /horoscope ;  next-ritual → /daily|/horoscope|/tarot|/readings ;  tabs
HOROSCOPE ── upsell → /premium ;  (Menu) → /personal-horoscope → goPremium | /sign-up
TAROT TAB → /tarot [NAV HIDDEN] ── draw → /tarot-interpretation ── premium → /premium ;  gift → /login?redirect=/tarot
MENU ── launcher → /daily ;  personalized → /tarot|/horoscope|/daily ;  Home|Compatibility|Cards|Readings|ZodiacGuide|PersonalHoroscope|Premium ;  Settings → Account|/login
PREMIUM ── back/close → back()/home ;  sign-in → /login?redirect=fullPath
READINGS ── locked → /premium ;  anon → /login ;  ok → list
AUTH ── success → redirect||'/' ;  close → /menu  (F-UX5)
```

## 3. Dialog / Sheet / Toast Inventory (13 sheets/dialogs)
DeleteAccount confirm (persistent ✓), Account edit-name + DOB sheets (handle-only), Tarot card preview (Back+Close ✓), Tarot options sheet (persistent, no Cancel), Settings language + time sheets, Home astro sheet (Close ✓), CardLibrary detail (✓), SavedReadings detail + delete-confirm (✓), Compatibility DOB + save sheets (handle-only). Toasts: tarot upsells (w/ CTA), push errors, billing results, `errors.generic`, rewards-sync (best-in-class, has retry action). Global toast config: bottom, 2600ms, `arcana-toast`.

---

## P1 — Blocking / invisible failure
**ALL FIXED 2026-06-30:** UX-1 + UX-2 (28422f1), UX-3 (e2648d5). 247 tests green, lint+build clean.

### UX-1 ✅ FIXED · OTP confirm screen never shows errors
- **File:** `src/components/auth/ConfirmEmailCode.vue` — `errorMessage` assigned at 121/133/165/170/206 but **no template element renders it** (template 236-279).
- **Why:** wrong code, expired code, "no session", and rate-limited resend all produce **zero visible feedback** on the most-used auth path. Looks like nothing happened. Conversion killer; only shows on device.
- **Fix:** render `errorMessage` under `CodeInput`; surface resend success/failure too.

### UX-2 ✅ FIXED · OTP confirm has no retry after a failed auto-submit (stuck)
- **File:** `ConfirmEmailCode.vue:29-35` — only trigger is the watcher `code.length === 6 → confirm()`. After a failure the 6 digits remain, the watcher doesn't re-fire, and there's no submit button → user appears stuck (must delete + retype).
- **Fix:** on failure clear the code + refocus, and/or add an explicit "Verify" button.

### UX-3 ✅ FIXED · Account deletion failure is silent
- **File:** `AccountPage.vue:688-756` — failure paths `return` with no UI; outer `catch {}` empty; `finally` closes the dialog. The string `accountPage.deleteAccountFailed` exists but is **never referenced**.
- **Why:** on a server/network failure the confirm dialog just vanishes with the account intact and no feedback — the user can't tell if deletion succeeded. Trust- and App-Store-sensitive.
- **Fix:** on any failure show a negative toast (wire the existing `deleteAccountFailed` key) and keep the dialog open / re-enable the button.

---

## P2 — Real defect / disorientation / honesty

### UX-4 · Tarot tab hides the bottom nav (broken tab model)
`routes.js:14` (`tarot` → `hideBottomNav:true`). 1 of 4 primary tabs removes the tab bar; to leave Tarot the user must hit the in-page exit (goes *back*), and the Tarot tab can never show its active state. HIG expects the tab bar to persist on top-level destinations. **Fix:** keep nav on the Tarot landing/idle state, hide only once an immersive reading session starts (or demote Tarot from a tab).

### UX-5 · Auth "back" always dumps to /menu
`LoginView.vue:235-237`, `SignUpScene.vue:311`, `ConfirmEmailCode.vue:140` — close/back unconditionally `push('/menu')`, ignoring origin, real history, and the `redirect` query. A user sent to login from the paywall taps back → lands in Menu (somewhere they never were). **Fix:** guarded `router.back()` with home fallback, or honor `redirect`/`from`.

### UX-6 · Five back buttons have no fallback (bare `router.back()`)
`SavedReadingsPage.vue:392`, `CompatibilityPage.vue:1162`, `CardLibraryPage.vue:271`, `ZodiacGuideComponent.vue:1259`, `FaqSupportComponent.vue:89`. Every other focused screen guards `history.length>1 ? back() : home`. On a deep-link/first-nav entry these silently no-op (back looks broken). Not a hard dead-end (these keep the nav) but inconsistent. **Fix:** one shared guarded-back helper everywhere.

### UX-7 · OTP edit-email pencil → /login even during signup (typo dead-end)
`ConfirmEmailCode.vue:239` always links to `/login`. A new user fixing a mistyped email lands on Login, loses name + signup intent; re-entering there → `shouldCreateUser:false` → "not registered" loop. **Fix:** route edit by mode (`/sign-up` when signing up), preserving `name`/`redirect`.

### UX-8 · Onboarding lets you pick more than the framed max ("6/3", progress 200%)
`OnboardingComponent.vue` counter `selectedCount/3`, `progressWidth=(selectedCount/3)*100`, `toggleInterest` has no cap; Settings shows the same interests with no "/3" framing. **Fix:** enforce a 3-item cap OR drop the "/3" framing + 3-based progress so the two screens agree.

### UX-9 · Apple Sign-In errors are raw, untranslated, developer copy
`LoginView.vue:149/185/189/226`, `SignUpScene.vue:226/247/264/290/301` — e.g. "No identity token from Apple", "Profile error: …". Apple is a primary v1 method; failures show hardcoded English debug strings (breaks i18n for uk). **Fix:** map to localized keys (`errors.generic` + a dedicated `auth.appleFailed`); never interpolate raw provider strings.

### UX-10 · Paywall leaks env-var internals into user copy
`PremiumInfoComponent.vue:79` renders `billingUnavailableMessage` built at `:465-468` from keys `premiumPage.billingIssues.missingApiKey`/`.pluginMissing` — literally "VITE_RC_IOS_API_KEY is missing for the iPhone build." / "RevenueCat Purchases plugin is not connected…". Reads as a crash to a buyer at purchase intent. **Fix:** show the friendly `billing.errors.config` ("Store configuration unavailable. Try again later."); keep env text in console only.

### UX-11 · Settings shows raw "No permission / no token" toast
`SettingsComponent.vue:656`, key `notifications.noPermission`. "no token" is meaningless. **Fix:** "Notifications are off. Enable them for Arcana Insight in iOS Settings to get daily reminders."

### UX-12 · Home hero can sit as an empty skeleton with a working CTA
`LandingScene.vue:1361-1382` — daily-card load failure only `console.warn`s; `dailyCardData` stays null → hero shows an unlabeled skeleton, and the reveal CTA still flips to it. No retry/error on Home. **Fix:** inline retry (reuse `common.retry`) or suppress the reveal until data exists. (Recovery only via tapping through to `/daily`.)

### UX-13 · Tarot empty card pool → stuck "cards ready" scene with no cards
`TarotOraclePage.vue` — `loadCardPoolSafe` (701) only warns; no guard in `touchDeck`/`startSpreadScene`/`drawCards` for an empty pool → "reading ready" prompt with zero cards and `isReadingComplete` never true → interpretation never appears, only the exit arrow. Low probability (local bundle) but severe/silent. **Fix:** if pool empty, block draw + show error+retry (`loadCardPoolSafe`) or route home.

### UX-14 · Compatibility: delete a saved person — instant, no confirm, sub-44px target
`CompatibilityPage.vue:990` (`deleteConnection`) fires directly from a 38px `×` flush against the open button. A mis-tap permanently erases a saved person (name + birth data), no undo — inconsistent with Saved Readings (which confirms). **Fix:** confirm dialog or undo toast + 44px hit target.

### UX-15 · UK ти/ви register is inconsistent (machine-translated feel)
Compatibility block uses formal Ви/Ваші while rewards/readings/onboarding/errors use informal ти; worst case one string mixes both — `messages.bundle.js:3505` `'…вашими картами · твоя планета ↔ її'`. ~28 formal vs ~74 informal. EN unaffected. **Fix:** normalize to one register (app is predominantly informal "ти"); fix line 3505 first.

---

## P3 — Polish / friction / copy / dead code / docs
Grouped; each is low-impact.

**States & feedback**
- DailyCard meaning text hard-clamped (4→2 lines) with no "more" affordance (`DailyCardComponent.vue:507`).
- PersonalHoroscope error text (body) and its retry (sticky footer Generate) are visually disconnected.
- Compatibility: "You" DOB never persisted → re-entered every session (`CompatibilityPage.vue:1266-1293`); reminder-permission-denied and failed/empty city geocode are silent.
- CardLibrary shows "0 cards" count during the error state (gate `cards-count` on `!loadError`).
- Account name-edit fails silently (sheet closes before `editError` shows, `AccountPage.vue:638-654`); `errors.saveFailed`/`errors.generic` (delete-reading) are terse/non-actionable.

**Navigation & flow polish**
- Inconsistent post-auth landing: some paths → `/` , some → `/menu`. Pick one.
- Menu duplicates the always-present Home tab (`MenuComponent.vue:264-268`).
- Cold-start guard can block first paint ~5s worst case (sequential 3s+2s races) — consider a splash / parallelize.
- Home astro sheet has dead action handlers (`handleAstroSheetAction`, no CTA in template); hero needs two taps (reveal then open); DailyCard has redundant Close + Back.

**Tarot**
- ~10s first-session intro narration has no skip; long multi-step funnel for a daily action.

**Auth polish**
- Enter/Return key doesn't submit on Login/SignUp; auth back buttons 36px (apply `hit-44`); Login over-broad 4xx→"email not registered" mapping; ResetPasswordPage is vestigial (passwordless app) — remove or document; delete-account shows an unexplained ~5s spinner; onboarding duplicate "Interests" label ×3 + 0-selected Continue==Skip.

**Dialogs**
- Handle-only/persistent sheets lack a visible Cancel/Close: Account edit + DOB, Compatibility DOB + save, Tarot options sheet. Add an explicit dismiss control.

**Paywall**
- Value restated 3× (outcome chips + 6-tile grid + 5-row compare) → long scroll before plans; no "Manage subscription" deep link for existing subscribers; plan price flashes the pending fallback before catalog resolves; dead `outcomePoints[].text` data.

**Saved Readings**
- "Not logged in" empty/CTA branch is effectively unreachable (premium ⇒ signed in) — dead UX; reading cards are clickable `<article>`s, not buttons (minor a11y).

**Doc / product drift**
- 🔴 `docs/screen-status.md:20` claims "`hideBottomNav` route meta is dead/unused" — **FALSE and dangerous**: `BlankLayout.vue:11-13` uses it to hide the nav (tarot/premium/daily/auth). Correct before someone removes it.
- `docs/flow-map.md` still lists `/rewards` as live + a Rewards Flow section (parked); doesn't note `/tarot` hides the nav.
- `docs/premium-matrix.md:52` lists Compatibility as Free:No, but the app ships a rich free synastry preview (1 teaser dimension); `monetization-analysis.md` is correct. Update the matrix row.
- `src/layouts/MainLayout.vue` is dead code (no route/import references it).

---

## Per-screen states coverage (core loop)
| Screen | loading | empty | error | offline |
|--------|---------|-------|-------|---------|
| Home | ✓ | ✓ | ✗ (UX-12) | ✓ |
| Daily Card | ✓ | ✓ | ✓ | ✓ |
| Horoscope | ✓ | ✓ | ✓ | ✓ |
| Personal Horoscope | ✓ | ✓ | ✓ | ✓ |
| Tarot Oracle | ✓ | ✗ (UX-13) | ✓ (AI) | ✓ |
| Tarot Interpretation | n/a | ✓ | n/a | ✓ |
| Zodiac Guide | ✓ | ✓ | ✓ | ✓ |
| Card Library | ✓ | ✓ | ✓ | ✓ |

## Confirmed healthy (no action)
- No unrecoverable dead-ends: every gated screen has an escape CTA (Readings→Premium/Login, Premium→home, Account guard→Login w/ redirect, catchAll→home).
- Onboarding sanitizes `from` (allow/block lists), never returns into a gated screen; both Continue & Skip persist completion (no loop).
- OTP resend has a 60s cooldown + `autocomplete="one-time-code"`; logout clears session/premium/user → /menu.
- Monetization is honest: trial gated on a real detected offer, full auto-renew footnote, Restore + Terms/Privacy present, locked copy explains free-vs-premium — no dark patterns / fake scarcity.
- Recent fixes verified: bottom nav shows on Compatibility & highlights only on own route & taps navigate from sub-pages; daily-card error/retry; account email read-only hint; auth divider hidden on web.

## Methodology / passes
5 dimensions × 3–4 passes each; convergence reached (final passes only surfaced P3). Operating principle (per owner): risky-but-unneeded items are documented, not changed pre-launch; everything gets verified before claiming done.

## Suggested fix order (UX)
1. **UX-1, UX-2, UX-3** (P1, invisible failures — all SAFE, high-value): OTP error rendering + retry, delete-account feedback.
2. **UX-6** (consolidated guarded-back across 5 screens) + **UX-5** (auth back) — SAFE, removes broken-back affordance.
3. **UX-10, UX-11, UX-9** (user-facing copy leaks/jargon/untranslated) — SAFE copy fixes.
4. **UX-8** (onboarding cap), **UX-14** (compat delete confirm), **UX-12/UX-13** (Home/Tarot empty-state guards) — SAFE.
5. **UX-4** (Tarot tab nav) — bigger UX change, decide deliberately.
6. **UX-15** (UK tone) — large copy sweep; do as a focused pass.
7. P3 + doc drift — batch.

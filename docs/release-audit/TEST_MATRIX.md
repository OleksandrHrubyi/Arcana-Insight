# Stage 3 — Test Matrix (maximal coverage)

Date: 2026-07-02. Goal: coverage dense enough that the chance of a new bug after
running all of it is minimal. Automation legend: **[A]** already automated ·
**[P]** Playwright-addable · **[U]** unit-testable · **[D]** device-only manual.

Current automation baseline: `npm test` **249 unit/logic** [A]; `npx playwright
test flows|smoke` (logged-out/free dead-end + route-mount + bottom-nav) [A].
Everything below marked [P]/[U] is a gap to add; [D] is the owner's device pass.

---

## PART 1 — Cross-cutting suites (run against every relevant screen)

### 1.1 Authentication (states: OUT / free / premium)
| ID | Case | Type | Auto |
|---|---|---|---|
| AUTH-01 | Email OTP: valid email → code → verify → land on `redirect` target | Func/Auth | [P] |
| AUTH-02 | Wrong OTP → inline `wrongOrExpiredCode`, input clears, retype re-submits | Negative | [P] |
| AUTH-03 | Expired OTP → error, resend re-arms 60s cooldown | Negative | [P] |
| AUTH-04 | 429 on OTP **send** → should show `tooManyAttempts` (BUG A3: shows generic) | Negative | [P] |
| AUTH-05 | 429 on OTP **verify/resend** → `tooManyAttempts` | Negative | [P] |
| AUTH-06 | Sign-up name <2 / invalid email → inline validation | Boundary | [P] |
| AUTH-07 | Apple Sign-In (iOS) → session or getUserNative fallback → redirect | Auth | [D] |
| AUTH-08 | Sign-in redirect threaded from guard/paywall/deeplink → returns to origin | Nav | [A] flows |
| AUTH-09 | Logout → premium revoked, RC de-aliased, account-scoped flags cleared | Security | [U] |
| AUTH-10 | **A/B account switch on same device → no PII bleed** (BUG A1: compat connections leak) | Security | [U] |
| AUTH-11 | Delete account → cascade deletes all user rows + auth user; failure keeps account + notify | Auth/Sec | [D]+[U] |
| AUTH-12 | Deep-link `/confirm-code` w/o email → generic error, no crash | Negative | [P] |
| AUTH-13 | Reset-password invalid/expired link → `invalidLink` + Login CTA (no dead-end) | Negative | [P] |

### 1.2 Subscription / Billing (states: OUT / free / premium)
| ID | Case | Type | Auto |
|---|---|---|---|
| SUB-01 | Logged-out taps Buy/Restore → gated to `/login?redirect=premium` (no anon charge) | Security | [A] flows |
| SUB-02 | Purchase monthly/yearly → entitlement applied, CTA flips to "You're Premium" | Sub | [D] |
| SUB-03 | **StoreKit success but no entitlement (id mismatch) → user told to Restore, not "failed"** (BUG B1) | Negative | [D] |
| SUB-04 | Restore (fresh install, real sub) → premium returns | Sub | [D] |
| SUB-05 | Restore as non-subscriber → no unlock + correct message | Negative | [D] |
| SUB-06 | Cancel → premium persists to period end, then revokes (webhook EXPIRATION) | Sub | [D] |
| SUB-07 | Entitlement survives app restart AND background→resume | Sub | [D] |
| SUB-08 | Guest purchase → sign-in → entitlement follows (RC alias) | Sub | [D] |
| SUB-09 | Offline purchase/restore → network notify, no hang | Network | [D] |
| SUB-10 | Free-trial intro (price 0) renders "N-day free trial"; discounted intro shows duration+then-price (BUG B3) | UI/Sub | [D] |
| SUB-11 | `pricePending` → Buy CTA should disable (BUG B4) | Boundary | [P] |
| SUB-12 | Server 403 revoke-on-client → no sync thrash on resume (BUG B2) | Regression | [U] |
| SUB-13 | Webhook out-of-order EXPIRATION after RENEWAL → premium stays | Backend | [U]/[D] |

### 1.3 Premium gating invariant (premium ⇔ logged-in AND entitled)
| ID | Case | Type | Auto |
|---|---|---|---|
| PREM-01 | Free: horoscope love/career blurred + unlock overlay → tap opens paywall (not inert, no auto-bounce) | Func | [A] flows |
| PREM-02 | Free: tarot 3/5 spread → upsell → paywall; 1 free single/day then daily-spent | Func | [P] |
| PREM-03 | Free: compatibility dimensions locked (teaser) → tap opens paywall | Func | [P] |
| PREM-04 | Free: saved readings gated → lock/upsell | Func | [A] flows |
| PREM-05 | **Free: horoscope love/career `detailed` NOT on the wire** (BUG H1/LR-26 — server leak) | Security | [U]/[D] |
| PREM-06 | Server `RC_ENFORCE_PREMIUM`: non-entitled → 403 on personal-horoscope/tarot-reading | Security | [D] |
| PREM-07 | Locked-tap everywhere opens paywall, never dead / never auto-redirect loop | Func | [P] |

### 1.4 Offline / Network (each primary screen)
| ID | Case | Type | Auto |
|---|---|---|---|
| NET-01 | Cold-start offline → home degrades (hero + fallback), **needs a global offline cue** (BUG N6) | Offline | [D] |
| NET-02 | Horoscope offline → cache fallback then error+retry (not infinite skeleton) | Offline | [P] |
| NET-03 | Tarot AI offline/timeout → premium fallback / basic, spinner clears (no hang) | Offline | [D] |
| NET-04 | Compatibility offline → deterministic result renders; AI shows error+retry | Offline | [P] |
| NET-05 | 3G/slow: AI ≤65s client vs 60s server buffer; loading dots don't jump | Perf/Net | [D] |
| NET-06 | WiFi↔LTE handoff mid-request → request completes or clean error | Network | [D] |
| NET-07 | 401/403/404/429/500/502/503 from each edge fn → mapped error, no raw leak, retry sane | Negative | [P]/[U] |

### 1.5 Localization (en / uk)
| ID | Case | Type | Auto |
|---|---|---|---|
| L10N-01 | en/uk key parity, no missing key (raw-key render) | Loc | [A] i18nMessages |
| L10N-02 | Plural agreement (карта/карти/карт; day forms) | Loc | [A] pluralForm |
| L10N-03 | Device-language default on first launch (uk device → uk) | Loc | [U] |
| L10N-04 | Language switch mid-session updates all visible copy | Loc | [P] |
| L10N-05 | No mixed-language leftovers (recent uk copy pass) | Loc | [P] |
| L10N-06 | Long-string layout (uk longer) → no overflow/clip on small iPhone | UI | [D] |

### 1.6 Navigation / routing
| ID | Case | Type | Auto |
|---|---|---|---|
| NAV-01 | Every route mounts; bottom-nav shown/hidden per `meta.hideBottomNav` | Nav | [A] smoke |
| NAV-02 | Not-onboarded → forced to onboarding except `allowWithoutOnboarding` | Nav | [P] |
| NAV-03 | **Not-onboarded hits bad URL → reaches 404, not onboarding** (BUG N3) | Nav | [P] |
| NAV-04 | **Deep-link target preserved through onboarding gate** (BUG N2) | Nav | [P] |
| NAV-05 | requiresAuth `/account` logged-out → login w/ redirect | Nav | [A] flows |
| NAV-06 | Back-nav from every screen → history-or-home, no dead-end/loop | Nav | [P] |
| NAV-07 | Hidden bottom-nav does not steal taps (visibility:hidden) | Regression | [A] |
| NAV-08 | `/rewards` → redirects to menu (parked) | Nav | [P] |
| NAV-09 | Standalone `/settings` deep-link → has a back path (BUG N8) | Nav | [P] |

### 1.7 Accessibility
| ID | Case | Type | Auto |
|---|---|---|---|
| A11Y-01 | Tap targets ≥44pt (per LR enterprise pass) | A11y | [D] |
| A11Y-02 | VoiceOver: horoscope wheel arrow-steps signs; aria-labels on icon buttons | A11y | [D] |
| A11Y-03 | Dynamic Type / larger text → no clipping | A11y | [D] |
| A11Y-04 | Contrast on dark theme legible (WCAG AA) | A11y | [D] |
| A11Y-05 | Reduced-motion honored (animations gated) | A11y | [P] |

### 1.8 Performance / memory
| ID | Case | Type | Auto |
|---|---|---|---|
| PERF-01 | Cold start to first paint < 2s, no white flash | Perf | [D] |
| PERF-02 | Giant components (TarotOracle/LandingScene) scroll/animate at 60fps | Perf | [D] |
| PERF-03 | Memory warning during tarot video stage → no crash | Stress | [D] |
| PERF-04 | Long session / repeated navigation → no leak (timers cleared on unmount) | Memory | [D] |

---

## PART 2 — Per-screen functional/UI/regression cases

> Only the screen-specific highlights; cross-cutting suites (Part 1) also apply.

### Home / LandingScene
FUNC: hero card → daily; daily-track → next ritual / revisit-readings when complete; focus-today full-sentence (no mid-word cut, both states) [regression]; astro cards → sheet. STATE: no-sign focus-today fallback; astro strip hides offline. REG: focus-today prompt shows full text (this-session fix); **home refresh on resume/midnight (BUG N1)**.

### Onboarding
FUNC: pick ≤3 interests (4th blocked); Continue/Skip both complete; **language picker (wheel) → setLocale** [regression this session]. BOUNDARY: 0 interests → Continue still works (BUG N4). PERSIST: completion in localStorage + native Preferences backup.

### Tarot Oracle
FUNC: full stage machine theme→question→spread→draw→reveal→interpretation. REG: **custom-question input visible + focus ring** (this-session); **wheel defaults to "Confirm question" disabled until valid** (this-session); question validation 10–220 chars + ≥4 alnum. NEGATIVE: **reward-spread bypass after failed consume (BUG T1)**; **deck double-tap re-entrancy (BUG T2)**; empty deck → notify+abort. STRESS: 100 rapid deck taps → single draw. EDGE: kill-app mid-draw (free spent, BUG T6); daily_spent state.

### Tarot Interpretation
FUNC: reading render, per-card, advice, share/end/new; free-gift banner; aha upsell. NEGATIVE: **empty (no sessionStorage) → Share inert (BUG T5)**; reload/deep-link → empty state. REG: **free-AI sign-in promise honored** (BUG T3).

### Horoscope
FUNC: sign wheel drag/arrows; 3 theme panels; locked love/career → paywall. STATE: load-error+retry (LR-04 regression); empty cron gap; offline cache. NEGATIVE: **premium detailed not leaked (BUG H1)**; 403 revoke reconciles; **401 stale-flag handling (BUG H4)**. EDGE: midnight rollover on resume.

### Personal Horoscope
FUNC: premium+DOB gate → generate; regenerate; share. STATE: not-premium lock / no-DOB CTA / loading / error / reading. NEGATIVE: **language switch shouldn't burn a generation (BUG H3)**; provider-fail → generic error; 403 revoke.

### Compatibility
FUNC: pick A+B (DOB wheel, optional time+city); rel-type; reveal (deterministic + AI premium); dimensions; save connection (dedupe); weekly reminder. NEGATIVE: **reminder denial silent (BUG C1)**; **reminder names newest not ranked (BUG C2)**; **401 AI retry loop (BUG C3)**; **same-person A==B guard (BUG C6)**; openConnection abandoned-backdrop mutates partner (BUG C4). PRIVACY: partner PII local; disclaimer present.

### Card Library / Daily Card / Zodiac Guide
FUNC: filters/search/detail (library); deterministic daily card + error+retry; zodiac static + favorites/share. All free, offline-safe. REG: `cardsPage.count` plural (this-session).

### Menu / Settings / Account / Saved Readings
FUNC: menu items nav; settings language/time/push/interests; account edit name/DOB, sign-out, delete-account; saved readings list/detail/delete (premium-gated). NEGATIVE: **offline edit "saved" cue (BUG A5)**; delete-reading failure toast; **A1 PII clear on logout**. NAV: **standalone /settings back button (BUG N8)**.

### Paywall
See Part 1.2/1.3. UI: plan tiles, yearly pre-selected, per-month price, trial label, legal links, disclosure footnote.

### 404 / offline / error / empty / loading
Every async surface must show success/empty/error/retry (no silent blank/infinite spinner). **404 reachable for not-onboarded (BUG N3)**. Global offline cue (BUG N6).

---

## PART 3 — Regression tests to ADD (every found bug → a test)
Priority order (SHOULD-FIX bugs first). Each becomes a Playwright flow or unit test:
T1 reward-spread bypass · T2 deck re-entrancy · T3 free-AI promise · B1 silent-charge messaging · B2 403 thrash · H1 detailed-leak (server) · H3 locale re-gen · C1 reminder-silent · C2 reminder-subject · C3 401 loop · A1 PII-clear-on-logout · A2 reset-flow · N1 home-resume · N2 deeplink-through-onboarding · N3 404-not-onboarded · N4 continue-vs-skip.
Plus keep: focus-today full-text, tarot input visible + wheel default, pluralForm, i18n parity (this-session regressions already in suite or to add).

# Stage 4 — Edge Cases & Chaos Engineering

Date: 2026-07-02. Attempt to break the app. Verdict per scenario: **SAFE** (handled
in code) · **GAP** (real weakness → fix) · **DEVICE** (must verify on hardware).
Tags [code] verified reading · [device] needs a run.

---

## 1. Concurrency / rapid input
| # | Scenario | Verdict | Detail (file:line) |
|---|---|---|---|
| 1.1 | 100 rapid deck taps (tarot) | **GAP** | `touchDeck` has no top-level lock; `isDeckHotspotActive` cleared only after awaits → re-entrant double draw / double token spend. **BUG T2** `TarotOraclePage.vue:1624-1689`. Add `isChoiceTransitioning`-style guard. |
| 1.2 | Double-tap Accept interpretation | SAFE | guarded `interpretationLoading || decision==='yes'` `:2042` |
| 1.3 | Rapid wheel confirm | SAFE | `isChoiceTransitioning` guard on wheel |
| 1.4 | Rapid rel-type / re-pick (compatibility) | SAFE | `aiRequestId` discards stale responses `CompatibilityPage.vue:901`; RAF cancel `:560` |
| 1.5 | Double-tap Buy | SAFE | `purchasing`/`anyLoading` guards `PremiumInfoComponent.vue` |
| 1.6 | Spam language toggle (personal horoscope) | **GAP** | each toggle calls `generate()` → model call + 30s spinner. **BUG H3** `PersonalHoroscopePage.vue:420` |
| 1.7 | Tap card during deal animation | SAFE | blocked until all flipped `:1701` |
| 1.8 | 10 concurrent background Tasks (rituals/analytics) | SAFE | fire-and-forget, caught; ritual award now atomic RPC |

## 2. App lifecycle
| # | Scenario | Verdict | Detail |
|---|---|---|---|
| 2.1 | Kill app mid-draw | **GAP (value loss)** | free daily marked at draw-start `:1655`, reward token consumed at `touchDeck` → relaunch loses the reading. **BUG T6** |
| 2.2 | Kill app mid-AI-generation | SAFE | server refunds free-grant on all-providers-fail `tarot-reading:129`; no partial write |
| 2.3 | Delete account during generation | SAFE | cascade delete atomic; in-flight call just 401s after `delete-account:93` |
| 2.4 | Background → resume (short) | SAFE | premium re-synced `boot/auth.ts:56`, `App.vue:75` |
| 2.5 | Background overnight → resume | **GAP** | home not refreshed (greeting/date/streak stale). **BUG N1** `LandingScene.vue:689` (Menu does refresh) |
| 2.6 | Midnight rollover while open | PARTIAL | horoscope/daily re-fetch on foreground (`isDayKeyStale`) SAFE; home stale until remount (N1) |
| 2.7 | Foreground after long time, expired session | SAFE | `syncSession` retry; 401 → login redirect; no infinite spinner |
| 2.8 | Rotation | DEVICE | safe-area + dvh + max-width used; confirm portrait lock in Info.plist |
| 2.9 | Memory warning during video tarot stage | DEVICE | WKWebView video; needs device check for crash/reload |
| 2.10 | Low battery / low-power mode | DEVICE | animations (GSAP) — verify no jank/watchdog kill |

## 3. Network transitions
| # | Scenario | Verdict | Detail |
|---|---|---|---|
| 3.1 | Offline cold start | **GAP** | home degrades (hero+fallback) but **no offline banner** anywhere. **BUG N6** — Apple tests airplane mode |
| 3.2 | Offline during REST (horoscope) | SAFE | cache fallback → error+retry (LR-04) not infinite skeleton |
| 3.3 | Offline during AI generation | SAFE | throws → premium fallback / basic, spinner clears in `finally` |
| 3.4 | Offline during purchase/restore | SAFE | `network_error` notify, no hang |
| 3.5 | Very slow 3G, AI ~60s | SAFE-ish | client 65s > server 60s buffer; loading dots fixed-width (no jump). Verify no 30s webview stall [device] |
| 3.6 | WiFi→LTE / LTE→WiFi mid-request | DEVICE | request should complete or clean-error; verify no dupe |
| 3.7 | DNS/host down (Supabase) | SAFE | `fetchWithTimeout` fails fast, mapped error |

## 4. HTTP error codes (each edge fn)
| # | Code | Verdict | Detail |
|---|---|---|---|
| 4.1 | 401 (no/expired token) | PARTIAL | tarot/personal server-gated; **client 401 on personal/compat not special-cased → generic-error retry loop**. BUG H4/C3 |
| 4.2 | 403 premium_required | SAFE | `isPremiumRequiredError` → `revokePremiumAccess` reconciles; but see thrash BUG B2 |
| 4.3 | 404 | SAFE | catch-all page; but **not-onboarded can't reach it** BUG N3 |
| 4.4 | 429 rate-limit | PARTIAL | OTP verify/resend mapped; **OTP send not mapped** → generic. BUG A3 |
| 4.5 | 500/502/503 provider | SAFE | OpenAI→OpenRouter→`AI_UNAVAILABLE`; structured non-leaking error; retry available |
| 4.6 | Server returns unsafe AI text | SAFE | `containsDisallowed` (EN+UK) drops/rejects → fallback |
| 4.7 | Malformed/empty AI JSON | SAFE | strict-JSON parse guarded; fallback |

## 5. Subscription chaos
| # | Scenario | Verdict | Detail |
|---|---|---|---|
| 5.1 | Logout during purchase | SAFE | charge lands on aliased RC user; local flag self-heals on resume/route revoke |
| 5.2 | Purchase success, no entitlement (id mismatch) | **GAP** | shows "Purchase failed" while charged. **BUG B1** — worst money case |
| 5.3 | Cancel purchase | SAFE | `isPurchaseCancelled` → notify, no charge |
| 5.4 | Restore as non-subscriber | SAFE | inactive + "no active" notify |
| 5.5 | Expired subscription on resume | SAFE | `getBillingPremiumStatus` → revoke; webhook EXPIRATION |
| 5.6 | Webhook replay / out-of-order | SAFE | strictly-newer `apply_entitlement_event` RPC |
| 5.7 | Guest purchase then login | SAFE | billing blocked while guest → no anon purchase to alias |
| 5.8 | Server/client premium disagree | **GAP** | revoke→resume→re-grant→403 thrash. BUG B2 |

## 6. Data / boundary / negative
| # | Scenario | Verdict | Detail |
|---|---|---|---|
| 6.1 | Same person A==B (compatibility) | **GAP** | no guard → inflated self-match. BUG C6 |
| 6.2 | Empty/garbage tarot question | SAFE | 10–220 chars + ≥4 alnum validation; confirm disabled |
| 6.3 | No birth time (compat) | SAFE | rising/houses omitted gracefully |
| 6.4 | Invalid DOB | SAFE | `zodiacKeyFromBirthDate` → '' , wheel default, no crash |
| 6.5 | A/B account switch → PII bleed | **GAP** | compat connections not cleared on logout. BUG A1 (privacy) |
| 6.6 | localStorage eviction | PARTIAL | onboarding-complete backed by native Prefs SAFE; phrase-gate + some flags not backed |
| 6.7 | Deep-link `/confirm-code` no email | SAFE | generic error, no crash |
| 6.8 | Reload `/tarot-interpretation` (no session data) | PARTIAL | empty state, but Share button inert. BUG T5 |

## 7. Reward/token chaos (feature parked but code live)
| # | Scenario | Verdict | Detail |
|---|---|---|---|
| 7.1 | Reward-spread, failed token consume | **GAP** | clears key, returns ready → next deck tap draws 3/5 free. BUG T1 |
| 7.2 | REWARDS_ENABLED=false | SAFE | `/rewards` redirects to menu; tokens read 0 |

---

## Chaos summary — GAPS to fix (by severity)
**SHOULD-FIX (12):** T1 reward bypass · T2 deck re-entrancy · T6 kill-app value loss · H3 locale re-gen · N1 home-resume-stale · N6 no-offline-state · B1 silent-charge · B2 403-thrash · A1 PII-bleed · C1/C2/C3 reminder+401 · A3 429-send · H4 401 handling.
**Guard-worthy NICE:** C6 same-person · T5 empty-share · 6.6 flag backup.
**Strongest areas (survived chaos):** AI provider fallback + content-safety, billing anti-double-charge + webhook ordering, delete-account atomicity, offline horoscope/tarot fallback, stale-response guards, no-user⇒no-premium.
**DEVICE-only (cannot confirm from code):** memory warning, rotation lock, network handoff, low-power, white-flash, 60fps on giant components, VoiceOver.

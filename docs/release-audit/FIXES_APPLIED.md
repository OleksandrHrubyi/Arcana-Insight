# SHOULD-FIX remediation (applied 2026-07-03)

Fixed the audit's SHOULD-FIX items by priority. All local commits (not pushed).
Validation after the batch: `eslint src` clean · **251 tests** · `quasar build` OK.

## HIGH priority — all done
| ID | Fix | Commit |
|----|-----|--------|
| T4/H2 | Reflection/entertainment disclaimer on tarot, horoscope, personal, zodiac (shared `common.disclaimer`) | d530f15 |
| A1 | Clear compatibility connections (others' PII) + reward inventory on sign-out | 548ee1d |
| N3 | 404 reachable for not-onboarded users (`allowWithoutOnboarding` on catchAll) | 8526651 |
| B1 | No misleading "purchase failed" after a real StoreKit charge → "tap Restore" message | a5a03e5 |
| T1/T2 | Reward-spread free-draw bypass closed + deck-tap re-entrancy lock | f9f9eab |
| N1 | Home refreshes greeting/date/streak/progress on foreground (midnight rollover) | 78db12d |

## MEDIUM priority — done
| ID | Fix | Commit |
|----|-----|--------|
| C1/C2 | Reminder failures surfaced (toast) + notification names the top-ranked person | 5a6ffcd |
| H3 | Personal horoscope: try cache before regenerating on language switch | (5a6ffcd→) H3 commit |
| A3 | Localize rate-limit (429) on the OTP send step (login + sign-up) | 4cc5e8f |
| N4 | Onboarding: Continue requires ≥1 interest (distinct from Skip) | 069e981 |
| C3/H4 | Reconcile 401 like 403 (stop the retry loop) + `isUnauthorizedError` + test | 4cf68fb |
| N5 | Native backgroundColor also set in src-capacitor config (launch-flash safety) | (N5 commit) |
| N2 | Preserve self-sufficient deep-link targets through onboarding (`/compatibility`, `/cards`, `/zodiac-guide`) | b4d06b0 |

New/updated regression tests: `authAccountScopedClear` (A1), `functionErrors` (C3/H4),
`onboardingRouteTarget` (N2).

## Deferred (need owner decision or a device feature) — NOT done
- **T3** — free-AI "sign in for a free full reading" promise can break if the account
  already spent its `ai_free_grants` on another device. The fix is either softening the
  conversion copy (hurts the hook) or adding logic in the critical AI-fallback path
  (regression risk unattended). **Left for a deliberate decision.**
- **A2** — reset-password is a dead/orphaned flow (passwordless OTP app, no "Forgot
  password" entry). Decision: **wire an entry point OR remove** the page + helper.
  Removal is a deletion — needs your OK.
- **N6** — no global offline state. This is a new feature (`@capacitor/network` + a
  banner across screens) and needs device verification. **Left as a fast-follow.**

## Still device-only (from Stage 7) — cannot verify from code
White-flash appearance, 60fps/memory on giant components, network handoff, VoiceOver,
real IAP sandbox (LR-12), Firebase IDFA posture, portrait lock.

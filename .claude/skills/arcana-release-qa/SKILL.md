---
name: arcana-release-qa
description: Systematic pre-release QA for Arcana Insight. Use for any "find bugs", flow audit, regression sweep, or App Store readiness pass. Encodes the auth×premium×entry-point matrix and the recurring bug-classes that escaped code review and only showed on device, plus how to catch them automatically.
---

# Arcana Release QA

The goal: catch the bugs that **code-reading misses** — dead-ends, stuck states, wrong UI per state, money-in-no-access. These only surface when you trace *what literally happens on a tap*, not "is this gated?".

## Core principle
For every interactive surface, build a matrix and walk each cell **as an action**, not a check:

**States** — (A) logged-OUT · (B) logged-in free · (C) premium · plus: no birth date / no sign, app resume, cold start.
**Per cell, ask:** what happens when I tap this — does a screen appear, a dead-end, an infinite spinner, a silent revert on next sync, a paid action with no auth, a blank background?

The premium invariant: **premium ⇔ logged-in AND entitled** (local `arcana_premium_access_v1`, revoked on logout / no-session sync; server enforces by Supabase user id; RevenueCat identity = that id on login).

## Bug-class catalog (check every one — each is a real bug found in this app)
1. **Capacitor thenable trap** — returning a plugin proxy from an async fn → `.then()` "not implemented" → hang/black screen. Fix: wrap `return { Plugin: mod.Plugin }`.
2. **Controls hidden but not restored** — a handler sets `controlsUnlocked=false` (or hides a sheet) before an action; if the action early-returns (e.g. locked spread, daily limit) without advancing stage or re-revealing, the user is stranded on the background. Every early-return after a hide must restore the UI.
3. **Money-in-no-access** — a purchase/restore reachable while logged-out charges an anonymous RC user, then premium is revoked on sync. Billing actions must require sign-in first.
4. **Sign-in dead-end** — routing to login without a `redirect` query drops the user on home, losing their place. Use `resolveAuthRedirect` + thread `redirect` through guard → login handlers (Apple + email OTP).
5. **Locked-tap inert** — a locked element (dimension, theme, card) that does nothing on tap. It should open the paywall.
6. **Auto-bounce to paywall** — a locked screen that auto-redirects to /premium on mount → redirect loop. Show an in-page blur + CTA instead; never auto-navigate.
7. **Premium leak / over-restriction** — free user reaches premium content, or a free feature is wrongly blocked. Check client AND server (`RC_ENFORCE_PREMIUM=true`).
8. **Account-scoped local flags leaking across accounts** — free-AI gift / daily limit flags must clear on `SIGNED_OUT`.
9. **Silent failure** — spinner that never resolves, or an error swallowed to a blank state. Every async path needs a visible success/empty/error/retry.
10. **White launch flash** — WKWebView default white before first paint. Needs `capacitor.config` `backgroundColor`.
11. **Raw i18n key rendered** — `t()` falls back to the literal key when missing; check both `en`+`uk` in `messages.bundle.js` (the runtime source — NOT en.json/uk.json, which are dead).
12. **Forbidden content/icons** — prediction/guarantee copy, `auto_awesome`/`✨`.

## How to run a pass (in order)
1. **Automated flow tests first** — `npx playwright test flows` (`tests/visual/flows.spec.js`). These DRIVE the app in logged-out/free state and assert no dead-ends. Extend them for any new flow. `npx playwright test smoke` covers route-mount + bottom-nav contract.
2. **Agent fan-out for code-level coverage** — one read-only agent per surface (tarot, paywall/billing, horoscope, compatibility, saved/account/auth, navigation/cold-start). Prompt each to TRACE the matrix and report `state → tap → what happens → why wrong → file:line`, BLOCKER/SHOULD-FIX/NICE. Require "verified in code only".
3. **What only a device catches (hand to the owner)** — real IAP purchase/restore, APNs push, native timing (white flash), WKWebView perf. List these explicitly; never claim them "verified" from code.

## Regression rule
**Every bug found becomes a test.** Add a Playwright flow assertion (or a unit test for logic) so it can't come back. The fix isn't done until the test exists.

## Honesty rule
Code + server can be verified here; the live UI on device cannot. Say which layer a claim rests on. Don't write "no blockers / clean" for an interaction you didn't execute — say "verified in code; needs a device pass for X".

## Source-of-truth pointers
- Premium model: `src/stores/premiumAccess.js`, `src/stores/authStore*.js`, `src/services/premiumBilling.js`, server `supabase/functions/_shared/premium.ts`.
- Tarot flow: `src/components/TarotOraclePage.vue`, `src/pages/TarotInterpretationPage.vue`, `supabase/functions/tarot-reading`.
- Paywall: `src/components/main/PremiumInfoComponent.vue`.
- Routing/guards: `src/router/guard.js`, `src/router/index.js`, `src/helpers/authRedirect.js`.
- i18n runtime source: `src/i18n/messages.bundle.js`.

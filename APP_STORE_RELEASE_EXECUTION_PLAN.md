# Arcana Insight - App Store Release Execution Plan

Last updated: 2026-03-29  
Owner: Codex execution checklist (working doc)

## 1) Goal and release bar

Goal: ship Arcana Insight to Apple App Store with clear first-session value, stable core flows, and no obvious reviewer blockers.

Release bar (must all be true):
- Product first session is clear: user instantly sees what to do now.
- Free version gives meaningful value before hard monetization pressure.
- Premium logic is consistent and does not feel manipulative.
- Core flows (onboarding, home, horoscope, tarot, premium, auth, settings, support/legal) are stable.
- CI health is green: lint/build/tests pass.
- App Store operational package is complete (assets, metadata, legal consistency, subscription copy).

## 2) Current baseline (from audit)

Current status summary:
- Verdict: ALMOST READY
- Estimated readiness before P0 closure: 60-65%
- Strengths: visual polish, core feature breadth, premium/paywall infrastructure, retention mechanics foundation.
- Weak points: home action clarity, free value depth, paywall timing pressure, one failing test, polish inconsistencies.

Known technical snapshot:
- `npm run lint` -> PASS
- `npm run build` -> PASS
- `npm test` -> FAIL (1 failing test in `tests/premiumUiSyncContracts.test.js`)

## 3) P0 blockers (must fix before release)

## P0.1 Home screen must show clear "what to do now"

Problem:
- `src/components/main/LandingScene.vue` is mostly atmospheric.
- Direct CTA block is commented out.
- This conflicts with product requirement: action-first home.

Tasks:
- Add explicit primary CTA on home: "Start today ritual" (or equivalent localized copy).
- Add secondary CTA(s): "Daily card", "Horoscope", "Tarot".
- Keep visual style, but prioritize action hierarchy above decoration.
- Ensure first-time user can complete one useful loop in <= 2 taps.

Acceptance criteria:
- New user can immediately see primary action without searching menu.
- CTA is visible and tappable on small iPhones and large iPhones.
- CTA labels localized for EN/UK.
- No layout overlap with bottom navigation/safe areas.
- Cold start test: within 5 seconds user understands what to tap next.

Files:
- `src/components/main/LandingScene.vue`
- `src/i18n/messages.bundle.js` (or source translation flow used in project)

## P0.2 Rebalance free value vs paywall pressure

Problem:
- Free feels constrained too early (horoscope themes locked, tarot limits strict, full lock on some premium pages).
- Risk: user does not trust value before upsell.

Tasks:
- Freeze and implement a v1 free/premium matrix (no open-ended debate).
- Align all paywall triggers with matrix rules.
- Keep premium differentiation strong (deeper readings, unlimited usage, full history, advanced tools).

v1 matrix (release scope):

| Feature | Free v1 (fixed) | Premium | First paywall moment allowed |
|---|---|---|---|
| Home / today flow | Full access to "what to do now" actions | Same + premium badges/benefits | Never on home cold start |
| Daily card | 1 complete daily card experience | Same + premium context modules (optional) | No paywall in first daily card completion |
| Horoscope | 2 tabs/day fully readable (Energy + Love), Career locked with teaser | All tabs unlimited + deeper copy | Only after user opens locked tab |
| Tarot | 1 full session/day (1-card) with complete basic interpretation | Unlimited sessions + 3/5-card + deep interpretation | Only after first free session is fully completed |
| Saved readings | Last 3 readings visible | Unlimited history + filters/search | Only when user crosses free limit |
| Compatibility | 1 quick match/day (score + short summary) | Full breakdown + expanded details/history | Only when trying to open full report |

Paywall rules (hard):
- No paywall before first completed value event in first session.
- Maximum one paywall impression in first session.
- Every paywall entry must explain what user already received for free and what exactly unlocks.

Acceptance criteria:
- User receives complete value before first forced upgrade moment.
- Premium still clearly better and justified.
- No contradictory promises between premium page copy and actual gating behavior.
- All paywall entry points map to the v1 matrix above.

Files:
- `src/components/main/HoroscopeComponent.vue`
- `src/components/TarotOraclePage.vue`
- `src/pages/SavedReadingsPage.vue`
- `src/constants/premiumModel*` and related i18n copy

## P0.3 Fix failing test / contract drift

Problem:
- `tests/premiumUiSyncContracts.test.js` expects app resume listener in `App.vue`.
- Actual listener currently in `src/boot/auth.ts`.

Tasks:
- Update contract test to match current architecture OR reintroduce required behavior in expected place.
- Ensure premium entitlement sync on app resume is tested and deterministic.
- Re-run full test suite.

Acceptance criteria:
- `npm test` passes 100%.
- Contract tests reflect actual architecture, not outdated assumptions.
- Premium state updates correctly after resume and after purchase/restore flows.

Files:
- `tests/premiumUiSyncContracts.test.js`
- `src/App.vue`
- `src/boot/auth.ts`
- `src/services/premiumBilling.js`

## P0.4 App Store operational readiness package

Problem:
- Submission package appears incomplete in repo-level readiness artifacts.

Tasks:
- Confirm final App Store assets are ready:
  - production icon set
  - App Store screenshots (all required sizes)
  - preview video (optional but recommended)
- Validate metadata:
  - subtitle/description/promotional text
  - keyword set
  - support URL / privacy policy URL
- Validate legal/compliance copy in app and App Store listing is consistent.
- Verify subscription disclosure wording (billing cadence, restore, cancellation) in paywall and listing.

Acceptance criteria:
- App Store Connect submission can be completed without missing fields.
- No mismatch between in-app legal text and listing-level policies.

Files:
- `APP_STORE_RELEASE.md`
- `resources/*`
- App Store listing content (external, but tracked in this checklist)

## 4) P1 improvements (should fix soon)

## P1.1 Keep pre-release scope tight (no new standalone feature pages)

Rule:
- Do not build new standalone pages before release except direct P0 fixes.
- "Today Plan" is allowed only as a minimal home module inside P0.1 (not as new screen scope).
- "My Insights" and "Readings Timeline+" are post-release backlog.

Acceptance criteria:
- No new page-level feature work starts before all P0 tasks are closed.
- P1 work stays polish/stability-focused.

## P1.2 Unify loading/empty/error states in all core flows

Targets:
- `DailyCard`, `Tarot`, `Horoscope`, `SavedReadings`, `Compatibility`.

Tasks:
- Standardize skeleton/empty/error components and copy tone.
- Ensure every network/storage dependency has user-facing fallback text.
- Avoid silent failures and blank states.

Acceptance criteria:
- No core page can render as "empty but unexplained".
- Errors are actionable and non-technical.

## P1.3 Polish and trust pass

Tasks:
- Remove production `console.log` debug noise (keep warnings/errors through controlled logger).
- Fix hardcoded non-localized strings (example: "Apply" in settings sheets).
- Ensure support/legal wording sounds production-grade.

Acceptance criteria:
- No obvious debug traces in production behavior.
- EN/UK text parity is consistent in critical UI.

## 5) P2 improvements (post-release / can defer)

- Bundle/performance optimization for heavy chunks (`index`, tarot data, messages bundle).
- Advanced onboarding personalization beyond interest tags.
- Deeper A/B tuning of paywall copy and timing.
- Additional ritual content packs and guided programs.
- New page roadmap:
  - My Insights page
  - Readings Timeline+ page

## 6) QA checklist (release candidate)

## Automated

Run:
- `npm run lint`
- `npm test`
- `npm run build`

Expected:
- all pass, no flaky failures.

## Manual smoke tests (iOS focus)

Critical flows:
- New install -> onboarding -> home CTA -> complete first ritual.
- Guest mode full path (no login): horoscope, tarot, daily card, rewards visibility.
- Auth path: sign up/login/logout, return session, account edit, delete account.
- Premium path: open paywall from all major entry points, purchase/restore/cancel simulation.
- Resume behavior: background/foreground sync for auth and premium.
- Push permission flow + settings toggle behavior.
- Legal/support pages accessible and coherent.

Purchase hard-case scenarios:
- Interrupted purchases (network drop, app background, user cancels at system sheet).
- Sandbox renewal scenarios for auto-renewable subscriptions.
- Clear purchase history / reinstall and re-run restore validation.
- Purchase -> background app -> resume -> entitlement sync correctness.
- Restore on fresh install with existing active subscription.

UI/UX quality:
- Safe areas (notch/home indicator) correct.
- No clipped text in EN/UK.
- No dead-end screens.
- No obvious empty screens without guidance.

## 7) Apple compliance / reviewer blockers (explicit)

Must confirm before submission:
- Account deletion is available directly in-app for users who can create an account.
- Auto-renewable subscription UX includes:
  - clear restore path
  - clear path to manage/cancel subscription (via system/manage subscriptions guidance)
  - clear billing disclosure copy
- Re-check latest App Review Guidelines during submission week (not a static one-time check).
- In App Store Connect, all IAP/subscription products are in valid review-ready states (no missing metadata/review fields).
- Support URL and Privacy Policy URL are valid and consistent with in-app legal/support content.

## 8) App Store reviewer risk checklist

High-risk items to avoid:
- App feels unfinished on first launch (no clear action).
- Overly aggressive paywall before user gets value.
- Missing or unclear subscription disclosures.
- Broken/ambiguous account deletion or support path.
- Placeholder visuals/copy in release binary.

Mitigations:
- Enforce P0 completion before building submission binary.
- Final manual walkthrough from reviewer perspective (not developer perspective).

## 9) Execution sequence (strict order)

1. P0.3 test/contract stabilization (green CI baseline).
2. P0.1 home action-first redesign (minimal but clear).
3. P0.2 implement fixed v1 free/premium matrix.
4. P0.4 starts in parallel with P0.1/P0.2 (metadata/assets/legal/subscription copy track).
5. P1.2 UX state consistency pass (loading/empty/error).
6. P1.3 polish + localization + log cleanup.
7. RC build + full smoke + purchase hard-case matrix.
8. Submission.

## 10) Definition of done for "READY FOR APP STORE"

App can be labeled READY only if:
- All P0 tasks completed and verified.
- Automated checks pass (`lint`, `test`, `build`).
- Manual smoke tests pass on target iOS devices.
- First-session clarity validated (user can complete useful flow immediately).
- Cold start clarity validated: in <= 5 seconds user understands the next tap.
- Free value is meaningful; premium upsell is persuasive but not premature.
- App Store Connect package is complete and coherent.

---

Working note:
- This file is the primary execution guide for implementation in next iterations.
- Do not start new feature scope before P0 is closed.

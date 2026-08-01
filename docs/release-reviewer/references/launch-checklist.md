# Arcana Insight Launch Checklist

Last review baseline: 2026-04-23
Owner mode: Codex reviewer with minimal blocking questions

## How to use

- Move strictly from `P0` to `P2`.
- Do not start new launch-adjacent features until `P0` is clear.
- For each item keep one status: `open`, `in progress`, `blocked`, `done`.
- If blocked by user input, ask one short question and stop there.

## P0 Blockers

### Compliance and privacy

- `done` Make privacy policy match actual onboarding and data collection.
  Evidence:
  - Signup no longer requires DOB in [src/components/auth/SignUpScene.vue](/Users/oleksandr/Desktop/App/Arcana-Insight/src/components/auth/SignUpScene.vue:66)
  - Personal horoscope now routes users to add DOB on demand in [src/pages/PersonalHoroscopePage.vue](/Users/oleksandr/Desktop/App/Arcana-Insight/src/pages/PersonalHoroscopePage.vue:87)
  - Privacy policy already describes DOB as optional / premium-related in [app-store/privacy-policy.html](/Users/oleksandr/Desktop/App/Arcana-Insight/app-store/privacy-policy.html:159)
- `done` Add missing third-party/privacy disclosures for analytics and other shipped SDK behavior.
  Evidence:
  - Firebase Analytics present in [src/services/analytics.js](/Users/oleksandr/Desktop/App/Arcana-Insight/src/services/analytics.js:1)
  - Public policy now discloses Firebase Analytics, APNs push delivery, and notification preferences in [app-store/privacy-policy.html](/Users/oleksandr/Desktop/App/Arcana-Insight/app-store/privacy-policy.html:159)
- `done` Standardize support/contact identity across app and public pages.
  Evidence:
  - App support email is `ghrubyi@ukr.net` in [src/components/main/FaqSupportComponent.vue](/Users/oleksandr/Desktop/App/Arcana-Insight/src/components/main/FaqSupportComponent.vue:51)
  - Public App Store pages use `ghrubyi@ukr.net` in [app-store/support.html](/Users/oleksandr/Desktop/App/Arcana-Insight/app-store/support.html:166)
- `done` Verify iOS privacy/compliance packaging.
  Evidence:
  - App-level privacy manifest now exists at [ios/App/App/PrivacyInfo.xcprivacy](/Users/oleksandr/Desktop/App/Arcana-Insight/ios/App/App/PrivacyInfo.xcprivacy:1)
  - Active iOS target includes the manifest in [ios/App/App.xcodeproj/project.pbxproj](/Users/oleksandr/Desktop/App/Arcana-Insight/ios/App/App.xcodeproj/project.pbxproj:1)
  - Active app target already carries push and Apple Sign In entitlements in [ios/App/App/App.entitlements](/Users/oleksandr/Desktop/App/Arcana-Insight/ios/App/App/App.entitlements:1)

### Account and payments

- `done` Normalize Supabase env naming in delete-account function and validate deployed config.
  Evidence:
  - Delete-account now supports `SUPABASE_*` first with backward-compatible fallback in [supabase/functions/delete-account/index.ts](/Users/oleksandr/Desktop/App/Arcana-Insight/supabase/functions/delete-account/index.ts:39)
  - Reading cleanup now targets `tarot_readings` and only falls back to legacy `saved_readings` in [supabase/functions/delete-account/index.ts](/Users/oleksandr/Desktop/App/Arcana-Insight/supabase/functions/delete-account/index.ts:99)
- `done` Fix premium/paywall contract regressions until `npm test` is fully green.
  Evidence:
  - Baseline test failures `104`, `111`, `112` were fixed
  - Full test suite now passes: `164/164`
- `in progress` Run real iOS sandbox flow for purchase, restore, cancel, and entitlement refresh.
  Evidence (statuses backfilled 2026-08-01 from live LR-12 runs):
  - 2026-06-23 — real-device sandbox purchase (`arcana.premium.yearly` $29.99) verified end-to-end: device → RevenueCat → webhook → `user_entitlements` → enforcement (`docs/launch-readiness-plan.md` LR-12)
  - 2026-07-07/08 — Restore verified (TestFlight reinstall → active sub returned); entitlement survived reinstall + restarts across days (RENEWAL #9)
  - Pass/fail report filled in `ios-sandbox-billing-report.md` (2026-08-01)
  Remaining (owner real-device pass, `app-store/asc-submit-checklist.md` §0):
  - Cancelled-purchase sheet check, negative restore (second sandbox account), expiration sanity check — per the 2026-07-08 decision these don't block submission

## P1 Revenue-Critical

### Onboarding and activation

- `done` Reduce signup friction before value delivery.
  Evidence:
  - Signup now asks only for name and email in [src/components/auth/SignUpScene.vue](/Users/oleksandr/Desktop/App/Arcana-Insight/src/components/auth/SignUpScene.vue:1)
  - Birth date is now framed as an on-demand follow-up for personal horoscope in [src/pages/PersonalHoroscopePage.vue](/Users/oleksandr/Desktop/App/Arcana-Insight/src/pages/PersonalHoroscopePage.vue:1)
- `done` Make premium sell one primary outcome, not a bundle of unrelated perks.
  Evidence:
  - Premium hero now frames one clear outcome in [src/components/main/PremiumInfoComponent.vue](/Users/oleksandr/Desktop/App/Arcana-Insight/src/components/main/PremiumInfoComponent.vue:1)
  - Supporting copy now ties Premium to a deeper daily reflection practice in [src/i18n/messages.bundle.js](/Users/oleksandr/Desktop/App/Arcana-Insight/src/i18n/messages.bundle.js:1256)
  - Contract coverage exists in [tests/premiumCopyConsistency.test.js](/Users/oleksandr/Desktop/App/Arcana-Insight/tests/premiumCopyConsistency.test.js:1)
- `done` Confirm that free tier clearly demonstrates recurring daily value before first paywall exposure.
  Evidence:
  - Home hero no longer marks `daily_card` complete on first reveal in [src/components/main/LandingScene.vue](/Users/oleksandr/Desktop/App/Arcana-Insight/src/components/main/LandingScene.vue:715)
  - Home progress now stays tied to real `daily_card` completion in [src/components/main/LandingScene.vue](/Users/oleksandr/Desktop/App/Arcana-Insight/src/components/main/LandingScene.vue:396)
  - Contract coverage exists in [tests/landingHomeDailyHeroContracts.test.js](/Users/oleksandr/Desktop/App/Arcana-Insight/tests/landingHomeDailyHeroContracts.test.js:1)
  - Mobile visual QA done 2026-07-23 (RP-03): 6 Playwright baselines (iphone-14/se × 3 states) regenerated + reviewed, `?qa=home` screenshots — Home marked 🟢 in [docs/screen-status.md](/Users/oleksandr/Desktop/App/Arcana-Insight/docs/screen-status.md:20)

### Paywall and messaging

- `done` Audit free vs premium copy consistency in:
  - [src/components/main/PremiumInfoComponent.vue](/Users/oleksandr/Desktop/App/Arcana-Insight/src/components/main/PremiumInfoComponent.vue:1)
  - [src/pages/SavedReadingsPage.vue](/Users/oleksandr/Desktop/App/Arcana-Insight/src/pages/SavedReadingsPage.vue:1)
  - [src/pages/CompatibilityPage.vue](/Users/oleksandr/Desktop/App/Arcana-Insight/src/pages/CompatibilityPage.vue:1)
  - [src/components/main/HoroscopeComponent.vue](/Users/oleksandr/Desktop/App/Arcana-Insight/src/components/main/HoroscopeComponent.vue:1)
  Evidence:
  - Compatibility free state now consistently says preview-only in the paywall model and screen copy
  - Saved readings now clearly explain that free keeps today’s value but does not save history
  - Horoscope locks now describe free as the daily energy theme and Premium as added Love/Career depth
  - Contract coverage exists in [tests/premiumCopyConsistency.test.js](/Users/oleksandr/Desktop/App/Arcana-Insight/tests/premiumCopyConsistency.test.js:1)
- `done` Validate paywall entry taxonomy and analytics consistency after contract fixes.
  Evidence:
  - Shared paywall entry taxonomy now lives in [src/constants/analyticsEvents.js](/Users/oleksandr/Desktop/App/Arcana-Insight/src/constants/analyticsEvents.js:1)
  - All premium entry points now log a primary or secondary paywall-entry event before route navigation
  - Contract coverage exists in [tests/analyticsEvents.test.js](/Users/oleksandr/Desktop/App/Arcana-Insight/tests/analyticsEvents.test.js:1) and [tests/premiumUiSyncContracts.test.js](/Users/oleksandr/Desktop/App/Arcana-Insight/tests/premiumUiSyncContracts.test.js:1)

## P1 Store Submission

- `done` Finalize App Store privacy URL and support URL that actually resolve publicly.
  Evidence:
  - GitHub Pages deployment workflow prepared in [.github/workflows/deploy-app-store-pages.yml](/Users/oleksandr/Desktop/App/Arcana-Insight/.github/workflows/deploy-app-store-pages.yml:1)
  - Static landing page added in [app-store/index.html](/Users/oleksandr/Desktop/App/Arcana-Insight/app-store/index.html:1)
  - Expected public URLs documented in [app-store/README.md](/Users/oleksandr/Desktop/App/Arcana-Insight/app-store/README.md:1)
  - Public privacy URL is live at `https://oleksandrhrubyi.github.io/Arcana-Insight/privacy-policy.html`
  - Public support URL is live at `https://oleksandrhrubyi.github.io/Arcana-Insight/support.html`
- `done` Verify final App Store metadata against shipped behavior.
  Reference draft: [app-store/metadata.md](/Users/oleksandr/Desktop/App/Arcana-Insight/app-store/metadata.md:1)
  Evidence:
  - Horoscope copy now matches free vs premium theme gating in [app-store/metadata.md](/Users/oleksandr/Desktop/App/Arcana-Insight/app-store/metadata.md:1) and [src/constants/premiumModel.js](/Users/oleksandr/Desktop/App/Arcana-Insight/src/constants/premiumModel.js:89)
  - Promotional text now makes the Premium personal horoscope explicit in [app-store/metadata.md](/Users/oleksandr/Desktop/App/Arcana-Insight/app-store/metadata.md:1)
  - Store metadata now points to live public support/privacy URLs in [app-store/metadata.md](/Users/oleksandr/Desktop/App/Arcana-Insight/app-store/metadata.md:181)
- `done` Produce real screenshots with filled content, not placeholders.
  Evidence:
  - 2026-07-07/08 — 8-screen live-state set uploaded to ASC in 6.9" + 6.5" (LR-14 in `docs/launch-readiness-plan.md`)
  - 2026-07-31 — regenerated astronomy-first set (8 shots × 2 sizes: 1320×2868, 1242×2688) in `app-store/screenshots/` for the v1.0.1 resubmit (`app-store/asc-submit-checklist.md` §3)
- `done` Prepare reviewer notes with test account / paywall instructions.
  Evidence:
  - App Review note template prepared in [app-store/reviewer-notes.md](/Users/oleksandr/Desktop/App/Arcana-Insight/app-store/reviewer-notes.md:1)
  - Metadata now points to the reviewer note file in [app-store/metadata.md](/Users/oleksandr/Desktop/App/Arcana-Insight/app-store/metadata.md:1)

## P2 Stability and polish

- `done` Production web build succeeds.
  Evidence:
  - `npm run build` passed on baseline review
- `done` Lint passes.
  Evidence:
  - `npm run lint` passed on baseline review
- `done` Keep tests green after each launch fix.
  Evidence:
  - 2026-08-01 — full suite green: 345/345 pass (`npm test`, confirmed by `ai:scan:all` tests.json)
- `done` Remove or explain stray generated files before release if they are accidental.
  Evidence:
  - 2026-08-01 — `ios/App/App/config 3.xml` / `config 4.xml` / `config 5.xml` no longer exist (only canonical `config.xml` remains); `ios/App/Pods/**/Frameworks 2/` junk dirs also gone
- `open` Review JS/CSS payload size only after launch blockers are stable.

## Question gate

Ask the user only when one of these becomes blocking:

- Which support email/domain is canonical?
- Should DOB remain required anywhere outside premium personalization?
- What exact premium promise should lead the paywall?
- What are the final subscription products and trial terms in App Store Connect?
- Which public URLs will be used for Privacy Policy and Support?
- Do we already have Apple sandbox testers and test subscriptions configured?

## Operating rule

If a task does not clearly improve App Store approval odds, purchase conversion, retention, or operational readiness for July launch, defer it.

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
  Evidence:
  - Manual runbook prepared in [docs/release-reviewer/references/ios-sandbox-billing-runbook.md](/Users/oleksandr/Desktop/App/Arcana-Insight/docs/release-reviewer/references/ios-sandbox-billing-runbook.md:1)
  - Repo billing constants match expected App Store products in [src/constants/premiumBilling.js](/Users/oleksandr/Desktop/App/Arcana-Insight/src/constants/premiumBilling.js:1)
  Remaining:
  - Real-device execution on iPhone with sandbox Apple ID
  - Pass/fail report captured from the runbook

## P1 Revenue-Critical

### Onboarding and activation

- `open` Reduce signup friction before value delivery.
  Current concern:
  - signup asks for DOB before the user has experienced enough free value
- `open` Make premium sell one primary outcome, not a bundle of unrelated perks.
  Current premium scope:
  - personal horoscope
  - unlimited tarot
  - saved readings
  - compatibility
  - card library
- `open` Confirm that free tier clearly demonstrates recurring daily value before first paywall exposure.

### Paywall and messaging

- `open` Audit free vs premium copy consistency in:
  - [src/components/main/PremiumInfoComponent.vue](/Users/oleksandr/Desktop/App/Arcana-Insight/src/components/main/PremiumInfoComponent.vue:1)
  - [src/pages/SavedReadingsPage.vue](/Users/oleksandr/Desktop/App/Arcana-Insight/src/pages/SavedReadingsPage.vue:1)
  - [src/pages/CompatibilityPage.vue](/Users/oleksandr/Desktop/App/Arcana-Insight/src/pages/CompatibilityPage.vue:1)
  - [src/components/main/HoroscopeComponent.vue](/Users/oleksandr/Desktop/App/Arcana-Insight/src/components/main/HoroscopeComponent.vue:1)
- `open` Validate paywall entry taxonomy and analytics consistency after contract fixes.

## P1 Store Submission

- `in progress` Finalize App Store privacy URL and support URL that actually resolve publicly.
  Evidence:
  - GitHub Pages deployment workflow prepared in [.github/workflows/deploy-app-store-pages.yml](/Users/oleksandr/Desktop/App/Arcana-Insight/.github/workflows/deploy-app-store-pages.yml:1)
  - Static landing page added in [app-store/index.html](/Users/oleksandr/Desktop/App/Arcana-Insight/app-store/index.html:1)
  - Expected public URLs documented in [app-store/README.md](/Users/oleksandr/Desktop/App/Arcana-Insight/app-store/README.md:1)
  Remaining:
  - Enable GitHub Pages manually in repo settings with `GitHub Actions`
  - Confirm both URLs load publicly after deploy
- `open` Verify final App Store metadata against shipped behavior.
  Reference draft: [app-store/metadata.md](/Users/oleksandr/Desktop/App/Arcana-Insight/app-store/metadata.md:1)
- `open` Produce real screenshots with filled content, not placeholders.
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
- `open` Keep tests green after each launch fix.
- `open` Remove or explain stray generated files before release if they are accidental.
  Evidence:
  - untracked `ios/App/App/config 3.xml`, `config 4.xml`, `config 5.xml`
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

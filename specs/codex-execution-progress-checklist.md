# Codex Execution Progress Checklist

Last updated: 2026-04-29
Owner: Codex

## How to use

- This file tracks what was already implemented in the current Codex execution stream.
- Keep statuses strict: `done`, `in progress`, `blocked`, `open`.
- Treat this as the short operational checklist, not the architecture spec.

## 1. AI Ops Foundation

- `done` Lock Codex-first `ai-ops` architecture and contracts.
  Evidence:
  - MVP plan exists in [specs/codex-ai-ops-mvp.md](/Users/oleksandr/Desktop/App/Arcana-Insight/specs/codex-ai-ops-mvp.md:1)
  - Foundation spec exists in [specs/codex-ai-ops-foundation-spec.md](/Users/oleksandr/Desktop/App/Arcana-Insight/specs/codex-ai-ops-foundation-spec.md:1)

- `done` Build shared `ai-ops/core` layer and artifact pipeline.
  Evidence:
  - Core contracts and helpers live in [ai-ops/core/constants.js](/Users/oleksandr/Desktop/App/Arcana-Insight/ai-ops/core/constants.js:1), [ai-ops/core/checkRunner.js](/Users/oleksandr/Desktop/App/Arcana-Insight/ai-ops/core/checkRunner.js:1), [ai-ops/core/manifest.js](/Users/oleksandr/Desktop/App/Arcana-Insight/ai-ops/core/manifest.js:1)
  - Shared output tests exist in [tests/ai-ops/outputContracts.test.js](/Users/oleksandr/Desktop/App/Arcana-Insight/tests/ai-ops/outputContracts.test.js:1) and [tests/ai-ops/manifest.test.js](/Users/oleksandr/Desktop/App/Arcana-Insight/tests/ai-ops/manifest.test.js:1)

- `done` Implement deterministic check set.
  Evidence:
  - Code scan: [ai-ops/checks/code-scan.js](/Users/oleksandr/Desktop/App/Arcana-Insight/ai-ops/checks/code-scan.js:1)
  - Launch readiness: [ai-ops/checks/launch-readiness.js](/Users/oleksandr/Desktop/App/Arcana-Insight/ai-ops/checks/launch-readiness.js:1)
  - Test status: [ai-ops/checks/test-status.js](/Users/oleksandr/Desktop/App/Arcana-Insight/ai-ops/checks/test-status.js:1)
  - Build status: [ai-ops/checks/build-status.js](/Users/oleksandr/Desktop/App/Arcana-Insight/ai-ops/checks/build-status.js:1)

- `done` Add briefing, run-all flow, and operator docs.
  Evidence:
  - Briefing builder: [ai-ops/briefing/buildBriefingInput.js](/Users/oleksandr/Desktop/App/Arcana-Insight/ai-ops/briefing/buildBriefingInput.js:1)
  - Combined runner: [ai-ops/run-all.js](/Users/oleksandr/Desktop/App/Arcana-Insight/ai-ops/run-all.js:1)
  - Operator docs: [ai-ops/README.md](/Users/oleksandr/Desktop/App/Arcana-Insight/ai-ops/README.md:1)

- `done` Add local dashboard and Codex command layer.
  Evidence:
  - Dashboard files: [ai-ops/dashboard/index.html](/Users/oleksandr/Desktop/App/Arcana-Insight/ai-ops/dashboard/index.html:1), [ai-ops/dashboard/app.js](/Users/oleksandr/Desktop/App/Arcana-Insight/ai-ops/dashboard/app.js:1), [ai-ops/dashboard/server.js](/Users/oleksandr/Desktop/App/Arcana-Insight/ai-ops/dashboard/server.js:1)
  - Codex commands: [.codex/commands/ai_ops_scan.md](/Users/oleksandr/Desktop/App/Arcana-Insight/.codex/commands/ai_ops_scan.md:1), [.codex/commands/ai_ops_brief.md](/Users/oleksandr/Desktop/App/Arcana-Insight/.codex/commands/ai_ops_brief.md:1), [.codex/commands/ai_ops_fix.md](/Users/oleksandr/Desktop/App/Arcana-Insight/.codex/commands/ai_ops_fix.md:1)

- `done` Clean scanner noise and remove canonical-file duplicates.
  Evidence:
  - Duplicate files were removed with explicit permission
  - Canonical-file notes updated in [docs/canonical-files.md](/Users/oleksandr/Desktop/App/Arcana-Insight/docs/canonical-files.md:1)
  - Current scan result is clean in [ai-ops/output/latest/scan.json](/Users/oleksandr/Desktop/App/Arcana-Insight/ai-ops/output/latest/scan.json:1)

## 2. Launch and Product Fixes Already Completed

- `done` Remove signup friction before value delivery.
  Evidence:
  - Signup first step now uses only name and email in [src/components/auth/SignUpScene.vue](/Users/oleksandr/Desktop/App/Arcana-Insight/src/components/auth/SignUpScene.vue:1)
  - On-demand DOB flow remains in [src/pages/PersonalHoroscopePage.vue](/Users/oleksandr/Desktop/App/Arcana-Insight/src/pages/PersonalHoroscopePage.vue:1)

- `done` Make premium sell one primary outcome.
  Evidence:
  - Premium hero/value framing updated in [src/components/main/PremiumInfoComponent.vue](/Users/oleksandr/Desktop/App/Arcana-Insight/src/components/main/PremiumInfoComponent.vue:1)
  - Supporting copy aligned in [src/i18n/messages.bundle.js](/Users/oleksandr/Desktop/App/Arcana-Insight/src/i18n/messages.bundle.js:1256)

- `done` Audit free vs premium copy consistency.
  Evidence:
  - Copy fixes landed in [src/pages/CompatibilityPage.vue](/Users/oleksandr/Desktop/App/Arcana-Insight/src/pages/CompatibilityPage.vue:1), [src/pages/SavedReadingsPage.vue](/Users/oleksandr/Desktop/App/Arcana-Insight/src/pages/SavedReadingsPage.vue:1), [src/components/main/HoroscopeComponent.vue](/Users/oleksandr/Desktop/App/Arcana-Insight/src/components/main/HoroscopeComponent.vue:1)
  - Guardrail coverage exists in [tests/premiumCopyConsistency.test.js](/Users/oleksandr/Desktop/App/Arcana-Insight/tests/premiumCopyConsistency.test.js:1)

- `done` Normalize paywall entry taxonomy and analytics consistency.
  Evidence:
  - Shared paywall taxonomy now lives in [src/constants/analyticsEvents.js](/Users/oleksandr/Desktop/App/Arcana-Insight/src/constants/analyticsEvents.js:1)
  - Entry-point instrumentation is wired through premium-entry screens and components
  - Guardrail coverage exists in [tests/analyticsEvents.test.js](/Users/oleksandr/Desktop/App/Arcana-Insight/tests/analyticsEvents.test.js:1) and [tests/premiumUiSyncContracts.test.js](/Users/oleksandr/Desktop/App/Arcana-Insight/tests/premiumUiSyncContracts.test.js:1)

- `done` Remove false completion from home daily-card hero.
  Evidence:
  - Home reveal is now separated from `daily_card` completion in [src/components/main/LandingScene.vue](/Users/oleksandr/Desktop/App/Arcana-Insight/src/components/main/LandingScene.vue:224)
  - Contract coverage exists in [tests/landingHomeDailyHeroContracts.test.js](/Users/oleksandr/Desktop/App/Arcana-Insight/tests/landingHomeDailyHeroContracts.test.js:1)

## 3. Current Open Work

- `in progress` Confirm that free tier clearly demonstrates recurring daily value before first paywall exposure.
  Evidence:
  - Reveal/completion mismatch on home was fixed in [src/components/main/LandingScene.vue](/Users/oleksandr/Desktop/App/Arcana-Insight/src/components/main/LandingScene.vue:715)
  Remaining:
  - Visual mobile QA on iPhone-width home screen
  - Final decision whether this P1 can move from `in progress` to `done`

- `blocked` Run real iOS sandbox purchase / restore / cancel / entitlement refresh flow.
  Evidence:
  - Runbook exists in [docs/release-reviewer/references/ios-sandbox-billing-runbook.md](/Users/oleksandr/Desktop/App/Arcana-Insight/docs/release-reviewer/references/ios-sandbox-billing-runbook.md:1)
  - Report template exists in [docs/release-reviewer/references/ios-sandbox-billing-report.md](/Users/oleksandr/Desktop/App/Arcana-Insight/docs/release-reviewer/references/ios-sandbox-billing-report.md:1)
  Remaining:
  - Real iPhone execution with sandbox Apple ID

- `open` Produce real screenshots with filled content for App Store submission.

## 4. Current Validation Baseline

- `done` `npm test`
  Evidence:
  - Current baseline after the latest home-flow change: `188/188 pass`

- `done` `npm run ai:scan:all`
  Evidence:
  - Current baseline:
    - `code-scan: ok`
    - `test-status: ok`
    - `build-status: ok`
    - `launch-readiness: 1 blocker / 9 warnings`

## 5. Next Recommended Order

1. Visual QA for the home free-tier loop on iPhone viewport.
2. Close the remaining free-tier P1 if the screen passes that QA.
3. Run the real iPhone sandbox billing checklist.
4. Produce final App Store screenshots.

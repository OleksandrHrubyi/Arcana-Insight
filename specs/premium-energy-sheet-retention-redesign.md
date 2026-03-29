# Plan: Premium Energy Sheet Retention Redesign

## Task Description
Redesign the mobile bottom-sheet content shown from the Energy tab by refactoring `DailyRitualProgressComponent` into a premium, modern, retention-focused experience. Keep existing ritual data sources and completion logic intact while upgrading visual hierarchy, reward framing, CTA behavior, microcopy, animation quality, and responsive behavior across iPhone X through iPhone 17 Pro Max. Implement two design variants behind a flag for controlled rollout/A-B style comparison.

## Objective
Deliver a no-scroll, high-clarity, premium dark-metal + glow energy sheet that increases daily return motivation through visible reward/unlock mechanics and a clear next action, without breaking existing ritual tracking logic or backend contracts.

## Problem Statement
The current sheet content is visually improved but still functionally "dashboard-like" and not strongly retention-oriented. It lacks a dedicated reward narrative, adaptive CTA logic, and explicit progression framing that nudges users to return daily. It also needs stricter responsive constraints and motion-performance behavior for older devices.

## Solution Approach
Refactor `DailyRitualProgressComponent` variant `b` into a reward-first compact layout with:
- Hero reward block (stateful: in-progress vs unlocked)
- Dynamic primary CTA (`continue ritual` vs `claim reward`) with route-driven action
- Compact ritual steps and 7-day progress in a no-scroll composition
- Dual visual variants (`premium`, `premium-lite`) selected by prop/feature flag
- EN/UK ritual-coaching microcopy updates
- Lightweight analytics events for retention funnel measurement
- Performance-safe motion strategy with reduced-motion/lite-mode fallbacks

## Relevant Files
Use these files to complete the task:

- `src/components/main/DailyRitualProgressComponent.vue`
  - Main implementation target for structure, CTA logic, reward states, responsive layout, and animation behavior.
- `src/components/ui/BottomNavigation.vue`
  - Verify and minimally adjust integration point where the sheet mounts this component (`compact` + `variant`), and pass variant/flag if required.
- `src/i18n/messages.bundle.js`
  - Add/adjust EN and UK ritual/coaching strings for reward hero, CTA states, helper labels, and unlock feedback.
- `src/services/analytics.js`
  - Reuse existing analytics API (`analytics.logEvent`) and ensure naming/params follow current conventions.
- `src/helpers/ritualRewardsBackend.js`
  - Reuse existing reward/ritual APIs (`trackRitualActivity`, `claimRitualReward`, `loadRitualDashboard`) without contract changes.
- `tests/*.test.js`
  - Add or update tests around new helper logic extracted from component state computation (if extraction is used).

### New Files

- `src/constants/energySheetVariants.js` (optional)
  - Centralize variant keys and default behavior for safe rollout.
- `src/helpers/energySheetState.js` (optional)
  - Pure state-mapping helper for reward state/CTA mode to simplify tests and reduce component complexity.

## Implementation Phases
IMPORTANT: Each phase should be a checkbox that will be checked off during implementation. Include Status and Comments fields for tracking progress.

- [x] **Phase 1: UX Architecture & State Model** - Define reward states, CTA behavior, variant strategy, and no-scroll responsive constraints.
  - Status: completed
  - Comments: Reward state matrix and CTA decision flow implemented via `energySheetState` helper.

- [x] **Phase 2: Premium UI Build (Variant A/B)** - Implement redesigned component layout, premium visuals, motion tuning, and localization updates.
  - Status: completed
  - Comments: Reward-first UI shipped in `DailyRitualProgressComponent` with `premium` and `premium-lite` variants.

- [x] **Phase 3: Analytics, Validation & Device Hardening** - Add retention event tracking, verify behavior/performance on target mobile constraints, and finalize QA.
  - Status: completed
  - Comments: Added retention analytics events, reduced-motion/lite behavior, and completed lint/test/build validation.

## Team Orchestration

- Execution model: single primary executor (`codex`) unless explicit user request for multi-agent fan-out.
- Task decomposition is dependency-driven and explicit.
- Parallel tasks are allowed only for independent read-only checks and validation passes.
- No direct data model rewrite: preserve ritual tracking/claim contracts and current backend interaction boundaries.

### Team Members

- Codex
  - Name: codex
  - Role: primary implementer and validator
  - Agent Type: codex
  - Resume: true

## Step by Step Tasks

- Execute tasks top-to-bottom unless marked `Parallel: true` and dependency-free.
- Each task must include a stable `Task ID`.

### 1. Baseline Audit and State Matrix
- **Task ID**: baseline-audit-state-matrix
- **Depends On**: none
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: completed
- Comments: Added state helpers (`resolveRewardState`, `resolvePrimaryActionType`, `resolveNextRitualRoute`).
- Audit current `variant="b"` structure in `DailyRitualProgressComponent`.
- Define a state matrix for reward hero + CTA:
  - `in_progress` (0-2/3 complete today)
  - `ready_to_claim` (3/3 complete, reward available)
  - `claimed_today` (reward already claimed, fallback motivation state)
- Define deterministic CTA action rules with immediate sheet close + route/claim flow.

### 2. Responsive Layout Contract (No Scroll)
- **Task ID**: responsive-no-scroll-contract
- **Depends On**: baseline-audit-state-matrix
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: completed
- Comments: Compact no-scroll layout implemented with viewport-specific CSS tuning for small/large iPhone sizes.
- Define min/max block sizing for iPhone X baseline and expansion behavior for larger screens (including 17 Pro Max).
- Ensure vertical composition fits without sheet scroll under standard font settings.
- Define fallback for large text/accessibility: compact spacing/token reductions while keeping no-scroll requirement.

### 3. Build Reward-First Hero Block
- **Task ID**: build-reward-hero
- **Depends On**: responsive-no-scroll-contract
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: completed
- Comments: Added hero card with unlock states, points chips, and reward progress bar.
- Implement hero section showing daily ritual completion status and reward/unlock framing.
- Add visual unlock treatment for `ready_to_claim` and a post-claim confirmation state.
- Keep style direction dark-metal + glow with controlled saturation and contrast safety.

### 4. Implement Dynamic Primary CTA
- **Task ID**: implement-dynamic-primary-cta
- **Depends On**: build-reward-hero
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: completed
- Comments: CTA now switches between navigate/claim actions and closes sheet before execution.
- Implement CTA mode switching:
  - `Continue ritual` -> navigate to next unfinished step.
  - `Claim reward` -> claim flow and updated state handling.
- Close sheet first, then route/execute action (per confirmed behavior).
- Keep secondary close control intact.

### 5. Recompose Ritual + Progress Blocks
- **Task ID**: recompose-ritual-progress-blocks
- **Depends On**: implement-dynamic-primary-cta
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: completed
- Comments: Rebuilt ritual steps and 7-day progress hierarchy with next-step emphasis.
- Rework 3-step ritual and 7-day progress into clearer hierarchy supporting the hero and CTA.
- Reduce visual clutter while preserving semantic clarity of active/full/today states.
- Add subtle emphasis cues for next best action.

### 6. Add A/B-Ready Variant System
- **Task ID**: add-ab-ready-variant-system
- **Depends On**: recompose-ritual-progress-blocks
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: completed
- Comments: Added variant resolver/constants and style split for `premium` vs `premium-lite`.
- Implement two variants (e.g., `premium` and `premium-lite`) behind prop/flag.
- Keep behavior parity (same data and CTA logic), differ in visual intensity/layout nuance only.
- Ensure safe default variant when flag missing.

### 7. Add Ritual/Coaching Microcopy (EN + UK)
- **Task ID**: add-ritual-coaching-copy
- **Depends On**: add-ab-ready-variant-system
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: completed
- Comments: Added EN/UK `dailyPage.energySheet.*` copy keys in messages bundle.
- Add concise motivational copy for hero/CTA/helper states in both EN and UK.
- Keep tone supportive and action-oriented, avoiding heavy/guilt pressure.
- Ensure key names are scoped and backward-compatible with existing i18n usage.

### 8. Add Analytics for Retention Funnel
- **Task ID**: add-analytics-retention-funnel
- **Depends On**: add-ritual-coaching-copy
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: true
- Status: completed
- Comments: Added `energy_sheet_opened`, `energy_sheet_variant_exposed`, `energy_sheet_cta_clicked`, and `energy_sheet_reward_claimed`.
- Track events with consistent schema:
  - `energy_sheet_opened`
  - `energy_sheet_cta_clicked`
  - `energy_sheet_reward_claimed`
  - `energy_sheet_variant_exposed`
- Include minimal useful params (variant, ritual_done_count, state, locale, source).

### 9. Motion & Performance Hardening
- **Task ID**: motion-performance-hardening
- **Depends On**: add-ab-ready-variant-system
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: true
- Status: completed
- Comments: Added reduced-motion handling plus premium-lite fallback to limit animation intensity.
- Apply medium-intensity motion by default.
- Add reduced-motion and lite-mode fallbacks to reduce heavy blur/glow/continuous animation costs.
- Ensure stable interaction on iPhone X-class constraints.

### 10. Validation and Regression Pass
- **Task ID**: validate-all
- **Depends On**: add-analytics-retention-funnel, motion-performance-hardening
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: completed
- Comments: `npm run lint`, `npm test`, and `npm run build` all pass after implementation.
- Run lint/tests/build checks.
- Manually verify no-scroll sheet behavior across compact and large viewport profiles.
- Verify no breakage in existing ritual data logic and reward API calls.

## Acceptance Criteria

- Sheet content redesign is isolated to `DailyRitualProgressComponent` integration path.
- Existing ritual completion/streak/progress logic and backend contracts remain intact.
- No-scroll layout in target mobile viewport constraints, including iPhone X baseline.
- Premium dark-metal + glow visual treatment is applied with improved hierarchy and legibility.
- Dynamic primary CTA behaves correctly by state and closes sheet before action.
- Reward/unlock state is visibly clear and meaningfully tied to daily completion.
- Two visual variants are available behind a flag with safe default behavior.
- EN + UK ritual/coaching copy is fully wired and displayed correctly.
- Retention analytics events fire with required parameters.
- Reduced-motion/lite-mode behavior gracefully lowers animation/render cost.

## Validation Commands
Execute these commands to validate the task is complete:

- `npm run lint`
- `npm test`
- `npm run build`

## Notes

- Keep implementation intentionally local: avoid spreading redesign logic across unrelated screens.
- Prefer extracting state derivation into pure helpers if component complexity grows.
- If reward claim UX depends on backend state timing, use optimistic UI with safe rollback messaging.
- Track rollout metrics by variant to compare engagement/retention impact before full rollout.

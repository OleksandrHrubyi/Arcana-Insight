# Plan: Onboarding Home Action MVP

## Task Description
Upgrade the existing single-screen onboarding so it gives a clearer immediate next step while keeping friction low. The flow remains one screen with optional interest selection and separate `Skip` / `Continue` actions, but `Continue` should guide users to Home (`name: 'menu'`, `path: '/menu'`) rather than directly to Daily Card, show concise action-oriented copy, and emit onboarding analytics events. Navigation should prioritize a validated `from` route and otherwise fall back to Home with replace behavior to prevent back navigation into onboarding.

## Objective
Ship a low-friction onboarding MVP that improves first meaningful action start and supports D1 retention tracking by clarifying what happens next, routing users correctly, and instrumenting required analytics events.

## Problem Statement
Current onboarding is visually acceptable but behaviorally thin: it does not strongly communicate the immediate next step, uses broad route acceptance for `from`, lacks onboarding-specific event instrumentation, and has no QA-friendly analytics fallback in dev. This limits confidence in whether onboarding is effectively driving users into their first useful in-app action.

## Solution Approach
Keep onboarding as a single page and focus on behavior clarity:
- Add concise “what happens next” copy above actions.
- Keep onboarding copy practical and action-oriented, with mystical tone only as support.
- Keep interests optional and persist normalized values as today.
- Preserve one-time onboarding completion behavior for both `Skip` and `Continue`.
- Introduce route whitelist validation for `from`.
- Route rules:
  - valid `from` -> `router.push(from)`
  - invalid/missing `from` -> `router.replace({ name: 'menu' })`
- Whitelist policy:
  - `from` is received as `fullPath`; resolver must validate by normalized pathname (and may additionally map to route names).
  - Allowed pathnames (strict MVP-safe first-run): `/`, `/menu`, `/horoscope`, `/tarot`, `/daily`.
  - Blocked pathnames: `/onboarding`, `/login`, `/sign-up`, `/confirm-code`, `/reset-password`, `/premium`, `/settings`, `/account`, `/tarot-interpretation`, `/cards`, `/zodiac-guide`, `/compatibility`, `/readings`, `/rewards`, and any non-app/external path.
  - Query/hash are allowed only when base pathname is allowlisted.
- Add required onboarding analytics events and payload shape.
- Add dev fallback logging for analytics no-op scenarios to support QA.
- Keep architecture A/B-ready via env-controlled onboarding flow flag scaffolding only if it is near-zero overhead and does not delay MVP delivery.

## Relevant Files
Use these files to complete the task:

- `src/components/main/OnboardingComponent.vue`
  - Main UI/behavior changes: copy block, continue/skip behavior, haptic feedback, analytics calls.
- `src/helpers/onboardingPrefs.js`
  - Keep one-time completion and interest persistence behavior; update only if helper extraction is needed.
- `src/router/guard.js`
  - Ensure onboarding redirect interactions remain correct after navigation-rule changes.
- `src/router/index.js`
  - Validate compatibility of guard + route transition behavior.
- `src/i18n/messages.bundle.js`
  - Add EN/UK onboarding copy for “what happens next” and any updated action-oriented text keys.
- `src/services/analytics.js`
  - Add optional dev fallback logging path for QA when native analytics is unavailable.
- `src/constants/analyticsEvents.js`
  - Add onboarding event constants for standardized naming and easier regression checks.
- `tests/onboardingPrefs.test.js`
  - Keep persistence/normalization contract covered.
- `tests/routerGuard.test.js`
  - Regression coverage for onboarding redirect behavior.
- `tests/analyticsEvents.test.js`
  - Extend coverage for onboarding event constants.

### New Files

- `src/helpers/onboardingRouteTarget.js`
  - Pure helper to resolve validated onboarding target route using whitelist and fallback rules (`fallback: { name: 'menu' }`).
- `tests/onboardingRouteTarget.test.js`
  - Coverage for whitelist, valid `from`, invalid `from`, and fallback-to-Home behavior.
- `tests/onboardingFlow.test.js`
  - Flow-level unit tests for skip/continue intent mapping, analytics trigger mapping, and replace-vs-push rule selection.

## Implementation Phases
IMPORTANT: Each phase should be a checkbox that will be checked off during implementation. Include Status and Comments fields for tracking progress.

- [ ] **Phase 1: Routing and Behavior Contract** - Define and implement onboarding target resolution with whitelist and explicit Home fallback (`{ name: 'menu' }`) semantics.
  - Status: pending
  - Comments:

- [ ] **Phase 2: UX Messaging and Interaction Updates** - Update onboarding copy, action framing, and continue/skip interaction behavior.
  - Status: pending
  - Comments:

- [ ] **Phase 3: Analytics and Validation** - Add required events, dev fallback logging, and tests for flow and navigation behavior.
  - Status: pending
  - Comments:

## Team Orchestration

- Default executor: `codex` (single-agent implementation).
- Break work into clear dependency-ordered tasks.
- Mark each task with:
  - **Owner** (default: codex)
  - **Parallel** (true/false)
  - **Depends On** (task IDs or none)
- Use parallel execution only for independent read-only exploration or validations.

### Team Members

- Codex
  - Name: codex
  - Role: primary implementer and validator
  - Agent Type: codex
  - Resume: true

## Step by Step Tasks

- Execute tasks top-to-bottom unless marked parallel and dependency-free.
- Each task must have a stable `Task ID` and explicit dependency field.

### 1. Lock Routing Decisions and Whitelist
- **Task ID**: define-onboarding-route-contract
- **Depends On**: none
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: pending
- Comments:
- Lock Home fallback route to `{ name: 'menu' }` (`/menu`) for this MVP.
- Implement route whitelist for accepted `from` targets and reject onboarding/self loops.
- Implement route whitelist using explicit path allowlist/blocklist, not broad path-prefix inference.
- Document push-vs-replace rules in helper-level comments and tests.

### 2. Implement Route Target Helper and Integrate Onboarding Actions
- **Task ID**: implement-route-target-helper
- **Depends On**: define-onboarding-route-contract
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: pending
- Comments:
- Add pure helper for target resolution (`valid from -> push`, `fallback home -> replace`).
- Refactor `OnboardingComponent` skip/continue handlers to use helper output consistently.
- Preserve one-time completion semantics for both actions.

### 3. Update Onboarding UX Copy and CTA Context
- **Task ID**: update-onboarding-copy-and-cta-context
- **Depends On**: implement-route-target-helper
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: pending
- Comments:
- Add short practical “what’s next” block above action buttons with light mystical tone.
- Keep `Continue` label and maintain optional interest selection behavior.
- Add light micro-feedback on `Continue` without adding friction.

### 4. Add Analytics Event Constants and Onboarding Event Emission
- **Task ID**: add-onboarding-analytics-events
- **Depends On**: implement-route-target-helper
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: true
- Status: pending
- Comments:
- Add event constants for:
  - `onboarding_view`
  - `interest_select`
  - `continue_click`
  - `skip_click`
  - `first_action_click` (not emitted by onboarding; emitted by Home CTA or first action launcher after onboarding navigation)
  - `first_action_complete` (for Daily Card when content is shown; integrated in Home/Daily flow, not onboarding exit handler, and non-blocking for onboarding MVP if follow-up is required)
- Emit `onboarding_view` on mounted once per screen open.
- Emit `interest_select` with `interest_key`, `action`, `selected_count`.
- Emit `skip_click` and `continue_click` with required payload:
  - `resolved_target`
  - `navigation_mode` (`push` or `replace`)
  - `had_valid_from`
  - `selected_count`
- Keep onboarding telemetry limited to onboarding intent/exit signals; first useful action telemetry starts only after Home is shown.

### 5. Add Dev Analytics Fallback Logging
- **Task ID**: add-dev-analytics-fallback
- **Depends On**: add-onboarding-analytics-events
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: pending
- Comments:
- Add dev-only fallback logging (QA visibility) when analytics cannot send natively.
- Keep production behavior unchanged and no-op safe.

### 6. Add Env-Based Flow Flag Scaffolding
- **Task ID**: add-onboarding-env-flag-scaffold
- **Depends On**: update-onboarding-copy-and-cta-context
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: true
- Status: pending
- Comments:
- Introduce `import.meta.env` based onboarding flow/version flag for future controlled rollout.
- Keep current MVP as default active path with no user-visible branching complexity.
- Skip this task if it adds rollout complexity that risks MVP timing.
- Non-blocking: skip without affecting MVP acceptance criteria.

### 7. Add and Update Tests
- **Task ID**: add-onboarding-mvp-tests
- **Depends On**: add-dev-analytics-fallback
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: pending
- Comments:
- Add tests for route resolver whitelist behavior and fallback to Home.
- Add tests for skip flow, continue flow, and replace navigation behavior.
- Extend analytics constants/event mapping tests and keep onboarding prefs coverage green.
- Ensure first-action completion semantics are tested where the Daily Card content-ready condition is observable.

### 8. Final Validation
- **Task ID**: validate-all
- **Depends On**: add-onboarding-mvp-tests
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: pending
- Comments:
- Run all validation commands.
- Verify acceptance criteria are met.

## Acceptance Criteria
- Onboarding remains a single screen with optional interests (no required minimum selection).
- `Skip` and `Continue` both mark onboarding complete and do not re-show onboarding by default.
- `Continue` shows clearer action-oriented next-step context and includes subtle micro-feedback.
- Above the fold, users can understand what happens after tapping `Continue` without scrolling.
- On common iPhone sizes, primary CTA and “what happens next” copy stay visible above the fold without scrolling.
- Route behavior follows:
  - valid whitelisted `from` -> push to `from`
  - invalid/missing `from` -> replace to `{ name: 'menu' }`
- After default onboarding completion flow (no valid `from`), back navigation must not return user to onboarding.
- Onboarding emits required events with agreed payload fields.
- `first_action_click` is emitted by Home CTA (or first action launcher), not by onboarding exit.
- `first_action_complete` is emitted when first action content is actually shown (Daily Card), not at onboarding completion; do not block onboarding MVP on this wiring, and track it in follow-up P1 if integration is broader than onboarding scope.
- Dev fallback analytics logging is visible in QA/dev and does not alter production behavior.
- EN and UK onboarding copy updates are present in `messages.bundle.js`.
- Tests cover: onboarding prefs, route target resolver, skip flow, continue flow, analytics fire, replace navigation behavior, fallback-to-Home.

## Validation Commands
Execute these commands to validate the task is complete:

- `npm run lint`
- `npm test`
- `npm run build`

## Notes
- Home route is fixed for this MVP: `name: 'menu'`, `path: '/menu'`.
- Scope excludes broad backend or non-onboarding flow changes; backend touches are allowed only if strictly onboarding-specific and needed.
- `first_action_complete` should be wired at the actual first useful action screen (Daily Card content shown), not at onboarding exit.
- If `first_action_complete` wiring requires non-trivial Home/Daily refactor, split that part into a follow-up P1 integration task without blocking onboarding P0 shipment.
- Onboarding P0 delivery must not be delayed by `first_action_complete` integration complexity.
- Onboarding copy must remain short, practical, and CTA-forward; mystical phrasing is supportive only.

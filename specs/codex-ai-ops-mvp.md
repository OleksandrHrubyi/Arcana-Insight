# Plan: Codex AI Ops MVP

## Task Description
Create a separate implementation plan for a Codex-first AI ops layer that supports Arcana Insight release work without depending on Claude as the primary orchestrator. The MVP should prioritize deterministic project checks, low recurring cost, local execution, and a thin Codex summarization/fix layer on top of structured outputs. The goal is to replace the current “autonomous AI command center” framing with a practical release cockpit that can be implemented incrementally inside this repository.

## Objective
Define a concrete MVP architecture, file structure, execution model, and phased task list for building `ai-ops/` in a way that is cheap to run, grounded in repo facts, and naturally compatible with Codex workflows in this project.

## Problem Statement
The current AI ops concept is split between a broad product vision and a lighter implementation plan, but both still assume an LLM-heavy control plane. That makes the system more expensive, harder to trust, and harder to keep stable. For Arcana Insight, the highest-value near-term need is not full autonomy. It is fast, repeatable visibility into release blockers, broken tests, i18n drift, duplicate files, build failures, and daily priorities. Those signals should come from deterministic scripts first, with Codex used selectively for synthesis, explanation, and targeted patch generation.

## Solution Approach
Build the MVP around four layers:

1. Deterministic local checks
   - Node scripts scan the repo and generate JSON or Markdown outputs.
   - These checks own primary detection for code issues, launch readiness, tests, and build status.

2. Structured outputs
   - Each check writes stable machine-readable files into `ai-ops/output/`.
   - The dashboard and Codex commands consume the same output files.

3. Codex command layer
   - Codex is used for:
     - daily prioritization from existing outputs
     - human-readable failure explanation
     - optional targeted fix generation from a known issue artifact
   - Codex is not the primary scanner.

4. Lightweight dashboard
   - A local static dashboard reads the generated files and provides one-glance release visibility.

Design constraints for the MVP:
- no always-on orchestration daemon
- no mandatory Telegram bot
- no Builder Agent / autonomous PR generation in phase 1
- no runtime log ingestion until the local checks are stable
- no duplication of existing `.claude` and `.codex` command responsibilities

## Relevant Files
Use these files to complete the task:

- `.claude/AI_OPS_VISION.md`
  - Source document for the broader ambition; useful as north-star context only.
- `.claude/AI_OPS_PLAN.md`
  - Existing implementation framing that should be superseded by this lower-cost MVP plan.
- `.codex/commands/plan_w_codex.md`
  - Existing spec format and execution expectations for Codex-based planning.
- `.codex/commands/implement_w_codex.md`
  - Downstream implementation workflow that will consume this plan if execution starts later.
- `.codex/RULES.md`
  - Local Codex behavior and command expectations that the MVP should fit rather than bypass.
- `CLAUDE.md`
  - Existing project memory/context source that may still be read by future tooling, but should not be treated as the core runtime orchestrator for MVP.
- `package.json`
  - Likely home for scripts used to run checks and dashboard helpers.
- `tests/`
  - Existing test surface that should be reused by test-status checks rather than recreated in a parallel system.
- `src/i18n/`
  - Target area for parity checks and hardcoded-string scanning.
- `src/router/routes.js`
  - Target area for route coverage / empty-screen checks in launch-readiness scans.
- `docs/definition-of-done-mobile.md`
  - Useful for converting product readiness into explicit launch-readiness checks.
- `docs/canonical-files.md`
  - Useful for duplicate-file and active-file heuristics in code scanning.

### New Files

- `specs/codex-ai-ops-mvp.md`
  - This implementation plan.
- `ai-ops/README.md`
  - Operator-facing documentation for setup, commands, and output contracts.
- `ai-ops/checks/code-scan.js`
  - Deterministic scan for TODOs, duplicate/suspect files, i18n drift, hidden blocks, and empty screens.
- `ai-ops/checks/launch-readiness.js`
  - Deterministic release-readiness checks for app-store-adjacent blockers and route/screen coverage.
- `ai-ops/checks/test-status.js`
  - Test runner/output parser that writes structured pass/fail summaries.
- `ai-ops/checks/build-status.js`
  - Build/sync verification that writes structured results for Quasar/Capacitor checks.
- `ai-ops/briefing/generate-brief.js`
  - Thin orchestration script that reads outputs and prepares a prompt/context package for Codex summarization.
- `ai-ops/output/.gitkeep`
  - Keeps the output directory structure in version control.
- `ai-ops/dashboard/index.html`
  - Static dashboard that reads `ai-ops/output/*`.
- `ai-ops/dashboard/app.js`
  - Client-side rendering for dashboard panels.
- `.codex/commands/ai_ops_scan.md`
  - Codex command to run or guide local checks and summarize generated artifacts.
- `.codex/commands/ai_ops_brief.md`
  - Codex command to generate a daily brief from structured outputs.
- `.codex/commands/ai_ops_fix.md`
  - Codex command to generate a targeted implementation plan or patch proposal from a known issue artifact.
- `tests/ai-ops/code-scan.test.js`
  - Coverage for output schema and detection rules.
- `tests/ai-ops/launch-readiness.test.js`
  - Coverage for readiness rules and blocker classification.
- `tests/ai-ops/output-contracts.test.js`
  - Coverage for JSON/Markdown contract stability across checks.

## Implementation Phases
IMPORTANT: Each phase should be a checkbox that will be checked off during implementation. Include Status and Comments fields for tracking progress.

- [ ] **Phase 1: Define Contracts and Repo-Fact Checks** - Establish deterministic checks, output schemas, and operator commands without any cloud automation dependency.
  - Status: pending
  - Comments:

- [ ] **Phase 2: Build Dashboard and Codex Command Layer** - Add the local dashboard and Codex-first briefing/fix workflow on top of generated outputs.
  - Status: pending
  - Comments:

- [ ] **Phase 3: Integrate Validation and Optional Automation Hooks** - Add package scripts, tests, and optional scheduled execution once the core local flow is stable.
  - Status: pending
  - Comments:

## Team Orchestration

- Execution model: single primary executor (`codex`) unless explicit fan-out is requested later.
- Keep task order dependency-driven and avoid parallel implementation where files overlap.
- Parallel work is acceptable only for isolated read-only analysis or disjoint test additions.
- The MVP should fit the current repository’s Codex workflow instead of creating a second orchestration framework.

### Team Members

- Codex
  - Name: codex
  - Role: primary implementer and validator
  - Agent Type: codex
  - Resume: true

## Step by Step Tasks

- Execute tasks top-to-bottom unless marked `Parallel: true` and dependency-free.
- Each task must include a stable `Task ID`.

### 1. Lock the MVP Scope and Non-Goals
- **Task ID**: lock-codex-ai-ops-mvp-scope
- **Depends On**: none
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: pending
- Comments:
- Translate the broad AI ops vision into a narrower MVP with explicit non-goals.
- Record that Builder Agent, Telegram bot, Supabase log watcher, and autonomous PR generation are out of phase 1 scope.
- Confirm that deterministic local checks are the source of truth for issue detection.

### 2. Define Output Contracts
- **Task ID**: define-ai-ops-output-contracts
- **Depends On**: lock-codex-ai-ops-mvp-scope
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: pending
- Comments:
- Define JSON and Markdown schemas for:
  - `scan.json`
  - `launch.json`
  - `tests.json`
  - `build.json`
  - `briefing.md`
- Standardize severity fields, timestamps, categories, and summary blocks so dashboard and Codex commands consume one stable format.

### 3. Implement Deterministic Code Scan
- **Task ID**: implement-code-scan-check
- **Depends On**: define-ai-ops-output-contracts
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: pending
- Comments:
- Build `code-scan.js` to detect:
  - TODO / FIXME / not-implemented markers
  - duplicate or suspect filenames
  - i18n key parity drift
  - hidden or disabled UI blocks
  - route-linked empty placeholders
- Prefer deterministic heuristics and explicit rule lists over model inference.

### 4. Implement Launch Readiness Check
- **Task ID**: implement-launch-readiness-check
- **Depends On**: define-ai-ops-output-contracts
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: pending
- Comments:
- Build `launch-readiness.js` to classify blockers vs warnings for release preparation.
- Reuse existing docs and app-store release materials where possible instead of inventing new criteria.
- Include readiness categories such as routes/screens, i18n parity, store assets/config references, premium gating consistency, and required policy links where those can be verified locally.

### 5. Implement Test and Build Status Checks
- **Task ID**: implement-test-and-build-checks
- **Depends On**: define-ai-ops-output-contracts
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: true
- Status: pending
- Comments:
- Add `test-status.js` to run tests and write structured pass/fail/coverage summaries.
- Add `build-status.js` to run the minimum trusted build/sync commands and write structured results.
- Capture command, exit code, duration, and key failure excerpts.

### 6. Add Package Scripts and README
- **Task ID**: add-ai-ops-package-scripts-and-docs
- **Depends On**: implement-code-scan-check, implement-launch-readiness-check, implement-test-and-build-checks
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: pending
- Comments:
- Add predictable package scripts for running each check and the combined sweep.
- Document operator usage, output locations, assumptions, and limitations in `ai-ops/README.md`.

### 7. Build the Local Dashboard
- **Task ID**: build-ai-ops-dashboard
- **Depends On**: add-ai-ops-package-scripts-and-docs
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: pending
- Comments:
- Create a simple static dashboard that reads generated outputs and shows:
  - launch readiness
  - today’s focus
  - test/build status
  - top code issues
- Keep the UI operational and dense, not decorative.

### 8. Add Codex Commands for Scan, Brief, and Fix
- **Task ID**: add-codex-ai-ops-commands
- **Depends On**: build-ai-ops-dashboard
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: pending
- Comments:
- Add Codex command docs for:
  - running the scan stack
  - generating a daily brief from outputs
  - preparing a targeted fix proposal from a known issue
- Keep these commands thin and output-driven rather than agent-orchestrator-heavy.

### 9. Add Tests for Contracts and Check Logic
- **Task ID**: add-ai-ops-tests
- **Depends On**: add-codex-ai-ops-commands
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: pending
- Comments:
- Add tests for check rules, output schemas, and stability of severity classification.
- Ensure the checks fail loudly when output contracts drift.

### 10. Final Validation
- **Task ID**: validate-all
- **Depends On**: add-ai-ops-tests
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: pending
- Comments:
- Run all validation commands.
- Verify acceptance criteria are met.

## Acceptance Criteria
- A new plan exists that defines a Codex-first `ai-ops/` MVP separately from the current `.claude/AI_OPS_*` docs.
- The MVP architecture makes deterministic scripts the primary source of issue detection.
- Codex is scoped to summarization, explanation, and targeted fix assistance rather than primary scanning.
- The plan defines a concrete `ai-ops/` file structure, including checks, outputs, dashboard, and Codex commands.
- The plan explicitly excludes high-cost autonomy features from phase 1.
- The plan includes stable output contracts that can be consumed by both dashboard code and Codex commands.
- The plan is implementation-ready in the existing `specs/` format used by this repository.

## Validation Commands
Execute these commands to validate the task is complete:

- `test -f specs/codex-ai-ops-mvp.md`
- `grep -n "## Task Description" specs/codex-ai-ops-mvp.md`
- `grep -n "## Team Orchestration" specs/codex-ai-ops-mvp.md`
- `grep -n "## Acceptance Criteria" specs/codex-ai-ops-mvp.md`

## Notes
- This plan intentionally does not assume any always-on Claude API usage.
- If OpenAI API usage is added later, keep it narrow and artifact-driven:
  - summarize existing outputs
  - explain a failing command
  - propose a patch from a known issue bundle
- Future phases may add:
  - scheduled local runs via `launchd`
  - optional Supabase log ingestion
  - optional Telegram notifications
  - optional cloud/background Codex workflows
- Do not create a parallel memory/orchestration system if the existing `.codex` command layer is sufficient.

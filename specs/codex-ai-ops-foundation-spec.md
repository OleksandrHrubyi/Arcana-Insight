# Plan: Codex AI Ops Foundation Spec

## Task Description
Define the technical foundation for a scalable, Codex-first `ai-ops` system inside Arcana Insight. This spec should lock the core directory structure, shared output contracts, deterministic check architecture, artifact flow, dashboard inputs, and Codex command boundaries before implementation starts. The foundation must support cheap local use first, then scale cleanly into scheduled runs, CI, and optional cloud/background workflows later without rewriting the core.

## Objective
Produce an implementation-ready technical spec that fixes the architecture of `ai-ops` around deterministic checks, stable artifacts, and a thin Codex operator layer so future implementation can proceed without re-deciding the system shape.

## Problem Statement
Without a hard technical foundation, `ai-ops` will drift into an expensive and fragile LLM-first system. The main risks are:
- checks returning incompatible output formats
- business logic leaking into dashboard or command files
- AI becoming the primary detector instead of the interpreter
- future CI/scheduled execution needing a rewrite
- expanding into more agents before the basic contracts are stable

Arcana Insight does not need autonomous orchestration first. It needs a trustworthy release cockpit with deterministic facts, stable artifacts, and clear operator workflows.

## Solution Approach
Build `ai-ops` around these fixed architectural rules:

1. Deterministic checks are the source of truth.
   - Checks scan the repo, run commands, and classify issues with explicit rules.
   - Checks do not depend on model calls.

2. Every check returns the same envelope.
   - Shared `CheckResult` and `Issue` shapes are defined once and reused everywhere.

3. Output is artifact-first.
   - Checks write into `ai-ops/output/latest/` and optionally snapshot into `ai-ops/output/history/`.
   - Dashboard and Codex commands both consume the same artifacts.

4. Codex is an operator layer.
   - Codex summarizes, prioritizes, and helps fix known issues.
   - Codex does not own primary scanning logic.

5. The system scales by adding checks, not by replacing architecture.
   - Local runs, cron, CI, and cloud/background flows all call the same checks and read the same outputs.

6. No phase-1 autonomy features.
   - No Telegram bot
   - No Builder Agent
   - No autonomous PR creation
   - No mandatory runtime log ingestion

## Relevant Files
Use these files to complete the task:

- `specs/codex-ai-ops-mvp.md`
  - High-level Codex-first MVP plan that this document refines into a harder technical architecture.
- `.claude/AI_OPS_VISION.md`
  - North-star vision that should inform ambition but not dictate phase-1 implementation.
- `.claude/AI_OPS_PLAN.md`
  - Prior plan to supersede with a deterministic and lower-cost foundation.
- `.codex/commands/plan_w_codex.md`
  - Repo-standard spec format and execution structure.
- `.codex/commands/implement_w_codex.md`
  - Downstream implementation workflow that will consume this spec.
- `package.json`
  - Home for future `ai-ops` scripts.
- `tests/`
  - Existing test harness area to extend with `ai-ops` foundation coverage.
- `docs/definition-of-done-mobile.md`
  - Useful source for launch readiness rule design.
- `docs/canonical-files.md`
  - Useful source for duplicate/suspect-file logic and active-file heuristics.
- `src/router/routes.js`
  - Future input for route coverage and launch-readiness checks.
- `src/i18n/en.json`
  - Future input for i18n parity checks.
- `src/i18n/uk.json`
  - Future input for i18n parity checks.

### New Files

- `specs/codex-ai-ops-foundation-spec.md`
  - This technical foundation spec.
- `ai-ops/core/constants.js`
  - Shared names, severities, categories, and default filenames.
- `ai-ops/core/types.js`
  - JSDoc-defined contracts for `Issue`, `CheckSummary`, `CheckResult`, and `Manifest`.
- `ai-ops/core/issue.js`
  - Factory helpers for normalized issue creation.
- `ai-ops/core/severity.js`
  - Severity ordering, counts, and sort helpers.
- `ai-ops/core/checkRunner.js`
  - Shared runner envelope for all checks.
- `ai-ops/core/outputPaths.js`
  - Centralized output path resolution for `latest/` and `history/`.
- `ai-ops/core/writeOutput.js`
  - Shared writers for JSON and Markdown artifacts.
- `ai-ops/core/readOutput.js`
  - Shared readers for dashboard and briefing consumers.
- `ai-ops/core/clock.js`
  - Timestamp formatting helpers.
- `ai-ops/core/manifest.js`
  - Aggregates check results into a dashboard-friendly manifest.
- `ai-ops/checks/code-scan.js`
  - Deterministic repo scan.
- `ai-ops/checks/launch-readiness.js`
  - Deterministic release readiness scan.
- `ai-ops/checks/test-status.js`
  - Structured test execution summary.
- `ai-ops/checks/build-status.js`
  - Structured build execution summary.
- `ai-ops/briefing/buildBriefingInput.js`
  - Assembles compact structured context for Codex briefing commands.
- `ai-ops/output/latest/manifest.json`
  - Aggregated latest-check index.
- `tests/ai-ops/output-contracts.test.js`
  - Validates the shared output schema.
- `tests/ai-ops/manifest.test.js`
  - Validates aggregation and manifest shape.

## Implementation Phases
IMPORTANT: Each phase should be a checkbox that will be checked off during implementation. Include Status and Comments fields for tracking progress.

- [ ] **Phase 1: Core Contracts and Artifact Pipeline** - Create shared types, issue helpers, runner, writers, and manifest pipeline before any check logic expands.
  - Status: pending
  - Comments:

- [ ] **Phase 2: Deterministic Check Set** - Implement the initial four checks (`code-scan`, `launch-readiness`, `test-status`, `build-status`) against the shared contracts.
  - Status: pending
  - Comments:

- [ ] **Phase 3: Operator Surfaces** - Add dashboard and Codex command consumers on top of stable artifacts without changing check contracts.
  - Status: pending
  - Comments:

## Team Orchestration

- Execution model: single primary executor (`codex`).
- Keep implementation dependency-driven and file ownership clear.
- Do not parallelize edits across overlapping `ai-ops/core/` files.
- Only treat scaling layers as valid if they reuse the same core contracts and artifact structure.

### Team Members

- Codex
  - Name: codex
  - Role: primary implementer and validator
  - Agent Type: codex
  - Resume: true

## Step by Step Tasks

- Execute tasks top-to-bottom unless marked `Parallel: true` and dependency-free.
- Each task must include a stable `Task ID`.

### 1. Lock Core Contracts
- **Task ID**: lock-ai-ops-core-contracts
- **Depends On**: none
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: pending
- Comments:
- Define the canonical shapes for:
  - `Issue`
  - `CheckSummary`
  - `CheckResult`
  - `Manifest`
- Freeze severity scale to `info | warning | blocker`.
- Freeze result status scale to `ok | warning | failed`.

### 2. Build Shared Core Modules
- **Task ID**: build-ai-ops-core-modules
- **Depends On**: lock-ai-ops-core-contracts
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: pending
- Comments:
- Implement:
  - `constants.js`
  - `types.js`
  - `issue.js`
  - `severity.js`
  - `clock.js`
  - `outputPaths.js`
  - `writeOutput.js`
  - `readOutput.js`
  - `checkRunner.js`
- Keep this layer model-agnostic and app-agnostic except for output locations.

### 3. Implement Manifest Aggregation
- **Task ID**: implement-ai-ops-manifest
- **Depends On**: build-ai-ops-core-modules
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: pending
- Comments:
- Create a manifest builder that summarizes latest check status, top issues, and output paths.
- Ensure dashboard code can render from manifest without knowing check internals.

### 4. Implement Deterministic Code Scan
- **Task ID**: implement-foundation-code-scan
- **Depends On**: build-ai-ops-core-modules
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: pending
- Comments:
- Detect:
  - TODO / FIXME / not-implemented markers
  - suspect duplicate filenames
  - i18n key parity issues
  - hidden UI blocks
  - route-linked empty placeholders
- Output normalized `Issue` records only; no dashboard or model-specific logic.

### 5. Implement Launch Readiness Check
- **Task ID**: implement-foundation-launch-readiness
- **Depends On**: build-ai-ops-core-modules
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: pending
- Comments:
- Build explicit rules for blocker/warning classification.
- Reuse existing docs and release materials where possible.
- Keep launch readiness deterministic and explainable.

### 6. Implement Test and Build Checks
- **Task ID**: implement-foundation-test-build-checks
- **Depends On**: build-ai-ops-core-modules
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: true
- Status: pending
- Comments:
- Add structured wrappers around trusted test/build commands.
- Capture exit code, duration, command, and concise failure excerpts.
- Keep raw command output out of dashboard-facing contracts except as trimmed excerpts.

### 7. Add Contract and Aggregation Tests
- **Task ID**: add-foundation-contract-tests
- **Depends On**: implement-ai-ops-manifest, implement-foundation-code-scan, implement-foundation-launch-readiness, implement-foundation-test-build-checks
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: pending
- Comments:
- Add tests for:
  - output shape stability
  - severity counts
  - manifest aggregation
  - failure-safe runner behavior

### 8. Add Operator Surfaces
- **Task ID**: add-foundation-operator-surfaces
- **Depends On**: add-foundation-contract-tests
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: pending
- Comments:
- Add:
  - dashboard reader surfaces
  - briefing input builder
  - Codex command stubs or command docs
- These consumers must read artifacts only.

### 9. Final Validation
- **Task ID**: validate-all
- **Depends On**: add-foundation-operator-surfaces
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: pending
- Comments:
- Run all validation commands.
- Verify acceptance criteria are met.

## Acceptance Criteria
- A dedicated technical foundation spec exists for `ai-ops`.
- The spec fixes the canonical shapes for `Issue`, `CheckResult`, and `Manifest`.
- The spec defines a stable `ai-ops/core/` layer before check-specific logic.
- The spec defines `output/latest/` and `output/history/` as the artifact model.
- The spec makes deterministic checks the source of truth and Codex the operator layer.
- The spec defines an implementation order that avoids rework.
- The spec is detailed enough to start implementing `ai-ops/core/` immediately.

## Validation Commands
Execute these commands to validate the task is complete:

- `test -f specs/codex-ai-ops-foundation-spec.md`
- `grep -n "## Task Description" specs/codex-ai-ops-foundation-spec.md`
- `grep -n "## Solution Approach" specs/codex-ai-ops-foundation-spec.md`
- `grep -n "## Step by Step Tasks" specs/codex-ai-ops-foundation-spec.md`
- `grep -n "## Acceptance Criteria" specs/codex-ai-ops-foundation-spec.md`

## Notes
- Canonical directory structure:

```text
ai-ops/
  core/
  checks/
  briefing/
  output/
    latest/
    history/
  dashboard/
```

- Canonical `Issue` shape:

```json
{
  "id": "i18n-missing-home-title",
  "source": "code-scan",
  "severity": "warning",
  "category": "i18n",
  "title": "Missing key in uk locale",
  "details": "Key exists in en.json but is missing in uk.json",
  "file": "src/i18n/uk.json",
  "line": 120,
  "ruleId": "i18n-parity",
  "suggestedAction": "Add matching translation key in uk locale",
  "meta": {
    "key": "home.title"
  }
}
```

- Canonical `CheckResult` shape:

```json
{
  "check": "code-scan",
  "version": 1,
  "status": "warning",
  "startedAt": "2026-04-29T09:00:00.000Z",
  "finishedAt": "2026-04-29T09:00:02.120Z",
  "durationMs": 2120,
  "summary": {
    "totalIssues": 8,
    "blockers": 1,
    "warnings": 5,
    "infos": 2
  },
  "issues": [],
  "meta": {}
}
```

- Canonical scaling rule:
  - new capability = new check or new artifact consumer
  - not a rewrite of existing contracts

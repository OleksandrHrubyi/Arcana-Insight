# AI Ops

`ai-ops/` is the local deterministic release cockpit for Arcana Insight.

It does not use a model as the primary scanner. Checks produce structured artifacts first. Codex reads those artifacts for summary, prioritization, and targeted fixes.

## Directory Layout

- `core/`
  - shared contracts, issue helpers, output IO, manifest builder
- `checks/`
  - deterministic project checks
- `briefing/`
  - artifact-to-brief assembly
- `dashboard/`
  - local read-only dashboard
- `output/latest/`
  - current artifacts consumed by dashboard and commands
- `output/history/`
  - timestamped snapshots from previous runs

## Current Checks

- `code-scan`
  - duplicate-looking files
  - comment markers like TODO / FIXME / not implemented
  - i18n parity drift
  - hidden UI blocks
  - placeholder screens
- `launch-readiness`
  - release checklist status
  - route file existence
  - required app-store files
  - required public URLs
  - stray iOS config copies
- `test-status`
  - test command result and TAP summary
- `build-status`
  - build command result and failure excerpt

## Output Files

Latest output lives in `ai-ops/output/latest/`:

- `scan.json`
- `launch.json`
- `tests.json`
- `build.json`
- `manifest.json`
- `briefing.md`

`manifest.json` is the dashboard entrypoint.

## NPM Commands

- `npm run ai:scan:code`
- `npm run ai:scan:launch`
- `npm run ai:scan:test`
- `npm run ai:scan:build`
- `npm run ai:scan:all`
- `npm run ai:brief`
- `npm run ai:dashboard`

## Local Workflow

### Refresh all artifacts

```bash
npm run ai:scan:all
```

### Generate or refresh briefing only

```bash
npm run ai:brief
```

### Open the dashboard

```bash
npm run ai:dashboard
```

Dashboard URL:

```txt
http://localhost:4173/ai-ops/dashboard/
```

## Codex Commands

These command docs live in `.codex/commands/`:

- `ai_ops_scan`
  - runs the full scan stack and reports current repo status from fresh artifacts
- `ai_ops_brief`
  - reads latest artifacts and produces an operator brief
- `ai_ops_fix`
  - takes a single `issue.id` and plans or implements the smallest safe fix

## Design Rules

- Checks are the source of truth.
- Dashboard does not contain check logic.
- Codex commands read artifacts; they do not replace checks.
- New checks must reuse the shared `Issue` and `CheckResult` contracts.
- The system must still work when no model call is available.

## Validation

Targeted ai-ops tests:

```bash
node --test tests/ai-ops/*.test.js
```

Full repository tests:

```bash
npm test
```


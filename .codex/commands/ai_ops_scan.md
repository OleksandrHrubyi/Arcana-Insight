---
description: Run the full ai-ops deterministic scan pipeline and report the current repo state from generated artifacts
argument-hint: [optional focus or follow-up question]
---

# AI Ops Scan

Run the local `ai-ops` scan pipeline, read the generated artifacts, and report the current project state with emphasis on blockers and next actions.

## Variables

USER_FOCUS: $1 - (Optional) Extra focus area such as `launch`, `build`, `tests`, `i18n`, or `duplicates`
OUTPUT_DIRECTORY: `ai-ops/output/latest`

## Instructions

- Run the deterministic scan stack first. Do not infer repo state from stale files if fresh execution is possible.
- Use `npm run ai:scan:all` as the default entrypoint.
- Treat generated artifacts as the source of truth:
  - `ai-ops/output/latest/manifest.json`
  - `ai-ops/output/latest/scan.json`
  - `ai-ops/output/latest/launch.json`
  - `ai-ops/output/latest/tests.json`
  - `ai-ops/output/latest/build.json`
  - `ai-ops/output/latest/briefing.md`
- If `USER_FOCUS` is provided, bias the summary toward matching issues and checks.
- Do not invent issues outside the artifact set.
- If a command fails, report the failure clearly and stop instead of pretending the scan succeeded.

## Workflow

1. Run `npm run ai:scan:all`.
2. Read `manifest.json` first to determine overall status.
3. Read `scan.json`, `launch.json`, `tests.json`, and `build.json` for supporting detail.
4. Read `briefing.md` for the operator summary.
5. Produce a concise report using `Report`.

## Report

Respond with:

```md
## AI Ops Scan

- Generated: <timestamp from manifest>
- Overall: <one-line status>

### Check Status
- Code Scan: <status + issue totals>
- Launch Readiness: <status + issue totals>
- Test Status: <status + issue totals>
- Build Status: <status + issue totals>

### Top Issues
- <issue 1>
- <issue 2>
- <issue 3>

### Focus Notes
- <note relevant to USER_FOCUS or "No extra focus requested.">

### Recommended Next Step
- <one concrete next action>
```


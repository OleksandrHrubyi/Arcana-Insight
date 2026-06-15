---
description: Generate an operator brief from the latest ai-ops artifacts without re-scanning business logic
argument-hint: [optional audience or planning lens]
---

# AI Ops Brief

Read the latest `ai-ops` artifacts and produce a practical daily brief for implementation or release work.

## Variables

AUDIENCE_OR_LENS: $1 - (Optional) Examples: `today`, `release`, `cleanup`, `pre-app-store`, `tech-debt`
OUTPUT_DIRECTORY: `ai-ops/output/latest`

## Instructions

- Prefer existing latest artifacts as input. Do not rescan unless the user explicitly asks for a fresh run or the files are missing.
- Always read:
  - `ai-ops/output/latest/manifest.json`
  - `ai-ops/output/latest/briefing.md`
- Read supporting JSON artifacts as needed to validate priorities:
  - `scan.json`
  - `launch.json`
  - `tests.json`
  - `build.json`
- Convert artifact facts into an operator brief:
  - what is blocking release now
  - what can be fixed quickly
  - what should wait
  - what is noise vs real signal
- If `AUDIENCE_OR_LENS` is provided, shape prioritization around that lens.
- Keep the brief grounded in existing issue ids, files, and checks.

## Workflow

1. Read `manifest.json` and `briefing.md`.
2. Read supporting artifacts for top issues and blockers.
3. Group issues into:
   - release blockers
   - high-value fixes
   - follow-up later
4. Write the response using `Report`.

## Report

Respond with:

```md
## AI Ops Brief

### Current State
- <1-3 bullets summarizing the repo state>

### Release Blockers
- <blocker or "None from current artifacts">

### Best Next Fixes
1. <fix 1>
2. <fix 2>
3. <fix 3>

### Can Wait
- <non-urgent follow-up>

### Operator Note
- <short note tuned to AUDIENCE_OR_LENS or generic planning guidance>
```


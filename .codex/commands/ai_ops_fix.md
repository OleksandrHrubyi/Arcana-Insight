---
description: Investigate and prepare a targeted fix for a specific ai-ops issue id from latest artifacts
argument-hint: [issue-id] [optional mode]
---

# AI Ops Fix

Investigate one known `ai-ops` issue from the latest artifacts and either prepare a concrete fix plan or implement it, depending on the user's active instruction.

## Variables

ISSUE_ID: $1
MODE: $2 - (Optional) `plan` or `implement`. Default: infer from the active user request.
OUTPUT_DIRECTORY: `ai-ops/output/latest`

## Instructions

- If `ISSUE_ID` is missing, ask for it and stop.
- Use the `ai-ops` artifacts to locate the issue before touching code.
- Read:
  - `ai-ops/output/latest/manifest.json`
  - `ai-ops/output/latest/scan.json`
  - `ai-ops/output/latest/launch.json`
  - `ai-ops/output/latest/tests.json`
  - `ai-ops/output/latest/build.json`
- Find the matching issue by `id`.
- Use the issue payload to identify:
  - source check
  - severity
  - rule id
  - file and line, if present
  - suggested action
- After locating the issue, inspect the referenced code or doc files directly.
- Do not work on multiple issues at once unless the user explicitly asks for a bundle.
- If `MODE=plan`, produce a narrow fix plan only.
- If `MODE=implement`, make the code change, run the smallest relevant validation, and report results.
- If `MODE` is omitted:
  - if the active user asked to change code, implement
  - otherwise, plan

## Workflow

1. Validate `ISSUE_ID`.
2. Read latest artifacts and find the matching issue.
3. Read the referenced file(s) in context.
4. Decide the smallest safe fix.
5. Either:
   - return a targeted fix plan, or
   - implement and validate the fix.
6. Respond with `Report`.

## Report

### Plan Mode

```md
## AI Ops Fix Plan

- Issue ID: <issue id>
- Source: <check name>
- Severity: <severity>

### Root Cause
- <short cause summary>

### Fix Scope
- <file 1>
- <file 2>

### Steps
1. <step 1>
2. <step 2>
3. <validation step>
```

### Implement Mode

```md
## AI Ops Fix

- Issue ID: <issue id>
- Source: <check name>
- Severity: <severity>

### Changed Files
- <file 1>
- <file 2>

### What Changed
- <short summary>

### Validation
- <command>: <pass/fail>
- <command>: <pass/fail>

### Remaining Risk
- <short note or "None identified beyond existing artifact warnings.">
```


---
description: Build the codebase based on a plan file with strict evidence-based verification
argument-hint: [path-to-plan]
---

# Implement With Codex

Follow the plan at `PATH_TO_PLAN`, implement all required work, and report with verification evidence.

## Variables

PATH_TO_PLAN: $1

## Instructions

- Implement the plan top to bottom, in order.
- Do not skip steps unless explicitly marked as skipped with rationale in the plan.
- Do not claim completion without running validation commands.
- Update the spec file in real time using the `Spec Status Update Protocol`.
- If you discover plan defects, fix the implementation path pragmatically and document deviations in `Comments`.

## The Iron Law

```txt
NO COMPLETION CLAIM WITHOUT VERIFIED EVIDENCE
```

## Spec Status Update Protocol

Use these status values: `pending` | `in_progress` | `completed` | `blocked` | `skipped`

1. Before starting a phase/task:
   - set `Status: in_progress`
   - add timestamp in `Comments`
2. After completing a phase/task:
   - check the checkbox (`- [x]`)
   - set `Status: completed`
   - append concise completion notes in `Comments`
3. If blocked:
   - set `Status: blocked`
   - add root cause and next action in `Comments`
4. If skipped intentionally:
   - set `Status: skipped`
   - add reason in `Comments`

## Verification Gate (Mandatory)

Before completion claim:

1. Identify all validation commands in the plan.
2. Run every command fresh.
3. Read full output and exit codes.
4. If any check fails, fix and re-run.
5. Only then report completion with evidence.

Required evidence:
- command outputs summarized with pass/fail and exit code
- test/lint/typecheck/build outcomes
- `git diff --stat` summary

## Workflow

1. If `PATH_TO_PLAN` is missing, ask for it and stop.
2. Read the plan and parse all phases/tasks/dependencies/acceptance criteria.
3. Start executing tasks in order, updating status in the plan file as you go.
4. Implement code changes required by each task.
5. Run validation commands defined in the plan.
6. Resolve failures and re-run validation until green (or mark blocked with evidence).
7. Produce final report using `Report`.

## Report

- Provide a concise summary of what was implemented.
- Include `git diff --stat`.
- Include a status table:

| Phase/Task | Assigned Agent | Status |
|------------|---------------|--------|
| [phase/task name] | codex | completed / blocked / skipped |
| ... | ... | ... |

- Include verification evidence:
  - command
  - result (pass/fail)
  - key output summary
  - exit code

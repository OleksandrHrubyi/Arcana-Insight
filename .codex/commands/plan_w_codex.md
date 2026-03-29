---
description: Create a concise engineering implementation plan from user requirements and save it to specs directory
argument-hint: [user prompt] [execution prompt]
---

# Plan With Codex

Create a complete implementation plan based on `USER_PROMPT` and save it to `PLAN_OUTPUT_DIRECTORY/<name>.md`. This command is planning-only.

## Variables

USER_PROMPT: $1
EXECUTION_PROMPT: $2 - (Optional) Guidance for sequencing, constraints, and execution style
PLAN_OUTPUT_DIRECTORY: `specs/`
EXECUTOR: `codex`

## Instructions

- **PLANNING ONLY**: do not implement code.
- If `USER_PROMPT` is missing, ask for it and stop.
- Use `EXECUTION_PROMPT` if provided to shape task granularity, dependencies, and parallelization.
- Analyze relevant codebase files before finalizing the plan.
- Determine task type: `chore|feature|refactor|fix|enhancement`.
- Determine complexity: `simple|medium|complex`.
- Generate a descriptive kebab-case filename.
- Save the plan to `specs/<descriptive-name>.md`.

## Workflow

1. Parse `USER_PROMPT` into goal, scope, constraints, and success criteria.
2. Inspect existing code and patterns relevant to the request.
3. Design solution approach and identify risks/edge cases.
4. Define step-by-step tasks with explicit dependencies.
5. Fill plan using the exact `Plan Format`.
6. Save plan to `PLAN_OUTPUT_DIRECTORY`.
7. Return a concise summary using `Report`.

## Plan Format

- Replace `<requested content>` with request-specific content.
- Keep section headings exactly as written.

```md
# Plan: <task name>

## Task Description
<describe the task in detail based on the prompt>

## Objective
<clearly state what will be accomplished when this plan is complete>

<if task_type is feature or complexity is medium/complex, include these sections:>
## Problem Statement
<clearly define the specific problem or opportunity this task addresses>

## Solution Approach
<describe the proposed solution approach and how it addresses the objective>
</if>

## Relevant Files
Use these files to complete the task:

<list files relevant to the task with bullet points explaining why. Include new files to be created under an h3 'New Files' section if needed>

<if complexity is medium/complex, include this section:>
## Implementation Phases
IMPORTANT: Each phase should be a checkbox that will be checked off during implementation. Include Status and Comments fields for tracking progress.

- [ ] **Phase 1: Foundation** - <describe foundational work>
  - Status: pending
  - Comments:

- [ ] **Phase 2: Core Implementation** - <describe main implementation work>
  - Status: pending
  - Comments:

- [ ] **Phase 3: Integration & Polish** - <describe testing and final touches>
  - Status: pending
  - Comments:
</if>

## Team Orchestration

- Execution model: single primary executor (`codex`) unless the user explicitly requests team fan-out.
- Task decomposition must be dependency-driven and explicit.
- Mark each task with owner, dependency, and parallelizability.
- Keep parallel tasks only for independent work.

### Team Members

- Codex
  - Name: codex
  - Role: primary implementer and validator
  - Agent Type: codex
  - Resume: true

## Step by Step Tasks

- Execute tasks top-to-bottom unless marked `Parallel: true` and dependency-free.
- Each task must include a stable `Task ID`.

### 1. <First Task Name>
- **Task ID**: <unique kebab-case identifier>
- **Depends On**: none
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: pending
- Comments:
- <specific action>
- <specific action>

### 2. <Second Task Name>
- **Task ID**: <unique identifier>
- **Depends On**: <Task ID(s) or none>
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: <true/false>
- Status: pending
- Comments:
- <specific action>
- <specific action>

### N. <Final Validation Task>
- **Task ID**: validate-all
- **Depends On**: <all previous Task IDs>
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: pending
- Comments:
- Run all validation commands
- Verify acceptance criteria are met

## Acceptance Criteria
<list specific, measurable criteria that must be met for the task to be considered complete>

## Validation Commands
Execute these commands to validate the task is complete:

- <command 1>
- <command 2>
- <command 3>

## Notes
<optional additional context, risks, dependencies, or migration details>
```

## Report

After saving the plan, respond with:

```md
✅ Implementation Plan Created

File: specs/<filename>.md
Topic: <brief description>
Key Components:
- <component 1>
- <component 2>
- <component 3>

Task List:
- <task 1>
- <task 2>
- <task 3>

Team Members:
- codex: primary implementer and validator

When ready to execute, run implementation against:
specs/<filename>.md
```

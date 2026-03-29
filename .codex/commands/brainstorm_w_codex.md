---
description: Brainstorm and deeply clarify requirements through extensive questioning, then produce a detailed implementation plan for Codex execution
argument-hint: [user prompt] [execution prompt]
---

# Brainstorm With Codex

Deeply explore, question, and clarify the user's requirements before producing an implementation plan. Your primary value is uncovering ambiguity and forcing clear decisions early. Planning only.

## Variables

USER_PROMPT: $1
EXECUTION_PROMPT: $2 - (Optional) Guidance for execution strategy, sequencing, and constraints
PLAN_OUTPUT_DIRECTORY: `specs/`

## Instructions

- **PLANNING ONLY**: Do NOT implement code in this command. Output is a plan document saved to `PLAN_OUTPUT_DIRECTORY`.
- If no `USER_PROMPT` is provided, stop and ask the user to provide it.
- If `EXECUTION_PROMPT` is provided, use it to guide task granularity, dependency structure, and parallel/sequential decisions.
- **QUESTIONING IS PRIMARY**: do not jump to planning until key unknowns are resolved.

### Questioning Rules

1. Ask 8-15 targeted questions per round, grouped by category.
2. Run at least 2 rounds of questions before writing the plan.
3. Mix high-level strategy questions with low-level implementation detail questions.
4. Read the codebase first and avoid questions you can answer from files.
5. Include options with tradeoffs for important decisions.
6. Explicitly flag assumptions and ask for confirmation.

### Recommended Question Categories

- Scope and boundaries
- UX and behavior (happy/unhappy paths)
- Data and state ownership
- Technical architecture and constraints
- Security/access
- Testing and acceptance criteria
- Dependencies, risks, rollback
- Deployment/operations

## Workflow

### Phase 1: Initial Scan

1. Read `USER_PROMPT`.
2. Inspect relevant files and existing patterns.
3. Identify knowns vs unknowns.
4. Prepare first question round.

### Phase 2: Round 1 Questions

5. Ask 8-15 categorized questions.
6. Prioritize critical decision-point questions first.
7. Wait for user answers.

### Phase 3: Round 2+ Follow-Up

8. Analyze answers and identify new ambiguities.
9. Ask at least one additional follow-up round.
10. Push for explicit decisions when responses are vague.

### Phase 4: Confirmation Summary

11. Summarize:
   - what will be built
   - key decisions made
   - what is explicitly out of scope
12. Ask for confirmation/corrections.

### Phase 5: Plan Creation

13. Determine task type (`chore|feature|refactor|fix|enhancement`) and complexity (`simple|medium|complex`).
14. Generate a descriptive kebab-case filename.
15. Save plan to `PLAN_OUTPUT_DIRECTORY/<descriptive-name>.md`.

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
- **Task ID**: <unique kebab-case identifier>
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
<list specific, measurable criteria that define done>

## Validation Commands
Execute these commands to validate the task is complete:

- <command 1>
- <command 2>
- <command 3>

## Notes
<optional constraints, risks, migration concerns, or follow-up ideas>
```

## Report

After creating and saving the plan, respond with:

```md
✅ Implementation Plan Created

File: specs/<filename>.md
Topic: <brief description>
Key Components:
- <component 1>
- <component 2>
- <component 3>

Brainstorm Summary:
- <number> rounds of clarifying questions
- <number> total questions asked
- <number> key decisions made

Task List:
- <task 1>
- <task 2>
- <task 3>

When ready to execute, run implementation against:
specs/<filename>.md
```

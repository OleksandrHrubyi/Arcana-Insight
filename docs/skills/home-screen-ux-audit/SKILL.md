---
name: home-screen-ux-audit
description: Use when changing or reviewing the Arcana Insight home screen. Enforces dashboard logic, one clear primary action, readable daily summary, meaningful progress, non-duplicated navigation, and compact mobile-first information hierarchy.
---

# Home Screen UX Audit

Use this skill for any task that touches the main screen.

## Home Screen Contract

The home screen must answer these questions fast:

- `What should I do now?`
- `What does today mean for me?`
- `What have I already completed?`
- `Where do I continue?`

If the screen does not answer those, it is not done.

## Required Structure

1. One primary action
   - only one visually dominant action above the fold
   - supporting actions must not compete with it

2. Today summary
   - one short readable summary
   - not a wall of microcopy
   - not decorative filler

3. Progress
   - visible status for the current day
   - user should know what is done and what is not

4. Continue state
   - if the user already started something, the home screen should help them resume

## Things To Reject

- duplicated navigation as content
- tiny low-contrast explanatory text
- multiple equal-weight CTAs fighting each other
- decorative content that pushes useful content down
- adding more cards instead of clarifying hierarchy
- cards that restate menu destinations without unique value

## Review Workflow

1. Identify the primary action.
2. Identify the secondary actions.
3. Remove anything above the fold that does not help the primary decision.
4. Check whether the summary is readable at a glance.
5. Check whether the screen tells the user what is already complete.
6. Check whether bottom nav is being duplicated by content cards.

## Completion Checklist

- one clear primary action
- one readable daily summary
- visible progress state
- clear continue path
- no duplicated bottom-nav logic
- no decorative overload

## Failure Mode Rule

If the screen starts feeling crowded, merge blocks or remove blocks. Do not add a new section just because the information exists.

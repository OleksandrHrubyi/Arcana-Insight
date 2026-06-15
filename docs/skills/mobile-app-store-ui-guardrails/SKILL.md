---
name: mobile-app-store-ui-guardrails
description: Use when changing mobile app screens, especially the home screen, dashboards, or Apple App Store-facing UI in Arcana Insight. Enforces readable typography, non-overlapping layout, clear action hierarchy, mobile tap targets, and screenshot-based validation before completion.
---

# Mobile App Store UI Guardrails

Use this skill for any Arcana Insight mobile UI task that changes:

- the home screen
- any dashboard-like screen
- above-the-fold content
- primary CTA hierarchy
- layouts that will be judged by App Store users or screenshots

## Non-Negotiables

1. The home screen is the user's main dashboard.
   It must answer: `What should I do now?`, `What does today mean?`, and `Where do I continue?`

2. Readability beats density.
   Do not compress key information into tiny labels or multi-line microcopy.

3. No overlap.
   Never place new cards, sheets, banners, or overlays so they collide with:
   - the card-of-day hero
   - existing CTA cards
   - bottom navigation
   - safe-area-sensitive content

4. No navigation duplication.
   Bottom navigation already handles section switching. Do not repeat the same destinations as large content cards unless those cards have unique explanatory value and different content.

5. One primary action above the fold.
   The screen may have supporting actions, but only one action should visually lead.

6. If space is tight, simplify.
   Remove, merge, or demote content. Do not keep stacking new blocks into a fixed viewport.

## Typography Guardrails

- `14px+` for body copy on home screens
- `12px+` only for short secondary meta labels
- never use tiny text for explanations, instructions, or actionable guidance
- titles must remain readable at arm's length on a small iPhone screen

## Mobile Layout Guardrails

- Keep primary content clear on widths around `390px`
- Respect short iPhone heights; test dense screens against limited vertical space
- Primary CTA tap areas should feel easy, not precision-based
- Avoid adding new absolute-positioned cards above the fold unless the whole viewport composition is recalculated
- Do not let supporting content visually overpower the main action

## Home Screen Workflow

1. Audit the viewport first.
   Identify every fixed or high-priority element already on screen:
   - logo/header
   - hero
   - astro or contextual strips
   - CTA cards
   - bottom navigation

2. Define hierarchy before editing.
   Write down:
   - `primary action`
   - `secondary actions`
   - `supporting information`

3. Add only what fits the hierarchy.
   If new content competes with the hero or navigation, redesign the structure instead of stacking another block.

4. Prefer consolidation over expansion.
   If multiple ideas are needed, combine them into:
   - one main dashboard card
   - one compact progress/status pattern
   - a small number of secondary entry points

5. Validate with a screenshot before calling the task done.

## Completion Checklist

Do not finish until all are true:

- there is one clear primary action
- body text is readable without zooming
- no cards overlap each other
- no content sits under or fights with bottom navigation
- bottom navigation is not duplicated as content
- informational text supports a user decision instead of decorating the screen
- the screen still works on a short iPhone viewport

## Failure Mode Rule

If the requested addition cannot fit cleanly into the current layout, stop adding more UI and say so explicitly. Recommend simplification or restructuring instead of squeezing more content into the screen.

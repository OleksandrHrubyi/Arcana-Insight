---
name: arcana-analytics-and-conversion
description: Use when changing primary CTAs, premium entry points, onboarding actions, ritual milestones, or funnel tracking in Arcana Insight. Enforces event-name discipline, product-funnel clarity, and conversion tracking tied to real user actions.
---

# Arcana Analytics And Conversion

Use this skill when a product change may affect measurement or conversion.

## Source Files

- event constants: `src/constants/analyticsEvents.js`
- analytics service: `src/services/analytics.js`
- premium model: `src/constants/premiumModel.js`

## What To Track

Evaluate analytics impact when changing:

- primary home CTA
- onboarding continue or skip steps
- first-action prompts
- premium/paywall entry points
- purchase and restore flows
- daily ritual completion milestones

## Rules

1. Reuse existing events first.
   Search `analyticsEvents.js` before inventing a new name.

2. One user action, one event concept.
   Do not create multiple event names for the same action with minor wording changes.

3. Track meaningful moments.
   Prefer events that map to product decisions, not noisy UI trivia.

4. Keep funnel logic clear.
   For premium and onboarding, preserve clean progression through view -> click -> success/error states.

5. Match real product behavior.
   Do not log events for states the user cannot actually reach.

## Event Review Questions

- Does this action change conversion, retention, or flow understanding?
- Is there already an event for it?
- Will the event name still make sense six months from now?
- Does the event reflect a real user intention rather than an implementation detail?

## Completion Check

- analytics impact was evaluated
- existing event naming was reused where possible
- any new event is justified and distinct
- funnel-critical actions remain measurable

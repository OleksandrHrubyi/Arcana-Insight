---
name: arcana-routing-and-flow-guardrails
description: Use when changing routes, redirects, onboarding handoff, auth gating, bottom navigation behavior, or screen-entry flows in Arcana Insight. Anchors changes to the existing router contract and prevents parallel or confusing mobile navigation flows.
---

# Arcana Routing And Flow Guardrails

Use this skill for any task that changes how the user moves through the app.

## Source Files

- route map: `src/router/routes.js`
- guard logic: `src/router/guard.js`
- main layout: `src/layouts/MainLayout.vue`
- bottom navigation: `src/components/ui/BottomNavigation.vue`

## Flow Contract

The app already has product-level anchors such as:

- home / arcana
- horoscope
- tarot
- menu
- premium
- onboarding
- login

Do not create competing or parallel flows unless the product intent is explicit.

## Rules

1. Define the route type first.
   Every new screen must be clearly one of:
   - destination
   - drill-down
   - redirect
   - gated flow

2. Respect existing route metadata.
   Check `tab`, `hideBottomNav`, `allowWithoutOnboarding`, and `requiresAuth` before changing behavior.

3. Do not break onboarding gating.
   If a route should bypass onboarding, that must be explicit and justified.

4. Do not duplicate bottom-nav behavior with ad hoc entry points that confuse the user about where they are.

5. Prefer extending an existing flow over inventing a new parallel one.

## Verification

For any routing change, check:

- direct entry to the route
- redirect behavior
- back navigation
- bottom-nav selected state
- onboarding/auth behavior if relevant

## Completion Check

- route ownership is clear
- guard behavior still makes sense
- bottom-nav logic remains coherent
- no parallel pseudo-home or pseudo-menu path was introduced

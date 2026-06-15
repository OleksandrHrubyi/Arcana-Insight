---
name: ios-mobile-layout-qa
description: Use when changing mobile UI in Arcana Insight, especially Quasar + Capacitor screens that must work cleanly on iPhone layouts. Covers safe areas, bottom navigation, short-height devices, readable spacing, non-overlap, and touch-friendly tap targets.
---

# iOS Mobile Layout QA

Use this skill for:

- any change to mobile screen layout
- fixed or absolute-positioned UI
- bottom navigation screens
- hero sections
- card grids
- safe-area-sensitive screens

## Goal

Make sure the screen works as a real iPhone screen, not just as desktop code or a visually lucky layout.

## Required Checks

1. Safe areas
   - respect top notch area
   - respect bottom safe area
   - no important content should sit under the home indicator or bottom nav

2. Small iPhone widths
   - verify around `390px` and `375px`
   - text wrapping must not break card hierarchy
   - buttons must remain readable

3. Short heights
   - verify dense screens against short iPhone heights
   - if blocks collide vertically, simplify or remove content
   - do not stack more absolute layers into a packed viewport

4. Fixed-position UI
   - bottom nav must not fight with content cards
   - floating cards must not cover hero content
   - overlays should not block the main action unless intentionally modal

5. Tap targets
   - primary actions must feel easy to hit
   - do not rely on tiny inline links for major actions

## Guardrails

- no overlap between content blocks
- no hidden CTA behind fixed UI
- no tiny unreadable helper text used as primary explanation
- no visual crowding near bottom navigation

## Completion Checklist

- screen is readable on small iPhone widths
- screen survives short-height viewports
- bottom nav and content do not collide
- hero remains visible and usable
- all primary actions are comfortably tappable
- no absolute/fixed block causes layout breakage

## Failure Mode Rule

If the current composition cannot fit cleanly, stop adding UI and propose restructuring.

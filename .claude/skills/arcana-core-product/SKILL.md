---
name: arcana-core-product
description: Use for any Arcana Insight product, UX, copy, navigation, or feature task in the tarot + horoscope mobile app. Anchors decisions to daily ritual utility, grounded premium tone, real app entities, and App Store-ready mobile behavior.
---

# Arcana Core Product

Use this skill for most Arcana Insight work unless the task is purely infra or backend plumbing.

## Product Contract

Arcana Insight is a mobile tarot + horoscope app built with Quasar + Capacitor.

The product should feel:

- useful before it feels atmospheric
- premium without looking noisy
- personal without sounding manipulative
- mobile-first, not desktop code squeezed into a phone screen

## Default Decision Rules

1. Preserve the daily ritual loop.
   The app should help the user:
   - get today's signal
   - take the next action
   - see what is already complete
   - continue where they left off

2. Use real product entities.
   Prefer the flows and nouns already present in the app:
   - daily card
   - horoscope
   - tarot reading
   - saved readings
   - ritual rewards
   - premium

3. Utility beats decoration.
   If a screen becomes more atmospheric but less actionable, it is a regression.

4. Mobile hierarchy is strict.
   Keep one obvious primary action above the fold. Supporting content should help that decision, not compete with it.

5. Work with the existing app shape.
   Do not invent new pseudo-home flows, duplicate bottom-nav destinations as feature cards, or add new blocks when the same value fits inside an existing surface.

## Source-Of-Truth Files

- Tarot data loader: `src/helpers/tarotData.js`
- Daily card selection logic: `src/helpers/dailyCardCore.js`
- Horoscope content registry: `src/helpers/horoscopeContentCore.js`
- Daily ritual state: `src/helpers/dailyRitual.js`
- Premium feature model: `src/constants/premiumModel.js`

## Escalation Rules

- If the task touches home, dashboard hierarchy, or App Store-visible UI, also follow:
  - `docs/skills/mobile-app-store-ui-guardrails/SKILL.md`
  - `docs/skills/home-screen-ux-audit/SKILL.md`
  - `docs/skills/ios-mobile-layout-qa/SKILL.md`
  - `docs/skills/app-store-screenshot-readiness/SKILL.md`

- If the task touches tarot, horoscope, zodiac, compatibility, or reading copy, also follow:
  - `.claude/skills/arcana-content-guardrails/SKILL.md`

- If the task touches streaks, daily progress, rewards, continue-state, or the daily loop, also follow:
  - `.claude/skills/arcana-daily-ritual-ux/SKILL.md`

- If the task touches premium, paywalls, locked states, or subscription value communication, also follow:
  - `.claude/skills/arcana-premium-trust/SKILL.md`

## Never Do This

- do not present the app like a mystical poster with no clear action
- do not invent product features that are not represented in code or content
- do not use AI-looking icons or labels unless explicitly requested
- do not hide important progress state in a place the user may never see on first view
- do not let copy become vague spiritual filler

## Completion Check

Before calling a product task done, confirm:

- the screen or copy still reflects a real Arcana Insight flow
- the next user action is clear
- the result looks credible in a real mobile app

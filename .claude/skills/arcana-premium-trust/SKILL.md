---
name: arcana-premium-trust
description: Use when changing premium page, paywall, locked states, upgrade prompts, or subscription comparison UX in Arcana Insight. Enforces concrete value communication, truthful feature framing, and App Store-safe trust-first monetization.
---

# Arcana Premium Trust

Use this skill for premium and subscription work.

## Source-Of-Truth Model

Ground premium messaging in `src/constants/premiumModel.js`.

Current free baseline includes:

- daily card
- horoscope
- one tarot session per day
- card library
- zodiac guide

Current premium value includes:

- unlimited readings
- more horoscope themes
- deeper or structured interpretation
- compatibility
- history
- larger tarot spreads

Do not promise features beyond the model.

## Monetization Rules

1. Sell value, not pressure.
   Explain what the user gets, not why they should feel bad for staying free.

2. Keep the free ritual intact.
   The app can upsell, but it should not make the basic daily experience feel fake or unusable.

3. Use concrete comparisons.
   Show real differences in depth, frequency, themes, or history. Avoid vague "unlock your destiny" lines.

4. Trust is part of conversion.
   Restore flows, billing clarity, and calm wording matter as much as visuals.

5. No manipulative urgency.
   No fake timers, fake scarcity, or guilt copy.

## UX Rules

- premium CTA should be obvious, not spammy
- locked states should explain the user value behind the lock
- compare surfaces should stay readable on mobile
- premium blocks should look polished enough for App Store screenshots

## Copy Rules

Prefer:

- "Unlimited tarot readings"
- "Love and career horoscope themes"
- "Reading history and deeper interpretation"

Avoid:

- "Your destiny is blocked"
- "Upgrade now or miss your sign"
- any claim that premium changes reality instead of app capability

## Completion Check

- all premium claims map to real product behavior
- free vs premium value is understandable fast
- the tone feels trustworthy
- no dark-pattern pressure was introduced

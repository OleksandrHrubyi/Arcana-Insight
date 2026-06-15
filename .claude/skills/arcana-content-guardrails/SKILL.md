---
name: arcana-content-guardrails
description: Use when writing or editing tarot, horoscope, zodiac, compatibility, teaser, notification, or reading-related copy for Arcana Insight. Enforces grounded tone, source-backed meanings, and safe App Store-friendly content boundaries.
---

# Arcana Content Guardrails

Use this skill whenever the task changes text that users read as spiritual guidance or interpretation.

## Source Before Style

Base copy on the app's actual content sources:

- tarot card data: `src/data/cardsV2/tarot_full.json`
- tarot loader: `src/helpers/tarotData.js`
- daily card logic: `src/helpers/dailyCardCore.js`
- horoscope registry helpers: `src/helpers/horoscopeContentCore.js`

If a teaser, label, or summary refers to a tarot card or horoscope theme, derive it from those sources. Do not improvise a new meaning when the app already has one.

## Content Rules

1. Teaser, not spoiler.
   On home or compact surfaces, show a short theme line or summary, not the full interpretation if that would collapse the purpose of the dedicated reading screen.

2. Grounded tone.
   Write like a calm premium app, not a fortune-cookie generator.

3. No harmful certainty.
   Avoid deterministic claims about:
   - health
   - money
   - legal outcomes
   - pregnancy
   - emergencies
   - guaranteed relationship outcomes

4. No fear-based hooks.
   Do not create anxiety just to drive taps, upgrades, or retention.

5. No mystical filler.
   Avoid vague lines that sound poetic but do not help the user understand today's reading.

## Tone Guide

Prefer:

- short, readable sentences
- specific emotional or thematic language
- reflective guidance
- practical framing

Avoid:

- all-caps drama
- fake cosmic urgency
- generic "the universe is calling you" filler
- sparkle/AI aesthetics in words or icon choices

## Writing Hierarchy

When copy is short:

- first line: the clear theme
- second line: the user-facing implication
- optional third line: a gentle next step

When copy is long:

- summary first
- detail second
- action or reflection last

## Completion Check

- copy maps to a real tarot or horoscope concept already present in the app
- teaser content does not replace the full reading screen
- wording is readable on mobile
- no risky overclaim or manipulative language

---
name: brain
description: Use when the user writes $brain or asks for a brainstorm about Arcana Insight or another tarot + horoscope mobile app topic. Runs a short 1-3 round self-questioning product brainstorm, checks current competitors, and returns concrete mobile-app recommendations.
---

# Brain

Use this skill only for tarot + horoscope mobile app topics such as:

- home-screen ideas
- daily ritual UX
- premium / paywall direction
- onboarding
- retention loops
- feature concepts
- copy or teaser direction
- competitor-inspired product decisions

Do not use it for generic startup brainstorming or for products outside tarot, horoscope, spirituality, or adjacent mobile wellness content.

## Required Context

Before answering, anchor to the Arcana Insight product rules:

- `.claude/skills/arcana-core-product/SKILL.md`
- `.claude/skills/arcana-content-guardrails/SKILL.md` when the topic touches tarot, horoscope, teaser, or reading copy
- `.claude/skills/arcana-daily-ritual-ux/SKILL.md` when the topic touches streaks, daily progress, rewards, or retention loops
- `.claude/skills/arcana-premium-trust/SKILL.md` when the topic touches paywalls, upsells, or premium value
- `.claude/skills/arcana-routing-and-flow-guardrails/SKILL.md` when the topic touches navigation, entry flow, or redirects
- `.claude/skills/arcana-i18n-consistency/SKILL.md` when the topic touches user-facing copy changes
- `.claude/skills/arcana-analytics-and-conversion/SKILL.md` when the topic touches primary CTA, funnel steps, or milestone tracking

Also check the relevant product docs when the topic depends on them:

- `docs/screen-contracts.md`
- `docs/copy-bible.md`
- `docs/premium-matrix.md`
- `docs/flow-map.md`
- `docs/content-source-map.md`
- `docs/canonical-files.md`

## Workflow

### 1. Frame the topic

Start by compressing the user's ask into one concrete product question.

Examples:

- "How should the home screen surface daily progress without crowding the hero?"
- "What premium hook is credible for horoscope users who already get one free daily touchpoint?"
- "What teaser format on home increases taps to the daily card without spoiling the reading?"

If the ask is broad, narrow it yourself before continuing.

### 2. Check current competitors

Browse current competitors every time the user asks for `$brain`, because competitor positioning, store screenshots, pricing, and UX patterns can change.

Prefer current primary sources in this order:

1. App Store listing
2. Google Play listing
3. Official product site
4. Reputable review / roundup only if needed

Look for 2-4 relevant competitors, for example tarot, horoscope, astrology, daily ritual, or spirituality apps that actually overlap with the topic.

Extract only what matters:

- their main promise
- what is above the fold
- daily habit or retention mechanic
- paywall timing if relevant
- copy tone
- one pattern worth borrowing
- one pattern worth avoiding

Always mention exact dates if the recency matters.

### 3. Run the brainstorm loop

Do at most 3 rounds. Each round must contain:

- a question you ask yourself
- a short answer
- the implication for Arcana Insight

Use this default structure unless the topic strongly suggests another order:

1. **User/problem round**  
   Ask what user need or friction is actually being solved.

2. **Competitor/pattern round**  
   Ask what current competitors are doing and whether it is worth copying, adapting, or rejecting.

3. **Decision round**  
   Ask what Arcana Insight should do next, given its existing product shape, contracts, and premium tone.

Do not fake debate. The point is to expose the reasoning path, not to produce theatrical inner monologue.

## Output Format

Keep the answer concise and structured like this:

**Topic**
- one-sentence framing

**Round 1**
- `Q:` ...
- `A:` ...
- `Implication:` ...

**Round 2**
- `Q:` ...
- `A:` ...
- `Implication:` ...

**Round 3** (only if needed)
- `Q:` ...
- `A:` ...
- `Implication:` ...

**What To Do**
- 2-5 concrete recommendations for the app

**Avoid**
- 1-3 patterns that would be a regression for Arcana Insight

**Sources**
- link the competitor sources used

## Decision Rules

- Keep recommendations mobile-first and App-Store-credible.
- Prefer improving an existing surface over adding a new redundant block.
- Preserve one clear primary action above the fold on home.
- Do not suggest copy or mechanics that are manipulative, fear-based, or deterministically predictive.
- Do not invent a parallel content model when tarot, horoscope, daily ritual, premium, or routing already has a source of truth.
- If the topic is about product direction, give a recommendation, not just options.
- If the evidence is mixed, say which option you would choose and why.

## When Not To Use This Skill

Do not use this skill when the user wants:

- direct implementation without ideation
- code-only debugging
- non-mobile product brainstorming
- brainstorming unrelated to tarot, horoscope, astrology, readings, daily ritual, or premium mobile UX

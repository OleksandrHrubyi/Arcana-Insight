# Premium Matrix

This file defines the product truth for free vs premium behavior in Arcana Insight.

Primary source of truth in code: `src/constants/premiumModel.js`

If this document and code diverge, update this document or align the code before changing premium UX.

## Free Access

The free product includes:

- daily card
- horoscope
- one tarot session per day
- card library
- zodiac guide

Model details:

- `freeTarotSessionsPerDay = 1`
- `freeTarotMaxCards = 1`
- free horoscope themes: `energy`

## Premium Access

Premium includes:

- unlimited tarot sessions
- larger spreads up to 5 cards
- more horoscope themes
- compatibility
- reading history
- deeper or structured interpretation depending on AI configuration

Model details:

- `premiumTarotMaxCards = 5`
- premium horoscope themes: `love`, `career`

## Truth Table

| Capability | Free | Premium | Notes |
| --- | --- | --- | --- |
| Daily card | Yes | Yes | Core daily ritual remains available |
| Horoscope base theme | Yes | Yes | Base free theme is `energy` |
| Horoscope extra themes | No | Yes | `love`, `career` |
| Tarot sessions per day | 1 | Unlimited | Must be explained clearly |
| Tarot spread depth | 1 card | Up to 5 cards | Do not overpromise beyond model |
| Card library | Yes | Yes | Free value remains real |
| Zodiac guide | Yes | Yes | Free value remains real |
| Compatibility | Overall score + strongest sphere | Full sphere-by-sphere breakdown + AI dynamic/advice + weekly weather + houses | Free is a real taste (the % + top sphere); premium is the depth. Do NOT give the full sphere score-breakdown away free. |
| Saved reading history | No | Yes | Premium-specific capability |
| Deeper interpretation | Limited/basic | Yes | Exact wording must reflect current AI/basic mode |

## Allowed Premium Entry Points

Premium upsell is allowed from:

- premium page
- tarot interpretation follow-up
- premium lock states tied to real blocked capability
- menu or utility entry points

Premium upsell should not:

- interrupt the core daily card before the user gets value
- make the free ritual feel fake
- appear as fear-based pressure

## Lock State Rules

When a feature is locked, the UI must explain:

- what is unavailable
- what premium adds
- what the user can still do for free

Locked states must not:

- imply that upgrading changes reality
- hide restore purchases
- hide legal or billing clarity
- create fake scarcity

## Copy Rules

Allowed value language:

- `Unlimited tarot sessions`
- `3-card and 5-card spreads`
- `Love and career horoscope themes`
- `Reading history`
- `Deeper interpretation`

Not allowed:

- `Unlock your destiny`
- `Your path is blocked without Premium`
- any claim that premium gives non-product supernatural certainty

## Verification Rules

For any premium change, verify:

- free path
- locked path
- premium path
- upgrade CTA clarity
- restore path visibility
- privacy/terms visibility if the paywall is involved

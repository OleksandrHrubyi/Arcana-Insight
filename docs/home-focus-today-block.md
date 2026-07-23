# Home Focus Today Block

This document defines the product and UI contract for the `Focus today` block on the Arcana Insight home screen.

## Goal

Add one compact, source-backed daily insight to the home screen without:

- duplicating bottom navigation destinations
- weakening the card-of-day hero
- inventing a parallel horoscope content model
- requiring login just to show daily value

## Placement

- Screen: home (`/`)
- Canonical component: `src/components/main/LandingScene.vue`
- Visual position: compact card below the hero CTA layer

This block is not a new top section and must not sit between the header and the hero.
(RP-03 note: the `.ritual-band` is docked BELOW this block, between focus-today and the
bottom nav — on short screens focus-today lifts +10px to make room. Header-area
placement of the band was tried and rejected by the owner; nothing may sit between the
header and the hero.)

## Role On Home

The block answers:

- `What should I focus on today?`

It complements:

- hero = today's tarot signal

It must not replace:

- the primary hero action
- the horoscope screen
- bottom navigation

## Source Of Truth

The block must derive its content from the existing horoscope source stack:

- sign resolution from profile cache / user profile / cached sign
- horoscope loading from `src/helpers/horoscopeContentCore.js`

Do not create:

- a separate `focus` registry
- a `do/avoid` content model
- handcrafted sign/day copy outside the existing horoscope source

## Sign Resolution

Resolve the sign in this order:

1. profile cache / date of birth
2. user profile fetch
3. cached local sign (`horoscope_sign_key_v1`)
4. fallback state when sign is unknown

The block must work for both authenticated and anonymous users.

## Theme Selection

For `v1`, choose one stable theme for home with this priority:

1. `energy`
2. `career`
3. `love`

Reason:

- `energy` is the broadest home-compatible theme
- `career` and `love` still work as fallback
- home should not feel random from day to day

## Content Extraction

For the chosen theme:

1. use `summary`
2. if `summary` is empty, use `detailed`
3. take the first sentence
4. show that first sentence in FULL — do not char-clamp it mid-word

The home block shows a teaser (one full sentence), not a full reading. The full
multi-paragraph reading still lives on the Horoscope screen (`detailed`).

Decided 2026-07-01 (field-reported): an earlier version cut the teaser to 72
chars, which truncated mid-word ("…у власному те…") and read as broken. The
sentence is short enough to show whole; a generous CSS line-clamp (4 lines) is
the only safety net, and it trims cleanly at a line end, never mid-word.

## Copy Shape

The block should show:

- title: `Focus today`
- optional theme label: `Energy`, `Career`, or `Love`
- one short focus line

The block should not show:

- the zodiac sign again if it is already visible in the header
- multi-paragraph text
- deterministic instructions
- `What to do / What to avoid` in `v1`

Preferred tone:

- calm
- practical
- reflective
- concise

## States

### Ready

Conditions:

- sign is known
- horoscope text is available

Show:

- `Focus today`
- theme label
- one focus line

Tap:

- open `Horoscope`

### Sign Known, Text Unavailable

Conditions:

- sign is known
- horoscope text is not available yet or failed

Show:

- `Focus today`
- fallback line inviting the user to open today's horoscope

Tap:

- open `Horoscope`

### Sign Unknown

Conditions:

- sign is not known after all supported resolution paths

Show:

- `Focus today`
- a short prompt inviting the user to open `Horoscope` and choose a sign
  (`landing.focusToday.fallbackMissingSign`)

Tap:

- open `Horoscope`

UI note:

- this prompt is an instruction, not pseudo-content — it must render **in full**,
  never clamped/truncated mid-word. Use the stacked layout (full-width text + CTA
  below), not the inline-CTA compact card.
- keep the copy short so it reads as a setup nudge, not a fake reading
- decided 2026-07-01: an earlier version hid the block entirely here; field
  testing showed new users had no on-home hint to set up their sign, so we show a
  clear prompt instead. Only the real-focus state (sign known) keeps the clamped
  one-line teaser.

## UI Rules

- one compact card only
- readable on small iPhone widths
- no overlap with hero, bottom navigation, or safe areas
- body text must remain `14px+`
- the whole card can be tappable
- keep the block visually secondary to the hero

## Explicit Non-Goals For V1

Do not add in `v1`:

- `What to do / What to avoid`
- separate left/right columns
- multiple horoscope tiles
- duplicate `Horoscope` or `Tarot` menu shortcuts

## Validation

Before completion, verify:

- hero remains the main action above the fold
- the block does not duplicate bottom navigation
- the block resolves correctly for authenticated and anonymous users
- copy appears in both `en` and `uk`
- mobile screenshots remain readable on iPhone-sized viewports

# Definition of Done for Mobile Product Changes

Use this file before calling a product, UX, or copy task complete.

## Global Gate

The task is not done until the changed behavior is verified in context, not just edited in code.

## Required For All Product Changes

- the change matches the screen contract for the affected screen
- no duplicate nav logic was introduced
- no suspect duplicate file was edited accidentally
- touched copy still follows `docs/copy-bible.md`
- source-of-truth files were respected

## Required For UI Changes

- verified from an actual mobile screenshot, rendered view, or equivalent visual check
- no overlap with bottom nav, safe areas, hero, or sticky actions
- one clear primary action remains visible
- text remains readable on small iPhone widths
- tap targets remain comfortable

## Required For Home-Screen Changes

- home still acts as the primary dashboard
- one primary action is obvious above the fold
- today's summary is readable
- progress or completion state is visible
- no new block duplicates bottom-nav destinations

## Required For Routing Or Flow Changes

- route entry works
- redirect behavior works
- back navigation works
- bottom-nav state remains coherent
- onboarding/auth guard behavior still makes sense

## Required For Premium Changes

- free path verified
- locked path verified
- premium path verified
- claims match `docs/premium-matrix.md`
- restore path still exists where relevant

## Required For Copy Changes

- copy is present in all touched locales
- no hardcoded string was introduced on an i18n-driven screen
- wording is short enough for mobile surfaces
- tarot/horoscope language does not overclaim or manipulate

## Required For Analytics-Sensitive Changes

- reviewed whether the changed CTA or funnel step needs analytics
- reused existing event naming where possible
- did not create near-duplicate events for the same action

## Required For State Or Persistence Changes

- checked for an existing owner of the concept
- did not create parallel persistence without a sync strategy
- loading, empty, and error states still make sense

## Completion Rule

If a task only looks good in code review but was not verified against the product contract and mobile presentation, it is not done.

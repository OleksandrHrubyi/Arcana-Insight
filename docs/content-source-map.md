# Content Source Map

This file maps each major product area in Arcana Insight to its real source files.

Use it before editing product copy, UI content, data loading logic, gating, analytics, or persistence.

## Tarot Card Content

Primary content source:

- `src/data/cardsV2/tarot_full.json`

Supporting loaders and selectors:

- `src/helpers/tarotData.js`
- `src/helpers/dailyCardCore.js`
- `src/helpers/tarotDataSnapshotCore.js`

Use this area for:

- card titles
- upright/reversed meanings
- tarot teaser source lines
- daily card meaning source

Do not:

- invent ad hoc card meanings when the product already has one
- treat legacy tarot data files as default unless the task proves they are active

## Daily Card Logic

Primary logic:

- `src/helpers/dailyCardCore.js`

Related data access:

- `src/helpers/tarotData.js`

This area owns:

- deterministic daily card selection
- daily-card snapshot loading

## Horoscope Content

Primary logic:

- `src/helpers/horoscopeContentCore.js`

This area owns:

- horoscope theme normalization
- cached vs network loading behavior
- registry shape for `energy`, `career`, `love`

Use this before changing:

- horoscope theme structure
- horoscope cache behavior
- local vs network load policy

## Personal Horoscope

Primary page implementation:

- `src/pages/PersonalHoroscopePage.vue`

Related dependencies:

- `src/services/supabaseNative.ts`
- profile access through auth/user data

This area owns:

- birth-date dependent reading flow
- long-form personal horoscope sections

## Daily Ritual / Progress / Streaks

Primary source:

- `src/helpers/dailyRitual.js`

This area owns:

- daily activity keys
- streak state
- journey history
- time-to-next-midnight logic
- local completion tracking

Tracked activities today:

- `daily_card`
- `horoscope`
- `tarot`

Do not:

- invent parallel completion logic elsewhere
- create new daily state semantics without checking this file

## Ritual Rewards

Primary related files:

- `src/helpers/ritualRewardsBackend.js`
- `src/helpers/ritualRewardInventory.js`
- `src/pages/RitualRewardsPage.vue`

This area owns:

- reward syncing
- reward inventory concepts
- retention utility wiring

## Premium Model

Primary source:

- `src/constants/premiumModel.js`

Related service:

- `src/services/premiumBilling.js`

This area owns:

- free vs premium feature truth
- tarot limits
- premium theme availability
- compare-row content keys

Do not:

- promise premium features not represented here
- describe free limits differently from the model

## Paywall / Premium Funnel Analytics

Primary source:

- `src/constants/analyticsEvents.js`

Related analytics execution:

- `src/services/analytics.js`

This area owns:

- paywall funnel event names
- onboarding event names
- event logging behavior

## Onboarding Content And State

Primary files:

- `src/helpers/onboardingPrefs.js`
- `src/helpers/onboardingFlow.js`
- `src/helpers/onboardingRouteTarget.js`
- `src/pages/OnboardingPage.vue`
- `src/components/main/OnboardingComponent.vue`

This area owns:

- onboarding completion state
- onboarding interests
- onboarding exit routing

## Auth And User Session

Primary files:

- `src/stores/authStore.js`
- `src/stores/authStoreCore.js`
- `src/services/supabaseClient.ts`
- `src/services/supabaseNative.ts`

This area owns:

- session restoration
- authenticated user bootstrap
- app user upsert/select
- native auth helpers

## Saved Readings

Primary files:

- `src/helpers/savedReadingsCore.js`
- `src/pages/SavedReadingsPage.vue`

Related dependencies:

- `src/services/supabaseNative.ts`
- premium access state

This area owns:

- locked vs anonymous vs ready snapshot state
- saved tarot reading retrieval

## Localization

Primary files:

- `src/i18n/en.json`
- `src/i18n/uk.json`
- `src/boot/i18n.js`

This area owns:

- user-facing localized strings
- locale bootstrapping

Do not:

- hardcode new strings in an i18n-driven surface
- let `en` and `uk` drift in product meaning

## Navigation Contract

Primary files:

- `src/router/routes.js`
- `src/router/guard.js`
- `src/components/ui/BottomNavigation.vue`

This area owns:

- route ownership
- onboarding gating
- auth gating
- bottom-nav destination logic

## Active Canonical Reference

When file ownership is ambiguous, cross-check:

- `docs/canonical-files.md`
- `docs/flow-map.md`

## Editing Rule

Before changing any content-bearing screen or logic path, identify:

1. the source-of-truth file
2. the loader/helper layer
3. the UI surface consuming it

If you cannot name all three, stop and resolve ownership first.

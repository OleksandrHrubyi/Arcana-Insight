# Screen Contracts

This file defines the product contract for the main Arcana Insight screens.

Use it when changing screen structure, hierarchy, CTA logic, or above-the-fold content.

## Global Rules

- The app is a mobile tarot + horoscope product, not a decorative mood board.
- Every primary screen must make the next user action obvious.
- Bottom navigation is the product-level anchor. Do not duplicate its role with large generic CTA cards.
- If a screen gets crowded, remove or merge content before adding more.

## Home

- Route: `/`
- Page wrapper: `src/pages/GetStartedPage.vue`
- Main component: `src/components/main/LandingScene.vue`
- Role: main daily dashboard
- Primary CTA: continue today's most important ritual action
- Secondary CTA: open horoscope, tarot, or another meaningful continuation path
- Above the fold must show:
  - one clear primary action
  - today's summary
  - visible daily progress or completion state
  - a continuation path if the user already started something
- Must not break:
  - card-of-day hero visibility
  - bottom navigation clarity
  - readable mobile typography
  - one-action hierarchy
- Must not become:
  - a decorative collage
  - a pseudo-home that pushes the user into another required landing surface
  - a list of duplicated nav destinations

## Daily Card

- Route: `/daily`
- Page wrapper: `src/pages/DailyCardPage.vue`
- Main component: `src/components/main/DailyCardComponent.vue`
- Role: deliver the user's daily tarot signal
- Primary CTA: read today's card
- Secondary CTA: continue into related tarot or horoscope use
- Above the fold must show:
  - today's card identity
  - readable meaning or teaser
  - a clear next step
- Must not break:
  - trust in the daily ritual
  - clear separation between teaser and full interpretation

## Horoscope

- Route: `/horoscope`
- Page wrapper: `src/pages/HoroscopePage.vue`
- Main component: `src/components/main/HoroscopeComponent.vue`
- Role: give the user a quick, useful horoscope preview and next step
- Primary CTA: read today's horoscope
- Secondary CTA: switch theme or move deeper into personal horoscope if applicable
- Above the fold must show:
  - today's horoscope context
  - one readable summary
  - a practical next action
- Must not break:
  - theme clarity
  - free vs premium transparency
  - i18n parity

## Tarot

- Route: `/tarot`
- Page wrapper: `src/pages/TarotPage.vue`
- Main component: `src/components/TarotOraclePage.vue`
- Role: start or continue a tarot session
- Primary CTA: begin the reading
- Secondary CTA: adjust spread or continue from a previous state
- Above the fold must show:
  - what the user is about to do
  - the session entry point
  - any important gating or limits clearly
- Must not break:
  - free-session clarity
  - premium upsell honesty
  - mobile tap comfort

## Tarot Interpretation

- Route: `/tarot-interpretation`
- Page wrapper and implementation: `src/pages/TarotInterpretationPage.vue`
- Role: present the reading result in a readable, high-trust format
- Primary CTA: continue, close, or start a new session
- Secondary CTA: premium upgrade if applicable
- Above the fold must show:
  - what reading this is
  - the top-level interpretation
  - a clear close or continue path
- Must not break:
  - result readability
  - card hierarchy
  - premium trust

## Premium

- Route: `/premium`
- Page wrapper: `src/pages/PremiumPage.vue`
- Main component: `src/components/main/PremiumInfoComponent.vue`
- Role: explain premium value and convert without pressure
- Primary CTA: start purchase flow or unlock premium
- Secondary CTA: restore purchases, review privacy/terms
- Above the fold must show:
  - what premium unlocks
  - a concrete value comparison
  - calm purchase clarity
- Must not break:
  - truthful feature claims
  - restore path visibility
  - legal/support visibility

## Menu

- Route: `/menu`
- Page wrapper: `src/pages/MenuPage.vue`
- Main component: `src/components/main/MenuComponent.vue`
- Role: secondary navigation and account/help/settings entry
- Primary CTA: none; this is a utility hub
- Above the fold must show:
  - where the user can go next
  - account/settings/support access if relevant
- Must not break:
  - separation from home
  - bottom-nav coherence

## Onboarding

- Route: `/onboarding`
- Page wrapper: `src/pages/OnboardingPage.vue`
- Main component: `src/components/main/OnboardingComponent.vue`
- Role: explain value, capture only essential setup, and hand the user into the product
- Primary CTA: continue onboarding
- Secondary CTA: skip only where product logic allows
- Above the fold must show:
  - what the app helps with
  - why the current step matters
  - the next step clearly
- Must not break:
  - onboarding guard logic
  - auth and return-path clarity
  - first-session momentum

## Personal Horoscope

- Route: `/personal-horoscope`
- Page implementation: `src/pages/PersonalHoroscopePage.vue`
- Role: deeper zodiac-based reading for the signed-in user profile
- Primary CTA: generate or refresh the personal reading
- Secondary CTA: go back, continue into another flow
- Must not break:
  - birth-date dependency clarity
  - loading and error visibility
  - readable long-form sections

## Contract Rule

If a change weakens a screen's role, primary CTA, or above-the-fold clarity, the change is not complete even if the UI looks nicer.

# Flow Map

This file defines the main user flows and route ownership in Arcana Insight.

Use it when changing navigation, redirects, onboarding handoff, auth behavior, premium entry points, or screen-entry logic.

## Route Anchors

Product-level anchors from `src/router/routes.js`:

- `/` -> `arcana`
- `/horoscope`
- `/tarot`
- `/menu`
- `/premium`

These are the main product navigation surfaces. Do not create competing pseudo-home or pseudo-menu flows.

## Home Flow

- Entry route: `/`
- Page: `src/pages/GetStartedPage.vue`
- Main component: `src/components/main/LandingScene.vue`
- Type: destination
- Role: main dashboard and daily action hub

Expected entry sources:

- cold launch after onboarding
- onboarding completion fallback
- bottom navigation

## Daily Card Flow

- Entry route: `/daily`
- Type: drill-down
- Page: `src/pages/DailyCardPage.vue`
- Main component: `src/components/main/DailyCardComponent.vue`

Typical path:

- home -> daily card
- user reads today's card
- user may continue into tarot or another product path

## Horoscope Flow

- Entry route: `/horoscope`
- Type: destination
- Page: `src/pages/HoroscopePage.vue`
- Main component: `src/components/main/HoroscopeComponent.vue`

Related depth route:

- `/personal-horoscope`
- Type: drill-down / gated depth
- Page implementation: `src/pages/PersonalHoroscopePage.vue`

Typical path:

- bottom nav or home preview -> horoscope
- if profile data is sufficient, user may continue into personal horoscope

## Tarot Flow

- Entry route: `/tarot`
- Type: destination-like task entry
- Page: `src/pages/TarotPage.vue`
- Main component: `src/components/TarotOraclePage.vue`

Related depth routes:

- `/tarot-interpretation`

Typical path:

- home or bottom nav -> tarot entry
- user starts a reading
- user lands in interpretation or saved result

## Menu Flow

- Entry route: `/menu`
- Type: destination
- Page: `src/pages/MenuPage.vue`
- Role: utility hub for secondary surfaces

Typical downstream routes:

- `/settings`
- `/account`
- `/support`
- `/privacy-terms`
- `/premium`
- `/cards`
- `/zodiac-guide`
- `/compatibility`
- `/readings`
- `/rewards`

## Premium Flow

- Entry route: `/premium`
- Type: destination / conversion surface
- Page: `src/pages/PremiumPage.vue`
- Main component: `src/components/main/PremiumInfoComponent.vue`

Typical entry sources:

- menu
- locked states
- tarot interpretation upsell
- other justified premium prompts

Typical outcomes:

- close without purchase
- purchase attempt
- purchase success
- restore flow

## Onboarding Flow

- Entry route: `/onboarding`
- Type: gated setup flow
- Page: `src/pages/OnboardingPage.vue`
- Main component: `src/components/main/OnboardingComponent.vue`

Guard owner:

- `src/router/guard.js`
- `src/helpers/onboardingPrefs.js`

Completion state:

- onboarding complete flag: `arcana-onboarding-complete`
- interests key: `arcana-onboarding-interests`

Exit behavior:

- built through `src/helpers/onboardingFlow.js`
- target resolution in `src/helpers/onboardingRouteTarget.js`

Allowed `from` return targets:

- `/`
- `/menu`
- `/horoscope`
- `/tarot`
- `/daily`

Blocked `from` targets resolve back to home:

- onboarding/auth routes
- premium/settings/account
- cards/zodiac-guide/compatibility/readings/rewards
- tarot interpretation

Current rule:

- valid `from` targets use `push`
- invalid or absent targets resolve to `{ name: 'arcana' }` with `replace`

## Auth Flow

Entry routes:

- `/login`
- `/sign-up`
- `/confirm-code`
- `/reset-password`

Active files:

- `src/pages/LoginPage.vue` -> `src/components/auth/LoginView.vue`
- `src/pages/SignUpPage.vue` -> `src/components/auth/SignUpScene.vue`
- `src/pages/ConfirmEmailCodePage.vue` -> `src/components/auth/ConfirmEmailCode.vue`
- `src/pages/ResetPasswordPage.vue`

Store and session owners:

- auth store: `src/stores/authStore.js`
- Supabase client: `src/services/supabaseClient`
- native auth service entry: `src/services/supabaseNative.ts`

Important behavior:

- routes with `meta.requiresAuth` redirect to `login` if no user
- routes without `allowWithoutOnboarding` redirect to `onboarding` until onboarding is complete
- reset-password handles both PKCE and hash token recovery in `src/pages/ResetPasswordPage.vue`

## Saved Readings Flow

- Entry route: `/readings`
- Type: gated premium utility screen
- Page: `src/pages/SavedReadingsPage.vue`
- Snapshot logic: `src/helpers/savedReadingsCore.js`

Current gating:

- if no premium access -> `locked`
- if no user -> `anonymous`
- if premium + logged in -> load readings

## Compatibility Flow

- Entry route: `/compatibility`
- Type: feature destination
- Active page: `src/pages/CompatibilityPage.vue`

## Rewards Flow

- Entry route: `/rewards`
- Type: drill-down / retention utility
- Page: `src/pages/RitualRewardsPage.vue`

Related logic:

- `src/helpers/dailyRitual.js`
- `src/helpers/ritualRewardsBackend.js`

## Redirects And Special Cases

- `/account` requires auth
- some screens set `hideBottomNav` and should not be treated as bottom-nav destinations

## Flow Change Rule

Before changing a route or entry path, define whether it is:

- a destination
- a drill-down
- a gated flow
- a redirect-only path

If that is unclear, the change is not ready.

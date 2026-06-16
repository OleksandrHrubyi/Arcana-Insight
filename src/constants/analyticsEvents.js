export const PAYWALL_FUNNEL_EVENTS = Object.freeze({
  paywallView: 'paywall_view',
  paywallClose: 'paywall_close',
  purchaseClick: 'purchase_click',
  purchaseSuccess: 'purchase_success',
  purchaseError: 'purchase_error',
  restoreSuccess: 'restore_success',
  trialStart: 'trial_start',
})

export const REQUIRED_PAYWALL_FUNNEL_EVENTS = Object.freeze([
  PAYWALL_FUNNEL_EVENTS.paywallView,
  PAYWALL_FUNNEL_EVENTS.paywallClose,
  PAYWALL_FUNNEL_EVENTS.purchaseClick,
  PAYWALL_FUNNEL_EVENTS.purchaseSuccess,
  PAYWALL_FUNNEL_EVENTS.purchaseError,
  PAYWALL_FUNNEL_EVENTS.restoreSuccess,
  PAYWALL_FUNNEL_EVENTS.trialStart,
])

export const PAYWALL_ENTRY_EVENTS = Object.freeze({
  primary: 'paywall_entry_primary',
  secondary: 'paywall_entry_secondary',
})

export const PAYWALL_ENTRY_POINTS = Object.freeze({
  tarotPostSession: Object.freeze({
    event: PAYWALL_ENTRY_EVENTS.primary,
    source: 'tarot_post_session',
    entry: 'interpretation_aha',
  }),
  tarotDailyLimit: Object.freeze({
    event: PAYWALL_ENTRY_EVENTS.secondary,
    source: 'tarot_daily_limit',
    entry: 'notify_action',
  }),
  tarotSpreadLock: Object.freeze({
    event: PAYWALL_ENTRY_EVENTS.secondary,
    source: 'tarot_spread_lock',
    entry: 'notify_action',
  }),
  readingsLock: Object.freeze({
    event: PAYWALL_ENTRY_EVENTS.secondary,
    source: 'readings_lock',
    entry: 'secondary',
  }),
  compatibilityLock: Object.freeze({
    event: PAYWALL_ENTRY_EVENTS.secondary,
    source: 'compatibility_lock',
    entry: 'secondary',
  }),
  horoscopeLock: Object.freeze({
    event: PAYWALL_ENTRY_EVENTS.secondary,
    source: 'horoscope_lock',
    entry: 'secondary',
  }),
  menuPremium: Object.freeze({
    event: PAYWALL_ENTRY_EVENTS.secondary,
    source: 'menu_premium',
    entry: 'secondary',
  }),
})

export const CONTENT_SHARE_EVENTS = Object.freeze({
  horoscopeShare: 'horoscope_share',
  personalHoroscopeShare: 'personal_horoscope_share',
})

export const RETENTION_EVENTS = Object.freeze({
  // Daily engagement signals for retention/cohort analysis (paywall lifecycle is
  // covered by PAYWALL_FUNNEL_EVENTS; trial-converted/churn come from RevenueCat).
  dailyActive: 'daily_active',
  ritualComplete: 'ritual_complete',
})

export const ONBOARDING_EVENTS = Object.freeze({
  onboardingView: 'onboarding_view',
  interestSelect: 'interest_select',
  continueClick: 'continue_click',
  skipClick: 'skip_click',
  firstActionClick: 'first_action_click',
  firstActionComplete: 'first_action_complete',
})

export const REQUIRED_ONBOARDING_EVENTS = Object.freeze([
  ONBOARDING_EVENTS.onboardingView,
  ONBOARDING_EVENTS.interestSelect,
  ONBOARDING_EVENTS.continueClick,
  ONBOARDING_EVENTS.skipClick,
  ONBOARDING_EVENTS.firstActionClick,
  ONBOARDING_EVENTS.firstActionComplete,
])

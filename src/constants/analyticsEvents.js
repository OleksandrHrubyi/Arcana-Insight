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

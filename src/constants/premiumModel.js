export const PREMIUM_FREE_ITEM_KEYS = Object.freeze([
  'premiumPage.free.dailyCard',
  'premiumPage.free.horoscope',
  'premiumPage.free.tarotOne',
  'premiumPage.free.cardsLibrary',
  'premiumPage.free.zodiacGuide',
])

const PREMIUM_BILLING_INCLUDE_BASE = Object.freeze([
  'premiumPage.billing.includes.unlimitedReadings',
  'premiumPage.billing.includes.horoscopeThemes',
  'premiumPage.billing.includes.compatibility',
  'premiumPage.billing.includes.history',
])

const PREMIUM_BILLING_INTERPRETATION_AI = 'premiumPage.billing.includes.deepInterpretation'
const PREMIUM_BILLING_INTERPRETATION_BASIC = 'premiumPage.billing.includes.structuredInterpretation'

export const getPremiumBillingIncludeKeys = ({ tarotAiEnabled = false } = {}) => [
  ...PREMIUM_BILLING_INCLUDE_BASE.slice(0, 2),
  tarotAiEnabled ? PREMIUM_BILLING_INTERPRETATION_AI : PREMIUM_BILLING_INTERPRETATION_BASIC,
  ...PREMIUM_BILLING_INCLUDE_BASE.slice(2),
]

const PREMIUM_DETAIL_BASE = Object.freeze([
  {
    icon: 'all_inclusive',
    titleKey: 'premiumPage.premiumDetails.unlimitedTarot.title',
    textKey: 'premiumPage.premiumDetails.unlimitedTarot.text',
  },
  {
    icon: 'nightlight_round',
    titleKey: 'premiumPage.premiumDetails.horoscopeThemes.title',
    textKey: 'premiumPage.premiumDetails.horoscopeThemes.text',
  },
  {
    icon: 'dashboard_customize',
    titleKey: 'premiumPage.premiumDetails.spreads.title',
    textKey: 'premiumPage.premiumDetails.spreads.text',
  },
  {
    icon: 'favorite_border',
    titleKey: 'premiumPage.premiumDetails.compatibility.title',
    textKey: 'premiumPage.premiumDetails.compatibility.text',
  },
  {
    icon: 'history',
    titleKey: 'premiumPage.premiumDetails.history.title',
    textKey: 'premiumPage.premiumDetails.history.text',
  },
])

const PREMIUM_DETAIL_INTERPRETATION_AI = Object.freeze({
  icon: 'auto_stories',
  titleKey: 'premiumPage.premiumDetails.fullInterpretation.title',
  textKey: 'premiumPage.premiumDetails.fullInterpretation.text',
})

const PREMIUM_DETAIL_INTERPRETATION_BASIC = Object.freeze({
  icon: 'auto_stories',
  titleKey: 'premiumPage.premiumDetails.structuredInterpretation.title',
  textKey: 'premiumPage.premiumDetails.structuredInterpretation.text',
})

export const getPremiumDetailItems = ({ tarotAiEnabled = false } = {}) => [
  ...PREMIUM_DETAIL_BASE.slice(0, 3),
  tarotAiEnabled ? PREMIUM_DETAIL_INTERPRETATION_AI : PREMIUM_DETAIL_INTERPRETATION_BASIC,
  ...PREMIUM_DETAIL_BASE.slice(3),
]

export const PREMIUM_COMPARE_ROWS = Object.freeze([
  {
    featureKey: 'premiumPage.quickCompare.rows.depth.feature',
    freeKey: 'premiumPage.quickCompare.rows.depth.free',
    premiumKey: 'premiumPage.quickCompare.rows.depth.premium',
  },
  {
    featureKey: 'premiumPage.quickCompare.rows.frequency.feature',
    freeKey: 'premiumPage.quickCompare.rows.frequency.free',
    premiumKey: 'premiumPage.quickCompare.rows.frequency.premium',
  },
  {
    featureKey: 'premiumPage.quickCompare.rows.history.feature',
    freeKey: 'premiumPage.quickCompare.rows.history.free',
    premiumKey: 'premiumPage.quickCompare.rows.history.premium',
  },
])

export const PREMIUM_MODEL_LIMITS = Object.freeze({
  freeTarotSessionsPerDay: 1,
  freeTarotMaxCards: 1,
  premiumTarotMaxCards: 5,
  freeHoroscopeThemes: ['spirit'],
  premiumHoroscopeThemes: ['love', 'career'],
})


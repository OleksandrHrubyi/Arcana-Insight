import { Capacitor, registerPlugin } from '@capacitor/core'
import {
  PLAN_BY_PRODUCT_ID,
  PREMIUM_ENTITLEMENT_ID,
  PREMIUM_PLAN_PRODUCT_IDS,
} from '../constants/premiumBilling.js'

const Purchases = registerPlugin('Purchases')

// Bound the non-interactive RevenueCat bridge calls so a wedged native SDK / dead
// network can't hang the paywall or premium-status spinner forever (A-17). NOT
// applied to purchasePackage — that is user-interactive (Face ID / password sheet)
// and must be allowed to take as long as the user needs.
const RC_TIMEOUT_MS = 15000
const withTimeout = (promise, label = 'revenuecat', ms = RC_TIMEOUT_MS) => {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

let isConfigured = false
let configureAttempted = false

const normalizePlan = (value) => (value === 'yearly' ? 'yearly' : 'monthly')

const getProductIdByPlan = (planId) => {
  const plan = normalizePlan(planId)
  return PREMIUM_PLAN_PRODUCT_IDS[plan]
}

const isNative = () => Capacitor.isNativePlatform()
const getPlatform = () => Capacitor.getPlatform()

const readEnv = (key) => {
  const importMetaEnv = import.meta?.env
  if (importMetaEnv && Object.prototype.hasOwnProperty.call(importMetaEnv, key)) {
    return importMetaEnv[key]
  }
  if (typeof process !== 'undefined' && process?.env && Object.prototype.hasOwnProperty.call(process.env, key)) {
    return process.env[key]
  }
  return ''
}

const getRevenueCatApiKey = () => {
  const platform = getPlatform()
  if (platform === 'ios') {
    return String(readEnv('VITE_RC_IOS_API_KEY') || '').trim()
  }
  if (platform === 'android') {
    return String(readEnv('VITE_RC_ANDROID_API_KEY') || '').trim()
  }
  return ''
}

const toErrorReason = (error) => {
  const text = String(error?.message || error || '').toLowerCase()
  if (!text) return 'unknown'
  if (text.includes('not implemented') || text.includes('plugin')) return 'plugin_missing'
  if (text.includes('api key')) return 'missing_api_key'
  if (text.includes('network')) return 'network_error'
  return 'unknown'
}

const isPurchaseCancelled = (error) => {
  if (error?.userCancelled === true || error?.cancelled === true) return true
  const text = String(error?.message || error || '').toLowerCase()
  return text.includes('cancel') || text.includes('cancelled')
}

const extractCustomerInfo = (payload) => {
  if (!payload) return null
  if (payload.customerInfo) return payload.customerInfo
  if (payload.data?.customerInfo) return payload.data.customerInfo
  if (payload.data) return payload.data
  return payload
}

const extractOfferingsPayload = (payload) => {
  if (!payload) return null
  if (payload.offerings) return payload.offerings
  if (payload.data?.offerings) return payload.data.offerings
  if (payload.data) return payload.data
  return payload
}

const normalizeOfferings = (payload) => {
  const offerings = extractOfferingsPayload(payload)
  if (!offerings || typeof offerings !== 'object') return []

  const out = []
  if (offerings.current && typeof offerings.current === 'object') {
    out.push(offerings.current)
  }

  if (offerings.all && typeof offerings.all === 'object') {
    out.push(...Object.values(offerings.all).filter(Boolean))
  }

  return out
}

const normalizePackages = (offering) => {
  if (!offering || typeof offering !== 'object') return []
  const list = offering.availablePackages
  return Array.isArray(list) ? list : []
}

const findPackageByPlan = (payload, planId) => {
  const normalizedPlan = normalizePlan(planId)
  const expectedProductId = getProductIdByPlan(normalizedPlan)
  const offerings = normalizeOfferings(payload)

  for (const offering of offerings) {
    const packages = normalizePackages(offering)
    for (const pkg of packages) {
      const product = extractProduct(pkg)
      const productId = extractProductId(pkg, product)
      if (productId === expectedProductId) {
        return pkg
      }
    }
  }

  return null
}

const extractProduct = (pkg) => {
  if (!pkg || typeof pkg !== 'object') return null
  if (pkg.product && typeof pkg.product === 'object') return pkg.product
  if (pkg.storeProduct && typeof pkg.storeProduct === 'object') return pkg.storeProduct
  return null
}

const toLabel = (value) => {
  return String(value || '').trim()
}

const extractPriceLabel = (pkg, product) => {
  const candidates = [
    product?.priceString,
    product?.localizedPriceString,
    product?.formattedPrice,
    pkg?.priceString,
    pkg?.localizedPriceString,
  ]
  for (const candidate of candidates) {
    const label = toLabel(candidate)
    if (label) return label
  }
  return ''
}

const extractOfferLabel = (pkg, product) => {
  const intro = product?.introPrice || product?.introductoryPrice || pkg?.introPrice || pkg?.introductoryPrice
  if (!intro) return ''
  if (typeof intro === 'string') return toLabel(intro)

  const candidates = [intro?.priceString, intro?.localizedPriceString, intro?.description]
  for (const candidate of candidates) {
    const label = toLabel(candidate)
    if (label) return label
  }

  return ''
}

const PERIOD_UNIT_DAYS = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 }

// Detect an introductory FREE trial on the package (intro price 0). Returns
// { days } when the trial length is known, or { days: null } for a generic
// "free trial". Returns null when there's no free trial. RevenueCat reports the
// free phase as priceString "$0.00", so the raw offer label is useless on its
// own — the paywall formats this into human copy.
const extractFreeTrial = (pkg, product) => {
  const intro =
    product?.introPrice || product?.introductoryPrice || pkg?.introPrice || pkg?.introductoryPrice
  if (!intro || typeof intro !== 'object') return null
  const price = Number(intro.price ?? intro.amount ?? NaN)
  if (Number.isNaN(price) || price !== 0) return null
  const unit = String(intro.periodUnit || intro.subscriptionPeriodUnit || '').toUpperCase()
  const count = Number(intro.periodNumberOfUnits || intro.numberOfPeriods || intro.cycles || 0)
  const days = (PERIOD_UNIT_DAYS[unit] || 0) * (count || 0)
  return { days: days > 0 ? days : null }
}

// Numeric price amount in the storefront currency (RevenueCat reports a localized
// `price` number; Android exposes `priceAmountMicros`). Returns NaN when unknown.
const extractPriceAmount = (pkg, product) => {
  const direct = Number(product?.price ?? pkg?.price ?? NaN)
  if (!Number.isNaN(direct) && direct > 0) return direct
  const micros = Number(product?.priceAmountMicros ?? pkg?.priceAmountMicros ?? NaN)
  if (!Number.isNaN(micros) && micros > 0) return micros / 1_000_000
  return NaN
}

const extractCurrencyCode = (pkg, product) =>
  String(product?.currencyCode || product?.priceCurrencyCode || pkg?.currencyCode || '').trim()

// Per-month equivalent for annual plans (the conversion-relevant "≈ $X/mo" hint).
// Monthly plans return null — their price is already per-month, so the hint is
// redundant. Returns null when the amount/period can't be resolved. The label is
// formatted in the component, where the UI locale is known.
const PLAN_PERIOD_MONTHS = { yearly: 12, monthly: 1 }
const computePricePerMonth = (planId, priceAmount) => {
  const months = PLAN_PERIOD_MONTHS[planId]
  if (months !== 12) return null // only annual gets a normalized hint
  if (Number.isNaN(priceAmount) || priceAmount <= 0) return null
  return priceAmount / months
}

// Pure currency formatter (exported for tests). Returns '' when it can't format,
// so callers can hide the hint gracefully.
export const formatCurrencyAmount = (amount, currencyCode, locale) => {
  if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) return ''
  if (!currencyCode) return ''
  try {
    return new Intl.NumberFormat(locale || undefined, {
      style: 'currency',
      currency: currencyCode,
    }).format(amount)
  } catch {
    return ''
  }
}

const extractProductId = (pkg, product) => {
  return String(
    product?.identifier ||
      product?.productIdentifier ||
      pkg?.productIdentifier ||
      pkg?.identifier ||
      '',
  ).trim()
}

const resolvePlanFromCustomerInfo = (customerInfo) => {
  const activeSubscriptions = Array.isArray(customerInfo?.activeSubscriptions)
    ? customerInfo.activeSubscriptions
    : []

  if (activeSubscriptions.includes(PREMIUM_PLAN_PRODUCT_IDS.yearly)) return 'yearly'
  if (activeSubscriptions.includes(PREMIUM_PLAN_PRODUCT_IDS.monthly)) return 'monthly'

  const entitlement = customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID]
  const productIdentifier = entitlement?.productIdentifier || entitlement?.productIdentifierIOS || ''
  if (PLAN_BY_PRODUCT_ID[productIdentifier]) {
    return PLAN_BY_PRODUCT_ID[productIdentifier]
  }

  return 'monthly'
}

const resolvePremiumStatus = (customerInfo) => {
  const activeEntitlements = customerInfo?.entitlements?.active || {}
  const hasNamedEntitlement = Boolean(activeEntitlements[PREMIUM_ENTITLEMENT_ID])

  const activeSubscriptions = Array.isArray(customerInfo?.activeSubscriptions)
    ? customerInfo.activeSubscriptions
    : []
  const hasSubscriptionProduct = activeSubscriptions.some((productId) => Boolean(PLAN_BY_PRODUCT_ID[productId]))
  const hasPremium = hasNamedEntitlement || hasSubscriptionProduct

  return {
    hasPremium,
    plan: hasPremium ? resolvePlanFromCustomerInfo(customerInfo) : 'monthly',
  }
}

const ensureConfigured = async () => {
  if (!isNative()) return { ok: false, reason: 'not_native' }
  if (isConfigured) return { ok: true }
  if (configureAttempted) return { ok: false, reason: 'configure_failed' }

  configureAttempted = true
  const apiKey = getRevenueCatApiKey()
  if (!apiKey) {
    return { ok: false, reason: 'missing_api_key' }
  }

  try {
    await withTimeout(Purchases.configure({ apiKey }), 'configure')
    isConfigured = true
    return { ok: true }
  } catch (error) {
    return { ok: false, reason: toErrorReason(error), error }
  }
}

export const getBillingPremiumStatus = async () => {
  const configured = await ensureConfigured()
  if (!configured.ok) {
    return {
      ok: false,
      available: false,
      reason: configured.reason,
      plan: 'monthly',
      hasPremium: false,
    }
  }

  try {
    const response = await withTimeout(Purchases.getCustomerInfo(), 'getCustomerInfo')
    const customerInfo = extractCustomerInfo(response)
    const status = resolvePremiumStatus(customerInfo)
    return {
      ok: true,
      available: true,
      reason: '',
      ...status,
      customerInfo,
    }
  } catch (error) {
    return {
      ok: false,
      available: true,
      reason: toErrorReason(error),
      plan: 'monthly',
      hasPremium: false,
      error,
    }
  }
}

// Re-assert the RevenueCat identity right before a billing action. The login-time
// logIn is fire-and-forget (a network blip or the deferred-configure window can
// leave RC on an anonymous id); purchasing then attaches the entitlement to
// $RCAnonymousID while the server grants premium by Supabase user id — money in,
// no access. Never purchase/restore until the RC appUserID provably equals the
// signed-in user id.
const assertBillingIdentity = async (userId) => {
  const expected = String(userId || '')
  if (!expected) return { ok: false, reason: 'no_user_id' }
  try {
    const idRes = await withTimeout(Purchases.getAppUserID(), 'getAppUserID')
    const appUserID = String((idRes && idRes.appUserID) || idRes || '')
    if (appUserID === expected) return { ok: true }
  } catch {
    // Fall through: logIn below re-establishes the identity either way.
  }
  try {
    await withTimeout(Purchases.logIn({ appUserID: expected }), 'logIn')
    return { ok: true }
  } catch (error) {
    return { ok: false, reason: toErrorReason(error), error }
  }
}

export const purchasePremiumPlan = async (planId, userId) => {
  const normalizedPlan = normalizePlan(planId)
  const configured = await ensureConfigured()
  if (!configured.ok) {
    return {
      ok: false,
      available: false,
      reason: configured.reason,
      plan: normalizedPlan,
      hasPremium: false,
      cancelled: false,
    }
  }

  const identity = await assertBillingIdentity(userId)
  if (!identity.ok) {
    return {
      ok: false,
      available: true,
      reason: identity.reason,
      plan: normalizedPlan,
      hasPremium: false,
      cancelled: false,
    }
  }

  try {
    const offeringsResponse = await withTimeout(Purchases.getOfferings(), 'getOfferings')
    const aPackage = findPackageByPlan(offeringsResponse, normalizedPlan)
    if (!aPackage) {
      return {
        ok: false,
        available: true,
        reason: 'product_unavailable',
        plan: normalizedPlan,
        hasPremium: false,
        cancelled: false,
      }
    }

    const response = await Purchases.purchasePackage({ aPackage })
    const customerInfo = extractCustomerInfo(response)
    const status = resolvePremiumStatus(customerInfo)
    return {
      ok: status.hasPremium,
      available: true,
      reason: '',
      cancelled: false,
      // The StoreKit transaction completed (no throw). `purchased` stays true even
      // when no entitlement resolves (product/entitlement-id mismatch or slow RC
      // sync) so the UI can avoid a misleading "purchase failed" after a charge.
      purchased: true,
      ...status,
      customerInfo,
    }
  } catch (error) {
    return {
      ok: false,
      available: true,
      reason: toErrorReason(error),
      plan: normalizedPlan,
      hasPremium: false,
      cancelled: isPurchaseCancelled(error),
      error,
    }
  }
}

export const restorePremiumPurchases = async (userId) => {
  const configured = await ensureConfigured()
  if (!configured.ok) {
    return {
      ok: false,
      available: false,
      reason: configured.reason,
      plan: 'monthly',
      hasPremium: false,
    }
  }

  // Same identity guard as purchase: restoring on an anonymous RC id would sync
  // the receipt to a user the server never checks — "restored" locally, revoked
  // on the next premium sync.
  const identity = await assertBillingIdentity(userId)
  if (!identity.ok) {
    return {
      ok: false,
      available: true,
      reason: identity.reason,
      plan: 'monthly',
      hasPremium: false,
    }
  }

  try {
    const response = await withTimeout(Purchases.restorePurchases(), 'restorePurchases')
    const customerInfo = extractCustomerInfo(response)
    const status = resolvePremiumStatus(customerInfo)
    return {
      ok: true,
      available: true,
      reason: '',
      ...status,
      customerInfo,
    }
  } catch (error) {
    return {
      ok: false,
      available: true,
      reason: toErrorReason(error),
      plan: 'monthly',
      hasPremium: false,
      error,
    }
  }
}

export const getPremiumProductId = (planId) => getProductIdByPlan(planId)

export const getBillingPaywallPlans = async () => {
  const configured = await ensureConfigured()
  if (!configured.ok) {
    return {
      ok: false,
      available: false,
      reason: configured.reason,
      plans: {},
    }
  }

  try {
    const response = await Purchases.getOfferings()
    const offerings = normalizeOfferings(response)
    const plans = {}

    for (const offering of offerings) {
      const packages = normalizePackages(offering)
      for (const pkg of packages) {
        const product = extractProduct(pkg)
        const productId = extractProductId(pkg, product)
        const planId = PLAN_BY_PRODUCT_ID[productId]
        if (!planId || plans[planId]) continue

        plans[planId] = {
          productId,
          priceLabel: extractPriceLabel(pkg, product),
          offerLabel: extractOfferLabel(pkg, product),
          freeTrial: extractFreeTrial(pkg, product),
          pricePerMonth: computePricePerMonth(planId, extractPriceAmount(pkg, product)),
          currencyCode: extractCurrencyCode(pkg, product),
        }
      }
    }

    return {
      ok: true,
      available: true,
      reason: '',
      plans,
    }
  } catch (error) {
    return {
      ok: false,
      available: true,
      reason: toErrorReason(error),
      plans: {},
      error,
    }
  }
}

export const loginToRevenueCat = async (userId) => {
  if (!isNative()) return { ok: false, reason: 'not_native' }
  if (!userId) return { ok: false, reason: 'no_user_id' }

  const configured = await ensureConfigured()
  if (!configured.ok) return { ok: false, reason: configured.reason }

  try {
    await Purchases.logIn({ appUserID: String(userId) })
    return { ok: true }
  } catch (error) {
    console.warn('[premiumBilling] logIn failed', error)
    return { ok: false, reason: toErrorReason(error), error }
  }
}

// Dissociate the RevenueCat user on app logout so a logged-out/anonymous session
// does NOT inherit the previous account's entitlement. RC reverts to an anonymous
// id (which has no entitlement until a future logIn/restore). Fail-safe: RC throws
// if the current user is already anonymous — that's harmless.
export const logoutFromRevenueCat = async () => {
  if (!isNative()) return { ok: false, reason: 'not_native' }
  const configured = await ensureConfigured()
  if (!configured.ok) return { ok: false, reason: configured.reason }
  try {
    // Skip when the RC user is already anonymous (fresh install / logged-out launch):
    // calling logOut on an anonymous user throws RC error 22 ("LogOut was called but
    // the current user is anonymous"), which is just noise (and would pollute crash
    // reports). Only log out a genuinely identified user.
    const idRes = await Purchases.getAppUserID()
    const appUserID = String((idRes && idRes.appUserID) || idRes || '')
    if (!appUserID || appUserID.startsWith('$RCAnonymousID:')) {
      return { ok: true, skipped: 'anonymous' }
    }
    await Purchases.logOut()
    return { ok: true }
  } catch (error) {
    return { ok: false, reason: toErrorReason(error), error }
  }
}

export const __resetPremiumBillingForTests = () => {
  isConfigured = false
  configureAttempted = false
}

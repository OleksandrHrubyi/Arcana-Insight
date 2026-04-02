import { Capacitor, registerPlugin } from '@capacitor/core'
import {
  PLAN_BY_PRODUCT_ID,
  PREMIUM_ENTITLEMENT_ID,
  PREMIUM_PLAN_PRODUCT_IDS,
} from '../constants/premiumBilling.js'

const Purchases = registerPlugin('Purchases')

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
  const hasAnyPremiumEntitlement =
    hasNamedEntitlement ||
    Object.keys(activeEntitlements).some((key) => key.toLowerCase().includes('premium'))

  const activeSubscriptions = Array.isArray(customerInfo?.activeSubscriptions)
    ? customerInfo.activeSubscriptions
    : []
  const hasSubscriptionProduct = activeSubscriptions.some((productId) => Boolean(PLAN_BY_PRODUCT_ID[productId]))
  const hasPremium = hasAnyPremiumEntitlement || hasSubscriptionProduct

  return {
    hasPremium,
    plan: hasPremium ? resolvePlanFromCustomerInfo(customerInfo) : 'monthly',
  }
}

const ensureConfigured = async () => {
  if (!isNative()) return { ok: false, reason: 'not_native' }
  if (isConfigured) return { ok: true }
  if (configureAttempted && !isConfigured) return { ok: false, reason: 'configure_failed' }

  configureAttempted = true
  const apiKey = getRevenueCatApiKey()
  if (!apiKey) {
    return { ok: false, reason: 'missing_api_key' }
  }

  try {
    await Purchases.configure({ apiKey })
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
    const response = await Purchases.getCustomerInfo()
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

export const purchasePremiumPlan = async (planId) => {
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

  try {
    const offeringsResponse = await Purchases.getOfferings()
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

export const restorePremiumPurchases = async () => {
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
    const response = await Purchases.restorePurchases()
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

export const __resetPremiumBillingForTests = () => {
  isConfigured = false
  configureAttempted = false
}

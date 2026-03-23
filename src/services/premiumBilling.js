import { Capacitor, registerPlugin } from '@capacitor/core'
import {
  PLAN_BY_PRODUCT_ID,
  PREMIUM_ENTITLEMENT_ID,
  PREMIUM_PLAN_PRODUCT_IDS,
} from 'src/constants/premiumBilling'

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

const getRevenueCatApiKey = () => {
  const platform = getPlatform()
  if (platform === 'ios') {
    return String(import.meta.env.VITE_RC_IOS_API_KEY || '').trim()
  }
  if (platform === 'android') {
    return String(import.meta.env.VITE_RC_ANDROID_API_KEY || '').trim()
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
  const productIdentifier = getProductIdByPlan(planId)
  const configured = await ensureConfigured()
  if (!configured.ok) {
    return {
      ok: false,
      available: false,
      reason: configured.reason,
      plan: normalizePlan(planId),
      hasPremium: false,
      cancelled: false,
    }
  }

  try {
    const response = await Purchases.purchaseProduct({ productIdentifier })
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
      plan: normalizePlan(planId),
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


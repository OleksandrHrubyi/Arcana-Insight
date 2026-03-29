const EMPTY_CATALOG = Object.freeze({
  monthly: { priceLabel: '', offerLabel: '' },
  yearly: { priceLabel: '', offerLabel: '' },
})

export const createEmptyBillingCatalog = () => ({
  monthly: { ...EMPTY_CATALOG.monthly },
  yearly: { ...EMPTY_CATALOG.yearly },
})

export const toBillingCatalog = (plans) => ({
  monthly: {
    priceLabel: String(plans?.monthly?.priceLabel || ''),
    offerLabel: String(plans?.monthly?.offerLabel || ''),
  },
  yearly: {
    priceLabel: String(plans?.yearly?.priceLabel || ''),
    offerLabel: String(plans?.yearly?.offerLabel || ''),
  },
})

export const loadPremiumBootstrapSnapshot = async ({
  getBillingPaywallPlans,
  getBillingPremiumStatus,
}) => {
  const out = {
    billingReady: true,
    billingCatalog: createEmptyBillingCatalog(),
    status: null,
    errors: [],
  }

  try {
    const paywallPlans = await getBillingPaywallPlans()
    if (paywallPlans?.ok && paywallPlans?.available) {
      out.billingCatalog = toBillingCatalog(paywallPlans.plans)
    } else if (paywallPlans && !paywallPlans.available) {
      out.billingReady = false
      out.errors.push(`paywall:${String(paywallPlans.reason || 'unavailable')}`)
    }
  } catch {
    out.billingReady = false
    out.errors.push('paywall:exception')
    return out
  }

  try {
    const status = await getBillingPremiumStatus()
    if (!status?.ok || !status?.available) {
      if (status && !status.available) {
        out.billingReady = false
        out.errors.push(`status:${String(status.reason || 'unavailable')}`)
      }
      return out
    }
    out.status = {
      hasPremium: Boolean(status.hasPremium),
      plan: status.plan === 'yearly' ? 'yearly' : 'monthly',
    }
    return out
  } catch {
    out.billingReady = false
    out.errors.push('status:exception')
    return out
  }
}

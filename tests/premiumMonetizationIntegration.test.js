import test from 'node:test'
import assert from 'node:assert/strict'
import { Capacitor } from '@capacitor/core'
import { importModule, installBrowserEnv } from './utils/testEnv.js'

const PURCHASES_METHODS = [
  { name: 'configure', rtype: 'promise' },
  { name: 'getCustomerInfo', rtype: 'promise' },
  { name: 'purchasePackage', rtype: 'promise' },
  { name: 'getOfferings', rtype: 'promise' },
  { name: 'restorePurchases', rtype: 'promise' },
  { name: 'getAppUserID', rtype: 'promise' },
  { name: 'logIn', rtype: 'promise' },
]

const withBillingMock = async (handlers, run) => {
  const original = {
    isNativePlatform: Capacitor.isNativePlatform,
    getPlatform: Capacitor.getPlatform,
    PluginHeaders: Capacitor.PluginHeaders,
    nativePromise: Capacitor.nativePromise,
    iosKey: process.env.VITE_RC_IOS_API_KEY,
  }

  Capacitor.isNativePlatform = () => true
  Capacitor.getPlatform = () => 'ios'
  Capacitor.PluginHeaders = [{ name: 'Purchases', methods: PURCHASES_METHODS }]
  Capacitor.nativePromise = async (pluginName, methodName, options) => {
    assert.equal(pluginName, 'Purchases')
    if (typeof handlers?.[methodName] === 'function') {
      return handlers[methodName](options)
    }
    throw new Error(`Unhandled Purchases method: ${String(methodName)}`)
  }
  process.env.VITE_RC_IOS_API_KEY = 'integration_test_key'

  try {
    const billing = await importModule('src/services/premiumBilling.js')
    if (typeof billing.__resetPremiumBillingForTests === 'function') {
      billing.__resetPremiumBillingForTests()
    }
    await run(billing)
  } finally {
    Capacitor.isNativePlatform = original.isNativePlatform
    Capacitor.getPlatform = original.getPlatform
    Capacitor.PluginHeaders = original.PluginHeaders
    Capacitor.nativePromise = original.nativePromise
    if (typeof original.iosKey === 'undefined') delete process.env.VITE_RC_IOS_API_KEY
    else process.env.VITE_RC_IOS_API_KEY = original.iosKey
  }
}

test('monetization integration: purchase/restore/status flows keep premium store and UI state in sync', async () => {
  const env = installBrowserEnv()
  try {
    let monthlyPurchaseCalls = 0
    let restoreCalls = 0
    let entitlement = { active: false, plan: 'monthly' }

    const toCustomerInfo = () => {
      if (!entitlement.active) {
        return {
          entitlements: { active: {} },
          activeSubscriptions: [],
        }
      }
      const productIdentifier =
        entitlement.plan === 'yearly' ? 'arcana.premium.yearly' : 'arcana.premium.monthly'
      return {
        entitlements: {
          active: {
            premium: { productIdentifier },
          },
        },
        activeSubscriptions: [productIdentifier],
      }
    }

    await withBillingMock(
      {
        configure: async () => ({}),
        getAppUserID: async () => ({ appUserID: 'user-integration' }),
        getCustomerInfo: async () => ({ customerInfo: toCustomerInfo() }),
        getOfferings: async () => ({
          offerings: {
            current: {
              availablePackages: [
                {
                  identifier: '$rc_monthly',
                  productIdentifier: 'arcana.premium.monthly',
                  product: { identifier: 'arcana.premium.monthly' },
                },
                {
                  identifier: '$rc_annual',
                  productIdentifier: 'arcana.premium.yearly',
                  product: { identifier: 'arcana.premium.yearly' },
                },
              ],
            },
          },
        }),
        purchasePackage: async ({ aPackage }) => {
          const productIdentifier =
            aPackage?.product?.identifier || aPackage?.productIdentifier || aPackage?.identifier || ''
          if (productIdentifier === 'arcana.premium.yearly') {
            entitlement = { active: true, plan: 'yearly' }
            return { customerInfo: toCustomerInfo() }
          }
          monthlyPurchaseCalls += 1
          if (monthlyPurchaseCalls === 1) {
            throw { message: 'Purchase cancelled by user', userCancelled: true }
          }
          throw new Error('network timeout')
        },
        restorePurchases: async () => {
          restoreCalls += 1
          if (restoreCalls === 1) {
            entitlement = { active: true, plan: 'monthly' }
            return { customerInfo: toCustomerInfo() }
          }
          entitlement = { active: false, plan: 'monthly' }
          return { customerInfo: toCustomerInfo() }
        },
      },
      async (billing) => {
        const { __resetPremiumAccessForTests, usePremiumAccess } = await importModule(
          'src/stores/premiumAccess.js',
        )
        __resetPremiumAccessForTests()
        const primaryStore = usePremiumAccess()
        const mirrorStore = usePremiumAccess()

        const applyStatusLikeBootstrap = (result) => {
          if (!result?.ok || !result?.available) return
          primaryStore.applyPremiumAccessStatus({
            active: result.hasPremium,
            plan: result.plan,
            source: 'billing',
          })
        }

        const applyPurchaseLikePaywall = (result) => {
          if (!(result?.ok && result?.hasPremium)) return
          primaryStore.applyPremiumAccessStatus({
            active: true,
            plan: result.plan,
            source: 'billing',
          })
        }

        const applyRestoreLikePaywall = (result) => {
          if (!result?.available || !result?.ok) return
          primaryStore.applyPremiumAccessStatus({
            active: result.hasPremium,
            plan: result.hasPremium ? result.plan : 'monthly',
            source: 'billing',
          })
        }

        const initialStatus = await billing.getBillingPremiumStatus()
        applyStatusLikeBootstrap(initialStatus)
        assert.equal(primaryStore.hasPremiumAccess.value, false)
        assert.equal(mirrorStore.hasPremiumAccess.value, false)
        assert.equal(primaryStore.premiumPlan.value, 'monthly')

        const purchaseSuccess = await billing.purchasePremiumPlan('yearly', 'user-integration')
        assert.equal(purchaseSuccess.ok, true)
        assert.equal(purchaseSuccess.hasPremium, true)
        assert.equal(purchaseSuccess.plan, 'yearly')
        applyPurchaseLikePaywall(purchaseSuccess)

        assert.equal(primaryStore.hasPremiumAccess.value, true)
        assert.equal(mirrorStore.hasPremiumAccess.value, true)
        assert.equal(primaryStore.premiumPlan.value, 'yearly')

        const persistedAfterSuccess = JSON.parse(env.localStorage.getItem('arcana_premium_access_v1'))
        assert.equal(persistedAfterSuccess.active, true)
        assert.equal(persistedAfterSuccess.plan, 'yearly')
        assert.equal(persistedAfterSuccess.source, 'billing')

        const cancelled = await billing.purchasePremiumPlan('monthly', 'user-integration')
        assert.equal(cancelled.ok, false)
        assert.equal(cancelled.cancelled, true)
        assert.equal(cancelled.reason, 'unknown')
        assert.equal(primaryStore.hasPremiumAccess.value, true)
        assert.equal(mirrorStore.hasPremiumAccess.value, true)
        assert.equal(primaryStore.premiumPlan.value, 'yearly')

        const failed = await billing.purchasePremiumPlan('monthly', 'user-integration')
        assert.equal(failed.ok, false)
        assert.equal(failed.cancelled, false)
        assert.equal(failed.reason, 'network_error')
        assert.equal(primaryStore.hasPremiumAccess.value, true)
        assert.equal(mirrorStore.hasPremiumAccess.value, true)
        assert.equal(primaryStore.premiumPlan.value, 'yearly')

        entitlement = { active: false, plan: 'monthly' }
        const refreshedStatus = await billing.getBillingPremiumStatus()
        assert.equal(refreshedStatus.ok, true)
        assert.equal(refreshedStatus.hasPremium, false)
        applyStatusLikeBootstrap(refreshedStatus)

        assert.equal(primaryStore.hasPremiumAccess.value, false)
        assert.equal(mirrorStore.hasPremiumAccess.value, false)
        assert.equal(primaryStore.premiumPlan.value, 'monthly')

        const restored = await billing.restorePremiumPurchases('user-integration')
        assert.equal(restored.ok, true)
        assert.equal(restored.hasPremium, true)
        assert.equal(restored.plan, 'monthly')
        applyRestoreLikePaywall(restored)

        assert.equal(primaryStore.hasPremiumAccess.value, true)
        assert.equal(mirrorStore.hasPremiumAccess.value, true)
        assert.equal(primaryStore.premiumPlan.value, 'monthly')

        const restoredInactive = await billing.restorePremiumPurchases('user-integration')
        assert.equal(restoredInactive.ok, true)
        assert.equal(restoredInactive.hasPremium, false)
        applyRestoreLikePaywall(restoredInactive)

        assert.equal(primaryStore.hasPremiumAccess.value, false)
        assert.equal(mirrorStore.hasPremiumAccess.value, false)
        assert.equal(primaryStore.premiumPlan.value, 'monthly')
      },
    )
  } finally {
    env.restore()
  }
})

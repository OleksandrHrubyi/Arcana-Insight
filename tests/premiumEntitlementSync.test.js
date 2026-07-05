import test from 'node:test'
import assert from 'node:assert/strict'
import { Capacitor } from '@capacitor/core'
import { importModule, installBrowserEnv } from './utils/testEnv.js'

const PURCHASES_METHODS = [
  { name: 'configure', rtype: 'promise' },
  { name: 'purchasePackage', rtype: 'promise' },
  { name: 'getOfferings', rtype: 'promise' },
  { name: 'restorePurchases', rtype: 'promise' },
  { name: 'getAppUserID', rtype: 'promise' },
  { name: 'logIn', rtype: 'promise' },
]

const withPurchasesEntitlementMock = async (handlers, run) => {
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

test('purchase + restore billing outcomes sync premiumAccess state across consumers', async () => {
  const env = installBrowserEnv()
  try {
    await withPurchasesEntitlementMock(
      {
        configure: async () => ({}),
        getAppUserID: async () => ({ appUserID: 'user-sync' }),
        getOfferings: async () => ({
          offerings: {
            current: {
              availablePackages: [
                {
                  identifier: '$rc_annual',
                  productIdentifier: 'arcana.premium.yearly',
                  product: { identifier: 'arcana.premium.yearly' },
                },
              ],
            },
          },
        }),
        purchasePackage: async ({ aPackage }) => ({
          customerInfo: {
            entitlements: {
              active: {
                premium: {
                  productIdentifier:
                    aPackage?.product?.identifier || aPackage?.productIdentifier || 'arcana.premium.yearly',
                },
              },
            },
            activeSubscriptions: [
              aPackage?.product?.identifier || aPackage?.productIdentifier || 'arcana.premium.yearly',
            ],
          },
        }),
        restorePurchases: async () => ({
          customerInfo: {
            entitlements: { active: {} },
            activeSubscriptions: [],
          },
        }),
      },
      async (billing) => {
        const { __resetPremiumAccessForTests, usePremiumAccess } = await importModule(
          'src/stores/premiumAccess.js',
        )
        __resetPremiumAccessForTests()
        const first = usePremiumAccess()
        const second = usePremiumAccess()

        assert.equal(first.hasPremiumAccess.value, false)
        assert.equal(second.hasPremiumAccess.value, false)

        const purchase = await billing.purchasePremiumPlan('yearly', 'user-sync')
        assert.equal(purchase.ok, true)
        assert.equal(purchase.hasPremium, true)
        assert.equal(purchase.plan, 'yearly')

        first.applyPremiumAccessStatus({
          active: purchase.hasPremium,
          plan: purchase.plan,
          source: 'billing',
        })

        assert.equal(first.hasPremiumAccess.value, true)
        assert.equal(second.hasPremiumAccess.value, true)
        assert.equal(first.premiumPlan.value, 'yearly')
        assert.equal(second.premiumPlan.value, 'yearly')

        const restored = await billing.restorePremiumPurchases('user-sync')
        assert.equal(restored.ok, true)
        assert.equal(restored.hasPremium, false)
        assert.equal(restored.plan, 'monthly')

        second.applyPremiumAccessStatus({
          active: restored.hasPremium,
          plan: restored.plan,
          source: 'billing',
        })

        assert.equal(first.hasPremiumAccess.value, false)
        assert.equal(second.hasPremiumAccess.value, false)
        assert.equal(first.premiumPlan.value, 'monthly')
        assert.equal(second.premiumPlan.value, 'monthly')
      },
    )
  } finally {
    env.restore()
  }
})

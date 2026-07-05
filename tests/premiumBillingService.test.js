import test from 'node:test'
import assert from 'node:assert/strict'
import { Capacitor } from '@capacitor/core'
import { importModule } from './utils/testEnv.js'

const PURCHASES_METHODS = [
  { name: 'configure', rtype: 'promise' },
  { name: 'getCustomerInfo', rtype: 'promise' },
  { name: 'purchasePackage', rtype: 'promise' },
  { name: 'restorePurchases', rtype: 'promise' },
  { name: 'getOfferings', rtype: 'promise' },
  { name: 'getAppUserID', rtype: 'promise' },
  { name: 'logIn', rtype: 'promise' },
]

const withCapacitorPurchasesMock = async (
  handlers,
  run,
  { native = true, platform = 'ios', iosKey = 'test_ios_key', androidKey = '' } = {},
) => {
  const original = {
    isNativePlatform: Capacitor.isNativePlatform,
    getPlatform: Capacitor.getPlatform,
    PluginHeaders: Capacitor.PluginHeaders,
    nativePromise: Capacitor.nativePromise,
    iosKey: process.env.VITE_RC_IOS_API_KEY,
    androidKey: process.env.VITE_RC_ANDROID_API_KEY,
  }

  Capacitor.isNativePlatform = () => native
  Capacitor.getPlatform = () => platform
  Capacitor.PluginHeaders = [{ name: 'Purchases', methods: PURCHASES_METHODS }]
  Capacitor.nativePromise = async (pluginName, methodName, options) => {
    assert.equal(pluginName, 'Purchases')
    if (typeof handlers?.[methodName] === 'function') {
      return handlers[methodName](options)
    }
    throw new Error(`Unhandled Purchases method: ${String(methodName)}`)
  }

  process.env.VITE_RC_IOS_API_KEY = iosKey
  process.env.VITE_RC_ANDROID_API_KEY = androidKey

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

    if (typeof original.androidKey === 'undefined') delete process.env.VITE_RC_ANDROID_API_KEY
    else process.env.VITE_RC_ANDROID_API_KEY = original.androidKey
  }
}

test('premiumBilling returns not_native when device billing is unavailable', async () => {
  await withCapacitorPurchasesMock(
    {},
    async (billing) => {
      const status = await billing.getBillingPremiumStatus()
      assert.equal(status.ok, false)
      assert.equal(status.available, false)
      assert.equal(status.reason, 'not_native')
      assert.equal(status.hasPremium, false)

      const purchase = await billing.purchasePremiumPlan('yearly')
      assert.equal(purchase.ok, false)
      assert.equal(purchase.available, false)
      assert.equal(purchase.reason, 'not_native')
      assert.equal(purchase.plan, 'yearly')

      const restore = await billing.restorePremiumPurchases()
      assert.equal(restore.ok, false)
      assert.equal(restore.available, false)
      assert.equal(restore.reason, 'not_native')

      const offerings = await billing.getBillingPaywallPlans()
      assert.equal(offerings.ok, false)
      assert.equal(offerings.available, false)
      assert.equal(offerings.reason, 'not_native')
      assert.deepEqual(offerings.plans, {})
    },
    { native: false, iosKey: '' },
  )
})

test('premiumBilling returns missing_api_key on native without RevenueCat key', async () => {
  const calls = []
  await withCapacitorPurchasesMock(
    {
      configure: async (options) => {
        calls.push(options)
      },
    },
    async (billing) => {
      const status = await billing.getBillingPremiumStatus()
      assert.equal(status.ok, false)
      assert.equal(status.available, false)
      assert.equal(status.reason, 'missing_api_key')
      assert.equal(calls.length, 0)
    },
    { native: true, platform: 'ios', iosKey: '' },
  )
})

test('premiumBilling maps configure plugin error and caches configure_failed for next attempts', async () => {
  let configureCalls = 0
  await withCapacitorPurchasesMock(
    {
      configure: async () => {
        configureCalls += 1
        throw new Error('Plugin not implemented')
      },
    },
    async (billing) => {
      const first = await billing.getBillingPremiumStatus()
      assert.equal(first.ok, false)
      assert.equal(first.reason, 'plugin_missing')

      const second = await billing.purchasePremiumPlan('monthly')
      assert.equal(second.ok, false)
      assert.equal(second.reason, 'configure_failed')
      assert.equal(configureCalls, 1)
    },
  )
})

test('premiumBilling resolves active premium status and plan from customer info', async () => {
  await withCapacitorPurchasesMock(
    {
      configure: async () => ({}),
      getCustomerInfo: async () => ({
        data: {
          customerInfo: {
            entitlements: {
              active: {
                premium: { productIdentifier: 'arcana.premium.yearly' },
              },
            },
            activeSubscriptions: ['arcana.premium.yearly'],
          },
        },
      }),
    },
    async (billing) => {
      const status = await billing.getBillingPremiumStatus()
      assert.equal(status.ok, true)
      assert.equal(status.available, true)
      assert.equal(status.hasPremium, true)
      assert.equal(status.plan, 'yearly')
    },
  )
})

test('purchasePremiumPlan handles success, cancelled and network_error flows', async () => {
  let monthlyCalls = 0
  await withCapacitorPurchasesMock(
    {
      configure: async () => ({}),
      getAppUserID: async () => ({ appUserID: 'user-1' }),
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
          return {
            customerInfo: {
              entitlements: { active: { premium: { productIdentifier } } },
              activeSubscriptions: [productIdentifier],
            },
          }
        }
        if (productIdentifier === 'arcana.premium.monthly') {
          monthlyCalls += 1
          if (monthlyCalls === 1) {
            throw { message: 'Purchase cancelled by user', userCancelled: true }
          }
          throw new Error('network timeout')
        }
        throw new Error('network timeout')
      },
    },
    async (billing) => {
      const success = await billing.purchasePremiumPlan('yearly', 'user-1')
      assert.equal(success.ok, true)
      assert.equal(success.available, true)
      assert.equal(success.cancelled, false)
      assert.equal(success.hasPremium, true)
      assert.equal(success.plan, 'yearly')

      const cancelled = await billing.purchasePremiumPlan('monthly', 'user-1')
      assert.equal(cancelled.ok, false)
      assert.equal(cancelled.available, true)
      assert.equal(cancelled.cancelled, true)
      assert.equal(cancelled.reason, 'unknown')

      const unknownPlan = await billing.purchasePremiumPlan('weekly', 'user-1')
      assert.equal(unknownPlan.ok, false)
      assert.equal(unknownPlan.reason, 'network_error')
      assert.equal(unknownPlan.cancelled, false)
      assert.equal(unknownPlan.plan, 'monthly')
    },
  )
})

test('restorePremiumPurchases supports active and inactive restore outcomes', async () => {
  let restoreCalls = 0
  await withCapacitorPurchasesMock(
    {
      configure: async () => ({}),
      getAppUserID: async () => ({ appUserID: 'user-1' }),
      restorePurchases: async () => {
        restoreCalls += 1
        if (restoreCalls === 1) {
          return {
            customerInfo: {
              entitlements: { active: { premium: { productIdentifier: 'arcana.premium.monthly' } } },
              activeSubscriptions: ['arcana.premium.monthly'],
            },
          }
        }
        return {
          customerInfo: {
            entitlements: { active: {} },
            activeSubscriptions: [],
          },
        }
      },
    },
    async (billing) => {
      const restored = await billing.restorePremiumPurchases('user-1')
      assert.equal(restored.ok, true)
      assert.equal(restored.hasPremium, true)
      assert.equal(restored.plan, 'monthly')

      const noActive = await billing.restorePremiumPurchases('user-1')
      assert.equal(noActive.ok, true)
      assert.equal(noActive.hasPremium, false)
      assert.equal(noActive.plan, 'monthly')
    },
  )
})

// A2 (launch audit): purchasing/restoring must never run on the wrong RevenueCat
// identity — a failed login-time logIn leaves RC anonymous, the entitlement lands
// on $RCAnonymousID, and the server (which grants by Supabase user id) revokes
// premium on the next sync: money in, no access.
test('purchasePremiumPlan re-asserts RevenueCat identity before purchasing', async () => {
  const loggedInIds = []
  let purchaseCalls = 0
  const handlers = {
    configure: async () => ({}),
    getAppUserID: async () => ({ appUserID: '$RCAnonymousID:abc' }),
    logIn: async ({ appUserID }) => {
      loggedInIds.push(appUserID)
      return { customerInfo: {} }
    },
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
    purchasePackage: async () => {
      purchaseCalls += 1
      return {
        customerInfo: {
          entitlements: { active: { premium: { productIdentifier: 'arcana.premium.yearly' } } },
          activeSubscriptions: ['arcana.premium.yearly'],
        },
      }
    },
  }

  await withCapacitorPurchasesMock(handlers, async (billing) => {
    // Anonymous RC id + signed-in user: logIn must run with the user id first.
    const success = await billing.purchasePremiumPlan('yearly', 'user-42')
    assert.equal(success.ok, true)
    assert.deepEqual(loggedInIds, ['user-42'])
    assert.equal(purchaseCalls, 1)

    // No user id: the purchase must be blocked before any StoreKit interaction.
    const missingUser = await billing.purchasePremiumPlan('yearly')
    assert.equal(missingUser.ok, false)
    assert.equal(missingUser.reason, 'no_user_id')
    assert.equal(purchaseCalls, 1)
  })
})

test('purchasePremiumPlan skips logIn when RC identity already matches', async () => {
  const loggedInIds = []
  let purchaseCalls = 0
  await withCapacitorPurchasesMock(
    {
      configure: async () => ({}),
      getAppUserID: async () => ({ appUserID: 'user-42' }),
      logIn: async ({ appUserID }) => {
        loggedInIds.push(appUserID)
        return { customerInfo: {} }
      },
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
      purchasePackage: async () => {
        purchaseCalls += 1
        return {
          customerInfo: {
            entitlements: { active: { premium: { productIdentifier: 'arcana.premium.yearly' } } },
            activeSubscriptions: ['arcana.premium.yearly'],
          },
        }
      },
    },
    async (billing) => {
      const success = await billing.purchasePremiumPlan('yearly', 'user-42')
      assert.equal(success.ok, true)
      assert.deepEqual(loggedInIds, [])
      assert.equal(purchaseCalls, 1)
    },
  )
})

test('purchase and restore are blocked when identity logIn fails', async () => {
  let purchaseCalls = 0
  let restoreCalls = 0
  await withCapacitorPurchasesMock(
    {
      configure: async () => ({}),
      getAppUserID: async () => ({ appUserID: '$RCAnonymousID:abc' }),
      logIn: async () => {
        throw new Error('network timeout')
      },
      getOfferings: async () => {
        throw new Error('getOfferings must not be reached when identity fails')
      },
      purchasePackage: async () => {
        purchaseCalls += 1
        return {}
      },
      restorePurchases: async () => {
        restoreCalls += 1
        return {}
      },
    },
    async (billing) => {
      const purchase = await billing.purchasePremiumPlan('yearly', 'user-42')
      assert.equal(purchase.ok, false)
      assert.equal(purchase.available, true)
      assert.equal(purchase.reason, 'network_error')
      assert.equal(purchase.cancelled, false)
      assert.equal(purchaseCalls, 0)

      const restore = await billing.restorePremiumPurchases('user-42')
      assert.equal(restore.ok, false)
      assert.equal(restore.available, true)
      assert.equal(restore.reason, 'network_error')
      assert.equal(restoreCalls, 0)
    },
  )
})

test('getBillingPaywallPlans returns live plans from offerings and tolerates malformed payloads', async () => {
  let getOfferingsCalls = 0
  await withCapacitorPurchasesMock(
    {
      configure: async () => ({}),
      getOfferings: async () => {
        getOfferingsCalls += 1
        if (getOfferingsCalls === 1) {
          return {
            offerings: {
              current: {
                availablePackages: [
                  {
                    productIdentifier: 'arcana.premium.monthly',
                    localizedPriceString: '$7.99',
                    introPrice: { description: '3 days free' },
                  },
                ],
              },
              all: {
                default: {
                  availablePackages: [
                    {
                      storeProduct: {
                        identifier: 'arcana.premium.yearly',
                        priceString: '$39.99',
                        price: 39.99,
                        currencyCode: 'USD',
                        introductoryPrice: { localizedPriceString: '7 days free' },
                      },
                    },
                  ],
                },
              },
            },
          }
        }
        return { offerings: null }
      },
    },
    async (billing) => {
      const plans = await billing.getBillingPaywallPlans()
      assert.equal(plans.ok, true)
      assert.equal(plans.available, true)
      assert.deepEqual(plans.plans, {
        monthly: {
          productId: 'arcana.premium.monthly',
          priceLabel: '$7.99',
          offerLabel: '3 days free',
          freeTrial: null,
          pricePerMonth: null,
          currencyCode: '',
        },
        yearly: {
          productId: 'arcana.premium.yearly',
          priceLabel: '$39.99',
          offerLabel: '7 days free',
          freeTrial: null,
          pricePerMonth: 39.99 / 12,
          currencyCode: 'USD',
        },
      })

      const malformed = await billing.getBillingPaywallPlans()
      assert.equal(malformed.ok, true)
      assert.equal(malformed.available, true)
      assert.deepEqual(malformed.plans, {})
    },
  )
})

test('premiumBilling exposes stable product id mapping helper', async () => {
  await withCapacitorPurchasesMock(
    {},
    async (billing) => {
      assert.equal(billing.getPremiumProductId('monthly'), 'arcana.premium.monthly')
      assert.equal(billing.getPremiumProductId('yearly'), 'arcana.premium.yearly')
      assert.equal(billing.getPremiumProductId('something_else'), 'arcana.premium.monthly')
    },
    { native: false, iosKey: '' },
  )
})

test('formatCurrencyAmount formats valid amounts and hides invalid input', async () => {
  const billing = await importModule('src/services/premiumBilling.js')
  // 39.99 / 12 = 3.3325 → rounds to 3.33 in en-US USD
  assert.equal(billing.formatCurrencyAmount(39.99 / 12, 'USD', 'en-US'), '$3.33')
  // Graceful empty string when it cannot format
  assert.equal(billing.formatCurrencyAmount(null, 'USD', 'en-US'), '')
  assert.equal(billing.formatCurrencyAmount(3.33, '', 'en-US'), '')
  assert.equal(billing.formatCurrencyAmount(0, 'USD', 'en-US'), '')
  assert.equal(billing.formatCurrencyAmount(NaN, 'USD', 'en-US'), '')
  assert.equal(billing.formatCurrencyAmount(5, 'NOT_A_CURRENCY', 'en-US'), '')
})

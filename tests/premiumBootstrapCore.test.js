import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

test('toBillingCatalog normalizes monthly/yearly labels', async () => {
  const { toBillingCatalog } = await importModule('src/helpers/premiumBootstrapCore.js')
  const catalog = toBillingCatalog({
    monthly: { priceLabel: '$9.99', offerLabel: '' },
    yearly: { priceLabel: '$59.99', offerLabel: '7-day trial' },
  })
  assert.deepEqual(catalog, {
    monthly: { priceLabel: '$9.99', offerLabel: '', freeTrial: null },
    yearly: { priceLabel: '$59.99', offerLabel: '7-day trial', freeTrial: null },
  })
})

test('loadPremiumBootstrapSnapshot maps happy path plans and entitlement status', async () => {
  const { loadPremiumBootstrapSnapshot } = await importModule('src/helpers/premiumBootstrapCore.js')
  const result = await loadPremiumBootstrapSnapshot({
    getBillingPaywallPlans: async () => ({
      ok: true,
      available: true,
      plans: {
        monthly: { priceLabel: '$9.99', offerLabel: '' },
        yearly: { priceLabel: '$59.99', offerLabel: 'Save 50%' },
      },
    }),
    getBillingPremiumStatus: async () => ({
      ok: true,
      available: true,
      hasPremium: true,
      plan: 'yearly',
    }),
  })

  assert.equal(result.billingReady, true)
  assert.deepEqual(result.billingCatalog, {
    monthly: { priceLabel: '$9.99', offerLabel: '', freeTrial: null },
    yearly: { priceLabel: '$59.99', offerLabel: 'Save 50%', freeTrial: null },
  })
  assert.deepEqual(result.status, { hasPremium: true, plan: 'yearly' })
  assert.deepEqual(result.errors, [])
})

test('loadPremiumBootstrapSnapshot disables billing when paywall is unavailable', async () => {
  const { loadPremiumBootstrapSnapshot } = await importModule('src/helpers/premiumBootstrapCore.js')
  const result = await loadPremiumBootstrapSnapshot({
    getBillingPaywallPlans: async () => ({
      ok: false,
      available: false,
      reason: 'not_native',
    }),
    getBillingPremiumStatus: async () => ({
      ok: false,
      available: false,
      reason: 'not_native',
    }),
  })

  assert.equal(result.billingReady, false)
  assert.equal(result.status, null)
  assert.match(result.errors.join(','), /paywall:not_native/)
  assert.match(result.errors.join(','), /status:not_native/)
})

test('loadPremiumBootstrapSnapshot handles paywall fetch exceptions', async () => {
  const { loadPremiumBootstrapSnapshot } = await importModule('src/helpers/premiumBootstrapCore.js')
  const result = await loadPremiumBootstrapSnapshot({
    getBillingPaywallPlans: async () => {
      throw new Error('timeout')
    },
    getBillingPremiumStatus: async () => ({
      ok: true,
      available: true,
      hasPremium: false,
      plan: 'monthly',
    }),
  })

  assert.equal(result.billingReady, false)
  assert.equal(result.status, null)
  assert.deepEqual(result.errors, ['paywall:exception'])
})

test('loadPremiumBootstrapSnapshot handles status exceptions after plans load', async () => {
  const { loadPremiumBootstrapSnapshot } = await importModule('src/helpers/premiumBootstrapCore.js')
  const result = await loadPremiumBootstrapSnapshot({
    getBillingPaywallPlans: async () => ({
      ok: true,
      available: true,
      plans: {
        monthly: { priceLabel: '$9.99', offerLabel: '' },
        yearly: { priceLabel: '$59.99', offerLabel: '' },
      },
    }),
    getBillingPremiumStatus: async () => {
      throw new Error('boom')
    },
  })

  assert.equal(result.billingReady, false)
  assert.equal(result.status, null)
  assert.deepEqual(result.billingCatalog, {
    monthly: { priceLabel: '$9.99', offerLabel: '', freeTrial: null },
    yearly: { priceLabel: '$59.99', offerLabel: '', freeTrial: null },
  })
  assert.deepEqual(result.errors, ['status:exception'])
})

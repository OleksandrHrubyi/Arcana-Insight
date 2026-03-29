import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PLAN_BY_PRODUCT_ID,
  PREMIUM_ENTITLEMENT_ID,
  PREMIUM_PLAN_PRODUCT_IDS,
} from '../src/constants/premiumBilling.js'

test('premium billing constants expose expected product ids', () => {
  assert.equal(PREMIUM_PLAN_PRODUCT_IDS.monthly, 'arcana.premium.monthly')
  assert.equal(PREMIUM_PLAN_PRODUCT_IDS.yearly, 'arcana.premium.yearly')
  assert.equal(PREMIUM_ENTITLEMENT_ID, 'premium')
})

test('PLAN_BY_PRODUCT_ID maps known products to plans', () => {
  assert.equal(PLAN_BY_PRODUCT_ID[PREMIUM_PLAN_PRODUCT_IDS.monthly], 'monthly')
  assert.equal(PLAN_BY_PRODUCT_ID[PREMIUM_PLAN_PRODUCT_IDS.yearly], 'yearly')
})

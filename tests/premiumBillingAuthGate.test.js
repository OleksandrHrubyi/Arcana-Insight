import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

// Guards QA finding #1: the paywall (and boot/resume sync) must never grant
// premium from a RevenueCat device-level subscription while the user is logged
// out. resolveBillingPremiumAction encodes that auth gate.

test('resolveBillingPremiumAction: logged-in session applies billing status', async () => {
  const { resolveBillingPremiumAction } = await importModule('src/stores/premiumAccess.js')
  assert.equal(resolveBillingPremiumAction({ sessionLoaded: true, userId: 'user-123' }), 'apply')
})

test('resolveBillingPremiumAction: known-logged-out session revokes (no device-sub leak)', async () => {
  const { resolveBillingPremiumAction } = await importModule('src/stores/premiumAccess.js')
  assert.equal(resolveBillingPremiumAction({ sessionLoaded: true, userId: '' }), 'revoke')
  assert.equal(resolveBillingPremiumAction({ sessionLoaded: true, userId: '   ' }), 'revoke')
  assert.equal(resolveBillingPremiumAction({ sessionLoaded: true, userId: null }), 'revoke')
})

test('resolveBillingPremiumAction: unresolved session defers (a later sync decides)', async () => {
  const { resolveBillingPremiumAction } = await importModule('src/stores/premiumAccess.js')
  assert.equal(resolveBillingPremiumAction({ sessionLoaded: false, userId: 'user-123' }), 'defer')
  assert.equal(resolveBillingPremiumAction({ sessionLoaded: false, userId: '' }), 'defer')
  // Defensive default: no args → treat as unresolved, never apply.
  assert.equal(resolveBillingPremiumAction(), 'defer')
  assert.equal(resolveBillingPremiumAction({}), 'defer')
})

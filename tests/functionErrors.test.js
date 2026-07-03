import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

// QA findings #12/#13: a 403 premium_required from an edge function must be told
// apart from a transient failure so the UI shows an upgrade/locked state (and
// reconciles the stale local premium flag) instead of a generic retry loop.

test('isPremiumRequiredError detects 403 / premium_required, ignores other failures', async () => {
  const { isPremiumRequiredError } = await importModule('src/helpers/functionErrors.js')
  assert.equal(isPremiumRequiredError({ status: 403 }), true)
  assert.equal(isPremiumRequiredError({ code: 'premium_required' }), true)
  assert.equal(isPremiumRequiredError({ message: 'functions personal-horoscope failed: 403' }), true)

  assert.equal(isPremiumRequiredError({ status: 500 }), false)
  assert.equal(isPremiumRequiredError({ status: 401 }), false)
  assert.equal(isPremiumRequiredError({ message: 'functions x failed: 500' }), false)
  assert.equal(isPremiumRequiredError(null), false)
  assert.equal(isPremiumRequiredError({}), false)
})

// H4/C3: a 401 (missing/expired session) must also be reconciled, not looped on.
test('isUnauthorizedError detects 401, ignores 403 and other failures', async () => {
  const { isUnauthorizedError } = await importModule('src/helpers/functionErrors.js')
  assert.equal(isUnauthorizedError({ status: 401 }), true)
  assert.equal(isUnauthorizedError({ code: 'unauthorized' }), true)
  assert.equal(isUnauthorizedError({ message: 'functions compatibility failed: 401' }), true)

  assert.equal(isUnauthorizedError({ status: 403 }), false)
  assert.equal(isUnauthorizedError({ status: 500 }), false)
  assert.equal(isUnauthorizedError(null), false)
  assert.equal(isUnauthorizedError({}), false)
})

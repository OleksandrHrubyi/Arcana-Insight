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

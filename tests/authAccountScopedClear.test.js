import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule, installBrowserEnv } from './utils/testEnv.js'

// QA finding #7: account-scoped local flags (the one-free-AI-reading gift, the
// daily free-tarot limit, the cached profile) were only cleared in the async
// SIGNED_OUT handler, so a dropped/slow event leaked them to the next account on a
// shared device. clearUser() — called synchronously by both logout and
// delete-account — must clear them deterministically.

test('clearUser clears account-scoped local flags but leaves unrelated state', async () => {
  const env = installBrowserEnv({
    profile_cache_v1: '{"id":"account-a"}',
    arcana_free_ai_tarot_used_v1: '1',
    arcana_free_tarot_daily_v1: '2026-06-25',
    locale: 'uk',
    'arcana-onboarding-complete': 'true',
  })
  try {
    const { createAuthStore } = await importModule('src/stores/authStoreCore.js')
    const store = createAuthStore({})

    store.clearUser()

    assert.equal(env.localStorage.getItem('arcana_free_ai_tarot_used_v1'), null)
    assert.equal(env.localStorage.getItem('arcana_free_tarot_daily_v1'), null)
    assert.equal(env.localStorage.getItem('profile_cache_v1'), null)
    // Unrelated, non-account-scoped keys must survive a sign-out.
    assert.equal(env.localStorage.getItem('locale'), 'uk')
    assert.equal(env.localStorage.getItem('arcana-onboarding-complete'), 'true')
  } finally {
    env.restore()
  }
})

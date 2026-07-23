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
    arcana_compatibility_connections_v1: '[{"name":"Alex","dob":"1990-01-01"}]',
    arcana_auth_reward_inventory_cache_v1: '{"tokens":0}',
    horoscope_sign_key_v1: 'virgo',
    arcana_journal_entries_v1: '{"2026-07-23":{"dateKey":"2026-07-23","body":"private"}}',
    arcana_journal_migration_v1: '{"status":"migrated","userId":"account-a"}',
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
    // A1: saved compatibility connections (other people's PII) + reward inventory
    // must not survive a sign-out on a shared device.
    assert.equal(env.localStorage.getItem('arcana_compatibility_connections_v1'), null)
    assert.equal(env.localStorage.getItem('arcana_auth_reward_inventory_cache_v1'), null)
    // B7: the cached zodiac sign must not survive an account switch — Home
    // focus-today and the horoscope wheel would show the previous user's sign.
    assert.equal(env.localStorage.getItem('horoscope_sign_key_v1'), null)
    // Journal entries are the signed-in user's private written content — must not
    // surface for the next account (server copy remains for the owner).
    assert.equal(env.localStorage.getItem('arcana_journal_entries_v1'), null)
    assert.equal(env.localStorage.getItem('arcana_journal_migration_v1'), null)
    // Unrelated, non-account-scoped keys must survive a sign-out.
    assert.equal(env.localStorage.getItem('locale'), 'uk')
    assert.equal(env.localStorage.getItem('arcana-onboarding-complete'), 'true')
  } finally {
    env.restore()
  }
})

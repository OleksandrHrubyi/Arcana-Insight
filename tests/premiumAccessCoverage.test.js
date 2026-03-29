import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule, installBrowserEnv } from './utils/testEnv.js'

const STORAGE_KEY = 'arcana_premium_access_v1'

test('premium access stable-import flow covers listeners, sync, normalization and non-browser fallback', async () => {
  const env = installBrowserEnv()
  const originalWindow = globalThis.window
  const originalLocalStorage = globalThis.localStorage
  try {
    const mod = await importModule('src/stores/premiumAccess.js')
    mod.__resetPremiumAccessForTests()
    const store = mod.usePremiumAccess()

    assert.equal(store.hasPremiumAccess.value, false)
    assert.equal(store.premiumPlan.value, 'monthly')

    env.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        active: true,
        plan: 'yearly',
        source: 'billing',
        updatedAt: '2026-03-25T00:00:00.000Z',
      }),
    )
    store.syncPremiumAccess()
    assert.equal(store.hasPremiumAccess.value, true)
    assert.equal(store.premiumPlan.value, 'yearly')

    env.localStorage.setItem(STORAGE_KEY, '{broken-json')
    store.syncPremiumAccess()
    assert.equal(store.hasPremiumAccess.value, false)
    assert.equal(store.premiumPlan.value, 'monthly')

    env.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        active: true,
        plan: 'weekly',
        source: 'local',
      }),
    )
    env.dispatchStorageEvent(STORAGE_KEY)
    assert.equal(store.hasPremiumAccess.value, false)
    assert.equal(store.premiumPlan.value, 'monthly')
    assert.equal(store.state.value.source, 'local')

    store.applyPremiumAccessStatus({ active: true, plan: 'yearly', source: 'billing' })
    assert.equal(store.hasPremiumAccess.value, true)
    store.revokePremiumAccess()
    assert.equal(store.hasPremiumAccess.value, false)
    assert.equal(store.state.value.source, 'billing')

    delete globalThis.window
    delete globalThis.localStorage
    assert.doesNotThrow(() =>
      store.applyPremiumAccessStatus({ active: true, plan: 'yearly', source: 'billing' }),
    )
    store.syncPremiumAccess()
    assert.equal(store.hasPremiumAccess.value, false)
    assert.equal(store.premiumPlan.value, 'monthly')
  } finally {
    if (typeof originalWindow === 'undefined') delete globalThis.window
    else globalThis.window = originalWindow
    if (typeof originalLocalStorage === 'undefined') delete globalThis.localStorage
    else globalThis.localStorage = originalLocalStorage
    env.restore()
  }
})

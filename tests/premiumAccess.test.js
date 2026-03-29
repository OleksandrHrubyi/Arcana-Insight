import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule, installBrowserEnv } from './utils/testEnv.js'

const STORAGE_KEY = 'arcana_premium_access_v1'

const loadStore = async () => {
  const mod = await importModule('src/stores/premiumAccess.js')
  mod.__resetPremiumAccessForTests()
  return mod.usePremiumAccess()
}

test('premiumAccess initializes with safe defaults', async () => {
  const env = installBrowserEnv()
  try {
    const store = await loadStore()
    assert.equal(store.hasPremiumAccess.value, false)
    assert.equal(store.premiumPlan.value, 'monthly')
    assert.equal(store.state.value.source, 'billing')
  } finally {
    env.restore()
  }
})

test('applyPremiumAccessStatus enables premium only for billing source', async () => {
  const env = installBrowserEnv()
  try {
    const store = await loadStore()

    store.applyPremiumAccessStatus({ active: true, plan: 'yearly', source: 'billing' })
    assert.equal(store.hasPremiumAccess.value, true)
    assert.equal(store.premiumPlan.value, 'yearly')

    store.applyPremiumAccessStatus({ active: true, plan: 'yearly', source: 'local' })
    assert.equal(store.hasPremiumAccess.value, false)
    assert.equal(store.premiumPlan.value, 'yearly')
    assert.equal(store.state.value.source, 'local')
  } finally {
    env.restore()
  }
})

test('store sanitizes legacy local premium from storage on init', async () => {
  const env = installBrowserEnv({
    [STORAGE_KEY]: JSON.stringify({
      active: true,
      plan: 'yearly',
      source: 'local',
      updatedAt: '2026-03-10T10:00:00.000Z',
    }),
  })
  try {
    const store = await loadStore()
    assert.equal(store.hasPremiumAccess.value, false)
    assert.equal(store.premiumPlan.value, 'yearly')
    assert.equal(store.state.value.source, 'local')
  } finally {
    env.restore()
  }
})

test('storage event sync updates premium state from persisted billing payload', async () => {
  const env = installBrowserEnv()
  try {
    const store = await loadStore()
    assert.equal(store.hasPremiumAccess.value, false)

    env.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        active: true,
        plan: 'yearly',
        source: 'billing',
        updatedAt: '2026-03-10T11:00:00.000Z',
      }),
    )
    env.dispatchStorageEvent(STORAGE_KEY)

    assert.equal(store.hasPremiumAccess.value, true)
    assert.equal(store.premiumPlan.value, 'yearly')
  } finally {
    env.restore()
  }
})

test('revokePremiumAccess resets entitlement to disabled billing state', async () => {
  const env = installBrowserEnv()
  try {
    const store = await loadStore()

    store.applyPremiumAccessStatus({ active: true, plan: 'yearly', source: 'billing' })
    assert.equal(store.hasPremiumAccess.value, true)

    store.revokePremiumAccess()
    assert.equal(store.hasPremiumAccess.value, false)
    assert.equal(store.premiumPlan.value, 'monthly')
    assert.equal(store.state.value.source, 'billing')
  } finally {
    env.restore()
  }
})

test('premiumAccess normalizes invalid plan and source from persisted state', async () => {
  const env = installBrowserEnv({
    [STORAGE_KEY]: JSON.stringify({
      active: true,
      plan: 'weekly',
      source: 'external',
      updatedAt: '2026-03-10T11:00:00.000Z',
    }),
  })
  try {
    const store = await loadStore()
    assert.equal(store.hasPremiumAccess.value, true)
    assert.equal(store.premiumPlan.value, 'monthly')
    assert.equal(store.state.value.source, 'billing')
  } finally {
    env.restore()
  }
})

test('premiumAccess falls back to safe defaults on malformed storage payload', async () => {
  const env = installBrowserEnv({
    [STORAGE_KEY]: '{broken-json',
  })
  try {
    const store = await loadStore()
    assert.equal(store.hasPremiumAccess.value, false)
    assert.equal(store.premiumPlan.value, 'monthly')
    assert.equal(store.state.value.source, 'billing')
  } finally {
    env.restore()
  }
})

test('syncPremiumAccess reads external storage updates', async () => {
  const env = installBrowserEnv()
  try {
    const store = await loadStore()
    assert.equal(store.hasPremiumAccess.value, false)

    env.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        active: true,
        plan: 'yearly',
        source: 'billing',
      }),
    )
    store.syncPremiumAccess()
    assert.equal(store.hasPremiumAccess.value, true)
    assert.equal(store.premiumPlan.value, 'yearly')
  } finally {
    env.restore()
  }
})

test('premiumAccess writes are resilient to localStorage failures', async () => {
  const originalWindow = globalThis.window
  const originalLocalStorage = globalThis.localStorage
  try {
    const brokenStorage = {
      getItem() {
        return null
      },
      setItem() {
        throw new Error('boom')
      },
    }
    globalThis.window = {
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return true
      },
    }
    globalThis.localStorage = brokenStorage

    const store = await loadStore()

    assert.doesNotThrow(() =>
      store.applyPremiumAccessStatus({ active: true, plan: 'monthly', source: 'billing' }),
    )
    assert.doesNotThrow(() => store.revokePremiumAccess())
  } finally {
    if (typeof originalWindow === 'undefined') delete globalThis.window
    else globalThis.window = originalWindow
    if (typeof originalLocalStorage === 'undefined') delete globalThis.localStorage
    else globalThis.localStorage = originalLocalStorage
  }
})

test('premiumAccess is safe in non-browser runtime', async () => {
  const originalWindow = globalThis.window
  const originalLocalStorage = globalThis.localStorage
  const originalCustomEvent = globalThis.CustomEvent

  try {
    delete globalThis.window
    delete globalThis.localStorage
    delete globalThis.CustomEvent

    const store = await loadStore()
    assert.equal(store.hasPremiumAccess.value, false)
    assert.equal(store.premiumPlan.value, 'monthly')
    assert.doesNotThrow(() =>
      store.applyPremiumAccessStatus({ active: true, plan: 'yearly', source: 'billing' }),
    )
    assert.doesNotThrow(() => store.syncPremiumAccess())
  } finally {
    if (typeof originalWindow === 'undefined') delete globalThis.window
    else globalThis.window = originalWindow

    if (typeof originalLocalStorage === 'undefined') delete globalThis.localStorage
    else globalThis.localStorage = originalLocalStorage

    if (typeof originalCustomEvent === 'undefined') delete globalThis.CustomEvent
    else globalThis.CustomEvent = originalCustomEvent
  }
})

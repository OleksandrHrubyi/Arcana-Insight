import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule, installBrowserEnv } from './utils/testEnv.js'

test('normalizeOnboardingInterests filters invalid values and deduplicates', async () => {
  const { normalizeOnboardingInterests } = await importModule('src/helpers/onboardingPrefs.js')
  const result = normalizeOnboardingInterests(['sky', 'reflection', 'sky', '', null, 'unknown', 'readings'])
  assert.deepEqual(result, ['sky', 'reflection', 'readings'])
})

test('persistOnboardingPreferences stores normalized interests and completion flag', async () => {
  const env = installBrowserEnv()
  try {
    const {
      ONBOARDING_INTERESTS_KEY,
      ONBOARDING_COMPLETE_KEY,
      persistOnboardingPreferences,
      readOnboardingInterests,
      isOnboardingComplete,
    } = await importModule('src/helpers/onboardingPrefs.js')

    persistOnboardingPreferences(['reflection', 'reflection', 'sky', 'invalid'])

    assert.equal(env.localStorage.getItem(ONBOARDING_COMPLETE_KEY), 'true')
    assert.equal(env.localStorage.getItem(ONBOARDING_INTERESTS_KEY), JSON.stringify(['reflection', 'sky']))
    assert.deepEqual(readOnboardingInterests(), ['reflection', 'sky'])
    assert.equal(isOnboardingComplete(), true)
  } finally {
    env.restore()
  }
})

test('readOnboardingInterests returns empty array for malformed JSON', async () => {
  const env = installBrowserEnv({
    'arcana-onboarding-interests': '{broken-json',
  })
  try {
    const { readOnboardingInterests } = await importModule('src/helpers/onboardingPrefs.js')
    assert.deepEqual(readOnboardingInterests(), [])
  } finally {
    env.restore()
  }
})

test('isOnboardingComplete is false by default in browser env', async () => {
  const env = installBrowserEnv()
  try {
    const { isOnboardingComplete } = await importModule('src/helpers/onboardingPrefs.js')
    assert.equal(isOnboardingComplete(), false)
  } finally {
    env.restore()
  }
})

test('isOnboardingComplete returns true in non-browser environment', async () => {
  const originalWindow = globalThis.window
  const originalLocalStorage = globalThis.localStorage
  try {
    delete globalThis.window
    delete globalThis.localStorage
    const { isOnboardingComplete } = await importModule('src/helpers/onboardingPrefs.js')
    assert.equal(isOnboardingComplete(), true)
  } finally {
    if (typeof originalWindow === 'undefined') delete globalThis.window
    else globalThis.window = originalWindow
    if (typeof originalLocalStorage === 'undefined') delete globalThis.localStorage
    else globalThis.localStorage = originalLocalStorage
  }
})

test('onboarding prefs handle localStorage failures safely', async () => {
  const originalWindow = globalThis.window
  const originalLocalStorage = globalThis.localStorage
  try {
    const brokenStorage = {
      getItem() {
        throw new Error('boom')
      },
      setItem() {
        throw new Error('boom')
      },
    }
    const windowObj = {
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return true
      },
    }
    globalThis.window = windowObj
    globalThis.localStorage = brokenStorage

    const { readOnboardingInterests, isOnboardingComplete, persistOnboardingPreferences } =
      await importModule('src/helpers/onboardingPrefs.js')

    assert.deepEqual(readOnboardingInterests(), [])
    assert.equal(isOnboardingComplete(), false)
    assert.doesNotThrow(() => persistOnboardingPreferences(['sky', 'readings']))
  } finally {
    if (typeof originalWindow === 'undefined') delete globalThis.window
    else globalThis.window = originalWindow
    if (typeof originalLocalStorage === 'undefined') delete globalThis.localStorage
    else globalThis.localStorage = originalLocalStorage
  }
})

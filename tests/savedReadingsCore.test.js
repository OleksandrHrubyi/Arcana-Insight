import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

test('normalizeReadings returns [] for non-array payload', async () => {
  const { normalizeReadings } = await importModule('src/helpers/savedReadingsCore.js')
  assert.deepEqual(normalizeReadings(null), [])
  assert.deepEqual(normalizeReadings({}), [])
})

test('loadSavedReadingsSnapshot returns locked state when premium is disabled', async () => {
  const { loadSavedReadingsSnapshot } = await importModule('src/helpers/savedReadingsCore.js')
  const result = await loadSavedReadingsSnapshot({
    hasPremiumAccess: false,
    ensureTarotDataLoaded: async () => {},
    getUserNative: async () => ({ data: null }),
    selectTarotReadingsByUser: async () => ({ data: [] }),
  })

  assert.equal(result.status, 'locked')
  assert.equal(result.isLoggedIn, false)
  assert.equal(result.userId, '')
  assert.deepEqual(result.readings, [])
  assert.equal(result.error, null)
})

test('loadSavedReadingsSnapshot returns anonymous state when user is missing', async () => {
  const { loadSavedReadingsSnapshot } = await importModule('src/helpers/savedReadingsCore.js')
  let tarotLoadCalls = 0
  let listCalls = 0
  const result = await loadSavedReadingsSnapshot({
    hasPremiumAccess: true,
    ensureTarotDataLoaded: async () => {
      tarotLoadCalls += 1
    },
    getUserNative: async () => ({ data: null }),
    selectTarotReadingsByUser: async () => {
      listCalls += 1
      return { data: [] }
    },
  })

  assert.equal(result.status, 'anonymous')
  assert.equal(tarotLoadCalls, 1)
  assert.equal(listCalls, 0)
})

test('loadSavedReadingsSnapshot returns ready state with normalized readings', async () => {
  const { loadSavedReadingsSnapshot } = await importModule('src/helpers/savedReadingsCore.js')
  const result = await loadSavedReadingsSnapshot({
    hasPremiumAccess: true,
    ensureTarotDataLoaded: async () => {},
    getUserNative: async () => ({ data: { id: 'u-1' } }),
    selectTarotReadingsByUser: async () => ({ data: [{ id: 'r-1' }, { id: 'r-2' }], error: null }),
  })

  assert.equal(result.status, 'ready')
  assert.equal(result.isLoggedIn, true)
  assert.equal(result.userId, 'u-1')
  assert.deepEqual(result.readings, [{ id: 'r-1' }, { id: 'r-2' }])
  assert.equal(result.error, null)
})

test('loadSavedReadingsSnapshot returns error state for API error', async () => {
  const { loadSavedReadingsSnapshot } = await importModule('src/helpers/savedReadingsCore.js')
  const apiError = new Error('db down')
  const result = await loadSavedReadingsSnapshot({
    hasPremiumAccess: true,
    ensureTarotDataLoaded: async () => {},
    getUserNative: async () => ({ data: { id: 'u-1' } }),
    selectTarotReadingsByUser: async () => ({ data: null, error: apiError }),
  })

  assert.equal(result.status, 'error')
  assert.equal(result.isLoggedIn, true)
  assert.equal(result.userId, 'u-1')
  assert.deepEqual(result.readings, [])
  assert.equal(result.error, apiError)
})

test('loadSavedReadingsSnapshot returns error state when loader throws', async () => {
  const { loadSavedReadingsSnapshot } = await importModule('src/helpers/savedReadingsCore.js')
  const thrown = new Error('panic')
  const result = await loadSavedReadingsSnapshot({
    hasPremiumAccess: true,
    ensureTarotDataLoaded: async () => {
      throw thrown
    },
    getUserNative: async () => ({ data: { id: 'u-1' } }),
    selectTarotReadingsByUser: async () => ({ data: [] }),
  })

  assert.equal(result.status, 'error')
  assert.equal(result.isLoggedIn, false)
  assert.equal(result.userId, '')
  assert.deepEqual(result.readings, [])
  assert.equal(result.error, thrown)
})

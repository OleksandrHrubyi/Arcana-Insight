import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

test('normalizeDailyCards returns [] for invalid payloads', async () => {
  const { normalizeDailyCards } = await importModule('src/helpers/dailyCardCore.js')
  assert.deepEqual(normalizeDailyCards(null), [])
  assert.deepEqual(normalizeDailyCards({ cards: null }), [])
  assert.deepEqual(normalizeDailyCards({}), [])
})

test('normalizeDailyCards returns cards array from payload', async () => {
  const { normalizeDailyCards } = await importModule('src/helpers/dailyCardCore.js')
  const cards = [{ id: 'a' }, { id: 'b' }]
  assert.equal(normalizeDailyCards({ cards }), cards)
})

test('loadDailyCardsSnapshot returns cards on success', async () => {
  const { loadDailyCardsSnapshot } = await importModule('src/helpers/dailyCardCore.js')
  const result = await loadDailyCardsSnapshot({
    loadTarotData: async () => ({ cards: [{ id: 1 }] }),
  })
  assert.deepEqual(result.cards, [{ id: 1 }])
  assert.equal(result.error, null)
})

test('loadDailyCardsSnapshot swallows loader errors and returns empty cards', async () => {
  const { loadDailyCardsSnapshot } = await importModule('src/helpers/dailyCardCore.js')
  const boom = new Error('boom')
  const result = await loadDailyCardsSnapshot({
    loadTarotData: async () => {
      throw boom
    },
  })
  assert.deepEqual(result.cards, [])
  assert.equal(result.error, boom)
})

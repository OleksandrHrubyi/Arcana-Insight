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

test('getDeterministicDailyCardSelection is stable for the same day and identity', async () => {
  const { getDeterministicDailyCardSelection } = await importModule('src/helpers/dailyCardCore.js')

  const first = getDeterministicDailyCardSelection({
    dateKey: '2026-04-21',
    identity: 'user-123',
    cardsLength: 78,
  })
  const second = getDeterministicDailyCardSelection({
    dateKey: '2026-04-21',
    identity: 'user-123',
    cardsLength: 78,
  })

  assert.deepEqual(second, first)
  assert.equal(Number.isInteger(first.index), true)
  assert.equal(first.index >= 0 && first.index < 78, true)
  assert.equal(['upright', 'reversed'].includes(first.orientation), true)
})

test('getDeterministicDailyCardSelection produces a healthier 60-day spread', async () => {
  const { getDeterministicDailyCardSelection } = await importModule('src/helpers/dailyCardCore.js')

  const identity = '550e8400-e29b-41d4-a716-446655440000'
  const seen = new Set()
  let adjacentRepeats = 0
  let previousIndex = -1

  for (let day = 0; day < 60; day += 1) {
    const date = new Date(Date.UTC(2026, 0, 1 + day)).toISOString().slice(0, 10)
    const selection = getDeterministicDailyCardSelection({
      dateKey: date,
      identity,
      cardsLength: 78,
    })

    seen.add(selection.index)
    if (selection.index === previousIndex) adjacentRepeats += 1
    previousIndex = selection.index
  }

  assert.equal(seen.size >= 38, true)
  assert.equal(adjacentRepeats <= 1, true)
})

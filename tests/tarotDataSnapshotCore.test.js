import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

test('normalizeTarotCards returns [] for invalid payload', async () => {
  const { normalizeTarotCards } = await importModule('src/helpers/tarotDataSnapshotCore.js')
  assert.deepEqual(normalizeTarotCards(null), [])
  assert.deepEqual(normalizeTarotCards({}), [])
  assert.deepEqual(normalizeTarotCards({ cards: 'bad' }), [])
})

test('loadTarotCardsSnapshot returns cards on success and empty on error', async () => {
  const { loadTarotCardsSnapshot } = await importModule('src/helpers/tarotDataSnapshotCore.js')

  const success = await loadTarotCardsSnapshot({
    loadTarotData: async () => ({ cards: [{ id: 'sun' }] }),
  })
  assert.deepEqual(success.cards, [{ id: 'sun' }])
  assert.equal(success.error, null)

  const failError = new Error('load failed')
  const failed = await loadTarotCardsSnapshot({
    loadTarotData: async () => {
      throw failError
    },
  })
  assert.deepEqual(failed.cards, [])
  assert.equal(failed.error, failError)
})

test('findTarotCardById selects card by normalized id', async () => {
  const { findTarotCardById } = await importModule('src/helpers/tarotDataSnapshotCore.js')

  const cards = [{ id: 'fool', n: 0 }, { id: 'sun', n: 19 }]
  assert.deepEqual(findTarotCardById(cards, 'sun'), { id: 'sun', n: 19 })
  assert.equal(findTarotCardById(cards, ''), null)
  assert.equal(findTarotCardById(cards, 'moon'), null)
  assert.equal(findTarotCardById(null, 'sun'), null)
})

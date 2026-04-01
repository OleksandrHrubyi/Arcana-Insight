import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

test('requestTarotReading returns null when feature is disabled', async () => {
  const { requestTarotReading } = await importModule('src/services/tarotOracleCore.js')
  let called = false
  const result = await requestTarotReading({
    enabled: false,
    payload: { q: 'test' },
    invokeFunction: async () => {
      called = true
      return { data: null, error: null }
    },
  })

  assert.equal(result, null)
  assert.equal(called, false)
})

test('requestTarotReading calls backend function and returns data', async () => {
  const { requestTarotReading } = await importModule('src/services/tarotOracleCore.js')
  const calls = []
  const payload = {
    summaryTitle: 'Reading',
    opening: 'Opening',
    summary: 'Summary',
    advice: 'Advice',
    cards: [{ position: 'present', positionLabel: 'Present', cardTitle: 'The Sun', message: 'm', detail: 'd', question: 'q' }],
    meta: { provider: 'openai' },
  }
  const result = await requestTarotReading({
    enabled: true,
    payload: { q: 'love', spread: 3 },
    invokeFunction: async (...args) => {
      calls.push(args)
      return { data: payload, error: null }
    },
  })

  assert.deepEqual(result, payload)
  assert.deepEqual(calls[0], ['tarot-reading', { q: 'love', spread: 3 }, 15000])
})

test('requestTarotReading throws when backend returns non-AI payload without provider metadata', async () => {
  const { requestTarotReading } = await importModule('src/services/tarotOracleCore.js')

  await assert.rejects(
    requestTarotReading({
      enabled: true,
      payload: { q: 'career' },
      invokeFunction: async () => ({
        data: {
          summaryTitle: 'Fallback',
          opening: '...',
          summary: '...',
          advice: '...',
          cards: [{ position: 'present', positionLabel: 'Present', cardTitle: 'Card', message: 'm', detail: 'd', question: 'q' }],
        },
        error: null,
      }),
    }),
    /AI interpretation unavailable/,
  )
})

test('requestTarotReading throws when backend returns error', async () => {
  const { requestTarotReading } = await importModule('src/services/tarotOracleCore.js')

  await assert.rejects(
    requestTarotReading({
      enabled: true,
      payload: { q: 'career' },
      invokeFunction: async () => ({ data: null, error: new Error('failed') }),
    }),
    /failed/,
  )
})

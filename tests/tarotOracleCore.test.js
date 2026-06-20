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
  assert.deepEqual(calls[0], ['tarot-reading', { q: 'love', spread: 3 }, 65000])
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

test('requestTarotClarify returns null when feature is disabled', async () => {
  const { requestTarotClarify } = await importModule('src/services/tarotOracleCore.js')
  let called = false
  const result = await requestTarotClarify({
    enabled: false,
    payload: { theme: 'work' },
    invokeFunction: async () => {
      called = true
      return { data: null, error: null }
    },
  })

  assert.equal(result, null)
  assert.equal(called, false)
})

test('requestTarotClarify sends clarify mode and normalizes question + options', async () => {
  const { requestTarotClarify } = await importModule('src/services/tarotOracleCore.js')
  const calls = []
  const result = await requestTarotClarify({
    enabled: true,
    payload: { theme: 'work', question: 'Should I switch jobs?' },
    invokeFunction: async (...args) => {
      calls.push(args)
      return {
        data: { question: '  Is this about the role or the people?  ', options: [' The role ', '', 'The people', 'extra', 'too many'] },
        error: null,
      }
    },
  })

  assert.equal(calls[0][0], 'tarot-reading')
  assert.equal(calls[0][1].mode, 'clarify')
  assert.equal(calls[0][1].theme, 'work')
  assert.equal(result.question, 'Is this about the role or the people?')
  assert.deepEqual(result.options, ['The role', 'The people', 'extra'])
})

test('requestTarotClarify throws when no question comes back (caller falls back to spread)', async () => {
  const { requestTarotClarify } = await importModule('src/services/tarotOracleCore.js')

  await assert.rejects(
    requestTarotClarify({
      enabled: true,
      payload: { theme: 'self' },
      invokeFunction: async () => ({ data: { question: '   ', options: [] }, error: null }),
    }),
    /clarify unavailable/,
  )
})

test('requestTarotClarify throws when backend returns error', async () => {
  const { requestTarotClarify } = await importModule('src/services/tarotOracleCore.js')

  await assert.rejects(
    requestTarotClarify({
      enabled: true,
      payload: { theme: 'self' },
      invokeFunction: async () => ({ data: null, error: new Error('boom') }),
    }),
    /boom/,
  )
})

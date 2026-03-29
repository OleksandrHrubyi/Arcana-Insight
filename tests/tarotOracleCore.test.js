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
  const result = await requestTarotReading({
    enabled: true,
    payload: { q: 'love', spread: 3 },
    invokeFunction: async (...args) => {
      calls.push(args)
      return { data: { answer: 'ok' }, error: null }
    },
  })

  assert.deepEqual(result, { answer: 'ok' })
  assert.deepEqual(calls[0], ['tarot-reading', { q: 'love', spread: 3 }, 15000])
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

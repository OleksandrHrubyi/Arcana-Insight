import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

test('analytics stable-module coverage hits timeout, init, logging and helper branches', async () => {
  const { analytics } = await importModule('src/services/analytics.js')
  const originalConsoleLog = console.log
  const originalConsoleError = console.error

  try {
    console.log = () => {}
    console.error = () => {}

    analytics.timeoutMs = 0
    assert.equal(await analytics.withTimeout(Promise.resolve('ok'), 'no-timeout'), 'ok')

    analytics.timeoutMs = 20
    await assert.rejects(
      analytics.withTimeout(new Promise(() => {}), 'slow-op'),
      /Timeout: slow-op/,
    )

    analytics.isNative = false
    analytics.isAvailable = false
    analytics.initialized = false
    await assert.doesNotReject(() => analytics.init())
    await assert.doesNotReject(() => analytics.logEvent('skip_event', {}))

    analytics.isNative = true
    analytics.isAvailable = true
    analytics.initialized = false
    await assert.doesNotReject(() => analytics.init())
    assert.equal(analytics.initialized, false)

    analytics.initialized = true
    await assert.doesNotReject(() => analytics.logEvent('event_x', { a: 1 }))
    await assert.doesNotReject(() => analytics.setUserId('user_1'))
    await assert.doesNotReject(() => analytics.setUserProperty('plan', 'monthly'))
    await assert.doesNotReject(() => analytics.logScreenView('Home', undefined))

    await assert.doesNotReject(() => analytics.logLogin('apple'))
    await assert.doesNotReject(() => analytics.logSignUp('email'))
    await assert.doesNotReject(() => analytics.logShare('reading', 'r1'))
    await assert.doesNotReject(() => analytics.logSearch('love'))
    await assert.doesNotReject(() => analytics.logSelectContent('card', 'moon'))
  } finally {
    console.log = originalConsoleLog
    console.error = originalConsoleError
  }
})

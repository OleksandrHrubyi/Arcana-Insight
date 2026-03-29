import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

const loadAnalytics = async () => {
  const { analytics } = await importModule('src/services/analytics.js')
  analytics.isNative = false
  analytics.isAvailable = true
  analytics.initialized = false
  analytics.timeoutMs = 1500
  return analytics
}

test('analytics service handles timeout and safely no-ops when unavailable', async () => {
  const analytics = await loadAnalytics()

  analytics.timeoutMs = 20
  assert.equal(await analytics.withTimeout(Promise.resolve('ok'), 'resolve'), 'ok')
  await assert.rejects(
    analytics.withTimeout(new Promise(() => {}), 'slow-op'),
    /Timeout: slow-op/,
  )

  analytics.isNative = false
  analytics.isAvailable = true
  analytics.initialized = false

  await assert.doesNotReject(() => analytics.init())
  await assert.doesNotReject(() => analytics.logEvent('paywall_view', { source: 'test' }))
  await assert.doesNotReject(() => analytics.setUserId('u1'))
  await assert.doesNotReject(() => analytics.setUserProperty('plan', 'yearly'))
  await assert.doesNotReject(() => analytics.logScreenView('premium', 'PremiumPage'))
})

test('analytics predefined helpers delegate to logEvent', async () => {
  const analytics = await loadAnalytics()
  const calls = []
  const originalLogEvent = analytics.logEvent

  try {
    analytics.logEvent = async (...args) => {
      calls.push(args)
    }

    await analytics.logLogin('apple')
    await analytics.logSignUp('email')
    await analytics.logShare('reading', 'abc')
    await analytics.logSearch('love')
    await analytics.logSelectContent('card', 'moon')

    assert.deepEqual(calls, [
      ['login', { method: 'apple' }],
      ['sign_up', { method: 'email' }],
      ['share', { content_type: 'reading', item_id: 'abc' }],
      ['search', { search_term: 'love' }],
      ['select_content', { content_type: 'card', item_id: 'moon' }],
    ])
  } finally {
    analytics.logEvent = originalLogEvent
  }
})

test('analytics swallows provider errors in native mode', async () => {
  const analytics = await loadAnalytics()
  const originalConsoleError = console.error

  try {
    console.error = () => {}

    analytics.isNative = true
    analytics.isAvailable = true
    analytics.initialized = false
    analytics.timeoutMs = 20

    await assert.doesNotReject(() => analytics.init())
    assert.equal(analytics.initialized, false)

    analytics.initialized = true
    await assert.doesNotReject(() => analytics.logEvent('x'))
    await assert.doesNotReject(() => analytics.setUserId('u1'))
    await assert.doesNotReject(() => analytics.setUserProperty('tier', 'pro'))
    await assert.doesNotReject(() => analytics.logScreenView('screen-a', 'screen-b'))
  } finally {
    console.error = originalConsoleError
  }
})

test('analytics skips logEvent when service is native/available but not initialized yet', async () => {
  const analytics = await loadAnalytics()
  analytics.isNative = true
  analytics.isAvailable = true
  analytics.initialized = false
  analytics.timeoutMs = 50

  await analytics.logEvent('paywall_view', { source: 'test' })
  await analytics.setUserId('u1')
  await analytics.setUserProperty('plan', 'yearly')
  await analytics.logScreenView('premium', 'PremiumPage')

  assert.equal(analytics.initialized, false)
})

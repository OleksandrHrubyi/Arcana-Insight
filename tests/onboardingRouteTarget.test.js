import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

test('resolveOnboardingRouteTarget returns push navigation for allowlisted from path', async () => {
  const { resolveOnboardingRouteTarget } = await importModule('src/helpers/onboardingRouteTarget.js')

  const result = resolveOnboardingRouteTarget('/tarot?focus=love#start')

  assert.deepEqual(result, {
    target: '/tarot?focus=love#start',
    navigationMode: 'push',
    hadValidFrom: true,
    resolvedTarget: '/tarot?focus=love#start',
  })
})

test('resolveOnboardingRouteTarget accepts array-like from query values', async () => {
  const { resolveOnboardingRouteTarget } = await importModule('src/helpers/onboardingRouteTarget.js')

  const result = resolveOnboardingRouteTarget(['/daily?source=ritual'])

  assert.deepEqual(result, {
    target: '/daily?source=ritual',
    navigationMode: 'push',
    hadValidFrom: true,
    resolvedTarget: '/daily?source=ritual',
  })
})

test('resolveOnboardingRouteTarget falls back to home replace for blocked or unknown routes', async () => {
  const { resolveOnboardingRouteTarget } = await importModule('src/helpers/onboardingRouteTarget.js')

  const blocked = resolveOnboardingRouteTarget('/premium')
  const unknown = resolveOnboardingRouteTarget('/some-random-screen')

  assert.deepEqual(blocked, {
    target: { name: 'arcana' },
    navigationMode: 'replace',
    hadValidFrom: false,
    resolvedTarget: '/',
  })
  assert.deepEqual(unknown, {
    target: { name: 'arcana' },
    navigationMode: 'replace',
    hadValidFrom: false,
    resolvedTarget: '/',
  })
})

test('resolveOnboardingRouteTarget rejects external and malformed from values', async () => {
  const { resolveOnboardingRouteTarget } = await importModule('src/helpers/onboardingRouteTarget.js')

  const external = resolveOnboardingRouteTarget('https://example.com/menu')
  const malformed = resolveOnboardingRouteTarget('//example.com/menu')

  assert.equal(external.navigationMode, 'replace')
  assert.equal(external.resolvedTarget, '/')
  assert.equal(malformed.navigationMode, 'replace')
  assert.equal(malformed.resolvedTarget, '/')
})

test('onboarding route whitelist exports strict first-run allowlist', async () => {
  const { onboardingRouteWhitelist } = await importModule('src/helpers/onboardingRouteTarget.js')

  assert.deepEqual(onboardingRouteWhitelist.allowed, ['/', '/menu', '/horoscope', '/tarot', '/daily'])
  assert.ok(onboardingRouteWhitelist.blocked.includes('/premium'))
  assert.ok(onboardingRouteWhitelist.blocked.includes('/settings'))
  assert.ok(onboardingRouteWhitelist.blocked.includes('/account'))
})

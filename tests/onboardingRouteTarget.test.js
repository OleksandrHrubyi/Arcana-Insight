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

test('resolveOnboardingRouteTarget falls back to the first-run journal for blocked or unknown routes', async () => {
  const { resolveOnboardingRouteTarget } = await importModule('src/helpers/onboardingRouteTarget.js')

  const blocked = resolveOnboardingRouteTarget('/premium')
  const unknown = resolveOnboardingRouteTarget('/some-random-screen')

  // RP-04: a true first run opens the reflection journal, not Home — the first
  // minute in the app is the daily ritual (repositioned identity).
  const firstRun = {
    target: { name: 'journal', query: { source: 'onboarding', entry: 'first_run' } },
    navigationMode: 'replace',
    hadValidFrom: false,
    resolvedTarget: '/journal',
  }
  assert.deepEqual(blocked, firstRun)
  assert.deepEqual(unknown, firstRun)
})

test('resolveOnboardingRouteTarget rejects external and malformed from values', async () => {
  const { resolveOnboardingRouteTarget } = await importModule('src/helpers/onboardingRouteTarget.js')

  const external = resolveOnboardingRouteTarget('https://example.com/menu')
  const malformed = resolveOnboardingRouteTarget('//example.com/menu')

  assert.equal(external.navigationMode, 'replace')
  assert.equal(external.resolvedTarget, '/journal')
  assert.equal(malformed.navigationMode, 'replace')
  assert.equal(malformed.resolvedTarget, '/journal')
})

test('onboarding route whitelist exports first-run allowlist', async () => {
  const { onboardingRouteWhitelist } = await importModule('src/helpers/onboardingRouteTarget.js')

  // N2: self-sufficient content screens are preserved through the onboarding gate;
  // gated/stateful/auth screens stay blocked. '/' is intentionally absent — a
  // plain launch (guard stamps from=/) is the first-run case → journal (RP-04).
  assert.deepEqual(onboardingRouteWhitelist.allowed, [
    '/menu',
    '/horoscope',
    '/tarot',
    '/daily',
    '/compatibility',
    '/cards',
    '/zodiac-guide',
  ])
  assert.ok(onboardingRouteWhitelist.blocked.includes('/premium'))
  assert.ok(onboardingRouteWhitelist.blocked.includes('/settings'))
  assert.ok(onboardingRouteWhitelist.blocked.includes('/account'))
  assert.ok(onboardingRouteWhitelist.blocked.includes('/tarot-interpretation'))
})

test('resolveOnboardingRouteTarget preserves a self-sufficient content deep-link (N2)', async () => {
  const { resolveOnboardingRouteTarget } = await importModule('src/helpers/onboardingRouteTarget.js')

  const deep = resolveOnboardingRouteTarget('/compatibility')
  assert.equal(deep.navigationMode, 'push')
  assert.equal(deep.hadValidFrom, true)
  assert.equal(deep.resolvedTarget, '/compatibility')
})

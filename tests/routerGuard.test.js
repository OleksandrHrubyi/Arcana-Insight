import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

const baseRoute = (overrides = {}) => ({
  name: 'tarot',
  fullPath: '/tarot',
  meta: {},
  ...overrides,
})

test('router guard redirects to onboarding when onboarding is incomplete', async () => {
  const { resolveRouteGuardDecision } = await importModule('src/router/guard.js')

  const result = resolveRouteGuardDecision({
    to: baseRoute(),
    onboardingComplete: false,
    hasUser: false,
  })

  assert.deepEqual(result, {
    name: 'onboarding',
    query: { from: '/tarot' },
  })
})

test('router guard allows routes explicitly available without onboarding', async () => {
  const { resolveRouteGuardDecision } = await importModule('src/router/guard.js')

  const result = resolveRouteGuardDecision({
    to: baseRoute({
      name: 'login',
      fullPath: '/login',
      meta: { allowWithoutOnboarding: true },
    }),
    onboardingComplete: false,
    hasUser: false,
  })

  assert.equal(result, true)
})

test('router guard does not redirect onboarding route to itself', async () => {
  const { resolveRouteGuardDecision } = await importModule('src/router/guard.js')

  const result = resolveRouteGuardDecision({
    to: baseRoute({ name: 'onboarding', fullPath: '/onboarding' }),
    onboardingComplete: false,
    hasUser: false,
  })

  assert.equal(result, true)
})

test('router guard redirects requiresAuth routes to login when user is missing', async () => {
  const { resolveRouteGuardDecision } = await importModule('src/router/guard.js')

  const result = resolveRouteGuardDecision({
    to: baseRoute({
      name: 'account',
      fullPath: '/account',
      meta: { requiresAuth: true },
    }),
    onboardingComplete: true,
    hasUser: false,
  })

  assert.deepEqual(result, { name: 'login' })
})

test('router guard allows requiresAuth routes for authenticated users', async () => {
  const { resolveRouteGuardDecision } = await importModule('src/router/guard.js')

  const result = resolveRouteGuardDecision({
    to: baseRoute({
      name: 'account',
      fullPath: '/account',
      meta: { requiresAuth: true },
    }),
    onboardingComplete: true,
    hasUser: true,
  })

  assert.equal(result, true)
})

test('router guard prioritizes onboarding redirect over auth redirect', async () => {
  const { resolveRouteGuardDecision } = await importModule('src/router/guard.js')

  const result = resolveRouteGuardDecision({
    to: baseRoute({
      name: 'account',
      fullPath: '/account',
      meta: { requiresAuth: true },
    }),
    onboardingComplete: false,
    hasUser: false,
  })

  assert.deepEqual(result, {
    name: 'onboarding',
    query: { from: '/account' },
  })
})

test('dev home qa bypass activates only for qa=home searches', async () => {
  const { isDevHomeQaBypassActive } = await importModule('src/router/guard.js')

  assert.equal(isDevHomeQaBypassActive({ isDev: true, search: '?qa=home&view=revealed' }), true)
  assert.equal(isDevHomeQaBypassActive({ isDev: true, search: '?qa=other' }), false)
  assert.equal(isDevHomeQaBypassActive({ isDev: false, search: '?qa=home' }), false)
})

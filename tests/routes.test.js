import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

const findChildRoute = (children, name) => children.find((route) => route.name === name)

test('routes expose root layout with expected core children and catch-all', async () => {
  const { default: routes } = await importModule('src/router/routes.js')
  assert.ok(Array.isArray(routes))
  assert.equal(routes.length, 2)

  const root = routes.find((route) => route.path === '/')
  assert.ok(root)
  assert.ok(Array.isArray(root.children))

  const onboarding = findChildRoute(root.children, 'onboarding')
  assert.equal(onboarding.path, 'onboarding')
  assert.equal(onboarding.meta.hideBottomNav, true)
  assert.equal(onboarding.meta.allowWithoutOnboarding, true)

  const tarot = findChildRoute(root.children, 'tarot')
  assert.equal(tarot.path, 'tarot')
  assert.equal(tarot.meta.tab, 'tarot')
  assert.equal(tarot.meta.hideBottomNav, true)

  const premium = findChildRoute(root.children, 'premium')
  assert.equal(premium.path, 'premium')
  assert.equal(premium.meta.tab, 'menu')
  assert.equal(premium.meta.hideBottomNav, true)

  const catchAll = routes.find((route) => route.path === '/:catchAll(.*)*')
  assert.ok(catchAll)
})

test('named routes are unique', async () => {
  const { default: routes } = await importModule('src/router/routes.js')
  const root = routes.find((route) => route.path === '/')
  const names = root.children
    .map((route) => route.name)
    .filter(Boolean)

  const uniqueCount = new Set(names).size
  assert.equal(uniqueCount, names.length)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

test('buildOnboardingExitContext creates push payload for valid from target', async () => {
  const { buildOnboardingExitContext } = await importModule('src/helpers/onboardingFlow.js')

  const result = buildOnboardingExitContext({
    rawFrom: '/horoscope?source=guard',
    selectedCount: 3,
  })

  assert.equal(result.navigationMode, 'push')
  assert.equal(result.hadValidFrom, true)
  assert.equal(result.resolvedTarget, '/horoscope?source=guard')
  assert.deepEqual(result.payload, {
    resolved_target: '/horoscope?source=guard',
    navigation_mode: 'push',
    had_valid_from: true,
    selected_count: 3,
  })
})

test('buildOnboardingExitContext creates replace payload for the first-run journal fallback', async () => {
  const { buildOnboardingExitContext } = await importModule('src/helpers/onboardingFlow.js')

  const result = buildOnboardingExitContext({
    rawFrom: '/premium?source=guard',
    selectedCount: -4,
  })

  assert.equal(result.navigationMode, 'replace')
  assert.equal(result.hadValidFrom, false)
  // RP-04: first run lands on the reflection journal, not Home.
  assert.deepEqual(result.target, {
    name: 'journal',
    query: { source: 'onboarding', entry: 'first_run' },
  })
  assert.deepEqual(result.payload, {
    resolved_target: '/journal',
    navigation_mode: 'replace',
    had_valid_from: false,
    selected_count: 0,
  })
})

test('buildInterestSelectPayload normalizes action and selected count', async () => {
  const { buildInterestSelectPayload } = await importModule('src/helpers/onboardingFlow.js')

  const selectPayload = buildInterestSelectPayload({
    interestKey: 'love',
    action: 'select',
    selectedCount: 2,
  })
  const deselectPayload = buildInterestSelectPayload({
    interestKey: 'career',
    action: 'deselect',
    selectedCount: 'not-a-number',
  })

  assert.deepEqual(selectPayload, {
    interest_key: 'love',
    action: 'select',
    selected_count: 2,
  })
  assert.deepEqual(deselectPayload, {
    interest_key: 'career',
    action: 'deselect',
    selected_count: 0,
  })
})

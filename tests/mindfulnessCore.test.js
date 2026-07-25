import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule, installBrowserEnv } from './utils/testEnv.js'

const core = await importModule('src/helpers/mindfulnessCore.js')
const {
  MINDFUL_SYNC_STORAGE_KEY,
  isMindfulSyncEnabled,
  setMindfulSyncEnabled,
  clampMindfulDuration,
} = core

test('mindful sync flag defaults to OFF and round-trips', () => {
  const env = installBrowserEnv()
  try {
    assert.equal(isMindfulSyncEnabled(), false, 'Health access must be opt-in')
    setMindfulSyncEnabled(true)
    assert.equal(env.localStorage.getItem(MINDFUL_SYNC_STORAGE_KEY), 'true')
    assert.equal(isMindfulSyncEnabled(), true)
    setMindfulSyncEnabled(false)
    assert.equal(isMindfulSyncEnabled(), false)
  } finally {
    env.restore()
  }
})

test('mindful flag helpers are safe without window', () => {
  assert.equal(isMindfulSyncEnabled(), false)
  assert.doesNotThrow(() => setMindfulSyncEnabled(true))
})

test('breath-done flag is per-day and safe without window', () => {
  const env = installBrowserEnv()
  try {
    const { isBreathDoneOn, markBreathDoneOn } = core
    assert.equal(isBreathDoneOn('2026-07-26'), false)
    markBreathDoneOn('2026-07-26')
    assert.equal(isBreathDoneOn('2026-07-26'), true)
    // A new day resets the offer.
    assert.equal(isBreathDoneOn('2026-07-27'), false)
  } finally {
    env.restore()
  }
  assert.equal(core.isBreathDoneOn('2026-07-26'), false)
  assert.doesNotThrow(() => core.markBreathDoneOn('2026-07-26'))
  assert.equal(core.BREATH_DURATION_SECONDS, 30)
})

test('clampMindfulDuration bounds and defaults', () => {
  assert.equal(clampMindfulDuration(60), 60)
  assert.equal(clampMindfulDuration(5), 30)
  assert.equal(clampMindfulDuration(10000), 600)
  assert.equal(clampMindfulDuration('garbage'), 60)
  assert.equal(clampMindfulDuration(undefined), 60)
})

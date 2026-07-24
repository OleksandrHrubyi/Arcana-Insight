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

test('clampMindfulDuration bounds and defaults', () => {
  assert.equal(clampMindfulDuration(60), 60)
  assert.equal(clampMindfulDuration(5), 30)
  assert.equal(clampMindfulDuration(10000), 600)
  assert.equal(clampMindfulDuration('garbage'), 60)
  assert.equal(clampMindfulDuration(undefined), 60)
})

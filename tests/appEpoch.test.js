import test from 'node:test'
import assert from 'node:assert/strict'
import { importFresh } from './utils/testEnv.js'

test('appEpoch store exposes consistent shared state and lifecycle markers', async () => {
  const { useAppEpoch } = await importFresh('src/stores/appEpoch.js')
  const first = useAppEpoch()
  const second = useAppEpoch()
  const originalNow = Date.now

  try {
    assert.equal(first.appEpoch.value, 0)
    first.bump()
    first.bump()
    assert.equal(first.appEpoch.value, 2)
    assert.equal(second.appEpoch.value, 2)

    Date.now = () => 1234567890
    first.markBackground()
    assert.equal(first.lastBackgroundAt.value, 1234567890)
    assert.equal(second.lastBackgroundAt.value, 1234567890)

    assert.equal(first.hadAuthTimeout.value, false)
    first.markAuthTimeout()
    assert.equal(first.hadAuthTimeout.value, true)
    assert.equal(second.hadAuthTimeout.value, true)
    first.clearAuthTimeout()
    assert.equal(first.hadAuthTimeout.value, false)
    assert.equal(second.hadAuthTimeout.value, false)
  } finally {
    Date.now = originalNow
  }
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { importFresh } from './utils/testEnv.js'

test('netStatus defaults to ready=true and can be toggled', async () => {
  const { useNetStatus } = await importFresh('src/stores/netStatus.js')
  const store = useNetStatus()

  assert.equal(store.netReady.value, true)
  store.setReady(false)
  assert.equal(store.netReady.value, false)
  store.setReady(true)
  assert.equal(store.netReady.value, true)
})

test('netStatus state is shared between consumers', async () => {
  const { useNetStatus } = await importFresh('src/stores/netStatus.js')
  const first = useNetStatus()
  const second = useNetStatus()

  first.setReady(false)
  assert.equal(second.netReady.value, false)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule, installBrowserEnv } from './utils/testEnv.js'

const STORAGE_KEY = 'CapacitorStorage.horoscopes_v1'

test('saveLocal persists payload via Capacitor web preferences adapter', async () => {
  const env = installBrowserEnv()
  try {
    const { saveLocal } = await importModule('src/helpers/localStorageSaver.js')
    const payload = { today: 'aries', score: 7 }

    await saveLocal(payload)
    assert.equal(env.localStorage.getItem(STORAGE_KEY), JSON.stringify(payload))
  } finally {
    env.restore()
  }
})

test('loadLocal returns parsed value and handles empty/malformed payloads', async () => {
  const env = installBrowserEnv()
  try {
    const { loadLocal } = await importModule('src/helpers/localStorageSaver.js')

    env.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ok: true, count: 2 }))
    assert.deepEqual(await loadLocal(), { ok: true, count: 2 })

    env.localStorage.removeItem(STORAGE_KEY)
    assert.equal(await loadLocal(), null)

    env.localStorage.setItem(STORAGE_KEY, '{broken-json')
    assert.equal(await loadLocal(), null)
  } finally {
    env.restore()
  }
})

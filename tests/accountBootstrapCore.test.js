import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

test('resolveAccountBootstrapUser returns initial user without sync call', async () => {
  const { resolveAccountBootstrapUser } = await importModule('src/helpers/accountBootstrapCore.js')
  let syncCalls = 0
  const initialUser = { id: 'u-1' }
  const result = await resolveAccountBootstrapUser({
    initialUser,
    syncSession: async () => {
      syncCalls += 1
    },
    getCurrentUser: () => ({ id: 'u-2' }),
  })

  assert.equal(syncCalls, 0)
  assert.equal(result.error, null)
  assert.equal(result.user, initialUser)
})

test('resolveAccountBootstrapUser syncs and returns fresh user when initial is missing', async () => {
  const { resolveAccountBootstrapUser } = await importModule('src/helpers/accountBootstrapCore.js')
  let syncCalls = 0
  const result = await resolveAccountBootstrapUser({
    initialUser: null,
    syncSession: async (payload) => {
      syncCalls += 1
      assert.deepEqual(payload, { refresh: false })
    },
    getCurrentUser: () => ({ id: 'u-9' }),
  })

  assert.equal(syncCalls, 1)
  assert.equal(result.error, null)
  assert.deepEqual(result.user, { id: 'u-9' })
})

test('resolveAccountBootstrapUser returns error when sync fails', async () => {
  const { resolveAccountBootstrapUser } = await importModule('src/helpers/accountBootstrapCore.js')
  const syncError = new Error('offline')
  const result = await resolveAccountBootstrapUser({
    initialUser: null,
    syncSession: async () => {
      throw syncError
    },
    getCurrentUser: () => null,
  })

  assert.equal(result.user, null)
  assert.equal(result.error, syncError)
})

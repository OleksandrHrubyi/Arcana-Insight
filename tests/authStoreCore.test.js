import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

const createPreferencesMock = (seed = {}) => {
  const map = new Map(Object.entries(seed))
  return {
    async get({ key }) {
      return { value: map.has(key) ? map.get(key) : null }
    },
    async set({ key, value }) {
      map.set(key, value)
    },
    async remove({ key }) {
      map.delete(key)
    },
    __read(key) {
      return map.has(key) ? map.get(key) : null
    },
  }
}

const nextTick = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

const createDeps = ({
  sessionUser = null,
  refreshSessionResult = null,
  storedSession = null,
  selectProfile = null,
  refreshNativeResult = { data: null, error: null },
  preferencesSeed = {},
  onGetSession,
  onRefreshSession,
  onReadStoredSession,
  onSelectProfile,
  onUpsert,
  onRefreshNative,
} = {}) => {
  const preferences = createPreferencesMock(preferencesSeed)
  const listeners = []
  const calls = {
    withAuthLock: 0,
    getSession: 0,
    refreshSession: 0,
    readStoredSession: 0,
    selectAppUser: 0,
    upsertAppUser: 0,
    refreshAccessTokenNative: 0,
    onAuthStateChange: 0,
  }
  const upsertPayloads = []

  const deps = {
    supabase: {
      auth: {
        async getSession() {
          calls.getSession += 1
          if (typeof onGetSession === 'function') return onGetSession()
          return { data: { session: sessionUser ? { user: sessionUser } : null } }
        },
        async refreshSession() {
          calls.refreshSession += 1
          if (typeof onRefreshSession === 'function') return onRefreshSession()
          if (refreshSessionResult) return refreshSessionResult
          return { data: { session: null }, error: null }
        },
        onAuthStateChange(callback) {
          calls.onAuthStateChange += 1
          listeners.push(callback)
          return { data: { subscription: { unsubscribe() {} } } }
        },
      },
    },
    async withAuthLock(fn) {
      calls.withAuthLock += 1
      return fn()
    },
    async readStoredSession() {
      calls.readStoredSession += 1
      if (typeof onReadStoredSession === 'function') return onReadStoredSession()
      return storedSession
    },
    async upsertAppUser(payload) {
      calls.upsertAppUser += 1
      upsertPayloads.push(payload)
      if (typeof onUpsert === 'function') return onUpsert(payload)
      return { data: null, error: null }
    },
    async refreshAccessTokenNative() {
      calls.refreshAccessTokenNative += 1
      if (typeof onRefreshNative === 'function') return onRefreshNative()
      return refreshNativeResult
    },
    async selectAppUser() {
      calls.selectAppUser += 1
      if (typeof onSelectProfile === 'function') return onSelectProfile()
      return { data: selectProfile, error: null }
    },
    preferences,
    logger: {
      log() {},
      warn() {},
      error() {},
    },
  }

  return {
    deps,
    calls,
    upsertPayloads,
    preferences,
    listeners,
  }
}

test('syncSession loads current session user and prepares profile', async () => {
  const { createAuthStore } = await importModule('src/stores/authStoreCore.js')
  const user = { id: 'u1', email: 'u1@example.com', user_metadata: { name: '  Luna  ' } }
  const ctx = createDeps({ sessionUser: user, selectProfile: null })
  const store = createAuthStore(ctx.deps)

  const result = await store.syncSession()
  await nextTick()

  assert.equal(result.session.user.id, 'u1')
  assert.equal(store.state.user.id, 'u1')
  assert.equal(store.state.sessionLoaded, true)
  assert.equal(store.isLoggedIn.value, true)
  assert.equal(store.userState.value.id, 'u1')
  assert.equal(ctx.calls.getSession, 1)
  assert.equal(ctx.calls.readStoredSession, 0)
  assert.equal(ctx.calls.selectAppUser, 1)
  assert.equal(ctx.calls.upsertAppUser, 1)
  assert.deepEqual(ctx.upsertPayloads[0], {
    id: 'u1',
    email: 'u1@example.com',
    name: 'Luna',
  })
})

test('syncSession refresh mode prefers refreshSession and skips getSession on success', async () => {
  const { createAuthStore } = await importModule('src/stores/authStoreCore.js')
  const ctx = createDeps({
    refreshSessionResult: {
      data: {
        session: {
          user: { id: 'refresh-user', email: 'r@example.com' },
        },
      },
      error: null,
    },
    selectProfile: { id: 'refresh-user', name: 'Stored Name' },
  })
  const store = createAuthStore(ctx.deps)

  const result = await store.syncSession({ refresh: true })
  await nextTick()

  assert.equal(result.session.user.id, 'refresh-user')
  assert.equal(store.state.user.id, 'refresh-user')
  assert.equal(ctx.calls.refreshSession, 1)
  assert.equal(ctx.calls.getSession, 0)
  assert.equal(ctx.calls.upsertAppUser, 0)
})

test('syncSession falls back to getSession when refreshSession returns error', async () => {
  const { createAuthStore } = await importModule('src/stores/authStoreCore.js')
  const ctx = createDeps({
    refreshSessionResult: {
      data: null,
      error: { message: 'refresh failed' },
    },
    sessionUser: { id: 'fallback-user', email: 'f@example.com' },
  })
  const store = createAuthStore(ctx.deps)

  await store.syncSession({ refresh: true })
  await nextTick()

  assert.equal(store.state.user.id, 'fallback-user')
  assert.equal(ctx.calls.refreshSession, 1)
  assert.equal(ctx.calls.getSession, 1)
})

test('syncSession falls back to cached stored session when network session missing', async () => {
  const { createAuthStore } = await importModule('src/stores/authStoreCore.js')
  const ctx = createDeps({
    sessionUser: null,
    storedSession: { user: { id: 'cached-user', email: 'cached@example.com' } },
  })
  const store = createAuthStore(ctx.deps)

  await store.syncSession()
  await nextTick()

  assert.equal(store.state.user.id, 'cached-user')
  assert.equal(store.state.sessionLoaded, true)
  assert.equal(ctx.calls.getSession, 1)
  assert.equal(ctx.calls.readStoredSession, 1)
})

test('syncSession deduplicates concurrent calls with syncInFlight', async () => {
  const { createAuthStore } = await importModule('src/stores/authStoreCore.js')
  let resolveSession
  const sessionPromise = new Promise((resolve) => {
    resolveSession = resolve
  })
  const ctx = createDeps({
    onGetSession: async () => {
      await sessionPromise
      return { data: { session: { user: { id: 'shared' } } } }
    },
  })
  const store = createAuthStore(ctx.deps)

  const p1 = store.syncSession()
  const p2 = store.syncSession()
  resolveSession()
  const [r1, r2] = await Promise.all([p1, p2])
  await nextTick()

  assert.equal(ctx.calls.getSession, 1)
  assert.equal(store.state.user.id, 'shared')
  assert.deepEqual(r1, r2)
})

test('refreshSessionNative sets user on success and returns null on error/throw', async () => {
  const { createAuthStore } = await importModule('src/stores/authStoreCore.js')

  const successCtx = createDeps({
    refreshNativeResult: {
      data: { user: { id: 'native-user' } },
      error: null,
    },
  })
  const successStore = createAuthStore(successCtx.deps)
  const ok = await successStore.refreshSessionNative()
  assert.equal(ok.user.id, 'native-user')
  assert.equal(successStore.state.user.id, 'native-user')

  const errorCtx = createDeps({
    refreshNativeResult: {
      data: null,
      error: new Error('bad refresh'),
    },
  })
  const errorStore = createAuthStore(errorCtx.deps)
  const failed = await errorStore.refreshSessionNative()
  assert.equal(failed, null)
  assert.equal(errorStore.state.user, null)

  const throwCtx = createDeps({
    onRefreshNative: async () => {
      throw new Error('boom')
    },
  })
  const throwStore = createAuthStore(throwCtx.deps)
  const thrown = await throwStore.refreshSessionNative()
  assert.equal(thrown, null)
})

test('queueProfileUpdate and flushProfileQueue merge queued patches and clear queue', async () => {
  const { createAuthStore } = await importModule('src/stores/authStoreCore.js')
  const ctx = createDeps()
  const store = createAuthStore(ctx.deps)
  store.state.user = { id: 'q-user' }

  await store.queueProfileUpdate({ name: 'Nova' })
  await store.queueProfileUpdate({ zodiac: 'aries' })
  const rawBefore = ctx.preferences.__read('profile_pending_v1')
  const parsedBefore = JSON.parse(rawBefore)
  assert.equal(parsedBefore.length, 2)

  await store.flushProfileQueue()
  const rawAfter = ctx.preferences.__read('profile_pending_v1')
  const parsedAfter = JSON.parse(rawAfter)

  assert.equal(ctx.calls.upsertAppUser, 1)
  assert.deepEqual(ctx.upsertPayloads[0], {
    id: 'q-user',
    name: 'Nova',
    zodiac: 'aries',
  })
  assert.deepEqual(parsedAfter, [])
})

test('flushProfileQueue keeps queued items when upsert fails', async () => {
  const { createAuthStore } = await importModule('src/stores/authStoreCore.js')
  const seed = JSON.stringify([{ ts: 1, patch: { mood: 'calm' } }])
  const ctx = createDeps({
    preferencesSeed: { profile_pending_v1: seed },
    onUpsert: async () => ({ data: null, error: new Error('fail') }),
  })
  const store = createAuthStore(ctx.deps)
  store.state.user = { id: 'q-user' }

  await store.flushProfileQueue()
  const rawAfter = ctx.preferences.__read('profile_pending_v1')

  assert.equal(ctx.calls.upsertAppUser, 1)
  assert.equal(rawAfter, seed)
})

test('initAuth initializes once, registers listener once, and handles SIGNED_IN callback', async () => {
  const { createAuthStore } = await importModule('src/stores/authStoreCore.js')
  const ctx = createDeps({
    sessionUser: null,
    selectProfile: { id: 'listener-user', name: '' },
    preferencesSeed: {
      profile_pending_v1: JSON.stringify([{ ts: 1, patch: { locale: 'uk' } }]),
    },
  })
  const store = createAuthStore(ctx.deps)

  await store.initAuth()
  await store.initAuth()
  assert.equal(ctx.calls.onAuthStateChange, 1)
  assert.equal(store.state.listenerReady, true)
  assert.equal(store.state.sessionLoaded, true)

  const listener = ctx.listeners[0]
  await listener('SIGNED_IN', {
    user: {
      id: 'listener-user',
      email: 'listener@example.com',
      user_metadata: { full_name: '  Sol  ' },
    },
  })

  assert.equal(store.state.user.id, 'listener-user')
  assert.equal(ctx.calls.selectAppUser >= 1, true)
  assert.equal(ctx.calls.upsertAppUser >= 1, true)
  const hasProfilePatch = ctx.upsertPayloads.some((item) => item.id === 'listener-user')
  assert.equal(hasProfilePatch, true)
})

test('clearProfileQueue and clearUser reset state as expected', async () => {
  const { createAuthStore } = await importModule('src/stores/authStoreCore.js')
  const ctx = createDeps({
    preferencesSeed: {
      profile_pending_v1: JSON.stringify([{ ts: 1, patch: { a: 1 } }]),
    },
  })
  const store = createAuthStore(ctx.deps)
  store.state.user = { id: 'u-clear' }
  store.state.sessionLoaded = false

  await store.clearProfileQueue()
  assert.deepEqual(JSON.parse(ctx.preferences.__read('profile_pending_v1')), [])

  store.clearUser()
  assert.equal(store.state.user, null)
  assert.equal(store.state.sessionLoaded, true)
  assert.equal(store.isLoggedIn.value, false)
  assert.deepEqual(store.userState.value, {})
})

test('auth store tolerates profile queue storage read/write failures', async () => {
  const { createAuthStore } = await importModule('src/stores/authStoreCore.js')
  const ctx = createDeps()
  ctx.deps.preferences = {
    async get() {
      throw new Error('preferences-get-failed')
    },
    async set() {
      throw new Error('preferences-set-failed')
    },
  }
  const store = createAuthStore(ctx.deps)
  store.state.user = { id: 'u-fail' }

  await assert.doesNotReject(() => store.queueProfileUpdate({ mood: 'calm' }))
  await assert.doesNotReject(() => store.flushProfileQueue())
  await assert.doesNotReject(() => store.clearProfileQueue())
  assert.equal(ctx.calls.upsertAppUser, 0)
})

test('syncSession tolerates ensureUserProfile/select failures and session API throws', async () => {
  const { createAuthStore } = await importModule('src/stores/authStoreCore.js')
  const ctx = createDeps({
    sessionUser: { id: 'u-e1', email: 'u-e1@example.com' },
    onSelectProfile: async () => {
      throw new Error('select failed')
    },
  })
  const store = createAuthStore(ctx.deps)

  await assert.doesNotReject(() => store.syncSession())
  await nextTick()
  assert.equal(store.state.user.id, 'u-e1')

  const throwingSessionCtx = createDeps({
    onRefreshSession: async () => {
      throw new Error('refresh throw')
    },
    onGetSession: async () => {
      throw new Error('getSession throw')
    },
  })
  const throwingStore = createAuthStore(throwingSessionCtx.deps)
  const result = await throwingStore.syncSession({ refresh: true })
  assert.equal(result, null)
  assert.equal(throwingStore.state.sessionLoaded, true)
  assert.equal(throwingStore.state.user, null)
})

test('syncSession handles withAuthLock failure and __resetForTests clears internals', async () => {
  const { createAuthStore } = await importModule('src/stores/authStoreCore.js')
  const ctx = createDeps()
  ctx.deps.withAuthLock = async () => {
    throw new Error('lock failed')
  }
  const store = createAuthStore(ctx.deps)

  const result = await store.syncSession()
  assert.equal(result, null)

  store.state.user = { id: 'to-reset' }
  store.state.sessionLoaded = true
  store.state.listenerReady = true
  store.__resetForTests()
  assert.equal(store.state.user, null)
  assert.equal(store.state.sessionLoaded, false)
  assert.equal(store.state.listenerReady, false)
})

test('clearUser() clears the native profile cache (A-1 cross-account PII)', async () => {
  const { createAuthStore } = await importModule('src/stores/authStoreCore.js')
  const ctx = createDeps({ preferencesSeed: { profile_cache_v1: '{"id":"account-a"}' } })
  const store = createAuthStore(ctx.deps)
  assert.equal(ctx.deps.preferences.__read('profile_cache_v1'), '{"id":"account-a"}')

  store.clearUser()
  await nextTick()

  assert.equal(
    ctx.deps.preferences.__read('profile_cache_v1'),
    null,
    'native profile cache must be removed on logout so the next account cannot read it',
  )
})

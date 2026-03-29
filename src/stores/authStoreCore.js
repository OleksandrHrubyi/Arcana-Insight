import { reactive, computed } from 'vue'

const PROFILE_QUEUE_KEY = 'profile_pending_v1'
const AUTH_TIMEOUT_MS = 2000

const normalizeProfileName = (value) => {
  if (typeof value !== 'string') return ''
  return value.trim()
}

const withTimeout = async (promise, ms, label) => {
  if (!ms) return promise
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

export function createAuthStore({
  supabase,
  withAuthLock,
  readStoredSession,
  upsertAppUser,
  refreshAccessTokenNative,
  selectAppUser,
  preferences,
  logger = console,
  onUserAuthenticated = null,
} = {}) {
  const state = reactive({
    user: null,
    sessionLoaded: false,
    listenerReady: false,
  })

  let syncInFlight = null

  const loadProfileQueue = async () => {
    try {
      const { value } = await preferences.get({ key: PROFILE_QUEUE_KEY })
      if (!value) return []
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const saveProfileQueue = async (items) => {
    try {
      await preferences.set({
        key: PROFILE_QUEUE_KEY,
        value: JSON.stringify(items),
      })
    } catch {
      // ignore cache errors
    }
  }

  async function ensureUserProfile(user) {
    if (!user) return

    try {
      const { data: existingProfile } = await selectAppUser(user.id, 8000, 'id,name')
      const metadataName = normalizeProfileName(
        user.user_metadata?.name || user.user_metadata?.full_name || '',
      )

      if (!existingProfile) {
        const payload = {
          id: user.id,
          email: user.email,
        }
        if (metadataName) payload.name = metadataName
        await upsertAppUser(payload, 8000)
        return
      }

      const storedName = normalizeProfileName(existingProfile.name || '')
      if (!storedName && metadataName) {
        await upsertAppUser({
          id: user.id,
          name: metadataName,
        }, 8000)
      }
    } catch (err) {
      logger.error?.('[AuthStore] Error checking/creating profile:', err)
    }
  }

  async function flushProfileQueue() {
    const user = state.user
    if (!user) return

    const items = await loadProfileQueue()
    if (!items.length) return

    const merged = {}
    for (const item of items) {
      Object.assign(merged, item.patch || {})
    }

    const payload = { id: user.id, ...merged }
    try {
      const { error } = await upsertAppUser(payload, 8000)
      if (error) throw error
      await saveProfileQueue([])
    } catch (err) {
      logger.warn?.('[AuthStore] flushProfileQueue failed:', err)
    }
  }

  async function syncSession({ refresh = false } = {}) {
    if (syncInFlight) return syncInFlight
    syncInFlight = (async () => {
      try {
        let sessionData = null
        logger.log?.('[AuthStore] syncSession start', { refresh })

        await withAuthLock(async () => {
          if (refresh) {
            try {
              const { data: refreshed, error } = await withTimeout(
                supabase.auth.refreshSession(),
                AUTH_TIMEOUT_MS,
                'supabase.refreshSession',
              )
              logger.log?.('[AuthStore] refreshSession result', {
                hasSession: !!refreshed?.session,
                error: error?.message || null,
              })
              if (!error) {
                sessionData = refreshed
              }
            } catch (err) {
              logger.warn?.('[AuthStore] refreshSession failed:', err?.message || String(err))
            }
          }

          if (!sessionData) {
            try {
              const { data } = await withTimeout(
                supabase.auth.getSession(),
                AUTH_TIMEOUT_MS,
                'supabase.getSession',
              )
              logger.log?.('[AuthStore] getSession result', { hasSession: !!data?.session })
              sessionData = data
            } catch (err) {
              logger.warn?.('[AuthStore] getSession failed:', err?.message || String(err))
            }
          }
        })

        if (!sessionData?.session) {
          const cached = await readStoredSession()
          if (cached?.user) {
            logger.log?.('[AuthStore] fallback to stored session', { hasUser: true })
            state.user = cached.user
          } else {
            state.user = state.user ?? null
          }
        } else {
          state.user = sessionData.session.user ?? state.user ?? null
        }
        state.sessionLoaded = true

        if (state.user) {
          void ensureUserProfile(state.user)
          void flushProfileQueue()
          if (typeof onUserAuthenticated === 'function') {
            void Promise.resolve(onUserAuthenticated(state.user, { source: 'sync_session' })).catch(
              (error) => {
                logger.warn?.('[AuthStore] onUserAuthenticated(syncSession) failed:', error)
              },
            )
          }
        }
        return sessionData
      } catch (err) {
        logger.error?.('[AuthStore] syncSession failed:', err)
        return null
      } finally {
        syncInFlight = null
      }
    })()
    return syncInFlight
  }

  async function refreshSessionNative() {
    try {
      const { data, error } = await refreshAccessTokenNative(8000)
      if (error) {
        logger.warn?.('[AuthStore] refreshSessionNative failed:', error?.message || error)
        return null
      }
      if (data?.user) {
        state.user = data.user
      }
      return data
    } catch (err) {
      logger.warn?.('[AuthStore] refreshSessionNative error:', err?.message || err)
      return null
    }
  }

  async function queueProfileUpdate(patch) {
    const items = await loadProfileQueue()
    items.push({ ts: Date.now(), patch })
    await saveProfileQueue(items)
  }

  async function initAuth() {
    if (!state.sessionLoaded) {
      await syncSession()
    }

    if (state.listenerReady) return
    state.listenerReady = true

    supabase.auth.onAuthStateChange(async (event, session) => {
      logger.log?.('[AuthStore] onAuthStateChange', {
        event,
        hasSession: !!session,
      })
      state.user = session?.user ?? null

      if (event === 'SIGNED_IN' && session?.user) {
        await ensureUserProfile(session.user)
        await flushProfileQueue()
        if (typeof onUserAuthenticated === 'function') {
          void Promise.resolve(onUserAuthenticated(session.user, { source: 'signed_in' })).catch(
            (error) => {
              logger.warn?.('[AuthStore] onUserAuthenticated(signedIn) failed:', error)
            },
          )
        }
      }
    })
  }

  const isLoggedIn = computed(() => !!state.user)
  const userState = computed(() => state.user || {})

  const store = {
    state,
    initAuth,
    syncSession,
    refreshSessionNative,
    queueProfileUpdate,
    flushProfileQueue,
    async clearProfileQueue() {
      await saveProfileQueue([])
    },
    isLoggedIn,
    userState,
    clearUser() {
      state.user = null
      state.sessionLoaded = true
    },
    __resetForTests() {
      state.user = null
      state.sessionLoaded = false
      state.listenerReady = false
      syncInFlight = null
    },
  }

  return store
}

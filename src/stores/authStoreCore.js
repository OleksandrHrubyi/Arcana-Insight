import { reactive, computed } from 'vue'

const PROFILE_QUEUE_KEY = 'profile_pending_v1'
const AUTH_TIMEOUT_MS = 2000

// Account-scoped local flags must not leak to the next account on a shared device
// (the one-free-AI-reading gift, the daily free-tarot limit, the cached profile).
// The server stays the source of truth. Cleared on BOTH the async SIGNED_OUT event
// AND the synchronous clearUser(), so a dropped/slow sign-out event can't strand
// them across an account switch.
const clearAccountScopedLocalState = () => {
  try {
    localStorage.removeItem('profile_cache_v1')
    localStorage.removeItem('arcana_free_ai_tarot_used_v1')
    localStorage.removeItem('arcana_free_tarot_daily_v1')
    // Saved compatibility connections hold OTHER PEOPLE's names + birth dates +
    // cities. The key is global (not user-scoped), so on a shared device the next
    // account would see the previous user's saved people (PII bleed + an Apple
    // data-handling concern). Clear it on sign-out too.
    localStorage.removeItem('arcana_compatibility_connections_v1')
    // Reward inventory is the signed-in user's own entitlement/reward state.
    localStorage.removeItem('arcana_auth_reward_inventory_cache_v1')
    // Cached zodiac sign of the signed-in user: until the next account's sign
    // re-resolves, Home focus-today and the horoscope wheel would keep showing
    // the PREVIOUS user's sign (B7).
    localStorage.removeItem('horoscope_sign_key_v1')
  } catch {
    // ignore if localStorage unavailable
  }
}

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
  clearStoredSession = null,
  revokePremiumAccess = null,
  logger = console,
  onUserAuthenticated = null,
} = {}) {
  const state = reactive({
    user: null,
    sessionLoaded: false,
    listenerReady: false,
  })

  // The profile cache is persisted to NATIVE Preferences (AccountPage writes
  // `profile_cache_v1` via Preferences.set), but clearAccountScopedLocalState only
  // touches localStorage — so on a device plain logout never cleared it and the
  // next account hydrated from the previous user's name/birth date (PII bleed).
  // Clear the native copy too. Guarded + fire-and-forget: `preferences` is optional
  // (tests call createAuthStore({}) without it) and clearUser() is synchronous.
  const clearNativeProfileCache = () => {
    try {
      const result = preferences?.remove?.({ key: 'profile_cache_v1' })
      if (result && typeof result.catch === 'function') result.catch(() => {})
    } catch {
      // preferences unavailable — ignore
    }
  }

  let syncInFlight = null
  let sessionReadyPromise = null

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
        } else if (typeof revokePremiumAccess === 'function') {
          // No session → clear any stale persisted premium flag NOW, before gated
          // screens read it (the router awaits session-ready, so this runs first).
          // Prevents a brief premium flash on a logged-out cold start.
          try {
            revokePremiumAccess()
          } catch (err) {
            logger.warn?.('[AuthStore] revokePremiumAccess on no-session failed:', err)
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
      // Track the session-ready promise so router guards can await it
      if (!sessionReadyPromise) {
        sessionReadyPromise = syncSession().finally(() => {
          // sessionLoaded is set inside syncSession; this just ensures
          // the promise always resolves (never stays pending)
          if (!state.sessionLoaded) state.sessionLoaded = true
        })
      }
      await sessionReadyPromise
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

      if (event === 'SIGNED_OUT') {
        state.user = null
        try {
          if (typeof clearStoredSession === 'function') {
            await clearStoredSession()
          }
        } catch (err) {
          logger.warn?.('[AuthStore] clearStoredSession on SIGNED_OUT failed:', err)
        }
        clearAccountScopedLocalState()
        clearNativeProfileCache()
        try {
          if (typeof revokePremiumAccess === 'function') {
            revokePremiumAccess()
          }
        } catch (err) {
          logger.warn?.('[AuthStore] revokePremiumAccess on SIGNED_OUT failed:', err)
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
    // Resolves once the initial session restore is complete.
    // Safe to call multiple times — returns the same promise.
    waitForSession() {
      if (state.sessionLoaded) return Promise.resolve()
      if (sessionReadyPromise) return sessionReadyPromise
      // initAuth hasn't been called yet — resolve immediately so guards don't hang
      return Promise.resolve()
    },
    async clearProfileQueue() {
      await saveProfileQueue([])
    },
    isLoggedIn,
    userState,
    clearUser() {
      state.user = null
      state.sessionLoaded = true
      // Deterministic on logout / delete-account (both call clearUser synchronously),
      // independent of whether the async SIGNED_OUT event fires in time.
      clearAccountScopedLocalState()
      clearNativeProfileCache()
      // Enforce the "no user ⇒ no premium" invariant in the synchronous path too,
      // matching SIGNED_OUT — so the store guarantees it regardless of which logout
      // path runs (revoke is idempotent; callers may also revoke, harmlessly).
      try {
        if (typeof revokePremiumAccess === 'function') {
          revokePremiumAccess()
        }
      } catch (err) {
        logger.warn?.('[AuthStore] revokePremiumAccess on clearUser failed:', err)
      }
    },
    __resetForTests() {
      state.user = null
      state.sessionLoaded = false
      state.listenerReady = false
      syncInFlight = null
      sessionReadyPromise = null
    },
  }

  return store
}

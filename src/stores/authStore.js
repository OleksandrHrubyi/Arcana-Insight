import { reactive, computed } from 'vue'
import { supabase, withAuthLock, readStoredSession } from 'src/services/supabaseClient'
import { upsertAppUser, refreshAccessTokenNative, selectAppUser } from 'src/services/supabaseNative'
import { Preferences } from '@capacitor/preferences'

const state = reactive({
  user: null,
  sessionLoaded: false,
  listenerReady: false,
})

let syncInFlight = null
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

const loadProfileQueue = async () => {
  try {
    const { value } = await Preferences.get({ key: PROFILE_QUEUE_KEY })
    if (!value) return []
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const saveProfileQueue = async (items) => {
  try {
    await Preferences.set({
      key: PROFILE_QUEUE_KEY,
      value: JSON.stringify(items),
    })
  } catch {
    // ignore cache errors
  }
}

async function syncSession({ refresh = false } = {}) {
  if (syncInFlight) return syncInFlight
  syncInFlight = (async () => {
  try {
    let sessionData = null
    console.log('[AuthStore] syncSession start', { refresh })

    await withAuthLock(async () => {
      if (refresh) {
        try {
          const { data: refreshed, error } = await withTimeout(
            supabase.auth.refreshSession(),
            AUTH_TIMEOUT_MS,
            'supabase.refreshSession'
          )
          console.log('[AuthStore] refreshSession result', {
            hasSession: !!refreshed?.session,
            error: error?.message || null,
          })
          if (!error) {
            sessionData = refreshed
          }
        } catch (err) {
          console.warn('[AuthStore] refreshSession failed:', err?.message || String(err))
        }
      }

      if (!sessionData) {
        try {
          const { data } = await withTimeout(
            supabase.auth.getSession(),
            AUTH_TIMEOUT_MS,
            'supabase.getSession'
          )
          console.log('[AuthStore] getSession result', { hasSession: !!data?.session })
          sessionData = data
        } catch (err) {
          console.warn('[AuthStore] getSession failed:', err?.message || String(err))
        }
      }
    })

    if (!sessionData?.session) {
      const cached = await readStoredSession()
      if (cached?.user) {
        console.log('[AuthStore] fallback to stored session', { hasUser: true })
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
    }
    return sessionData
  } catch (err) {
    console.error('[AuthStore] syncSession failed:', err)
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
      console.warn('[AuthStore] refreshSessionNative failed:', error?.message || error)
      return null
    }
    if (data?.user) {
      state.user = data.user
    }
    return data
  } catch (err) {
    console.warn('[AuthStore] refreshSessionNative error:', err?.message || err)
    return null
  }
}

async function queueProfileUpdate(patch) {
  const items = await loadProfileQueue()
  items.push({ ts: Date.now(), patch })
  await saveProfileQueue(items)
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
    // silent
  } catch (err) {
    console.warn('[AuthStore] flushProfileQueue failed:', err)
  }
}

async function initAuth() {
  if (!state.sessionLoaded) {
    await syncSession()
  }

  if (state.listenerReady) return
  state.listenerReady = true

  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('[AuthStore] onAuthStateChange', {
      event,
      hasSession: !!session,
    })
    state.user = session?.user ?? null

    // Create profile on sign in (especially for OAuth callbacks)
    if (event === 'SIGNED_IN' && session?.user) {
      await ensureUserProfile(session.user)
      await flushProfileQueue()
    }
  })
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
    console.error('[AuthStore] Error checking/creating profile:', err)
  }
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
}

export function useAuthStore() {
  return store
}

import { supabase, withAuthLock, readStoredSession, clearStoredSession } from 'src/services/supabaseClient'
import { upsertAppUser, refreshAccessTokenNative, selectAppUser } from 'src/services/supabaseNative'
import { Preferences } from '@capacitor/preferences'
import { createAuthStore } from './authStoreCore'
import { syncGuestRitualState } from 'src/helpers/ritualRewardsBackend.js'
import { loginToRevenueCat } from 'src/services/premiumBilling.js'
import { usePremiumAccess } from './premiumAccess.js'

const authLogger = {
  log: () => {},
  warn: () => {},
  error: (...args) => {
    if (import.meta.env.DEV) {
      console.error(...args)
    }
  },
}

const store = createAuthStore({
  supabase,
  withAuthLock,
  readStoredSession,
  clearStoredSession,
  revokePremiumAccess: () => usePremiumAccess().revokePremiumAccess(),
  upsertAppUser,
  refreshAccessTokenNative,
  selectAppUser,
  preferences: Preferences,
  logger: authLogger,
  onUserAuthenticated: async (user, context = {}) => {
    await syncGuestRitualState({
      userId: user?.id || '',
      source: `auth_${String(context?.source || 'sync').trim().slice(0, 32)}`,
    })
    if (user?.id) {
      await loginToRevenueCat(user.id)
    }
  },
})

export function useAuthStore() {
  return store
}

export const __resetAuthStoreForTests = () => {
  if (typeof store.__resetForTests === 'function') {
    store.__resetForTests()
  }
}

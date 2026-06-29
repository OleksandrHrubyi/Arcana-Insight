import { supabase, withAuthLock, readStoredSession, clearStoredSession } from 'src/services/supabaseClient'
import { upsertAppUser, refreshAccessTokenNative, selectAppUser } from 'src/services/supabaseNative'
import { Preferences } from '@capacitor/preferences'
import { createAuthStore } from './authStoreCore'
import { syncGuestRitualState } from 'src/helpers/ritualRewardsBackend.js'
import { loginToRevenueCat, logoutFromRevenueCat, getBillingPremiumStatus } from 'src/services/premiumBilling.js'
import { usePremiumAccess } from './premiumAccess.js'
import { crashReporting } from 'src/services/crashReporting.js'

// Production auth failures used to be fully silent (warn no-op, error DEV-only),
// so session-restore / profile-upsert / RC-login failures were undiagnosable in the
// field. Forward warn+error to Crashlytics breadcrumbs in prod (fail-safe, native-
// only, never throws) while keeping the dev console. A-7.
const toBreadcrumb = (level, args) =>
  `[auth][${level}] ${args
    .map((a) => (a instanceof Error ? `${a.name}: ${a.message}` : String(a)))
    .join(' ')}`

const authLogger = {
  log: () => {},
  warn: (...args) => {
    if (import.meta.env.DEV) {
      console.warn(...args)
    } else {
      void crashReporting.log(toBreadcrumb('warn', args))
    }
  },
  error: (...args) => {
    if (import.meta.env.DEV) {
      console.error(...args)
    } else {
      void crashReporting.log(toBreadcrumb('error', args))
    }
  },
}

const store = createAuthStore({
  supabase,
  withAuthLock,
  readStoredSession,
  clearStoredSession,
  // On sign-out: drop the local premium flag AND dissociate the RevenueCat user,
  // so a logged-out session can never inherit the previous account's entitlement.
  revokePremiumAccess: () => {
    usePremiumAccess().revokePremiumAccess()
    void logoutFromRevenueCat()
  },
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
      // Grant premium based on the now-identified RC user (covers fresh login AND
      // session restore on cold start). Premium is only ever applied while logged in.
      try {
        const status = await getBillingPremiumStatus()
        if (status?.ok && status?.available) {
          usePremiumAccess().applyPremiumAccessStatus({
            active: status.hasPremium,
            plan: status.plan,
            source: 'billing',
          })
        }
      } catch {
        /* ignore — resume/boot sync will retry */
      }
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

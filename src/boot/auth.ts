import { boot } from 'quasar/wrappers'
import { Capacitor } from '@capacitor/core'
import { useAuthStore } from 'stores/authStore'
import { isAuthInFlight } from 'src/services/supabaseClient'
import { useAppEpoch } from 'stores/appEpoch'
import { getBillingPremiumStatus } from 'src/services/premiumBilling'
import { usePremiumAccess } from 'stores/premiumAccess'

export default boot(() => {
  const authStore = useAuthStore()
  const { markBackground, clearAuthTimeout } = useAppEpoch()
  const { applyPremiumAccessStatus, revokePremiumAccess } = usePremiumAccess()
  const runAuthTask = (label: string, task: () => Promise<unknown>) => {
    void task().catch((error) => {
      console.warn(`[AuthBoot] ${label} failed`, error)
    })
  }

  // Refresh the RevenueCat entitlement on resume so premium state isn't stale
  // after a subscription expires/renews/cancels while the app was backgrounded.
  // Premium is gated on auth: never grant to a logged-out session (RevenueCat still
  // sees the device's subscription); revoke once we know the user is signed out.
  const syncPremiumOnResume = async () => {
    if (!authStore.state.sessionLoaded) return
    if (!authStore.state.user?.id) {
      revokePremiumAccess()
      return
    }
    const status = await getBillingPremiumStatus()
    if (!status?.ok || !status?.available) return
    applyPremiumAccessStatus({ active: status.hasPremium, plan: status.plan, source: 'billing' })
  }
  runAuthTask('initAuth', () => authStore.initAuth())

  if (!Capacitor.isNativePlatform()) return

  // Do not block first render on native plugin import/setup.
  void (async () => {
    try {
      const { App } = await import('@capacitor/app')
      let flushTimer = null

      const startFlushTimer = () => {
        if (flushTimer) return
        flushTimer = setInterval(() => {
          runAuthTask('flushProfileQueue(interval)', () => authStore.flushProfileQueue())
        }, 15000)
      }

      const stopFlushTimer = () => {
        if (!flushTimer) return
        clearInterval(flushTimer)
        flushTimer = null
      }

      App.addListener('appStateChange', async ({ isActive }) => {
        if (!isActive) {
          markBackground()
          stopFlushTimer()
          return
        }

        if (!isAuthInFlight()) {
          runAuthTask('refreshSessionNative(appState)', () => authStore.refreshSessionNative())
          runAuthTask('syncSession(appState)', () => authStore.syncSession({ refresh: false }))
          runAuthTask('flushProfileQueue(appState)', () => authStore.flushProfileQueue())
          runAuthTask('syncPremium(appState)', () => syncPremiumOnResume())
          startFlushTimer()
          clearAuthTimeout()
        }
      }).catch((error) => {
        console.warn('[AuthBoot] appStateChange listener failed:', error)
      })

      // start timer for active session
      startFlushTimer()
    } catch (err) {
      console.warn('[AuthBoot] @capacitor/app not available:', err)
    }
  })()
})

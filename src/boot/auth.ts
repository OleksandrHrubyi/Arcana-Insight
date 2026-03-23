import { boot } from 'quasar/wrappers'
import { Capacitor } from '@capacitor/core'
import { useAuthStore } from 'stores/authStore'
import { isAuthInFlight } from 'src/services/supabaseClient'
import { useAppEpoch } from 'stores/appEpoch'

export default boot(async () => {
  const authStore = useAuthStore()
  const { markBackground, clearAuthTimeout } = useAppEpoch()
  console.log('[AuthBoot] initAuth')
  void authStore.initAuth()

  if (!Capacitor.isNativePlatform()) return

  try {
    const { App } = await import('@capacitor/app')
    let flushTimer = null

    const startFlushTimer = () => {
      if (flushTimer) return
      flushTimer = setInterval(() => {
        void authStore.flushProfileQueue()
      }, 15000)
    }

    const stopFlushTimer = () => {
      if (!flushTimer) return
      clearInterval(flushTimer)
      flushTimer = null
    }


    App.addListener('appStateChange', async ({ isActive }) => {
      console.log('[AuthBoot] appStateChange', { isActive })
      if (!isActive) {
        markBackground()
        stopFlushTimer()
        return
      }

      if (!isAuthInFlight()) {
        void authStore.refreshSessionNative()
        void authStore.syncSession({ refresh: false })
        void authStore.flushProfileQueue()
        startFlushTimer()
        clearAuthTimeout()
      } else {
        console.log('[AuthBoot] auth in flight, skip reset/sync')
      }
    })

    // start timer for active session
    startFlushTimer()
  } catch (err) {
    console.warn('[AuthBoot] @capacitor/app not available:', err)
  }
})

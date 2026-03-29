import { boot } from 'quasar/wrappers'
import { Capacitor } from '@capacitor/core'
import { useAuthStore } from 'stores/authStore'
import { isAuthInFlight } from 'src/services/supabaseClient'
import { useAppEpoch } from 'stores/appEpoch'

export default boot(() => {
  const authStore = useAuthStore()
  const { markBackground, clearAuthTimeout } = useAppEpoch()
  const runAuthTask = (label: string, task: () => Promise<unknown>) => {
    void task().catch((error) => {
      console.warn(`[AuthBoot] ${label} failed`, error)
    })
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

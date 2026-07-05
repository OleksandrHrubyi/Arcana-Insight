import { ref } from 'vue'

// NOTE (audit C10): the original "epoch counter" (appEpoch ref + bump()) had zero
// production callers — day-rollover is handled per-component via visibilitychange
// + isDayKeyStale. Removed so the store's name doesn't mislead; what remains is
// the background timestamp + auth-timeout flag that boot/auth.ts and AccountPage
// actually use.
const lastBackgroundAt = ref(0)
const hadAuthTimeout = ref(false)

export function useAppEpoch() {
  const markBackground = () => {
    lastBackgroundAt.value = Date.now()
  }

  const markAuthTimeout = () => {
    hadAuthTimeout.value = true
  }

  const clearAuthTimeout = () => {
    hadAuthTimeout.value = false
  }

  return {
    lastBackgroundAt,
    hadAuthTimeout,
    markBackground,
    markAuthTimeout,
    clearAuthTimeout,
  }
}

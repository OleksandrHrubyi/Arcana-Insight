import { ref } from 'vue'

const appEpoch = ref(0)
const lastBackgroundAt = ref(0)
const hadAuthTimeout = ref(false)

export function useAppEpoch() {
  const bump = () => {
    appEpoch.value += 1
  }

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
    appEpoch,
    bump,
    lastBackgroundAt,
    hadAuthTimeout,
    markBackground,
    markAuthTimeout,
    clearAuthTimeout,
  }
}

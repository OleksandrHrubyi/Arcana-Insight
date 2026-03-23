import { ref } from 'vue'

const netReady = ref(true)

export function useNetStatus() {
  const setReady = (value) => {
    netReady.value = value
  }

  return {
    netReady,
    setReady,
  }
}

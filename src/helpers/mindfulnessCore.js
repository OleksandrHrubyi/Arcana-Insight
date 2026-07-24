export const MINDFUL_SYNC_STORAGE_KEY = 'arcana_mindful_sync_v1'
export const MINDFUL_DEFAULT_DURATION_SECONDS = 60
export const MINDFUL_MIN_DURATION_SECONDS = 30
export const MINDFUL_MAX_DURATION_SECONDS = 600

// Device-level preference (not account-scoped): opt-in for writing finished
// reflections to Apple Health as Mindful Minutes. Default OFF — Health access
// must always be an explicit user choice.
export const isMindfulSyncEnabled = () => {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(MINDFUL_SYNC_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export const setMindfulSyncEnabled = (enabled) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(MINDFUL_SYNC_STORAGE_KEY, enabled ? 'true' : 'false')
  } catch {
    // ignore storage errors
  }
}

export const clampMindfulDuration = (value) => {
  const parsed = Number(value)
  const fallback = MINDFUL_DEFAULT_DURATION_SECONDS
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(MINDFUL_MAX_DURATION_SECONDS, Math.max(MINDFUL_MIN_DURATION_SECONDS, parsed))
}

const NAV_HAPTIC_SUPPRESS_KEY = '__arcana_nav_haptic_suppress_until__'

const readSuppressUntil = () => {
  if (typeof window === 'undefined') return 0
  return Math.max(0, Number(window[NAV_HAPTIC_SUPPRESS_KEY] || 0) || 0)
}

export const suppressNavigationHaptics = (durationMs = 450) => {
  if (typeof window === 'undefined') return
  const now = Date.now()
  const nextUntil = now + Math.max(0, Number(durationMs || 0) || 0)
  const currentUntil = readSuppressUntil()
  window[NAV_HAPTIC_SUPPRESS_KEY] = Math.max(currentUntil, nextUntil)
}

export const isNavigationHapticsSuppressed = () => readSuppressUntil() > Date.now()


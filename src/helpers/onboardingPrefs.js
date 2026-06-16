export const ONBOARDING_INTERESTS_KEY = 'arcana-onboarding-interests'
export const ONBOARDING_COMPLETE_KEY = 'arcana-onboarding-complete'
export const ONBOARDING_PREFERENCES_UPDATED_EVENT = 'arcana:onboarding-preferences-updated'

const ALLOWED_INTERESTS = new Set(['love', 'career', 'money', 'self', 'energy', 'future'])

export const normalizeOnboardingInterests = (value) => {
  if (!Array.isArray(value)) return []
  const out = []
  for (const item of value) {
    const key = String(item || '').trim()
    if (!ALLOWED_INTERESTS.has(key)) continue
    if (out.includes(key)) continue
    out.push(key)
  }
  return out
}

export const readOnboardingInterests = () => {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(ONBOARDING_INTERESTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return normalizeOnboardingInterests(parsed)
  } catch {
    return []
  }
}

export const isOnboardingComplete = () => {
  if (typeof window === 'undefined') return true
  try {
    return localStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true'
  } catch {
    return false
  }
}

export const persistOnboardingPreferences = (interests) => {
  if (typeof window === 'undefined') return
  const normalized = normalizeOnboardingInterests(interests)
  try {
    localStorage.setItem(ONBOARDING_INTERESTS_KEY, JSON.stringify(normalized))
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true')
    window.dispatchEvent(
      new CustomEvent(ONBOARDING_PREFERENCES_UPDATED_EVENT, {
        detail: { interests: normalized },
      }),
    )
  } catch {
    // ignore storage failures
  }
  // Also persist to native Preferences (UserDefaults). localStorage in the iOS
  // WebView can be evicted under storage pressure; this is the durable backup.
  void writeOnboardingToNative(normalized)
}

// Native UserDefaults only matters on the actual device; on web/node localStorage
// is already durable. This sync check reads the injected Capacitor global without
// a static import, so the module stays loadable under node --test.
const isNativePlatform = () =>
  typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.()

// Dynamic import keeps @capacitor/preferences out of this module's static graph
// (it's unit-tested under node --test).
const loadNativePreferences = async () => {
  const mod = await import('@capacitor/preferences')
  return mod.Preferences
}

export const writeOnboardingToNative = async (interests) => {
  if (!isNativePlatform()) return
  try {
    const Preferences = await loadNativePreferences()
    await Preferences.set({ key: ONBOARDING_COMPLETE_KEY, value: 'true' })
    await Preferences.set({
      key: ONBOARDING_INTERESTS_KEY,
      value: JSON.stringify(normalizeOnboardingInterests(interests)),
    })
  } catch {
    // ignore — localStorage is the primary store, native is a backup
  }
}

let nativeHydration = null

// If localStorage lost the completion flag (WebView eviction) but native
// Preferences still has it, restore the fast-path store. Cached so the guard
// only pays one native read per session. Safe to await from the router guard.
export const hydrateOnboardingFromNative = () => {
  if (nativeHydration) return nativeHydration
  nativeHydration = (async () => {
    if (!isNativePlatform()) return
    if (isOnboardingComplete()) return
    try {
      const Preferences = await loadNativePreferences()
      const { value } = await Preferences.get({ key: ONBOARDING_COMPLETE_KEY })
      if (value !== 'true') return
      const { value: rawInterests } = await Preferences.get({ key: ONBOARDING_INTERESTS_KEY })
      let interests = []
      try {
        interests = normalizeOnboardingInterests(JSON.parse(rawInterests || '[]'))
      } catch {
        interests = []
      }
      localStorage.setItem(ONBOARDING_INTERESTS_KEY, JSON.stringify(interests))
      localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true')
      window.dispatchEvent(
        new CustomEvent(ONBOARDING_PREFERENCES_UPDATED_EVENT, { detail: { interests } }),
      )
    } catch {
      // ignore — fall back to localStorage / onboarding flow
    }
  })()
  return nativeHydration
}

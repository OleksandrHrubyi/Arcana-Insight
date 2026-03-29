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
}

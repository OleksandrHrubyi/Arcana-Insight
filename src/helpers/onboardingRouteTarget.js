// RP-04: a true first run (no valid `from` deep-link) lands on the reflection
// journal, not Home — the first minute in the app IS the daily ritual, which is
// the repositioned identity Apple sees. Re-entries with a valid `from` keep
// returning to their origin.
export const ONBOARDING_FIRST_RUN_ROUTE = Object.freeze({
  name: 'journal',
  query: Object.freeze({ source: 'onboarding', entry: 'first_run' }),
})
export const ONBOARDING_FIRST_RUN_PATH = '/journal'

// After the onboarding gate, return the user to their original destination (e.g. a
// push / marketing deep-link) when it is a self-sufficient screen that renders fine
// for a brand-new user. Gated/stateful screens stay blocked so a first run never
// lands on an empty/locked/auth surface (N2).
// NOTE: '/' is deliberately NOT allowed — the guard stamps `from=/` on every
// plain app launch, which is exactly the first-run case that must land on the
// journal. Real deep-links carry a specific path.
const ALLOWED_FROM_PATHS = Object.freeze([
  '/menu',
  '/horoscope',
  '/tarot',
  '/daily',
  '/compatibility',
  '/cards',
  '/zodiac-guide',
])

const BLOCKED_FROM_PATHS = Object.freeze([
  '/onboarding',
  '/login',
  '/sign-up',
  '/confirm-code',
  '/premium', // paywall — don't dump a brand-new user straight onto it
  '/settings',
  '/account', // requiresAuth
  '/tarot-interpretation', // needs a live sessionStorage reading → empty on deep-link
  '/readings', // premium-gated
  '/rewards', // parked (redirects to menu)
])

const ALLOWED_FROM_SET = new Set(ALLOWED_FROM_PATHS)
const BLOCKED_FROM_SET = new Set(BLOCKED_FROM_PATHS)

const toRawFromString = (rawFrom) => {
  if (Array.isArray(rawFrom)) {
    return String(rawFrom[0] || '').trim()
  }
  return String(rawFrom || '').trim()
}

const sanitizeFromPath = (rawFrom) => {
  const candidate = toRawFromString(rawFrom)
  if (!candidate) return ''
  if (!candidate.startsWith('/')) return ''
  if (candidate.startsWith('//')) return ''

  let parsed
  try {
    parsed = new URL(candidate, 'https://arcana.local')
  } catch {
    return ''
  }

  const pathname = parsed.pathname || '/'
  if (BLOCKED_FROM_SET.has(pathname)) return ''
  if (!ALLOWED_FROM_SET.has(pathname)) return ''
  return `${pathname}${parsed.search}${parsed.hash}`
}

export const resolveOnboardingRouteTarget = (rawFrom) => {
  const validFrom = sanitizeFromPath(rawFrom)
  if (validFrom) {
    return {
      target: validFrom,
      navigationMode: 'push',
      hadValidFrom: true,
      resolvedTarget: validFrom,
    }
  }

  return {
    target: ONBOARDING_FIRST_RUN_ROUTE,
    navigationMode: 'replace',
    hadValidFrom: false,
    resolvedTarget: ONBOARDING_FIRST_RUN_PATH,
  }
}

export const onboardingRouteWhitelist = Object.freeze({
  allowed: ALLOWED_FROM_PATHS,
  blocked: BLOCKED_FROM_PATHS,
})

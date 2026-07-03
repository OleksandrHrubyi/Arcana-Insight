export const ONBOARDING_HOME_ROUTE = Object.freeze({ name: 'arcana' })
export const ONBOARDING_HOME_PATH = '/'

// After the onboarding gate, return the user to their original destination (e.g. a
// push / marketing deep-link) when it is a self-sufficient screen that renders fine
// for a brand-new user. Gated/stateful screens stay blocked so a first run never
// lands on an empty/locked/auth surface (N2).
const ALLOWED_FROM_PATHS = Object.freeze([
  '/',
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
    target: ONBOARDING_HOME_ROUTE,
    navigationMode: 'replace',
    hadValidFrom: false,
    resolvedTarget: ONBOARDING_HOME_PATH,
  }
}

export const onboardingRouteWhitelist = Object.freeze({
  allowed: ALLOWED_FROM_PATHS,
  blocked: BLOCKED_FROM_PATHS,
})

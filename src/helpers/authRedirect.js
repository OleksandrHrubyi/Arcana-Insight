// Resolve a safe in-app redirect target from a route `redirect` query param, so
// that "sign in first" flows (e.g. tapping Buy on the paywall while logged out,
// or deep-linking to /account) return the user to where they were headed instead
// of dumping them on the home screen.
//
// Only same-origin absolute paths are allowed (must start with a single '/'),
// which blocks open-redirects to external URLs or protocol-relative '//host'.
// Hardened (A-23): the old check let `/\evil.com` through — some user agents treat
// a backslash as a slash, so `/\` behaves like `//host`. Reject backslashes and
// normalize through the URL parser, then keep ONLY the path portion (never a host),
// so even a value the parser resolves to an external host degrades to its pathname.
export const resolveAuthRedirect = (raw, fallback = '/') => {
  const value = String(raw || '').trim()
  if (!value) return fallback
  if (!value.startsWith('/')) return fallback
  if (value.startsWith('//')) return fallback
  if (value.includes('\\')) return fallback
  let parsed
  try {
    parsed = new URL(value, 'https://arcana.local')
  } catch {
    return fallback
  }
  const safe = `${parsed.pathname}${parsed.search}${parsed.hash}`
  if (!safe.startsWith('/') || safe.startsWith('//')) return fallback
  return safe
}

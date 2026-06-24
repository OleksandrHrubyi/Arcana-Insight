// Resolve a safe in-app redirect target from a route `redirect` query param, so
// that "sign in first" flows (e.g. tapping Buy on the paywall while logged out,
// or deep-linking to /account) return the user to where they were headed instead
// of dumping them on the home screen.
//
// Only same-origin absolute paths are allowed (must start with a single '/'),
// which blocks open-redirects to external URLs or protocol-relative '//host'.
export const resolveAuthRedirect = (raw, fallback = '/') => {
  const value = String(raw || '').trim()
  if (!value) return fallback
  if (!value.startsWith('/')) return fallback
  if (value.startsWith('//')) return fallback
  return value
}

// True when an invokeFunction() error means the server rejected the request as
// not-entitled (HTTP 403 / a premium_required code), as opposed to a transient
// failure. Callers should reconcile any stale local premium flag and show an
// upgrade/locked state instead of a generic error with an unwinnable retry that
// just re-hits the same 403 (QA findings #12/#13).
export const isPremiumRequiredError = (error) => {
  if (!error) return false
  if (error.status === 403) return true
  if (String(error.code || '').toLowerCase().includes('premium')) return true
  return /\b403\b/.test(String(error.message || ''))
}

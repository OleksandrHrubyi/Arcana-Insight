// @ts-nocheck
// Shared server-side premium check. Source-of-truth ordering:
//   1) user_entitlements cache (populated by the revenuecat-webhook) — fast path.
//   2) RevenueCat REST API — AUTHORITATIVE, real-time. Closes the webhook-lag gap so
//      a user who JUST purchased is recognized immediately (no "paid but blocked"
//      403). RC's app_user_id == the Supabase user id (the app calls
//      Purchases.logIn(user.id)), so we can query the subscriber directly.
//
// On a RevenueCat OUTAGE we fail OPEN, so a paying user is never blocked by our
// dependency being down — these gate AI features, not sensitive data, so the rare
// non-payer slipping through during an RC outage is the acceptable side of the
// trade. When RC answers authoritatively that there's no active entitlement, we
// fail closed (premium stays protected).

const RC_API_TIMEOUT_MS = 5000

function entitlementActive(expiresAt) {
  if (!expiresAt) return true // lifetime / non-expiring grant
  const t = Date.parse(expiresAt)
  return Number.isFinite(t) ? t > Date.now() : true
}

function hasActiveRcEntitlement(body) {
  const entitlements = body?.subscriber?.entitlements || {}
  return Object.values(entitlements).some((e) => entitlementActive(e?.expires_date))
}

async function fetchWithTimeout(url, init, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

// Authoritative real-time check against RevenueCat.
async function isPremiumViaRevenueCat(userId) {
  const key = Deno.env.get('RC_SECRET_API_KEY')
  if (!key) return false // not configured → can't verify → trust the cache's "no"

  let res
  try {
    res = await fetchWithTimeout(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
      { headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' } },
      RC_API_TIMEOUT_MS,
    )
  } catch (_e) {
    return true // RC unreachable / timeout → fail OPEN (never block a payer on our outage)
  }

  if (res.status >= 500) return true // RC server error → fail OPEN
  if (!res.ok) return false // 404 unknown subscriber / 401 etc → authoritative "not premium"

  let body
  try {
    body = await res.json()
  } catch (_e) {
    return true // malformed response → fail OPEN
  }
  return hasActiveRcEntitlement(body)
}

export async function isUserPremium(adminClient, userId) {
  if (!userId) return false

  // 1) Fast path: the webhook-populated cache.
  try {
    const { data, error } = await adminClient
      .from('user_entitlements')
      .select('is_premium, expires_at')
      .eq('user_id', userId)
      .maybeSingle()
    if (!error && data && data.is_premium && entitlementActive(data.expires_at)) {
      return true
    }
  } catch (_e) {
    // fall through to the authoritative check
  }

  // 2) Authoritative real-time check (closes the webhook-lag gap; also corrects a
  //    stale "false" cache from an out-of-order webhook event).
  return await isPremiumViaRevenueCat(userId)
}

// Enforcement is opt-in via env. Safe to enable once RC_SECRET_API_KEY is set
// (the authoritative check above means it no longer depends on the webhook having
// back-filled subscribers first).
export function premiumEnforcementEnabled() {
  return Deno.env.get('RC_ENFORCE_PREMIUM') === 'true'
}

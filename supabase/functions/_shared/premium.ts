// @ts-nocheck
// Shared server-side premium check. Reads user_entitlements (populated by the
// revenuecat-webhook function). Returns true only for an active, unexpired premium.
export async function isUserPremium(adminClient, userId) {
  if (!userId) return false
  try {
    const { data, error } = await adminClient
      .from('user_entitlements')
      .select('is_premium, expires_at')
      .eq('user_id', userId)
      .maybeSingle()
    if (error || !data || !data.is_premium) return false
    if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) return false
    return true
  } catch (_e) {
    return false
  }
}

// Enforcement is opt-in via env so the check can ship before the webhook has
// back-filled existing subscribers (avoids 403-ing paying users during rollout).
export function premiumEnforcementEnabled() {
  return Deno.env.get('RC_ENFORCE_PREMIUM') === 'true'
}

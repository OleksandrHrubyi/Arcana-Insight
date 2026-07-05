// @ts-nocheck
// Per-user daily ceiling for the AI endpoints. This is NOT the paywall
// (premium.ts is): it caps the blast radius of fail-open premium checks and
// runaway/scripted clients so one account can never drive unbounded OpenAI
// spend. Limits are generous for a human, tiny for a bot. Independent of
// RC_ENFORCE_PREMIUM — the ceiling applies even while enforcement is off.
import { notifyError } from './notify.ts'

const DEFAULT_LIMITS = {
  tarot: 30,
  personal_horoscope: 10,
  compatibility: 20,
}

const envLimit = (name, fallback) => {
  const raw = Number(Deno.env.get(name))
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : fallback
}

export function aiDailyLimit(endpoint) {
  if (endpoint === 'tarot') return envLimit('AI_DAILY_LIMIT_TAROT', DEFAULT_LIMITS.tarot)
  if (endpoint === 'personal_horoscope') {
    return envLimit('AI_DAILY_LIMIT_PERSONAL_HOROSCOPE', DEFAULT_LIMITS.personal_horoscope)
  }
  if (endpoint === 'compatibility') {
    return envLimit('AI_DAILY_LIMIT_COMPATIBILITY', DEFAULT_LIMITS.compatibility)
  }
  return 10
}

// Atomically consume one unit of today's quota (DB-side upsert, so concurrent
// requests cannot slip past the limit together). Fail-open on infra errors —
// loudly — because the counter must never block a paying user when OUR table
// hiccups; the quota is defense-in-depth, not the entitlement gate.
export async function consumeAiQuota(adminClient, userId, endpoint) {
  const limit = aiDailyLimit(endpoint)
  try {
    const { data, error } = await adminClient.rpc('increment_ai_usage', {
      p_user_id: userId,
      p_endpoint: endpoint,
      p_limit: limit,
    })
    if (error) {
      console.error(`[aiQuota] increment failed for ${endpoint} — failing open:`, error.message)
      notifyError('aiQuota: increment_ai_usage failed', `${endpoint}: ${error.message}`)
      return { allowed: true, limit, failedOpen: true }
    }
    const calls = Number(data)
    if (!Number.isFinite(calls)) {
      console.error(`[aiQuota] unexpected rpc result for ${endpoint} — failing open:`, data)
      return { allowed: true, limit, failedOpen: true }
    }
    if (calls === -1) return { allowed: false, limit }
    return { allowed: true, limit, calls }
  } catch (e) {
    console.error(`[aiQuota] exception for ${endpoint} — failing open:`, e?.message ?? e)
    notifyError('aiQuota: exception', `${endpoint}: ${e?.message ?? e}`)
    return { allowed: true, limit, failedOpen: true }
  }
}

// Give the unit back when the AI provider failed after the quota was consumed
// (a failure must not burn the user's allowance). Best-effort.
export async function refundAiQuota(adminClient, userId, endpoint) {
  try {
    await adminClient.rpc('refund_ai_usage', { p_user_id: userId, p_endpoint: endpoint })
  } catch (e) {
    console.error(`[aiQuota] refund failed for ${endpoint}:`, e?.message ?? e)
  }
}

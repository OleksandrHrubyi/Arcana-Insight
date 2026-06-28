// @ts-nocheck
// RevenueCat webhook → keeps public.user_entitlements in sync with subscription
// state. RC app_user_id == Supabase auth user id (app calls Purchases.logIn).
// Auth: RevenueCat sends the configured value in the Authorization header.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, 'content-type': 'application/json' } })

// Constant-time compare so the webhook-secret check doesn't leak via timing.
function timingSafeEqualStr(a, b) {
  const enc = new TextEncoder()
  const ab = enc.encode(String(a || ''))
  const bb = enc.encode(String(b || ''))
  if (ab.length !== bb.length) return false
  let diff = 0
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i]
  return diff === 0
}

const REVOKE_TYPES = new Set(['EXPIRATION', 'REFUND', 'SUBSCRIPTION_PAUSED'])
const isAnon = (id) => !id || String(id).startsWith('$RCAnonymousID:')

function activeFromEvent(type, expiresAt) {
  if (REVOKE_TYPES.has(type)) return false
  if (expiresAt) return new Date(expiresAt).getTime() > Date.now()
  return true // lifetime / non-renewing / no expiry on a non-revoking event
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405)

  const secret = Deno.env.get('RC_WEBHOOK_SECRET')
  if (!secret) {
    console.error('[rc-webhook] RC_WEBHOOK_SECRET not set; refusing to run')
    return json({ error: 'Server misconfigured' }, 500)
  }
  if (!timingSafeEqualStr(req.headers.get('Authorization'), secret)) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const payload = await req.json().catch(() => null)
  const event = payload?.event
  if (!event?.type) return json({ ok: true, ignored: 'no_event' })
  if (event.type === 'TEST') return json({ ok: true, test: true })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } },
  )

  const expiresAt = Number(event.expiration_at_ms) ? new Date(Number(event.expiration_at_ms)).toISOString() : null

  // Build the set of {userId, isPremium} updates this event implies.
  const updates = []
  if (event.type === 'TRANSFER') {
    for (const id of (event.transferred_to || [])) if (!isAnon(id)) updates.push({ id, premium: true })
    for (const id of (event.transferred_from || [])) if (!isAnon(id)) updates.push({ id, premium: false })
  } else if (!isAnon(event.app_user_id)) {
    updates.push({ id: event.app_user_id, premium: activeFromEvent(event.type, expiresAt) })
  }

  if (!updates.length) return json({ ok: true, ignored: 'no_mappable_user' })

  // Ordering + idempotency keys. RC delivers these on every event; fall back to
  // "now" only if a timestamp is somehow absent.
  const eventId = event.id != null ? String(event.id) : ''
  const eventTsMs = Number(event.event_timestamp_ms) || Date.now()

  // Apply each user's change through the conditional upsert RPC, so an out-of-order
  // or replayed event can't clobber a newer state (QA #26/#27). last-writer-wins is
  // gone — the DB drops anything not strictly newer / a duplicate event id.
  const results = await Promise.all(
    updates.map((u) =>
      supabase.rpc('apply_entitlement_event', {
        p_user_id: u.id,
        p_is_premium: u.premium,
        p_product_id: event.product_id ?? null,
        p_store: event.store ?? null,
        p_expires_at: u.premium ? expiresAt : (expiresAt ?? new Date().toISOString()),
        p_event_type: event.type,
        p_event_id: eventId,
        p_event_ts_ms: eventTsMs,
        p_raw: event,
      }),
    ),
  )

  const failed = results.find((r) => r.error)
  if (failed) {
    console.error('[rc-webhook] apply_entitlement_event failed', failed.error.message)
    return json({ error: 'persist_failed' }, 500)
  }

  const applied = results.filter((r) => r.data === true).length
  return json({ ok: true, applied, received: updates.length, type: event.type })
})

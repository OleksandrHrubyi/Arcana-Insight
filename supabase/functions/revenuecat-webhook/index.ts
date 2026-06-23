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
  if (req.headers.get('Authorization') !== secret) {
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

  const rows = updates.map((u) => ({
    user_id: u.id,
    is_premium: u.premium,
    product_id: event.product_id ?? null,
    store: event.store ?? null,
    expires_at: u.premium ? expiresAt : (expiresAt ?? new Date().toISOString()),
    event_type: event.type,
    updated_at: new Date().toISOString(),
    raw: event,
  }))

  const { error } = await supabase.from('user_entitlements').upsert(rows, { onConflict: 'user_id' })
  if (error) {
    console.error('[rc-webhook] upsert failed', error.message)
    return json({ error: 'persist_failed' }, 500)
  }

  return json({ ok: true, updated: rows.length, type: event.type })
})

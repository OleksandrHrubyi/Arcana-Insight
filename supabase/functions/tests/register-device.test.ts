// @ts-nocheck
// B8 (launch audit): push_devices rows are keyed by APNs token, and the token was
// the ONLY identity — anyone who learned a victim's token could disable their
// notifications or attach the device to their own account. These tests pin the
// ownership gate: claimed rows are writable only by their owner; unclaimed rows
// stay open (anonymous push is a supported flow); sign-out unlinks via "unlink".
//
// Integration-style like revenuecat-webhook.test.ts: importing the module starts
// its Deno.serve; supabase REST/auth calls are intercepted via globalThis.fetch.
//
// Run: deno test --allow-env --allow-net supabase/functions/tests/
import { assertEquals } from 'jsr:@std/assert'

const SB_HOST = 'http://sb.register.test'
Deno.env.set('SUPABASE_URL', SB_HOST)
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'service-role-test')
Deno.env.set('SUPABASE_ANON_KEY', 'anon-test')

const realFetch = globalThis.fetch

const VALID_TOKEN = 'a'.repeat(64)
const JWT_BY_USER = { 'jwt-user-x': 'user-x', 'jwt-user-y': 'user-y' }

// Mutable per-test server-side state.
let ownerOfToken = '' // '' = unclaimed row or no row
let ownerLookupFails = false
let calls = []

globalThis.fetch = async (input, init) => {
  const req = input instanceof Request ? input : new Request(String(input), init)
  const url = new URL(req.url)
  if (!req.url.startsWith(SB_HOST)) return realFetch(input, init)

  // supabase-js auth.getUser()
  if (url.pathname === '/auth/v1/user') {
    const jwt = String(req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
    const userId = JWT_BY_USER[jwt]
    if (!userId) return new Response(JSON.stringify({ message: 'invalid' }), { status: 401 })
    return new Response(JSON.stringify({ id: userId, aud: 'authenticated' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  if (url.pathname === '/rest/v1/push_devices' && req.method === 'GET') {
    calls.push({ kind: 'owner_lookup' })
    if (ownerLookupFails) return new Response('boom', { status: 500 })
    const rows = ownerOfToken === null ? [] : [{ user_id: ownerOfToken || null }]
    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  if (url.pathname === '/rest/v1/rpc/compute_next_send_at') {
    return new Response(JSON.stringify('2026-07-07T08:00:00Z'), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  if (url.pathname === '/rest/v1/push_devices' && req.method === 'POST') {
    const body = await req.json().catch(() => null)
    calls.push({ kind: 'upsert', body })
    return new Response(JSON.stringify(body), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    })
  }

  if (url.pathname === '/rest/v1/push_devices' && req.method === 'PATCH') {
    const body = await req.json().catch(() => null)
    calls.push({ kind: 'patch', query: url.search, body })
    return new Response(JSON.stringify([{ ok: true }]), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  return new Response('unexpected', { status: 500 })
}

// The webhook test already binds :8000 when the whole dir runs in one process, so
// give this server its own port if possible; Deno.serve in the module has no port
// option, so we rely on per-file isolation — see the npm script note if this flakes.
await import('../register-device/index.ts')
const BASE = 'http://localhost:8000'

const post = (body, jwt = '') =>
  realFetch(BASE, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
    body: JSON.stringify(body),
  })

const upsertBody = { token: VALID_TOKEN, platform: 'ios', apns_env: 'production', enabled: true }
const opts = { sanitizeResources: false, sanitizeOps: false }
const reset = () => {
  ownerOfToken = ''
  ownerLookupFails = false
  calls = []
}

Deno.test({ ...opts, name: 'anonymous upsert on an unclaimed row is allowed (logged-out push works)' }, async () => {
  reset()
  const res = await post(upsertBody)
  assertEquals(res.status, 200)
  const body = await res.json()
  assertEquals(body.ok, true)
  assertEquals(body.linked_user, false)
  const upsert = calls.find((c) => c.kind === 'upsert')
  assertEquals('user_id' in (upsert?.body?.[0] || {}), false)
})

Deno.test({ ...opts, name: 'authenticated upsert claims an unclaimed row with the caller id' }, async () => {
  reset()
  const res = await post(upsertBody, 'jwt-user-x')
  assertEquals(res.status, 200)
  assertEquals((await res.json()).linked_user, true)
  const upsert = calls.find((c) => c.kind === 'upsert')
  assertEquals(upsert?.body?.[0]?.user_id, 'user-x')
})

Deno.test({ ...opts, name: 'the owner keeps full access to their claimed row' }, async () => {
  reset()
  ownerOfToken = 'user-x'
  const res = await post({ ...upsertBody, enabled: false }, 'jwt-user-x')
  assertEquals(res.status, 200)
  assertEquals(calls.some((c) => c.kind === 'upsert'), true)
})

Deno.test({ ...opts, name: 'anonymous write to a claimed row is rejected (notification-suppression attack)' }, async () => {
  reset()
  ownerOfToken = 'user-x'
  const res = await post({ ...upsertBody, enabled: false })
  assertEquals(res.status, 403)
  assertEquals((await res.json()).error, 'device_owned_by_account')
  assertEquals(calls.some((c) => c.kind === 'upsert'), false)
})

Deno.test({ ...opts, name: 'another account cannot take over a claimed row' }, async () => {
  reset()
  ownerOfToken = 'user-x'
  const res = await post(upsertBody, 'jwt-user-y')
  assertEquals(res.status, 403)
  await res.body?.cancel()
  assertEquals(calls.some((c) => c.kind === 'upsert'), false)
})

Deno.test({ ...opts, name: 'ownership lookup failure fails CLOSED, not open' }, async () => {
  reset()
  ownerLookupFails = true
  const res = await post(upsertBody, 'jwt-user-x')
  assertEquals(res.status, 500)
  await res.body?.cancel()
  assertEquals(calls.some((c) => c.kind === 'upsert'), false)
})

Deno.test({ ...opts, name: 'unlink requires auth and only touches the caller-owned row' }, async () => {
  reset()
  const anon = await post({ action: 'unlink', token: VALID_TOKEN })
  assertEquals(anon.status, 401)
  await anon.body?.cancel()

  const res = await post({ action: 'unlink', token: VALID_TOKEN }, 'jwt-user-x')
  assertEquals(res.status, 200)
  assertEquals((await res.json()).ok, true)
  const patch = calls.find((c) => c.kind === 'patch')
  assertEquals(patch?.query.includes(`token=eq.${VALID_TOKEN}`), true)
  assertEquals(patch?.query.includes('user_id=eq.user-x'), true)
  assertEquals(patch?.body?.user_id, null)
})

Deno.test({ ...opts, name: 'garbage tokens are rejected before any DB access' }, async () => {
  reset()
  const res = await post({ ...upsertBody, token: 'not-a-token!' })
  assertEquals(res.status, 400)
  await res.body?.cancel()
  assertEquals(calls.length, 0)
})

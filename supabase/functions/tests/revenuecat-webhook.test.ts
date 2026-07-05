// @ts-nocheck
// B2 (launch audit): the RevenueCat webhook fills the user_entitlements cache the
// whole premium gate trusts — a parse/mapping bug silently mis-entitles users.
// Integration-style: importing the module starts its Deno.serve on :8000; we POST
// real webhook payloads to it and intercept the supabase-js REST calls by stubbing
// globalThis.fetch, asserting exactly what reaches apply_entitlement_event.
//
// Run: deno test --allow-env --allow-net supabase/functions/tests/
import { assertEquals } from 'jsr:@std/assert'

const SECRET = 'whsec_test'
Deno.env.set('RC_WEBHOOK_SECRET', SECRET)
Deno.env.set('SUPABASE_URL', 'http://sb.internal.test')
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'service-role-test')

const realFetch = globalThis.fetch

// Captures every RPC the handler issues; answers each from `rpcResults` (default:
// applied=true). Requests to the local server under test pass through.
let rpcCalls = []
let rpcResults = []
globalThis.fetch = async (input, init) => {
  const url = String(input instanceof Request ? input.url : input)
  if (url.startsWith('http://sb.internal.test')) {
    const req = input instanceof Request ? input : new Request(url, init)
    const body = await req.json().catch(() => null)
    rpcCalls.push({ url, body })
    const result = rpcResults.length ? rpcResults.shift() : { status: 200, body: 'true' }
    return new Response(result.body, {
      status: result.status,
      headers: { 'content-type': 'application/json' },
    })
  }
  return realFetch(input, init)
}

// Starts the handler's Deno.serve on the default port.
await import('../revenuecat-webhook/index.ts')
const BASE = 'http://localhost:8000'

const post = (body, { auth = SECRET } = {}) =>
  realFetch(BASE, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(auth ? { Authorization: auth } : {}) },
    body: JSON.stringify(body),
  })

const opts = { sanitizeResources: false, sanitizeOps: false }

Deno.test({ ...opts, name: 'rejects a missing or wrong webhook secret with 401' }, async () => {
  rpcCalls = []
  const noAuth = await post({ event: { type: 'INITIAL_PURCHASE', app_user_id: 'u1' } }, { auth: '' })
  assertEquals(noAuth.status, 401)
  await noAuth.body?.cancel()

  const wrong = await post({ event: { type: 'INITIAL_PURCHASE', app_user_id: 'u1' } }, { auth: 'nope' })
  assertEquals(wrong.status, 401)
  await wrong.body?.cancel()
  assertEquals(rpcCalls.length, 0)
})

Deno.test({ ...opts, name: 'TEST event acks without touching the database' }, async () => {
  rpcCalls = []
  const res = await post({ event: { type: 'TEST', app_user_id: 'u1' } })
  assertEquals(res.status, 200)
  assertEquals((await res.json()).test, true)
  assertEquals(rpcCalls.length, 0)
})

Deno.test({ ...opts, name: 'INITIAL_PURCHASE grants premium with the event expiry' }, async () => {
  rpcCalls = []
  const expMs = Date.now() + 30 * 24 * 3600 * 1000
  const res = await post({
    event: {
      id: 'evt-1',
      type: 'INITIAL_PURCHASE',
      app_user_id: 'user-42',
      product_id: 'arcana.premium.yearly',
      store: 'APP_STORE',
      expiration_at_ms: expMs,
      event_timestamp_ms: 1750000000000,
    },
  })
  assertEquals(res.status, 200)
  const body = await res.json()
  assertEquals(body.ok, true)
  assertEquals(body.applied, 1)

  assertEquals(rpcCalls.length, 1)
  assertEquals(rpcCalls[0].url.includes('/rpc/apply_entitlement_event'), true)
  const args = rpcCalls[0].body
  assertEquals(args.p_user_id, 'user-42')
  assertEquals(args.p_is_premium, true)
  assertEquals(args.p_product_id, 'arcana.premium.yearly')
  assertEquals(args.p_expires_at, new Date(expMs).toISOString())
  assertEquals(args.p_event_id, 'evt-1')
  assertEquals(args.p_event_ts_ms, 1750000000000)
})

Deno.test({ ...opts, name: 'EXPIRATION and REFUND revoke premium even with a future expiry' }, async () => {
  for (const type of ['EXPIRATION', 'REFUND']) {
    rpcCalls = []
    const res = await post({
      event: { type, app_user_id: 'user-42', expiration_at_ms: Date.now() + 3600_000 },
    })
    assertEquals(res.status, 200)
    await res.body?.cancel()
    assertEquals(rpcCalls.length, 1, `${type} must persist`)
    assertEquals(rpcCalls[0].body.p_is_premium, false, `${type} must revoke`)
  }
})

Deno.test({ ...opts, name: 'past expiry on a renewal event means not premium' }, async () => {
  rpcCalls = []
  const res = await post({
    event: { type: 'RENEWAL', app_user_id: 'user-42', expiration_at_ms: Date.now() - 1000 },
  })
  assertEquals(res.status, 200)
  await res.body?.cancel()
  assertEquals(rpcCalls[0].body.p_is_premium, false)
})

Deno.test({ ...opts, name: 'TRANSFER grants the receiver and revokes the sender, skipping anonymous ids' }, async () => {
  rpcCalls = []
  const res = await post({
    event: {
      type: 'TRANSFER',
      transferred_to: ['user-new', '$RCAnonymousID:abc'],
      transferred_from: ['user-old', '$RCAnonymousID:def'],
    },
  })
  assertEquals(res.status, 200)
  const body = await res.json()
  assertEquals(body.received, 2)
  const byUser = Object.fromEntries(rpcCalls.map((c) => [c.body.p_user_id, c.body.p_is_premium]))
  assertEquals(byUser['user-new'], true)
  assertEquals(byUser['user-old'], false)
  assertEquals(Object.keys(byUser).length, 2)
})

Deno.test({ ...opts, name: 'anonymous-only events are acked and ignored (no DB write)' }, async () => {
  rpcCalls = []
  const res = await post({
    event: { type: 'INITIAL_PURCHASE', app_user_id: '$RCAnonymousID:xyz' },
  })
  assertEquals(res.status, 200)
  assertEquals((await res.json()).ignored, 'no_mappable_user')
  assertEquals(rpcCalls.length, 0)
})

Deno.test({ ...opts, name: 'deleted-user FK failure (23503) is acked so RC stops retrying' }, async () => {
  rpcCalls = []
  rpcResults = [
    { status: 404, body: JSON.stringify({ code: '23503', message: 'violates foreign key', details: '', hint: '' }) },
  ]
  const res = await post({ event: { type: 'RENEWAL', app_user_id: 'deleted-user' } })
  assertEquals(res.status, 200)
  assertEquals((await res.json()).ignored, 'unknown_user')
})

Deno.test({ ...opts, name: 'any other persist failure returns 500 so RC retries' }, async () => {
  rpcCalls = []
  rpcResults = [
    { status: 500, body: JSON.stringify({ code: 'XX000', message: 'db exploded', details: '', hint: '' }) },
  ]
  const res = await post({ event: { type: 'RENEWAL', app_user_id: 'user-42' } })
  assertEquals(res.status, 500)
  await res.body?.cancel()
})

Deno.test({ ...opts, name: 'non-POST is rejected, junk body is acked as no_event' }, async () => {
  const get = await realFetch(BASE, { method: 'GET' })
  assertEquals(get.status, 405)
  await get.body?.cancel()

  rpcCalls = []
  const res = await post({ hello: 'world' })
  assertEquals(res.status, 200)
  assertEquals((await res.json()).ignored, 'no_event')
  assertEquals(rpcCalls.length, 0)
})

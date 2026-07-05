// @ts-nocheck
// B2 (launch audit): the server-side premium gate is the money path — these tests
// pin its contract: cache fast-path, authoritative RevenueCat check, fail-OPEN on
// RC outages (never block a paying user for our problem), fail-CLOSED only on an
// authoritative "no entitlement", and the RC_ENFORCE_PREMIUM flag semantics.
//
// Run: deno test --allow-env --allow-net supabase/functions/tests/
import { assertEquals } from 'jsr:@std/assert'
import { isUserPremium, premiumEnforcementEnabled } from '../_shared/premium.ts'

const realFetch = globalThis.fetch

// Minimal stand-in for the supabase-js admin client — only the query chain
// premium.ts actually uses (from().select().eq().maybeSingle()).
const fakeAdmin = (result) => ({
  from: () => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => result,
      }),
    }),
  }),
})

const cacheMiss = () => fakeAdmin({ data: null, error: null })

const withRcKey = async (fn) => {
  Deno.env.set('RC_SECRET_API_KEY', 'sk_test_v1')
  try {
    await fn()
  } finally {
    Deno.env.delete('RC_SECRET_API_KEY')
    globalThis.fetch = realFetch
  }
}

const stubRc = (handler) => {
  globalThis.fetch = async (url, init) => handler(String(url), init)
}

const rcJson = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

Deno.test('premiumEnforcementEnabled is true ONLY for the exact string "true"', () => {
  Deno.env.delete('RC_ENFORCE_PREMIUM')
  assertEquals(premiumEnforcementEnabled(), false)
  Deno.env.set('RC_ENFORCE_PREMIUM', 'TRUE')
  assertEquals(premiumEnforcementEnabled(), false)
  Deno.env.set('RC_ENFORCE_PREMIUM', '1')
  assertEquals(premiumEnforcementEnabled(), false)
  Deno.env.set('RC_ENFORCE_PREMIUM', 'true')
  assertEquals(premiumEnforcementEnabled(), true)
  Deno.env.delete('RC_ENFORCE_PREMIUM')
})

Deno.test('missing userId is never premium', async () => {
  assertEquals(await isUserPremium(fakeAdmin({ data: null, error: null }), ''), false)
  assertEquals(await isUserPremium(fakeAdmin({ data: null, error: null }), null), false)
})

Deno.test('cache fast-path: active non-expiring entitlement → premium, RC never called', async () => {
  let rcCalled = false
  stubRc(() => {
    rcCalled = true
    return rcJson({}, 500)
  })
  try {
    const admin = fakeAdmin({ data: { is_premium: true, expires_at: null }, error: null })
    assertEquals(await isUserPremium(admin, 'user-1'), true)
    assertEquals(rcCalled, false)
  } finally {
    globalThis.fetch = realFetch
  }
})

Deno.test('cache fast-path honors expiry: expired cache row falls through to RC', async () => {
  await withRcKey(async () => {
    let rcCalled = false
    stubRc(() => {
      rcCalled = true
      return rcJson({ subscriber: { entitlements: {} } })
    })
    const admin = fakeAdmin({
      data: { is_premium: true, expires_at: new Date(Date.now() - 60_000).toISOString() },
      error: null,
    })
    assertEquals(await isUserPremium(admin, 'user-1'), false)
    assertEquals(rcCalled, true)
  })
})

Deno.test('no RC key configured: cache miss stays not-premium (conservative)', async () => {
  Deno.env.delete('RC_SECRET_API_KEY')
  let rcCalled = false
  stubRc(() => {
    rcCalled = true
    return rcJson({})
  })
  try {
    assertEquals(await isUserPremium(cacheMiss(), 'user-1'), false)
    assertEquals(rcCalled, false)
  } finally {
    globalThis.fetch = realFetch
  }
})

Deno.test('authoritative RC yes: active entitlement → premium (queried by supabase user id)', async () => {
  await withRcKey(async () => {
    let seenUrl = ''
    let seenAuth = ''
    stubRc((url, init) => {
      seenUrl = url
      seenAuth = init?.headers?.Authorization || ''
      return rcJson({
        subscriber: {
          entitlements: {
            premium: { expires_date: new Date(Date.now() + 60_000).toISOString() },
          },
        },
      })
    })
    assertEquals(await isUserPremium(cacheMiss(), 'user-42'), true)
    assertEquals(seenUrl.includes('/v1/subscribers/user-42'), true)
    assertEquals(seenAuth, 'Bearer sk_test_v1')
  })
})

Deno.test('authoritative RC no: 2xx with no active entitlement → fail CLOSED', async () => {
  await withRcKey(async () => {
    stubRc(() => rcJson({ subscriber: { entitlements: {} } }))
    assertEquals(await isUserPremium(cacheMiss(), 'user-1'), false)

    // Expired entitlement counts as "no".
    stubRc(() =>
      rcJson({
        subscriber: {
          entitlements: {
            premium: { expires_date: new Date(Date.now() - 60_000).toISOString() },
          },
        },
      }),
    )
    assertEquals(await isUserPremium(cacheMiss(), 'user-1'), false)
  })
})

Deno.test('lifetime entitlement (no expires_date) → premium', async () => {
  await withRcKey(async () => {
    stubRc(() => rcJson({ subscriber: { entitlements: { premium: { expires_date: null } } } }))
    assertEquals(await isUserPremium(cacheMiss(), 'user-1'), true)
  })
})

Deno.test('RC outage fails OPEN: 5xx / 401 / 429 / network error → premium allowed', async () => {
  await withRcKey(async () => {
    for (const status of [500, 401, 429]) {
      stubRc(() => rcJson({ error: 'x' }, status))
      assertEquals(await isUserPremium(cacheMiss(), 'user-1'), true, `status ${status} must fail open`)
    }
    stubRc(() => {
      throw new TypeError('network down')
    })
    assertEquals(await isUserPremium(cacheMiss(), 'user-1'), true, 'network error must fail open')

    stubRc(() => new Response('not json', { status: 200 }))
    assertEquals(await isUserPremium(cacheMiss(), 'user-1'), true, 'non-JSON 2xx must fail open')
  })
})

Deno.test('cache read error falls through to the authoritative check', async () => {
  await withRcKey(async () => {
    stubRc(() => rcJson({ subscriber: { entitlements: { premium: { expires_date: null } } } }))
    const admin = {
      from: () => {
        throw new Error('db down')
      },
    }
    assertEquals(await isUserPremium(admin, 'user-1'), true)
  })
})

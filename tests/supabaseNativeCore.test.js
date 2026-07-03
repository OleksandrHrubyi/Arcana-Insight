import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

const toResponse = ({ status = 200, data = null, headers = {} } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers,
  async text() {
    if (data == null) return ''
    return typeof data === 'string' ? data : JSON.stringify(data)
  },
})

const createHarness = async ({
  supabaseUrl = 'https://project.supabase.co',
  supabaseAnonKey = 'anon',
  initialSession = null,
  shouldUseNative = false,
  responses = [],
  now = () => Date.now(),
} = {}) => {
  const { createSupabaseNativeService } = await importModule('src/services/supabaseNativeCore.js')
  let storedSession = initialSession
  const writes = []
  const calls = []

  const transport = async (url, init = {}) => {
    calls.push({ url, init })
    if (!responses.length) {
      throw new Error(`Unexpected request: ${url}`)
    }
    const next = responses.shift()
    if (next instanceof Error) throw next
    if (typeof next === 'function') {
      return next({ url, init })
    }
    return toResponse(next)
  }

  const service = createSupabaseNativeService({
    supabaseUrl,
    supabaseAnonKey,
    readStoredAccessToken: async () => storedSession?.access_token || null,
    readStoredSession: async () => storedSession,
    writeStoredSession: async (value) => {
      storedSession = value
      writes.push(value)
    },
    shouldUseNativeFetch: () => shouldUseNative,
    nativeFetch: transport,
    fetchImpl: transport,
    now,
  })

  return {
    service,
    calls,
    writes,
    getStoredSession: () => storedSession,
  }
}

test('refreshAccessTokenNative handles missing url and missing refresh token', async () => {
  const missingUrl = await createHarness({ supabaseUrl: '' })
  const r1 = await missingUrl.service.refreshAccessTokenNative()
  assert.equal(r1.error.message, 'Supabase URL missing')

  const missingToken = await createHarness({
    initialSession: { access_token: 'a' },
  })
  const r2 = await missingToken.service.refreshAccessTokenNative()
  assert.equal(r2.error.message, 'Missing refresh token')
})

test('refreshAccessTokenNative stores merged session and computes expires_at', async () => {
  const h = await createHarness({
    initialSession: {
      refresh_token: 'refresh_1',
      user: { id: 'u1' },
    },
    now: () => 1700000000000,
    responses: [
      {
        status: 200,
        data: {
          access_token: 'new_access',
          refresh_token: 'new_refresh',
          expires_in: 3600,
        },
      },
    ],
  })

  const result = await h.service.refreshAccessTokenNative()
  assert.equal(result.error, null)
  assert.equal(result.data.access_token, 'new_access')
  assert.equal(result.data.refresh_token, 'new_refresh')
  assert.equal(result.data.expires_at, 1700000000 + 3600)
  assert.deepEqual(result.data.user, { id: 'u1' })
  assert.equal(h.writes.length, 1)
  assert.match(h.calls[0].url, /\/auth\/v1\/token\?grant_type=refresh_token$/)
  assert.equal(h.calls[0].init.method, 'POST')
})

test('getUserNative returns cached user without network request', async () => {
  const h = await createHarness({
    initialSession: {
      user: { id: 'cached-user' },
      access_token: 'token',
    },
  })

  const result = await h.service.getUserNative()
  assert.equal(result.error, null)
  assert.deepEqual(result.data, { id: 'cached-user' })
  assert.equal(h.calls.length, 0)
  assert.equal(h.writes.length, 0)
})

test('getUserNative fetches user and updates stored session', async () => {
  const h = await createHarness({
    initialSession: {
      access_token: 'token',
      refresh_token: 'refresh',
    },
    responses: [
      {
        status: 200,
        data: { id: 'remote-user', email: 'u@example.com' },
      },
    ],
  })

  const result = await h.service.getUserNative()
  assert.equal(result.error, null)
  assert.equal(result.data.id, 'remote-user')
  assert.equal(h.calls.length, 1)
  assert.match(h.calls[0].url, /\/auth\/v1\/user$/)
  assert.equal(h.calls[0].init.headers.Authorization, 'Bearer token')
  assert.equal(h.writes.length, 1)
  assert.equal(h.getStoredSession().user.id, 'remote-user')
})

test('requestWithRetry refreshes token on 401 and retries request once', async () => {
  const h = await createHarness({
    initialSession: {
      access_token: 'expired_token',
      refresh_token: 'refresh_token',
    },
    responses: [
      { status: 401, data: { msg: 'unauthorized' } },
      {
        status: 200,
        data: { access_token: 'fresh_token', refresh_token: 'refresh_token_2' },
      },
      { status: 200, data: [{ id: 'u2', name: 'Nova' }] },
    ],
  })

  const result = await h.service.selectAppUser('u2', 6000, 'id,name')
  assert.equal(result.error, null)
  assert.equal(result.data.id, 'u2')
  assert.equal(h.calls.length, 3)
  assert.match(h.calls[0].url, /\/rest\/v1\/app_users/)
  assert.match(h.calls[1].url, /\/auth\/v1\/token\?grant_type=refresh_token$/)
  assert.match(h.calls[2].url, /\/rest\/v1\/app_users/)
  assert.equal(h.calls[2].init.headers.Authorization, 'Bearer fresh_token')
})

test('setSessionFromTokens writes session, fetches user, and returns final stored session', async () => {
  const h = await createHarness({
    initialSession: null,
    responses: [
      {
        status: 200,
        data: { id: 'profile-user', email: 'profile@example.com' },
      },
    ],
    now: () => 1000 * 1000,
  })

  const result = await h.service.setSessionFromTokens({
    access_token: 'a1',
    refresh_token: 'r1',
    expires_in: 60,
  })

  assert.equal(result.error, null)
  assert.equal(result.data.access_token, 'a1')
  assert.equal(result.data.user.id, 'profile-user')
  assert.equal(h.writes.length, 3)
  assert.match(h.calls[0].url, /\/auth\/v1\/user$/)
})

test('upsertAppUser sanitizes name and sends merge-duplicates header', async () => {
  const h = await createHarness({
    initialSession: { access_token: 'token' },
    responses: [{ status: 200, data: { ok: true } }, { status: 200, data: { ok: true } }],
  })

  await h.service.upsertAppUser({ id: 'u1', name: '  Selene  ' })
  await h.service.upsertAppUser({ id: 'u1', name: '   ' })

  const firstBody = JSON.parse(h.calls[0].init.body)
  const secondBody = JSON.parse(h.calls[1].init.body)
  assert.equal(firstBody.name, 'Selene')
  assert.equal('name' in secondBody, false)
  assert.equal(h.calls[0].init.headers.Prefer, 'resolution=merge-duplicates')
})

test('tarot readings endpoints return normalized arrays and map errors', async () => {
  const okHarness = await createHarness({
    initialSession: { access_token: 'token' },
    responses: [
      { status: 200, data: [{ id: 'r1' }] },
      { status: 200, data: { inserted: true } },
      { status: 200, data: { deleted: true } },
    ],
  })

  const list = await okHarness.service.selectTarotReadingsByUser('user_1')
  const insert = await okHarness.service.insertTarotReading({ q: 'test' })
  const del = await okHarness.service.deleteTarotReading('id_1')

  assert.deepEqual(list.data, [{ id: 'r1' }])
  assert.equal(insert.error, null)
  assert.equal(del.error, null)
  assert.match(okHarness.calls[0].url, /\/tarot_readings\?user_id=eq.user_1&order=created_at.desc$/)
  assert.equal(okHarness.calls[1].init.method, 'POST')
  assert.equal(okHarness.calls[2].init.method, 'DELETE')

  const failHarness = await createHarness({
    initialSession: { access_token: 'token' },
    responses: [{ status: 503, data: {} }],
  })
  const fail = await failHarness.service.selectTarotReadingsByUser('user_1')
  assert.equal(fail.error.message, 'tarot_readings select failed: 503')
})

test('selectHoroscopes and invokeFunction build correct URLs and payloads', async () => {
  const h = await createHarness({
    initialSession: { access_token: 'token' },
    responses: [
      { status: 200, data: [{ sign: 'aries' }] },
      { status: 200, data: { ok: true } },
    ],
  })

  const horoscopes = await h.service.selectHoroscopes('2026-03-25', 'uk')
  const fn = await h.service.invokeFunction('register-device', { token: 'abc' })

  assert.equal(horoscopes.error, null)
  assert.deepEqual(horoscopes.data, [{ sign: 'aries' }])
  assert.equal(fn.error, null)
  assert.match(h.calls[0].url, /\/horoscopes\?date=eq.2026-03-25&locale=eq.uk&select=sign,theme,summary,detailed$/)
  assert.match(h.calls[1].url, /\/functions\/v1\/register-device$/)
  assert.equal(h.calls[1].init.body, JSON.stringify({ token: 'abc' }))
})

test('invokeFunction maps non-OK status to error and url-missing fast-fail works', async () => {
  const missingBase = await createHarness({ supabaseUrl: '' })
  const m = await missingBase.service.invokeFunction('x', {})
  assert.equal(m.error.message, 'Supabase URL missing')

  const h = await createHarness({
    initialSession: { access_token: 'token' },
    responses: [{ status: 400, data: { error: 'bad' } }],
  })
  const fail = await h.service.invokeFunction('tarot-reading', { q: 'x' })
  assert.equal(fail.error.message, 'functions tarot-reading failed: 400')
  // Status + structured body are surfaced so callers can branch (QA #12/#13).
  assert.equal(fail.error.status, 400)
  assert.equal(fail.status, 400)
  assert.equal(fail.error.code, 'bad')
})

test('service uses nativeFetch transport when shouldUseNativeFetch=true', async () => {
  const h = await createHarness({
    shouldUseNative: true,
    initialSession: { access_token: 'token' },
    responses: [{ status: 200, data: [{ id: 'u1' }] }],
  })

  const result = await h.service.selectAppUser('u1')
  assert.equal(result.error, null)
  assert.equal(h.calls.length, 1)
})

test('refreshAccessTokenNative maps non-OK status to error', async () => {
  const h = await createHarness({
    initialSession: { refresh_token: 'refresh_1' },
    responses: [{ status: 500, data: { error: 'bad refresh' } }],
  })
  const result = await h.service.refreshAccessTokenNative()
  assert.equal(result.data, null)
  assert.equal(result.error.message, 'refresh token failed: 500')
})

test('request retry keeps original 401 outcome when refresh fails', async () => {
  const h = await createHarness({
    initialSession: { access_token: 'expired_token' },
    responses: [{ status: 401, data: { message: 'unauthorized' } }],
  })
  const result = await h.service.selectAppUser('u1')
  assert.equal(result.data, null)
  assert.equal(result.error.message, 'app_users select failed: 401')
  assert.equal(h.calls.length, 1)
})

test('getUserNative maps non-OK status to auth error', async () => {
  const h = await createHarness({
    initialSession: { access_token: 'token' },
    responses: [{ status: 403, data: { msg: 'forbidden' } }],
  })
  const result = await h.service.getUserNative()
  assert.equal(result.data, null)
  assert.equal(result.error.message, 'auth user failed: 403')
})

test('select/upsert endpoints map non-OK statuses to errors', async () => {
  const selectFail = await createHarness({
    initialSession: { access_token: 'token' },
    responses: [{ status: 500, data: {} }],
  })
  const s = await selectFail.service.selectAppUser('u1')
  assert.equal(s.error.message, 'app_users select failed: 500')

  const upsertFail = await createHarness({
    initialSession: { access_token: 'token' },
    responses: [{ status: 409, data: {} }],
  })
  const u = await upsertFail.service.upsertAppUser({ id: 'u1', name: 'Nova' })
  assert.equal(u.error.message, 'app_users upsert failed: 409')
})

test('tarot reading insert/delete map non-OK statuses to errors', async () => {
  const insertFail = await createHarness({
    initialSession: { access_token: 'token' },
    responses: [{ status: 422, data: {} }],
  })
  const i = await insertFail.service.insertTarotReading({ question: 'q' })
  assert.equal(i.error.message, 'tarot_readings insert failed: 422')

  const deleteFail = await createHarness({
    initialSession: { access_token: 'token' },
    responses: [{ status: 404, data: {} }],
  })
  const d = await deleteFail.service.deleteTarotReading('missing')
  assert.equal(d.error.message, 'tarot_readings delete failed: 404')
})

test('selectHoroscopes maps non-OK status and normalizes non-array payload', async () => {
  const failHarness = await createHarness({
    initialSession: { access_token: 'token' },
    responses: [{ status: 503, data: {} }],
  })
  const fail = await failHarness.service.selectHoroscopes('2026-03-25', 'uk')
  assert.equal(fail.error.message, 'horoscopes select failed: 503')

  const normalizeHarness = await createHarness({
    initialSession: { access_token: 'token' },
    responses: [{ status: 200, data: { sign: 'aries' } }],
  })
  const normalized = await normalizeHarness.service.selectHoroscopes('2026-03-25', 'uk')
  assert.deepEqual(normalized.data, [])
})

test('invokeFunction returns plain text when backend response is not JSON', async () => {
  const h = await createHarness({
    initialSession: { access_token: 'token' },
    responses: [{ status: 200, data: 'plain-text-response' }],
  })
  const result = await h.service.invokeFunction('plain', { ok: true })
  assert.equal(result.error, null)
  assert.equal(result.data, 'plain-text-response')
})

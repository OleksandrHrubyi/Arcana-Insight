import { notifyError, notifyInfo } from '../_shared/notify.ts'

type DueRow = {
  token: string
  apns_env: 'sandbox' | 'production'
  locale: string | null
  user_id?: string | null
}

// Localized zodiac names for sign-aware push titles (no static i18n in edge fns).
const ZODIAC_NAMES: Record<'en' | 'uk', Record<string, string>> = {
  en: {
    aries: 'Aries', taurus: 'Taurus', gemini: 'Gemini', cancer: 'Cancer',
    leo: 'Leo', virgo: 'Virgo', libra: 'Libra', scorpio: 'Scorpio',
    sagittarius: 'Sagittarius', capricorn: 'Capricorn', aquarius: 'Aquarius', pisces: 'Pisces',
  },
  uk: {
    aries: 'Овен', taurus: 'Телець', gemini: 'Близнюки', cancer: 'Рак',
    leo: 'Лев', virgo: 'Діва', libra: 'Терези', scorpio: 'Скорпіон',
    sagittarius: 'Стрілець', capricorn: 'Козоріг', aquarius: 'Водолій', pisces: 'Риби',
  },
}

type PushFailure = {
  token: string
  status: number
  reason: string | null
  body: string
}

function json(res: unknown, status = 200) {
  return new Response(JSON.stringify(res, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

function requireEnv(name: string): string {
  const v = Deno.env.get(name)
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

const FETCH_TIMEOUT_MS = 10000

// Deno fetch has no default timeout; a stalled APNs/Supabase connection would
// otherwise hang the worker indefinitely.
async function fetchWithTimeout(url: string, opts: RequestInit, ms = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(`timeout after ${ms}ms`), ms)
  try {
    return await fetch(url, { ...opts, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

function b64url(bytes: Uint8Array) {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  const b64 = btoa(s)
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function utf8(str: string) {
  return new TextEncoder().encode(str)
}

function pemToDerPkcs8(pem: string): ArrayBuffer {
  const normalized = pem.replace(/\\n/g, '\n')
  const base64 = normalized
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '')
  const raw = atob(base64)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes.buffer
}

async function importApnsPrivateKey(p8Pem: string): Promise<CryptoKey> {
  const der = pemToDerPkcs8(p8Pem)
  return await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )
}

async function makeApnsJwt(params: { teamId: string; keyId: string; p8: string }) {
  const key = await importApnsPrivateKey(params.p8)
  const header = { alg: 'ES256', kid: params.keyId }
  const now = Math.floor(Date.now() / 1000)
  const payload = { iss: params.teamId, iat: now }

  const encHeader = b64url(utf8(JSON.stringify(header)))
  const encPayload = b64url(utf8(JSON.stringify(payload)))
  const data = utf8(`${encHeader}.${encPayload}`)

  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, data)

  return `${encHeader}.${encPayload}.${b64url(new Uint8Array(sig))}`
}

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function hostForEnv(env: 'sandbox' | 'production') {
  return env === 'production' ? 'https://api.push.apple.com' : 'https://api.sandbox.push.apple.com'
}

function parseApnsReason(bodyText: string): string | null {
  try {
    const j = JSON.parse(bodyText)
    return typeof j?.reason === 'string' ? j.reason : null
  } catch {
    return null
  }
}

function isInvalidTokenFailure(status: number, reason: string | null) {
  if (status === 410) return true
  if (status === 400 && reason === 'BadDeviceToken') return true
  if (status === 400 && reason === 'Unregistered') return true
  return false
}

function shouldRetryInAlternateEnv(status: number, reason: string | null) {
  return status === 400 && reason === 'BadDeviceToken'
}

function uniqTokens(tokens: string[]) {
  return [...new Set(tokens)]
}

async function disableTokensInDb(params: {
  supabaseUrl: string
  serviceRole: string
  tokens: string[]
}) {
  const { supabaseUrl, serviceRole, tokens } = params
  if (!tokens.length) return 0

  const chunkSize = 50
  let disabled = 0

  for (let i = 0; i < tokens.length; i += chunkSize) {
    const batch = tokens.slice(i, i + chunkSize)
    const inFilter = `in.(${batch.join(',')})`
    const url = `${supabaseUrl}/rest/v1/push_devices?token=${inFilter}`

    const res = await fetchWithTimeout(url, {
      method: 'PATCH',
      headers: {
        apikey: serviceRole,
        authorization: `Bearer ${serviceRole}`,
        'content-type': 'application/json',
        prefer: 'return=minimal',
      },
      body: JSON.stringify({
        enabled: false,
        last_seen_at: new Date().toISOString(),
      }),
    })

    if (res.ok) disabled += batch.length
  }

  return disabled
}

async function updateTokensEnvInDb(params: {
  supabaseUrl: string
  serviceRole: string
  tokens: string[]
  apnsEnv: 'sandbox' | 'production'
}) {
  const { supabaseUrl, serviceRole, tokens, apnsEnv } = params
  if (!tokens.length) return 0

  const chunkSize = 50
  let updated = 0

  for (let i = 0; i < tokens.length; i += chunkSize) {
    const batch = tokens.slice(i, i + chunkSize)
    const inFilter = `in.(${batch.join(',')})`
    const url = `${supabaseUrl}/rest/v1/push_devices?token=${inFilter}`

    const res = await fetchWithTimeout(url, {
      method: 'PATCH',
      headers: {
        apikey: serviceRole,
        authorization: `Bearer ${serviceRole}`,
        'content-type': 'application/json',
        prefer: 'return=minimal',
      },
      body: JSON.stringify({
        apns_env: apnsEnv,
        last_seen_at: new Date().toISOString(),
      }),
    })

    if (res.ok) updated += batch.length
  }

  return updated
}

async function rpcPushMarkSent(params: {
  supabaseUrl: string
  serviceRole: string
  tokens: string[]
}) {
  if (!params.tokens.length) return 0

  const url = `${params.supabaseUrl}/rest/v1/rpc/push_mark_sent`
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      apikey: params.serviceRole,
      authorization: `Bearer ${params.serviceRole}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ p_tokens: params.tokens }),
  })

  if (!res.ok) return 0

  const n = await res.json().catch(() => 0)
  return Number(n) || 0
}

async function fetchDue(params: { supabaseUrl: string; serviceRole: string; limit: number }) {
  const nowIso = new Date().toISOString()
  const headers = {
    apikey: params.serviceRole,
    authorization: `Bearer ${params.serviceRole}`,
  }
  const buildUrl = (select: string) => {
    const qs = new URLSearchParams()
    qs.set('select', select)
    qs.set('enabled', 'eq.true')
    qs.set('platform', 'eq.ios')
    qs.set('or', `(next_send_at.lte.${nowIso},next_send_at.is.null)`)
    qs.set('order', 'next_send_at.asc')
    qs.set('limit', String(params.limit))
    return `${params.supabaseUrl}/rest/v1/push_devices?${qs.toString()}`
  }

  // Prefer fetching user_id (for sign-aware push); fall back if the column is
  // absent in this deployment (register-device handles the same possibility).
  let res = await fetchWithTimeout(buildUrl('token,apns_env,locale,user_id'), { headers })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    if (res.status === 400 && t.toLowerCase().includes('user_id')) {
      res = await fetchWithTimeout(buildUrl('token,apns_env,locale'), { headers })
    } else {
      throw new Error(`fetchDue failed: ${res.status} ${t}`)
    }
  }
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`fetchDue failed: ${res.status} ${t}`)
  }

  return (await res.json()) as DueRow[]
}

// Resolve zodiac sign per user for sign-aware push. Best-effort: any failure
// (column/table issues) yields an empty map → generic (non-personalized) push.
async function fetchSignsByUser(params: {
  supabaseUrl: string
  serviceRole: string
  userIds: string[]
}): Promise<Record<string, string>> {
  const ids = [...new Set(params.userIds.filter(Boolean))]
  if (!ids.length) return {}
  try {
    const qs = new URLSearchParams()
    qs.set('select', 'id,zodiac_sign')
    qs.set('id', `in.(${ids.join(',')})`)
    const url = `${params.supabaseUrl}/rest/v1/app_users?${qs.toString()}`
    const res = await fetchWithTimeout(url, {
      headers: {
        apikey: params.serviceRole,
        authorization: `Bearer ${params.serviceRole}`,
      },
    })
    if (!res.ok) return {}
    const rows = (await res.json().catch(() => [])) as Array<{ id?: string; zodiac_sign?: string }>
    const map: Record<string, string> = {}
    for (const r of rows) {
      const sign = String(r?.zodiac_sign || '').toLowerCase().trim()
      if (r?.id && ZODIAC_NAMES.en[sign]) map[String(r.id)] = sign
    }
    return map
  } catch {
    return {}
  }
}

async function sendApns(params: {
  host: string
  tokens: string[]
  jwt: string
  bundleId: string
  payload: unknown
}) {
  const batches = chunk(params.tokens, 50)

  let okCount = 0
  const invalidTokens: string[] = []
  const failures: PushFailure[] = []
  const successTokens: string[] = []

  for (const batch of batches) {
    const results = await Promise.all(
      batch.map(async (token) => {
        const url = `${params.host}/3/device/${token}`
        try {
          const res = await fetchWithTimeout(url, {
            method: 'POST',
            headers: {
              authorization: `bearer ${params.jwt}`,
              'apns-topic': params.bundleId,
              'apns-push-type': 'alert',
              'apns-priority': '10',
              'content-type': 'application/json',
            },
            body: JSON.stringify(params.payload),
          })

          if (res.ok)
            return {
              token,
              ok: true as const,
              status: res.status,
              body: '',
              reason: null as string | null,
            }

          const text = await res.text().catch(() => '')
          const reason = parseApnsReason(text)
          return { token, ok: false as const, status: res.status, body: text, reason }
        } catch (err) {
          // Network error / timeout — record as a failure so one bad send can't
          // reject Promise.all and abort the whole batch.
          return {
            token,
            ok: false as const,
            status: 0,
            body: String((err as Error)?.message ?? err),
            reason: 'network_error' as string | null,
          }
        }
      }),
    )

    for (const r of results) {
      if (r.ok) {
        okCount++
        successTokens.push(r.token)
      } else {
        failures.push({ token: r.token, status: r.status, reason: r.reason, body: r.body })
        if (isInvalidTokenFailure(r.status, r.reason)) invalidTokens.push(r.token)
      }
    }
  }

  return { okCount, invalidTokens: uniqTokens(invalidTokens), failures, successTokens }
}

async function sendWithEnvFallback(params: {
  env: 'sandbox' | 'production'
  tokens: string[]
  jwt: string
  bundleId: string
  payload: unknown
}) {
  const primary = await sendApns({
    host: hostForEnv(params.env),
    tokens: params.tokens,
    jwt: params.jwt,
    bundleId: params.bundleId,
    payload: params.payload,
  })

  const retryCandidates = uniqTokens(
    primary.failures
      .filter((f) => shouldRetryInAlternateEnv(f.status, f.reason))
      .map((f) => f.token),
  )

  if (!retryCandidates.length) {
    return {
      okCount: primary.okCount,
      invalidTokens: primary.invalidTokens,
      failures: primary.failures,
      successTokens: primary.successTokens,
      movedTokens: [] as string[],
      movedToEnv: null as 'sandbox' | 'production' | null,
    }
  }

  const retrySet = new Set(retryCandidates)
  const alternateEnv: 'sandbox' | 'production' =
    params.env === 'production' ? 'sandbox' : 'production'

  const retry = await sendApns({
    host: hostForEnv(alternateEnv),
    tokens: retryCandidates,
    jwt: params.jwt,
    bundleId: params.bundleId,
    payload: params.payload,
  })

  const remainingPrimaryFailures = primary.failures.filter((f) => !retrySet.has(f.token))
  const primaryInvalidWithoutRetry = primary.invalidTokens.filter((t) => !retrySet.has(t))

  const movedTokens = retry.successTokens
  const allSuccessTokens = uniqTokens([...primary.successTokens, ...retry.successTokens])
  const allInvalidTokens = uniqTokens([...primaryInvalidWithoutRetry, ...retry.invalidTokens])
  const allFailures = [...remainingPrimaryFailures, ...retry.failures]

  return {
    okCount: primary.okCount + retry.okCount,
    invalidTokens: allInvalidTokens,
    failures: allFailures,
    successTokens: allSuccessTokens,
    movedTokens,
    movedToEnv: movedTokens.length ? alternateEnv : null,
  }
}

function dayOfYearUtc(date: Date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0)
  const now = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  return Math.floor((now - start) / 86400000)
}

function isoWeekdayUtc(dateIso: string) {
  const day = new Date(`${dateIso}T00:00:00.000Z`).getUTCDay()
  return day === 0 ? 7 : day
}

function pickDailyContent(locale: string | null, dateIso: string, signKey = '') {
  const isEn = (locale || '').toLowerCase() === 'en'
  const weekday = isoWeekdayUtc(dateIso)
  const dayNumber = dayOfYearUtc(new Date(`${dateIso}T00:00:00.000Z`))
  const tarotFocus = dayNumber % 2 === 0 ? 'self' : 'future'

  const contentByWeekday = isEn
    ? {
        1: {
          title: 'Arcana',
          body: 'Start the week with your career horoscope.',
          route: 'horoscope',
          path: '/horoscope',
          contentType: 'horoscope_career',
          theme: 'career',
        },
        2: {
          title: 'Arcana',
          body: 'Your card of the day is ready. Tap to reveal it.',
          route: 'daily',
          path: '/daily',
          contentType: 'daily_card',
        },
        3: {
          title: 'Arcana',
          body: 'Take a short tarot check-in for clarity today.',
          route: 'tarot',
          path: '/tarot',
          contentType: 'tarot_checkin',
          focus: tarotFocus,
        },
        4: {
          title: 'Arcana',
          body: 'Open your love horoscope for today.',
          route: 'horoscope',
          path: '/horoscope',
          contentType: 'horoscope_love',
          theme: 'love',
        },
        5: {
          title: 'Arcana',
          body: 'Your daily card is waiting. Keep your streak alive.',
          route: 'daily',
          path: '/daily',
          contentType: 'daily_card_streak',
        },
        6: {
          title: 'Arcana',
          body: 'Weekend tarot guidance is ready.',
          route: 'tarot',
          path: '/tarot',
          contentType: 'tarot_weekend',
          focus: 'future',
        },
        7: {
          title: 'Arcana',
          body: 'Close the week with your daily reflection card.',
          route: 'daily',
          path: '/daily',
          contentType: 'daily_reflection',
        },
      }
    : {
        1: {
          title: 'Arcana',
          body: 'Почни тиждень із карʼєрного гороскопу.',
          route: 'horoscope',
          path: '/horoscope',
          contentType: 'horoscope_career',
          theme: 'career',
        },
        2: {
          title: 'Arcana',
          body: 'Ваша карта дня вже готова. Натисніть, щоб відкрити.',
          route: 'daily',
          path: '/daily',
          contentType: 'daily_card',
        },
        3: {
          title: 'Arcana',
          body: 'Зроби короткий tarot check-in, щоб навести фокус.',
          route: 'tarot',
          path: '/tarot',
          contentType: 'tarot_checkin',
          focus: tarotFocus,
        },
        4: {
          title: 'Arcana',
          body: 'Відкрий свій любовний гороскоп на сьогодні.',
          route: 'horoscope',
          path: '/horoscope',
          contentType: 'horoscope_love',
          theme: 'love',
        },
        5: {
          title: 'Arcana',
          body: 'Карта дня чекає. Підтримай свій streak.',
          route: 'daily',
          path: '/daily',
          contentType: 'daily_card_streak',
        },
        6: {
          title: 'Arcana',
          body: 'Готова tarot-підказка на вихідні.',
          route: 'tarot',
          path: '/tarot',
          contentType: 'tarot_weekend',
          focus: 'future',
        },
        7: {
          title: 'Arcana',
          body: 'Заверши тиждень картою щоденної рефлексії.',
          route: 'daily',
          path: '/daily',
          contentType: 'daily_reflection',
        },
      }

  const content =
    contentByWeekday[weekday as 1 | 2 | 3 | 4 | 5 | 6 | 7] ||
    (isEn
      ? {
          title: 'Arcana',
          body: 'Your card of the day is ready. Tap to reveal it.',
          route: 'daily',
          path: '/daily',
          contentType: 'daily_card',
        }
      : {
          title: 'Arcana',
          body: 'Ваша карта дня вже готова. Натисніть, щоб відкрити.',
          route: 'daily',
          path: '/daily',
          contentType: 'daily_card',
        })

  // Sign-aware: personalize the notification title with the user's zodiac sign
  // when known (e.g. "Virgo" / "Діва" instead of the generic "Arcana").
  const signName = signKey ? ZODIAC_NAMES[isEn ? 'en' : 'uk']?.[signKey] : ''
  if (signName) return { ...content, title: signName }
  return content
}

Deno.serve(async (req) => {
  try {
    // Require the admin secret — never run unauthenticated (an unset secret used
    // to leave the worker fully open to anyone triggering a push blast).
    const adminSecret = Deno.env.get('ADMIN_PUSH_SECRET')
    if (!adminSecret) {
      console.error('[push-worker] ADMIN_PUSH_SECRET is not set; refusing to run')
      return json({ error: 'Server misconfigured' }, 500)
    }
    if (req.headers.get('x-push-secret') !== adminSecret) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const SUPABASE_URL = requireEnv('SUPABASE_URL')
    const SERVICE_ROLE = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

    const APNS_TEAM_ID = requireEnv('APNS_TEAM_ID')
    const APNS_KEY_ID = requireEnv('APNS_KEY_ID')
    const APNS_BUNDLE_ID = requireEnv('APNS_BUNDLE_ID')
    const APNS_P8 = requireEnv('APNS_P8')

    const jwt = await makeApnsJwt({ teamId: APNS_TEAM_ID, keyId: APNS_KEY_ID, p8: APNS_P8 })

    const due = await fetchDue({ supabaseUrl: SUPABASE_URL, serviceRole: SERVICE_ROLE, limit: 500 })

    if (!due.length) return json({ ok: true, due: 0, sent: 0 })

    // Resolve a zodiac sign per device (best-effort) for sign-aware titles.
    const signByUser = await fetchSignsByUser({
      supabaseUrl: SUPABASE_URL,
      serviceRole: SERVICE_ROLE,
      userIds: due.map((row) => String(row.user_id || '')).filter(Boolean),
    })

    // групуємо: env -> locale -> sign -> tokens (sign '' = generic message)
    const buckets = new Map<string, string[]>()
    for (const row of due) {
      const env = row.apns_env || 'sandbox'
      const loc = (row.locale || 'uk').toLowerCase()
      const sign = signByUser[String(row.user_id || '')] || ''
      const key = `${env}__${loc}__${sign}`
      if (!buckets.has(key)) buckets.set(key, [])
      buckets.get(key)!.push(row.token)
    }

    let totalSent = 0
    let totalDisabled = 0
    let totalMarked = 0
    let totalEnvCorrected = 0
    const sampleFailures: any[] = []

    for (const [key, tokens] of buckets.entries()) {
      const [env, loc, sign] = key.split('__') as ['sandbox' | 'production', string, string]
      const dateIso = new Date().toISOString().slice(0, 10)
      const msg = pickDailyContent(loc, dateIso, sign)
      const payload = {
        aps: { alert: { title: msg.title, body: msg.body }, sound: 'default' },
        route: msg.route,
        path: msg.path,
        date: dateIso,
        theme: msg.theme || '',
        focus: msg.focus || '',
        source: 'push_daily_reminder',
        entry: 'push_notification',
        content_type: msg.contentType,
      }

      const { okCount, invalidTokens, failures, successTokens, movedTokens, movedToEnv } =
        await sendWithEnvFallback({
          env,
          tokens,
          jwt,
          bundleId: APNS_BUNDLE_ID,
          payload,
        })

      totalSent += okCount

      if (movedTokens.length && movedToEnv) {
        totalEnvCorrected += await updateTokensEnvInDb({
          supabaseUrl: SUPABASE_URL,
          serviceRole: SERVICE_ROLE,
          tokens: movedTokens,
          apnsEnv: movedToEnv,
        })
      }

      // вимкнути мертві
      totalDisabled += await disableTokensInDb({
        supabaseUrl: SUPABASE_URL,
        serviceRole: SERVICE_ROLE,
        tokens: invalidTokens,
      })

      totalMarked += await rpcPushMarkSent({
        supabaseUrl: SUPABASE_URL,
        serviceRole: SERVICE_ROLE,
        tokens: successTokens,
      })

      for (const f of failures.slice(0, 3)) sampleFailures.push({ env, locale: loc, ...f })
    }

    // Only ping on a run that actually did something — this worker runs often and
    // most runs have nothing due, which would otherwise flood the group.
    if (totalSent > 0 || totalDisabled > 0) {
      notifyInfo('push-worker: sent', `sent ${totalSent} · disabled ${totalDisabled} · due ${due.length}`)
    }
    return json({
      ok: true,
      due: due.length,
      sent: totalSent,
      disabled: totalDisabled,
      marked_next: totalMarked,
      env_corrected: totalEnvCorrected,
      sampleFailures,
    })
  } catch (e) {
    notifyError('push-worker: failed', String(e?.message ?? e).slice(0, 400))
    return json({ error: String(e?.message ?? e) }, 500)
  }
})

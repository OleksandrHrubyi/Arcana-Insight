// supabase/functions/send-broadcast/index.ts

type ReqBody = {
  title?: string
  body?: string
  date?: string // "YYYY-MM-DD"
  locale?: string // optional filter
  platform?: string // default "ios"
  apns?: 'sandbox' | 'production' // OPTIONAL: якщо не вкажеш — пошле в обидва
  route?: 'horoscope' | 'daily' | 'menu'
  path?: string
  limit?: number
  dryRun?: boolean
}

type PushFailure = {
  token: string
  status: number
  body: string
  reason: string | null
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
  // підтримка коли p8 лежить у secret з \n
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

// --- APNs reason helpers ---
function parseApnsReason(bodyText: string): string | null {
  try {
    const j = JSON.parse(bodyText)
    return typeof j?.reason === 'string' ? j.reason : null
  } catch {
    return null
  }
}

function isInvalidTokenFailure(status: number, reason: string | null) {
  // Вимикаємо токени, які точно більше не працюють
  if (status === 410) return true // Unregistered (часто без JSON body)
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

function hostForEnv(env: 'sandbox' | 'production') {
  return env === 'production' ? 'https://api.push.apple.com' : 'https://api.sandbox.push.apple.com'
}

// --- DB: fetch tokens ---
async function fetchTokens(params: {
  supabaseUrl: string
  serviceRole: string
  platform: string
  locale?: string
  apns_env: 'sandbox' | 'production'
  limit?: number
}) {
  const qs = new URLSearchParams()
  qs.set('select', 'token')
  qs.set('enabled', 'eq.true')
  qs.set('platform', `eq.${params.platform}`)
  qs.set('token', 'not.is.null')
  qs.set('apns_env', `eq.${params.apns_env}`)
  if (params.locale) qs.set('locale', `eq.${params.locale}`)
  if (params.limit && params.limit > 0) qs.set('limit', String(params.limit))

  const url = `${params.supabaseUrl}/rest/v1/push_devices?${qs.toString()}`
  const res = await fetch(url, {
    headers: {
      apikey: params.serviceRole,
      authorization: `Bearer ${params.serviceRole}`,
    },
  })

  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Fetch tokens failed (${res.status}): ${t}`)
  }

  const rows: Array<{ token: string }> = await res.json()
  return rows.map((r) => r.token).filter(Boolean)
}

// --- DB: disable invalid tokens ---
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

    // PostgREST IN filter: token=in.(a,b,c)
    // токени hex → безпечні для цього формату
    const inFilter = `in.(${batch.join(',')})`
    const url = `${supabaseUrl}/rest/v1/push_devices?token=${inFilter}`

    const res = await fetch(url, {
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
    else {
      const t = await res.text().catch(() => '')
      console.log('[push] disableTokensInDb failed', res.status, t)
    }
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

    const res = await fetch(url, {
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

// --- APNs send ---
async function sendToApns(params: {
  host: string
  tokens: string[]
  jwt: string
  bundleId: string
  payload: unknown
}) {
  const batchSize = 50
  const batches = chunk(params.tokens, batchSize)

  let okCount = 0
  const failures: PushFailure[] = []
  const invalidTokens: string[] = []
  const successTokens: string[] = []

  for (const batch of batches) {
    const results = await Promise.all(
      batch.map(async (token) => {
        const url = `${params.host}/3/device/${token}`
        const res = await fetch(url, {
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

        if (res.ok) {
          return {
            token,
            ok: true as const,
            status: res.status,
            body: '',
            reason: null as string | null,
          }
        }

        const text = await res.text().catch(() => '')
        const reason = parseApnsReason(text)
        return { token, ok: false as const, status: res.status, body: text, reason }
      }),
    )

    for (const r of results) {
      if (r.ok) {
        okCount++
        successTokens.push(r.token)
        continue
      }

      failures.push({ token: r.token, status: r.status, body: r.body, reason: r.reason })

      if (isInvalidTokenFailure(r.status, r.reason)) {
        invalidTokens.push(r.token)
      }
    }
  }

  return { okCount, failures, invalidTokens: uniqTokens(invalidTokens), successTokens }
}

async function sendWithEnvFallback(params: {
  env: 'sandbox' | 'production'
  tokens: string[]
  jwt: string
  bundleId: string
  payload: unknown
}) {
  const primary = await sendToApns({
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
      failures: primary.failures,
      invalidTokens: primary.invalidTokens,
      successTokens: primary.successTokens,
      movedTokens: [] as string[],
      movedToEnv: null as 'sandbox' | 'production' | null,
    }
  }

  const retrySet = new Set(retryCandidates)
  const alternateEnv: 'sandbox' | 'production' =
    params.env === 'production' ? 'sandbox' : 'production'

  const retry = await sendToApns({
    host: hostForEnv(alternateEnv),
    tokens: retryCandidates,
    jwt: params.jwt,
    bundleId: params.bundleId,
    payload: params.payload,
  })

  const remainingPrimaryFailures = primary.failures.filter((f) => !retrySet.has(f.token))
  const primaryInvalidWithoutRetry = primary.invalidTokens.filter((t) => !retrySet.has(t))

  const movedTokens = retry.successTokens
  const allFailures = [...remainingPrimaryFailures, ...retry.failures]
  const allInvalidTokens = uniqTokens([...primaryInvalidWithoutRetry, ...retry.invalidTokens])
  const allSuccessTokens = uniqTokens([...primary.successTokens, ...retry.successTokens])

  return {
    okCount: primary.okCount + retry.okCount,
    failures: allFailures,
    invalidTokens: allInvalidTokens,
    successTokens: allSuccessTokens,
    movedTokens,
    movedToEnv: movedTokens.length ? alternateEnv : null,
  }
}

Deno.serve(async (req) => {
  try {
    // simple auth for manual calls
    const adminSecret = Deno.env.get('ADMIN_PUSH_SECRET')
    const got = req.headers.get('x-push-secret')
    if (!adminSecret || got !== adminSecret) return json({ error: 'Unauthorized' }, 401)

    const body: ReqBody = await req.json().catch(() => ({}))

    const title = body.title ?? 'Arcana'
    const msg = body.body ?? 'Гороскоп дня вже готовий ✨'
    const date = body.date ?? new Date().toISOString().slice(0, 10)
    const route = body.route ?? 'horoscope'
    const path =
      body.path ?? (route === 'daily' ? '/daily' : route === 'menu' ? '/menu' : '/horoscope')
    const locale = body.locale
    const platform = body.platform ?? 'ios'
    const limit = body.limit ?? 0
    const dryRun = !!body.dryRun

    const envs: Array<'sandbox' | 'production'> = body.apns
      ? [body.apns]
      : ['sandbox', 'production']

    const SUPABASE_URL = requireEnv('SUPABASE_URL')
    const SERVICE_ROLE = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

    const APNS_TEAM_ID = requireEnv('APNS_TEAM_ID')
    const APNS_KEY_ID = requireEnv('APNS_KEY_ID')
    const APNS_BUNDLE_ID = requireEnv('APNS_BUNDLE_ID')
    const APNS_P8 = requireEnv('APNS_P8')

    const jwt = await makeApnsJwt({ teamId: APNS_TEAM_ID, keyId: APNS_KEY_ID, p8: APNS_P8 })

    const payload = {
      aps: {
        alert: { title, body: msg },
        sound: 'default',
      },
      route,
      path,
      date,
    }

    const counts: Record<string, unknown> = {}
    const sampleFailures: Array<{
      env: string
      token: string
      status: number
      reason: string | null
      body: string
    }> = []

    let totalSent = 0
    let totalFailed = 0
    let totalDisabled = 0
    let totalEnvCorrected = 0

    for (const env of envs) {
      const tokens = await fetchTokens({
        supabaseUrl: SUPABASE_URL,
        serviceRole: SERVICE_ROLE,
        platform,
        locale,
        apns_env: env,
        limit,
      })

      if (dryRun) {
        counts[env] = { tokens: tokens.length }
        continue
      }

      const { okCount, failures, invalidTokens, movedTokens, movedToEnv } =
        await sendWithEnvFallback({
          env,
          tokens,
          jwt,
          bundleId: APNS_BUNDLE_ID,
          payload,
        })

      if (movedTokens.length && movedToEnv) {
        totalEnvCorrected += await updateTokensEnvInDb({
          supabaseUrl: SUPABASE_URL,
          serviceRole: SERVICE_ROLE,
          tokens: movedTokens,
          apnsEnv: movedToEnv,
        })
      }

      const disabledNow = await disableTokensInDb({
        supabaseUrl: SUPABASE_URL,
        serviceRole: SERVICE_ROLE,
        tokens: invalidTokens,
      })

      totalSent += okCount
      totalFailed += failures.length
      totalDisabled += disabledNow

      counts[env] = {
        tokens: tokens.length,
        sent: okCount,
        failed: failures.length,
        invalid_tokens: invalidTokens.length,
        disabled: disabledNow,
        env_corrected: movedTokens.length,
      }

      for (const f of failures.slice(0, 10)) {
        sampleFailures.push({
          env,
          token: f.token,
          status: f.status,
          reason: f.reason,
          body: f.body,
        })
      }
    }

    if (dryRun) {
      return json({
        ok: true,
        dryRun: true,
        envs,
        locale: locale ?? 'ALL',
        platform,
        counts,
      })
    }

    return json({
      ok: true,
      envs,
      sent: totalSent,
      failed: totalFailed,
      disabled: totalDisabled,
      env_corrected: totalEnvCorrected,
      locale: locale ?? 'ALL',
      platform,
      counts,
      sampleFailures,
    })
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500)
  }
})

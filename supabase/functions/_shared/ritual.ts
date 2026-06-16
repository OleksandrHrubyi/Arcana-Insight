export const RITUAL_ACTIVITY_KEYS = ['daily_card', 'horoscope', 'tarot'] as const
export type RitualActivityKey = (typeof RITUAL_ACTIVITY_KEYS)[number]

export const ACTIVITY_POINTS = 10
export const FULL_DAY_BONUS_POINTS = 20

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
      'access-control-allow-methods': 'POST, OPTIONS',
    },
  })

export const readJsonSafe = async (res: Response) => {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export const extractBearerToken = (authHeader: string | null): string => {
  const raw = String(authHeader || '').trim()
  if (!raw) return ''
  if (!raw.toLowerCase().startsWith('bearer ')) return ''
  return raw.slice(7).trim()
}

export const normalizeActivityKey = (value: unknown): RitualActivityKey | '' => {
  const key = String(value || '')
    .trim()
    .toLowerCase()
  return (RITUAL_ACTIVITY_KEYS as readonly string[]).includes(key) ? (key as RitualActivityKey) : ''
}

export const normalizeDateKey = (value: unknown, fallbackDate = new Date()): string => {
  const raw = String(value || '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  return fallbackDate.toISOString().slice(0, 10)
}

export const shiftDateKey = (dateKey: string, days: number): string => {
  const normalized = normalizeDateKey(dateKey)
  const date = new Date(`${normalized}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

const diffDays = (leftDateKey: string, rightDateKey: string): number => {
  const left = new Date(`${normalizeDateKey(leftDateKey)}T00:00:00.000Z`)
  const right = new Date(`${normalizeDateKey(rightDateKey)}T00:00:00.000Z`)
  return Math.round((right.getTime() - left.getTime()) / 86400000)
}

const uniqDateKeysDesc = (dateKeys: string[]): string[] => {
  const normalized = dateKeys.map((value) => normalizeDateKey(value))
  const unique = [...new Set(normalized)]
  return unique.sort((a, b) => (a > b ? -1 : a < b ? 1 : 0))
}

export const computeStreakFromDateKeys = (dateKeys: string[]) => {
  const rowsDesc = uniqDateKeysDesc(dateKeys)
  if (!rowsDesc.length) {
    return { current: 0, best: 0, lastDate: '' }
  }

  let current = 1
  for (let i = 1; i < rowsDesc.length; i += 1) {
    if (diffDays(rowsDesc[i], rowsDesc[i - 1]) === 1) {
      current += 1
      continue
    }
    break
  }

  const rowsAsc = [...rowsDesc].reverse()
  let best = 1
  let run = 1
  for (let i = 1; i < rowsAsc.length; i += 1) {
    if (diffDays(rowsAsc[i - 1], rowsAsc[i]) === 1) {
      run += 1
    } else {
      run = 1
    }
    best = Math.max(best, run)
  }

  return {
    current,
    best,
    lastDate: rowsDesc[0],
  }
}

export const computeNextStreak = ({
  previousCurrent,
  previousBest,
  previousLastDate,
  nextFullDate,
}: {
  previousCurrent: number
  previousBest: number
  previousLastDate: string
  nextFullDate: string
}) => {
  const normalizedNext = normalizeDateKey(nextFullDate)
  const normalizedPrev = normalizeDateKey(previousLastDate)
  if (!previousLastDate) {
    return { current: 1, best: Math.max(1, previousBest || 0), lastDate: normalizedNext }
  }

  const delta = diffDays(normalizedPrev, normalizedNext)
  if (delta < 0) {
    return {
      current: Math.max(0, previousCurrent || 0),
      best: Math.max(0, previousBest || 0),
      lastDate: normalizedPrev,
    }
  }

  const current = delta === 1 ? Math.max(1, previousCurrent + 1) : 1
  return {
    current,
    best: Math.max(previousBest || 0, current),
    lastDate: normalizedNext,
  }
}

export const resolveAuthUserId = async ({
  supabaseUrl,
  anonKey,
  authHeader,
}: {
  supabaseUrl: string
  anonKey: string
  authHeader: string | null
}): Promise<string> => {
  const token = extractBearerToken(authHeader)
  if (!token || !supabaseUrl || !anonKey) return ''

  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
  const client = createClient(supabaseUrl, anonKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  })

  const { data, error } = await client.auth.getUser()
  if (error) return ''
  return String(data?.user?.id || '').trim()
}

const makeQueryString = (query: URLSearchParams | Record<string, string> | undefined): string => {
  if (!query) return ''
  if (query instanceof URLSearchParams) {
    const text = query.toString()
    return text ? `?${text}` : ''
  }
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value == null) continue
    params.set(key, value)
  }
  const text = params.toString()
  return text ? `?${text}` : ''
}

type RestRequestParams = {
  supabaseUrl: string
  serviceRole: string
  path: string
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  query?: URLSearchParams | Record<string, string>
  body?: unknown
  prefer?: string
}

const REST_TIMEOUT_MS = 10000

// Supabase REST/RPC calls have no default timeout in Deno fetch; without this a
// stalled connection hangs the function indefinitely.
const fetchWithTimeout = async (url: string, opts: RequestInit, ms = REST_TIMEOUT_MS): Promise<Response> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(`timeout after ${ms}ms`), ms)
  try {
    return await fetch(url, { ...opts, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

export const restRequest = async ({
  supabaseUrl,
  serviceRole,
  path,
  method = 'GET',
  query,
  body,
  prefer,
}: RestRequestParams) => {
  const url = `${supabaseUrl}/rest/v1/${path}${makeQueryString(query)}`
  const headers: Record<string, string> = {
    apikey: serviceRole,
    authorization: `Bearer ${serviceRole}`,
    'content-type': 'application/json',
  }
  if (prefer) headers.prefer = prefer

  const res = await fetchWithTimeout(url, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
  })
  const data = await readJsonSafe(res)
  return { ok: res.ok, status: res.status, data }
}

export const rpcRequest = async ({
  supabaseUrl,
  serviceRole,
  name,
  body,
}: {
  supabaseUrl: string
  serviceRole: string
  name: string
  body: unknown
}) => {
  const url = `${supabaseUrl}/rest/v1/rpc/${name}`
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      apikey: serviceRole,
      authorization: `Bearer ${serviceRole}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body || {}),
  })
  const data = await readJsonSafe(res)
  return { ok: res.ok, status: res.status, data }
}

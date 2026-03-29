export const createSupabaseNativeService = ({
  supabaseUrl = '',
  supabaseAnonKey = '',
  readStoredAccessToken,
  readStoredSession,
  writeStoredSession,
  shouldUseNativeFetch,
  nativeFetch,
  fetchImpl,
  now = () => Date.now(),
} = {}) => {
  const restBase = supabaseUrl ? `${supabaseUrl}/rest/v1` : ''
  const functionsBase = supabaseUrl ? `${supabaseUrl}/functions/v1` : ''

  const withTimeout = async (promise, ms, label) => {
    if (!ms) return promise
    let timer
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms)
    })
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
  }

  const cleanHeaders = (headers) => {
    const cleaned = {}
    Object.entries(headers || {}).forEach(([key, value]) => {
      if (value == null) return
      cleaned[key] = value
    })
    return cleaned
  }

  const normalizeProfileName = (value) => {
    if (typeof value !== 'string') return ''
    return value.trim()
  }

  const mergeSession = (existing, refreshed) => {
    const next = { ...(existing || {}) }
    Object.keys(refreshed || {}).forEach((key) => {
      if (refreshed[key] !== undefined) next[key] = refreshed[key]
    })
    if (!next.user) next.user = refreshed?.user || existing?.user || null
    if (!next.expires_at && next.expires_in) {
      next.expires_at = Math.floor(now() / 1000) + Number(next.expires_in || 0)
    }
    return next
  }

  const buildAuthHeaders = async (extra = {}) => {
    const token = await readStoredAccessToken()
    return cleanHeaders({
      apikey: supabaseAnonKey || undefined,
      Authorization: token ? `Bearer ${token}` : undefined,
      ...extra,
    })
  }

  const requestJson = async (url, init, timeoutMs, label) => {
    const useNative = shouldUseNativeFetch()
    const doFetch = useNative ? nativeFetch : fetchImpl
    const res = await withTimeout(doFetch(url, init), timeoutMs, label)
    const text = await res.text()
    let data = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = text
      }
    }
    return { res, data }
  }

  const refreshAccessTokenNative = async (timeoutMs = 8000) => {
    if (!supabaseUrl) return { data: null, error: new Error('Supabase URL missing') }
    const stored = await readStoredSession()
    const refreshToken = stored?.refresh_token
    if (!refreshToken) return { data: null, error: new Error('Missing refresh token') }

    const url = `${supabaseUrl}/auth/v1/token?grant_type=refresh_token`
    const headers = cleanHeaders({
      apikey: supabaseAnonKey || undefined,
      'Content-Type': 'application/json',
    })

    const { res, data } = await requestJson(
      url,
      { method: 'POST', headers, body: JSON.stringify({ refresh_token: refreshToken }) },
      timeoutMs,
      'auth.refresh_token',
    )

    if (!res.ok) {
      return { data: null, error: new Error(`refresh token failed: ${res.status}`) }
    }

    const next = mergeSession(stored, data)
    await writeStoredSession(next)
    return { data: next, error: null }
  }

  const requestWithRetry = async (buildRequest, timeoutMs, label) => {
    let { url, init } = await buildRequest()
    let result = await requestJson(url, init, timeoutMs, label)
    if (result.res.status !== 401) return result

    const refreshed = await refreshAccessTokenNative()
    if (refreshed.error) return result

    ;({ url, init } = await buildRequest())
    result = await requestJson(url, init, timeoutMs, `${label}.retry`)
    return result
  }

  const getUserNative = async (timeoutMs = 6000) => {
    const stored = await readStoredSession()
    if (stored?.user) {
      return { data: stored.user, error: null }
    }

    if (!supabaseUrl) return { data: null, error: new Error('Supabase URL missing') }
    const makeRequest = async () => {
      const headers = await buildAuthHeaders()
      const url = `${supabaseUrl}/auth/v1/user`
      return { url, init: { method: 'GET', headers } }
    }
    const { res, data } = await requestWithRetry(makeRequest, timeoutMs, 'auth.get_user')

    if (!res.ok) {
      return { data: null, error: new Error(`auth user failed: ${res.status}`) }
    }

    const session = await readStoredSession()
    await writeStoredSession(mergeSession(session, { user: data }))
    return { data, error: null }
  }

  const setSessionFromTokens = async ({ access_token, refresh_token, expires_in, expires_at }) => {
    const next = mergeSession({}, {
      access_token,
      refresh_token,
      expires_in,
      expires_at,
      token_type: 'bearer',
    })
    await writeStoredSession(next)

    const { data: user } = await getUserNative(8000)
    if (user) {
      await writeStoredSession(mergeSession(next, { user }))
    }
    return { data: await readStoredSession(), error: null }
  }

  const updateUserPasswordNative = async (password, timeoutMs = 8000) => {
    if (!supabaseUrl) return { data: null, error: new Error('Supabase URL missing') }
    const makeRequest = async () => {
      const headers = await buildAuthHeaders({ 'Content-Type': 'application/json' })
      const url = `${supabaseUrl}/auth/v1/user`
      return {
        url,
        init: { method: 'PUT', headers, body: JSON.stringify({ password }) },
      }
    }
    const { res, data } = await requestWithRetry(makeRequest, timeoutMs, 'auth.update_user')
    if (!res.ok) {
      return { data: null, error: new Error(`update user failed: ${res.status}`) }
    }
    return { data, error: null }
  }

  const selectAppUser = async (userId, timeoutMs = 6000, fields = 'name,email,date_of_birth') => {
    if (!restBase) return { data: null, error: new Error('Supabase URL missing') }
    const makeRequest = async () => {
      const headers = await buildAuthHeaders()
      const url = `${restBase}/app_users?id=eq.${encodeURIComponent(userId)}&select=${encodeURIComponent(fields)}`
      return { url, init: { method: 'GET', headers } }
    }
    const { res, data } = await requestWithRetry(makeRequest, timeoutMs, 'rest.app_users.select')

    if (!res.ok) {
      return { data: null, error: new Error(`app_users select failed: ${res.status}`) }
    }

    const row = Array.isArray(data) ? data[0] : data
    return { data: row || null, error: null }
  }

  const upsertAppUser = async (payload, timeoutMs = 6000) => {
    if (!restBase) return { data: null, error: new Error('Supabase URL missing') }
    const sanitizedPayload = { ...(payload || {}) }
    if ('name' in sanitizedPayload) {
      const normalizedName = normalizeProfileName(sanitizedPayload.name)
      if (normalizedName) {
        sanitizedPayload.name = normalizedName
      } else {
        delete sanitizedPayload.name
      }
    }

    const makeRequest = async () => {
      const headers = await buildAuthHeaders({
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      })
      const url = `${restBase}/app_users`
      return { url, init: { method: 'POST', headers, body: JSON.stringify(sanitizedPayload) } }
    }
    const { res, data } = await requestWithRetry(makeRequest, timeoutMs, 'rest.app_users.upsert')

    if (!res.ok) {
      return { data: null, error: new Error(`app_users upsert failed: ${res.status}`) }
    }

    return { data, error: null }
  }

  const selectTarotReadingsByUser = async (userId, timeoutMs = 8000) => {
    if (!restBase) return { data: null, error: new Error('Supabase URL missing') }
    const makeRequest = async () => {
      const headers = await buildAuthHeaders()
      const url = `${restBase}/tarot_readings?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc`
      return { url, init: { method: 'GET', headers } }
    }
    const { res, data } = await requestWithRetry(makeRequest, timeoutMs, 'rest.tarot_readings.select')
    if (!res.ok) {
      return { data: null, error: new Error(`tarot_readings select failed: ${res.status}`) }
    }
    return { data: Array.isArray(data) ? data : [], error: null }
  }

  const insertTarotReading = async (payload, timeoutMs = 8000) => {
    if (!restBase) return { data: null, error: new Error('Supabase URL missing') }
    const makeRequest = async () => {
      const headers = await buildAuthHeaders({
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      })
      const url = `${restBase}/tarot_readings`
      return { url, init: { method: 'POST', headers, body: JSON.stringify(payload) } }
    }
    const { res, data } = await requestWithRetry(makeRequest, timeoutMs, 'rest.tarot_readings.insert')
    if (!res.ok) {
      return { data: null, error: new Error(`tarot_readings insert failed: ${res.status}`) }
    }
    return { data, error: null }
  }

  const deleteTarotReading = async (id, timeoutMs = 8000) => {
    if (!restBase) return { data: null, error: new Error('Supabase URL missing') }
    const makeRequest = async () => {
      const headers = await buildAuthHeaders()
      const url = `${restBase}/tarot_readings?id=eq.${encodeURIComponent(id)}`
      return { url, init: { method: 'DELETE', headers } }
    }
    const { res, data } = await requestWithRetry(makeRequest, timeoutMs, 'rest.tarot_readings.delete')
    if (!res.ok) {
      return { data: null, error: new Error(`tarot_readings delete failed: ${res.status}`) }
    }
    return { data, error: null }
  }

  const selectHoroscopes = async (date, locale, timeoutMs = 8000) => {
    if (!restBase) return { data: null, error: new Error('Supabase URL missing') }
    const makeRequest = async () => {
      const headers = await buildAuthHeaders()
      const url =
        `${restBase}/horoscopes?date=eq.${encodeURIComponent(date)}` +
        `&locale=eq.${encodeURIComponent(locale)}` +
        '&select=sign,theme,summary,detailed'
      return { url, init: { method: 'GET', headers } }
    }
    const { res, data } = await requestWithRetry(makeRequest, timeoutMs, 'rest.horoscopes.select')
    if (!res.ok) {
      return { data: null, error: new Error(`horoscopes select failed: ${res.status}`) }
    }
    return { data: Array.isArray(data) ? data : [], error: null }
  }

  const invokeFunction = async (name, body, timeoutMs = 8000) => {
    if (!functionsBase) return { data: null, error: new Error('Supabase URL missing') }
    const makeRequest = async () => {
      const headers = await buildAuthHeaders({ 'Content-Type': 'application/json' })
      const url = `${functionsBase}/${name}`
      return { url, init: { method: 'POST', headers, body: JSON.stringify(body || {}) } }
    }
    const { res, data } = await requestWithRetry(makeRequest, timeoutMs, `functions.${name}`)

    if (!res.ok) {
      return { data: null, error: new Error(`functions ${name} failed: ${res.status}`) }
    }

    return { data, error: null }
  }

  return {
    refreshAccessTokenNative,
    getUserNative,
    setSessionFromTokens,
    updateUserPasswordNative,
    selectAppUser,
    upsertAppUser,
    selectTarotReadingsByUser,
    insertTarotReading,
    deleteTarotReading,
    selectHoroscopes,
    invokeFunction,
  }
}

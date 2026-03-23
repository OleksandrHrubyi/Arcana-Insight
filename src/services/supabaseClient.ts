import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Preferences } from '@capacitor/preferences'
import { Capacitor, CapacitorHttp } from '@capacitor/core'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || ''

const supabaseStorage = {
  async getItem(key: string) {
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key })
      return value
    }
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  async setItem(key: string, value: string) {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key, value })
      return
    }
    try {
      localStorage.setItem(key, value)
    } catch {
      // ignore storage errors
    }
  },
  async removeItem(key: string) {
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key })
      return
    }
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore storage errors
    }
  },
}

const normalizeHeaders = (headers: any) => {
  const result: Record<string, string> = {}
  if (!headers) return result
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      result[key] = value
    })
    return result
  }
  if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      result[String(key)] = String(value)
    }
    return result
  }
  if (typeof headers === 'object') {
    for (const key of Object.keys(headers)) {
      result[key] = String((headers as any)[key])
    }
  }
  return result
}

export const nativeFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
  const method = (init.method || (typeof input !== 'string' && !(input instanceof URL) ? input.method : 'GET') || 'GET').toUpperCase()
  const headers = normalizeHeaders(init.headers || (typeof input !== 'string' && !(input instanceof URL) ? input.headers : undefined))
  let data: any = undefined
  // silent

  if (method !== 'GET' && method !== 'HEAD' && init.body != null) {
    if (typeof init.body === 'string') {
      const ct = headers['content-type'] || headers['Content-Type'] || ''
      if (ct.includes('application/json')) {
        try {
          data = JSON.parse(init.body)
        } catch {
          data = init.body
        }
      } else {
        data = init.body
      }
    } else if (init.body instanceof URLSearchParams) {
      data = init.body.toString()
    } else {
      data = init.body as any
    }
  }

  try {
    const res = await CapacitorHttp.request({
      url,
      method,
      headers,
      data,
      responseType: 'text',
    })

    const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data ?? '')
    // silent
    return new Response(body, {
      status: res.status || 0,
      headers: res.headers as any,
    })
  } catch (err) {
    // silent
    throw err
  }
}

export const shouldUseNativeFetch = () => {
  return Capacitor.isNativePlatform() && !!CapacitorHttp?.request
}

const getProjectRef = () => {
  try {
    const host = new URL(supabaseUrl).hostname
    return host.split('.')[0] || ''
  } catch {
    return ''
  }
}

export const getAuthStorageKey = () => {
  const ref = getProjectRef()
  return ref ? `sb-${ref}-auth-token` : ''
}

export const readStoredSession = async () => {
  const key = getAuthStorageKey()
  if (!key) return null
  const raw = await supabaseStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const readStoredAccessToken = async () => {
  const session = await readStoredSession()
  return session?.access_token || null
}

export const writeStoredSession = async (session: any) => {
  const key = getAuthStorageKey()
  if (!key) return
  try {
    await supabaseStorage.setItem(key, JSON.stringify(session || {}))
  } catch {
    // ignore storage errors
  }
}

export const clearStoredSession = async () => {
  const key = getAuthStorageKey()
  if (!key) return
  try {
    await supabaseStorage.removeItem(key)
  } catch {
    // ignore storage errors
  }
}

export const getSupabaseUrl = () => supabaseUrl
export const getSupabaseAnonKey = () => supabaseAnonKey

if (shouldUseNativeFetch()) {
  try {
    // Ensure any internal fetch usage also goes through native transport
    globalThis.fetch = nativeFetch as any
  } catch {
    // ignore if global fetch can't be reassigned
  }
} else {
}

const createSupabaseClient = () => createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: supabaseStorage as any,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: !Capacitor.isNativePlatform(),
  },
  global: {
    fetch: shouldUseNativeFetch() ? nativeFetch : fetch,
  },
})

let baseClient = createSupabaseClient()
let authInFlight = false
let authLock: Promise<any> | null = null

// Wrapper to clean auth tokens before making requests
class SupabaseClientWrapper {
  private client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  setClient(client: SupabaseClient) {
    this.client = client
  }

  get auth() {
    return this.client.auth
  }

  get from() {
    return this.client.from.bind(this.client)
  }

  get storage() {
    return this.client.storage
  }

  get functions() {
    const originalFunctions = this.client.functions
    return {
      invoke: async (functionName: string, options?: any) => {
        const stored = await readStoredSession()
        if (stored?.access_token?.includes('\n')) {
          console.warn('[Supabase] Detected corrupted token, refreshing session...')
          try {
            const { data: { session: newSession }, error } = await this.client.auth.refreshSession()
            if (error) {
              console.error('[Supabase] Failed to refresh session:', error)
            } else if (newSession) {
              console.log('[Supabase] Session refreshed successfully')
            }
          } catch (err) {
            console.error('[Supabase] Failed to refresh session:', err)
          }
        }

        return originalFunctions.invoke(functionName, options)
      },
      setAuth: originalFunctions.setAuth?.bind(originalFunctions),
    }
  }
}

const supabaseWrapper = new SupabaseClientWrapper(baseClient)
export const supabase = supabaseWrapper as any
export const resetSupabaseClient = () => {
  baseClient = createSupabaseClient()
  supabaseWrapper.setClient(baseClient)
  return baseClient
}
export const setAuthInFlight = (value: boolean) => {
  authInFlight = value
}
export const isAuthInFlight = () => authInFlight
export const withAuthLock = async (fn: () => Promise<any>) => {
  const run = async () => {
    try {
      return await fn()
    } finally {
      authLock = null
    }
  }

  if (authLock) return authLock
  authLock = run()
  return authLock
}

export const withAuthLockOrTimeout = async (fn: () => Promise<any>, timeoutMs = 800) => {
  if (!authLock) return withAuthLock(fn)

  let timedOut = false
  await Promise.race([
    authLock,
    new Promise((resolve) => setTimeout(() => {
      timedOut = true
      resolve(null)
    }, timeoutMs)),
  ])

  if (timedOut) {
    return fn()
  }
  return withAuthLock(fn)
}

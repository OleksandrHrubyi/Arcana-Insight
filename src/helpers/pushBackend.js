// src/helpers/pushBackend.js
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { invokeFunction } from 'src/services/supabaseNative'

const LS_TOKEN = 'push_token'
const LS_LOCALE = 'locale'
const LS_OPT_TIME = 'daily_push_time' // "HH:mm" або ""
const TOKEN_WAIT_MS = 12000

function getLocale() {
  return (localStorage.getItem(LS_LOCALE) || 'en').toLowerCase()
}

export function getApnsEnv() {
  return import.meta.env.DEV ? 'sandbox' : 'production'
}

export function getTz() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

export function parseHHMM(hhmm) {
  if (!hhmm) return { hour: null, minute: null }
  const [h, m] = String(hhmm).split(':')
  const hour = Number(h)
  const minute = Number(m)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return { hour: null, minute: null }
  return {
    hour: Math.max(0, Math.min(23, Math.trunc(hour))),
    minute: Math.max(0, Math.min(59, Math.trunc(minute))),
  }
}

// отримати token (або зареєструватися і дочекатися)
export async function ensureToken() {
  if (!Capacitor.isNativePlatform()) return null

  const perm = await PushNotifications.requestPermissions()
  if (perm.receive !== 'granted') return null

  const saved = localStorage.getItem(LS_TOKEN)

  let registrationHandle = null
  let registrationErrorHandle = null
  let timeoutId = null
  let settled = false

  const cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    try {
      registrationHandle?.remove?.()
    } catch (e) {
      console.error(e)
    }
    try {
      registrationErrorHandle?.remove?.()
    } catch (e) {
      console.error(e)
    }
  }

  const token = await new Promise((resolve) => {
    const finish = (value) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(value || null)
    }

    const startRegistration = async () => {
      try {
        registrationHandle = await PushNotifications.addListener('registration', (nextToken) => {
          const value = nextToken?.value || null
          if (value) localStorage.setItem(LS_TOKEN, value)
          finish(value)
        })

        registrationErrorHandle = await PushNotifications.addListener(
          'registrationError',
          (err) => {
            console.error('[push] registrationError', err)
            finish(null)
          },
        )

        timeoutId = setTimeout(() => finish(null), TOKEN_WAIT_MS)

        await PushNotifications.register()
      } catch (err) {
        console.error('[push] ensureToken failed', err)
        finish(null)
      }
    }

    void startRegistration()
  })

  return token || saved || null
}

export async function syncRegisterDevice({ enabled, timeHHMM, locale }) {
  const token = localStorage.getItem(LS_TOKEN) || (enabled ? await ensureToken() : null)
  if (!token) return { ok: false, error: 'No token' }

  const effectiveLocale = (locale || getLocale()).toLowerCase()
  const tz = getTz()
  const apns_env = getApnsEnv()

  const { hour, minute } = parseHHMM(timeHHMM)
  const hasTime = !!timeHHMM

  const body = {
    token,
    platform: Capacitor.getPlatform(), // ios
    locale: effectiveLocale,
    enabled: !!enabled,
    apns_env,
    notify_hour: hasTime ? hour : null,
    notify_minute: hasTime ? minute : null,
    tz,
  }

  const { data, error } = await invokeFunction('register-device', body, 8000)
  if (error) return { ok: false, error }

  return { ok: true, data }
}

export function getSavedTime() {
  return localStorage.getItem(LS_OPT_TIME) || ''
}

export function setSavedTime(hhmm) {
  localStorage.setItem(LS_OPT_TIME, hhmm || '')
}

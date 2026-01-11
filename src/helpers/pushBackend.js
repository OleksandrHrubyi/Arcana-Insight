// src/helpers/pushBackend.js
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { supabase } from 'boot/supabase'

const LS_TOKEN = 'push_token'
const LS_LOCALE = 'locale'
const LS_OPT_TIME = 'daily_push_time' // "HH:mm" або ""

function getLocale () {
  return (localStorage.getItem(LS_LOCALE) || 'en').toLowerCase()
}

export function getApnsEnv () {
  return import.meta.env.DEV ? 'sandbox' : 'production'
}

export function getTz () {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

export function parseHHMM (hhmm) {
  if (!hhmm) return { hour: null, minute: null }
  const [h, m] = String(hhmm).split(':')
  const hour = Number(h)
  const minute = Number(m)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return { hour: null, minute: null }
  return {
    hour: Math.max(0, Math.min(23, Math.trunc(hour))),
    minute: Math.max(0, Math.min(59, Math.trunc(minute)))
  }
}

// отримати token (або зареєструватися і дочекатися)
export async function ensureToken () {
  if (!Capacitor.isNativePlatform()) return null

  const saved = localStorage.getItem(LS_TOKEN)
  if (saved) return saved

  const perm = await PushNotifications.requestPermissions()
  if (perm.receive !== 'granted') return null

  const tokenPromise = new Promise((resolve) => {
    const handle = PushNotifications.addListener('registration', (token) => {
      const value = token?.value
      if (value) localStorage.setItem(LS_TOKEN, value)
      try { handle.remove() } catch (e) {
        console.log(e);
      }
      resolve(value || null)
    })
  })

  await PushNotifications.register()

  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 8000))
  return await Promise.race([tokenPromise, timeout])
}

export async function syncRegisterDevice ({ enabled, timeHHMM, locale }) {
  const token = localStorage.getItem(LS_TOKEN)
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
    tz
  }

  const { data, error } = await supabase.functions.invoke('register-device', { body })
  if (error) return { ok: false, error }

  return { ok: true, data }
}

export function getSavedTime () {
  return localStorage.getItem(LS_OPT_TIME) || ''
}

export function setSavedTime (hhmm) {
  localStorage.setItem(LS_OPT_TIME, hhmm || '')
}

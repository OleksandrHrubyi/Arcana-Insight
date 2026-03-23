// src/boot/push.js
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { getSavedTime, syncRegisterDevice } from 'src/helpers/pushBackend'
const DEBUG_PUSH = import.meta.env.DEV
const LS_DAILY_PUSH = 'daily_push_enabled'
const ROUTE_MAP = {
  horoscope: 'horoscope',
  daily: 'daily',
  menu: 'menu',
}

let listenersInited = false

function getLocale() {
  return localStorage.getItem('push_locale') || localStorage.getItem('locale') || 'uk'
}

function isDailyPushEnabled() {
  return JSON.parse(localStorage.getItem(LS_DAILY_PUSH) || 'false') === true
}

function buildTargetFromPayload(payload) {
  const routeRaw = typeof payload?.route === 'string' ? payload.route.trim().toLowerCase() : ''
  const routeName = ROUTE_MAP[routeRaw]
  const date = typeof payload?.date === 'string' ? payload.date : ''

  if (routeName) {
    if (routeName === 'horoscope' && date) {
      return { name: routeName, query: { date } }
    }
    return { name: routeName }
  }

  if (typeof payload?.path === 'string' && payload.path.startsWith('/')) {
    return payload.path
  }

  return { name: 'menu' }
}

function fallbackNavigate(target) {
  if (typeof window === 'undefined') return

  if (typeof target === 'string') {
    window.location.hash = `#${target}`
    return
  }

  const name = target?.name
  const date = target?.query?.date
  if (name === 'daily') {
    window.location.hash = '#/daily'
    return
  }
  if (name === 'horoscope') {
    const qs = date ? `?date=${encodeURIComponent(String(date))}` : ''
    window.location.hash = `#/horoscope${qs}`
    return
  }
  if (name === 'menu') {
    window.location.hash = '#/menu'
    return
  }

  window.location.hash = '#/menu'
}

async function navigateByPushAction(action, navigate) {
  const data = action?.notification?.data || {}
  const payload = {
    ...data,
    route: data.route || action?.notification?.route,
    path: data.path || action?.notification?.path,
    date: data.date || action?.notification?.date,
  }

  const target = buildTargetFromPayload(payload)

  if (typeof navigate === 'function') {
    try {
      await navigate(target)
      return
    } catch (err) {
      console.error('[push] navigation failed, using fallback', err)
    }
  }

  fallbackNavigate(target)
}

export async function initPushListeners({ navigate } = {}) {
  if (DEBUG_PUSH) {
    console.info(
      '[push] platform:',
      Capacitor.getPlatform(),
      'isNative:',
      Capacitor.isNativePlatform(),
    )
  }

  if (!Capacitor.isNativePlatform()) return
  if (listenersInited) return
  listenersInited = true

  if (DEBUG_PUSH) console.info('[push] init listeners')

  PushNotifications.addListener('registration', async (token) => {
    const value = token?.value
    if (DEBUG_PUSH) console.info('[push] token received')
    if (!value) return

    localStorage.setItem('push_token', value)
  })

  PushNotifications.addListener('registrationError', (err) => {
    console.error('[push] registrationError', err)
  })

  // коли пуш прийшов у foreground
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    if (DEBUG_PUSH) console.info('[push] received', notification)
  })

  // коли юзер натиснув пуш
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    if (DEBUG_PUSH) console.info('[push] action performed', action)
    void navigateByPushAction(action, navigate)
  })
}

export async function enablePush(locale) {
  if (!Capacitor.isNativePlatform()) return null

  if (locale) localStorage.setItem('push_locale', locale)

  const perm = await PushNotifications.requestPermissions()
  if (DEBUG_PUSH) console.info('[push] permission:', perm)

  if (perm.receive !== 'granted') return null

  await PushNotifications.register()
  if (DEBUG_PUSH) console.info('[push] register() called')

  return true
}

export async function touchPushDevice() {
  if (!Capacitor.isNativePlatform()) return
  if (!isDailyPushEnabled()) return

  const res = await syncRegisterDevice({
    enabled: true,
    timeHHMM: getSavedTime(),
    locale: getLocale(),
  })
  if (!res.ok && DEBUG_PUSH) console.warn('[push] touch sync failed', res.error)
}

export async function disablePushDevice() {
  if (!Capacitor.isNativePlatform()) return
  const res = await syncRegisterDevice({
    enabled: false,
    timeHHMM: '',
    locale: getLocale(),
  })
  if (!res.ok && DEBUG_PUSH) console.warn('[push] disable sync failed', res.error)
  return !!res.ok
}

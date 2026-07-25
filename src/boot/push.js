// src/boot/push.js
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { getSavedTime, syncRegisterDevice } from 'src/helpers/pushBackend'
import { analytics } from 'src/services/analytics'
const DEBUG_PUSH = import.meta.env.DEV
const LS_DAILY_PUSH = 'daily_push_enabled'
const ROUTE_MAP = {
  journal: 'journal',
  horoscope: 'horoscope',
  daily: 'daily',
  tarot: 'tarot',
  menu: 'menu',
}

let listenersInited = false

const normalizePushParam = (value, fallback = 'unknown') => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
  return normalized || fallback
}

const buildPushAnalyticsPayload = (payload = {}) => ({
  source: normalizePushParam(payload.source, 'push'),
  entry: normalizePushParam(payload.entry, 'notification'),
  route: normalizePushParam(payload.route, 'unknown'),
  content_type: normalizePushParam(payload.content_type, 'unknown'),
  has_theme: payload.theme ? 'true' : 'false',
  has_focus: payload.focus ? 'true' : 'false',
})

function getLocale() {
  return localStorage.getItem('push_locale') || localStorage.getItem('locale') || 'uk'
}

function isDailyPushEnabled() {
  // Strict string compare, not JSON.parse: a corrupted value must read as
  // "disabled", never throw during boot (B3 — the writer stores 'true'/'false').
  return localStorage.getItem(LS_DAILY_PUSH) === 'true'
}

function buildTargetFromPayload(payload) {
  const routeRaw = typeof payload?.route === 'string' ? payload.route.trim().toLowerCase() : ''
  const routeName = ROUTE_MAP[routeRaw]
  const date = typeof payload?.date === 'string' ? payload.date : ''
  const theme = typeof payload?.theme === 'string' ? payload.theme.trim() : ''
  const focus = typeof payload?.focus === 'string' ? payload.focus.trim() : ''
  const source = typeof payload?.source === 'string' ? payload.source.trim() : ''
  const entry = typeof payload?.entry === 'string' ? payload.entry.trim() : ''

  if (routeName) {
    const query = {}
    if (date) query.date = date
    if (theme) query.theme = theme
    if (focus) query.focus = focus
    if (source) query.source = source
    if (entry) query.entry = entry
    if (Object.keys(query).length) {
      return { name: routeName, query }
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

  const name = String(target?.name || '')
  const pathMap = {
    journal: '/journal',
    daily: '/daily',
    horoscope: '/horoscope',
    tarot: '/tarot',
    menu: '/menu',
  }
  const basePath = pathMap[name] || '/menu'
  const query = target?.query || {}
  const params = new URLSearchParams()
  for (const key of ['date', 'theme', 'focus', 'source', 'entry']) {
    const raw = query[key]
    const value = Array.isArray(raw) ? String(raw[0] || '') : String(raw || '')
    if (!value) continue
    params.set(key, value)
  }
  const qs = params.toString()
  window.location.hash = `#${basePath}${qs ? `?${qs}` : ''}`
}

async function navigateByPushAction(action, navigate) {
  const data = action?.notification?.data || {}
  const payload = {
    ...data,
    route: data.route || action?.notification?.route,
    path: data.path || action?.notification?.path,
    date: data.date || action?.notification?.date,
    theme: data.theme || action?.notification?.theme,
    focus: data.focus || action?.notification?.focus,
    source: data.source || action?.notification?.source,
    entry: data.entry || action?.notification?.entry,
  }
  void analytics.logEvent('push_open', buildPushAnalyticsPayload(payload))

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
    const data = notification?.data || {}
    const payload = {
      ...data,
      route: data.route || notification?.route,
      path: data.path || notification?.path,
      date: data.date || notification?.date,
      theme: data.theme || notification?.theme,
      focus: data.focus || notification?.focus,
      source: data.source || notification?.source,
      entry: data.entry || notification?.entry,
      content_type: data.content_type || notification?.content_type,
    }
    void analytics.logEvent('push_received', buildPushAnalyticsPayload(payload))
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

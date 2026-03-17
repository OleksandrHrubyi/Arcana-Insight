// src/boot/push.js
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { getSavedTime, syncRegisterDevice } from 'src/helpers/pushBackend'
const DEBUG_PUSH = import.meta.env.DEV
const LS_DAILY_PUSH = 'daily_push_enabled'

let listenersInited = false

function getLocale() {
  return (
    localStorage.getItem('push_locale') ||
    localStorage.getItem('locale') ||
    'uk'
  )
}

function isDailyPushEnabled() {
  return JSON.parse(localStorage.getItem(LS_DAILY_PUSH) || 'false') === true
}

export async function initPushListeners() {
  if (DEBUG_PUSH) {
    console.info('[push] platform:', Capacitor.getPlatform(), 'isNative:', Capacitor.isNativePlatform())
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
    locale: getLocale()
  })
  if (!res.ok && DEBUG_PUSH) console.warn('[push] touch sync failed', res.error)
}

export async function disablePushDevice() {
  if (!Capacitor.isNativePlatform()) return
  const res = await syncRegisterDevice({
    enabled: false,
    timeHHMM: '',
    locale: getLocale()
  })
  if (!res.ok && DEBUG_PUSH) console.warn('[push] disable sync failed', res.error)
  return !!res.ok
}

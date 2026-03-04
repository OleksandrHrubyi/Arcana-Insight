// src/boot/push.js
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'

// ✅ Твоя Edge Function
const REGISTER_DEVICE_URL =
  'https://rgqfkdhzllhmagrcasav.supabase.co/functions/v1/register-device'
const APNS_ENV = 'sandbox'
const DEBUG_PUSH = import.meta.env.DEV

let listenersInited = false

function getLocale() {
  return (
    localStorage.getItem('push_locale') ||
    localStorage.getItem('locale') ||
    'uk'
  )
}

async function registerDeviceViaFunction(token) {
  try {
    const res = await fetch(REGISTER_DEVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        platform: Capacitor.getPlatform(), // 'ios'
        locale: getLocale(),
        enabled: true
      })
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      if (DEBUG_PUSH) console.warn('[push] register-device failed', res.status, data)
      return false
    }

    if (DEBUG_PUSH) console.info('[push] register-device ok', data)
    return true
  } catch (e) {
    console.error('[push] register-device exception', e)
    return false
  }
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

    // ✅ реєструємо девайс через Edge Function (RLS не заважає)
    await registerDeviceViaFunction(value)
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

  const token = localStorage.getItem('push_token')
  if (!token) return

  await registerDeviceViaFunction(token)
}

export async function disablePushDevice() {
  if (!Capacitor.isNativePlatform()) return

  const token = localStorage.getItem('push_token')
  if (!token) return

  try {
    const res = await fetch(REGISTER_DEVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        platform: Capacitor.getPlatform(),
        locale: getLocale(),
        enabled: true,
        apns_env: APNS_ENV
      })
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      if (DEBUG_PUSH) console.warn('[push] disable via function failed', res.status, data)
      return false
    }

    if (DEBUG_PUSH) console.info('[push] disabled ok', data)
    return true
  } catch (e) {
    console.error('[push] disable via function exception', e)
    return false
  }
}

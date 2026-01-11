// src/boot/push.js
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'

// ✅ Твоя Edge Function
const REGISTER_DEVICE_URL =
  'https://rgqfkdhzllhmagrcasav.supabase.co/functions/v1/register-device'
const APNS_ENV = 'sandbox' // <-- коли буде TestFlight, зробиш 'production'

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
      console.log('[push] register-device failed', res.status, data)
      return false
    }

    // опційно: для логів
    console.log('[push] register-device ok', data)
    return true
  } catch (e) {
    console.log('[push] register-device exception', e)
    return false
  }
}

export async function initPushListeners() {
  console.log(
    '[push] platform:',
    Capacitor.getPlatform(),
    'isNative:',
    Capacitor.isNativePlatform()
  )

  if (!Capacitor.isNativePlatform()) return
  if (listenersInited) return
  listenersInited = true

  console.log('[push] init listeners')

  PushNotifications.addListener('registration', async (token) => {
    const value = token?.value
    console.log('🔥 PUSH TOKEN:', value)
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
    console.log('[push] received', notification)
  })

  // коли юзер натиснув пуш
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    console.log('[push] action performed', action)

    // приклад, якщо додаєш custom data:
    // const data = action?.notification?.data || {}
    // if (data.route === 'horoscope') router.push('/horoscope')
  })
}

/**
 * Викликай коли хочеш увімкнути пуші (в налаштуваннях),
 * або після того як користувач вибрав мову.
 */
export async function enablePush(locale) {
  if (!Capacitor.isNativePlatform()) return null

  if (locale) localStorage.setItem('push_locale', locale)

  const perm = await PushNotifications.requestPermissions()
  console.log('[push] permission:', perm)

  if (perm.receive !== 'granted') return null

  await PushNotifications.register()
  console.log('[push] register() called')

  return true
}

/**
 * Викликай на старті апки (після initPushListeners),
 * щоб “підтвердити” девайс, якщо токен вже є.
 */
export async function touchPushDevice() {
  if (!Capacitor.isNativePlatform()) return

  const token = localStorage.getItem('push_token')
  if (!token) return

  await registerDeviceViaFunction(token)
}

/**
 * Опційно: вимкнути пуші для цього девайсу.
 * Для цього краще зробити окрему Edge Function (disable-device),
 * але для MVP можна просто ставити enabled=false через register-device,
 * якщо ти дозволиш це в функції.
 */
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
      console.log('[push] disable via function failed', res.status, data)
      return false
    }

    console.log('[push] disabled ok', data)
    return true
  } catch (e) {
    console.log('[push] disable via function exception', e)
    return false
  }
}

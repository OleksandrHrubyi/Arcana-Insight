// Local reminders for sky events (moon phases, eclipses, meteor peaks, …).
// On-device via @capacitor/local-notifications — no server. Fires ~1 hour
// before the event. Web/preview has no native scheduler, so every call fails
// soft (returns false / empty) and the UI simply shows nothing scheduled.
import { LocalNotifications } from '@capacitor/local-notifications'

// Stable positive 31-bit id from an event key (LocalNotifications needs ints).
export const notifId = (key) => {
  let h = 0
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) | 0
  return (Math.abs(h) % 2000000000) + 1
}

export const ensureNotifPermission = async () => {
  try {
    let status = await LocalNotifications.checkPermissions()
    if (status?.display !== 'granted') status = await LocalNotifications.requestPermissions()
    return status?.display === 'granted'
  } catch {
    return false
  }
}

// Set of currently-scheduled event keys (from the pending queue).
export const getScheduledIds = async () => {
  try {
    const { notifications } = await LocalNotifications.getPending()
    return new Set((notifications || []).map((n) => n.id))
  } catch {
    return new Set()
  }
}

export const scheduleSkyEvent = async ({ key, title, body, at, leadMinutes = 60 }) => {
  if (!(at instanceof Date)) return false
  if (!(await ensureNotifPermission())) return false
  // Fire `leadMinutes` ahead (default 1h; ISS passes want ~10m), never in the past.
  const fireAt = new Date(Math.max(Date.now() + 5000, at.getTime() - leadMinutes * 60000))
  try {
    await LocalNotifications.schedule({
      notifications: [{ id: notifId(key), title, body, schedule: { at: fireAt } }],
    })
    return true
  } catch {
    return false
  }
}

export const cancelSkyEvent = async (key) => {
  try {
    await LocalNotifications.cancel({ notifications: [{ id: notifId(key) }] })
    return true
  } catch {
    return false
  }
}

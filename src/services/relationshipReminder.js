// Local (on-device) weekly relationship-weather reminder.
//
// Kept fully local — no server, no synced data (matches the app's local-first,
// privacy-first stance for compatibility). The Capacitor plugin is imported
// dynamically and guarded by platform, so this module stays safe to import in
// web/test contexts where the native plugin is absent.

import { Capacitor } from '@capacitor/core'

// Fixed notification id so re-scheduling replaces (not stacks) the reminder.
const REMINDER_ID = 7401

export function reminderSupported() {
  return Boolean(Capacitor.isNativePlatform?.())
}

async function getPlugin() {
  const mod = await import('@capacitor/local-notifications')
  return mod.LocalNotifications
}

export async function ensureReminderPermission() {
  if (!reminderSupported()) return false
  try {
    const LN = await getPlugin()
    const res = await LN.requestPermissions()
    return res?.display === 'granted'
  } catch {
    return false
  }
}

// Schedule a weekly repeating reminder (Monday 11:00 local). Replaces any
// existing one. Returns true on success.
export async function scheduleWeeklyReminder({ title, body }) {
  if (!reminderSupported()) return false
  try {
    const LN = await getPlugin()
    await LN.cancel({ notifications: [{ id: REMINDER_ID }] }).catch(() => {})
    await LN.schedule({
      notifications: [
        {
          id: REMINDER_ID,
          title,
          body,
          schedule: { on: { weekday: 2, hour: 11, minute: 0 }, repeats: true, allowWhileIdle: true },
        },
      ],
    })
    return true
  } catch (e) {
    console.warn('[relationshipReminder] schedule failed', e)
    return false
  }
}

export async function cancelWeeklyReminder() {
  if (!reminderSupported()) return
  try {
    const LN = await getPlugin()
    await LN.cancel({ notifications: [{ id: REMINDER_ID }] })
  } catch (e) {
    console.warn('[relationshipReminder] cancel failed', e)
  }
}

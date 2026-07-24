import { Capacitor, registerPlugin } from '@capacitor/core'

let plugin = null
const getPlugin = () => {
  if (!plugin) plugin = registerPlugin('WidgetBridge')
  return plugin
}

// Fire-and-forget: pushes the pre-built snapshot to the App Group and asks
// WidgetKit to reload. Never throws, never blocks UI; no-op on web.
export const syncWidgetSnapshot = async (snapshot) => {
  try {
    if (!Capacitor.isNativePlatform()) return { synced: false, reason: 'web' }
    return await getPlugin().syncSnapshot({ payload: JSON.stringify(snapshot) })
  } catch (e) {
    console.warn('[widgetBridge] sync failed', e)
    return { synced: false, reason: 'error' }
  }
}

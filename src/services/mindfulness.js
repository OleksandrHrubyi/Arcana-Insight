import { Capacitor, registerPlugin } from '@capacitor/core'
import {
  MINDFUL_DEFAULT_DURATION_SECONDS,
  clampMindfulDuration,
  isMindfulSyncEnabled,
} from 'src/helpers/mindfulnessCore.js'

let plugin = null
const getPlugin = () => {
  if (!plugin) plugin = registerPlugin('MindfulSession')
  return plugin
}

// Fire-and-forget from the journal save path: never throws, never blocks UI.
// Logs a write-only Mindful Minutes session when the user opted in (Settings).
export const logMindfulSessionIfEnabled = async ({
  durationSeconds = MINDFUL_DEFAULT_DURATION_SECONDS,
} = {}) => {
  try {
    if (!Capacitor.isNativePlatform()) return { logged: false, reason: 'web' }
    if (!isMindfulSyncEnabled()) return { logged: false, reason: 'disabled' }
    return await getPlugin().logSession({
      durationSeconds: clampMindfulDuration(durationSeconds),
    })
  } catch (e) {
    console.warn('[mindfulness] log failed', e)
    return { logged: false, reason: 'error' }
  }
}

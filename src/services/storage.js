import { Preferences } from '@capacitor/preferences'

const KEY_HISTORY = 'ai_history'

export async function loadHistory () {
  const { value } = await Preferences.get({ key: KEY_HISTORY })
  try { return value ? JSON.parse(value) : [] } catch { return [] }
}

export async function saveHistory (list) {
  await Preferences.set({ key: KEY_HISTORY, value: JSON.stringify(list) })
}

export async function pushToHistory (entry) {
  const list = await loadHistory()
  list.unshift(entry)
  await saveHistory(list)
  return list
}

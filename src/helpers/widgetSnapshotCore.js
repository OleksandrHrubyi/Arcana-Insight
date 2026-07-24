import { DAILY_ACTIVITY_KEYS, hasDailyActivityToday, getLocalDateKey } from './dailyRitual.js'

export const WIDGET_SNAPSHOT_VERSION = 1
export const WIDGET_PROMPT_MAX_CHARS = 140

// Ritual progress for the widget (N of 4). Checker injected for node tests.
export const computeRitualProgress = (hasActivity = hasDailyActivityToday) => {
  const keys = Object.values(DAILY_ACTIVITY_KEYS)
  let done = 0
  for (const key of keys) {
    if (hasActivity(key)) done += 1
  }
  return { done, total: keys.length }
}

// The widget is a dumb renderer: everything here is pre-localized display text.
export const buildWidgetSnapshot = ({
  dateKey = getLocalDateKey(),
  skyLine = '',
  promptText = '',
  progressDone = 0,
  progressTotal = 4,
} = {}) => ({
  v: WIDGET_SNAPSHOT_VERSION,
  dateKey: String(dateKey || ''),
  skyLine: String(skyLine || '').trim().slice(0, 80),
  promptText: String(promptText || '').trim().slice(0, WIDGET_PROMPT_MAX_CHARS),
  progressDone: Math.max(0, Math.min(9, Number(progressDone) || 0)),
  progressTotal: Math.max(1, Math.min(9, Number(progressTotal) || 4)),
})

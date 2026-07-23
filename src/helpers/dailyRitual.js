import { RETENTION_EVENTS } from '../constants/analyticsEvents.js'

const ACTIVITY_STORAGE_PREFIX = 'arcana_daily_activity_'
const STREAK_STORAGE_PREFIX = 'arcana_daily_streak_'
const JOURNEY_STORAGE_KEY = 'arcana_daily_journey_v1'
const JOURNEY_RETENTION_DAYS = 45
const MS_PER_DAY = 86400000
const LOCAL_ACTIVITY_POINTS = 10
const LOCAL_FULL_DAY_BONUS_POINTS = 20

export const DAILY_ACTIVITY_KEYS = Object.freeze({
  dailyCard: 'daily_card',
  horoscope: 'horoscope',
  tarot: 'tarot',
  reflection: 'reflection',
})
// A "full day" is any 3 of the 4 activities — mirrors the server threshold in
// ritual-track/ritual-dashboard, which stays at 3 by design.
export const DAILY_FULL_DAY_THRESHOLD = 3
const ALLOWED_ACTIVITIES = new Set(Object.values(DAILY_ACTIVITY_KEYS))

export const getLocalDateKey = (value = new Date()) => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getActivityStorageKey = (activity) => `${ACTIVITY_STORAGE_PREFIX}${String(activity || '').trim()}`
const getStreakStorageKey = (activity) => `${STREAK_STORAGE_PREFIX}${String(activity || '').trim()}`

const normalizeActivities = (value) => {
  if (!Array.isArray(value)) return []
  const out = []
  for (const item of value) {
    const key = String(item || '').trim()
    if (!ALLOWED_ACTIVITIES.has(key)) continue
    if (out.includes(key)) continue
    out.push(key)
  }
  return out
}

const parseDateKey = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  return new Date(year, month, day)
}

const isPreviousDay = (lastDateKey, nextDateKey) => {
  const last = parseDateKey(lastDateKey)
  const next = parseDateKey(nextDateKey)
  if (!last || !next) return false
  const diffDays = Math.round((next.getTime() - last.getTime()) / MS_PER_DAY)
  return diffDays === 1
}

const diffDaysBetween = (fromDateKey, toDateKey) => {
  const from = parseDateKey(fromDateKey)
  const to = parseDateKey(toDateKey)
  if (!from || !to) return null
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY)
}

const readJourneyMap = () => {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(JOURNEY_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out = {}
    for (const [dateKey, activities] of Object.entries(parsed)) {
      if (!parseDateKey(dateKey)) continue
      const normalized = normalizeActivities(activities)
      if (!normalized.length) continue
      out[dateKey] = normalized
    }
    return out
  } catch {
    return {}
  }
}

const pruneJourneyMap = (journeyMap, baseDateKey) => {
  const out = {}
  for (const [dateKey, activities] of Object.entries(journeyMap || {})) {
    const diff = diffDaysBetween(dateKey, baseDateKey)
    if (diff == null) continue
    if (diff < 0 || diff > JOURNEY_RETENTION_DAYS) continue
    const normalized = normalizeActivities(activities)
    if (!normalized.length) continue
    out[dateKey] = normalized
  }
  return out
}

const writeJourneyMap = (journeyMap) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(journeyMap))
  } catch {
    // ignore storage errors
  }
}

const recordDailyJourneyActivity = (activity, value = new Date()) => {
  const normalizedActivity = String(activity || '').trim()
  if (!ALLOWED_ACTIVITIES.has(normalizedActivity)) return
  const dateKey = getLocalDateKey(value)
  const journey = readJourneyMap()
  const current = normalizeActivities(journey[dateKey])
  if (!current.includes(normalizedActivity)) {
    current.push(normalizedActivity)
  }
  journey[dateKey] = current
  const next = pruneJourneyMap(journey, dateKey)
  writeJourneyMap(next)
}

export const markDailyActivity = (activity) => {
  if (typeof window === 'undefined') return
  const normalized = String(activity || '').trim()
  if (!ALLOWED_ACTIVITIES.has(normalized)) return
  const wasNewToday = !hasDailyActivityToday(normalized)
  const payload = {
    date: getLocalDateKey(),
    updatedAt: new Date().toISOString(),
  }
  try {
    localStorage.setItem(getActivityStorageKey(normalized), JSON.stringify(payload))
  } catch {
    // ignore storage errors
  }

  touchDailyStreak(normalized)
  recordDailyJourneyActivity(normalized)

  // Fire a retention engagement event once per activity per day. Dynamic import
  // keeps the analytics/Firebase deps out of this helper's static graph (it is
  // unit-tested under node --test); fire-and-forget, never throws.
  if (wasNewToday) {
    import('../services/analytics.js')
      .then(({ analytics }) =>
        analytics.logEvent(RETENTION_EVENTS.ritualComplete, { activity: normalized }),
      )
      .catch(() => {})
  }
}

export const readDailyActivityDate = (activity) => {
  if (typeof window === 'undefined') return ''
  const normalized = String(activity || '').trim()
  if (!normalized) return ''
  try {
    const raw = localStorage.getItem(getActivityStorageKey(normalized))
    if (!raw) return ''
    const parsed = JSON.parse(raw)
    return String(parsed?.date || '')
  } catch {
    return ''
  }
}

export const hasDailyActivityToday = (activity, value = new Date()) =>
  readDailyActivityDate(activity) === getLocalDateKey(value)

export const readDailyStreak = (activity) => {
  const empty = { current: 0, best: 0, lastDate: '' }
  if (typeof window === 'undefined') return empty
  const normalized = String(activity || '').trim()
  if (!normalized) return empty
  try {
    const raw = localStorage.getItem(getStreakStorageKey(normalized))
    if (!raw) return empty
    const parsed = JSON.parse(raw)
    const current = Math.max(0, Number(parsed?.current || 0) || 0)
    const best = Math.max(current, Number(parsed?.best || 0) || 0)
    const lastDate = String(parsed?.lastDate || '')
    return { current, best, lastDate }
  } catch {
    return empty
  }
}

export const touchDailyStreak = (activity, value = new Date()) => {
  if (typeof window === 'undefined') return readDailyStreak(activity)
  const normalized = String(activity || '').trim()
  if (!normalized) return readDailyStreak(activity)

  const today = getLocalDateKey(value)
  const prev = readDailyStreak(normalized)
  let nextCurrent = prev.current

  if (prev.lastDate === today) {
    return prev
  }

  if (prev.lastDate && isPreviousDay(prev.lastDate, today)) {
    nextCurrent = Math.max(1, prev.current + 1)
  } else {
    nextCurrent = 1
  }

  const next = {
    current: nextCurrent,
    best: Math.max(prev.best, nextCurrent),
    lastDate: today,
  }

  try {
    localStorage.setItem(getStreakStorageKey(normalized), JSON.stringify(next))
  } catch {
    // ignore storage errors
  }

  return next
}

export const getTimeUntilNextLocalMidnight = (value = new Date()) => {
  const now = value instanceof Date ? value : new Date(value)
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const diffMs = Math.max(0, next.getTime() - now.getTime())
  const totalMinutes = Math.ceil(diffMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return { totalMinutes, hours, minutes }
}

export const getRecentDailyJourney = (days = 7, value = new Date()) => {
  const count = Math.max(1, Math.min(31, Number(days) || 7))
  const base = value instanceof Date ? value : new Date(value)
  const today = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  const todayKey = getLocalDateKey(today)
  const journey = pruneJourneyMap(readJourneyMap(), todayKey)

  const rows = []
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const dateKey = getLocalDateKey(date)
    const activities = normalizeActivities(journey[dateKey])
    rows.push({
      dateKey,
      date,
      activities,
      total: activities.length,
      hasDailyCard: activities.includes(DAILY_ACTIVITY_KEYS.dailyCard),
      hasHoroscope: activities.includes(DAILY_ACTIVITY_KEYS.horoscope),
      hasTarot: activities.includes(DAILY_ACTIVITY_KEYS.tarot),
      hasReflection: activities.includes(DAILY_ACTIVITY_KEYS.reflection),
    })
  }
  return rows
}

export const computeLocalRitualPoints = (value = new Date()) => {
  const baseDate = value instanceof Date ? value : new Date(value)
  const todayKey = getLocalDateKey(baseDate)
  const journey = pruneJourneyMap(readJourneyMap(), todayKey)
  let balance = 0
  let activeDaysCount = 0
  let fullDaysCount = 0

  for (const activities of Object.values(journey)) {
    const normalized = normalizeActivities(activities)
    if (!normalized.length) continue
    activeDaysCount += 1
    balance += normalized.length * LOCAL_ACTIVITY_POINTS
    if (normalized.length >= DAILY_FULL_DAY_THRESHOLD) {
      balance += LOCAL_FULL_DAY_BONUS_POINTS
      fullDaysCount += 1
    }
  }

  return {
    balance,
    lifetime: balance,
    activeDaysCount,
    fullDaysCount,
  }
}

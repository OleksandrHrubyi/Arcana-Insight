import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule, installBrowserEnv } from './utils/testEnv.js'

test('getLocalDateKey formats date as YYYY-MM-DD', async () => {
  const { getLocalDateKey } = await importModule('src/helpers/dailyRitual.js')
  const date = new Date('2026-03-05T13:20:00.000Z')
  assert.equal(getLocalDateKey(date), '2026-03-05')
})

test('markDailyActivity writes activity date and hasDailyActivityToday detects it', async () => {
  const env = installBrowserEnv()
  try {
    const {
      DAILY_ACTIVITY_KEYS,
      markDailyActivity,
      readDailyActivityDate,
      hasDailyActivityToday,
      getLocalDateKey,
    } = await importModule('src/helpers/dailyRitual.js')

    markDailyActivity(DAILY_ACTIVITY_KEYS.dailyCard)

    const expectedDate = getLocalDateKey(new Date())
    assert.equal(readDailyActivityDate(DAILY_ACTIVITY_KEYS.dailyCard), expectedDate)
    assert.equal(hasDailyActivityToday(DAILY_ACTIVITY_KEYS.dailyCard), true)
  } finally {
    env.restore()
  }
})

test('reflection is a first-class daily activity and full-day stays at 3 of 4', async () => {
  const env = installBrowserEnv()
  try {
    const {
      DAILY_ACTIVITY_KEYS,
      DAILY_FULL_DAY_THRESHOLD,
      markDailyActivity,
      hasDailyActivityToday,
      getRecentDailyJourney,
      computeLocalRitualPoints,
    } = await importModule('src/helpers/dailyRitual.js')

    assert.equal(DAILY_ACTIVITY_KEYS.reflection, 'reflection')
    assert.equal(DAILY_FULL_DAY_THRESHOLD, 3)

    markDailyActivity(DAILY_ACTIVITY_KEYS.reflection)
    assert.equal(hasDailyActivityToday(DAILY_ACTIVITY_KEYS.reflection), true)
    const todayRow = getRecentDailyJourney(1)[0]
    assert.equal(todayRow.hasReflection, true)

    // Any 3 of 4 activities must count as a full day (bonus awarded).
    markDailyActivity(DAILY_ACTIVITY_KEYS.dailyCard)
    markDailyActivity(DAILY_ACTIVITY_KEYS.horoscope)
    const points = computeLocalRitualPoints()
    assert.equal(points.fullDaysCount, 1)
    assert.equal(points.balance, 3 * 10 + 20)
  } finally {
    env.restore()
  }
})

test('touchDailyStreak increments on consecutive days and resets after gap', async () => {
  const env = installBrowserEnv()
  try {
    const { DAILY_ACTIVITY_KEYS, touchDailyStreak } = await importModule('src/helpers/dailyRitual.js')
    const activity = DAILY_ACTIVITY_KEYS.tarot

    const day1 = touchDailyStreak(activity, new Date('2026-03-10T10:00:00.000Z'))
    const day2 = touchDailyStreak(activity, new Date('2026-03-11T10:00:00.000Z'))
    const day4 = touchDailyStreak(activity, new Date('2026-03-13T10:00:00.000Z'))

    assert.deepEqual(day1, { current: 1, best: 1, lastDate: '2026-03-10' })
    assert.deepEqual(day2, { current: 2, best: 2, lastDate: '2026-03-11' })
    assert.deepEqual(day4, { current: 1, best: 2, lastDate: '2026-03-13' })
  } finally {
    env.restore()
  }
})

test('getRecentDailyJourney returns normalized rows and prunes invalid days', async () => {
  const env = installBrowserEnv({
    arcana_daily_journey_v1: JSON.stringify({
      '2026-01-01': ['daily_card'], // older than retention window relative to base date
      '2026-03-09': ['daily_card', 'tarot', 'unknown'],
      '2026-03-10': ['daily_card', 'horoscope', 'tarot', 'horoscope'],
      '2026-03-11': ['future_invalid'],
      '2026-04-20': ['daily_card'], // future relative to base date
      invalidDate: ['daily_card'],
    }),
  })
  try {
    const { getRecentDailyJourney } = await importModule('src/helpers/dailyRitual.js')
    const rows = getRecentDailyJourney(3, new Date('2026-03-10T12:00:00.000Z'))
    assert.equal(rows.length, 3)

    const march8 = rows.find((row) => row.dateKey === '2026-03-08')
    const march9 = rows.find((row) => row.dateKey === '2026-03-09')
    const march10 = rows.find((row) => row.dateKey === '2026-03-10')

    assert.equal(march8.total, 0)
    assert.deepEqual(march9.activities, ['daily_card', 'tarot'])
    assert.equal(march9.hasTarot, true)
    assert.deepEqual(march10.activities, ['daily_card', 'horoscope', 'tarot'])
    assert.equal(march10.total, 3)
  } finally {
    env.restore()
  }
})

test('getTimeUntilNextLocalMidnight is deterministic for fixed date', async () => {
  const { getTimeUntilNextLocalMidnight } = await importModule('src/helpers/dailyRitual.js')
  const snapshot = getTimeUntilNextLocalMidnight(new Date('2026-03-10T23:10:00'))
  assert.deepEqual(snapshot, { totalMinutes: 50, hours: 0, minutes: 50 })
})

test('markDailyActivity ignores unknown activity keys', async () => {
  const env = installBrowserEnv()
  try {
    const { markDailyActivity, readDailyActivityDate } = await importModule('src/helpers/dailyRitual.js')
    markDailyActivity('unknown_activity')
    assert.equal(readDailyActivityDate('unknown_activity'), '')
  } finally {
    env.restore()
  }
})

test('dailyRitual APIs are safe without window/localStorage', async () => {
  const originalWindow = globalThis.window
  const originalLocalStorage = globalThis.localStorage
  try {
    delete globalThis.window
    delete globalThis.localStorage
    const {
      DAILY_ACTIVITY_KEYS,
      readDailyActivityDate,
      readDailyStreak,
      hasDailyActivityToday,
      markDailyActivity,
      touchDailyStreak,
    } = await importModule('src/helpers/dailyRitual.js')

    assert.equal(readDailyActivityDate(DAILY_ACTIVITY_KEYS.dailyCard), '')
    assert.deepEqual(readDailyStreak(DAILY_ACTIVITY_KEYS.dailyCard), {
      current: 0,
      best: 0,
      lastDate: '',
    })
    assert.equal(hasDailyActivityToday(DAILY_ACTIVITY_KEYS.dailyCard), false)
    assert.doesNotThrow(() => markDailyActivity(DAILY_ACTIVITY_KEYS.dailyCard))
    assert.deepEqual(touchDailyStreak(DAILY_ACTIVITY_KEYS.dailyCard), {
      current: 0,
      best: 0,
      lastDate: '',
    })
  } finally {
    if (typeof originalWindow === 'undefined') delete globalThis.window
    else globalThis.window = originalWindow
    if (typeof originalLocalStorage === 'undefined') delete globalThis.localStorage
    else globalThis.localStorage = originalLocalStorage
  }
})

test('dailyRitual handles malformed stored payloads safely', async () => {
  const env = installBrowserEnv({
    arcana_daily_activity_daily_card: '{broken-json',
    arcana_daily_streak_daily_card: '{broken-json',
  })
  try {
    const { DAILY_ACTIVITY_KEYS, readDailyActivityDate, readDailyStreak } = await importModule(
      'src/helpers/dailyRitual.js',
    )

    assert.equal(readDailyActivityDate(DAILY_ACTIVITY_KEYS.dailyCard), '')
    assert.deepEqual(readDailyStreak(DAILY_ACTIVITY_KEYS.dailyCard), {
      current: 0,
      best: 0,
      lastDate: '',
    })
  } finally {
    env.restore()
  }
})

test('markDailyActivity does not throw if localStorage setItem fails', async () => {
  const originalWindow = globalThis.window
  const originalLocalStorage = globalThis.localStorage
  try {
    const brokenStorage = {
      getItem() {
        return null
      },
      setItem() {
        throw new Error('boom')
      },
      removeItem() {},
      clear() {},
    }
    globalThis.window = {
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return true
      },
    }
    globalThis.localStorage = brokenStorage

    const { DAILY_ACTIVITY_KEYS, markDailyActivity } = await importModule('src/helpers/dailyRitual.js')
    assert.doesNotThrow(() => markDailyActivity(DAILY_ACTIVITY_KEYS.dailyCard))
  } finally {
    if (typeof originalWindow === 'undefined') delete globalThis.window
    else globalThis.window = originalWindow
    if (typeof originalLocalStorage === 'undefined') delete globalThis.localStorage
    else globalThis.localStorage = originalLocalStorage
  }
})

test('touchDailyStreak returns same value when activity already touched today', async () => {
  const env = installBrowserEnv()
  try {
    const { DAILY_ACTIVITY_KEYS, touchDailyStreak } = await importModule('src/helpers/dailyRitual.js')
    const activity = DAILY_ACTIVITY_KEYS.horoscope
    const day = new Date('2026-03-12T08:00:00.000Z')

    const first = touchDailyStreak(activity, day)
    const second = touchDailyStreak(activity, day)
    assert.deepEqual(first, second)
  } finally {
    env.restore()
  }
})

test('dailyRitual handles invalid storage shapes and clamps journey range', async () => {
  const env = installBrowserEnv({
    arcana_daily_journey_v1: JSON.stringify([]),
    arcana_daily_streak_daily_card: JSON.stringify({
      current: -5,
      best: 'invalid',
      lastDate: 'not-a-date',
    }),
  })
  try {
    const {
      DAILY_ACTIVITY_KEYS,
      readDailyActivityDate,
      readDailyStreak,
      getRecentDailyJourney,
      getTimeUntilNextLocalMidnight,
      getLocalDateKey,
    } = await importModule('src/helpers/dailyRitual.js')

    assert.equal(readDailyActivityDate(''), '')
    assert.equal(readDailyActivityDate(DAILY_ACTIVITY_KEYS.dailyCard), '')
    assert.deepEqual(readDailyStreak(DAILY_ACTIVITY_KEYS.dailyCard), {
      current: 0,
      best: 0,
      lastDate: 'not-a-date',
    })

    const rows = getRecentDailyJourney(999, '2026-03-15T22:10:00.000Z')
    assert.equal(rows.length, 31)
    assert.equal(rows.at(-1).dateKey, getLocalDateKey(new Date('2026-03-15T22:10:00.000Z')))

    const midnight = getTimeUntilNextLocalMidnight('2026-03-15T22:10:00.000Z')
    assert.equal(Number.isInteger(midnight.totalMinutes), true)
    assert.equal(Number.isInteger(midnight.hours), true)
    assert.equal(Number.isInteger(midnight.minutes), true)
    assert.equal(midnight.totalMinutes > 0, true)
    assert.equal(midnight.totalMinutes <= 24 * 60, true)
  } finally {
    env.restore()
  }
})

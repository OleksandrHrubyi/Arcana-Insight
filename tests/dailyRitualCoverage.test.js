import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule, installBrowserEnv } from './utils/testEnv.js'

test('daily ritual stable-import flow covers journey, streak and activity branches', async () => {
  const env = installBrowserEnv({
    arcana_daily_journey_v1: JSON.stringify({
      '2026-03-09': ['daily_card', 'daily_card', 'tarot', 'invalid'],
      '2099-01-01': ['horoscope'],
      invalid_date: ['daily_card'],
    }),
    arcana_daily_activity_daily_card: JSON.stringify({ date: '2026-03-09', updatedAt: 'x' }),
    arcana_daily_streak_daily_card: JSON.stringify({
      current: 1,
      best: 2,
      lastDate: '2026-03-09',
    }),
  })
  try {
    const mod = await importModule('src/helpers/dailyRitual.js')

    // The streak deliberately counts days on the DEVICE clock, so these dates must
    // be built as local dates. `new Date('2026-03-10')` is UTC midnight — one day
    // earlier west of Greenwich, which broke this fixture (not the product) there.
    const mar9 = new Date(2026, 2, 9, 12, 0, 0)
    const mar10 = new Date(2026, 2, 10, 12, 0, 0)

    assert.equal(mod.readDailyActivityDate(mod.DAILY_ACTIVITY_KEYS.dailyCard), '2026-03-09')
    assert.equal(mod.hasDailyActivityToday(mod.DAILY_ACTIVITY_KEYS.dailyCard, mar10), false)

    mod.markDailyActivity(mod.DAILY_ACTIVITY_KEYS.dailyCard)
    const streakSameDay = mod.touchDailyStreak(mod.DAILY_ACTIVITY_KEYS.dailyCard, mar9)
    assert.equal(streakSameDay.current, 1)
    assert.equal(streakSameDay.best, 2)

    const streakNextDay = mod.touchDailyStreak(mod.DAILY_ACTIVITY_KEYS.dailyCard, mar10)
    assert.equal(streakNextDay.current, 2)
    assert.equal(streakNextDay.best, 2)

    const fallbackForEmptyKey = mod.touchDailyStreak('', mar10)
    assert.deepEqual(fallbackForEmptyKey, { current: 0, best: 0, lastDate: '' })

    const dayRows = mod.getRecentDailyJourney(1, new Date('2026-03-10T13:00:00.000Z'))
    assert.equal(dayRows.length, 1)
    assert.equal(Array.isArray(dayRows[0].activities), true)

    const clampedRows = mod.getRecentDailyJourney(99, '2026-03-10T13:00:00.000Z')
    assert.equal(clampedRows.length, 31)

    const midnight = mod.getTimeUntilNextLocalMidnight(new Date('2026-03-10T23:55:00.000Z'))
    assert.equal(midnight.totalMinutes > 0, true)
    assert.equal(midnight.totalMinutes <= 24 * 60, true)
  } finally {
    env.restore()
  }
})

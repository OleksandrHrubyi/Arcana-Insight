// Acceptance for docs/specs/observer-calendar-day.md — the CALENDAR DATE on the
// sky screens belongs to the observing place too, not just the hours.
// `observer-timezone` moved the clock; this moves the date the clock is on.
// Real astronomy-engine, no mocks.
import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

const astroMod = await import('astronomy-engine')
const Astronomy = astroMod.default || astroMod
const sky = await importModule('src/helpers/skyCore.js')
const skyTime = await importModule('src/helpers/skyTime.js')

// Mirrors src/stores/skyLocation.js (that module pulls in Vue + Capacitor).
const CITIES = [
  { key: 'kyiv', lat: 50.4501, lon: 30.5234, timeZone: 'Europe/Kyiv' },
  { key: 'warsaw', lat: 52.2297, lon: 21.0122, timeZone: 'Europe/Warsaw' },
  { key: 'london', lat: 51.5074, lon: -0.1278, timeZone: 'Europe/London' },
  { key: 'berlin', lat: 52.52, lon: 13.405, timeZone: 'Europe/Berlin' },
  { key: 'paris', lat: 48.8566, lon: 2.3522, timeZone: 'Europe/Paris' },
  { key: 'newYork', lat: 40.7128, lon: -74.006, timeZone: 'America/New_York' },
  { key: 'losAngeles', lat: 34.0522, lon: -118.2437, timeZone: 'America/Los_Angeles' },
  { key: 'tokyo', lat: 35.6762, lon: 139.6503, timeZone: 'Asia/Tokyo' },
  { key: 'dubai', lat: 25.2048, lon: 55.2708, timeZone: 'Asia/Dubai' },
  { key: 'sydney', lat: -33.8688, lon: 151.2093, timeZone: 'Australia/Sydney' },
]

const DEVICE_ZONES = ['Europe/Kyiv', 'America/Los_Angeles', 'Australia/Sydney', 'UTC']

const withDeviceZone = (timeZone, fn) => {
  const previous = process.env.TZ
  process.env.TZ = timeZone
  try {
    return fn()
  } finally {
    if (previous === undefined) delete process.env.TZ
    else process.env.TZ = previous
  }
}

const zoneOf = (timeZone) => ({ timeZone, offsetMinutes: null, source: 'location' })
const KYIV = zoneOf('Europe/Kyiv')
const SYDNEY = zoneOf('Australia/Sydney')

// The two lines SkyPage draws the calendar from (buildMonth): which month opens,
// and which cell is lit. Kept together here so a change to either is caught.
const calendarState = (zone, now) => {
  const today = skyTime.zoneCalendarDate(zone, now)
  return { year: today.year, month: today.month, todayCell: today.day }
}
const isTodayCell = (zone, now, viewYear, viewMonth, day) => {
  const today = skyTime.zoneCalendarDate(zone, now)
  return today.year === viewYear && today.month === viewMonth && today.day === day
}

// ── A. Календар Місяця (R1, R2) ──────────────────────────────────────────────

// The reviewer's case, and the worst one: not the highlight but the whole month
// was off — the header said 1 August while the grid showed July.
test('A1: LA device, default Kyiv location, 2026-08-01T06:30Z — calendar opens on August, cell 1', () => {
  const now = new Date('2026-08-01T06:30:00Z')
  // The base this replaces: the device really is on 31 July at that instant.
  withDeviceZone('America/Los_Angeles', () => {
    assert.equal(new Date(now).getDate(), 31, 'base: device date is 31 July')
    assert.equal(new Date(now).getMonth(), 6, 'base: device month is July')
  })
  const state = withDeviceZone('America/Los_Angeles', () => calendarState(KYIV, now))
  assert.deepEqual(state, { year: 2026, month: 7, todayCell: 1 })
  // The header on the same screen prints the same number.
  assert.equal(
    skyTime.formatZoneTime(now, KYIV, 'uk', { month: 'long', day: 'numeric' }),
    '1 серпня',
  )
})

test('A2: same device, 2026-08-02T21:30Z — cell 3, not 2', () => {
  const now = new Date('2026-08-02T21:30:00Z')
  withDeviceZone('America/Los_Angeles', () => {
    assert.equal(new Date(now).getDate(), 2, 'base: device date is 2 August')
  })
  const state = withDeviceZone('America/Los_Angeles', () => calendarState(KYIV, now))
  assert.deepEqual(state, { year: 2026, month: 7, todayCell: 3 })
})

test('A3: Kyiv device, Sydney location, 2026-08-01T20:00Z — cell 2, not 1', () => {
  const now = new Date('2026-08-01T20:00:00Z')
  withDeviceZone('Europe/Kyiv', () => {
    assert.equal(new Date(now).getDate(), 1, 'base: device date is 1 August')
  })
  const state = withDeviceZone('Europe/Kyiv', () => calendarState(SYDNEY, now))
  assert.deepEqual(state, { year: 2026, month: 7, todayCell: 2 })
})

// The common case is device == location. Breaking it while fixing the rare one
// would be a worse bug than the one being fixed.
test('A4: device zone equals location zone — the calendar matches the device date all day', () => {
  const days = ['2026-08-01', '2026-01-15', '2026-03-29', '2026-10-25']
  let checked = 0
  for (const city of CITIES) {
    const zone = zoneOf(city.timeZone)
    for (const day of days) {
      for (let hour = 0; hour < 24; hour += 1) {
        const now = new Date(`${day}T${String(hour).padStart(2, '0')}:30:00Z`)
        withDeviceZone(city.timeZone, () => {
          const d = new Date(now)
          assert.deepEqual(
            skyTime.zoneCalendarDate(zone, now),
            { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() },
            `${city.key} @ ${day} ${hour}:30Z`,
          )
          checked += 1
        })
      }
    }
  }
  assert.equal(checked, CITIES.length * days.length * 24) // 960 combinations
})

test('A5: the zone date is a pure helper — DST, half-hour zones, UTC+14, longitude fallback', () => {
  const la = zoneOf('America/Los_Angeles')
  // Both sides of the spring-forward: 23:59 PST is still the 7th, 00:00 PDT is the 9th.
  assert.deepEqual(skyTime.zoneCalendarDate(la, new Date('2026-03-08T07:59:00Z')), { year: 2026, month: 2, day: 7 })
  assert.deepEqual(skyTime.zoneCalendarDate(la, new Date('2026-03-09T07:00:00Z')), { year: 2026, month: 2, day: 9 })
  // Both sides of the fall-back (UTC−7 → UTC−8 at 09:00 UTC on 1 November).
  assert.deepEqual(skyTime.zoneCalendarDate(la, new Date('2026-11-01T06:59:00Z')), { year: 2026, month: 9, day: 31 })
  assert.deepEqual(skyTime.zoneCalendarDate(la, new Date('2026-11-02T08:00:00Z')), { year: 2026, month: 10, day: 2 })

  // A half-hour offset (UTC+5:30) — the midnight boundary is not on the hour.
  const kolkata = zoneOf('Asia/Kolkata')
  assert.deepEqual(skyTime.zoneCalendarDate(kolkata, new Date('2026-08-01T18:25:00Z')), { year: 2026, month: 7, day: 1 })
  assert.deepEqual(skyTime.zoneCalendarDate(kolkata, new Date('2026-08-01T18:35:00Z')), { year: 2026, month: 7, day: 2 })

  // The far edge of the zone map: UTC+14 is already tomorrow for most of the day.
  const kiritimati = zoneOf('Pacific/Kiritimati')
  assert.deepEqual(skyTime.zoneCalendarDate(kiritimati, new Date('2026-08-01T09:55:00Z')), { year: 2026, month: 7, day: 1 })
  assert.deepEqual(skyTime.zoneCalendarDate(kiritimati, new Date('2026-08-01T10:05:00Z')), { year: 2026, month: 7, day: 2 })

  // The longitude fallback carries no IANA id — bare coordinates must not fall
  // back to the device calendar. (lon 30.52 → +122 min for Kyiv.)
  const solar = skyTime.resolveObserverZone({ lat: 50.4501, lon: 30.5234, source: 'manual' })
  assert.equal(solar.source, 'longitude')
  assert.deepEqual(skyTime.zoneCalendarDate(solar, new Date('2026-08-01T21:57:00Z')), { year: 2026, month: 7, day: 1 })
  assert.deepEqual(skyTime.zoneCalendarDate(solar, new Date('2026-08-01T21:59:00Z')), { year: 2026, month: 7, day: 2 })

  // A year boundary in a zone ahead of the device.
  assert.deepEqual(skyTime.zoneCalendarDate(SYDNEY, new Date('2026-12-31T14:00:00Z')), { year: 2027, month: 0, day: 1 })
})

test('A6: the highlight lives only in the location month, and paging works over the year edge', () => {
  const now = new Date('2026-08-01T06:30:00Z') // Kyiv: 1 August; LA device: 31 July
  assert.equal(isTodayCell(KYIV, now, 2026, 7, 1), true, 'lit in the location month')
  assert.equal(isTodayCell(KYIV, now, 2026, 6, 31), false, 'not lit in the device month')
  assert.equal(isTodayCell(KYIV, now, 2026, 8, 1), false, 'not lit after paging forward')

  // stepMonth's arithmetic across the year edge (the page's own two branches).
  const step = (year, month, delta) => {
    let m = month + delta
    let y = year
    if (m < 0) {
      m = 11
      y -= 1
    } else if (m > 11) {
      m = 0
      y += 1
    }
    return { year: y, month: m }
  }
  assert.deepEqual(step(2026, 11, 1), { year: 2027, month: 0 })
  assert.deepEqual(step(2026, 0, -1), { year: 2025, month: 11 })
  const nye = new Date('2026-12-31T14:00:00Z') // already 1 January in Sydney
  const state = calendarState(SYDNEY, nye)
  assert.deepEqual(state, { year: 2027, month: 0, todayCell: 1 })
  assert.equal(isTodayCell(SYDNEY, nye, ...Object.values(step(state.year, state.month, -1)), 31), false)
})

// ── B. Дати подій (R3) ───────────────────────────────────────────────────────

const feedFor = (zone, now, opts = {}) =>
  sky.computeUpcomingSkyEvents(Astronomy, now, { horizonDays: 120, limit: 12, zone, ...opts })

const onZoneClock = (date, zone) =>
  skyTime.formatZoneTime(date, zone, 'uk', { month: 'long', day: 'numeric' }) +
  ', ' +
  skyTime.formatZoneTime(date, zone, 'uk', { hour: '2-digit', minute: '2-digit' })

test('B1/B2: the Perseid peak is 12 August, 22:00 on the location clock — from any device', () => {
  const now = new Date('2026-08-01T12:00:00Z')
  for (const deviceZone of DEVICE_ZONES) {
    const feed = withDeviceZone(deviceZone, () => feedFor(KYIV, now))
    const perseids = feed.find((e) => e.type === 'meteor' && e.key === 'perseids')
    assert.ok(perseids, `${deviceZone}: perseids in the feed`)
    // Was "13 серпня, 08:00" on an LA device.
    assert.equal(onZoneClock(perseids.date, KYIV), '12 серпня, 22:00', `device ${deviceZone}`)
  }
})

test('B3: no meteor peak is stamped between 04:00 and 18:00 on the location clock', () => {
  const start = new Date('2026-01-01T00:00:00Z')
  let checked = 0
  for (const deviceZone of DEVICE_ZONES) {
    for (const city of CITIES) {
      const zone = zoneOf(city.timeZone)
      const feed = withDeviceZone(deviceZone, () =>
        feedFor(zone, start, { horizonDays: 400, limit: 200 }),
      )
      const meteors = feed.filter((e) => e.type === 'meteor')
      assert.ok(meteors.length >= sky.METEOR_SHOWERS.length, `${city.key} @ ${deviceZone}: all showers present`)
      for (const ev of meteors) {
        const hour = Number(skyTime.formatZoneTime(ev.date, zone, 'en-GB', { hour: '2-digit', hour12: false }))
        assert.equal(hour, 22, `${ev.key} @ ${city.key} on a ${deviceZone} device`)
        assert.ok(hour < 4 || hour >= 18, `${ev.key}: evening, not daytime`)
        checked += 1
      }
    }
  }
  assert.ok(checked >= sky.METEOR_SHOWERS.length * CITIES.length * DEVICE_ZONES.length)
})

// ── C. Мітки часу (R4) ───────────────────────────────────────────────────────

// The page's untilLabel, in one line: this is what the assertions below read.
const untilKey = (days) => (days <= 0 ? 'today' : days === 1 ? 'tomorrow' : `inDays:${days}`)

test('C1: 2026-08-11 12:00 in Kyiv — the 12 August events are "tomorrow", not "in 2 days"', () => {
  const now = new Date('2026-08-11T09:00:00Z') // 12:00 у Києві
  const feed = withDeviceZone('Europe/Kyiv', () => feedFor(KYIV, now))

  const perseids = feed.find((e) => e.type === 'meteor' && e.key === 'perseids')
  assert.ok(perseids)
  assert.equal(untilKey(perseids.daysUntil), 'tomorrow') // was inDays:2
  assert.equal(skyTime.zoneCalendarDate(KYIV, perseids.date).day, 12)

  const newMoon = feed.find((e) => e.type === 'moonPhase' && e.key === 'newMoon')
  assert.ok(newMoon)
  assert.equal(skyTime.zoneCalendarDate(KYIV, newMoon.date).day, 12, 'the new moon of 12 August')
  assert.equal(untilKey(newMoon.daysUntil), 'tomorrow') // was inDays:2
})

test('C2: every label agrees with the date printed next to it', () => {
  const moments = ['2026-08-01T12:00:00Z', '2026-08-11T09:00:00Z', '2026-12-31T14:00:00Z']
  let checked = 0
  for (const deviceZone of DEVICE_ZONES) {
    for (const city of CITIES) {
      const zone = zoneOf(city.timeZone)
      for (const iso of moments) {
        const now = new Date(iso)
        const feed = withDeviceZone(deviceZone, () => feedFor(zone, now))
        const today = skyTime.zoneCalendarDate(zone, now)
        for (const ev of feed) {
          const evDate = skyTime.zoneCalendarDate(zone, ev.date)
          const expected = skyTime.zoneCalendarDaysBetween(zone, now, ev.date)
          assert.equal(
            ev.daysUntil,
            Math.max(0, expected),
            `${ev.type}:${ev.key} @ ${city.key}/${deviceZone} — label vs printed date`,
          )
          if (ev.daysUntil === 0) {
            assert.deepEqual(evDate, today, `${ev.key}: "сьогодні" is today's date`)
          }
          checked += 1
        }
      }
    }
  }
  assert.ok(checked > 0)
})

test('C3: 30 minutes away but past the location midnight is "tomorrow", not "today"', () => {
  // 23:45 → 00:15 in Kyiv: half an hour, but a different date.
  const before = new Date('2026-08-11T20:45:00Z')
  const after = new Date('2026-08-11T21:15:00Z')
  assert.equal(untilKey(skyTime.zoneCalendarDaysBetween(KYIV, before, after)), 'tomorrow')
  // The mirror case: 30 hours ahead inside a long span is not automatically 2 days.
  const sameDayLater = new Date('2026-08-11T18:00:00Z') // 21:00 у Києві
  const nextEvening = new Date('2026-08-12T18:00:00Z') // 21:00 наступного дня
  assert.equal(untilKey(skyTime.zoneCalendarDaysBetween(KYIV, sameDayLater, nextEvening)), 'tomorrow')
  // And an event earlier the same calendar day still reads "сьогодні".
  assert.equal(untilKey(skyTime.zoneCalendarDaysBetween(KYIV, after, new Date('2026-08-11T22:00:00Z'))), 'today')
})

test('R3: the evening stamp survives a DST change in the location zone', () => {
  // Orionids, 21 October: Kyiv is still on EEST (UTC+3) — 22:00 local = 19:00 UTC.
  assert.equal(
    skyTime.zoneDateAtWallTime(KYIV, 2026, 9, 21, 22, 0).toISOString(),
    '2026-10-21T19:00:00.000Z',
  )
  // Leonids, 17 November: Kyiv has moved to EET (UTC+2) — 22:00 local = 20:00 UTC.
  assert.equal(
    skyTime.zoneDateAtWallTime(KYIV, 2026, 10, 17, 22, 0).toISOString(),
    '2026-11-17T20:00:00.000Z',
  )
  // The longitude fallback stamps the same way, with no IANA id.
  const solar = { timeZone: null, offsetMinutes: 120, source: 'longitude' }
  assert.equal(
    skyTime.zoneDateAtWallTime(solar, 2026, 7, 12, 22, 0).toISOString(),
    '2026-08-12T20:00:00.000Z',
  )
})

// ── D. Регресія на суміжному ────────────────────────────────────────────────

test('D: the moon-detail sheet counts phases and apsis by the same calendar', () => {
  const now = new Date('2026-08-11T09:00:00Z') // 12:00 у Києві
  for (const deviceZone of DEVICE_ZONES) {
    const detail = withDeviceZone(deviceZone, () => sky.computeMoonDetail(Astronomy, now, { zone: KYIV }))
    for (const ph of detail.nextPhases) {
      assert.equal(
        ph.daysUntil,
        Math.max(0, skyTime.zoneCalendarDaysBetween(KYIV, now, ph.date)),
        `${ph.key} on a ${deviceZone} device`,
      )
    }
    assert.equal(
      detail.nextApsis.daysUntil,
      Math.max(0, skyTime.zoneCalendarDaysBetween(KYIV, now, detail.nextApsis.date)),
      `apsis on a ${deviceZone} device`,
    )
  }
})

test('D: omitting the zone keeps the device calendar (callers that never pass one)', () => {
  const now = new Date('2026-08-11T09:00:00Z')
  withDeviceZone('Europe/Kyiv', () => {
    const withZone = sky.computeUpcomingSkyEvents(Astronomy, now, { zone: KYIV, limit: 12 })
    const withoutZone = sky.computeUpcomingSkyEvents(Astronomy, now, { limit: 12 })
    assert.equal(JSON.stringify(withoutZone), JSON.stringify(withZone))
  })
})

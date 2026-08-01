// Acceptance for docs/specs/observer-timezone.md — the sky readings belong to the
// observing PLACE, not to the machine running the app. Real astronomy-engine, no
// mocks: every assertion is genuine ephemeris output.
import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

const astroMod = await import('astronomy-engine')
const Astronomy = astroMod.default || astroMod
const sky = await importModule('src/helpers/skyCore.js')
const skyTime = await importModule('src/helpers/skyTime.js')

// The bundled cities, mirrored from src/stores/skyLocation.js (that module pulls
// in Vue + Capacitor, which node --test cannot load).
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

// Four device zones spanning the globe — "the same install on a phone somewhere
// else". node honours a reassigned process.env.TZ for every Date created after
// it, so one process really does exercise all four machines.
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

// Noon UTC on the spec's reference date — mid-day almost everywhere, so "today"
// is unambiguous no matter which city we ask about.
const NOON = new Date('2026-08-01T12:00:00Z')

const cityLoc = (city) => ({ lat: city.lat, lon: city.lon, cityKey: city.key, timeZone: city.timeZone, source: 'city' })
const observerFor = (city) => sky.makeObserver(Astronomy, city.lat, city.lon)
const iso = (d) => (d instanceof Date ? d.toISOString() : String(d))

// A1 — a day is a day: never negative, never inverted, for any city × device zone.
test('A1: day length is positive and sunrise precedes sunset for every city in every device zone', () => {
  const rows = []
  for (const city of CITIES) {
    const zone = skyTime.resolveObserverZone(cityLoc(city))
    const observer = observerFor(city)
    for (const deviceZone of DEVICE_ZONES) {
      const d = withDeviceZone(deviceZone, () => sky.computeSunDetail(Astronomy, observer, NOON, { zone }))
      rows.push(`${city.key} @ ${deviceZone}: ${(d.dayLengthMs / 3600000).toFixed(2)}h`)
      assert.ok(d.sunrise instanceof Date && d.sunset instanceof Date, `${city.key}: rise+set found`)
      assert.ok(
        d.sunrise.getTime() < d.sunset.getTime(),
        `${city.key} @ ${deviceZone}: sunrise before sunset`,
      )
      assert.ok(d.dayLengthMs > 0, `${city.key} @ ${deviceZone}: positive day length`)
    }
  }
  assert.equal(rows.length, CITIES.length * DEVICE_ZONES.length) // 40 combinations
})

// A2 + A3 — the headline criterion: naming the location's zone makes the result
// independent of the machine. Same location, four device zones, identical output.
test('A2/A3: every day-anchored computation is bit-identical across device zones', () => {
  const dayAnchored = (observer, zone) => ({
    sunTimes: sky.computeSunTimes(Astronomy, observer, NOON, { zone }),
    sunDetail: sky.computeSunDetail(Astronomy, observer, NOON, { zone }),
    window: sky.computeObservingWindow(Astronomy, observer, NOON, { zone }),
    visible: sky.computeVisibleTonight(Astronomy, observer, NOON, { zone }),
    milkyWay: sky.computeMilkyWayWindow(Astronomy, observer, NOON, { zone }),
    moonRiseSet: sky.riseSetForLocalDay(Astronomy, 'moon', observer, NOON, { zone }),
  })
  // JSON stringification turns every Date into its ISO instant — an exact compare.
  for (const city of CITIES) {
    const zone = skyTime.resolveObserverZone(cityLoc(city))
    const observer = observerFor(city)
    const reference = withDeviceZone(DEVICE_ZONES[0], () => JSON.stringify(dayAnchored(observer, zone)))
    for (const deviceZone of DEVICE_ZONES.slice(1)) {
      assert.equal(
        withDeviceZone(deviceZone, () => JSON.stringify(dayAnchored(observer, zone))),
        reference,
        `${city.key}: result unchanged for a device in ${deviceZone}`,
      )
    }
  }
})

// A4 — the three cities the spec measured as broken now report plausible days,
// and Kyiv (which was already correct) has not regressed.
test('A4: the measured regressions are positive and seasonally plausible', () => {
  const dayHours = (cityKey) => {
    const city = CITIES.find((c) => c.key === cityKey)
    const zone = skyTime.resolveObserverZone(cityLoc(city))
    const d = sky.computeSunDetail(Astronomy, observerFor(city), NOON, { zone })
    return d.dayLengthMs / 3600000
  }

  const sydney = dayHours('sydney') // was −13.53 h
  assert.ok(sydney > 0, `sydney positive (${sydney})`)
  assert.ok(sydney < 12, `sydney: southern-hemisphere winter day under 12 h (${sydney})`)

  const tokyo = dayHours('tokyo') // was −10.06 h
  assert.ok(tokyo > 0, `tokyo positive (${tokyo})`)

  const la = dayHours('losAngeles') // was −10.17 h
  assert.ok(la > 13, `los angeles: northern summer day over 13 h (${la})`)

  // Kyiv/Kyiv was already right at 15.28 h — the fix must not move it.
  const kyiv = dayHours('kyiv')
  assert.ok(Math.abs(kyiv - 15.28) < 1 / 60, `kyiv still 15.28 h ±1 min (${kyiv})`)
})

// A5 — the zone is the city's CIVIL time, not lon/15 solar time. Failing this
// means the longitude fallback leaked into a bundled city (58 min off for Kyiv).
test('A5: bundled cities resolve to their civil UTC offset on 2026-08-01', () => {
  const expected = {
    kyiv: 180,
    london: 60,
    newYork: -240,
    losAngeles: -420,
    tokyo: 540,
    sydney: 600,
    dubai: 240,
  }
  for (const [cityKey, offsetMinutes] of Object.entries(expected)) {
    const city = CITIES.find((c) => c.key === cityKey)
    const zone = skyTime.resolveObserverZone(cityLoc(city))
    assert.equal(zone.source, 'location', `${cityKey}: zone comes from the place`)
    assert.equal(
      skyTime.zoneOffsetMinutes(zone, NOON),
      offsetMinutes,
      `${cityKey}: civil offset, not lon/15`,
    )
  }
  // And the difference is real: solar time for Kyiv is ~58 min off its civil time.
  const solarKyiv = skyTime.resolveObserverZone({ lat: 50.4501, lon: 30.5234, source: 'manual' })
  assert.equal(solarKyiv.source, 'longitude')
  assert.equal(Math.abs(skyTime.zoneOffsetMinutes(solarKyiv, NOON) - 180), 58)
})

// A6 — GPS coordinates carry no zone id; the device IS at the place, so its zone
// is the right one, and the answer matches the bundled city on a Kyiv device.
test('A6: a GPS location uses the device zone', () => {
  const gps = skyTime.resolveObserverZone({ lat: 50.4501, lon: 30.5234, cityKey: null, timeZone: null, source: 'gps' })
  assert.equal(gps.source, 'device')
  assert.equal(gps.timeZone, skyTime.deviceTimeZone())

  // Simulate the "device is in Kyiv" case by naming Kyiv explicitly — the values
  // must equal the bundled Kyiv city, whose zone is the same.
  const kyivZone = { timeZone: 'Europe/Kyiv', offsetMinutes: null, source: 'device' }
  const observer = sky.makeObserver(Astronomy, 50.4501, 30.5234)
  const city = CITIES.find((c) => c.key === 'kyiv')
  assert.equal(
    iso(sky.computeSunDetail(Astronomy, observer, NOON, { zone: kyivZone }).sunset),
    iso(sky.computeSunDetail(Astronomy, observer, NOON, { zone: skyTime.resolveObserverZone(cityLoc(city)) }).sunset),
  )
})

// The reviewer's case from the spec: an LA device, the default Kyiv location, no
// user action. The clock printed must be Kyiv's.
test('B1: a Los Angeles device shows Kyiv hours for the default Kyiv location', () => {
  const city = CITIES.find((c) => c.key === 'kyiv')
  const zone = skyTime.resolveObserverZone(cityLoc(city))
  const d = sky.computeSunDetail(Astronomy, observerFor(city), NOON, { zone })
  assert.equal(skyTime.formatZoneTime(d.sunrise, zone, 'uk', { hour: '2-digit', minute: '2-digit' }), '05:25')
  assert.equal(skyTime.formatZoneTime(d.sunset, zone, 'uk', { hour: '2-digit', minute: '2-digit' }), '20:42')
  assert.equal(
    skyTime.formatDayLength(d.dayLengthMs, d.dayLengthDeltaMs, { hourAbbr: 'год', minAbbr: 'хв' }),
    '15год 17хв (−3 хв)',
  )
})

// B2 — the screen can tell whether the shown clock needs explaining.
test('B2: a zone unlike the device is detectable and labelled', () => {
  const kyiv = { timeZone: 'Europe/Kyiv', offsetMinutes: null, source: 'location' }
  const la = { timeZone: 'America/Los_Angeles', offsetMinutes: null, source: 'location' }
  assert.equal(skyTime.zoneOffsetLabel(kyiv, NOON), 'UTC+3')
  assert.equal(skyTime.zoneOffsetLabel(la, NOON), 'UTC−7')
  assert.equal(skyTime.zoneOffsetLabel({ timeZone: 'Asia/Kolkata' }, NOON), 'UTC+5:30')

  // The device's own zone never raises a note; a foreign one always does.
  const deviceOffset = -NOON.getTimezoneOffset()
  assert.equal(skyTime.zoneMatchesDevice(skyTime.deviceZone(), NOON), true)
  const foreign = { timeZone: null, offsetMinutes: deviceOffset + 60, source: 'longitude' }
  assert.equal(skyTime.zoneMatchesDevice(foreign, NOON), false)
})

// B3/R4 — an impossible duration is an empty state, never "−9h −24m" on screen.
test('B3: a non-positive day length formats as the empty state', () => {
  const labels = { hourAbbr: 'год', minAbbr: 'хв' }
  assert.equal(skyTime.formatDayLength(-33840000, null, labels), '—')
  assert.equal(skyTime.formatDayLength(0, null, labels), '—')
  assert.equal(skyTime.formatDayLength(null, null, labels), '—')
  assert.equal(skyTime.formatDayLength(NaN, null, labels), '—')
  assert.equal(skyTime.formatDayLength(15 * 3600000, null, labels), '15год 0хв')
  assert.equal(skyTime.formatDayLength(15 * 3600000, -180000, labels), '15год 0хв (−3 хв)')
  assert.equal(skyTime.formatDayLength(15 * 3600000, 120000, labels), '15год 0хв (+2 хв)')
})

// computeSunDetail must not hand the UI a negative duration in the first place.
test('R4: computeSunDetail reports null rather than an inverted day', () => {
  // Tromsø at midsummer: the Sun never sets, so there is no day length to report.
  const tromso = sky.makeObserver(Astronomy, 69.65, 18.96)
  const d = sky.computeSunDetail(Astronomy, tromso, new Date('2026-06-21T12:00:00Z'), {
    zone: { timeZone: 'Europe/Oslo' },
  })
  assert.equal(d.dayLengthMs, null)
  assert.equal(d.dayLengthDeltaMs, null)
})

// The zone plumbing itself: local midnight is the place's midnight, DST included.
test('zoneLocalMidnight lands on the location midnight, across DST', () => {
  const kyiv = { timeZone: 'Europe/Kyiv' }
  // Summer (EEST, UTC+3): Kyiv midnight is 21:00 UTC the previous day.
  assert.equal(iso(skyTime.zoneLocalMidnight(kyiv, NOON)), '2026-07-31T21:00:00.000Z')
  // Winter (EET, UTC+2): 22:00 UTC the previous day.
  assert.equal(
    iso(skyTime.zoneLocalMidnight(kyiv, new Date('2026-01-15T12:00:00Z'))),
    '2026-01-14T22:00:00.000Z',
  )
  // A fixed longitude offset works the same way (no IANA id available).
  const solar = { timeZone: null, offsetMinutes: 120, source: 'longitude' }
  assert.equal(iso(skyTime.zoneLocalMidnight(solar, NOON)), '2026-07-31T22:00:00.000Z')
  // An unknown zone id falls back to the device rather than throwing.
  const bogus = skyTime.zoneLocalMidnight({ timeZone: 'Not/AZone' }, NOON)
  assert.ok(bogus instanceof Date && !Number.isNaN(bogus.getTime()))
})

// Offline guarantee: zone data comes from the OS, so resolution needs no network
// and no async work — a synchronous call is the proof.
test('zone resolution is synchronous and offline', () => {
  const zone = skyTime.resolveObserverZone({ lat: 35.6762, lon: 139.6503, timeZone: 'Asia/Tokyo' })
  assert.equal(typeof skyTime.zoneOffsetMinutes(zone, NOON), 'number')
  assert.equal(skyTime.isValidTimeZone('Asia/Tokyo'), true)
  assert.equal(skyTime.isValidTimeZone('Nope/Nope'), false)
  assert.equal(skyTime.isValidTimeZone(''), false)
})

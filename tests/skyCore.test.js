import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

// Real astronomy-engine (no mocks) — assert genuine ephemeris output.
const astroMod = await import('astronomy-engine')
const Astronomy = astroMod.default || astroMod
const sky = await importModule('src/helpers/skyCore.js')

test('phase key + illumination track a full synodic month monotonically', () => {
  const { phaseKeyFromElongation, illuminationFromElongation, isWaxing, MOON_PHASE_KEYS } = sky
  assert.equal(phaseKeyFromElongation(0), 'new')
  assert.equal(phaseKeyFromElongation(90), 'firstQuarter')
  assert.equal(phaseKeyFromElongation(180), 'full')
  assert.equal(phaseKeyFromElongation(270), 'lastQuarter')
  assert.equal(phaseKeyFromElongation(359), 'new')
  assert.ok(MOON_PHASE_KEYS.includes(phaseKeyFromElongation(45)))

  assert.equal(Math.round(illuminationFromElongation(0) * 100), 0)
  assert.equal(Math.round(illuminationFromElongation(180) * 100), 100)
  assert.equal(Math.round(illuminationFromElongation(90) * 100), 50)

  assert.equal(isWaxing(90), true)
  assert.equal(isWaxing(270), false)
})

test('computeSkyForDate returns real, consistent values for a fixed date', () => {
  // 2026-07-26 — deterministic ephemeris.
  const s = sky.computeSkyForDate(Astronomy, new Date('2026-07-26T12:00:00Z'))
  assert.ok(sky.MOON_PHASE_KEYS.includes(s.moonPhaseKey))
  assert.ok(s.illuminationPct >= 0 && s.illuminationPct <= 100)
  assert.equal(typeof s.waxing, 'boolean')
  assert.match(s.moonSignKey, /^[a-z]+$/)
  assert.match(s.sunSignKey, /^[a-z]+$/)
  // Late July: the Sun is in Leo (~Jul 23 – Aug 22).
  assert.equal(s.sunSignKey, 'leo')
  assert.equal(typeof s.mercuryRetrograde, 'boolean')
  // illuminationPct must equal the rounded fraction.
  assert.equal(s.illuminationPct, Math.round(s.illumination * 100))
})

test('month grid covers every day with a valid phase', () => {
  const grid = sky.computeMonthMoonPhases(Astronomy, 2026, 6) // July 2026
  assert.equal(grid.length, 31)
  assert.equal(grid[0].day, 1)
  assert.equal(grid[30].day, 31)
  for (const cell of grid) {
    assert.ok(sky.MOON_PHASE_KEYS.includes(cell.phaseKey))
    assert.ok(cell.illumination >= 0 && cell.illumination <= 1)
  }
  // A synodic month is ~29.5 days, so within any 31-day window the phase must
  // pass through both a near-new and a near-full day.
  assert.ok(grid.some((c) => c.illumination < 0.05))
  assert.ok(grid.some((c) => c.illumination > 0.95))
})

test('upcoming lunar events are in the future and correctly ordered per type', () => {
  const now = new Date('2026-07-26T12:00:00Z')
  const ev = sky.findUpcomingLunarEvents(Astronomy, now)
  for (const key of ['newMoon', 'firstQuarter', 'fullMoon', 'lastQuarter']) {
    assert.ok(ev[key], `${key} found`)
    assert.ok(ev[key].date.getTime() > now.getTime(), `${key} in the future`)
    assert.ok(ev[key].daysUntil >= 0 && ev[key].daysUntil <= 40)
  }
})

test('planet signs return all five visible planets with retrograde flags', () => {
  const planets = sky.computePlanetSigns(Astronomy, new Date('2026-07-26T12:00:00Z'))
  assert.deepEqual(
    planets.map((p) => p.planetKey),
    ['mercury', 'venus', 'mars', 'jupiter', 'saturn'],
  )
  for (const p of planets) {
    assert.match(p.signKey, /^[a-z]+$/)
    assert.ok(p.degInSign >= 0 && p.degInSign < 30)
    assert.equal(typeof p.retrograde, 'boolean')
  }
})

// ── Location-aware sky ───────────────────────────────────────────────────────
const KYIV = { lat: 50.4501, lon: 30.5234 }

test('azimuthToCompassKey maps cardinal + intercardinal directions', () => {
  assert.equal(sky.azimuthToCompassKey(0), 'n')
  assert.equal(sky.azimuthToCompassKey(45), 'ne')
  assert.equal(sky.azimuthToCompassKey(90), 'e')
  assert.equal(sky.azimuthToCompassKey(180), 's')
  assert.equal(sky.azimuthToCompassKey(270), 'w')
  assert.equal(sky.azimuthToCompassKey(360), 'n') // wraps
})

test('sun rise/set/dusk are real and correctly ordered for Kyiv in summer', () => {
  const obs = sky.makeObserver(Astronomy, KYIV.lat, KYIV.lon)
  const date = new Date('2026-07-26T10:00:00Z')
  const { sunrise, sunset, darkStart } = sky.computeSunTimes(Astronomy, obs, date)
  assert.ok(sunrise instanceof Date && sunset instanceof Date, 'sunrise + sunset defined')
  assert.ok(sunrise.getTime() < sunset.getTime(), 'sunrise before sunset')
  assert.ok(darkStart instanceof Date, 'astronomical dusk defined')
  assert.ok(darkStart.getTime() > sunset.getTime(), 'dark sky begins after sunset')
})

test('the Sun is above the horizon over Kyiv at local midday', () => {
  const obs = sky.makeObserver(Astronomy, KYIV.lat, KYIV.lon)
  // 10:00 UTC = 13:00 Kyiv (EEST) — clearly daytime.
  const { altitude } = sky.horizontalPosition(Astronomy, 'sun', obs, new Date('2026-07-26T10:00:00Z'))
  assert.ok(altitude > 0, `sun up at midday (alt=${altitude})`)
})

test('moon rise/set for the local day return Date-or-null without throwing', () => {
  const obs = sky.makeObserver(Astronomy, KYIV.lat, KYIV.lon)
  const { rise, set } = sky.riseSetForLocalDay(Astronomy, 'moon', obs, new Date('2026-07-26T10:00:00Z'))
  for (const v of [rise, set]) assert.ok(v === null || v instanceof Date)
})

test('visible-tonight yields only above-horizon planets with valid fields', () => {
  const obs = sky.makeObserver(Astronomy, KYIV.lat, KYIV.lon)
  const vis = sky.computeVisibleTonight(Astronomy, obs, new Date('2026-07-26T10:00:00Z'))
  assert.ok(Array.isArray(vis))
  for (const p of vis) {
    assert.ok(sky.VISIBLE_BODY_KEYS.includes(p.planetKey))
    assert.ok(p.altitude >= 3, 'above the min altitude')
    assert.ok(['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'].includes(p.azimuthKey))
    assert.equal(typeof p.magnitude, 'number')
    assert.equal(typeof p.retrograde, 'boolean')
  }
  // Sorted by altitude, highest first.
  for (let i = 1; i < vis.length; i += 1) assert.ok(vis[i - 1].altitude >= vis[i].altitude)
})

test('moon detail returns real distance, apparent size, phases and apsis', () => {
  const d = sky.computeMoonDetail(Astronomy, new Date('2026-07-27T12:00:00Z'))
  // Lunar distance always lies between perigee (~356 500) and apogee (~406 700) km.
  assert.ok(d.distanceKm > 356000 && d.distanceKm < 407500, `distance ${d.distanceKm}`)
  // Apparent diameter is about half a degree.
  assert.ok(d.angularDiameterDeg > 0.48 && d.angularDiameterDeg < 0.57, `diam ${d.angularDiameterDeg}`)
  assert.ok(Math.abs(d.librationLon) <= 10 && Math.abs(d.librationLat) <= 10)
  assert.ok(d.illuminationPct >= 0 && d.illuminationPct <= 100)
  // Four principal phases, chronologically ordered, all in the future.
  assert.equal(d.nextPhases.length, 4)
  let prev = 0
  for (const ph of d.nextPhases) {
    assert.ok(['newMoon', 'firstQuarter', 'fullMoon', 'lastQuarter'].includes(ph.key))
    assert.ok(ph.date.getTime() >= prev, 'phases sorted')
    prev = ph.date.getTime()
  }
  assert.ok(['perigee', 'apogee'].includes(d.nextApsis.kind))
  assert.ok(d.nextApsis.distanceKm > 356000 && d.nextApsis.distanceKm < 407500)
})

test('sun detail: dawn before sunrise, real day length + small daily delta', () => {
  const obs = sky.makeObserver(Astronomy, KYIV.lat, KYIV.lon)
  const d = sky.computeSunDetail(Astronomy, obs, new Date('2026-07-27T10:00:00Z'))
  assert.ok(d.dawn instanceof Date && d.sunrise instanceof Date)
  assert.ok(d.dawn.getTime() < d.sunrise.getTime(), 'astronomical dawn precedes sunrise')
  assert.ok(d.goldenEveningStart instanceof Date && d.goldenEveningStart.getTime() < d.sunset.getTime())
  // Kyiv late July: ~15–16 h of daylight.
  const hours = d.dayLengthMs / 3600000
  assert.ok(hours > 14 && hours < 17, `day length ${hours}h`)
  // The day changes by only a few minutes near late July.
  assert.ok(Math.abs(d.dayLengthDeltaMs) < 6 * 60000, 'delta under 6 min')
})

test('upcoming sky-events feed is future, sorted, capped, and typed', () => {
  const now = new Date('2026-07-26T12:00:00Z')
  const feed = sky.computeUpcomingSkyEvents(Astronomy, now, { horizonDays: 120, limit: 8 })
  assert.ok(Array.isArray(feed) && feed.length > 0)
  assert.ok(feed.length <= 8, 'respects the limit')
  const types = new Set(['moonPhase', 'apsis', 'lunarEclipse', 'solarEclipse', 'season', 'meteor'])
  let prev = 0
  for (const e of feed) {
    assert.ok(types.has(e.type), `known type: ${e.type}`)
    assert.ok(e.date instanceof Date && e.date.getTime() >= now.getTime(), 'in the future')
    assert.ok(e.daysUntil >= 0 && e.daysUntil <= 120, 'within horizon')
    assert.ok(e.date.getTime() >= prev, 'date-sorted ascending')
    prev = e.date.getTime()
  }
  // A full moon is due within days of this date — the feed must surface a phase.
  assert.ok(feed.some((e) => e.type === 'moonPhase'), 'includes a moon phase')
})

test('observing window: dark + moonless sub-window are ordered and bounded', () => {
  const obs = sky.makeObserver(Astronomy, KYIV.lat, KYIV.lon)
  // Mid-October: Kyiv has real astronomical night.
  const w = sky.computeObservingWindow(Astronomy, obs, new Date('2026-10-15T15:00:00Z'))
  const qualities = ['noDarkness', 'moonless', 'afterMoonset', 'beforeMoonrise', 'moonWashout']
  assert.ok(qualities.includes(w.quality), `known quality: ${w.quality}`)
  assert.ok(w.moonIlluminationPct >= 0 && w.moonIlluminationPct <= 100)
  assert.ok(w.hasDarkness, 'Kyiv has astronomical darkness in October')
  assert.ok(w.darkStart instanceof Date && w.darkEnd instanceof Date)
  assert.ok(w.darkStart.getTime() < w.darkEnd.getTime(), 'dark window ordered')
  assert.ok(w.windowStart.getTime() >= w.darkStart.getTime(), 'sub-window starts within darkness')
  assert.ok(w.windowEnd.getTime() <= w.darkEnd.getTime(), 'sub-window ends within darkness')
  assert.ok(w.windowStart.getTime() <= w.windowEnd.getTime(), 'sub-window ordered')
})

test('body view times: rise/set/transit are dates-or-null with a sane peak altitude', () => {
  const obs = sky.makeObserver(Astronomy, KYIV.lat, KYIV.lon)
  const now = new Date('2026-07-28T18:00:00Z')
  const v = sky.bodyViewTimes(Astronomy, 'jupiter', obs, now)
  for (const k of ['rise', 'set', 'transit']) {
    assert.ok(v[k] === null || v[k] instanceof Date, `${k} is a Date or null`)
  }
  if (v.transit) {
    assert.ok(v.transit.getTime() >= now.getTime(), 'next transit is in the future')
    assert.ok(v.transitAltitude >= -90 && v.transitAltitude <= 90, 'plausible peak altitude')
  }
})

test('bearing at sunset is westerly, at sunrise easterly, for Kyiv in summer', () => {
  const obs = sky.makeObserver(Astronomy, KYIV.lat, KYIV.lon)
  const { sunrise, sunset } = sky.computeSunTimes(Astronomy, obs, new Date('2026-07-28T10:00:00Z'))
  const bRise = sky.bearingAt(Astronomy, 'sun', obs, sunrise)
  const bSet = sky.bearingAt(Astronomy, 'sun', obs, sunset)
  assert.ok(bRise.deg >= 0 && bRise.deg < 360 && bSet.deg >= 0 && bSet.deg < 360)
  // Summer sun rises in the NE quadrant and sets in the NW quadrant.
  assert.ok(['ne', 'e'].includes(bRise.azimuthKey), `sunrise key ${bRise.azimuthKey}`)
  assert.ok(['nw', 'w'].includes(bSet.azimuthKey), `sunset key ${bSet.azimuthKey}`)
  assert.equal(sky.bearingAt(Astronomy, 'sun', obs, null), null)
})

test('observing window: polar summer reports no true darkness', () => {
  // Tromsø ~69.6°N at midsummer — the Sun never reaches -18°.
  const obs = sky.makeObserver(Astronomy, 69.65, 18.96)
  const w = sky.computeObservingWindow(Astronomy, obs, new Date('2026-06-21T12:00:00Z'))
  assert.equal(w.hasDarkness, false)
  assert.equal(w.quality, 'noDarkness')
})

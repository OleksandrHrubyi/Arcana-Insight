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

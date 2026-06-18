import test from 'node:test'
import assert from 'node:assert/strict'
import * as Astronomy from 'astronomy-engine'
import { importModule } from './utils/testEnv.js'

const MOD = 'src/helpers/ascendant.js'

test('localToUTC converts local birth time to UTC (with historical DST)', async () => {
  const { localToUTC } = await importModule(MOD)
  assert.equal(localToUTC('2026-01-15', '12:00', 'America/New_York').toISOString(), '2026-01-15T17:00:00.000Z') // EST -5
  assert.equal(localToUTC('2026-07-15', '12:00', 'Europe/Kyiv').toISOString(), '2026-07-15T09:00:00.000Z') // EEST +3
  assert.equal(localToUTC('bad', '12:00', 'Europe/Kyiv'), null)
  assert.equal(localToUTC('2026-07-15', '99:99', 'Europe/Kyiv'), null)
})

test('wholeSignHouse maps planet sign to 1..12 from the Ascendant', async () => {
  const { wholeSignHouse } = await importModule(MOD)
  assert.equal(wholeSignHouse('leo', 'leo'), 1)
  assert.equal(wholeSignHouse('leo', 'virgo'), 2)
  assert.equal(wholeSignHouse('leo', 'aquarius'), 7) // opposite
  assert.equal(wholeSignHouse('leo', 'cancer'), 12)
  assert.equal(wholeSignHouse('foo', 'leo'), null)
})

test('computeAscendant returns a valid rising sign or null', async () => {
  const { computeAscendant, signFromLon } = await importModule(MOD)
  const res = computeAscendant({ iso: '1990-07-15', time: '08:30', lat: 50.45, lon: 30.52, tz: 'Europe/Kyiv' })
  assert.ok(res && typeof res.ascLon === 'number')
  assert.ok(res.ascLon >= 0 && res.ascLon < 360)
  assert.equal(res.ascSign, signFromLon(res.ascLon))
  assert.equal(computeAscendant({ iso: '1990-07-15', time: '', lat: 50, lon: 30, tz: 'Europe/Kyiv' }), null)
  assert.equal(computeAscendant({ iso: '1990-07-15', time: '08:30', tz: 'Europe/Kyiv' }), null) // no lat/lon
})

test('Ascendant ≈ Sun longitude at local sunrise (self-validation)', async () => {
  const { ascendantFromUTC } = await importModule(MOD)
  for (const c of [{ lat: 50.45, lon: 30.52 }, { lat: 40.71, lon: -74.0 }, { lat: -33.87, lon: 151.21 }]) {
    const obs = new Astronomy.Observer(c.lat, c.lon, 0)
    const start = Astronomy.MakeTime(new Date(Date.UTC(2026, 5, 21)))
    const rise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, 1, start, 2)
    const sunLon = (((Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Sun, rise.date, false)).elon) % 360) + 360) % 360
    const asc = ascendantFromUTC(rise.date, c.lat, c.lon)
    let diff = Math.abs(asc - sunLon)
    if (diff > 180) diff = 360 - diff
    assert.ok(diff < 8, `Asc ${asc.toFixed(1)} should be near Sun ${sunLon.toFixed(1)} at sunrise (diff ${diff.toFixed(1)})`)
  }
})

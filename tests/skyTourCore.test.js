import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

const tour = await importModule('src/helpers/skyTourCore.js')

test('buildTonightTour orders Moon first, then planets (capped), then ISS', () => {
  const stops = tour.buildTonightTour({
    moonPhaseKey: 'full',
    moonRise: new Date('2026-07-30T21:00:00Z'),
    visible: [
      { planetKey: 'venus', azimuthKey: 'w', altitude: 12, magnitude: -4.3, times: { transit: new Date() } },
      { planetKey: 'jupiter', azimuthKey: 'se', altitude: 30, magnitude: -2.1, times: {} },
      { planetKey: 'saturn', azimuthKey: 's', altitude: 20, magnitude: 0.6, times: {} }, // dropped (cap 2)
    ],
    issPasses: [{ peakTime: new Date(), startAzKey: 'nw', endAzKey: 'se', maxEl: 62 }],
  })
  assert.deepEqual(stops.map((s) => s.kind), ['moon', 'planet', 'planet', 'iss'])
  assert.equal(stops[0].phaseKey, 'full')
  assert.equal(stops[1].planetKey, 'venus')
  assert.equal(stops[2].planetKey, 'jupiter')
  assert.equal(stops[3].maxEl, 62)
})

test('buildTonightTour: Moon-only when nothing else is up, empty when no inputs', () => {
  const moonOnly = tour.buildTonightTour({ moonPhaseKey: 'waningCrescent', visible: [], issPasses: [] })
  assert.deepEqual(moonOnly.map((s) => s.kind), ['moon'])
  assert.deepEqual(tour.buildTonightTour({}), [])
  assert.deepEqual(tour.buildTonightTour(), [])
})

test('buildTonightTour skips malformed planets and missing ISS', () => {
  const stops = tour.buildTonightTour({
    moonPhaseKey: 'new',
    visible: [{ altitude: 5 }, { planetKey: 'mars', azimuthKey: 'e', altitude: 8 }],
    issPasses: [],
  })
  assert.deepEqual(stops.map((s) => s.kind), ['moon', 'planet'])
  assert.equal(stops[1].planetKey, 'mars')
})

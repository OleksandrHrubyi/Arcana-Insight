// "Tonight's tour" — an ordered, one-line observing plan assembled from data the
// Sky screen already computes (moon phase + rise/set, visible planets with their
// times, ISS passes). Pure (no astronomy calls here) so it's unit-testable; the
// SkyPage passes the computed inputs in and renders the stops.

export const TOUR_MAX_PLANETS = 2

// Returns an ordered array of stops:
//   { key, kind: 'moon'|'planet'|'iss', ...display fields }
// Moon leads (the hero of the night), then the brightest-placed planets, then a
// timed ISS pass if one is visible tonight. Empty array if nothing to show.
export const buildTonightTour = ({
  moonPhaseKey = '',
  moonRise = null,
  moonSet = null,
  visible = [],
  issPasses = [],
} = {}) => {
  const stops = []

  if (moonPhaseKey) {
    stops.push({ key: 'moon', kind: 'moon', phaseKey: moonPhaseKey, rise: moonRise, set: moonSet })
  }

  // `visible` is already sorted brightest/highest-first by computeVisibleTonight.
  for (const p of (Array.isArray(visible) ? visible : []).slice(0, TOUR_MAX_PLANETS)) {
    if (!p?.planetKey) continue
    stops.push({
      key: `planet-${p.planetKey}`,
      kind: 'planet',
      planetKey: p.planetKey,
      azimuthKey: p.azimuthKey,
      altitude: p.altitude,
      transit: p.times?.transit || null,
      magnitude: p.magnitude,
    })
  }

  const pass = (Array.isArray(issPasses) ? issPasses : [])[0]
  if (pass) {
    stops.push({
      key: 'iss',
      kind: 'iss',
      peakTime: pass.peakTime,
      startAzKey: pass.startAzKey,
      endAzKey: pass.endAzKey,
      maxEl: pass.maxEl,
    })
  }

  return stops
}

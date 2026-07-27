// Visible ISS passes for the observer over the next few days. TLE from Celestrak
// (cached), SGP4 propagation via satellite.js, look angles + a sunlit/dark test
// so only *visible* passes (satellite in sunlight, observer sky dark) are shown.
// All on-device apart from the periodic TLE fetch; fails soft to [] / null.
import { Preferences } from '@capacitor/preferences'
import * as sat from 'satellite.js'

const TLE_KEY = 'arcana_iss_tle_v1'
const TLE_TTL_MS = 12 * 60 * 60 * 1000
const EARTH_RADIUS_KM = 6371
const COMPASS = Object.freeze(['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'])
const azKey = (rad) => COMPASS[Math.round(((rad * 180) / Math.PI / 45) % 8 + 8) % 8]
const deg = (rad) => (rad * 180) / Math.PI

export const fetchIssTle = async () => {
  try {
    const { value } = await Preferences.get({ key: TLE_KEY })
    if (value) {
      const c = JSON.parse(value)
      if (c.line1 && c.line2 && Date.now() - c.ts < TLE_TTL_MS) return { line1: c.line1, line2: c.line2 }
    }
  } catch {
    /* ignore */
  }
  try {
    const res = await fetch('https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE')
    if (!res.ok) return null
    const lines = (await res.text()).trim().split('\n')
    if (lines.length < 3) return null
    const line1 = lines[1].trim()
    const line2 = lines[2].trim()
    if (!line1.startsWith('1 ') || !line2.startsWith('2 ')) return null
    try {
      await Preferences.set({ key: TLE_KEY, value: JSON.stringify({ line1, line2, ts: Date.now() }) })
    } catch {
      /* ignore */
    }
    return { line1, line2 }
  } catch {
    return null
  }
}

const sunAltitudeDeg = (Astronomy, observer, time) => {
  const equ = Astronomy.Equator(Astronomy.Body.Sun, time, observer, true, true)
  return Astronomy.Horizon(time, observer, equ.ra, equ.dec, 'normal').altitude
}

// Is the satellite in sunlight (outside Earth's shadow cylinder)?
const isSunlit = (Astronomy, satEci, time) => {
  const s = Astronomy.GeoVector(Astronomy.Body.Sun, time, false)
  const mag = Math.hypot(s.x, s.y, s.z)
  const ux = s.x / mag
  const uy = s.y / mag
  const uz = s.z / mag
  const proj = satEci.x * ux + satEci.y * uy + satEci.z * uz
  if (proj >= 0) return true // sun-facing side
  const perp = Math.hypot(satEci.x - proj * ux, satEci.y - proj * uy, satEci.z - proj * uz)
  return perp > EARTH_RADIUS_KM
}

export const computeVisiblePasses = (Astronomy, tle, location, opts = {}) => {
  const { days = 3, minEl = 10, stepSec = 30, limit = 4 } = opts
  let satrec
  try {
    satrec = sat.twoline2satrec(tle.line1, tle.line2)
  } catch {
    return []
  }
  const gd = {
    longitude: (location.lon * Math.PI) / 180,
    latitude: (location.lat * Math.PI) / 180,
    height: location.elevKm || 0,
  }
  const observer = new Astronomy.Observer(location.lat, location.lon, (location.elevKm || 0) * 1000)
  const passes = []
  let cur = null
  const startMs = Date.now()
  const endMs = startMs + days * 86400000

  for (let ms = startMs; ms <= endMs && passes.length < limit; ms += stepSec * 1000) {
    const date = new Date(ms)
    const pv = sat.propagate(satrec, date)
    if (!pv || !pv.position) continue
    const gmst = sat.gstime(date)
    const look = sat.ecfToLookAngles(gd, sat.eciToEcf(pv.position, gmst))
    const elDeg = deg(look.elevation)
    if (elDeg > 0) {
      if (!cur) cur = { start: date, startAz: look.azimuth, maxEl: elDeg, peak: date, peakAz: look.azimuth, visible: false }
      if (elDeg > cur.maxEl) {
        cur.maxEl = elDeg
        cur.peak = date
        cur.peakAz = look.azimuth
      }
      if (elDeg >= minEl && !cur.visible) {
        if (sunAltitudeDeg(Astronomy, observer, date) < -6 && isSunlit(Astronomy, pv.position, date)) {
          cur.visible = true
        }
      }
      cur.end = date
      cur.endAz = look.azimuth
    } else if (cur) {
      if (cur.maxEl >= minEl && cur.visible) {
        passes.push({
          start: cur.start,
          end: cur.end,
          peakTime: cur.peak,
          maxEl: Math.round(cur.maxEl),
          startAzKey: azKey(cur.startAz),
          endAzKey: azKey(cur.endAz),
          durationSec: Math.round((cur.end.getTime() - cur.start.getTime()) / 1000),
        })
      }
      cur = null
    }
  }
  return passes
}

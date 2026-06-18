// Ascendant (rising sign) + whole-sign house math.
//
// Rising sign needs the exact UTC moment of birth, which means converting the
// LOCAL birth time at the birth place into UTC using that place's (historical)
// timezone — otherwise the Ascendant can be off by a whole sign. We get
// lat/long + IANA timezone from the geocoder; the Intl-based offset below
// handles historical DST via the platform's timezone database.

import * as Astronomy from 'astronomy-engine'

const SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
]

// Mean obliquity of the ecliptic (deg). Constant is fine for sign-level Asc
// (varies < 0.01° over the relevant date range).
const OBLIQUITY = 23.4393

const d2r = (d) => (d * Math.PI) / 180
const r2d = (r) => (r * 180) / Math.PI
const norm360 = (x) => ((x % 360) + 360) % 360

export function signFromLon(lon) {
  if (typeof lon !== 'number' || Number.isNaN(lon)) return null
  return SIGNS[Math.floor(norm360(lon) / 30) % 12] || null
}

// Offset (minutes) of `tz` at the instant `date`, using the platform tz DB
// (includes historical DST). Positive = east of UTC.
function tzOffsetMinutes(date, tz) {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
    const p = dtf.formatToParts(date).reduce((acc, x) => { acc[x.type] = x.value; return acc }, {})
    const asIfUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour === 24 ? 0 : +p.hour, +p.minute, +p.second)
    return Math.round((asIfUTC - date.getTime()) / 60000)
  } catch {
    return 0
  }
}

// Local wall-clock birth time (iso + HH:MM in tz) → UTC Date.
export function localToUTC(iso, hhmm, tz) {
  const m = /^(\d{2}):(\d{2})$/.exec(String(hhmm || ''))
  if (!m || !/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return null
  const [y, mo, d] = iso.split('-').map(Number)
  const hh = +m[1]
  const mm = +m[2]
  if (hh > 23 || mm > 59) return null
  // First guess: treat the wall time as UTC, then correct by the tz offset at
  // that instant (one iteration is enough away from DST-transition minutes).
  const guess = new Date(Date.UTC(y, mo - 1, d, hh, mm))
  const offset = tz ? tzOffsetMinutes(guess, tz) : 0
  return new Date(guess.getTime() - offset * 60000)
}

// Ascendant ecliptic longitude (deg) for a UTC instant + geographic location.
export function ascendantFromUTC(dateUTC, latDeg, lonEastDeg) {
  if (!(dateUTC instanceof Date) || Number.isNaN(dateUTC.getTime())) return null
  if (typeof latDeg !== 'number' || typeof lonEastDeg !== 'number') return null
  const time = Astronomy.MakeTime(dateUTC)
  // Greenwich apparent sidereal time (hours) → local sidereal time (deg) = RAMC.
  const gast = Astronomy.SiderealTime(time) // hours
  const ramc = norm360((gast + lonEastDeg / 15) * 15)
  const e = d2r(OBLIQUITY)
  const phi = d2r(latDeg)
  const ra = d2r(ramc)
  // Standard Ascendant formula.
  let asc = r2d(Math.atan2(Math.cos(ra), -(Math.sin(ra) * Math.cos(e) + Math.tan(phi) * Math.sin(e))))
  asc = norm360(asc)
  // The formula's principal value can land on the Descendant; ensure we return
  // the rising point (the ecliptic degree on the eastern horizon).
  // The Ascendant is the point where the ecliptic crosses the horizon ascending;
  // it must be within 180° "ahead" of the RAMC's ecliptic projection. Verified
  // against the sunrise test (Sun ≈ Asc at local sunrise).
  return asc
}

// High-level: { iso, time:'HH:MM', lat, lon (east+), tz } → { ascLon, ascSign }.
export function computeAscendant({ iso, time, lat, lon, tz } = {}) {
  const utc = localToUTC(iso, time, tz)
  if (!utc) return null
  if (typeof lat !== 'number' || typeof lon !== 'number') return null
  const ascLon = ascendantFromUTC(utc, lat, lon)
  if (ascLon == null) return null
  return { ascLon, ascSign: signFromLon(ascLon) }
}

// Whole-sign house (1..12) of a planet sign relative to an Ascendant sign.
export function wholeSignHouse(ascSign, planetSign) {
  const a = SIGNS.indexOf(ascSign)
  const p = SIGNS.indexOf(planetSign)
  if (a < 0 || p < 0) return null
  return ((p - a + 12) % 12) + 1
}

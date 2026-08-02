// Real-sky computations for the Sky screen — pure, on-device astronomy.
// Every function takes the astronomy-engine module as its first argument so the
// Vue page can lazy-load it while node tests pass the real module (no mocks —
// these assert against genuine ephemeris output).
//
// Location-aware functions take a `{ zone }` option: the observing location's
// time zone (see skyTime.js). It decides which midnight the day starts at, so
// the result depends on the PLACE, not on the machine's clock. Omitting it keeps
// the device zone — correct only when device and location agree.
import { zoneLocalMidnight, zoneCalendarDate, zoneCalendarDaysBetween, zoneDateAtWallTime } from './skyTime.js'

export const MOON_PHASE_KEYS = Object.freeze([
  'new',
  'waxingCrescent',
  'firstQuarter',
  'waxingGibbous',
  'full',
  'waningGibbous',
  'lastQuarter',
  'waningCrescent',
])

export const PLANET_KEYS = Object.freeze(['mercury', 'venus', 'mars', 'jupiter', 'saturn'])

const ZODIAC_KEYS = Object.freeze([
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
])

const PLANETARY_DAY_KEYS = Object.freeze(['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'])

const norm360 = (deg) => ((deg % 360) + 360) % 360

const makeTime = (Astronomy, date) =>
  typeof Astronomy.MakeTime === 'function' ? Astronomy.MakeTime(date) : new Astronomy.AstroTime(date)

export const eclipticLon = (Astronomy, body, date) => {
  const vector = Astronomy.GeoVector(body, makeTime(Astronomy, date), false)
  return norm360(Astronomy.Ecliptic(vector).elon)
}

export const signKeyFromLon = (lon) => ZODIAC_KEYS[Math.floor(norm360(lon) / 30) % 12]

// Moon–Sun elongation in [0,360): 0 = new, 180 = full. Drives phase + illumination.
export const moonSunElongation = (Astronomy, date) => {
  const moon = eclipticLon(Astronomy, Astronomy.Body.Moon, date)
  const sun = eclipticLon(Astronomy, Astronomy.Body.Sun, date)
  return norm360(moon - sun)
}

export const phaseKeyFromElongation = (elongDeg) => {
  const x = norm360(elongDeg)
  if (x < 22.5 || x >= 337.5) return 'new'
  if (x < 67.5) return 'waxingCrescent'
  if (x < 112.5) return 'firstQuarter'
  if (x < 157.5) return 'waxingGibbous'
  if (x < 202.5) return 'full'
  if (x < 247.5) return 'waningGibbous'
  if (x < 292.5) return 'lastQuarter'
  return 'waningCrescent'
}

// Illuminated fraction 0..1 from elongation (0 at new, 1 at full).
export const illuminationFromElongation = (elongDeg) =>
  (1 - Math.cos((norm360(elongDeg) * Math.PI) / 180)) / 2

// Waxing while the Moon leads the Sun by 0–180° (growing toward full).
export const isWaxing = (elongDeg) => norm360(elongDeg) < 180

export const planetaryDayKey = (date) => PLANETARY_DAY_KEYS[date.getDay()]

const signedDelta = (next, prev) => {
  let d = (next - prev) % 360
  if (d > 180) d -= 360
  if (d < -180) d += 360
  return d
}

const isRetrograde = (Astronomy, body, date) => {
  const today = eclipticLon(Astronomy, body, date)
  const tomorrow = eclipticLon(Astronomy, body, new Date(date.getTime() + 86400000))
  return signedDelta(tomorrow, today) < 0
}

// Everything the Sky hero + facts strip need for one moment.
export const computeSkyForDate = (Astronomy, date = new Date()) => {
  const elong = moonSunElongation(Astronomy, date)
  const moonLon = eclipticLon(Astronomy, Astronomy.Body.Moon, date)
  const sunLon = eclipticLon(Astronomy, Astronomy.Body.Sun, date)
  const illumination = illuminationFromElongation(elong)
  return {
    moonPhaseKey: phaseKeyFromElongation(elong),
    elongation: elong,
    illumination,
    illuminationPct: Math.round(illumination * 100),
    waxing: isWaxing(elong),
    moonSignKey: signKeyFromLon(moonLon),
    sunSignKey: signKeyFromLon(sunLon),
    sunDegInSign: Math.round(norm360(sunLon) % 30),
    planetaryDayKey: planetaryDayKey(date),
    mercuryRetrograde: isRetrograde(Astronomy, Astronomy.Body.Mercury, date),
  }
}

// Moon phase for every day of a calendar month (sampled at local noon so a day's
// glyph reflects its dominant phase, not a midnight edge flip).
export const computeMonthMoonPhases = (Astronomy, year, monthIndex) => {
  const days = new Date(year, monthIndex + 1, 0).getDate()
  const out = []
  for (let day = 1; day <= days; day += 1) {
    const noon = new Date(year, monthIndex, day, 12, 0, 0)
    const elong = moonSunElongation(Astronomy, noon)
    out.push({
      day,
      phaseKey: phaseKeyFromElongation(elong),
      illumination: illuminationFromElongation(elong),
      waxing: isWaxing(elong),
    })
  }
  return out
}

// "Через скільки днів" as the observer's calendar counts it: the difference of
// DATES, not a count of 24-hour spans. An event at 00:30 tomorrow is tomorrow
// even though it is half an hour away, and one late tomorrow evening is never
// "через 2 дні". `zone` omitted ⇒ the device calendar.
const daysBetween = (eventDate, from, zone) =>
  Math.max(0, zoneCalendarDaysBetween(zone, from, eventDate))

// Next occurrence of each principal Moon phase after `date`.
export const findUpcomingLunarEvents = (Astronomy, date = new Date(), { zone } = {}) => {
  const start = makeTime(Astronomy, date)
  const search = (targetLon) => {
    const t = Astronomy.SearchMoonPhase(targetLon, start, 40)
    if (!t) return null
    const eventDate = t.date instanceof Date ? t.date : new Date(t.date)
    return { date: eventDate, daysUntil: daysBetween(eventDate, date, zone) }
  }
  return {
    newMoon: search(0),
    firstQuarter: search(90),
    fullMoon: search(180),
    lastQuarter: search(270),
  }
}

// Current zodiac sign + retrograde flag for the classic five visible planets.
export const computePlanetSigns = (Astronomy, date = new Date()) =>
  PLANET_KEYS.map((planetKey) => {
    const body = Astronomy.Body[planetKey.charAt(0).toUpperCase() + planetKey.slice(1)]
    const lon = eclipticLon(Astronomy, body, date)
    return {
      planetKey,
      signKey: signKeyFromLon(lon),
      degInSign: Math.round(norm360(lon) % 30),
      retrograde: isRetrograde(Astronomy, body, date),
    }
  })

// ── Location-aware sky (rise/set, horizon position, events) ──────────────────
// These take the observer's real coordinates so the home reads as a factual
// astronomy tool ("for YOUR location"), not a generic display.

const bodyOf = (Astronomy, key) => Astronomy.Body[key.charAt(0).toUpperCase() + key.slice(1)]

const toDate = (astroTime) => {
  if (!astroTime) return null
  return astroTime.date instanceof Date ? astroTime.date : new Date(astroTime.date)
}

// Midnight that starts the observer's day. `zone` omitted ⇒ the device zone.
const localMidnight = (date, zone) => zoneLocalMidnight(zone, date)
export const makeObserver = (Astronomy, lat, lon, height = 0) =>
  new Astronomy.Observer(lat, lon, height)

// Compass 8-point key from an azimuth measured clockwise from true north.
const COMPASS_KEYS = Object.freeze(['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'])
export const azimuthToCompassKey = (az) => COMPASS_KEYS[Math.round(norm360(az) / 45) % 8]

// Rise & set of a body for the observer's local calendar day containing `date`.
// Either can be null (the Moon skips a rise on some days; polar day/night).
export const riseSetForLocalDay = (Astronomy, bodyKey, observer, date = new Date(), { zone } = {}) => {
  const body = bodyOf(Astronomy, bodyKey)
  const start = makeTime(Astronomy, localMidnight(date, zone))
  return {
    rise: toDate(Astronomy.SearchRiseSet(body, observer, +1, start, 1.0)),
    set: toDate(Astronomy.SearchRiseSet(body, observer, -1, start, 1.0)),
  }
}

// Altitude (°above horizon) and azimuth (° clockwise from north) of a body now.
export const horizontalPosition = (Astronomy, bodyKey, observer, date = new Date()) => {
  const body = bodyOf(Astronomy, bodyKey)
  const time = makeTime(Astronomy, date)
  const equ = Astronomy.Equator(body, time, observer, true, true)
  const hor = Astronomy.Horizon(time, observer, equ.ra, equ.dec, 'normal')
  return { altitude: hor.altitude, azimuth: hor.azimuth }
}

// Sunrise, sunset, and astronomical dusk (Sun 18° below the horizon → truly
// dark sky) for the local day.
export const computeSunTimes = (Astronomy, observer, date = new Date(), { zone } = {}) => {
  const start = makeTime(Astronomy, localMidnight(date, zone))
  const sunrise = toDate(Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, start, 1.0))
  const sunset = toDate(Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, start, 1.0))
  let darkStart = null
  if (sunset) {
    darkStart = toDate(
      Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, -1, makeTime(Astronomy, sunset), 0.5, -18),
    )
  }
  return { sunrise, sunset, darkStart }
}

export const VISIBLE_BODY_KEYS = Object.freeze(['mercury', 'venus', 'mars', 'jupiter', 'saturn'])

// Planets above the horizon in the early evening (sunset + 1h, or local 21:00 as
// a fallback), brightest-placed first. This is the observational-planning core
// that makes the screen a tool rather than a horoscope.
export const computeVisibleTonight = (Astronomy, observer, date = new Date(), { minAltitude = 3, zone } = {}) => {
  const { sunset } = computeSunTimes(Astronomy, observer, date, { zone })
  const evening = sunset
    ? new Date(sunset.getTime() + 60 * 60000)
    : new Date(localMidnight(date, zone).getTime() + 21 * 3600000)
  return VISIBLE_BODY_KEYS.map((planetKey) => {
    const { altitude, azimuth } = horizontalPosition(Astronomy, planetKey, observer, evening)
    const illum = Astronomy.Illumination(bodyOf(Astronomy, planetKey), makeTime(Astronomy, evening))
    return {
      planetKey,
      altitude: Math.round(altitude),
      azimuthKey: azimuthToCompassKey(azimuth),
      magnitude: Math.round(illum.mag * 10) / 10,
      retrograde: isRetrograde(Astronomy, bodyOf(Astronomy, planetKey), evening),
      visible: altitude >= minAltitude,
    }
  })
    .filter((p) => p.visible)
    .sort((a, b) => b.altitude - a.altitude)
}

// When a body next rises, sets, and reaches its highest point (meridian
// transit) for the observer — turns "visible now" into "when to actually look".
// transitAltitude is how high (°) it gets at that peak; low peaks view poorly.
export const bodyViewTimes = (Astronomy, bodyKey, observer, date = new Date()) => {
  const body = bodyOf(Astronomy, bodyKey)
  const start = makeTime(Astronomy, date)
  const rise = toDate(Astronomy.SearchRiseSet(body, observer, +1, start, 1.0))
  const set = toDate(Astronomy.SearchRiseSet(body, observer, -1, start, 1.0))
  let transit = null
  let transitAltitude = null
  const ha = Astronomy.SearchHourAngle(body, observer, 0, start)
  if (ha) {
    transit = toDate(ha.time)
    transitAltitude = Math.round(ha.hor.altitude)
  }
  return { rise, set, transit, transitAltitude }
}

// Compass bearing (° clockwise from true north + 8-point key) of a body at a
// given instant — used to say WHERE on the horizon the Sun/Moon rise and set.
export const bearingAt = (Astronomy, bodyKey, observer, date) => {
  if (!date) return null
  const { azimuth } = horizontalPosition(Astronomy, bodyKey, observer, date)
  return { deg: Math.round(norm360(azimuth)), azimuthKey: azimuthToCompassKey(azimuth) }
}

// Fixed annual peak dates of the major meteor showers (local-evening reference).
// `zhr` = zenithal hourly rate at peak under a dark sky (typical published value).
export const METEOR_SHOWERS = Object.freeze([
  { key: 'quadrantids', month: 1, day: 3, zhr: 110 },
  { key: 'lyrids', month: 4, day: 22, zhr: 18 },
  { key: 'etaAquariids', month: 5, day: 6, zhr: 50 },
  { key: 'perseids', month: 8, day: 12, zhr: 100 },
  { key: 'orionids', month: 10, day: 21, zhr: 20 },
  { key: 'leonids', month: 11, day: 17, zhr: 15 },
  { key: 'geminids', month: 12, day: 14, zhr: 150 },
])

// Per-shower observing detail: peak rate + how much the Moon washes it out (moon
// illumination at the peak is a good proxy — a bright Moon ruins a shower).
// interference: 'low' (< 35% lit) | 'moderate' | 'high' (>= 70% lit).
export const meteorPeakInfo = (Astronomy, showerKey, peakDate) => {
  const shower = METEOR_SHOWERS.find((s) => s.key === showerKey)
  const zhr = shower?.zhr ?? null
  if (!peakDate) return { zhr, moonIlluminationPct: null, interference: null }
  const moonIlluminationPct = Math.round(illuminationFromElongation(moonSunElongation(Astronomy, peakDate)) * 100)
  const interference = moonIlluminationPct >= 70 ? 'high' : moonIlluminationPct >= 35 ? 'moderate' : 'low'
  return { zhr, moonIlluminationPct, interference }
}

// A unified, date-sorted feed of upcoming sky events — moon phases, lunar apsis
// (super/micro moon), eclipses, seasons, meteor peaks. All computed on-device.
export const computeUpcomingSkyEvents = (
  Astronomy,
  date = new Date(),
  { horizonDays = 120, limit = 8, zone } = {},
) => {
  const start = makeTime(Astronomy, date)
  const events = []
  const push = (type, key, eventDate) => {
    const d = eventDate instanceof Date ? eventDate : toDate(eventDate)
    if (!d) return
    const du = daysBetween(d, date, zone)
    if (d.getTime() < date.getTime() || du > horizonDays) return
    events.push({ type, key, date: d, daysUntil: du })
  }

  const phases = findUpcomingLunarEvents(Astronomy, date, { zone })
  push('moonPhase', 'newMoon', phases.newMoon?.date)
  push('moonPhase', 'firstQuarter', phases.firstQuarter?.date)
  push('moonPhase', 'fullMoon', phases.fullMoon?.date)
  push('moonPhase', 'lastQuarter', phases.lastQuarter?.date)

  // Next two apsides catch both the coming perigee and apogee. kind: 0=perigee.
  let apsis = Astronomy.SearchLunarApsis(start)
  for (let i = 0; i < 2 && apsis; i += 1) {
    push('apsis', apsis.kind === 0 ? 'perigee' : 'apogee', toDate(apsis.time))
    apsis = Astronomy.NextLunarApsis(apsis)
  }

  const lunarEcl = Astronomy.SearchLunarEclipse(start)
  push('lunarEclipse', 'lunarEclipse', toDate(lunarEcl?.peak))
  const solarEcl = Astronomy.SearchGlobalSolarEclipse(start)
  push('solarEclipse', 'solarEclipse', toDate(solarEcl?.peak))

  const year = zoneCalendarDate(zone, date).year
  for (const yr of [year, year + 1]) {
    const s = Astronomy.Seasons(yr)
    push('season', 'marchEquinox', toDate(s.mar_equinox))
    push('season', 'juneSolstice', toDate(s.jun_solstice))
    push('season', 'septemberEquinox', toDate(s.sep_equinox))
    push('season', 'decemberSolstice', toDate(s.dec_solstice))
    for (const shower of METEOR_SHOWERS) {
      // The nominal peak is 22:00 on the OBSERVER's clock that evening — a
      // shower peak printed at 08:00 is not a small error, it is nonsense.
      push('meteor', shower.key, zoneDateAtWallTime(zone, yr, shower.month - 1, shower.day, 22, 0))
    }
  }

  return events.sort((a, b) => a.date - b.date).slice(0, limit)
}

// ── Moon & Sun detail (for the tap-through sheets) ───────────────────────────

export const MOON_RADIUS_KM = 1737.4

// Everything the moon-detail sheet shows: real distance, apparent size,
// libration, the next four principal phases, and the next apsis.
export const computeMoonDetail = (Astronomy, date = new Date(), { zone } = {}) => {
  const time = makeTime(Astronomy, date)
  const lib = Astronomy.Libration(time)
  const distanceKm = Math.round(lib.dist_km)
  const angularDiameterDeg = 2 * Math.asin(MOON_RADIUS_KM / lib.dist_km) * (180 / Math.PI)
  const elong = moonSunElongation(Astronomy, date)

  const phases = findUpcomingLunarEvents(Astronomy, date, { zone })
  const nextPhases = ['newMoon', 'firstQuarter', 'fullMoon', 'lastQuarter']
    .map((key) => (phases[key] ? { key, ...phases[key] } : null))
    .filter(Boolean)
    .sort((a, b) => a.date - b.date)

  const apsis = Astronomy.SearchLunarApsis(time)
  const nextApsis = apsis
    ? {
        kind: apsis.kind === 0 ? 'perigee' : 'apogee',
        date: toDate(apsis.time),
        daysUntil: daysBetween(toDate(apsis.time), date, zone),
        distanceKm: Math.round(apsis.dist_km),
      }
    : null

  return {
    distanceKm,
    angularDiameterDeg: Math.round(angularDiameterDeg * 1000) / 1000,
    librationLon: Math.round(lib.elon * 10) / 10,
    librationLat: Math.round(lib.elat * 10) / 10,
    illuminationPct: Math.round(illuminationFromElongation(elong) * 100),
    phaseKey: phaseKeyFromElongation(elong),
    nextPhases,
    nextApsis,
  }
}

// Everything the sun-detail sheet shows: rise/set, astronomical dawn/dusk,
// evening golden hour, and day length with the day-over-day delta.
export const computeSunDetail = (Astronomy, observer, date = new Date(), { zone } = {}) => {
  const { sunrise, sunset, darkStart } = computeSunTimes(Astronomy, observer, date, { zone })
  // Dawn is the -18° upward crossing BEFORE today's sunrise. Anchoring the search to
  // sunrise-12h (not the machine's local midnight) keeps the result identical in any
  // host timezone — local midnight in UTC can sit past the crossing and skip a day.
  const start = sunrise
    ? makeTime(Astronomy, new Date(sunrise.getTime() - 12 * 3600000))
    : makeTime(Astronomy, localMidnight(date, zone))
  const dawn = toDate(Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, +1, start, sunrise ? 0.5 : 1.0, -18))

  let goldenEveningStart = null
  if (sunset) {
    const from = makeTime(Astronomy, new Date(sunset.getTime() - 3 * 3600000))
    goldenEveningStart = toDate(Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, -1, from, 0.25, 6))
  }

  // A day length is only real when sunrise and sunset belong to the same day.
  // Anything else (a zone mismatch, a polar edge) reports null rather than a
  // negative duration the UI would have to render.
  let dayLengthMs = null
  let dayLengthDeltaMs = null
  if (sunrise && sunset && sunset.getTime() > sunrise.getTime()) {
    dayLengthMs = sunset.getTime() - sunrise.getTime()
    const yesterday = new Date(date.getTime() - 86400000)
    const y = computeSunTimes(Astronomy, observer, yesterday, { zone })
    if (y.sunrise && y.sunset && y.sunset.getTime() > y.sunrise.getTime()) {
      dayLengthDeltaMs = dayLengthMs - (y.sunset.getTime() - y.sunrise.getTime())
    }
  }

  return { sunrise, sunset, dawn, dusk: darkStart, goldenEveningStart, dayLengthMs, dayLengthDeltaMs }
}

// The single most actionable answer for an observer: WHEN is the sky actually
// worth going out for tonight? Combines astronomical darkness (Sun < -18°) with
// the Moon — moonlight is what really washes out a dark sky. Returns the dark
// window plus the moonless sub-window and a `quality` verdict the UI maps to
// copy. All times are Date | null; `hasDarkness` is false in polar summer.
export const computeObservingWindow = (Astronomy, observer, date = new Date(), { zone } = {}) => {
  const { sunset, darkStart } = computeSunTimes(Astronomy, observer, date, { zone })
  const moonElong = moonSunElongation(Astronomy, date)
  const moonIlluminationPct = Math.round(illuminationFromElongation(moonElong) * 100)

  if (!darkStart) {
    return { hasDarkness: false, sunset, darkStart: null, darkEnd: null, moonIlluminationPct, quality: 'noDarkness' }
  }
  const darkStartT = makeTime(Astronomy, darkStart)
  // Next time the Sun climbs back to -18° after dusk = end of true darkness.
  const darkEnd = toDate(Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, +1, darkStartT, 1.0, -18))
  if (!darkEnd) {
    return { hasDarkness: false, sunset, darkStart, darkEnd: null, moonIlluminationPct, quality: 'noDarkness' }
  }

  // Is the Moon up when darkness begins, and when does it next cross the horizon?
  const moonEqu = Astronomy.Equator(Astronomy.Body.Moon, darkStartT, observer, true, true)
  const moonHor = Astronomy.Horizon(darkStartT, observer, moonEqu.ra, moonEqu.dec, 'normal')
  const moonUpAtDark = moonHor.altitude > 0
  const moonSet = toDate(Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, -1, darkStartT, 1.5))
  const moonRise = toDate(Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, +1, darkStartT, 1.5))

  let quality
  let windowStart = darkStart
  let windowEnd = darkEnd
  if (moonUpAtDark) {
    if (moonSet && moonSet < darkEnd) {
      quality = 'afterMoonset' // dark sky opens once the Moon sets
      windowStart = moonSet
    } else {
      quality = 'moonWashout' // Moon up the whole dark window
    }
  } else if (moonRise && moonRise < darkEnd) {
    quality = 'beforeMoonrise' // dark now, until the Moon comes up
    windowEnd = moonRise
  } else {
    quality = 'moonless' // no Moon at all during darkness — ideal
  }

  return {
    hasDarkness: true,
    sunset,
    darkStart,
    darkEnd,
    moonUpAtDark,
    moonSet,
    moonRise,
    moonIlluminationPct,
    quality,
    windowStart,
    windowEnd,
  }
}

// Galactic center (J2000) — the bright Milky Way core astrophotographers chase.
const GALACTIC_CENTER_RA_HOURS = 266.405 / 15
const GALACTIC_CENTER_DEC = -28.936
const MILKY_WAY_MIN_ALT = 10

// When is the Milky Way core highest during tonight's darkness, and how high does
// it get? Samples the core's altitude across the astronomical-dark window. At high
// latitudes it barely clears the horizon (honest `visible:false`); lower down it
// climbs. `washedOut` flags a bright Moon that drowns the faint core.
export const computeMilkyWayWindow = (Astronomy, observer, date = new Date(), { zone } = {}) => {
  const win = computeObservingWindow(Astronomy, observer, date, { zone })
  if (!win.hasDarkness) return { hasDarkness: false, visible: false }
  let maxAltitude = -90
  let bestTime = null
  const startMs = win.darkStart.getTime()
  const endMs = win.darkEnd.getTime()
  for (let ms = startMs; ms <= endMs; ms += 20 * 60000) {
    const time = makeTime(Astronomy, new Date(ms))
    const hor = Astronomy.Horizon(time, observer, GALACTIC_CENTER_RA_HOURS, GALACTIC_CENTER_DEC, 'normal')
    if (hor.altitude > maxAltitude) {
      maxAltitude = hor.altitude
      bestTime = new Date(ms)
    }
  }
  return {
    hasDarkness: true,
    visible: maxAltitude >= MILKY_WAY_MIN_ALT,
    maxAltitude: Math.round(maxAltitude),
    bestTime,
    washedOut: win.moonIlluminationPct >= 60 && !['afterMoonset', 'beforeMoonrise'].includes(win.quality),
    moonIlluminationPct: win.moonIlluminationPct,
  }
}

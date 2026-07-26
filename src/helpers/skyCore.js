// Real-sky computations for the Sky screen — pure, on-device astronomy.
// Every function takes the astronomy-engine module as its first argument so the
// Vue page can lazy-load it while node tests pass the real module (no mocks —
// these assert against genuine ephemeris output).

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

// Next occurrence of each principal Moon phase after `date`.
export const findUpcomingLunarEvents = (Astronomy, date = new Date()) => {
  const start = makeTime(Astronomy, date)
  const search = (targetLon) => {
    const t = Astronomy.SearchMoonPhase(targetLon, start, 40)
    if (!t) return null
    const eventDate = t.date instanceof Date ? t.date : new Date(t.date)
    const daysUntil = Math.max(0, Math.ceil((eventDate.getTime() - date.getTime()) / 86400000))
    return { date: eventDate, daysUntil }
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

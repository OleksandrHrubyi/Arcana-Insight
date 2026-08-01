// Observer-timezone core for the sky screens — pure, offline, no Vue/Capacitor.
//
// The astronomical day belongs to the PLACE being observed, not to the machine
// running the app. Every rise/set/dusk search anchors to the observing location's
// local midnight, and every clock time is printed on that location's clock.
// Zone data comes from the OS (IANA, via Intl) — no network dependency.

// A resolved zone. Exactly one of the two carries the answer:
//   { timeZone: 'Europe/Kyiv', offsetMinutes: null, source: 'location' }
//   { timeZone: null, offsetMinutes: 122,           source: 'longitude' }
// `source` is 'location' | 'device' | 'longitude' and is what the UI uses to
// decide whether the shown clock deserves a note.

const PARTS_FORMATTERS = new Map()

const partsFormatter = (timeZone) => {
  let f = PARTS_FORMATTERS.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    PARTS_FORMATTERS.set(timeZone, f)
  }
  return f
}

export const isValidTimeZone = (timeZone) => {
  if (typeof timeZone !== 'string' || !timeZone) return false
  try {
    partsFormatter(timeZone)
    return true
  } catch {
    return false
  }
}

export const deviceTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    return null
  }
}

export const deviceZone = () => ({
  timeZone: deviceTimeZone(),
  offsetMinutes: null,
  source: 'device',
})

// Offset east of UTC, in minutes, that the zone is on at `date` (DST-aware).
export const zoneOffsetMinutes = (zone, date = new Date()) => {
  if (typeof zone?.offsetMinutes === 'number' && Number.isFinite(zone.offsetMinutes)) {
    return zone.offsetMinutes
  }
  if (zone?.timeZone) {
    try {
      const parts = {}
      for (const p of partsFormatter(zone.timeZone).formatToParts(date)) {
        if (p.type !== 'literal') parts[p.type] = Number(p.value)
      }
      const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
      return Math.round((asUtc - date.getTime()) / 60000)
    } catch {
      /* unknown zone id — fall through to the device clock */
    }
  }
  return -date.getTimezoneOffset()
}

// The instant of 00:00 on the zone's calendar day that contains `date`.
// Two passes so a DST change between "now" and that midnight lands correctly.
export const zoneLocalMidnight = (zone, date = new Date()) => {
  const first = zoneOffsetMinutes(zone, date)
  const shifted = new Date(date.getTime() + first * 60000)
  const wallMidnight = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate())
  const guess = wallMidnight - first * 60000
  const second = zoneOffsetMinutes(zone, new Date(guess))
  return new Date(second === first ? guess : wallMidnight - second * 60000)
}

// How the location's zone resolves, in the order the spec fixes:
//   1. an explicit zone stored with the place (bundled cities, saved places),
//   2. the device zone when the coordinates came from GPS (they agree by definition),
//   3. longitude (lon/15) — last resort for bare coordinates.
// Longitude alone gives mean solar time, which drifts from civil time by up to
// an hour under DST, so it is never preferred over a real zone id.
export const resolveObserverZone = (location) => {
  const tz = typeof location?.timeZone === 'string' ? location.timeZone.trim() : ''
  if (tz && isValidTimeZone(tz)) return { timeZone: tz, offsetMinutes: null, source: 'location' }
  if (location?.source === 'gps') return deviceZone()
  if (typeof location?.lon === 'number' && Number.isFinite(location.lon)) {
    return {
      timeZone: null,
      offsetMinutes: Math.round((location.lon / 15) * 60),
      source: 'longitude',
    }
  }
  return deviceZone()
}

// True when the location's clock reads the same as the device clock — then the
// UI has nothing to explain.
export const zoneMatchesDevice = (zone, date = new Date()) =>
  zoneOffsetMinutes(zone, date) === -date.getTimezoneOffset()

// 'UTC+3', 'UTC−7', 'UTC+5:30'. Uses the same minus sign as the rest of the UI.
export const zoneOffsetLabel = (zone, date = new Date()) => {
  const total = zoneOffsetMinutes(zone, date)
  const sign = total < 0 ? '−' : '+'
  const abs = Math.abs(total)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`
}

// Format an instant on the LOCATION's clock. Shifting by the zone offset and
// formatting in UTC gives the same answer as a real `timeZone` option while also
// working for the longitude fallback, which has no IANA id.
export const formatZoneTime = (date, zone, locale, options = {}, fallback = '—') => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return fallback
  try {
    const shifted = new Date(date.getTime() + zoneOffsetMinutes(zone, date) * 60000)
    return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(shifted)
  } catch {
    return fallback
  }
}

// Day length + its day-over-day delta as one label. A non-positive length means
// the search returned two different days (or a polar edge) — never printed as a
// negative duration, always as the empty state.
export const formatDayLength = (
  dayLengthMs,
  dayLengthDeltaMs,
  { hourAbbr = 'h', minAbbr = 'min', empty = '—' } = {},
) => {
  if (typeof dayLengthMs !== 'number' || !Number.isFinite(dayLengthMs) || dayLengthMs <= 0) return empty
  const h = Math.floor(dayLengthMs / 3600000)
  const m = Math.round((dayLengthMs % 3600000) / 60000)
  let s = `${h}${hourAbbr} ${m}${minAbbr}`
  if (typeof dayLengthDeltaMs === 'number' && Number.isFinite(dayLengthDeltaMs)) {
    const dm = Math.round(dayLengthDeltaMs / 60000)
    if (dm !== 0) s += ` (${dm > 0 ? '+' : '−'}${Math.abs(dm)} ${minAbbr})`
  }
  return s
}

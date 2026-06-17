// Synastry-grade compatibility engine (deterministic, client-side).
//
// "Big Four + Mercury" sign-level synastry: from two birth dates we derive each
// person's Sun, Moon, Venus, Mars and Mercury sign, then score how the two
// charts interact across five real relationship dimensions. No birth time is
// required (sign-level only), so there is no entry barrier — see the moon-cusp
// caveat below.
//
// Design notes:
// - This module is PURE and node-testable. computeChart() uses astronomy-engine;
//   the scoring functions take already-resolved charts, so scoring can be tested
//   without any astronomy.
// - Output is data only (scores, aspects, levels). All user-facing copy lives in
//   i18n, keyed by dimension + level, so EN/uk parity and tone stay in one place.
// - Caveat: the Moon changes sign ~every 2.5 days; computed at noon UTC, a person
//   born near a cusp may resolve to an adjacent moon sign. This mirrors how the
//   rest of the app already computes the moon sign (PersonalHoroscopePage).

import * as Astronomy from 'astronomy-engine'

export const SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
]

const SIGN_ELEMENT = {
  aries: 'fire', leo: 'fire', sagittarius: 'fire',
  taurus: 'earth', virgo: 'earth', capricorn: 'earth',
  gemini: 'air', libra: 'air', aquarius: 'air',
  cancer: 'water', scorpio: 'water', pisces: 'water',
}

const SIGN_MODALITY = {
  aries: 'cardinal', cancer: 'cardinal', libra: 'cardinal', capricorn: 'cardinal',
  taurus: 'fixed', leo: 'fixed', scorpio: 'fixed', aquarius: 'fixed',
  gemini: 'mutable', virgo: 'mutable', sagittarius: 'mutable', pisces: 'mutable',
}

export function signElement(sign) {
  return SIGN_ELEMENT[sign] || null
}

export function signModality(sign) {
  return SIGN_MODALITY[sign] || null
}

const RELATIONSHIP_TYPES = ['romantic', 'friend', 'family', 'colleague']
const DEFAULT_RELATIONSHIP = 'romantic'

// Each relationship type shows a DIFFERENT, type-appropriate set of dimensions
// (with weights summing to 1). The underlying aspect scores are real synastry —
// what changes per type is which facets are surfaced and how they're weighted.
// e.g. romance shows attraction; work drops it for "drive"; friends/family swap
// it for "warmth". So the result is genuinely different per relationship type.
const RELATIONSHIP_DIMENSIONS = {
  romantic:  [['attraction', 0.26], ['emotional', 0.24], ['communication', 0.18], ['values', 0.20], ['energy', 0.12]],
  friend:    [['warmth', 0.24], ['emotional', 0.22], ['communication', 0.26], ['values', 0.18], ['energy', 0.10]],
  family:    [['emotional', 0.30], ['warmth', 0.24], ['communication', 0.22], ['values', 0.18], ['energy', 0.06]],
  colleague: [['communication', 0.34], ['values', 0.28], ['drive', 0.24], ['energy', 0.14]],
}

// Canonical (romantic) dimension order — used by tests and as the default.
export const DIMENSION_KEYS = ['attraction', 'emotional', 'communication', 'values', 'energy']

/* ----------------------------- chart from DOB ----------------------------- */

// Tropical sun sign from a date (matches the app's existing zodiacFromISO so the
// displayed "You" sign stays consistent everywhere).
function sunSignFromISO(iso) {
  const d = new Date(iso + 'T00:00:00Z')
  if (Number.isNaN(d.getTime())) return null
  const m = d.getUTCMonth() + 1
  const day = d.getUTCDate()
  if ((m === 3 && day >= 21) || (m === 4 && day <= 19)) return 'aries'
  if ((m === 4 && day >= 20) || (m === 5 && day <= 20)) return 'taurus'
  if ((m === 5 && day >= 21) || (m === 6 && day <= 20)) return 'gemini'
  if ((m === 6 && day >= 21) || (m === 7 && day <= 22)) return 'cancer'
  if ((m === 7 && day >= 23) || (m === 8 && day <= 22)) return 'leo'
  if ((m === 8 && day >= 23) || (m === 9 && day <= 22)) return 'virgo'
  if ((m === 9 && day >= 23) || (m === 10 && day <= 22)) return 'libra'
  if ((m === 10 && day >= 23) || (m === 11 && day <= 21)) return 'scorpio'
  if ((m === 11 && day >= 22) || (m === 12 && day <= 21)) return 'sagittarius'
  if ((m === 12 && day >= 22) || (m === 1 && day <= 19)) return 'capricorn'
  if ((m === 1 && day >= 20) || (m === 2 && day <= 18)) return 'aquarius'
  return 'pisces'
}

function planetLonFromISO(iso, body) {
  try {
    const date = new Date(iso + 'T12:00:00Z')
    if (Number.isNaN(date.getTime())) return null
    const time = Astronomy.MakeTime(date)
    const ecl = Astronomy.Ecliptic(Astronomy.GeoVector(body, time, false))
    return ((ecl.elon % 360) + 360) % 360
  } catch {
    return null
  }
}

function signFromLon(lon) {
  if (typeof lon !== 'number') return null
  return SIGNS[Math.floor((((lon % 360) + 360) % 360) / 30) % 12] || null
}

// Chart from an ISO date (YYYY-MM-DD): sign per planet (for display) PLUS the
// actual ecliptic longitudes (degrees) needed for real synastry aspects.
// Sun sign uses the tropical date ranges (matches the rest of the app); the rest
// derive from real longitudes. Returns null on bad input.
export function computeChart(iso) {
  const clean = String(iso || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return null
  const sun = sunSignFromISO(clean)
  if (!sun) return null
  const lon = {
    sun: planetLonFromISO(clean, Astronomy.Body.Sun),
    moon: planetLonFromISO(clean, Astronomy.Body.Moon),
    mercury: planetLonFromISO(clean, Astronomy.Body.Mercury),
    venus: planetLonFromISO(clean, Astronomy.Body.Venus),
    mars: planetLonFromISO(clean, Astronomy.Body.Mars),
  }
  return {
    sun,
    moon: signFromLon(lon.moon),
    mercury: signFromLon(lon.mercury),
    venus: signFromLon(lon.venus),
    mars: signFromLon(lon.mars),
    lon,
  }
}

/* ------------------------------- scoring ---------------------------------- */

// Angular relationship between two signs → traditional aspect + harmony score.
export function signRelation(a, b) {
  const ia = SIGNS.indexOf(a)
  const ib = SIGNS.indexOf(b)
  if (ia < 0 || ib < 0) return { aspect: 'unknown', score: 60 }
  let dist = Math.abs(ia - ib) % 12
  if (dist > 6) dist = 12 - dist
  switch (dist) {
    case 0: return { aspect: 'conjunction', score: 85 } // same sign — intense, fused
    case 1: return { aspect: 'semisextile', score: 55 } // neighbouring — minor friction
    case 2: return { aspect: 'sextile', score: 80 }      // compatible elements — easy
    case 3: return { aspect: 'square', score: 45 }       // tension — growth through friction
    case 4: return { aspect: 'trine', score: 90 }        // same element — flowing
    case 5: return { aspect: 'quincunx', score: 50 }     // adjustment needed
    default: return { aspect: 'opposition', score: 70 }  // polarity — attraction + challenge
  }
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))

function levelFromScore(score) {
  if (score >= 75) return 'high'
  if (score >= 58) return 'mid'
  return 'low'
}

export function tierFromScore(score) {
  if (score >= 85) return 'magnetic'
  if (score >= 72) return 'harmonious'
  if (score >= 60) return 'growing'
  if (score >= 48) return 'complex'
  return 'challenging'
}

function normalizeRelationshipType(value) {
  const v = String(value || '').trim().toLowerCase()
  return RELATIONSHIP_TYPES.includes(v) ? v : DEFAULT_RELATIONSHIP
}

/* --------------------------- real synastry aspects ------------------------ */

const PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars']

// Major aspects with traditional orbs (degrees) and harmony character.
const ASPECTS = [
  { type: 'conjunction', angle: 0, orb: 8 },
  { type: 'sextile', angle: 60, orb: 4 },
  { type: 'square', angle: 90, orb: 6 },
  { type: 'trine', angle: 120, orb: 7 },
  { type: 'opposition', angle: 180, orb: 7 },
]
const ASPECT_QUALITY = { conjunction: 80, sextile: 84, square: 46, trine: 90, opposition: 58 }
const ASPECT_HARMONY = { conjunction: 'intense', sextile: 'flowing', trine: 'flowing', square: 'friction', opposition: 'friction' }

// Longitude of a planet, from the real chart degrees when available; falls back
// to mid-sign (sign index × 30 + 15) for sign-only charts (e.g. unit tests).
function lonOf(chart, planet) {
  const v = chart?.lon?.[planet]
  if (typeof v === 'number') return v
  const idx = SIGNS.indexOf(chart?.[planet])
  return idx >= 0 ? idx * 30 + 15 : null
}

function angularSep(l1, l2) {
  const d = Math.abs(((l1 - l2) % 360 + 360) % 360)
  return d > 180 ? 360 - d : d
}

// Nearest real aspect between two longitudes, or null if none within orb.
function aspectBetween(l1, l2) {
  if (typeof l1 !== 'number' || typeof l2 !== 'number') return null
  const sep = angularSep(l1, l2)
  let best = null
  for (const a of ASPECTS) {
    const orb = Math.abs(sep - a.angle)
    if (orb <= a.orb) {
      const ratio = orb / a.orb
      if (!best || ratio < best.ratio) best = { type: a.type, orb, ratio, strength: 1 - ratio }
    }
  }
  return best
}

// Which planet pairs feed each dimension (unordered; both directions checked).
const DIMENSION_DOMAINS = {
  attraction: [['venus', 'mars']],
  emotional: [['moon', 'moon'], ['moon', 'sun']],
  communication: [['mercury', 'mercury'], ['mercury', 'sun']],
  values: [['sun', 'sun'], ['sun', 'mercury']],
  energy: [['mars', 'mars']],
  warmth: [['venus', 'venus'], ['moon', 'moon']],
  drive: [['mars', 'sun']],
}

function expandPairs(pairs) {
  const out = []
  for (const [p1, p2] of pairs) {
    out.push([p1, p2])
    if (p1 !== p2) out.push([p2, p1])
  }
  return out
}

// Score one dimension from the REAL aspects in its domain (weighted by orb
// tightness). If no real aspect exists, fall back to coarse sign harmony so the
// value is still sensible. Symmetric across the two charts.
function domainScore(a, b, pairs) {
  const expanded = expandPairs(pairs)
  const found = []
  for (const [p1, p2] of expanded) {
    const asp = aspectBetween(lonOf(a, p1), lonOf(b, p2))
    if (asp) found.push({ ...asp, p1, p2 })
  }
  if (found.length) {
    let sumW = 0
    let sumS = 0
    for (const f of found) {
      const w = Math.max(0.05, f.strength)
      sumW += w
      sumS += ASPECT_QUALITY[f.type] * w
    }
    const tightest = found.reduce((m, f) => (f.strength > m.strength ? f : m), found[0])
    return { score: sumS / sumW, aspect: tightest.type }
  }
  let total = 0
  let n = 0
  for (const [p1, p2] of expanded) {
    total += signRelation(a[p1], b[p2]).score
    n += 1
  }
  return { score: total / n, aspect: 'unknown' }
}

function buildDimensions(a, b, type) {
  const defs = RELATIONSHIP_DIMENSIONS[type] || RELATIONSHIP_DIMENSIONS[DEFAULT_RELATIONSHIP]
  return defs.map(([key, weight]) => {
    const { score, aspect } = domainScore(a, b, DIMENSION_DOMAINS[key])
    const rounded = Math.round(clamp(score, 0, 100))
    return { key, weight, score: rounded, aspect, level: levelFromScore(rounded) }
  })
}

const PLANET_IMPORTANCE = { sun: 1, moon: 1, venus: 0.9, mars: 0.9, mercury: 0.7 }

// Short theme per (unordered) planet pair — drives the "key connection" copy.
const PLANET_PAIR_THEME = {
  sun_sun: 'identity',
  moon_sun: 'heartMind',
  moon_moon: 'emotionalRhythm',
  mercury_sun: 'expression',
  sun_venus: 'affectionId',
  mars_sun: 'spark',
  mercury_moon: 'feelingsWords',
  moon_venus: 'tenderness',
  mars_moon: 'emotionalHeat',
  mercury_mercury: 'mentalSync',
  mercury_venus: 'sweetTalk',
  mars_mercury: 'debate',
  venus_venus: 'sharedTaste',
  mars_venus: 'chemistry',
  mars_mars: 'drive',
}

function pairTheme(p1, p2) {
  return PLANET_PAIR_THEME[[p1, p2].sort().join('_')] || 'connection'
}

// The strongest, most meaningful REAL aspects between the two charts — this is
// the pair-specific content. Deduped by theme (keep the tightest per theme).
function buildKeyConnections(a, b) {
  const byTheme = new Map()
  for (const p1 of PLANETS) {
    for (const p2 of PLANETS) {
      const asp = aspectBetween(lonOf(a, p1), lonOf(b, p2))
      if (!asp) continue
      const weight = asp.strength * (PLANET_IMPORTANCE[p1] || 0.6) * (PLANET_IMPORTANCE[p2] || 0.6)
      const theme = pairTheme(p1, p2)
      const conn = {
        pa: p1,
        pb: p2,
        type: asp.type,
        orb: Math.round(asp.orb * 10) / 10,
        harmony: ASPECT_HARMONY[asp.type],
        theme,
        weight,
      }
      const existing = byTheme.get(theme)
      if (!existing || weight > existing.weight) byTheme.set(theme, conn)
    }
  }
  return [...byTheme.values()]
    .sort((x, y) => y.weight - x.weight)
    .slice(0, 5)
    // eslint-disable-next-line no-unused-vars
    .map(({ weight, ...rest }) => rest)
}

// Main entry: compute a full compatibility result from two charts.
// options.relationshipType: romantic | friend | family | colleague
export function computeCompatibility(chartA, chartB, options = {}) {
  if (!chartA?.sun || !chartB?.sun) return null
  const relationshipType = normalizeRelationshipType(options.relationshipType)
  const dimensions = buildDimensions(chartA, chartB, relationshipType)

  const overallScore = Math.round(
    clamp(dimensions.reduce((sum, d) => sum + d.score * d.weight, 0), 0, 100),
  )

  // Free teaser = the strongest dimension, so the free preview leads with a
  // genuine high point (and a reason to unlock the rest).
  const teaserKey = dimensions.reduce((best, d) => (d.score > best.score ? d : best), dimensions[0]).key

  return {
    relationshipType,
    overallScore,
    tier: tierFromScore(overallScore),
    teaserKey,
    dimensions,
    keyConnections: buildKeyConnections(chartA, chartB),
    charts: { a: chartA, b: chartB },
  }
}

// Convenience: compute straight from two birth dates.
export function computeCompatibilityFromDOB(isoA, isoB, options = {}) {
  const a = computeChart(isoA)
  const b = computeChart(isoB)
  if (!a || !b) return null
  return computeCompatibility(a, b, options)
}

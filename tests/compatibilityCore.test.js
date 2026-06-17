import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

const MOD = 'src/helpers/compatibilityCore.js'

// A reusable pair of fully-specified charts (no astronomy needed for scoring).
const ARIES_CHART = { sun: 'aries', moon: 'leo', venus: 'taurus', mars: 'aries', mercury: 'pisces' }
const LIBRA_CHART = { sun: 'libra', moon: 'aquarius', venus: 'scorpio', mars: 'libra', mercury: 'virgo' }

test('computeChart resolves five planet signs from a DOB', async () => {
  const { computeChart, SIGNS } = await importModule(MOD)
  const chart = computeChart('1990-07-15')
  assert.ok(chart, 'chart should be produced')
  for (const key of ['sun', 'moon', 'venus', 'mars', 'mercury']) {
    assert.ok(SIGNS.includes(chart[key]), `${key} should be a valid sign, got ${chart[key]}`)
  }
  // Sun sign uses the standard tropical date ranges.
  assert.equal(chart.sun, 'cancer')
  assert.equal(computeChart('2000-01-01').sun, 'capricorn')
})

test('computeChart is deterministic and rejects bad input', async () => {
  const { computeChart } = await importModule(MOD)
  assert.deepEqual(computeChart('1995-03-22'), computeChart('1995-03-22'))
  assert.equal(computeChart(''), null)
  assert.equal(computeChart('not-a-date'), null)
  assert.equal(computeChart('1995-13-40'), null)
})

test('signRelation maps angular distance to aspect + score', async () => {
  const { signRelation } = await importModule(MOD)
  assert.deepEqual(signRelation('aries', 'aries'), { aspect: 'conjunction', score: 85 })
  assert.equal(signRelation('aries', 'leo').aspect, 'trine')       // +4 same element
  assert.equal(signRelation('aries', 'gemini').aspect, 'sextile')  // +2
  assert.equal(signRelation('aries', 'cancer').aspect, 'square')   // +3
  assert.equal(signRelation('aries', 'libra').aspect, 'opposition')// +6
  assert.equal(signRelation('aries', 'taurus').aspect, 'semisextile')
  // unknown signs degrade gracefully
  assert.equal(signRelation('foo', 'bar').score, 60)
})

test('tierFromScore respects boundaries', async () => {
  const { tierFromScore } = await importModule(MOD)
  assert.equal(tierFromScore(92), 'magnetic')
  assert.equal(tierFromScore(85), 'magnetic')
  assert.equal(tierFromScore(84), 'harmonious')
  assert.equal(tierFromScore(72), 'harmonious')
  assert.equal(tierFromScore(60), 'growing')
  assert.equal(tierFromScore(48), 'complex')
  assert.equal(tierFromScore(47), 'challenging')
  assert.equal(tierFromScore(0), 'challenging')
})

test('computeCompatibility returns a well-formed result', async () => {
  const { computeCompatibility, DIMENSION_KEYS, tierFromScore } = await importModule(MOD)
  const res = computeCompatibility(ARIES_CHART, LIBRA_CHART, { relationshipType: 'romantic' })
  assert.ok(res)
  assert.ok(res.overallScore >= 0 && res.overallScore <= 100)
  assert.equal(res.tier, tierFromScore(res.overallScore))
  assert.equal(res.relationshipType, 'romantic')
  assert.deepEqual(res.dimensions.map((d) => d.key), DIMENSION_KEYS)
  for (const d of res.dimensions) {
    assert.ok(d.score >= 0 && d.score <= 100)
    assert.ok(['high', 'mid', 'low'].includes(d.level))
    assert.ok(typeof d.aspect === 'string')
  }
})

test('overall score is symmetric (A,B) == (B,A)', async () => {
  const { computeCompatibility } = await importModule(MOD)
  const ab = computeCompatibility(ARIES_CHART, LIBRA_CHART)
  const ba = computeCompatibility(LIBRA_CHART, ARIES_CHART)
  assert.equal(ab.overallScore, ba.overallScore)
})

test('teaserKey is the strongest dimension', async () => {
  const { computeCompatibility } = await importModule(MOD)
  const res = computeCompatibility(ARIES_CHART, LIBRA_CHART)
  const max = res.dimensions.reduce((m, d) => (d.score > m.score ? d : m), res.dimensions[0])
  assert.equal(res.teaserKey, max.key)
})

test('relationship type re-weights the overall score', async () => {
  const { computeCompatibility } = await importModule(MOD)
  const romantic = computeCompatibility(ARIES_CHART, LIBRA_CHART, { relationshipType: 'romantic' })
  const colleague = computeCompatibility(ARIES_CHART, LIBRA_CHART, { relationshipType: 'colleague' })
  // Same charts, different weighting → generally a different overall score.
  assert.notEqual(romantic.overallScore, colleague.overallScore)
  // Unknown type falls back to romantic.
  const fallback = computeCompatibility(ARIES_CHART, LIBRA_CHART, { relationshipType: 'xyz' })
  assert.equal(fallback.relationshipType, 'romantic')
})

test('computeCompatibility guards missing charts', async () => {
  const { computeCompatibility } = await importModule(MOD)
  assert.equal(computeCompatibility(null, LIBRA_CHART), null)
  assert.equal(computeCompatibility(ARIES_CHART, {}), null)
})

test('identical charts score very high and land in a top tier', async () => {
  const { computeCompatibility } = await importModule(MOD)
  const res = computeCompatibility(ARIES_CHART, ARIES_CHART)
  assert.ok(res.overallScore >= 60, `identical charts should score high, got ${res.overallScore}`)
  assert.ok(['magnetic', 'harmonious', 'growing'].includes(res.tier))
})

test('computeCompatibilityFromDOB wires charts end-to-end', async () => {
  const { computeCompatibilityFromDOB } = await importModule(MOD)
  const res = computeCompatibilityFromDOB('1990-07-15', '1988-10-02', { relationshipType: 'friend' })
  assert.ok(res)
  assert.equal(res.relationshipType, 'friend')
  assert.ok(res.overallScore >= 0 && res.overallScore <= 100)
  assert.equal(computeCompatibilityFromDOB('bad', '1988-10-02'), null)
})

test('computeChart exposes real planetary longitudes', async () => {
  const { computeChart } = await importModule(MOD)
  const chart = computeChart('1990-07-15')
  assert.ok(chart.lon, 'chart should carry longitudes')
  for (const key of ['sun', 'moon', 'mercury', 'venus', 'mars']) {
    const v = chart.lon[key]
    assert.equal(typeof v, 'number', `${key} longitude should be numeric`)
    assert.ok(v >= 0 && v < 360, `${key} longitude should be 0..360, got ${v}`)
  }
})

test('keyConnections are real, well-formed, and pair-specific', async () => {
  const { computeCompatibilityFromDOB } = await importModule(MOD)
  const VALID_ASPECTS = ['conjunction', 'sextile', 'square', 'trine', 'opposition']

  const res = computeCompatibilityFromDOB('1990-07-15', '1988-02-20')
  assert.ok(Array.isArray(res.keyConnections))
  assert.ok(res.keyConnections.length > 0 && res.keyConnections.length <= 5)
  for (const c of res.keyConnections) {
    assert.ok(VALID_ASPECTS.includes(c.type), `aspect type ${c.type}`)
    assert.ok(['flowing', 'friction', 'intense'].includes(c.harmony))
    assert.ok(typeof c.pa === 'string' && typeof c.pb === 'string')
    assert.ok(typeof c.theme === 'string' && c.theme.length > 0)
    assert.ok(c.orb >= 0 && c.orb <= 8)
  }

  // Different pairs must produce different connections (genuinely chart-specific).
  const other = computeCompatibilityFromDOB('1975-11-30', '2001-04-09')
  const sig = (r) => r.keyConnections.map((c) => `${c.pa}-${c.type}-${c.pb}`).join(',')
  assert.notEqual(sig(res), sig(other), 'distinct pairs should yield distinct connections')
})

test('keyConnections dedupe by theme (no repeated theme)', async () => {
  const { computeCompatibilityFromDOB } = await importModule(MOD)
  const res = computeCompatibilityFromDOB('1990-07-15', '1988-02-20')
  const themes = res.keyConnections.map((c) => c.theme)
  assert.equal(new Set(themes).size, themes.length, 'each theme appears at most once')
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

test('rowsToRegistry and registryToRows convert data shape predictably', async () => {
  const { rowsToRegistry, registryToRows } = await importModule('src/helpers/horoscopeContentCore.js')

  const rows = [
    { sign: 'aries', theme: 'energy', summary: 's1', detailed: 'd1' },
    { sign: 'aries', theme: 'love', summary: 's2', detailed: 'd2' },
    { sign: '', theme: 'career', summary: 'bad', detailed: 'bad' },
    { sign: 'taurus', theme: null, summary: 'bad2', detailed: 'bad2' },
  ]

  const registry = rowsToRegistry(rows)
  assert.deepEqual(registry, {
    aries: {
      energy: { summary: 's1', detailed: 'd1' },
      love: { summary: 's2', detailed: 'd2' },
    },
  })

  assert.deepEqual(registryToRows(registry), [
    { sign: 'aries', theme: 'energy', summary: 's1', detailed: 'd1' },
    { sign: 'aries', theme: 'love', summary: 's2', detailed: 'd2' },
  ])
})

test('getNextISODate handles month/year boundaries', async () => {
  const { getNextISODate } = await importModule('src/helpers/horoscopeContentCore.js')

  assert.equal(getNextISODate('2026-03-25'), '2026-03-26')
  assert.equal(getNextISODate('2026-12-31'), '2027-01-01')
  assert.equal(getNextISODate('invalid'), '')
})

test('loadHoroscopeRegistry returns cache when it is fresh and matching locale', async () => {
  const { loadHoroscopeRegistry } = await importModule('src/helpers/horoscopeContentCore.js')

  const cachedRows = [{ sign: 'aries', theme: 'energy', summary: 'A', detailed: 'B' }]
  const selectCalls = []
  const saveCalls = []

  const result = await loadHoroscopeRegistry({
    locale: 'uk',
    today: '2026-03-25',
    loadLocal: async () => ({ date: '2026-03-25', locale: 'uk', rows: cachedRows }),
    saveLocal: async (payload) => {
      saveCalls.push(payload)
    },
    selectHoroscopes: async (...args) => {
      selectCalls.push(args)
      return { data: [], error: null }
    },
  })

  assert.equal(result.source, 'cache')
  assert.deepEqual(result.registry, {
    aries: { energy: { summary: 'A', detailed: 'B' } },
  })
  assert.equal(selectCalls.length, 0)
  assert.equal(saveCalls.length, 0)
})

test('loadHoroscopeRegistry bypasses cache when forceNetwork is true', async () => {
  const { loadHoroscopeRegistry } = await importModule('src/helpers/horoscopeContentCore.js')

  const selectCalls = []
  const saveCalls = []

  const result = await loadHoroscopeRegistry({
    locale: 'en',
    today: '2026-03-25',
    forceNetwork: true,
    loadLocal: async () => ({
      date: '2026-03-25',
      locale: 'en',
      rows: [{ sign: 'aries', theme: 'energy', summary: 'cache', detailed: 'cache' }],
    }),
    saveLocal: async (payload) => {
      saveCalls.push(payload)
    },
    selectHoroscopes: async (date, locale, timeoutMs) => {
      selectCalls.push({ date, locale, timeoutMs })
      return {
        data: [{ sign: 'leo', theme: 'energy', summary: 'network', detailed: 'network-full' }],
        error: null,
      }
    },
  })

  assert.equal(result.source, 'network')
  assert.deepEqual(result.registry, {
    leo: { energy: { summary: 'network', detailed: 'network-full' } },
  })
  assert.deepEqual(selectCalls, [{ date: '2026-03-25', locale: 'en', timeoutMs: 8000 }])
  assert.equal(saveCalls.length, 1)
  assert.deepEqual(saveCalls[0], {
    date: '2026-03-25',
    locale: 'en',
    isEntitled: false,
    rows: [{ sign: 'leo', theme: 'energy', summary: 'network', detailed: 'network-full' }],
  })
})

test('loadHoroscopeRegistry falls back to next day when today has no rows', async () => {
  const { loadHoroscopeRegistry } = await importModule('src/helpers/horoscopeContentCore.js')

  const selectCalls = []

  const result = await loadHoroscopeRegistry({
    locale: 'uk',
    today: '2026-03-25',
    loadLocal: async () => null,
    saveLocal: async () => {},
    selectHoroscopes: async (date) => {
      selectCalls.push(date)
      if (date === '2026-03-25') return { data: [], error: null }
      if (date === '2026-03-26') {
        return {
          data: [{ sign: 'taurus', theme: 'energy', summary: 'next-day', detailed: 'next-day-full' }],
          error: null,
        }
      }
      return { data: [], error: null }
    },
  })

  assert.deepEqual(selectCalls, ['2026-03-25', '2026-03-26'])
  assert.deepEqual(result.registry, {
    taurus: { energy: { summary: 'next-day', detailed: 'next-day-full' } },
  })
})

test('loadHoroscopeRegistry throws when selectHoroscopes returns an error', async () => {
  const { loadHoroscopeRegistry } = await importModule('src/helpers/horoscopeContentCore.js')

  await assert.rejects(
    loadHoroscopeRegistry({
      locale: 'en',
      today: '2026-03-25',
      loadLocal: async () => null,
      saveLocal: async () => {},
      selectHoroscopes: async () => ({ data: null, error: new Error('network down') }),
    }),
    /network down/,
  )
})

// QA finding #2: premium love/career `detailed` must not be retained for a
// non-entitled user — not in the returned registry, not in the on-device cache.

test('stripPremiumDetailedFromRegistry drops premium detail for non-entitled, keeps free + summaries', async () => {
  const { stripPremiumDetailedFromRegistry } = await importModule('src/helpers/horoscopeContentCore.js')
  const registry = {
    aries: {
      energy: { summary: 'e-sum', detailed: 'e-full' },
      love: { summary: 'l-sum', detailed: 'l-full' },
      career: { summary: 'c-sum', detailed: 'c-full' },
    },
  }
  assert.deepEqual(stripPremiumDetailedFromRegistry(registry, { isEntitled: false }), {
    aries: {
      energy: { summary: 'e-sum', detailed: 'e-full' },
      love: { summary: 'l-sum', detailed: '' },
      career: { summary: 'c-sum', detailed: '' },
    },
  })
})

test('stripPremiumDetailedFromRegistry leaves premium detail intact for entitled users', async () => {
  const { stripPremiumDetailedFromRegistry } = await importModule('src/helpers/horoscopeContentCore.js')
  const registry = { aries: { love: { summary: 'l-sum', detailed: 'l-full' } } }
  assert.deepEqual(stripPremiumDetailedFromRegistry(registry, { isEntitled: true }), registry)
})

test('loadHoroscopeRegistry (non-entitled) strips premium detail from both the result AND the cache write', async () => {
  const { loadHoroscopeRegistry } = await importModule('src/helpers/horoscopeContentCore.js')
  const saveCalls = []
  const result = await loadHoroscopeRegistry({
    locale: 'en',
    today: '2026-03-25',
    forceNetwork: true,
    isEntitled: false,
    loadLocal: async () => null,
    saveLocal: async (payload) => saveCalls.push(payload),
    selectHoroscopes: async () => ({
      data: [
        { sign: 'leo', theme: 'energy', summary: 'e', detailed: 'e-full' },
        { sign: 'leo', theme: 'love', summary: 'l', detailed: 'l-full' },
      ],
      error: null,
    }),
  })
  // Returned registry: premium detail blanked.
  assert.equal(result.registry.leo.love.detailed, '')
  assert.equal(result.registry.leo.energy.detailed, 'e-full')
  // Cache write: never persists the premium body in plaintext.
  const loveRow = saveCalls[0].rows.find((r) => r.theme === 'love')
  assert.equal(loveRow.detailed, '')
})

test('loadHoroscopeRegistry (entitled) keeps premium detail in result and cache', async () => {
  const { loadHoroscopeRegistry } = await importModule('src/helpers/horoscopeContentCore.js')
  const saveCalls = []
  const result = await loadHoroscopeRegistry({
    locale: 'en',
    today: '2026-03-25',
    forceNetwork: true,
    isEntitled: true,
    loadLocal: async () => null,
    saveLocal: async (payload) => saveCalls.push(payload),
    selectHoroscopes: async () => ({
      data: [{ sign: 'leo', theme: 'love', summary: 'l', detailed: 'l-full' }],
      error: null,
    }),
  })
  assert.equal(result.registry.leo.love.detailed, 'l-full')
  assert.equal(saveCalls[0].rows.find((r) => r.theme === 'love').detailed, 'l-full')
})

// QA finding #11: a successful-but-empty response (cron gap for today AND next
// day) must be distinguishable from "still loading" so the screen can show an
// explicit empty/retry state instead of an endless skeleton.

test('loadHoroscopeRegistry flags isEmpty when today and next day return no rows', async () => {
  const { loadHoroscopeRegistry } = await importModule('src/helpers/horoscopeContentCore.js')
  const result = await loadHoroscopeRegistry({
    locale: 'en',
    today: '2026-03-25',
    forceNetwork: true,
    loadLocal: async () => null,
    saveLocal: async () => {},
    selectHoroscopes: async () => ({ data: [], error: null }),
  })
  assert.equal(result.isEmpty, true)
  assert.deepEqual(result.registry, {})
})

test('loadHoroscopeRegistry does not flag isEmpty when rows exist', async () => {
  const { loadHoroscopeRegistry } = await importModule('src/helpers/horoscopeContentCore.js')
  const result = await loadHoroscopeRegistry({
    locale: 'en',
    today: '2026-03-25',
    forceNetwork: true,
    loadLocal: async () => null,
    saveLocal: async () => {},
    selectHoroscopes: async () => ({
      data: [{ sign: 'leo', theme: 'energy', summary: 's', detailed: 'd' }],
      error: null,
    }),
  })
  assert.equal(result.isEmpty, false)
})

test('loadHoroscopeRegistry re-fetches when a now-premium user has a stripped cache (A-4)', async () => {
  const { loadHoroscopeRegistry } = await importModule('src/helpers/horoscopeContentCore.js')

  // Cache written earlier while NON-entitled → premium love detail was stripped.
  const strippedCache = {
    date: '2026-03-25',
    locale: 'uk',
    isEntitled: false,
    rows: [
      { sign: 'aries', theme: 'energy', summary: 'E', detailed: 'Edetail' },
      { sign: 'aries', theme: 'love', summary: 'L', detailed: '' },
    ],
  }
  const selectCalls = []
  const networkRows = [
    { sign: 'aries', theme: 'energy', summary: 'E', detailed: 'Edetail' },
    { sign: 'aries', theme: 'love', summary: 'L', detailed: 'Ldetail' },
  ]

  const result = await loadHoroscopeRegistry({
    locale: 'uk',
    today: '2026-03-25',
    isEntitled: true, // now premium
    loadLocal: async () => strippedCache,
    saveLocal: async () => {},
    selectHoroscopes: async (...args) => {
      selectCalls.push(args)
      return { data: networkRows, error: null }
    },
  })

  assert.equal(result.source, 'network', 'must bypass the stripped cache and re-fetch')
  assert.equal(selectCalls.length, 1)
  assert.equal(result.registry.aries.love.detailed, 'Ldetail', 'premium love detail restored')
})

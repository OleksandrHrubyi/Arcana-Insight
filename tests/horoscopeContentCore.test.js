import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

test('rowsToRegistry and registryToRows convert data shape predictably', async () => {
  const { rowsToRegistry, registryToRows } = await importModule('src/helpers/horoscopeContentCore.js')

  const rows = [
    { sign: 'aries', theme: 'spirit', summary: 's1', detailed: 'd1' },
    { sign: 'aries', theme: 'love', summary: 's2', detailed: 'd2' },
    { sign: '', theme: 'career', summary: 'bad', detailed: 'bad' },
    { sign: 'taurus', theme: null, summary: 'bad2', detailed: 'bad2' },
  ]

  const registry = rowsToRegistry(rows)
  assert.deepEqual(registry, {
    aries: {
      spirit: { summary: 's1', detailed: 'd1' },
      love: { summary: 's2', detailed: 'd2' },
    },
  })

  assert.deepEqual(registryToRows(registry), [
    { sign: 'aries', theme: 'spirit', summary: 's1', detailed: 'd1' },
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

  const cachedRows = [{ sign: 'aries', theme: 'spirit', summary: 'A', detailed: 'B' }]
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
    aries: { spirit: { summary: 'A', detailed: 'B' } },
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
      rows: [{ sign: 'aries', theme: 'spirit', summary: 'cache', detailed: 'cache' }],
    }),
    saveLocal: async (payload) => {
      saveCalls.push(payload)
    },
    selectHoroscopes: async (date, locale, timeoutMs) => {
      selectCalls.push({ date, locale, timeoutMs })
      return {
        data: [{ sign: 'leo', theme: 'spirit', summary: 'network', detailed: 'network-full' }],
        error: null,
      }
    },
  })

  assert.equal(result.source, 'network')
  assert.deepEqual(result.registry, {
    leo: { spirit: { summary: 'network', detailed: 'network-full' } },
  })
  assert.deepEqual(selectCalls, [{ date: '2026-03-25', locale: 'en', timeoutMs: 8000 }])
  assert.equal(saveCalls.length, 1)
  assert.deepEqual(saveCalls[0], {
    date: '2026-03-25',
    locale: 'en',
    rows: [{ sign: 'leo', theme: 'spirit', summary: 'network', detailed: 'network-full' }],
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
          data: [{ sign: 'taurus', theme: 'spirit', summary: 'next-day', detailed: 'next-day-full' }],
          error: null,
        }
      }
      return { data: [], error: null }
    },
  })

  assert.deepEqual(selectCalls, ['2026-03-25', '2026-03-26'])
  assert.deepEqual(result.registry, {
    taurus: { spirit: { summary: 'next-day', detailed: 'next-day-full' } },
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

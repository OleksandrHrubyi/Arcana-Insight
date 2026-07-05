import test from 'node:test'
import assert from 'node:assert/strict'
import { searchCities } from '../src/services/geocode.js'

// B10 (launch audit): the geocode lookup was the only network path with no
// timeout and no cancellation — a stalled request could hang the city picker,
// and a slow earlier keystroke could resolve after (and clobber) a newer one.

const realFetch = globalThis.fetch

const jsonResponse = (body) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })

const CITY = { name: 'Kyiv', country: 'Ukraine', admin1: '', latitude: 50.45, longitude: 30.52, timezone: 'Europe/Kyiv' }

test('short queries never hit the network', async () => {
  let called = false
  globalThis.fetch = async () => {
    called = true
    return jsonResponse({ results: [] })
  }
  try {
    assert.deepEqual(await searchCities('K'), [])
    assert.deepEqual(await searchCities('  '), [])
    assert.equal(called, false)
  } finally {
    globalThis.fetch = realFetch
  }
})

test('a new search aborts the previous in-flight one (no out-of-order clobber)', async () => {
  const seen = []
  globalThis.fetch = (url, { signal }) => {
    const q = new URL(url).searchParams.get('name')
    seen.push(q)
    if (q === 'Kyi') {
      // Slow first request: settles only via the abort the second search issues.
      return new Promise((_, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      })
    }
    return Promise.resolve(jsonResponse({ results: [CITY] }))
  }
  try {
    const first = searchCities('Kyi')
    const second = searchCities('Kyiv')
    const [firstResults, secondResults] = await Promise.all([first, second])
    assert.deepEqual(firstResults, [], 'superseded search must settle empty, not hang')
    assert.equal(secondResults.length, 1)
    assert.equal(secondResults[0].label, 'Kyiv, Ukraine')
    assert.deepEqual(seen, ['Kyi', 'Kyiv'])
  } finally {
    globalThis.fetch = realFetch
  }
})

test('a stalled request is aborted by the timeout and resolves empty', async () => {
  globalThis.fetch = (url, { signal }) =>
    new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    })
  try {
    const started = Date.now()
    const results = await searchCities('Kyiv', 'en', { timeoutMs: 50 })
    assert.deepEqual(results, [])
    assert.ok(Date.now() - started < 5000, 'must not hang until the network gives up')
  } finally {
    globalThis.fetch = realFetch
  }
})

test('non-OK and malformed responses degrade to an empty list', async () => {
  globalThis.fetch = async () => new Response('nope', { status: 500 })
  try {
    assert.deepEqual(await searchCities('Kyiv'), [])
    globalThis.fetch = async () => jsonResponse({ results: 'not-an-array' })
    assert.deepEqual(await searchCities('Kyiv'), [])
    globalThis.fetch = async () => jsonResponse({ results: [{ name: 'NoCoords' }] })
    assert.deepEqual(await searchCities('Kyiv'), [])
  } finally {
    globalThis.fetch = realFetch
  }
})

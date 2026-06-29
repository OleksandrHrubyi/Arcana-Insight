import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

const load = async () => (await importModule('src/helpers/authRedirect.js')).resolveAuthRedirect

test('resolveAuthRedirect keeps safe same-origin paths (incl. query/hash)', async () => {
  const r = await load()
  assert.equal(r('/account'), '/account')
  assert.equal(r('/horoscope?sign=aries'), '/horoscope?sign=aries')
  assert.equal(r('/premium#plans'), '/premium#plans')
})

test('resolveAuthRedirect falls back on empty / non-absolute input', async () => {
  const r = await load()
  assert.equal(r(''), '/')
  assert.equal(r(null), '/')
  assert.equal(r('account'), '/')
  assert.equal(r('https://evil.com'), '/')
  assert.equal(r('relative/path', '/home'), '/home')
})

test('resolveAuthRedirect blocks open-redirect vectors (A-23)', async () => {
  const r = await load()
  assert.equal(r('//evil.com'), '/', 'protocol-relative')
  assert.equal(r('/\\evil.com'), '/', 'backslash treated as slash by some UAs')
  assert.equal(r('/\\/evil.com'), '/')
  assert.equal(r('\\\\evil.com'), '/')
})

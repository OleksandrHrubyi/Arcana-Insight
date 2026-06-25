import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

const resolve = (obj, key) => key.split('.').reduce((o, k) => (o == null ? o : o[k]), obj)

// QA finding #6: the email code-confirmation screen surfaced raw English Supabase
// strings to non-English users. mapAuthErrorKey routes them to localized keys.

test('mapAuthErrorKey maps known Supabase auth errors to localized keys', async () => {
  const { mapAuthErrorKey } = await importModule('src/helpers/authErrors.js')
  assert.equal(mapAuthErrorKey('Token has expired or is invalid'), 'auth.wrongOrExpiredCode')
  assert.equal(mapAuthErrorKey('Invalid token'), 'auth.wrongOrExpiredCode')
  assert.equal(
    mapAuthErrorKey('For security purposes, you can only request this after 35 seconds'),
    'auth.tooManyAttempts',
  )
  assert.equal(mapAuthErrorKey('Email rate limit exceeded'), 'auth.tooManyAttempts')
  assert.equal(mapAuthErrorKey('Too many requests'), 'auth.tooManyAttempts')
  assert.equal(mapAuthErrorKey(''), 'errors.generic')
  assert.equal(mapAuthErrorKey(null), 'errors.generic')
  assert.equal(mapAuthErrorKey('Some unexpected server hiccup'), 'errors.generic')
})

test('every mapped auth-error key resolves in BOTH en and uk (never renders the raw key)', async () => {
  const { mapAuthErrorKey } = await importModule('src/helpers/authErrors.js')
  const { messages } = await importModule('src/i18n/messages.bundle.js')
  const keys = new Set([
    mapAuthErrorKey('Token has expired or is invalid'),
    mapAuthErrorKey('after 30 seconds'),
    mapAuthErrorKey(''),
  ])
  for (const key of keys) {
    for (const locale of ['en', 'uk']) {
      const value = resolve(messages[locale], key)
      assert.equal(typeof value, 'string', `${locale}.${key} missing`)
      assert.ok(value.length > 0, `${locale}.${key} empty`)
    }
  }
})

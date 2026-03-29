import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

test('parseDateOfBirthFromProfileCache returns parsed dob and handles bad json', async () => {
  const { parseDateOfBirthFromProfileCache } = await importModule('src/helpers/zodiacUserSignCore.js')
  assert.equal(parseDateOfBirthFromProfileCache('{"date_of_birth":"1994-05-12"}'), '1994-05-12')
  assert.equal(parseDateOfBirthFromProfileCache('bad-json'), '')
  assert.equal(parseDateOfBirthFromProfileCache(''), '')
})

test('resolveUserSignSnapshot prefers cache dob and maps zodiac sign', async () => {
  const { resolveUserSignSnapshot } = await importModule('src/helpers/zodiacUserSignCore.js')
  const result = await resolveUserSignSnapshot({
    readProfileCacheValue: async () => '{"date_of_birth":"1994-05-12"}',
    getCurrentUserId: () => 'u-1',
    fetchUserDateOfBirthById: async () => {
      throw new Error('should-not-call')
    },
    zodiacFromRawDate: (dob) => (dob === '1994-05-12' ? 'taurus' : ''),
  })

  assert.equal(result.signKey, 'taurus')
  assert.equal(result.dob, '1994-05-12')
  assert.deepEqual(result.errors, [])
})

test('resolveUserSignSnapshot falls back to user profile fetch when cache is empty', async () => {
  const { resolveUserSignSnapshot } = await importModule('src/helpers/zodiacUserSignCore.js')
  const calls = []
  const result = await resolveUserSignSnapshot({
    readProfileCacheValue: async () => '',
    getCurrentUserId: () => 'u-77',
    fetchUserDateOfBirthById: async (userId) => {
      calls.push(userId)
      return '12.11.1991'
    },
    zodiacFromRawDate: (dob) => (dob === '12.11.1991' ? 'scorpio' : ''),
  })

  assert.deepEqual(calls, ['u-77'])
  assert.equal(result.signKey, 'scorpio')
  assert.deepEqual(result.errors, [])
})

test('resolveUserSignSnapshot returns empty sign and tracks errors on failures', async () => {
  const { resolveUserSignSnapshot } = await importModule('src/helpers/zodiacUserSignCore.js')
  const result = await resolveUserSignSnapshot({
    readProfileCacheValue: async () => {
      throw new Error('cache')
    },
    getCurrentUserId: () => 'u-1',
    fetchUserDateOfBirthById: async () => {
      throw new Error('profile')
    },
    zodiacFromRawDate: () => {
      throw new Error('parse')
    },
  })

  assert.equal(result.signKey, '')
  assert.equal(result.dob, '')
  assert.deepEqual(result.errors, ['cache_read_failed', 'profile_fetch_failed', 'zodiac_parse_failed'])
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

const load = async () => (await importModule('src/helpers/appleSignInError.js')).isAppleSignInCancel

test('isAppleSignInCancel detects ASAuthorizationError.canceled shapes', async () => {
  const isCancel = await load()
  // The plugin rejects with only the NSError localizedDescription (no code field).
  assert.equal(
    isCancel(new Error('The operation couldn’t be completed. (com.apple.AuthenticationServices.AuthorizationError error 1001.)')),
    true,
  )
  assert.equal(isCancel(new Error('AuthorizationError error 1001.')), true)
  assert.equal(isCancel(new Error('The user canceled the authorization attempt')), true)
  assert.equal(isCancel(new Error('Операцію скасовано')), true)
  assert.equal(isCancel('error 1001'), true)
})

test('isAppleSignInCancel does not swallow real failures', async () => {
  const isCancel = await load()
  assert.equal(isCancel(new Error('Sign in failed: invalid_client')), false)
  assert.equal(isCancel(new Error('AuthorizationError error 1000.')), false)
  assert.equal(isCancel(new Error('network timeout')), false)
  assert.equal(isCancel(new Error('error 10011 something else')), false)
  assert.equal(isCancel(null), false)
  assert.equal(isCancel(undefined), false)
})

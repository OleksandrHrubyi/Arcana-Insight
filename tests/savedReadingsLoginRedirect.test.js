import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

// Stability-audit regression (2026-07-08): the Saved Readings "Log in" CTA pushed
// { name: 'login' } with no redirect query, dumping the user on Home after
// sign-in. The branch that renders it (premium flag without a session) is revoked
// on app boot, so it can't be reached honestly in a Playwright run — guard the
// contract at the source level instead: every login push in this page must carry
// redirect back to /readings.
test('SavedReadingsPage login navigation carries redirect: /readings', () => {
  const source = fs.readFileSync(new URL('../src/pages/SavedReadingsPage.vue', import.meta.url), 'utf8')
  const loginPushes = source.match(/name:\s*'login'[^}]*/g) || []
  assert.ok(loginPushes.length > 0, 'expected at least one login navigation in SavedReadingsPage')
  for (const push of loginPushes) {
    assert.match(push, /redirect:\s*'\/readings'/, `login push must carry redirect: ${push}`)
  }
})

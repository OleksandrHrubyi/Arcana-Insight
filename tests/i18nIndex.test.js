import test from 'node:test'
import assert from 'node:assert/strict'
import { importFresh, installBrowserEnv } from './utils/testEnv.js'

const waitFor = async (check, tries = 50) => {
  for (let i = 0; i < tries; i += 1) {
    if (check()) return true
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  return false
}

test('i18n uses stored locale by default and setLocale persists + dispatches event', async () => {
  const env = installBrowserEnv({ locale: 'uk' })
  try {
    const mod = await importFresh('src/i18n/index.js')
    assert.equal(mod.getLocale(), 'uk')

    let emitted = null
    env.window.addEventListener('locale-changed', (event) => {
      emitted = event.detail
    })

    mod.setLocale('en')
    assert.equal(mod.getLocale(), 'en')
    assert.equal(env.localStorage.getItem('locale'), 'en')
    assert.equal(emitted, 'en')
  } finally {
    env.restore()
  }
})

test('i18n translation resolves value, supports fallback and returns key for unknown paths', async () => {
  const env = installBrowserEnv({ locale: 'uk' })
  try {
    const mod = await importFresh('src/i18n/index.js')
    const loaded = await waitFor(() => mod.t('en', 'appName') === 'Arcana Insight')
    assert.equal(loaded, true)

    assert.equal(mod.t('en', 'appName'), 'Arcana Insight')
    assert.equal(mod.t('zz', 'appName'), 'Arcana Insight')
    assert.equal(mod.t('zz', 'missing.key.path'), 'missing.key.path')
    assert.equal(mod.t('appName'), 'Arcana Insight')
  } finally {
    env.restore()
  }
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from '../utils/testEnv.js'

test('createIssue returns normalized issue shape', async () => {
  const { createIssue } = await importModule('ai-ops/core/issue.js')

  const issue = createIssue({
    id: 'i18n-missing-home-title',
    source: 'code-scan',
    severity: 'warning',
    category: 'i18n',
    title: 'Missing key in uk locale',
    details: 'Key exists in en locale but is missing in uk locale',
    file: 'src/i18n/uk.json',
    line: 12,
    ruleId: 'i18n-parity',
    suggestedAction: 'Add matching translation key in uk locale',
    meta: {
      key: 'home.title',
    },
  })

  assert.deepEqual(issue, {
    id: 'i18n-missing-home-title',
    source: 'code-scan',
    severity: 'warning',
    category: 'i18n',
    title: 'Missing key in uk locale',
    details: 'Key exists in en locale but is missing in uk locale',
    file: 'src/i18n/uk.json',
    line: 12,
    ruleId: 'i18n-parity',
    suggestedAction: 'Add matching translation key in uk locale',
    meta: {
      key: 'home.title',
    },
  })
})

test('runCheck builds shared result envelope and infers summary/status from issues', async () => {
  const { runCheck } = await importModule('ai-ops/core/checkRunner.js')
  const { createIssue } = await importModule('ai-ops/core/issue.js')

  const result = await runCheck('code-scan', async () => ({
    issues: [
      createIssue({
        id: 'duplicate-file',
        source: 'code-scan',
        severity: 'warning',
        category: 'code-quality',
        title: 'Suspect duplicate file name',
        details: 'CompatibilityPage 2.vue looks like a duplicate',
        ruleId: 'suspect-duplicate-file',
      }),
    ],
    meta: {
      repo: 'Arcana-Insight',
    },
  }))

  assert.equal(result.check, 'code-scan')
  assert.equal(result.version, 1)
  assert.equal(result.status, 'warning')
  assert.equal(typeof result.startedAt, 'string')
  assert.equal(typeof result.finishedAt, 'string')
  assert.equal(typeof result.durationMs, 'number')
  assert.equal(result.summary.totalIssues, 1)
  assert.equal(result.summary.blockers, 0)
  assert.equal(result.summary.warnings, 1)
  assert.equal(result.summary.infos, 0)
  assert.equal(result.meta.repo, 'Arcana-Insight')
  assert.equal(result.issues.length, 1)
})

test('runCheck returns failed result envelope when executor throws', async () => {
  const { runCheck } = await importModule('ai-ops/core/checkRunner.js')

  const result = await runCheck('build-status', async () => {
    throw new Error('quasar build failed')
  })

  assert.equal(result.check, 'build-status')
  assert.equal(result.status, 'failed')
  assert.equal(result.summary.totalIssues, 0)
  assert.deepEqual(result.issues, [])
  assert.equal(result.meta.error.name, 'Error')
  assert.equal(result.meta.error.message, 'quasar build failed')
})


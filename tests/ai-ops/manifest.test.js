import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from '../utils/testEnv.js'

test('buildManifest creates dashboard-friendly summary from check results', async () => {
  const { buildManifest } = await importModule('ai-ops/core/manifest.js')
  const { createIssue } = await importModule('ai-ops/core/issue.js')

  const manifest = buildManifest([
    {
      check: 'code-scan',
      status: 'warning',
      summary: {
        totalIssues: 2,
        blockers: 1,
        warnings: 1,
        infos: 0,
      },
      issues: [
        createIssue({
          id: 'missing-privacy-url',
          source: 'launch-readiness',
          severity: 'blocker',
          category: 'release',
          title: 'Missing privacy policy url',
          details: 'App Store submission requires a live privacy policy URL',
          ruleId: 'privacy-url-required',
        }),
        createIssue({
          id: 'todo-left-in-menu',
          source: 'code-scan',
          severity: 'warning',
          category: 'code-quality',
          title: 'TODO marker remains in MenuComponent',
          details: 'TODO markers should be resolved before release review',
          ruleId: 'todo-marker',
        }),
      ],
    },
    {
      check: 'test-status',
      status: 'ok',
      summary: {
        totalIssues: 0,
        blockers: 0,
        warnings: 0,
        infos: 0,
      },
      issues: [],
    },
  ])

  assert.equal(typeof manifest.generatedAt, 'string')
  assert.deepEqual(manifest.checks['code-scan'], {
    status: 'warning',
    path: 'scan.json',
    blockers: 1,
    warnings: 1,
    infos: 0,
    totalIssues: 2,
  })
  assert.deepEqual(manifest.checks['test-status'], {
    status: 'ok',
    path: 'tests.json',
    blockers: 0,
    warnings: 0,
    infos: 0,
    totalIssues: 0,
  })
  assert.deepEqual(manifest.topIssues, ['missing-privacy-url', 'todo-left-in-menu'])
})


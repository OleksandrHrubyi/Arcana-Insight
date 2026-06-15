import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDashboardModel } from '../../ai-ops/dashboard/viewModel.js'

test('buildDashboardModel aggregates totals and resolves top issues', () => {
  const manifest = {
    generatedAt: '2026-04-29T10:00:00.000Z',
    checks: {
      'launch-readiness': { status: 'warning', blockers: 1, warnings: 2, infos: 0, totalIssues: 3 },
      'test-status': { status: 'ok', blockers: 0, warnings: 0, infos: 0, totalIssues: 0 },
    },
    topIssues: ['launch-1'],
  }

  const launchResult = {
    check: 'launch-readiness',
    status: 'warning',
    finishedAt: '2026-04-29T10:00:01.000Z',
    summary: { totalIssues: 3, blockers: 1, warnings: 2, infos: 0 },
    issues: [
      {
        id: 'launch-1',
        severity: 'blocker',
        title: 'Launch blocker',
        details: 'Important item',
        file: 'docs/release.md',
        line: 10,
        ruleId: 'launch-rule',
      },
    ],
    meta: {},
  }

  const testResult = {
    check: 'test-status',
    status: 'ok',
    finishedAt: '2026-04-29T10:00:02.000Z',
    summary: { totalIssues: 0, blockers: 0, warnings: 0, infos: 0 },
    issues: [],
    meta: {},
  }

  const model = buildDashboardModel({
    manifest,
    launchResult,
    testResult,
    briefing: '# Brief',
  })

  assert.equal(model.checks.length, 2)
  assert.equal(model.totals.blockers, 1)
  assert.equal(model.totals.warnings, 2)
  assert.equal(model.totals.totalIssues, 3)
  assert.equal(model.topIssues.length, 1)
  assert.equal(model.topIssues[0].id, 'launch-1')
  assert.equal(model.sections[0].name, 'launch-readiness')
  assert.equal(model.briefing, '# Brief')
})


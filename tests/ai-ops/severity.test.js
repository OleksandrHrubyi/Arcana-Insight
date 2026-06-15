import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from '../utils/testEnv.js'

test('severity helpers count and order issues predictably', async () => {
  const { countIssuesBySeverity, inferResultStatusFromIssues, sortIssuesBySeverity } =
    await importModule('ai-ops/core/severity.js')

  const issues = [
    { id: 'warn-1', severity: 'warning' },
    { id: 'blocker-1', severity: 'blocker' },
    { id: 'info-1', severity: 'info' },
    { id: 'warn-2', severity: 'warning' },
  ]

  assert.deepEqual(countIssuesBySeverity(issues), {
    totalIssues: 4,
    blockers: 1,
    warnings: 2,
    infos: 1,
  })

  assert.equal(inferResultStatusFromIssues(issues), 'warning')
  assert.deepEqual(
    sortIssuesBySeverity(issues).map((issue) => issue.id),
    ['blocker-1', 'warn-1', 'warn-2', 'info-1'],
  )
})


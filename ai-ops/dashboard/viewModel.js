const CHECK_LABELS = {
  'code-scan': 'Code Scan',
  'launch-readiness': 'Launch Readiness',
  'test-status': 'Test Status',
  'build-status': 'Build Status',
}

const CHECK_ORDER = ['launch-readiness', 'build-status', 'test-status', 'code-scan']

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function getResultSummary(result) {
  return result?.summary || {
    totalIssues: 0,
    blockers: 0,
    warnings: 0,
    infos: 0,
  }
}

function buildIssueIndex(results) {
  const index = new Map()

  for (const result of results) {
    for (const issue of toArray(result?.issues)) {
      index.set(issue.id, issue)
    }
  }

  return index
}

function summarizeChecks(checks = {}, resultsByName = {}) {
  return CHECK_ORDER
    .filter((name) => checks[name] || resultsByName[name])
    .map((name) => {
      const manifestCheck = checks[name] || {}
      const result = resultsByName[name] || null
      const summary = getResultSummary(result)

      return {
        name,
        label: CHECK_LABELS[name] || name,
        status: manifestCheck.status || result?.status || 'not-run',
        blockers: manifestCheck.blockers ?? summary.blockers ?? 0,
        warnings: manifestCheck.warnings ?? summary.warnings ?? 0,
        infos: manifestCheck.infos ?? summary.infos ?? 0,
        totalIssues: manifestCheck.totalIssues ?? summary.totalIssues ?? 0,
        durationMs: result?.durationMs ?? null,
      }
    })
}

function summarizeTotals(checks = []) {
  return checks.reduce(
    (totals, check) => {
      totals.blockers += check.blockers || 0
      totals.warnings += check.warnings || 0
      totals.infos += check.infos || 0
      totals.totalIssues += check.totalIssues || 0
      if (check.status === 'failed') totals.failedChecks += 1
      if (check.status === 'warning') totals.warningChecks += 1
      if (check.status === 'ok') totals.okChecks += 1
      return totals
    },
    {
      blockers: 0,
      warnings: 0,
      infos: 0,
      totalIssues: 0,
      failedChecks: 0,
      warningChecks: 0,
      okChecks: 0,
    },
  )
}

function buildTopIssues(manifest = {}, results = []) {
  const issueIndex = buildIssueIndex(results)
  return toArray(manifest.topIssues)
    .map((id) => issueIndex.get(id))
    .filter(Boolean)
}

function buildSections(resultsByName = {}) {
  return CHECK_ORDER.map((name) => {
    const result = resultsByName[name]
    if (!result) return null

    return {
      name,
      label: CHECK_LABELS[name] || name,
      status: result.status,
      summary: getResultSummary(result),
      issues: toArray(result.issues),
      meta: result.meta || {},
      updatedAt: result.finishedAt || result.startedAt || null,
    }
  }).filter(Boolean)
}

export function buildDashboardModel({
  manifest = {},
  scanResult = null,
  launchResult = null,
  testResult = null,
  buildResult = null,
  briefing = '',
} = {}) {
  const resultsByName = {
    'code-scan': scanResult,
    'launch-readiness': launchResult,
    'test-status': testResult,
    'build-status': buildResult,
  }

  const checks = summarizeChecks(manifest.checks || {}, resultsByName)
  const totals = summarizeTotals(checks)
  const results = Object.values(resultsByName).filter(Boolean)

  return {
    generatedAt: manifest.generatedAt || null,
    briefing,
    checks,
    totals,
    topIssues: buildTopIssues(manifest, results),
    sections: buildSections(resultsByName),
  }
}


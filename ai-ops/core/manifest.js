import { getTimestamp } from './clock.js'
import { OUTPUT_FILENAMES } from './constants.js'
import { sortIssuesBySeverity } from './severity.js'

export function buildManifest(results = []) {
  const checks = {}
  const topIssues = []

  const sortedIssues = sortIssuesBySeverity(results.flatMap((result) => result?.issues || []))

  for (const result of results) {
    if (!result?.check) continue

    checks[result.check] = {
      status: result.status,
      path: OUTPUT_FILENAMES[result.check] || `${result.check}.json`,
      blockers: result.summary?.blockers || 0,
      warnings: result.summary?.warnings || 0,
      infos: result.summary?.infos || 0,
      totalIssues: result.summary?.totalIssues || 0,
    }
  }

  for (const issue of sortedIssues.slice(0, 10)) {
    topIssues.push(issue.id)
  }

  return {
    generatedAt: getTimestamp(),
    checks,
    topIssues,
  }
}


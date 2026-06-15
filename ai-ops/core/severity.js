import { ISSUE_SEVERITY, RESULT_STATUS } from './constants.js'

const SEVERITY_WEIGHT = {
  [ISSUE_SEVERITY.INFO]: 1,
  [ISSUE_SEVERITY.WARNING]: 2,
  [ISSUE_SEVERITY.BLOCKER]: 3,
}

export function countIssuesBySeverity(issues = []) {
  return issues.reduce(
    (counts, issue) => {
      if (issue?.severity === ISSUE_SEVERITY.BLOCKER) counts.blockers += 1
      else if (issue?.severity === ISSUE_SEVERITY.WARNING) counts.warnings += 1
      else counts.infos += 1

      counts.totalIssues += 1
      return counts
    },
    {
      totalIssues: 0,
      blockers: 0,
      warnings: 0,
      infos: 0,
    },
  )
}

export function inferResultStatusFromIssues(issues = []) {
  const counts = countIssuesBySeverity(issues)

  if (counts.blockers > 0 || counts.warnings > 0) {
    return RESULT_STATUS.WARNING
  }

  return RESULT_STATUS.OK
}

export function sortIssuesBySeverity(issues = []) {
  return [...issues].sort((left, right) => {
    const bySeverity = (SEVERITY_WEIGHT[right.severity] || 0) - (SEVERITY_WEIGHT[left.severity] || 0)
    if (bySeverity !== 0) return bySeverity
    return String(left.id).localeCompare(String(right.id))
  })
}


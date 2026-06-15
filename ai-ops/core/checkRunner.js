import { getDurationMs, getTimestamp } from './clock.js'
import { OUTPUT_SCHEMA_VERSION, RESULT_STATUS } from './constants.js'
import { countIssuesBySeverity, inferResultStatusFromIssues } from './severity.js'

export async function runCheck(checkName, executor) {
  const startedAt = getTimestamp()
  const startedMs = Date.now()

  try {
    const payload = (await executor()) || {}
    const issues = Array.isArray(payload.issues) ? payload.issues : []
    const summary = payload.summary || countIssuesBySeverity(issues)
    const status = payload.status || inferResultStatusFromIssues(issues)

    return {
      check: checkName,
      version: OUTPUT_SCHEMA_VERSION,
      status,
      startedAt,
      finishedAt: getTimestamp(),
      durationMs: getDurationMs(startedMs),
      summary,
      issues,
      meta: payload.meta || {},
    }
  } catch (error) {
    return {
      check: checkName,
      version: OUTPUT_SCHEMA_VERSION,
      status: RESULT_STATUS.FAILED,
      startedAt,
      finishedAt: getTimestamp(),
      durationMs: getDurationMs(startedMs),
      summary: countIssuesBySeverity([]),
      issues: [],
      meta: {
        error: {
          name: error?.name || 'Error',
          message: error?.message || 'Unknown error',
        },
      },
    }
  }
}


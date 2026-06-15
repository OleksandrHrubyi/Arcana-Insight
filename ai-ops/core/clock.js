export function getTimestamp() {
  return new Date().toISOString()
}

export function getDurationMs(startedMs) {
  return Date.now() - startedMs
}

export function toHistoryRunId(isoTimestamp) {
  return String(isoTimestamp).replaceAll(':', '-').replaceAll('.', '-')
}


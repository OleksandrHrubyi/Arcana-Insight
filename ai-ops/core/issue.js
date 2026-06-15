const REQUIRED_STRING_FIELDS = ['id', 'source', 'severity', 'category', 'title', 'details', 'ruleId']

export function createIssue({
  id,
  source,
  severity,
  category,
  title,
  details,
  file = null,
  line = null,
  ruleId,
  suggestedAction = '',
  meta = {},
}) {
  const candidate = {
    id,
    source,
    severity,
    category,
    title,
    details,
    file,
    line,
    ruleId,
    suggestedAction,
    meta,
  }

  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof candidate[field] !== 'string' || candidate[field].trim().length === 0) {
      throw new Error(`createIssue requires non-empty string field "${field}"`)
    }
  }

  if (candidate.file !== null && typeof candidate.file !== 'string') {
    throw new Error('createIssue field "file" must be a string or null')
  }

  if (candidate.line !== null && !Number.isInteger(candidate.line)) {
    throw new Error('createIssue field "line" must be an integer or null')
  }

  if (!candidate.meta || typeof candidate.meta !== 'object' || Array.isArray(candidate.meta)) {
    throw new Error('createIssue field "meta" must be a plain object')
  }

  return candidate
}


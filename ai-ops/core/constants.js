export const OUTPUT_SCHEMA_VERSION = 1

export const CHECK_NAMES = {
  CODE_SCAN: 'code-scan',
  LAUNCH_READINESS: 'launch-readiness',
  TEST_STATUS: 'test-status',
  BUILD_STATUS: 'build-status',
}

export const RESULT_STATUS = {
  OK: 'ok',
  WARNING: 'warning',
  FAILED: 'failed',
}

export const ISSUE_SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  BLOCKER: 'blocker',
}

export const ISSUE_CATEGORY = {
  BUILD: 'build',
  CODE_QUALITY: 'code-quality',
  CONTENT: 'content',
  I18N: 'i18n',
  PREMIUM: 'premium',
  RELEASE: 'release',
  ROUTING: 'routing',
  TEST: 'test',
}

export const OUTPUT_FILENAMES = {
  [CHECK_NAMES.CODE_SCAN]: 'scan.json',
  [CHECK_NAMES.LAUNCH_READINESS]: 'launch.json',
  [CHECK_NAMES.TEST_STATUS]: 'tests.json',
  [CHECK_NAMES.BUILD_STATUS]: 'build.json',
  briefing: 'briefing.md',
  manifest: 'manifest.json',
}

export const OUTPUT_DIRECTORIES = {
  ROOT: 'ai-ops/output',
  LATEST: 'ai-ops/output/latest',
  HISTORY: 'ai-ops/output/history',
}


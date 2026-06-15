import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { runCheck } from '../core/checkRunner.js'
import { getTimestamp, toHistoryRunId } from '../core/clock.js'
import { CHECK_NAMES, ISSUE_CATEGORY, ISSUE_SEVERITY, OUTPUT_FILENAMES } from '../core/constants.js'
import { createIssue } from '../core/issue.js'
import { buildManifest } from '../core/manifest.js'
import { readLatestJson } from '../core/readOutput.js'
import { sortIssuesBySeverity } from '../core/severity.js'
import { writeHistoryJson, writeLatestJson } from '../core/writeOutput.js'

const REQUIRED_APP_STORE_FILES = [
  'app-store/index.html',
  'app-store/privacy-policy.html',
  'app-store/support.html',
  'app-store/metadata.md',
  'app-store/reviewer-notes.md',
]

const CHECKLIST_PATH = 'docs/release-reviewer/references/launch-checklist.md'
const ROUTES_PATH = 'src/router/routes.js'
const METADATA_PATH = 'app-store/metadata.md'
const IOS_SANDBOX_BILLING_REPORT_PATH = 'docs/release-reviewer/references/ios-sandbox-billing-report.md'
const IOS_SANDBOX_BILLING_LABEL =
  'Run real iOS sandbox flow for purchase, restore, cancel, and entitlement refresh'
const IOS_SANDBOX_REQUIRED_CHECKS = [
  'Catalog loads',
  'Cancelled purchase',
  'Successful monthly purchase',
  'Restore purchase',
  'Entitlement survives restart',
  'Negative restore',
]
const IOS_SANDBOX_OPTIONAL_CHECKS = ['Expiration/cancel sanity check']

async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getLineNumber(content, pattern) {
  const match = content.match(pattern)
  if (!match || typeof match.index !== 'number') return null
  return content.slice(0, match.index).split('\n').length
}

async function readText(rootDir, relativePath) {
  return fs.readFile(path.resolve(rootDir, relativePath), 'utf8')
}

function parseBillingReportStatuses(source) {
  const statuses = new Map()

  for (const line of source.split('\n')) {
    const match = line.match(/^([A-Za-z/ ][A-Za-z/ -]+):\s*(pass|fail|pending|not run)\s*$/i)
    if (!match) continue
    statuses.set(match[1].trim(), match[2].trim().toLowerCase())
  }

  return statuses
}

async function detectIosSandboxBillingReadiness(rootDir, checklistStatus, line) {
  const reportPath = path.resolve(rootDir, IOS_SANDBOX_BILLING_REPORT_PATH)
  const issueId = `launch-checklist:p0:${slugify(IOS_SANDBOX_BILLING_LABEL)}`

  if (!(await fileExists(reportPath))) {
    return createIssue({
      id: issueId,
      source: CHECK_NAMES.LAUNCH_READINESS,
      severity: ISSUE_SEVERITY.BLOCKER,
      category: ISSUE_CATEGORY.RELEASE,
      title: 'P0 launch checklist item is not done',
      details: `${IOS_SANDBOX_BILLING_LABEL} is marked "${checklistStatus}" in ${CHECKLIST_PATH}, and ${IOS_SANDBOX_BILLING_REPORT_PATH} is missing.`,
      file: CHECKLIST_PATH,
      line,
      ruleId: 'ios-sandbox-billing-report',
      suggestedAction: `Run the manual iPhone sandbox flow and record results in ${IOS_SANDBOX_BILLING_REPORT_PATH}.`,
      meta: {
        priority: 'P0',
        status: checklistStatus,
        reportPath: IOS_SANDBOX_BILLING_REPORT_PATH,
      },
    })
  }

  const reportSource = await fs.readFile(reportPath, 'utf8')
  const statuses = parseBillingReportStatuses(reportSource)
  const pendingOrFailed = []

  for (const label of IOS_SANDBOX_REQUIRED_CHECKS) {
    const status = statuses.get(label) || 'pending'
    if (status !== 'pass') {
      pendingOrFailed.push(`${label}: ${status}`)
    }
  }

  for (const label of IOS_SANDBOX_OPTIONAL_CHECKS) {
    const status = statuses.get(label)
    if (status && !['pass', 'not run'].includes(status)) {
      pendingOrFailed.push(`${label}: ${status}`)
    }
  }

  if (pendingOrFailed.length === 0) {
    return null
  }

  return createIssue({
    id: issueId,
    source: CHECK_NAMES.LAUNCH_READINESS,
    severity: ISSUE_SEVERITY.BLOCKER,
    category: ISSUE_CATEGORY.RELEASE,
    title: 'P0 launch checklist item is not done',
    details: `${IOS_SANDBOX_BILLING_LABEL} still needs manual proof in ${IOS_SANDBOX_BILLING_REPORT_PATH}. Remaining statuses: ${pendingOrFailed.join(', ')}.`,
    file: IOS_SANDBOX_BILLING_REPORT_PATH,
    line: 1,
    ruleId: 'ios-sandbox-billing-report',
    suggestedAction: 'Complete the remaining sandbox billing checks on a real iPhone and update the report file.',
    meta: {
      priority: 'P0',
      status: checklistStatus,
      reportPath: IOS_SANDBOX_BILLING_REPORT_PATH,
      remaining: pendingOrFailed,
    },
  })
}

async function detectRequiredAppStoreFiles(rootDir) {
  const issues = []

  for (const relativePath of REQUIRED_APP_STORE_FILES) {
    const absolutePath = path.resolve(rootDir, relativePath)
    if (await fileExists(absolutePath)) continue

    issues.push(
      createIssue({
        id: `missing-app-store-file:${relativePath}`,
        source: CHECK_NAMES.LAUNCH_READINESS,
        severity: ISSUE_SEVERITY.BLOCKER,
        category: ISSUE_CATEGORY.RELEASE,
        title: 'Required App Store artifact is missing',
        details: `${relativePath} is missing from the repository.`,
        file: relativePath,
        line: null,
        ruleId: 'required-app-store-file',
        suggestedAction: 'Add the missing App Store artifact before submission preparation.',
      }),
    )
  }

  return issues
}

export async function detectMetadataUrls(rootDir) {
  const absolutePath = path.resolve(rootDir, METADATA_PATH)
  if (!(await fileExists(absolutePath))) {
    return [
      createIssue({
        id: `missing-metadata:${METADATA_PATH}`,
        source: CHECK_NAMES.LAUNCH_READINESS,
        severity: ISSUE_SEVERITY.BLOCKER,
        category: ISSUE_CATEGORY.RELEASE,
        title: 'App Store metadata file is missing',
        details: `${METADATA_PATH} is required for store submission review.`,
        file: METADATA_PATH,
        line: null,
        ruleId: 'metadata-file-required',
        suggestedAction: 'Restore or create app-store/metadata.md.',
      }),
    ]
  }

  const source = await fs.readFile(absolutePath, 'utf8')
  const issues = []

  const urlChecks = [
    { label: 'Privacy Policy URL', expectedFile: 'app-store/privacy-policy.html' },
    { label: 'Support URL', expectedFile: 'app-store/support.html' },
  ]

  for (const config of urlChecks) {
    const escapedLabel = config.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(`${escapedLabel}\\s*\\|\\s*` + '`([^`]+)`')
    const match = source.match(pattern)
    const line = getLineNumber(source, new RegExp(escapedLabel))

    if (!match) {
      issues.push(
        createIssue({
          id: `missing-metadata-url:${slugify(config.label)}`,
          source: CHECK_NAMES.LAUNCH_READINESS,
          severity: ISSUE_SEVERITY.BLOCKER,
          category: ISSUE_CATEGORY.RELEASE,
          title: `${config.label} is missing from metadata`,
          details: `Could not find a ${config.label} entry in ${METADATA_PATH}.`,
          file: METADATA_PATH,
          line,
          ruleId: 'metadata-url-required',
          suggestedAction: `Add a public HTTPS ${config.label} to app-store/metadata.md.`,
        }),
      )
      continue
    }

    const url = match[1].trim()
    const isHttps = /^https:\/\//i.test(url)
    const isPlaceholder = /(example\.com|localhost|127\.0\.0\.1|<|>|\byour[- ]domain\b)/i.test(url)

    if (!isHttps || isPlaceholder) {
      issues.push(
        createIssue({
          id: `invalid-metadata-url:${slugify(config.label)}`,
          source: CHECK_NAMES.LAUNCH_READINESS,
          severity: ISSUE_SEVERITY.BLOCKER,
          category: ISSUE_CATEGORY.RELEASE,
          title: `${config.label} is not submission-ready`,
          details: `${config.label} must be a public HTTPS URL. Current value: ${url}`,
          file: METADATA_PATH,
          line,
          ruleId: 'metadata-url-public-https',
          suggestedAction: 'Replace the placeholder or local URL with the final public page.',
          meta: {
            url,
          },
        }),
      )
    }
  }

  return issues
}

export async function detectRouteCoverage(rootDir) {
  const absolutePath = path.resolve(rootDir, ROUTES_PATH)
  if (!(await fileExists(absolutePath))) {
    return [
      createIssue({
        id: `missing-routes-file:${ROUTES_PATH}`,
        source: CHECK_NAMES.LAUNCH_READINESS,
        severity: ISSUE_SEVERITY.BLOCKER,
        category: ISSUE_CATEGORY.ROUTING,
        title: 'Router map is missing',
        details: `${ROUTES_PATH} is required to validate screen coverage.`,
        file: ROUTES_PATH,
        line: null,
        ruleId: 'routes-file-required',
        suggestedAction: 'Restore src/router/routes.js before running launch checks.',
      }),
    ]
  }

  const source = await fs.readFile(absolutePath, 'utf8')
  const issues = []
  const matches = source.matchAll(/import\('src\/pages\/([^']+)'\)/g)

  for (const match of matches) {
    const pageRelativePath = `src/pages/${match[1]}`
    const pageAbsolutePath = path.resolve(rootDir, pageRelativePath)
    if (await fileExists(pageAbsolutePath)) continue

    issues.push(
      createIssue({
        id: `missing-route-page:${pageRelativePath}`,
        source: CHECK_NAMES.LAUNCH_READINESS,
        severity: ISSUE_SEVERITY.BLOCKER,
        category: ISSUE_CATEGORY.ROUTING,
        title: 'Route points to a missing page file',
        details: `${ROUTES_PATH} references ${pageRelativePath}, but the file does not exist.`,
        file: ROUTES_PATH,
        line: null,
        ruleId: 'route-page-exists',
        suggestedAction: 'Create the missing page file or remove the route reference.',
        meta: {
          page: pageRelativePath,
        },
      }),
    )
  }

  return issues
}

export async function detectLaunchChecklistStatuses(rootDir) {
  const absolutePath = path.resolve(rootDir, CHECKLIST_PATH)
  if (!(await fileExists(absolutePath))) {
    return [
      createIssue({
        id: `missing-launch-checklist:${CHECKLIST_PATH}`,
        source: CHECK_NAMES.LAUNCH_READINESS,
        severity: ISSUE_SEVERITY.WARNING,
        category: ISSUE_CATEGORY.RELEASE,
        title: 'Launch checklist file is missing',
        details: `${CHECKLIST_PATH} is not present, so release status cannot be audited from the repo checklist.`,
        file: CHECKLIST_PATH,
        line: null,
        ruleId: 'launch-checklist-present',
        suggestedAction: 'Restore the launch checklist or point launch-readiness to the active checklist file.',
      }),
    ]
  }

  const source = await fs.readFile(absolutePath, 'utf8')
  const lines = source.split('\n')
  const issues = []
  let currentPriority = null

  lines.forEach((line, index) => {
    if (/^##\s+P0\b/.test(line)) currentPriority = 'P0'
    else if (/^##\s+P1\b/.test(line)) currentPriority = 'P1'
    else if (/^##\s+P2\b/.test(line)) currentPriority = 'P2'

    const match = line.match(/^- `([^`]+)` (.+)$/)
    if (!match || !currentPriority) return

    const status = match[1].trim().toLowerCase()
    const label = match[2].trim().replace(/\.$/, '')
    if (status === 'done') return

    if (currentPriority === 'P0' && label === IOS_SANDBOX_BILLING_LABEL) {
      issues.push(detectIosSandboxBillingReadiness(rootDir, status, index + 1))
      return
    }

    const severity =
      currentPriority === 'P0' ? ISSUE_SEVERITY.BLOCKER : ISSUE_SEVERITY.WARNING

    issues.push(
      createIssue({
        id: `launch-checklist:${currentPriority.toLowerCase()}:${slugify(label)}`,
        source: CHECK_NAMES.LAUNCH_READINESS,
        severity,
        category: ISSUE_CATEGORY.RELEASE,
        title: `${currentPriority} launch checklist item is not done`,
        details: `${label} is marked "${status}" in ${CHECKLIST_PATH}.`,
        file: CHECKLIST_PATH,
        line: index + 1,
        ruleId: 'launch-checklist-status',
        suggestedAction: 'Resolve or explicitly defer the item before final release prep.',
        meta: {
          priority: currentPriority,
          status,
        },
      }),
    )
  })

  return (await Promise.all(issues)).filter(Boolean)
}

export async function detectSuspectIosConfigCopies(rootDir) {
  const iosAppDir = path.resolve(rootDir, 'ios/App/App')
  if (!(await fileExists(iosAppDir))) return []

  const entries = await fs.readdir(iosAppDir)
  return entries
    .filter((name) => /^config\s+\d+\.xml$/i.test(name))
    .map((name) =>
      createIssue({
        id: `suspect-generated-ios-config:${name}`,
        source: CHECK_NAMES.LAUNCH_READINESS,
        severity: ISSUE_SEVERITY.WARNING,
        category: ISSUE_CATEGORY.RELEASE,
        title: 'Suspect generated iOS config copy exists',
        details: `${name} looks like an accidental generated duplicate in ios/App/App.`,
        file: `ios/App/App/${name}`,
        line: null,
        ruleId: 'suspect-generated-ios-config',
        suggestedAction: 'Confirm whether the file is intentional; remove or explain stray generated files before release.',
      }),
    )
}

async function readAvailableResult(relativeFilename, rootDir) {
  try {
    return await readLatestJson(relativeFilename, rootDir)
  } catch {
    return null
  }
}

export async function execute(rootDir = process.cwd()) {
  return runCheck(CHECK_NAMES.LAUNCH_READINESS, async () => {
    const issues = sortIssuesBySeverity([
      ...(await detectRequiredAppStoreFiles(rootDir)),
      ...(await detectMetadataUrls(rootDir)),
      ...(await detectRouteCoverage(rootDir)),
      ...(await detectLaunchChecklistStatuses(rootDir)),
      ...(await detectSuspectIosConfigCopies(rootDir)),
    ])

    return {
      issues,
      meta: {
        rootDir,
        requiredFiles: REQUIRED_APP_STORE_FILES,
      },
    }
  })
}

export async function writeLaunchArtifacts(result, rootDir = process.cwd()) {
  await writeLatestJson(OUTPUT_FILENAMES[CHECK_NAMES.LAUNCH_READINESS], result, rootDir)
  const runId = toHistoryRunId(getTimestamp())
  await writeHistoryJson(runId, OUTPUT_FILENAMES[CHECK_NAMES.LAUNCH_READINESS], result, rootDir)

  const existingResults = await Promise.all([
    readAvailableResult(OUTPUT_FILENAMES[CHECK_NAMES.CODE_SCAN], rootDir),
    readAvailableResult(OUTPUT_FILENAMES[CHECK_NAMES.TEST_STATUS], rootDir),
    readAvailableResult(OUTPUT_FILENAMES[CHECK_NAMES.BUILD_STATUS], rootDir),
  ])

  const manifest = buildManifest([result, ...existingResults.filter(Boolean)])
  await writeLatestJson(OUTPUT_FILENAMES.manifest, manifest, rootDir)
  await writeHistoryJson(runId, OUTPUT_FILENAMES.manifest, manifest, rootDir)

  return {
    runId,
    manifest,
  }
}

async function main() {
  const result = await execute(process.cwd())
  await writeLaunchArtifacts(result, process.cwd())
  process.stdout.write(`${JSON.stringify(result.summary)}\n`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main()
}

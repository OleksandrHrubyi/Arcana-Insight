import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { runCheck } from '../core/checkRunner.js'
import { getTimestamp, toHistoryRunId } from '../core/clock.js'
import { ISSUE_CATEGORY, ISSUE_SEVERITY, CHECK_NAMES, OUTPUT_FILENAMES } from '../core/constants.js'
import { createIssue } from '../core/issue.js'
import { buildManifest } from '../core/manifest.js'
import { sortIssuesBySeverity } from '../core/severity.js'
import { writeHistoryJson, writeLatestJson } from '../core/writeOutput.js'

const DEFAULT_SCAN_DIRECTORIES = ['src', 'supabase']
const SCANNED_FILE_EXTENSIONS = new Set(['.js', '.ts', '.vue', '.json', '.md', '.scss', '.css', '.html'])
const TODO_PATTERNS = [
  {
    pattern: /^\s*(?:\/\/|\/\*+|\*|<!--).*?\bTODO\b/i,
    ruleId: 'todo-marker',
    title: 'TODO marker found',
    severity: ISSUE_SEVERITY.WARNING,
  },
  {
    pattern: /^\s*(?:\/\/|\/\*+|\*|<!--).*?\bFIXME\b/i,
    ruleId: 'fixme-marker',
    title: 'FIXME marker found',
    severity: ISSUE_SEVERITY.WARNING,
  },
  {
    pattern: /^\s*(?:\/\/|\/\*+|\*|<!--).*?\bnot implemented\b/i,
    ruleId: 'not-implemented-marker',
    title: 'Not implemented marker found',
    severity: ISSUE_SEVERITY.WARNING,
  },
]
const HIDDEN_BLOCK_PATTERNS = [
  {
    pattern: /style\s*=\s*["'][^"']*display\s*:\s*none/i,
    ruleId: 'display-none-inline',
    title: 'UI block is hidden with inline display: none',
  },
  { pattern: /v-if\s*=\s*["']false["']/i, ruleId: 'v-if-false', title: 'UI block is permanently disabled with v-if="false"' },
]
const PLACEHOLDER_PATTERNS = [
  { pattern: /\bcoming soon\b/i, ruleId: 'coming-soon-placeholder', title: 'Route page contains "coming soon" placeholder' },
  { pattern: /\bunder construction\b/i, ruleId: 'under-construction-placeholder', title: 'Route page contains "under construction" placeholder' },
  { pattern: /\blorem ipsum\b/i, ruleId: 'lorem-ipsum-placeholder', title: 'Route page contains lorem ipsum placeholder' },
]
const SUSPECT_DUPLICATE_SUFFIX_PATTERN = /(?:\s+\d+| copy| final| new)\.[^.]+$/i

async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function collectFiles(rootDir, relativeDir, accumulator) {
  const absoluteDir = path.resolve(rootDir, relativeDir)
  if (!(await fileExists(absoluteDir))) return accumulator

  const entries = await fs.readdir(absoluteDir, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue

    const relativePath = path.posix.join(relativeDir, entry.name)
    const absolutePath = path.resolve(rootDir, relativePath)

    if (entry.isDirectory()) {
      await collectFiles(rootDir, relativePath, accumulator)
      continue
    }

    if (!SCANNED_FILE_EXTENSIONS.has(path.extname(entry.name))) continue

    const content = await fs.readFile(absolutePath, 'utf8')
    accumulator.push({
      absolutePath,
      relativePath,
      content,
      basename: entry.name,
    })
  }

  return accumulator
}

async function getScannableFiles(rootDir) {
  const files = []
  for (const relativeDir of DEFAULT_SCAN_DIRECTORIES) {
    await collectFiles(rootDir, relativeDir, files)
  }
  return files
}

function getLineNumber(content, pattern) {
  const match = content.match(pattern)
  if (!match || typeof match.index !== 'number') return null
  return content.slice(0, match.index).split('\n').length
}

export function flattenObjectKeys(input, prefix = '') {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return prefix ? [prefix] : []
  }

  const keys = []
  for (const [key, value] of Object.entries(input)) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenObjectKeys(value, nextPrefix))
    } else {
      keys.push(nextPrefix)
    }
  }
  return keys
}

export function detectTodoMarkers(files) {
  const issues = []

  for (const file of files) {
    const lines = file.content.split('\n')
    lines.forEach((line, index) => {
      for (const config of TODO_PATTERNS) {
        if (!config.pattern.test(line)) continue

        issues.push(
          createIssue({
            id: `${config.ruleId}:${file.relativePath}:${index + 1}`,
            source: CHECK_NAMES.CODE_SCAN,
            severity: config.severity,
            category: ISSUE_CATEGORY.CODE_QUALITY,
            title: config.title,
            details: line.trim() || 'Marker found in file content',
            file: file.relativePath,
            line: index + 1,
            ruleId: config.ruleId,
            suggestedAction: 'Resolve or remove the marker before release review.',
            meta: {
              snippet: line.trim(),
            },
          }),
        )
      }
    })
  }

  return issues
}

export function detectSuspectDuplicateFiles(files) {
  return files
    .filter((file) => SUSPECT_DUPLICATE_SUFFIX_PATTERN.test(file.basename))
    .map((file) =>
      createIssue({
        id: `suspect-duplicate-file:${file.relativePath}`,
        source: CHECK_NAMES.CODE_SCAN,
        severity: ISSUE_SEVERITY.WARNING,
        category: ISSUE_CATEGORY.CODE_QUALITY,
        title: 'Suspect duplicate file name',
        details: `${file.basename} looks like a duplicate or abandoned variant.`,
        file: file.relativePath,
        line: null,
        ruleId: 'suspect-duplicate-file',
        suggestedAction: 'Confirm the canonical active file and remove or archive duplicates.',
        meta: {
          basename: file.basename,
        },
      }),
    )
}

export async function detectI18nParity(rootDir) {
  const enPath = path.resolve(rootDir, 'src/i18n/en.json')
  const ukPath = path.resolve(rootDir, 'src/i18n/uk.json')

  if (!(await fileExists(enPath)) || !(await fileExists(ukPath))) {
    return []
  }

  const en = JSON.parse(await fs.readFile(enPath, 'utf8'))
  const uk = JSON.parse(await fs.readFile(ukPath, 'utf8'))
  const enKeys = new Set(flattenObjectKeys(en))
  const ukKeys = new Set(flattenObjectKeys(uk))

  const issues = []

  for (const key of [...enKeys].sort()) {
    if (ukKeys.has(key)) continue
    issues.push(
      createIssue({
        id: `i18n-missing-uk:${key}`,
        source: CHECK_NAMES.CODE_SCAN,
        severity: ISSUE_SEVERITY.WARNING,
        category: ISSUE_CATEGORY.I18N,
        title: 'Missing key in uk locale',
        details: `Translation key "${key}" exists in en.json but is missing in uk.json.`,
        file: 'src/i18n/uk.json',
        line: null,
        ruleId: 'i18n-parity',
        suggestedAction: 'Add the matching translation key in uk.json.',
        meta: {
          key,
          locale: 'uk',
          referenceLocale: 'en',
        },
      }),
    )
  }

  for (const key of [...ukKeys].sort()) {
    if (enKeys.has(key)) continue
    issues.push(
      createIssue({
        id: `i18n-missing-en:${key}`,
        source: CHECK_NAMES.CODE_SCAN,
        severity: ISSUE_SEVERITY.WARNING,
        category: ISSUE_CATEGORY.I18N,
        title: 'Missing key in en locale',
        details: `Translation key "${key}" exists in uk.json but is missing in en.json.`,
        file: 'src/i18n/en.json',
        line: null,
        ruleId: 'i18n-parity',
        suggestedAction: 'Add the matching translation key in en.json.',
        meta: {
          key,
          locale: 'en',
          referenceLocale: 'uk',
        },
      }),
    )
  }

  return issues
}

export function detectHiddenUiBlocks(files) {
  const issues = []

  for (const file of files) {
    if (!['.vue', '.scss', '.css', '.html'].includes(path.extname(file.relativePath))) continue

    for (const config of HIDDEN_BLOCK_PATTERNS) {
      const line = getLineNumber(file.content, config.pattern)
      if (!line) continue

      issues.push(
        createIssue({
          id: `${config.ruleId}:${file.relativePath}:${line}`,
          source: CHECK_NAMES.CODE_SCAN,
          severity: ISSUE_SEVERITY.INFO,
          category: ISSUE_CATEGORY.CODE_QUALITY,
          title: config.title,
          details: `Hidden or disabled UI block detected in ${file.relativePath}.`,
          file: file.relativePath,
          line,
          ruleId: config.ruleId,
          suggestedAction: 'Verify that the hidden block is intentional and not dead UI.',
        }),
      )
    }
  }

  return issues
}

export async function getRoutePageFiles(rootDir) {
  const routesPath = path.resolve(rootDir, 'src/router/routes.js')
  if (!(await fileExists(routesPath))) return []

  const source = await fs.readFile(routesPath, 'utf8')
  const matches = source.matchAll(/import\('src\/pages\/([^']+)'\)/g)
  const routeFiles = []

  for (const match of matches) {
    const pageRelativePath = `src/pages/${match[1]}`
    const absolutePath = path.resolve(rootDir, pageRelativePath)
    if (!(await fileExists(absolutePath))) continue
    routeFiles.push({
      relativePath: pageRelativePath,
      absolutePath,
      content: await fs.readFile(absolutePath, 'utf8'),
      basename: path.basename(absolutePath),
    })
  }

  return routeFiles
}

export function detectRoutePlaceholders(routeFiles) {
  const issues = []

  for (const file of routeFiles) {
    for (const config of PLACEHOLDER_PATTERNS) {
      const line = getLineNumber(file.content, config.pattern)
      if (!line) continue

      issues.push(
        createIssue({
          id: `${config.ruleId}:${file.relativePath}:${line}`,
          source: CHECK_NAMES.CODE_SCAN,
          severity: ISSUE_SEVERITY.WARNING,
          category: ISSUE_CATEGORY.ROUTING,
          title: config.title,
          details: `${file.relativePath} contains likely placeholder content for a routed page.`,
          file: file.relativePath,
          line,
          ruleId: config.ruleId,
          suggestedAction: 'Replace placeholder copy with a production-ready screen or explicit redirect.',
        }),
      )
    }
  }

  return issues
}

export async function scanRepository(rootDir = process.cwd()) {
  const files = await getScannableFiles(rootDir)
  const routeFiles = await getRoutePageFiles(rootDir)

  const issues = [
    ...detectTodoMarkers(files),
    ...detectSuspectDuplicateFiles(files),
    ...(await detectI18nParity(rootDir)),
    ...detectHiddenUiBlocks(files),
    ...detectRoutePlaceholders(routeFiles),
  ]

  return sortIssuesBySeverity(issues)
}

export async function execute(rootDir = process.cwd()) {
  return runCheck(CHECK_NAMES.CODE_SCAN, async () => {
    const issues = await scanRepository(rootDir)

    return {
      issues,
      meta: {
        rootDir,
        scannedDirectories: DEFAULT_SCAN_DIRECTORIES,
      },
    }
  })
}

export async function writeScanArtifacts(result, rootDir = process.cwd()) {
  await writeLatestJson(OUTPUT_FILENAMES[CHECK_NAMES.CODE_SCAN], result, rootDir)
  const runId = toHistoryRunId(getTimestamp())
  await writeHistoryJson(runId, OUTPUT_FILENAMES[CHECK_NAMES.CODE_SCAN], result, rootDir)
  const manifest = buildManifest([result])
  await writeLatestJson(OUTPUT_FILENAMES.manifest, manifest, rootDir)
  await writeHistoryJson(runId, OUTPUT_FILENAMES.manifest, manifest, rootDir)
  return {
    runId,
    manifest,
  }
}

async function main() {
  const result = await execute(process.cwd())
  await writeScanArtifacts(result, process.cwd())
  process.stdout.write(`${JSON.stringify(result.summary)}\n`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main()
}

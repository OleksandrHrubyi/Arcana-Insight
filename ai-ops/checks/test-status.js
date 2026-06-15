import { spawn } from 'node:child_process'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { runCheck } from '../core/checkRunner.js'
import { getTimestamp, toHistoryRunId } from '../core/clock.js'
import { CHECK_NAMES, ISSUE_CATEGORY, ISSUE_SEVERITY, OUTPUT_FILENAMES, RESULT_STATUS } from '../core/constants.js'
import { createIssue } from '../core/issue.js'
import { buildManifest } from '../core/manifest.js'
import { readLatestJson } from '../core/readOutput.js'
import { sortIssuesBySeverity } from '../core/severity.js'
import { writeHistoryJson, writeLatestJson } from '../core/writeOutput.js'

const DEFAULT_TEST_COMMAND = ['npm', 'test']
const FAILURE_EXCERPT_LINE_LIMIT = 12

function quoteArg(value) {
  if (/^[a-zA-Z0-9._/-]+$/.test(value)) return value
  return JSON.stringify(value)
}

function normalizeCommand(command = DEFAULT_TEST_COMMAND) {
  if (Array.isArray(command)) {
    const [file, ...args] = command
    return {
      file,
      args,
      display: command.map(quoteArg).join(' '),
    }
  }

  if (typeof command === 'string' && command.trim().length > 0) {
    return {
      file: command,
      args: [],
      display: command,
    }
  }

  throw new Error('Test command must be a non-empty string or array.')
}

export function parseTapOutput(output) {
  const text = String(output || '')
  const lines = text.split('\n')
  const failingTests = []
  const counts = {
    tests: 0,
    pass: 0,
    fail: 0,
    cancelled: 0,
    skipped: 0,
    todo: 0,
  }

  for (const line of lines) {
    const failureMatch = line.match(/^not ok \d+ - (.+)$/)
    if (failureMatch) {
      failingTests.push(failureMatch[1].trim())
      continue
    }

    const countMatch = line.match(/^# (tests|pass|fail|cancelled|skipped|todo) (\d+)$/)
    if (countMatch) {
      counts[countMatch[1]] = Number(countMatch[2])
    }
  }

  return {
    counts,
    failingTests,
  }
}

function buildFailureExcerpt(output) {
  const text = String(output || '').trim()
  if (!text) return ''

  return text
    .split('\n')
    .slice(-FAILURE_EXCERPT_LINE_LIMIT)
    .join('\n')
}

function buildTestIssues(failingTests, commandDisplay, exitCode) {
  return failingTests.map((name, index) =>
    createIssue({
      id: `failing-test:${index + 1}:${name}`,
      source: CHECK_NAMES.TEST_STATUS,
      severity: ISSUE_SEVERITY.BLOCKER,
      category: ISSUE_CATEGORY.TEST,
      title: 'Failing test detected',
      details: name,
      file: null,
      line: null,
      ruleId: 'failing-test',
      suggestedAction: `Re-run ${commandDisplay} locally and fix the failing test.`,
      meta: {
        testName: name,
        exitCode,
      },
    }),
  )
}

export async function runTestCommand(rootDir = process.cwd(), command = DEFAULT_TEST_COMMAND) {
  const normalized = normalizeCommand(command)

  return new Promise((resolve, reject) => {
    const child = spawn(normalized.file, normalized.args, {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk)
    })

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk)
    })

    child.on('error', reject)
    child.on('close', (exitCode, signal) => {
      resolve({
        command: normalized.display,
        exitCode: typeof exitCode === 'number' ? exitCode : null,
        signal: signal || null,
        stdout,
        stderr,
      })
    })
  })
}

async function readAvailableResult(relativeFilename, rootDir) {
  try {
    return await readLatestJson(relativeFilename, rootDir)
  } catch {
    return null
  }
}

export async function execute(rootDir = process.cwd(), options = {}) {
  const command = options.command || DEFAULT_TEST_COMMAND

  return runCheck(CHECK_NAMES.TEST_STATUS, async () => {
    const commandResult = await runTestCommand(rootDir, command)
    const combinedOutput = [commandResult.stdout, commandResult.stderr].filter(Boolean).join('\n')
    const parsed = parseTapOutput(combinedOutput)
    const issues = buildTestIssues(parsed.failingTests, commandResult.command, commandResult.exitCode)
    const hasRuntimeFailure =
      commandResult.exitCode !== 0 && parsed.failingTests.length === 0 && combinedOutput.trim().length > 0

    if (hasRuntimeFailure) {
      issues.push(
        createIssue({
          id: 'test-command-failed',
          source: CHECK_NAMES.TEST_STATUS,
          severity: ISSUE_SEVERITY.BLOCKER,
          category: ISSUE_CATEGORY.TEST,
          title: 'Test command failed',
          details: `Test command exited with code ${commandResult.exitCode}.`,
          file: null,
          line: null,
          ruleId: 'test-command-failed',
          suggestedAction: `Inspect the command output and rerun ${commandResult.command}.`,
          meta: {
            exitCode: commandResult.exitCode,
            signal: commandResult.signal,
          },
        }),
      )
    }

    const sortedIssues = sortIssuesBySeverity(issues)

    return {
      status: commandResult.exitCode === 0 ? RESULT_STATUS.OK : RESULT_STATUS.FAILED,
      issues: sortedIssues,
      meta: {
        command: commandResult.command,
        exitCode: commandResult.exitCode,
        signal: commandResult.signal,
        counts: parsed.counts,
        failingTests: parsed.failingTests,
        outputExcerpt:
          commandResult.exitCode === 0 ? '' : buildFailureExcerpt(combinedOutput),
      },
    }
  })
}

export async function writeTestArtifacts(result, rootDir = process.cwd()) {
  await writeLatestJson(OUTPUT_FILENAMES[CHECK_NAMES.TEST_STATUS], result, rootDir)
  const runId = toHistoryRunId(getTimestamp())
  await writeHistoryJson(runId, OUTPUT_FILENAMES[CHECK_NAMES.TEST_STATUS], result, rootDir)

  const existingResults = await Promise.all([
    readAvailableResult(OUTPUT_FILENAMES[CHECK_NAMES.CODE_SCAN], rootDir),
    readAvailableResult(OUTPUT_FILENAMES[CHECK_NAMES.LAUNCH_READINESS], rootDir),
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
  await writeTestArtifacts(result, process.cwd())
  process.stdout.write(`${JSON.stringify(result.summary)}\n`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main()
}


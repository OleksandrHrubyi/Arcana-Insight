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

const DEFAULT_BUILD_COMMANDS = [['npm', 'run', 'build']]
const FAILURE_EXCERPT_LINE_LIMIT = 12

function quoteArg(value) {
  if (/^[a-zA-Z0-9._/-]+$/.test(value)) return value
  return JSON.stringify(value)
}

function normalizeCommand(command) {
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

  throw new Error('Build command must be a non-empty string or array.')
}

function buildFailureExcerpt(output) {
  const text = String(output || '').trim()
  if (!text) return ''

  return text
    .split('\n')
    .slice(-FAILURE_EXCERPT_LINE_LIMIT)
    .join('\n')
}

export async function runBuildCommand(rootDir = process.cwd(), command) {
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

export async function runBuildCommands(rootDir = process.cwd(), commands = DEFAULT_BUILD_COMMANDS) {
  const results = []

  for (const command of commands) {
    const result = await runBuildCommand(rootDir, command)
    results.push(result)

    if (result.exitCode !== 0) break
  }

  return results
}

function buildBuildIssues(results) {
  const issues = []

  for (const result of results) {
    if (result.exitCode === 0) continue

    const combinedOutput = [result.stdout, result.stderr].filter(Boolean).join('\n')
    issues.push(
      createIssue({
        id: `build-command-failed:${result.command}`,
        source: CHECK_NAMES.BUILD_STATUS,
        severity: ISSUE_SEVERITY.BLOCKER,
        category: ISSUE_CATEGORY.BUILD,
        title: 'Build command failed',
        details: `${result.command} exited with code ${result.exitCode}.`,
        file: null,
        line: null,
        ruleId: 'build-command-failed',
        suggestedAction: `Inspect the output and rerun ${result.command}.`,
        meta: {
          command: result.command,
          exitCode: result.exitCode,
          signal: result.signal,
          outputExcerpt: buildFailureExcerpt(combinedOutput),
        },
      }),
    )
  }

  return issues
}

async function readAvailableResult(relativeFilename, rootDir) {
  try {
    return await readLatestJson(relativeFilename, rootDir)
  } catch {
    return null
  }
}

export async function execute(rootDir = process.cwd(), options = {}) {
  const commands = options.commands || DEFAULT_BUILD_COMMANDS

  return runCheck(CHECK_NAMES.BUILD_STATUS, async () => {
    const commandResults = await runBuildCommands(rootDir, commands)
    const issues = sortIssuesBySeverity(buildBuildIssues(commandResults))
    const failedResult = commandResults.find((result) => result.exitCode !== 0)

    return {
      status: failedResult ? RESULT_STATUS.FAILED : RESULT_STATUS.OK,
      issues,
      meta: {
        commands: commandResults.map((result) => ({
          command: result.command,
          exitCode: result.exitCode,
          signal: result.signal,
          outputExcerpt:
            result.exitCode === 0
              ? ''
              : buildFailureExcerpt([result.stdout, result.stderr].filter(Boolean).join('\n')),
        })),
      },
    }
  })
}

export async function writeBuildArtifacts(result, rootDir = process.cwd()) {
  await writeLatestJson(OUTPUT_FILENAMES[CHECK_NAMES.BUILD_STATUS], result, rootDir)
  const runId = toHistoryRunId(getTimestamp())
  await writeHistoryJson(runId, OUTPUT_FILENAMES[CHECK_NAMES.BUILD_STATUS], result, rootDir)

  const existingResults = await Promise.all([
    readAvailableResult(OUTPUT_FILENAMES[CHECK_NAMES.CODE_SCAN], rootDir),
    readAvailableResult(OUTPUT_FILENAMES[CHECK_NAMES.LAUNCH_READINESS], rootDir),
    readAvailableResult(OUTPUT_FILENAMES[CHECK_NAMES.TEST_STATUS], rootDir),
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
  await writeBuildArtifacts(result, process.cwd())
  process.stdout.write(`${JSON.stringify(result.summary)}\n`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main()
}


import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { getTimestamp, toHistoryRunId } from '../core/clock.js'
import { CHECK_NAMES, OUTPUT_FILENAMES } from '../core/constants.js'
import { readLatestJson } from '../core/readOutput.js'
import { writeHistoryText, writeLatestText } from '../core/writeOutput.js'

function summarizeCheck(result) {
  if (!result) return 'not run'
  const summary = result.summary || {}
  return `${result.status} (${summary.blockers || 0} blockers, ${summary.warnings || 0} warnings, ${summary.totalIssues || 0} total)`
}

function pickTopIssues(issues = [], limit = 5) {
  return issues.slice(0, limit)
}

function buildTestsLine(testResult) {
  if (!testResult) return '- Status: not run'

  const counts = testResult.meta?.counts || {}
  return `- Status: ${testResult.status} | tests: ${counts.tests || 0}, pass: ${counts.pass || 0}, fail: ${counts.fail || 0}, skipped: ${counts.skipped || 0}`
}

function buildBuildLines(buildResult) {
  if (!buildResult) {
    return ['- Status: not run']
  }

  const commands = buildResult.meta?.commands || []
  if (commands.length === 0) {
    return [`- Status: ${buildResult.status}`]
  }

  return commands.map((commandResult) => {
    const excerpt = commandResult.outputExcerpt ? ` | excerpt: ${commandResult.outputExcerpt.replace(/\s+/g, ' ').trim()}` : ''
    return `- ${commandResult.command} -> exit ${commandResult.exitCode}${excerpt}`
  })
}

function formatIssue(issue) {
  const location = issue.file ? ` (${issue.file}${issue.line ? `:${issue.line}` : ''})` : ''
  return `- [${issue.severity}] ${issue.title}: ${issue.details}${location}`
}

export function buildBriefingMarkdown({
  generatedAt = getTimestamp(),
  scanResult = null,
  launchResult = null,
  testResult = null,
  buildResult = null,
  manifest = null,
} = {}) {
  const topFocus = [
    ...pickTopIssues(launchResult?.issues || [], 3),
    ...pickTopIssues(buildResult?.issues || [], 2),
    ...pickTopIssues(testResult?.issues || [], 2),
    ...pickTopIssues(scanResult?.issues || [], 3),
  ].slice(0, 5)

  const topIssueIds = manifest?.topIssues || []
  const codeIssues = pickTopIssues(scanResult?.issues || [], 5)
  const launchIssues = pickTopIssues(launchResult?.issues || [], 5)

  const sections = [
    '# Arcana Insight AI Ops Brief',
    '',
    `Generated: ${generatedAt}`,
    '',
    '## Overview',
    `- Code Scan: ${summarizeCheck(scanResult)}`,
    `- Launch Readiness: ${summarizeCheck(launchResult)}`,
    `- Test Status: ${summarizeCheck(testResult)}`,
    `- Build Status: ${summarizeCheck(buildResult)}`,
    '',
    '## Today\'s Focus',
    ...(topFocus.length > 0 ? topFocus.map(formatIssue) : ['- No active issues detected.']),
    '',
    '## Build',
    ...buildBuildLines(buildResult),
    '',
    '## Tests',
    buildTestsLine(testResult),
    ...(testResult?.meta?.failingTests?.length
      ? testResult.meta.failingTests.map((name) => `- Failing test: ${name}`)
      : ['- Failing tests: none']),
    '',
    '## Launch Readiness',
    ...(launchIssues.length > 0 ? launchIssues.map(formatIssue) : ['- No launch-readiness issues detected.']),
    '',
    '## Code Scan',
    ...(codeIssues.length > 0 ? codeIssues.map(formatIssue) : ['- No code-scan issues detected.']),
    '',
    '## Manifest Top Issues',
    ...(topIssueIds.length > 0 ? topIssueIds.map((id) => `- ${id}`) : ['- No manifest issues recorded.']),
    '',
  ]

  return sections.join('\n')
}

async function readAvailableResult(filename, rootDir) {
  try {
    return await readLatestJson(filename, rootDir)
  } catch {
    return null
  }
}

export async function readLatestAiOpsResults(rootDir = process.cwd()) {
  const [scanResult, launchResult, testResult, buildResult, manifest] = await Promise.all([
    readAvailableResult(OUTPUT_FILENAMES[CHECK_NAMES.CODE_SCAN], rootDir),
    readAvailableResult(OUTPUT_FILENAMES[CHECK_NAMES.LAUNCH_READINESS], rootDir),
    readAvailableResult(OUTPUT_FILENAMES[CHECK_NAMES.TEST_STATUS], rootDir),
    readAvailableResult(OUTPUT_FILENAMES[CHECK_NAMES.BUILD_STATUS], rootDir),
    readAvailableResult(OUTPUT_FILENAMES.manifest, rootDir),
  ])

  return {
    scanResult,
    launchResult,
    testResult,
    buildResult,
    manifest,
  }
}

export async function writeBriefingArtifacts(markdown, rootDir = process.cwd(), runId = toHistoryRunId(getTimestamp())) {
  await writeLatestText(OUTPUT_FILENAMES.briefing, markdown, rootDir)
  await writeHistoryText(runId, OUTPUT_FILENAMES.briefing, markdown, rootDir)
  return {
    runId,
  }
}

export async function generateBriefing(rootDir = process.cwd()) {
  const payload = await readLatestAiOpsResults(rootDir)
  const markdown = buildBriefingMarkdown({
    generatedAt: getTimestamp(),
    ...payload,
  })
  const artifactInfo = await writeBriefingArtifacts(markdown, rootDir)
  return {
    markdown,
    ...artifactInfo,
  }
}

async function main() {
  const { markdown } = await generateBriefing(process.cwd())
  process.stdout.write(markdown)
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main()
}


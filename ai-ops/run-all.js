import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { buildManifest } from './core/manifest.js'
import { getTimestamp, toHistoryRunId } from './core/clock.js'
import { CHECK_NAMES, OUTPUT_FILENAMES } from './core/constants.js'
import { writeHistoryJson, writeHistoryText, writeLatestJson, writeLatestText } from './core/writeOutput.js'
import { execute as executeCodeScan } from './checks/code-scan.js'
import { execute as executeLaunchReadiness } from './checks/launch-readiness.js'
import { execute as executeTestStatus } from './checks/test-status.js'
import { execute as executeBuildStatus } from './checks/build-status.js'
import { buildBriefingMarkdown } from './briefing/buildBriefingInput.js'

export async function runAll(rootDir = process.cwd()) {
  const runId = toHistoryRunId(getTimestamp())

  const scanResult = await executeCodeScan(rootDir)
  const launchResult = await executeLaunchReadiness(rootDir)
  const testResult = await executeTestStatus(rootDir)
  const buildResult = await executeBuildStatus(rootDir)

  const results = {
    [CHECK_NAMES.CODE_SCAN]: scanResult,
    [CHECK_NAMES.LAUNCH_READINESS]: launchResult,
    [CHECK_NAMES.TEST_STATUS]: testResult,
    [CHECK_NAMES.BUILD_STATUS]: buildResult,
  }

  for (const [checkName, result] of Object.entries(results)) {
    const filename = OUTPUT_FILENAMES[checkName]
    await writeLatestJson(filename, result, rootDir)
    await writeHistoryJson(runId, filename, result, rootDir)
  }

  const manifest = buildManifest(Object.values(results))
  await writeLatestJson(OUTPUT_FILENAMES.manifest, manifest, rootDir)
  await writeHistoryJson(runId, OUTPUT_FILENAMES.manifest, manifest, rootDir)

  const briefing = buildBriefingMarkdown({
    generatedAt: getTimestamp(),
    scanResult,
    launchResult,
    testResult,
    buildResult,
    manifest,
  })
  await writeLatestText(OUTPUT_FILENAMES.briefing, briefing, rootDir)
  await writeHistoryText(runId, OUTPUT_FILENAMES.briefing, briefing, rootDir)

  return {
    runId,
    manifest,
    briefing,
    results,
  }
}

async function main() {
  const result = await runAll(process.cwd())
  process.stdout.write(
    `${JSON.stringify({
      runId: result.runId,
      checks: Object.fromEntries(
        Object.entries(result.results).map(([name, value]) => [name, value.summary]),
      ),
    })}\n`,
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main()
}


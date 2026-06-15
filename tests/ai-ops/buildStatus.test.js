import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { importModule } from '../utils/testEnv.js'

async function writeFile(rootDir, relativePath, content) {
  const absolutePath = path.resolve(rootDir, relativePath)
  await fs.mkdir(path.dirname(absolutePath), { recursive: true })
  await fs.writeFile(absolutePath, content, 'utf8')
}

test('build-status returns failed structured result when a command fails', async () => {
  const sandboxRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'arcana-build-status-fail-'))

  try {
    const successPath = path.resolve(sandboxRoot, 'success-build.mjs')
    const failPath = path.resolve(sandboxRoot, 'fail-build.mjs')

    await writeFile(sandboxRoot, 'success-build.mjs', 'process.stdout.write("build ok\\n"); process.exit(0)\n')
    await writeFile(
      sandboxRoot,
      'fail-build.mjs',
      'process.stderr.write("build exploded\\n"); process.exit(2)\n',
    )

    const { execute } = await importModule('ai-ops/checks/build-status.js')
    const result = await execute(sandboxRoot, {
      commands: [
        [process.execPath, successPath],
        [process.execPath, failPath],
      ],
    })

    assert.equal(result.check, 'build-status')
    assert.equal(result.status, 'failed')
    assert.equal(result.summary.totalIssues, 1)
    assert.equal(result.summary.blockers, 1)
    assert.equal(result.meta.commands.length, 2)
    assert.equal(result.meta.commands[0].exitCode, 0)
    assert.equal(result.meta.commands[1].exitCode, 2)
    assert.match(result.meta.commands[1].outputExcerpt, /build exploded/)
    assert.ok(result.issues[0].id.startsWith('build-command-failed:'))
  } finally {
    await fs.rm(sandboxRoot, { recursive: true, force: true })
  }
})

test('build-status writes build.json and manifest with existing scan/launch/test context', async () => {
  const sandboxRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'arcana-build-status-output-'))

  try {
    const successPath = path.resolve(sandboxRoot, 'build-ok.mjs')
    await writeFile(sandboxRoot, 'build-ok.mjs', 'process.stdout.write("build ok\\n"); process.exit(0)\n')

    const { writeLatestJson } = await importModule('ai-ops/core/writeOutput.js')
    await writeLatestJson(
      'scan.json',
      {
        check: 'code-scan',
        status: 'warning',
        summary: { totalIssues: 1, blockers: 0, warnings: 1, infos: 0 },
        issues: [],
      },
      sandboxRoot,
    )
    await writeLatestJson(
      'launch.json',
      {
        check: 'launch-readiness',
        status: 'warning',
        summary: { totalIssues: 1, blockers: 1, warnings: 0, infos: 0 },
        issues: [],
      },
      sandboxRoot,
    )
    await writeLatestJson(
      'tests.json',
      {
        check: 'test-status',
        status: 'ok',
        summary: { totalIssues: 0, blockers: 0, warnings: 0, infos: 0 },
        issues: [],
      },
      sandboxRoot,
    )

    const { execute, writeBuildArtifacts } = await importModule('ai-ops/checks/build-status.js')
    const { readLatestJson } = await importModule('ai-ops/core/readOutput.js')

    const result = await execute(sandboxRoot, {
      commands: [[process.execPath, successPath]],
    })
    const artifactInfo = await writeBuildArtifacts(result, sandboxRoot)

    const latestBuild = await readLatestJson('build.json', sandboxRoot)
    const latestManifest = await readLatestJson('manifest.json', sandboxRoot)

    assert.equal(latestBuild.check, 'build-status')
    assert.equal(latestBuild.status, 'ok')
    assert.ok(latestManifest.checks['build-status'])
    assert.ok(latestManifest.checks['code-scan'])
    assert.ok(latestManifest.checks['launch-readiness'])
    assert.ok(latestManifest.checks['test-status'])
    assert.equal(typeof artifactInfo.runId, 'string')
  } finally {
    await fs.rm(sandboxRoot, { recursive: true, force: true })
  }
})


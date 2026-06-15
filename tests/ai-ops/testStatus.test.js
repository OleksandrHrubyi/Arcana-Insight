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

test('parseTapOutput extracts counts and failing test names', async () => {
  const { parseTapOutput } = await importModule('ai-ops/checks/test-status.js')

  const parsed = parseTapOutput(`
TAP version 13
# Subtest: passing test
ok 1 - passing test
# Subtest: failing test
not ok 2 - failing test
1..2
# tests 2
# pass 1
# fail 1
# cancelled 0
# skipped 0
# todo 0
`)

  assert.deepEqual(parsed.counts, {
    tests: 2,
    pass: 1,
    fail: 1,
    cancelled: 0,
    skipped: 0,
    todo: 0,
  })
  assert.deepEqual(parsed.failingTests, ['failing test'])
})

test('test-status executes command and returns failed structured result for failing tests', async () => {
  const sandboxRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'arcana-test-status-fail-'))

  try {
    const fixturePath = path.resolve(sandboxRoot, 'failing-tests.mjs')
    await writeFile(
      sandboxRoot,
      'failing-tests.mjs',
      `
process.stdout.write(\`TAP version 13
# Subtest: alpha
ok 1 - alpha
# Subtest: beta
not ok 2 - beta
1..2
# tests 2
# pass 1
# fail 1
# cancelled 0
# skipped 0
# todo 0
\`)
process.exit(1)
`,
    )

    const { execute } = await importModule('ai-ops/checks/test-status.js')
    const result = await execute(sandboxRoot, {
      command: [process.execPath, fixturePath],
    })

    assert.equal(result.check, 'test-status')
    assert.equal(result.status, 'failed')
    assert.equal(result.summary.totalIssues, 1)
    assert.equal(result.summary.blockers, 1)
    assert.equal(result.meta.exitCode, 1)
    assert.equal(result.meta.counts.tests, 2)
    assert.equal(result.meta.counts.fail, 1)
    assert.deepEqual(result.meta.failingTests, ['beta'])
    assert.ok(result.meta.command.includes(fixturePath))
    assert.ok(result.issues[0].id.startsWith('failing-test:1:beta'))
  } finally {
    await fs.rm(sandboxRoot, { recursive: true, force: true })
  }
})

test('test-status writes tests.json and manifest with existing scan/launch context', async () => {
  const sandboxRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'arcana-test-status-output-'))

  try {
    const fixturePath = path.resolve(sandboxRoot, 'passing-tests.mjs')
    await writeFile(
      sandboxRoot,
      'passing-tests.mjs',
      `
process.stdout.write(\`TAP version 13
# Subtest: alpha
ok 1 - alpha
1..1
# tests 1
# pass 1
# fail 0
# cancelled 0
# skipped 0
# todo 0
\`)
process.exit(0)
`,
    )

    const { writeLatestJson } = await importModule('ai-ops/core/writeOutput.js')
    await writeLatestJson(
      'scan.json',
      {
        check: 'code-scan',
        status: 'warning',
        summary: { totalIssues: 1, blockers: 0, warnings: 1, infos: 0 },
        issues: [
          {
            id: 'todo-left',
            source: 'code-scan',
            severity: 'warning',
            category: 'code-quality',
            title: 'TODO marker found',
            details: 'TODO left in source',
            file: 'src/App.vue',
            line: 1,
            ruleId: 'todo-marker',
            suggestedAction: '',
            meta: {},
          },
        ],
      },
      sandboxRoot,
    )
    await writeLatestJson(
      'launch.json',
      {
        check: 'launch-readiness',
        status: 'warning',
        summary: { totalIssues: 1, blockers: 1, warnings: 0, infos: 0 },
        issues: [
          {
            id: 'missing-reviewer-notes',
            source: 'launch-readiness',
            severity: 'blocker',
            category: 'release',
            title: 'Reviewer notes missing',
            details: 'Missing file',
            file: 'app-store/reviewer-notes.md',
            line: null,
            ruleId: 'required-app-store-file',
            suggestedAction: '',
            meta: {},
          },
        ],
      },
      sandboxRoot,
    )

    const { execute, writeTestArtifacts } = await importModule('ai-ops/checks/test-status.js')
    const { readLatestJson } = await importModule('ai-ops/core/readOutput.js')

    const result = await execute(sandboxRoot, {
      command: [process.execPath, fixturePath],
    })
    const artifactInfo = await writeTestArtifacts(result, sandboxRoot)

    const latestTests = await readLatestJson('tests.json', sandboxRoot)
    const latestManifest = await readLatestJson('manifest.json', sandboxRoot)

    assert.equal(latestTests.check, 'test-status')
    assert.equal(latestTests.status, 'ok')
    assert.ok(latestManifest.checks['test-status'])
    assert.ok(latestManifest.checks['code-scan'])
    assert.ok(latestManifest.checks['launch-readiness'])
    assert.equal(typeof artifactInfo.runId, 'string')
  } finally {
    await fs.rm(sandboxRoot, { recursive: true, force: true })
  }
})


import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { importModule } from '../utils/testEnv.js'

test('buildBriefingMarkdown summarizes core ai-ops results into readable markdown', async () => {
  const { buildBriefingMarkdown } = await importModule('ai-ops/briefing/buildBriefingInput.js')

  const markdown = buildBriefingMarkdown({
    generatedAt: '2026-04-29T00:00:00.000Z',
    scanResult: {
      status: 'warning',
      summary: { totalIssues: 2, blockers: 0, warnings: 2, infos: 0 },
      issues: [
        {
          severity: 'warning',
          title: 'TODO marker found',
          details: 'Resolve TODO in src/App.vue',
          file: 'src/App.vue',
          line: 10,
        },
      ],
    },
    launchResult: {
      status: 'warning',
      summary: { totalIssues: 1, blockers: 1, warnings: 0, infos: 0 },
      issues: [
        {
          severity: 'blocker',
          title: 'P0 launch checklist item is not done',
          details: 'Sandbox billing flow is still pending.',
          file: 'docs/release-reviewer/references/launch-checklist.md',
          line: 46,
        },
      ],
    },
    testResult: {
      status: 'ok',
      summary: { totalIssues: 0, blockers: 0, warnings: 0, infos: 0 },
      meta: {
        counts: { tests: 179, pass: 179, fail: 0, skipped: 0 },
        failingTests: [],
      },
    },
    buildResult: {
      status: 'ok',
      summary: { totalIssues: 0, blockers: 0, warnings: 0, infos: 0 },
      meta: {
        commands: [{ command: 'npm run build', exitCode: 0, outputExcerpt: '' }],
      },
      issues: [],
    },
    manifest: {
      topIssues: ['launch-checklist:p0:sandbox-flow', 'todo-marker:src/App.vue:10'],
    },
  })

  assert.match(markdown, /# Arcana Insight AI Ops Brief/)
  assert.match(markdown, /Code Scan: warning/)
  assert.match(markdown, /Launch Readiness: warning/)
  assert.match(markdown, /Test Status: ok/)
  assert.match(markdown, /Build Status: ok/)
  assert.match(markdown, /Sandbox billing flow is still pending/)
  assert.match(markdown, /TODO marker found/)
  assert.match(markdown, /tests: 179, pass: 179, fail: 0/)
  assert.match(markdown, /launch-checklist:p0:sandbox-flow/)
})

test('generateBriefing reads latest outputs and writes briefing.md', async () => {
  const sandboxRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'arcana-briefing-'))

  try {
    const { writeLatestJson } = await importModule('ai-ops/core/writeOutput.js')
    const { generateBriefing } = await importModule('ai-ops/briefing/buildBriefingInput.js')

    await writeLatestJson(
      'scan.json',
      {
        check: 'code-scan',
        status: 'warning',
        summary: { totalIssues: 1, blockers: 0, warnings: 1, infos: 0 },
        issues: [{ severity: 'warning', title: 'TODO', details: 'Fix TODO', file: 'src/App.vue', line: 1 }],
      },
      sandboxRoot,
    )
    await writeLatestJson(
      'launch.json',
      {
        check: 'launch-readiness',
        status: 'warning',
        summary: { totalIssues: 1, blockers: 1, warnings: 0, infos: 0 },
        issues: [{ severity: 'blocker', title: 'P0 pending', details: 'Finish sandbox flow', file: 'docs/checklist.md', line: 1 }],
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
        meta: { counts: { tests: 10, pass: 10, fail: 0, skipped: 0 }, failingTests: [] },
      },
      sandboxRoot,
    )
    await writeLatestJson(
      'build.json',
      {
        check: 'build-status',
        status: 'ok',
        summary: { totalIssues: 0, blockers: 0, warnings: 0, infos: 0 },
        issues: [],
        meta: { commands: [{ command: 'npm run build', exitCode: 0, outputExcerpt: '' }] },
      },
      sandboxRoot,
    )
    await writeLatestJson(
      'manifest.json',
      {
        generatedAt: '2026-04-29T00:00:00.000Z',
        checks: {},
        topIssues: ['p0', 'todo'],
      },
      sandboxRoot,
    )

    const { markdown, runId } = await generateBriefing(sandboxRoot)
    const briefingPath = path.resolve(sandboxRoot, 'ai-ops/output/latest/briefing.md')
    const stored = await fs.readFile(briefingPath, 'utf8')

    assert.equal(typeof runId, 'string')
    assert.equal(markdown, stored)
    assert.match(markdown, /Today's Focus/)
    assert.match(markdown, /Finish sandbox flow/)
  } finally {
    await fs.rm(sandboxRoot, { recursive: true, force: true })
  }
})


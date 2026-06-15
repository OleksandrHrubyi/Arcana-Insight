import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { importModule } from '../utils/testEnv.js'

test('latest output helpers write and read json/text artifacts', async () => {
  const sandboxRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'arcana-ai-ops-'))

  try {
    const { writeLatestJson, writeLatestText } = await importModule('ai-ops/core/writeOutput.js')
    const { readLatestJson, readLatestText } = await importModule('ai-ops/core/readOutput.js')

    await writeLatestJson(
      'scan.json',
      {
        check: 'code-scan',
        status: 'ok',
      },
      sandboxRoot,
    )

    await writeLatestText('briefing.md', '# Briefing', sandboxRoot)

    const json = await readLatestJson('scan.json', sandboxRoot)
    const text = await readLatestText('briefing.md', sandboxRoot)

    assert.deepEqual(json, {
      check: 'code-scan',
      status: 'ok',
    })
    assert.equal(text, '# Briefing\n')
  } finally {
    await fs.rm(sandboxRoot, { recursive: true, force: true })
  }
})

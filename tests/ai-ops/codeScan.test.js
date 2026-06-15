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

test('code scan detects duplicate files, todo markers, i18n drift, hidden blocks and route placeholders', async () => {
  const sandboxRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'arcana-code-scan-'))

  try {
    await writeFile(
      sandboxRoot,
      'src/router/routes.js',
      `
const routes = [
  {
    path: '/',
    children: [
      { path: 'menu', component: () => import('src/pages/MenuPage.vue') },
      { path: 'compatibility', component: () => import('src/pages/CompatibilityPage.vue') },
    ],
  },
]

export default routes
`,
    )

    await writeFile(
      sandboxRoot,
      'src/pages/MenuPage.vue',
      `
<template>
  <section>Coming soon</section>
</template>
`,
    )

    await writeFile(
      sandboxRoot,
      'src/pages/CompatibilityPage.vue',
      `
<template>
  <section v-if="false" style="display: none">
    <input placeholder="Choose your sign" />
  </section>
</template>
`,
    )

    await writeFile(
      sandboxRoot,
      'src/pages/CompatibilityPage 2.vue',
      `
<template>
  <section>duplicate</section>
</template>
`,
    )

    await writeFile(
      sandboxRoot,
      'src/components/main/MenuComponent.vue',
      `
<template>
  <div>
    <!-- TODO: wire production data -->
  </div>
</template>
`,
    )

    await writeFile(
      sandboxRoot,
      'src/i18n/en.json',
      JSON.stringify(
        {
          home: {
            title: 'Home',
            subtitle: 'Today',
          },
        },
        null,
        2,
      ),
    )

    await writeFile(
      sandboxRoot,
      'src/i18n/uk.json',
      JSON.stringify(
        {
          home: {
            title: 'Головна',
          },
          extra: {
            orphan: 'Зайвий ключ',
          },
        },
        null,
        2,
      ),
    )

    const { execute } = await importModule('ai-ops/checks/code-scan.js')
    const result = await execute(sandboxRoot)
    const issueIds = result.issues.map((issue) => issue.id)

    assert.equal(result.check, 'code-scan')
    assert.equal(result.status, 'warning')
    assert.ok(issueIds.some((id) => id.startsWith('todo-marker:src/components/main/MenuComponent.vue:')))
    assert.ok(issueIds.includes('suspect-duplicate-file:src/pages/CompatibilityPage 2.vue'))
    assert.ok(issueIds.includes('i18n-missing-uk:home.subtitle'))
    assert.ok(issueIds.includes('i18n-missing-en:extra.orphan'))
    assert.ok(issueIds.some((id) => id.startsWith('display-none-inline:src/pages/CompatibilityPage.vue:')))
    assert.ok(issueIds.some((id) => id.startsWith('v-if-false:src/pages/CompatibilityPage.vue:')))
    assert.ok(issueIds.some((id) => id.startsWith('coming-soon-placeholder:src/pages/MenuPage.vue:')))
    assert.equal(issueIds.some((id) => id.includes('placeholder-copy')), false)
    assert.equal(issueIds.some((id) => id.includes('not-implemented-placeholder')), false)
    assert.ok(result.summary.totalIssues >= 6)
    assert.equal(result.meta.rootDir, sandboxRoot)
  } finally {
    await fs.rm(sandboxRoot, { recursive: true, force: true })
  }
})

test('code scan ignores TODO-like strings outside product code comments and outside scan scope', async () => {
  const sandboxRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'arcana-code-scan-noise-'))

  try {
    await writeFile(
      sandboxRoot,
      'src/router/routes.js',
      `
const routes = [
  {
    path: '/',
    children: [{ path: 'account', component: () => import('src/pages/AccountPage.vue') }],
  },
]

export default routes
`,
    )

    await writeFile(
      sandboxRoot,
      'src/pages/AccountPage.vue',
      `
<template>
  <section>
    <q-input placeholder="Account email" />
  </section>
</template>

<script setup>
const mapPluginError = (text) => text.includes('not implemented')
// TODO: wire account analytics
</script>
`,
    )

    await writeFile(
      sandboxRoot,
      'tests/noisy.test.js',
      `
throw new Error('Plugin not implemented')
// TODO: fixture only
`,
    )

    await writeFile(
      sandboxRoot,
      '.claude/notes.md',
      `
- TODO tracked in docs only
- not implemented is part of a planning note
`,
    )

    await writeFile(sandboxRoot, 'src/i18n/en.json', '{}\n')
    await writeFile(sandboxRoot, 'src/i18n/uk.json', '{}\n')

    const { execute } = await importModule('ai-ops/checks/code-scan.js')
    const result = await execute(sandboxRoot)
    const issueIds = result.issues.map((issue) => issue.id)

    assert.ok(issueIds.some((id) => id.startsWith('todo-marker:src/pages/AccountPage.vue:')))
    assert.equal(issueIds.some((id) => id.startsWith('todo-marker:tests/noisy.test.js:')), false)
    assert.equal(issueIds.some((id) => id.startsWith('not-implemented-marker:tests/noisy.test.js:')), false)
    assert.equal(issueIds.some((id) => id.startsWith('todo-marker:.claude/notes.md:')), false)
    assert.equal(issueIds.some((id) => id.includes('placeholder-copy')), false)
    assert.equal(issueIds.some((id) => id.includes('not-implemented-marker:src/pages/AccountPage.vue:')), false)
  } finally {
    await fs.rm(sandboxRoot, { recursive: true, force: true })
  }
})

test('code scan writes latest and history artifacts with manifest', async () => {
  const sandboxRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'arcana-code-scan-output-'))

  try {
    await writeFile(sandboxRoot, 'src/router/routes.js', 'export default []\n')
    await writeFile(sandboxRoot, 'src/i18n/en.json', '{}\n')
    await writeFile(sandboxRoot, 'src/i18n/uk.json', '{}\n')

    const { execute, writeScanArtifacts } = await importModule('ai-ops/checks/code-scan.js')
    const { readLatestJson } = await importModule('ai-ops/core/readOutput.js')

    const result = await execute(sandboxRoot)
    const artifactInfo = await writeScanArtifacts(result, sandboxRoot)

    const latestScan = await readLatestJson('scan.json', sandboxRoot)
    const latestManifest = await readLatestJson('manifest.json', sandboxRoot)
    const historyScanPath = path.resolve(
      sandboxRoot,
      'ai-ops/output/history',
      artifactInfo.runId,
      'scan.json',
    )

    assert.equal(latestScan.check, 'code-scan')
    assert.equal(latestManifest.checks['code-scan'].path, 'scan.json')
    assert.equal(typeof artifactInfo.runId, 'string')
    await fs.access(historyScanPath)
  } finally {
    await fs.rm(sandboxRoot, { recursive: true, force: true })
  }
})

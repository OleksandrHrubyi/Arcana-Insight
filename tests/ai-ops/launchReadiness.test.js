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

test('launch readiness detects missing route page, invalid store URL, checklist blockers and stray ios configs', async () => {
  const sandboxRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'arcana-launch-readiness-'))

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
      { path: 'premium', component: () => import('src/pages/PremiumPage.vue') },
      { path: 'missing', component: () => import('src/pages/MissingPage.vue') },
    ],
  },
]

export default routes
`,
    )
    await writeFile(sandboxRoot, 'src/pages/MenuPage.vue', '<template><section>menu</section></template>\n')
    await writeFile(sandboxRoot, 'src/pages/PremiumPage.vue', '<template><section>premium</section></template>\n')

    await writeFile(
      sandboxRoot,
      'app-store/metadata.md',
      `
| Field | Value |
|-------|-------|
| Privacy Policy URL | \`http://localhost/privacy\` |
| Support URL | \`https://example.com/support\` |
`,
    )
    await writeFile(sandboxRoot, 'app-store/index.html', '<html></html>\n')
    await writeFile(sandboxRoot, 'app-store/privacy-policy.html', '<html></html>\n')
    await writeFile(sandboxRoot, 'app-store/support.html', '<html></html>\n')

    await writeFile(
      sandboxRoot,
      'docs/release-reviewer/references/launch-checklist.md',
      `
## P0 Blockers

- \`in progress\` Run real iOS sandbox flow for purchase, restore, cancel, and entitlement refresh.

## P1 Revenue-Critical

- \`open\` Reduce signup friction before value delivery.
`,
    )

    await writeFile(sandboxRoot, 'ios/App/App/config 3.xml', '<config />\n')

    const { execute } = await importModule('ai-ops/checks/launch-readiness.js')
    const result = await execute(sandboxRoot)
    const issueIds = result.issues.map((issue) => issue.id)

    assert.equal(result.check, 'launch-readiness')
    assert.equal(result.status, 'warning')
    assert.ok(issueIds.includes('missing-app-store-file:app-store/reviewer-notes.md'))
    assert.ok(issueIds.includes('invalid-metadata-url:privacy-policy-url'))
    assert.ok(issueIds.includes('invalid-metadata-url:support-url'))
    assert.ok(issueIds.includes('missing-route-page:src/pages/MissingPage.vue'))
    assert.ok(
      issueIds.includes(
        'launch-checklist:p0:run-real-ios-sandbox-flow-for-purchase-restore-cancel-and-entitlement-refresh',
      ),
    )
    assert.ok(issueIds.includes('launch-checklist:p1:reduce-signup-friction-before-value-delivery'))
    assert.ok(issueIds.includes('suspect-generated-ios-config:config 3.xml'))
    assert.ok(result.summary.blockers >= 4)
    assert.ok(result.summary.warnings >= 1)
  } finally {
    await fs.rm(sandboxRoot, { recursive: true, force: true })
  }
})

test('launch readiness clears sandbox billing blocker when report file records all required passes', async () => {
  const sandboxRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'arcana-launch-readiness-billing-pass-'))

  try {
    await writeFile(sandboxRoot, 'src/router/routes.js', 'export default []\n')
    await writeFile(
      sandboxRoot,
      'app-store/metadata.md',
      `
| Field | Value |
|-------|-------|
| Privacy Policy URL | \`https://example.org/privacy\` |
| Support URL | \`https://example.org/support\` |
`,
    )
    await writeFile(sandboxRoot, 'app-store/index.html', '<html></html>\n')
    await writeFile(sandboxRoot, 'app-store/privacy-policy.html', '<html></html>\n')
    await writeFile(sandboxRoot, 'app-store/support.html', '<html></html>\n')
    await writeFile(sandboxRoot, 'app-store/reviewer-notes.md', 'notes\n')
    await writeFile(
      sandboxRoot,
      'docs/release-reviewer/references/launch-checklist.md',
      `
## P0 Blockers

- \`in progress\` Run real iOS sandbox flow for purchase, restore, cancel, and entitlement refresh.
`,
    )
    await writeFile(
      sandboxRoot,
      'docs/release-reviewer/references/ios-sandbox-billing-report.md',
      `
Catalog loads: pass
Cancelled purchase: pass
Successful monthly purchase: pass
Restore purchase: pass
Entitlement survives restart: pass
Negative restore: pass
Expiration/cancel sanity check: not run
`,
    )

    const { execute } = await importModule('ai-ops/checks/launch-readiness.js')
    const result = await execute(sandboxRoot)
    const issueIds = result.issues.map((issue) => issue.id)

    assert.ok(
      !issueIds.includes(
        'launch-checklist:p0:run-real-ios-sandbox-flow-for-purchase-restore-cancel-and-entitlement-refresh',
      ),
    )
  } finally {
    await fs.rm(sandboxRoot, { recursive: true, force: true })
  }
})

test('launch readiness writes launch.json and manifest with existing scan context', async () => {
  const sandboxRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'arcana-launch-readiness-output-'))

  try {
    await writeFile(sandboxRoot, 'src/router/routes.js', 'export default []\n')
    await writeFile(
      sandboxRoot,
      'app-store/metadata.md',
      `
| Field | Value |
|-------|-------|
| Privacy Policy URL | \`https://example.org/privacy\` |
| Support URL | \`https://example.org/support\` |
`,
    )
    await writeFile(sandboxRoot, 'app-store/index.html', '<html></html>\n')
    await writeFile(sandboxRoot, 'app-store/privacy-policy.html', '<html></html>\n')
    await writeFile(sandboxRoot, 'app-store/support.html', '<html></html>\n')
    await writeFile(sandboxRoot, 'app-store/reviewer-notes.md', 'notes\n')
    await writeFile(sandboxRoot, 'docs/release-reviewer/references/launch-checklist.md', '## P0 Blockers\n')

    const { writeLatestJson } = await importModule('ai-ops/core/writeOutput.js')
    await writeLatestJson(
      'scan.json',
      {
        check: 'code-scan',
        status: 'warning',
        summary: { totalIssues: 1, blockers: 0, warnings: 1, infos: 0 },
        issues: [
          {
            id: 'todo-marker:src/App.vue:1',
            source: 'code-scan',
            severity: 'warning',
            category: 'code-quality',
            title: 'TODO marker found',
            details: 'TODO left in app shell',
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

    const { execute, writeLaunchArtifacts } = await importModule('ai-ops/checks/launch-readiness.js')
    const { readLatestJson } = await importModule('ai-ops/core/readOutput.js')

    const result = await execute(sandboxRoot)
    const artifactInfo = await writeLaunchArtifacts(result, sandboxRoot)

    const latestLaunch = await readLatestJson('launch.json', sandboxRoot)
    const latestManifest = await readLatestJson('manifest.json', sandboxRoot)

    assert.equal(latestLaunch.check, 'launch-readiness')
    assert.ok(latestManifest.checks['launch-readiness'])
    assert.ok(latestManifest.checks['code-scan'])
    assert.equal(typeof artifactInfo.runId, 'string')
  } finally {
    await fs.rm(sandboxRoot, { recursive: true, force: true })
  }
})

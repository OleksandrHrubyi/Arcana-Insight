import { buildDashboardModel } from './viewModel.js'

const OUTPUT_BASE = '/ai-ops/output/latest'
const CHECK_FILES = {
  manifest: `${OUTPUT_BASE}/manifest.json`,
  scanResult: `${OUTPUT_BASE}/scan.json`,
  launchResult: `${OUTPUT_BASE}/launch.json`,
  testResult: `${OUTPUT_BASE}/tests.json`,
  buildResult: `${OUTPUT_BASE}/build.json`,
  briefing: `${OUTPUT_BASE}/briefing.md`,
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatDate(value) {
  if (!value) return 'Not available'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatDuration(durationMs) {
  if (typeof durationMs !== 'number') return 'n/a'
  if (durationMs < 1000) return `${durationMs} ms`
  return `${(durationMs / 1000).toFixed(1)} s`
}

function getStatusClass(status) {
  if (status === 'failed') return 'is-failed'
  if (status === 'warning') return 'is-warning'
  if (status === 'ok') return 'is-ok'
  return 'is-muted'
}

async function readJson(url) {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`)
  }
  return response.json()
}

async function readText(url) {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`)
  }
  return response.text()
}

function renderCheckCard(check) {
  return `
    <article class="check-card">
      <div class="check-card__header">
        <h3>${escapeHtml(check.label)}</h3>
        <span class="status-pill ${getStatusClass(check.status)}">${escapeHtml(check.status)}</span>
      </div>
      <dl class="check-card__stats">
        <div><dt>Blockers</dt><dd>${check.blockers}</dd></div>
        <div><dt>Warnings</dt><dd>${check.warnings}</dd></div>
        <div><dt>Info</dt><dd>${check.infos}</dd></div>
        <div><dt>Total</dt><dd>${check.totalIssues}</dd></div>
      </dl>
      <p class="check-card__meta">Duration: ${escapeHtml(formatDuration(check.durationMs))}</p>
    </article>
  `
}

function renderIssue(issue) {
  const location = issue.file
    ? `<span class="issue__location">${escapeHtml(issue.file)}${issue.line ? `:${issue.line}` : ''}</span>`
    : ''

  return `
    <li class="issue">
      <div class="issue__header">
        <span class="status-pill ${getStatusClass(issue.severity === 'blocker' ? 'failed' : issue.severity)}">${escapeHtml(issue.severity)}</span>
        <strong>${escapeHtml(issue.title)}</strong>
      </div>
      <p>${escapeHtml(issue.details)}</p>
      <div class="issue__meta">
        ${location}
        <span>${escapeHtml(issue.ruleId)}</span>
      </div>
    </li>
  `
}

function renderSection(section) {
  const summary = section.summary || {}
  const issues = section.issues || []

  return `
    <section class="panel">
      <div class="panel__header">
        <div>
          <h2>${escapeHtml(section.label)}</h2>
          <p>Updated ${escapeHtml(formatDate(section.updatedAt))}</p>
        </div>
        <span class="status-pill ${getStatusClass(section.status)}">${escapeHtml(section.status)}</span>
      </div>
      <div class="panel__summary">
        <span>Blockers: <strong>${summary.blockers || 0}</strong></span>
        <span>Warnings: <strong>${summary.warnings || 0}</strong></span>
        <span>Info: <strong>${summary.infos || 0}</strong></span>
        <span>Total: <strong>${summary.totalIssues || 0}</strong></span>
      </div>
      ${
        issues.length
          ? `<ul class="issue-list">${issues.map(renderIssue).join('')}</ul>`
          : '<p class="panel__empty">No issues reported.</p>'
      }
    </section>
  `
}

function renderTopIssues(issues) {
  if (!issues.length) {
    return '<p class="panel__empty">No top issues recorded.</p>'
  }

  return `<ul class="issue-list">${issues.map(renderIssue).join('')}</ul>`
}

function render(model) {
  document.getElementById('generated-at').textContent = formatDate(model.generatedAt)
  document.getElementById('summary-total').textContent = String(model.totals.totalIssues)
  document.getElementById('summary-blockers').textContent = String(model.totals.blockers)
  document.getElementById('summary-warnings').textContent = String(model.totals.warnings)
  document.getElementById('summary-checks').textContent = String(model.checks.length)
  document.getElementById('summary-failed').textContent = String(model.totals.failedChecks)

  document.getElementById('checks-grid').innerHTML = model.checks.map(renderCheckCard).join('')
  document.getElementById('top-issues').innerHTML = renderTopIssues(model.topIssues)
  document.getElementById('briefing').textContent = model.briefing.trim() || 'No briefing generated yet.'
  document.getElementById('sections').innerHTML = model.sections.map(renderSection).join('')
}

function renderError(message) {
  document.getElementById('error-banner').hidden = false
  document.getElementById('error-banner').textContent = message
}

async function loadDashboard() {
  try {
    const [manifest, scanResult, launchResult, testResult, buildResult, briefing] = await Promise.all([
      readJson(CHECK_FILES.manifest),
      readJson(CHECK_FILES.scanResult),
      readJson(CHECK_FILES.launchResult),
      readJson(CHECK_FILES.testResult),
      readJson(CHECK_FILES.buildResult),
      readText(CHECK_FILES.briefing),
    ])

    render(
      buildDashboardModel({
        manifest,
        scanResult,
        launchResult,
        testResult,
        buildResult,
        briefing,
      }),
    )
  } catch (error) {
    renderError(error instanceof Error ? error.message : String(error))
  }
}

document.getElementById('refresh-button').addEventListener('click', () => {
  window.location.reload()
})

await loadDashboard()


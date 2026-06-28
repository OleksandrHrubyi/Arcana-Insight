// @ts-nocheck
// Fire-and-forget error alerting to a Telegram group. Intentionally minimal:
//   - No-op unless BOTH TELEGRAM_ALERT_BOT_TOKEN and TELEGRAM_ALERT_CHAT_ID are
//     set, so it is safe to ship before the secrets are configured.
//   - NEVER throws and NEVER blocks the caller's response (delivery runs in the
//     background via EdgeRuntime.waitUntil so the isolate isn't torn down first).
//   - Per-isolate dedup so a tight error loop can't flood the group.
//   - Only call this for UNEXPECTED failures (5xx / exceptions / provider failures)
//     — never for expected 4xx (401/403/400 by design), or it becomes noise.

const ALERT_TIMEOUT_MS = 3000
const DEDUP_WINDOW_MS = 60_000
const recent = new Map() // dedup key -> last-sent epoch ms (per warm isolate)

function shouldSend(key) {
  const now = Date.now()
  if (now - (recent.get(key) || 0) < DEDUP_WINDOW_MS) return false
  recent.set(key, now)
  if (recent.size > 200) {
    for (const [k, t] of recent) {
      if (now - t > DEDUP_WINDOW_MS) recent.delete(k)
    }
  }
  return true
}

async function send(token, chatId, text) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ALERT_TIMEOUT_MS)
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: controller.signal,
    })
  } catch (_e) {
    // swallow — alerting must never affect the function
  } finally {
    clearTimeout(timer)
  }
}

function dispatch(emoji, label, detail) {
  const token = Deno.env.get('TELEGRAM_ALERT_BOT_TOKEN')
  const chatId = Deno.env.get('TELEGRAM_ALERT_CHAT_ID')
  if (!token || !chatId) return // not configured → no-op

  const msg = String(detail ?? '').slice(0, 1000)
  if (!shouldSend(`${emoji}${label}|${msg}`.slice(0, 220))) return

  const text = `${emoji} ${label}${msg ? `\n${msg}` : ''}`.slice(0, 3500)
  const job = send(token, chatId, text)
  // Keep the isolate alive until the message is delivered, without blocking the response.
  try {
    EdgeRuntime.waitUntil(job)
  } catch (_e) {
    // EdgeRuntime not available here — let it run best-effort.
  }
}

// UNEXPECTED failures only (5xx / exceptions / provider-down) — never expected 4xx.
// label: short stable string (used for dedup + the title). detail: free of secrets/PII.
export function notifyError(label, detail = '') {
  dispatch('🔴', label, detail)
}

// Success / heartbeat for INFREQUENT jobs (crons, batch, admin) so you can see the
// daily pipeline actually ran. Do NOT call from per-user/high-frequency paths.
export function notifyInfo(label, detail = '') {
  dispatch('✅', label, detail)
}

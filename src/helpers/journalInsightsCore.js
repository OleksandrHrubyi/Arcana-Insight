// Premium reflection insights — a richer aggregation over a longer window than
// the free 7-day summary (computeJournalPatterns). Pure, no Vue/Capacitor deps
// so it's unit-testable; the JournalPage gates the rendered view behind premium.
// The basic free summary is unchanged — this is an additive layer.

export const JOURNAL_INSIGHTS_WINDOW_DAYS = 30

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const MS_PER_DAY = 86400000

const parseKey = (value) => {
  const m = DATE_KEY_RE.exec(String(value || '').trim())
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}
const diffDays = (fromKey, toKey) => {
  const a = parseKey(fromKey)
  const b = parseKey(toKey)
  if (!a || !b) return null
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY)
}

// Current consecutive-day streak ending at today (or yesterday, so an un-journaled
// "today so far" doesn't zero a real streak). Counts back until the first gap.
export const computeJournalStreak = (dateKeys, todayKey) => {
  const have = new Set((Array.isArray(dateKeys) ? dateKeys : []).filter((k) => DATE_KEY_RE.test(k)))
  if (!have.size || !DATE_KEY_RE.test(todayKey)) return 0
  let anchor = todayKey
  if (!have.has(anchor)) {
    // allow the streak to be "alive" if yesterday has an entry
    const d = parseKey(todayKey)
    d.setDate(d.getDate() - 1)
    anchor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!have.has(anchor)) return 0
  }
  let streak = 0
  const cursor = parseKey(anchor)
  while (true) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
    if (!have.has(key)) break
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export const computeJournalInsights = (
  entries,
  { todayKey = '', windowDays = JOURNAL_INSIGHTS_WINDOW_DAYS } = {},
) => {
  const list = []
  for (const value of Array.isArray(entries) ? entries : []) {
    const dateKey = String(value?.dateKey || '').trim()
    if (!DATE_KEY_RE.test(dateKey)) continue
    const diff = todayKey ? diffDays(dateKey, todayKey) : 0
    if (todayKey && (diff == null || diff < 0 || diff >= windowDays)) continue
    list.push({
      dateKey,
      mood: String(value?.mood || '').trim() || null,
      phase: String(value?.sky?.moonPhaseKey || '').trim() || null,
    })
  }
  if (!list.length) return null

  const moodCounts = {}
  const phaseCounts = {}
  let moodTagged = 0
  for (const e of list) {
    if (e.mood) {
      moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1
      moodTagged += 1
    }
    if (e.phase) phaseCounts[e.phase] = (phaseCounts[e.phase] || 0) + 1
  }

  const moods = Object.entries(moodCounts)
    .map(([key, count]) => ({ key, count, pct: Math.round((count / moodTagged) * 100) }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
  const phases = Object.entries(phaseCounts)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))

  return {
    windowDays,
    totalEntries: list.length,
    streakDays: computeJournalStreak(list.map((e) => e.dateKey), todayKey || list[0].dateKey),
    moods,
    phases,
  }
}

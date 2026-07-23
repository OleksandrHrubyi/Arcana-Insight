import { getLocalDateKey } from './dailyRitual.js'

export const JOURNAL_BODY_MAX = 2000
export const JOURNAL_LOCAL_RETENTION_DAYS = 60
export const JOURNAL_ENTRIES_STORAGE_KEY = 'arcana_journal_entries_v1'
export const JOURNAL_MIGRATION_STORAGE_KEY = 'arcana_journal_migration_v1'

export const JOURNAL_MOODS = Object.freeze([
  Object.freeze({ key: 'calm', icon: 'self_improvement' }),
  Object.freeze({ key: 'bright', icon: 'wb_sunny' }),
  Object.freeze({ key: 'steady', icon: 'balance' }),
  Object.freeze({ key: 'tense', icon: 'sensors' }),
  Object.freeze({ key: 'low', icon: 'cloud' }),
  Object.freeze({ key: 'tired', icon: 'bedtime' }),
])
const MOOD_KEYS = new Set(JOURNAL_MOODS.map((mood) => mood.key))

// Pool sizes are the single source of truth for prompt selection AND the i18n
// skeleton under `journalPage.prompts.*` — a unit test pins that every derivable
// promptKey resolves in both locales. Keys mirror the astroToday values computed
// on Home (LandingScene): moonPhaseKey / planetaryDay.key / mercuryRetrograde.
export const JOURNAL_PROMPT_BANK = Object.freeze({
  moonPhase: Object.freeze({
    new: 3,
    waxingCrescent: 3,
    firstQuarter: 3,
    waxingGibbous: 3,
    full: 3,
    waningGibbous: 3,
    lastQuarter: 3,
    waningCrescent: 3,
  }),
  planetaryDay: Object.freeze({
    sun: 2,
    moon: 2,
    mars: 2,
    mercury: 2,
    jupiter: 2,
    venus: 2,
    saturn: 2,
  }),
  retrograde: 3,
  general: 6,
})

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const MS_PER_DAY = 86400000

const parseDateKey = (value) => {
  const match = DATE_KEY_RE.exec(String(value || '').trim())
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

const diffDaysBetween = (fromDateKey, toDateKey) => {
  const from = parseDateKey(fromDateKey)
  const to = parseDateKey(toDateKey)
  if (!from || !to) return null
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY)
}

// FNV-1a — deterministic per dateKey, stable across sessions/devices.
const hashString = (value) => {
  let hash = 0x811c9dc5
  const text = String(value || '')
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

export const normalizeMoodKey = (value) => {
  const key = String(value || '').trim()
  return MOOD_KEYS.has(key) ? key : ''
}

export const clampJournalBody = (value) => String(value ?? '').trim().slice(0, JOURNAL_BODY_MAX)

const normalizeSky = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out = {}
  const moonPhaseKey = String(value.moonPhaseKey || '').trim()
  const moonSignKey = String(value.moonSignKey || '').trim()
  const planetaryDay = String(value.planetaryDay?.key || value.planetaryDay || '').trim()
  if (moonPhaseKey) out.moonPhaseKey = moonPhaseKey
  if (moonSignKey) out.moonSignKey = moonSignKey
  if (planetaryDay) out.planetaryDay = planetaryDay
  if (typeof value.mercuryRetrograde === 'boolean') out.mercuryRetrograde = value.mercuryRetrograde
  return out
}

// Accepts a server row (entry_date/prompt_key/updated_at) or a local entry
// (dateKey/promptKey/updatedAt) and returns the canonical local shape.
export const normalizeJournalEntry = (row) => {
  if (!row || typeof row !== 'object') return null
  const dateKey = String(row.dateKey || row.entry_date || '').trim()
  if (!parseDateKey(dateKey)) return null
  const entry = {
    dateKey,
    mood: normalizeMoodKey(row.mood),
    promptKey: String(row.promptKey || row.prompt_key || '').trim().slice(0, 64),
    body: clampJournalBody(row.body),
    sky: normalizeSky(row.sky),
    updatedAt: String(row.updatedAt || row.updated_at || '').trim(),
  }
  const id = String(row.id || '').trim()
  if (id) entry.id = id
  return entry
}

const resolvePromptPool = ({ hash, astro }) => {
  const moonPools = JOURNAL_PROMPT_BANK.moonPhase
  const dayPools = JOURNAL_PROMPT_BANK.planetaryDay
  const moonPhaseKey = String(astro?.moonPhaseKey || '').trim()
  const planetaryDay = String(astro?.planetaryDay?.key || astro?.planetaryDay || '').trim()
  const hasMoon = Object.prototype.hasOwnProperty.call(moonPools, moonPhaseKey)
  const hasDay = Object.prototype.hasOwnProperty.call(dayPools, planetaryDay)

  if (astro?.mercuryRetrograde === true && hash % 4 === 0) {
    return { poolKey: 'retrograde', path: 'retrograde', size: JOURNAL_PROMPT_BANK.retrograde }
  }
  const preferMoon = hash % 2 === 0
  if (preferMoon && hasMoon) {
    return { poolKey: 'moonPhase', path: `moonPhase.${moonPhaseKey}`, size: moonPools[moonPhaseKey] }
  }
  if (hasDay) {
    return { poolKey: 'planetaryDay', path: `planetaryDay.${planetaryDay}`, size: dayPools[planetaryDay] }
  }
  if (hasMoon) {
    return { poolKey: 'moonPhase', path: `moonPhase.${moonPhaseKey}`, size: moonPools[moonPhaseKey] }
  }
  return { poolKey: 'general', path: 'general', size: JOURNAL_PROMPT_BANK.general }
}

// Deterministic per-day prompt. `promptKey` is the i18n subpath under
// `journalPage.prompts` (e.g. 'moonPhase.full.1'); never repeats yesterday's key.
export const selectDailyPrompt = ({ dateKey, astro = null, previousPromptKey = '' } = {}) => {
  const normalizedDate = parseDateKey(dateKey) ? String(dateKey).trim() : ''
  const hash = hashString(`journal-prompt::${normalizedDate}`)
  const pool = resolvePromptPool({ hash, astro })

  let index = hash % pool.size
  let promptKey = `${pool.path}.${index}`
  if (promptKey === String(previousPromptKey || '').trim()) {
    index = (index + 1) % pool.size
    promptKey = `${pool.path}.${index}`
  }
  if (promptKey === String(previousPromptKey || '').trim() && pool.poolKey !== 'general') {
    const fallbackIndex = hash % JOURNAL_PROMPT_BANK.general
    return {
      promptKey: `general.${fallbackIndex}`,
      poolKey: 'general',
      contextKey: '',
    }
  }

  return {
    promptKey,
    poolKey: pool.poolKey,
    contextKey: pool.poolKey === 'general' || pool.poolKey === 'retrograde'
      ? ''
      : pool.path.split('.')[1] || '',
  }
}

// ---------------------------------------------------------------------------
// Local storage map (guests + offline cache for signed-in users)
// ---------------------------------------------------------------------------

export const readLocalJournalMap = () => {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(JOURNAL_ENTRIES_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out = {}
    for (const value of Object.values(parsed)) {
      const entry = normalizeJournalEntry(value)
      if (!entry) continue
      out[entry.dateKey] = entry
    }
    return out
  } catch {
    return {}
  }
}

const pruneJournalMap = (journalMap, baseDateKey) => {
  const out = {}
  for (const [dateKey, entry] of Object.entries(journalMap || {})) {
    const diff = diffDaysBetween(dateKey, baseDateKey)
    if (diff == null) continue
    if (diff < 0 || diff > JOURNAL_LOCAL_RETENTION_DAYS) continue
    out[dateKey] = entry
  }
  return out
}

const writeLocalJournalMap = (journalMap) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(JOURNAL_ENTRIES_STORAGE_KEY, JSON.stringify(journalMap))
  } catch {
    // ignore storage errors
  }
}

export const writeLocalJournalEntry = (entry) => {
  const normalized = normalizeJournalEntry(entry)
  if (!normalized) return null
  const map = readLocalJournalMap()
  map[normalized.dateKey] = normalized
  writeLocalJournalMap(pruneJournalMap(map, getLocalDateKey()))
  return normalized
}

export const removeLocalJournalEntry = (dateKey) => {
  const key = String(dateKey || '').trim()
  if (!key) return
  const map = readLocalJournalMap()
  if (!(key in map)) return
  delete map[key]
  writeLocalJournalMap(map)
}

export const readJournalMigrationState = () => {
  if (typeof window === 'undefined') return { status: 'local_only', userId: '' }
  try {
    const raw = localStorage.getItem(JOURNAL_MIGRATION_STORAGE_KEY)
    if (!raw) return { status: 'local_only', userId: '' }
    const parsed = JSON.parse(raw)
    const status = parsed?.status === 'migrated' ? 'migrated' : 'local_only'
    return { status, userId: String(parsed?.userId || '') }
  } catch {
    return { status: 'local_only', userId: '' }
  }
}

export const writeJournalMigrationState = (state) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      JOURNAL_MIGRATION_STORAGE_KEY,
      JSON.stringify({
        status: state?.status === 'migrated' ? 'migrated' : 'local_only',
        userId: String(state?.userId || ''),
      }),
    )
  } catch {
    // ignore storage errors
  }
}

// ---------------------------------------------------------------------------
// Snapshot load / save / guest migration (pure, deps injected)
// ---------------------------------------------------------------------------

const sortEntriesDesc = (entries) =>
  [...entries].sort((a, b) => (a.dateKey < b.dateKey ? 1 : a.dateKey > b.dateKey ? -1 : 0))

const isLocalNewer = (localEntry, serverEntry) => {
  if (!serverEntry) return true
  const localAt = Date.parse(localEntry?.updatedAt || '') || 0
  const serverAt = Date.parse(serverEntry?.updatedAt || '') || 0
  return localAt > serverAt
}

export const loadJournalSnapshot = async ({
  isAuthenticated,
  userId = '',
  selectJournalEntriesByUser,
  readLocalEntries = readLocalJournalMap,
  todayKey = getLocalDateKey(),
  timeoutMs = 8000,
} = {}) => {
  const localMap = readLocalEntries() || {}

  if (!isAuthenticated || !userId) {
    const entries = sortEntriesDesc(Object.values(localMap))
    return {
      status: 'ready',
      mode: 'local',
      entries,
      today: localMap[todayKey] || null,
      error: null,
    }
  }

  try {
    const { data, error } = await selectJournalEntriesByUser(userId, timeoutMs)
    if (error) {
      const entries = sortEntriesDesc(Object.values(localMap))
      return {
        status: 'error',
        mode: 'auth',
        entries,
        today: localMap[todayKey] || null,
        error,
      }
    }

    const merged = {}
    for (const row of Array.isArray(data) ? data : []) {
      const entry = normalizeJournalEntry(row)
      if (!entry) continue
      merged[entry.dateKey] = entry
    }
    // Server wins for every date except a strictly-newer local "today" (the only
    // date both sides can plausibly still be editing, e.g. offline edits).
    const localToday = localMap[todayKey]
    if (localToday && isLocalNewer(localToday, merged[todayKey])) {
      merged[todayKey] = { ...merged[todayKey], ...localToday }
    }

    return {
      status: 'ready',
      mode: 'auth',
      entries: sortEntriesDesc(Object.values(merged)),
      today: merged[todayKey] || null,
      error: null,
    }
  } catch (error) {
    const entries = sortEntriesDesc(Object.values(localMap))
    return {
      status: 'error',
      mode: 'auth',
      entries,
      today: localMap[todayKey] || null,
      error,
    }
  }
}

export const saveJournalEntrySnapshot = async ({
  entry,
  isAuthenticated,
  userId = '',
  upsertJournalEntry,
  writeLocalEntry = writeLocalJournalEntry,
  timeoutMs = 8000,
} = {}) => {
  const normalized = normalizeJournalEntry({
    ...entry,
    updatedAt: entry?.updatedAt || new Date().toISOString(),
  })
  if (!normalized) {
    return { ok: false, savedLocally: false, savedRemotely: false, entry: null, error: new Error('invalid journal entry') }
  }

  // Local write first — a remote failure must never lose the entry (offline-safe).
  const savedLocal = writeLocalEntry(normalized)
  const savedLocally = Boolean(savedLocal)

  if (!isAuthenticated || !userId || typeof upsertJournalEntry !== 'function') {
    return { ok: savedLocally, savedLocally, savedRemotely: false, entry: normalized, error: null }
  }

  try {
    const { data, error } = await upsertJournalEntry(
      {
        user_id: userId,
        entry_date: normalized.dateKey,
        mood: normalized.mood,
        prompt_key: normalized.promptKey,
        body: normalized.body,
        sky: normalized.sky,
      },
      timeoutMs,
    )
    if (error) {
      return { ok: savedLocally, savedLocally, savedRemotely: false, entry: normalized, error }
    }
    const remoteId = String(data?.id || '').trim()
    if (remoteId) {
      normalized.id = remoteId
      writeLocalEntry(normalized)
    }
    return { ok: true, savedLocally, savedRemotely: true, entry: normalized, error: null }
  } catch (error) {
    return { ok: savedLocally, savedLocally, savedRemotely: false, entry: normalized, error }
  }
}

// Which local (guest) entries should be uploaded after sign-in: dates the server
// does not have, plus a strictly-newer local "today". Server wins otherwise.
export const planGuestJournalMigration = (localMap, serverRows, todayKey = getLocalDateKey()) => {
  const serverByDate = {}
  for (const row of Array.isArray(serverRows) ? serverRows : []) {
    const entry = normalizeJournalEntry(row)
    if (!entry) continue
    serverByDate[entry.dateKey] = entry
  }

  const out = []
  for (const value of Object.values(localMap || {})) {
    const entry = normalizeJournalEntry(value)
    if (!entry) continue
    const serverEntry = serverByDate[entry.dateKey]
    if (!serverEntry) {
      out.push(entry)
      continue
    }
    if (entry.dateKey === todayKey && isLocalNewer(entry, serverEntry)) {
      out.push(entry)
    }
  }
  return out.sort((a, b) => (a.dateKey < b.dateKey ? -1 : a.dateKey > b.dateKey ? 1 : 0))
}

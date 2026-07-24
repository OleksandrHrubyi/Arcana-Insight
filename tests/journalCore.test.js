import test from 'node:test'
import assert from 'node:assert/strict'
import { installBrowserEnv, importModule } from './utils/testEnv.js'

const core = await importModule('src/helpers/journalCore.js')
const { getLocalDateKey } = await importModule('src/helpers/dailyRitual.js')

const {
  computePersonalDayNumber,
  computeUniversalDayNumber,
  JOURNAL_BODY_MAX,
  JOURNAL_LOCAL_RETENTION_DAYS,
  JOURNAL_ENTRIES_STORAGE_KEY,
  JOURNAL_MOODS,
  JOURNAL_PROMPT_BANK,
  selectDailyPrompt,
  normalizeMoodKey,
  clampJournalBody,
  normalizeJournalEntry,
  readLocalJournalMap,
  writeLocalJournalEntry,
  removeLocalJournalEntry,
  readJournalMigrationState,
  writeJournalMigrationState,
  loadJournalSnapshot,
  saveJournalEntrySnapshot,
  planGuestJournalMigration,
} = core

const dateKeyDaysAgo = (days) => getLocalDateKey(new Date(Date.now() - days * 86400000))

const FULL_ASTRO = {
  moonPhaseKey: 'full',
  moonSignKey: 'leo',
  planetaryDay: { key: 'venus' },
  mercuryRetrograde: false,
}

test('selectDailyPrompt is deterministic for the same date + astro', () => {
  const a = selectDailyPrompt({ dateKey: '2026-07-23', astro: FULL_ASTRO })
  const b = selectDailyPrompt({ dateKey: '2026-07-23', astro: FULL_ASTRO })
  assert.deepEqual(a, b)
  assert.match(a.promptKey, /^(moonPhase\.full|planetaryDay\.venus|general)\.\d+$/)
})

test('selectDailyPrompt never repeats the previous day prompt across a 14-day chain', () => {
  let previousPromptKey = ''
  for (let i = 0; i < 14; i += 1) {
    const dateKey = `2026-08-${String(i + 1).padStart(2, '0')}`
    const { promptKey } = selectDailyPrompt({ dateKey, astro: FULL_ASTRO, previousPromptKey })
    assert.notEqual(promptKey, previousPromptKey, `repeat on ${dateKey}`)
    previousPromptKey = promptKey
  }
})

test('selectDailyPrompt collision with previousPromptKey advances the index', () => {
  const first = selectDailyPrompt({ dateKey: '2026-07-23', astro: FULL_ASTRO })
  const second = selectDailyPrompt({
    dateKey: '2026-07-23',
    astro: FULL_ASTRO,
    previousPromptKey: first.promptKey,
  })
  assert.notEqual(second.promptKey, first.promptKey)
})

test('selectDailyPrompt without astro falls back to the general pool', () => {
  const noAstro = selectDailyPrompt({ dateKey: '2026-07-23', astro: null })
  assert.equal(noAstro.poolKey, 'general')
  assert.match(noAstro.promptKey, /^general\.\d+$/)

  const unknownKeys = selectDailyPrompt({
    dateKey: '2026-07-23',
    astro: { moonPhaseKey: 'weird', planetaryDay: 'pluto' },
  })
  assert.equal(unknownKeys.poolKey, 'general')
})

test('selectDailyPrompt can pick the retrograde pool when mercury is retrograde', () => {
  const retroAstro = { ...FULL_ASTRO, mercuryRetrograde: true }
  let sawRetro = false
  for (let i = 1; i <= 31; i += 1) {
    const { promptKey, poolKey } = selectDailyPrompt({
      dateKey: `2026-09-${String(i).padStart(2, '0')}`,
      astro: retroAstro,
    })
    if (poolKey === 'retrograde') {
      sawRetro = true
      assert.match(promptKey, /^retrograde\.\d+$/)
    }
  }
  assert.equal(sawRetro, true)
})

test('every derivable promptKey resolves to copy in both locales', async () => {
  const { messages } = await importModule('src/i18n/messages.bundle.js')
  const resolve = (locale, subPath) => {
    let node = messages[locale]?.journalPage?.prompts
    for (const part of subPath.split('.')) {
      node = node?.[part]
    }
    return node
  }

  const paths = []
  for (const [phase, size] of Object.entries(JOURNAL_PROMPT_BANK.moonPhase)) {
    for (let i = 0; i < size; i += 1) paths.push(`moonPhase.${phase}.${i}`)
  }
  for (const [day, size] of Object.entries(JOURNAL_PROMPT_BANK.planetaryDay)) {
    for (let i = 0; i < size; i += 1) paths.push(`planetaryDay.${day}.${i}`)
  }
  for (let i = 0; i < JOURNAL_PROMPT_BANK.retrograde; i += 1) paths.push(`retrograde.${i}`)
  for (const [num, size] of Object.entries(JOURNAL_PROMPT_BANK.numerology)) {
    for (let i = 0; i < size; i += 1) paths.push(`numerology.${num}.${i}`)
  }
  for (let i = 0; i < JOURNAL_PROMPT_BANK.general; i += 1) paths.push(`general.${i}`)

  for (const subPath of paths) {
    for (const locale of ['en', 'uk']) {
      const value = resolve(locale, subPath)
      assert.equal(
        typeof value === 'string' && value.trim().length > 0,
        true,
        `journalPage.prompts.${subPath} missing for ${locale}`,
      )
    }
  }
})

test('day numbers: universal matches the home formula, personal folds in the birth date', () => {
  // 2026-07-23 → digits 2026723 → 22 → 4 (same math as the home astro strip).
  assert.equal(computeUniversalDayNumber('2026-07-23'), 4)
  assert.equal(computeUniversalDayNumber('not-a-date'), null)

  // Birth 1990-03-14 → digits "314" + "2026723" → 3+1+4+22 = 30 → 3.
  assert.equal(computePersonalDayNumber('2026-07-23', '1990-03-14'), 3)
  assert.equal(computePersonalDayNumber('2026-07-23', ''), null)
  assert.equal(computePersonalDayNumber('2026-07-23', 'garbage'), null)

  for (let day = 1; day <= 28; day += 1) {
    const value = computeUniversalDayNumber(`2026-09-${String(day).padStart(2, '0')}`)
    assert.equal(value >= 1 && value <= 9, true)
  }
})

test('selectDailyPrompt uses the numerology pool when a day number is provided', () => {
  let sawNumerology = false
  for (let i = 1; i <= 31; i += 1) {
    const dateKey = `2026-10-${String(i).padStart(2, '0')}`
    const { promptKey, poolKey } = selectDailyPrompt({
      dateKey,
      astro: FULL_ASTRO,
      dayNumber: computeUniversalDayNumber(dateKey),
    })
    if (poolKey === 'numerology') {
      sawNumerology = true
      assert.match(promptKey, /^numerology\.[1-9]\.\d+$/)
    }
  }
  assert.equal(sawNumerology, true)

  // Without astro, the rotation still alternates numerology/general (never throws).
  const noAstro = selectDailyPrompt({ dateKey: '2026-10-05', astro: null, dayNumber: 7 })
  assert.equal(['numerology', 'general'].includes(noAstro.poolKey), true)
})

test('normalizeMoodKey accepts only known moods', () => {
  for (const mood of JOURNAL_MOODS) {
    assert.equal(normalizeMoodKey(mood.key), mood.key)
    assert.equal(typeof mood.icon === 'string' && mood.icon.length > 0, true)
    assert.notEqual(mood.icon, 'auto_awesome')
  }
  assert.equal(normalizeMoodKey('  calm  '), 'calm')
  assert.equal(normalizeMoodKey('euphoric'), '')
  assert.equal(normalizeMoodKey(null), '')
})

test('clampJournalBody trims and caps at JOURNAL_BODY_MAX', () => {
  assert.equal(clampJournalBody('  hello  '), 'hello')
  assert.equal(clampJournalBody(null), '')
  const long = 'x'.repeat(JOURNAL_BODY_MAX + 500)
  assert.equal(clampJournalBody(long).length, JOURNAL_BODY_MAX)
})

test('normalizeJournalEntry maps server rows and rejects invalid dates', () => {
  const fromServer = normalizeJournalEntry({
    id: 'j1',
    entry_date: '2026-07-23',
    mood: 'calm',
    prompt_key: 'general.0',
    body: ' note ',
    sky: { moonPhaseKey: 'full', planetaryDay: { key: 'venus' }, mercuryRetrograde: false },
    updated_at: '2026-07-23T10:00:00Z',
  })
  assert.deepEqual(fromServer, {
    id: 'j1',
    dateKey: '2026-07-23',
    mood: 'calm',
    promptKey: 'general.0',
    body: 'note',
    sky: { moonPhaseKey: 'full', planetaryDay: 'venus', mercuryRetrograde: false },
    updatedAt: '2026-07-23T10:00:00Z',
  })
  assert.equal(normalizeJournalEntry({ entry_date: 'not-a-date' }), null)
  assert.equal(normalizeJournalEntry(null), null)
})

test('local journal map round-trips, prunes old dates and tolerates corrupt JSON', () => {
  const env = installBrowserEnv()
  try {
    const today = getLocalDateKey()
    const old = dateKeyDaysAgo(JOURNAL_LOCAL_RETENTION_DAYS + 10)
    writeLocalJournalEntry({ dateKey: old, mood: 'calm', body: 'ancient' })
    writeLocalJournalEntry({ dateKey: today, mood: 'bright', body: 'today note' })

    const map = readLocalJournalMap()
    assert.equal(map[today]?.body, 'today note')
    assert.equal(old in map, false, 'entries older than retention must be pruned')

    removeLocalJournalEntry(today)
    assert.equal(today in readLocalJournalMap(), false)

    env.localStorage.setItem(JOURNAL_ENTRIES_STORAGE_KEY, '{corrupt json')
    assert.deepEqual(readLocalJournalMap(), {})
  } finally {
    env.restore()
  }
})

test('journal migration state round-trips and defaults to local_only', () => {
  const env = installBrowserEnv()
  try {
    assert.deepEqual(readJournalMigrationState(), { status: 'local_only', userId: '' })
    writeJournalMigrationState({ status: 'migrated', userId: 'u1' })
    assert.deepEqual(readJournalMigrationState(), { status: 'migrated', userId: 'u1' })
    writeJournalMigrationState({ status: 'weird', userId: 'u1' })
    assert.equal(readJournalMigrationState().status, 'local_only')
  } finally {
    env.restore()
  }
})

test('loadJournalSnapshot guest mode reads local entries only', async () => {
  const today = getLocalDateKey()
  const yesterday = dateKeyDaysAgo(1)
  const snapshot = await loadJournalSnapshot({
    isAuthenticated: false,
    readLocalEntries: () => ({
      [yesterday]: { dateKey: yesterday, mood: 'calm', body: 'y', sky: {}, updatedAt: '' },
      [today]: { dateKey: today, mood: 'bright', body: 't', sky: {}, updatedAt: '' },
    }),
    selectJournalEntriesByUser: async () => {
      throw new Error('must not be called for guests')
    },
  })
  assert.equal(snapshot.status, 'ready')
  assert.equal(snapshot.mode, 'local')
  assert.equal(snapshot.entries.length, 2)
  assert.equal(snapshot.entries[0].dateKey, today, 'entries sorted newest first')
  assert.equal(snapshot.today?.body, 't')
})

test('loadJournalSnapshot auth merge: server wins except newer local today', async () => {
  const today = getLocalDateKey()
  const yesterday = dateKeyDaysAgo(1)
  const snapshot = await loadJournalSnapshot({
    isAuthenticated: true,
    userId: 'u1',
    readLocalEntries: () => ({
      [yesterday]: {
        dateKey: yesterday, mood: 'low', body: 'local stale', sky: {}, updatedAt: '2026-01-02T00:00:00Z',
      },
      [today]: {
        dateKey: today, mood: 'bright', body: 'local newer', sky: {}, updatedAt: '2026-01-05T00:00:00Z',
      },
    }),
    selectJournalEntriesByUser: async () => ({
      data: [
        { id: 's1', entry_date: yesterday, mood: 'calm', body: 'server truth', updated_at: '2026-01-03T00:00:00Z' },
        { id: 's2', entry_date: today, mood: 'calm', body: 'server older', updated_at: '2026-01-04T00:00:00Z' },
      ],
      error: null,
    }),
  })
  assert.equal(snapshot.status, 'ready')
  assert.equal(snapshot.mode, 'auth')
  const byDate = Object.fromEntries(snapshot.entries.map((entry) => [entry.dateKey, entry]))
  assert.equal(byDate[yesterday].body, 'server truth')
  assert.equal(byDate[today].body, 'local newer')
  assert.equal(byDate[today].id, 's2', 'server row id preserved through local-today merge')
  assert.equal(snapshot.today.body, 'local newer')
})

test('loadJournalSnapshot auth error falls back to local cache with error status', async () => {
  const today = getLocalDateKey()
  const failure = new Error('offline')
  const snapshot = await loadJournalSnapshot({
    isAuthenticated: true,
    userId: 'u1',
    readLocalEntries: () => ({
      [today]: { dateKey: today, mood: 'calm', body: 'cached', sky: {}, updatedAt: '' },
    }),
    selectJournalEntriesByUser: async () => ({ data: null, error: failure }),
  })
  assert.equal(snapshot.status, 'error')
  assert.equal(snapshot.error, failure)
  assert.equal(snapshot.entries[0].body, 'cached')
  assert.equal(snapshot.today?.body, 'cached')
})

test('saveJournalEntrySnapshot guest saves locally only', async () => {
  const today = getLocalDateKey()
  const written = []
  const result = await saveJournalEntrySnapshot({
    entry: { dateKey: today, mood: 'calm', body: '  guest note  ' },
    isAuthenticated: false,
    writeLocalEntry: (entry) => {
      written.push(entry)
      return entry
    },
    upsertJournalEntry: async () => {
      throw new Error('must not be called for guests')
    },
  })
  assert.equal(result.ok, true)
  assert.equal(result.savedLocally, true)
  assert.equal(result.savedRemotely, false)
  assert.equal(written[0].body, 'guest note')
  assert.equal(written[0].updatedAt.length > 0, true)
})

test('saveJournalEntrySnapshot auth success upserts payload and stores remote id', async () => {
  const today = getLocalDateKey()
  const written = []
  let payloadSeen = null
  const result = await saveJournalEntrySnapshot({
    entry: {
      dateKey: today,
      mood: 'bright',
      promptKey: 'moonPhase.full.1',
      body: 'note',
      sky: { moonPhaseKey: 'full' },
    },
    isAuthenticated: true,
    userId: 'u1',
    writeLocalEntry: (entry) => {
      written.push({ ...entry })
      return entry
    },
    upsertJournalEntry: async (payload) => {
      payloadSeen = payload
      return { data: { id: 'srv-1' }, error: null }
    },
  })
  assert.equal(result.ok, true)
  assert.equal(result.savedRemotely, true)
  assert.equal(result.entry.id, 'srv-1')
  assert.deepEqual(payloadSeen, {
    user_id: 'u1',
    entry_date: today,
    mood: 'bright',
    prompt_key: 'moonPhase.full.1',
    body: 'note',
    sky: { moonPhaseKey: 'full' },
  })
  assert.equal(written.length, 2, 'local write-through happens before and after the upsert')
})

test('saveJournalEntrySnapshot remote failure still counts as saved locally', async () => {
  const today = getLocalDateKey()
  const failure = new Error('503')
  const result = await saveJournalEntrySnapshot({
    entry: { dateKey: today, mood: 'calm', body: 'note' },
    isAuthenticated: true,
    userId: 'u1',
    writeLocalEntry: (entry) => entry,
    upsertJournalEntry: async () => ({ data: null, error: failure }),
  })
  assert.equal(result.ok, true)
  assert.equal(result.savedLocally, true)
  assert.equal(result.savedRemotely, false)
  assert.equal(result.error, failure)
})

test('computeJournalPatterns: window filter, thresholds and deterministic ties', () => {
  const { computeJournalPatterns } = core
  const mk = (offset, mood, phase) => ({
    dateKey: dateKeyDaysAgo(offset),
    mood,
    body: 'x',
    sky: phase ? { moonPhaseKey: phase } : {},
    updatedAt: '',
  })

  // fewer than 3 entries in the window → null
  assert.equal(computeJournalPatterns([mk(0, 'calm'), mk(1, 'calm')]), null)

  // out-of-window entries are ignored
  const withOld = [mk(0, 'calm', 'full'), mk(1, 'calm', 'full'), mk(2, 'bright'), mk(10, 'low')]
  const patterns = computeJournalPatterns(withOld)
  assert.equal(patterns.entryCount, 3)
  assert.deepEqual(patterns.topMood, { key: 'calm', count: 2 })
  assert.deepEqual(patterns.topPhase, { key: 'full', count: 2 })

  // single-occurrence mood/phase is noise → null fields, block still shows count
  const scattered = [mk(0, 'calm', 'full'), mk(1, 'bright', 'new'), mk(2, 'low')]
  const noisy = computeJournalPatterns(scattered)
  assert.equal(noisy.entryCount, 3)
  assert.equal(noisy.topMood, null)
  assert.equal(noisy.topPhase, null)

  // tie between moods resolves by canonical JOURNAL_MOODS order (calm before tired)
  const tied = [mk(0, 'tired'), mk(1, 'tired'), mk(2, 'calm'), mk(3, 'calm')]
  assert.equal(computeJournalPatterns(tied).topMood.key, 'calm')
})

test('planGuestJournalMigration uploads missing dates plus newer local today', () => {
  const today = getLocalDateKey()
  const yesterday = dateKeyDaysAgo(1)
  const older = dateKeyDaysAgo(3)
  const plan = planGuestJournalMigration(
    {
      [older]: { dateKey: older, mood: 'calm', body: 'only local', sky: {}, updatedAt: '' },
      [yesterday]: {
        dateKey: yesterday, mood: 'low', body: 'server has it', sky: {}, updatedAt: '2026-01-09T00:00:00Z',
      },
      [today]: {
        dateKey: today, mood: 'bright', body: 'newer local', sky: {}, updatedAt: '2026-01-10T00:00:00Z',
      },
    },
    [
      { entry_date: yesterday, body: 'server copy', updated_at: '2026-01-08T00:00:00Z' },
      { entry_date: today, body: 'server today', updated_at: '2026-01-09T00:00:00Z' },
    ],
    today,
  )
  assert.deepEqual(
    plan.map((entry) => entry.dateKey),
    [older, today],
    'yesterday stays server-owned; missing date + newer today upload',
  )
})

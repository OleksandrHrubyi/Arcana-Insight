import { selectJournalEntriesByUser, upsertJournalEntry } from 'src/services/supabaseNative'
import {
  planGuestJournalMigration,
  readJournalMigrationState,
  readLocalJournalMap,
  writeJournalMigrationState,
  writeLocalJournalEntry,
} from './journalCore.js'

let migrationInFlight = null

// One-shot upload of guest journal entries after sign-in. Dates the server
// already has stay server-owned (except a strictly-newer local "today").
// Guarded by a per-user migrated flag; partial failure leaves the flag unset so
// the next auth event retries.
export const syncGuestJournalEntries = async ({ userId } = {}) => {
  const uid = String(userId || '').trim()
  if (!uid) return { ok: false, uploaded: 0, skipped: true }
  if (migrationInFlight) return migrationInFlight

  const run = (async () => {
    const state = readJournalMigrationState()
    if (state.status === 'migrated' && state.userId === uid) {
      return { ok: true, uploaded: 0, skipped: true }
    }

    const localMap = readLocalJournalMap()
    if (!Object.keys(localMap).length) {
      writeJournalMigrationState({ status: 'migrated', userId: uid })
      return { ok: true, uploaded: 0, skipped: false }
    }

    const { data, error } = await selectJournalEntriesByUser(uid, 8000)
    if (error) {
      return { ok: false, uploaded: 0, skipped: false, error }
    }

    const plan = planGuestJournalMigration(localMap, data)
    let uploaded = 0
    for (const entry of plan) {
      const { data: row, error: upsertError } = await upsertJournalEntry(
        {
          user_id: uid,
          entry_date: entry.dateKey,
          mood: entry.mood,
          prompt_key: entry.promptKey,
          body: entry.body,
          sky: entry.sky,
        },
        8000,
      )
      if (upsertError) {
        return { ok: false, uploaded, skipped: false, error: upsertError }
      }
      if (row?.id) {
        writeLocalJournalEntry({ ...entry, id: row.id })
      }
      uploaded += 1
    }

    writeJournalMigrationState({ status: 'migrated', userId: uid })
    return { ok: true, uploaded, skipped: false }
  })()

  migrationInFlight = run.finally(() => {
    migrationInFlight = null
  })
  return migrationInFlight
}

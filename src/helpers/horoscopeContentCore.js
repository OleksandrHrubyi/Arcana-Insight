// The one free horoscope theme. love/career are premium-gated.
export const FREE_HOROSCOPE_THEME = 'energy'

export const normalizeHoroscopeThemeKey = (value) => {
  const key = String(value || '')
    .trim()
    .toLowerCase()

  if (!key) return ''
  if (key === 'energy' || key === 'self') return 'energy'
  if (key === 'work' || key === 'career') return 'career'
  if (key === 'love') return 'love'
  return ''
}

export const rowsToRegistry = (rows) => {
  const reg = {}
  for (const row of rows ?? []) {
    const sign = row?.sign
    const theme = normalizeHoroscopeThemeKey(row?.theme)
    if (!sign || !theme) continue

    if (!reg[sign]) reg[sign] = {}
    reg[sign][theme] = {
      summary: row?.summary,
      detailed: row?.detailed,
    }
  }
  return reg
}

export const registryToRows = (reg) => {
  const rows = []
  for (const sign of Object.keys(reg || {})) {
    const themes = reg[sign] || {}
    for (const theme of Object.keys(themes)) {
      const normalizedTheme = normalizeHoroscopeThemeKey(theme)
      const item = themes[theme] || {}
      if (!normalizedTheme) continue
      rows.push({
        sign,
        theme: normalizedTheme,
        summary: item.summary ?? '',
        detailed: item.detailed ?? '',
      })
    }
  }
  return rows
}

// Defense-in-depth for QA finding #2: a non-entitled user must not retain the
// premium `detailed` body of love/career — the DOM is already gated, but without
// this the on-device cache and in-memory registry would still hold the paid text
// (extractable via devtools / the plaintext Preferences cache). The free teaser
// `summary` is kept. NOTE: this is the CLIENT layer only; the server still returns
// `detailed` in the raw network payload — withholding it at source needs an
// entitlement-aware server read (tracked separately in the launch plan).
export const stripPremiumDetailedFromRegistry = (registry, { isEntitled = false } = {}) => {
  if (isEntitled) return registry || {}
  const out = {}
  for (const sign of Object.keys(registry || {})) {
    const themes = registry[sign] || {}
    out[sign] = {}
    for (const theme of Object.keys(themes)) {
      const item = themes[theme] || {}
      out[sign][theme] =
        theme === FREE_HOROSCOPE_THEME
          ? { summary: item.summary, detailed: item.detailed }
          : { summary: item.summary, detailed: '' }
    }
  }
  return out
}

export const getNextISODate = (isoDate) => {
  const parsed = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate || '').trim())
  if (!parsed) return ''
  const year = Number(parsed[1])
  const month = Number(parsed[2]) - 1
  const day = Number(parsed[3])
  const next = new Date(year, month, day)
  next.setDate(next.getDate() + 1)
  const y = next.getFullYear()
  const m = String(next.getMonth() + 1).padStart(2, '0')
  const d = String(next.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const loadHoroscopeRegistry = async ({
  locale,
  today,
  forceNetwork = false,
  timeoutMs = 8000,
  isEntitled = false,
  loadLocal,
  saveLocal,
  selectHoroscopes,
}) => {
  if (!forceNetwork) {
    const local = await loadLocal()
    if (
      local?.date === today &&
      local?.locale === locale &&
      // Entitlement must match: a cache written while NON-entitled has the premium
      // love/career detail stripped, and strip-on-read can only remove — never
      // restore — it. So a now-premium user reading that cache would see empty paid
      // themes forever (skeleton). Force a network re-fetch on mismatch. Old caches
      // lack the field → Boolean(undefined)=false, so a premium user re-fetches once
      // and a free user still hits. A-4.
      Boolean(local?.isEntitled) === Boolean(isEntitled) &&
      Array.isArray(local?.rows) &&
      local.rows.length
    ) {
      return {
        registry: stripPremiumDetailedFromRegistry(rowsToRegistry(local.rows), { isEntitled }),
        source: 'cache',
        isEmpty: false,
      }
    }
  }

  const fetchByDate = async (date) => {
    const { data, error } = await selectHoroscopes(date, locale, timeoutMs)
    if (error) throw error
    return data ?? []
  }

  let rows = await fetchByDate(today)
  if (!rows.length) {
    const nextDate = getNextISODate(today)
    if (nextDate) {
      rows = await fetchByDate(nextDate)
    }
  }

  // Strip premium detail for non-entitled users BEFORE caching, so the on-device
  // cache never holds paid love/career text the user can't access.
  const registry = stripPremiumDetailedFromRegistry(rowsToRegistry(rows), { isEntitled })
  await saveLocal({
    date: today,
    locale,
    isEntitled: Boolean(isEntitled),
    rows: registryToRows(registry),
  })
  return {
    registry,
    source: 'network',
    // A 200-with-empty-array (cron gap for today AND tomorrow) is a success, not a
    // load error — flag it so the screen shows an explicit empty/retry state
    // instead of an indefinite shimmer skeleton (QA #11).
    isEmpty: rows.length === 0,
  }
}

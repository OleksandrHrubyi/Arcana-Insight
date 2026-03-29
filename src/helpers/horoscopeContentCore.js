export const rowsToRegistry = (rows) => {
  const reg = {}
  for (const row of rows ?? []) {
    const sign = row?.sign
    const theme = row?.theme
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
      const item = themes[theme] || {}
      rows.push({
        sign,
        theme,
        summary: item.summary ?? '',
        detailed: item.detailed ?? '',
      })
    }
  }
  return rows
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
  loadLocal,
  saveLocal,
  selectHoroscopes,
}) => {
  if (!forceNetwork) {
    const local = await loadLocal()
    if (
      local?.date === today &&
      local?.locale === locale &&
      Array.isArray(local?.rows) &&
      local.rows.length
    ) {
      return {
        registry: rowsToRegistry(local.rows),
        source: 'cache',
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

  const registry = rowsToRegistry(rows)
  await saveLocal({
    date: today,
    locale,
    rows: registryToRows(registry),
  })
  return {
    registry,
    source: 'network',
  }
}

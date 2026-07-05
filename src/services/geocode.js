// Birth-place lookup via the Open-Meteo geocoding API (free, no key).
// Only the typed city name leaves the device; the resolved lat/long + IANA
// timezone are then stored locally with the chart (no DOB ever sent).

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search'
// Same bound as the rest of the network layer (supabaseNativeCore uses 6-8s):
// a stalled lookup must not hang the city picker.
const GEOCODE_TIMEOUT_MS = 8000

// The one in-flight lookup. Each new search aborts the previous one so an
// earlier, slower keystroke can never resolve after (and clobber) a newer one.
let activeController = null

export async function searchCities(query, locale = 'en', { timeoutMs = GEOCODE_TIMEOUT_MS } = {}) {
  const q = String(query || '').trim()
  if (q.length < 2) return []

  if (activeController) activeController.abort()
  const controller = new AbortController()
  activeController = controller
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const url = `${GEOCODE_URL}?name=${encodeURIComponent(q)}&count=6&language=${locale === 'uk' ? 'uk' : 'en'}&format=json`
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data?.results)) return []
    return data.results
      .filter((r) => typeof r?.latitude === 'number' && typeof r?.longitude === 'number')
      .map((r) => ({
        name: r.name,
        country: r.country || '',
        admin1: r.admin1 || '',
        lat: r.latitude,
        lon: r.longitude,
        tz: r.timezone || '',
        label: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
      }))
  } catch {
    return []
  } finally {
    clearTimeout(timer)
    if (activeController === controller) activeController = null
  }
}

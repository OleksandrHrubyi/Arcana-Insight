// Birth-place lookup via the Open-Meteo geocoding API (free, no key).
// Only the typed city name leaves the device; the resolved lat/long + IANA
// timezone are then stored locally with the chart (no DOB ever sent).

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search'

export async function searchCities(query, locale = 'en') {
  const q = String(query || '').trim()
  if (q.length < 2) return []
  try {
    const url = `${GEOCODE_URL}?name=${encodeURIComponent(q)}&count=6&language=${locale === 'uk' ? 'uk' : 'en'}&format=json`
    const res = await fetch(url)
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
  }
}

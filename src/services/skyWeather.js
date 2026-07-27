// Tonight's observing conditions — average cloud cover over the coming dark
// hours, from Open-Meteo (free, no key, CORS-enabled; data CC BY 4.0). Cached
// per location for an hour in Preferences; fails soft to null (offline → the
// home simply shows no conditions chip).
import { Preferences } from '@capacitor/preferences'

const CACHE_KEY = 'arcana_sky_weather_v1'
const TTL_MS = 60 * 60 * 1000

const bandOf = (pct) => (pct < 25 ? 'clear' : pct < 60 ? 'partly' : 'cloudy')

// Average cloud cover from ~now (or 20:00) through ~05:00 next day.
const summarize = (json) => {
  const t = json?.hourly?.time
  const c = json?.hourly?.cloud_cover
  if (!Array.isArray(t) || !Array.isArray(c) || t.length !== c.length) return null
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0, 0)
  const from = Math.max(now.getTime(), start.getTime())
  const to = start.getTime() + 9 * 3600000
  let sum = 0
  let n = 0
  for (let i = 0; i < t.length; i += 1) {
    const ts = new Date(t[i]).getTime()
    if (ts >= from && ts <= to && typeof c[i] === 'number') {
      sum += c[i]
      n += 1
    }
  }
  if (!n) return null
  const cloudCoverPct = Math.round(sum / n)
  return { cloudCoverPct, band: bandOf(cloudCoverPct) }
}

export const fetchTonightConditions = async (lat, lon) => {
  const id = `${lat.toFixed(2)},${lon.toFixed(2)}`
  try {
    const { value } = await Preferences.get({ key: CACHE_KEY })
    if (value) {
      const cached = JSON.parse(value)
      if (cached.id === id && cached.data && Date.now() - cached.ts < TTL_MS) return cached.data
    }
  } catch {
    /* ignore cache */
  }
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&hourly=cloud_cover&forecast_days=2&timezone=auto`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = summarize(await res.json())
    if (data) {
      try {
        await Preferences.set({ key: CACHE_KEY, value: JSON.stringify({ id, ts: Date.now(), data }) })
      } catch {
        /* ignore */
      }
    }
    return data
  } catch {
    return null
  }
}

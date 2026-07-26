// Observer location for the astronomy home — the value that makes the screen a
// location-aware tool. Persisted via Capacitor Preferences; GPS detection is
// wired in a later stage (falls back to a manual city pick, fully offline).
import { ref } from 'vue'
import { Preferences } from '@capacitor/preferences'

export const SKY_LOCATION_KEY = 'arcana_sky_location_v1'

// A small bundled set for manual selection — no geocoding service, works offline.
export const SKY_CITIES = Object.freeze([
  { key: 'kyiv', lat: 50.4501, lon: 30.5234 },
  { key: 'warsaw', lat: 52.2297, lon: 21.0122 },
  { key: 'london', lat: 51.5074, lon: -0.1278 },
  { key: 'berlin', lat: 52.52, lon: 13.405 },
  { key: 'paris', lat: 48.8566, lon: 2.3522 },
  { key: 'newYork', lat: 40.7128, lon: -74.006 },
  { key: 'losAngeles', lat: 34.0522, lon: -118.2437 },
  { key: 'tokyo', lat: 35.6762, lon: 139.6503 },
  { key: 'dubai', lat: 25.2048, lon: 55.2708 },
  { key: 'sydney', lat: -33.8688, lon: 151.2093 },
])

const DEFAULT = Object.freeze({ lat: 50.4501, lon: 30.5234, cityKey: 'kyiv', source: 'default' })

// Module-level singleton (project convention — ref(), not Pinia).
export const skyLocation = ref({ ...DEFAULT })

const persist = async (value) => {
  try {
    await Preferences.set({ key: SKY_LOCATION_KEY, value: JSON.stringify(value) })
  } catch {
    /* preview / private-mode — in-memory value still works this session */
  }
}

export const loadSkyLocation = async () => {
  try {
    const { value } = await Preferences.get({ key: SKY_LOCATION_KEY })
    if (value) {
      const parsed = JSON.parse(value)
      if (typeof parsed?.lat === 'number' && typeof parsed?.lon === 'number') {
        skyLocation.value = parsed
      }
    }
  } catch {
    /* keep default */
  }
  return skyLocation.value
}

export const setSkyLocationCity = (cityKey) => {
  const city = SKY_CITIES.find((c) => c.key === cityKey)
  if (!city) return
  skyLocation.value = { lat: city.lat, lon: city.lon, cityKey: city.key, source: 'city' }
  void persist(skyLocation.value)
}

export const setSkyLocationCoords = (lat, lon, source = 'gps') => {
  skyLocation.value = { lat, lon, cityKey: null, source }
  void persist(skyLocation.value)
}

// Best-effort detection. Stage 3 routes this through @capacitor/geolocation for
// native iOS; the browser API keeps preview + web working meanwhile. Resolves to
// true on success, false if unavailable/denied (caller keeps the current value).
export const detectSkyLocation = () =>
  new Promise((resolve) => {
    const geo = typeof navigator !== 'undefined' ? navigator.geolocation : null
    if (!geo) return resolve(false)
    geo.getCurrentPosition(
      (pos) => {
        setSkyLocationCoords(pos.coords.latitude, pos.coords.longitude, 'gps')
        resolve(true)
      },
      () => resolve(false),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    )
  })

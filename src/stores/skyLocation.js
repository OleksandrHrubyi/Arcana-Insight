// Observer location for the astronomy home — the value that makes the screen a
// location-aware tool. Persisted via Capacitor Preferences; GPS detection is
// wired in a later stage (falls back to a manual city pick, fully offline).
import { ref } from 'vue'
import { Preferences } from '@capacitor/preferences'
import { Geolocation } from '@capacitor/geolocation'
import {
  normalizeFavorites,
  isFavorite as isFavoriteCore,
  canSaveFavorite as canSaveFavoriteCore,
  applyFavoriteToggle,
} from 'src/helpers/skyFavoritesCore.js'

export const SKY_LOCATION_KEY = 'arcana_sky_location_v1'
export const SKY_FAVORITES_KEY = 'arcana_sky_favorites_v1'

// Saved observing places. Free users can keep 1; Premium unlocks unlimited (the
// gate lives in skyFavoritesCore — the store just holds/persists). This is a NEW
// capability: picking any city each time stays free and unchanged.
export { FREE_FAVORITE_LIMIT, favoriteId } from 'src/helpers/skyFavoritesCore.js'

export const skyFavorites = ref([])

// A small bundled set for manual selection — no geocoding service, works offline.
// `timeZone` is the city's IANA id: the sky screens compute and print the day on
// the PLACE's clock, and longitude alone would give solar, not civil, time.
export const SKY_CITIES = Object.freeze([
  { key: 'kyiv', lat: 50.4501, lon: 30.5234, timeZone: 'Europe/Kyiv' },
  { key: 'warsaw', lat: 52.2297, lon: 21.0122, timeZone: 'Europe/Warsaw' },
  { key: 'london', lat: 51.5074, lon: -0.1278, timeZone: 'Europe/London' },
  { key: 'berlin', lat: 52.52, lon: 13.405, timeZone: 'Europe/Berlin' },
  { key: 'paris', lat: 48.8566, lon: 2.3522, timeZone: 'Europe/Paris' },
  { key: 'newYork', lat: 40.7128, lon: -74.006, timeZone: 'America/New_York' },
  { key: 'losAngeles', lat: 34.0522, lon: -118.2437, timeZone: 'America/Los_Angeles' },
  { key: 'tokyo', lat: 35.6762, lon: 139.6503, timeZone: 'Asia/Tokyo' },
  { key: 'dubai', lat: 25.2048, lon: 55.2708, timeZone: 'Asia/Dubai' },
  { key: 'sydney', lat: -33.8688, lon: 151.2093, timeZone: 'Australia/Sydney' },
])

export const cityTimeZone = (cityKey) => SKY_CITIES.find((c) => c.key === cityKey)?.timeZone ?? null

const DEFAULT = Object.freeze({
  lat: 50.4501,
  lon: 30.5234,
  cityKey: 'kyiv',
  timeZone: 'Europe/Kyiv',
  source: 'default',
})

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
        // Values persisted before observer-timezone carry no zone — backfill it
        // from the city so an existing install gets the right day, not the device's.
        skyLocation.value = parsed.timeZone
          ? parsed
          : { ...parsed, timeZone: cityTimeZone(parsed.cityKey) }
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
  skyLocation.value = {
    lat: city.lat,
    lon: city.lon,
    cityKey: city.key,
    timeZone: city.timeZone,
    source: 'city',
  }
  void persist(skyLocation.value)
}

// GPS coordinates carry no zone id: the device is AT the place, so its own zone
// is the right one (resolveObserverZone applies that rule).
export const setSkyLocationCoords = (lat, lon, source = 'gps') => {
  skyLocation.value = { lat, lon, cityKey: null, timeZone: null, source }
  void persist(skyLocation.value)
}

const persistFavorites = async (value) => {
  try {
    await Preferences.set({ key: SKY_FAVORITES_KEY, value: JSON.stringify(value) })
  } catch {
    /* in-memory only this session */
  }
}

export const loadSkyFavorites = async () => {
  try {
    const { value } = await Preferences.get({ key: SKY_FAVORITES_KEY })
    if (value) skyFavorites.value = normalizeFavorites(JSON.parse(value))
  } catch {
    /* keep empty */
  }
  return skyFavorites.value
}

export const canSaveFavorite = (hasPremium) => canSaveFavoriteCore(skyFavorites.value, hasPremium)

export const isFavorite = (loc) => isFavoriteCore(skyFavorites.value, loc)

// Returns 'added' | 'removed' | 'blocked' (free limit reached). Never throws.
export const toggleSkyFavorite = (loc, hasPremium) => {
  const { list, result } = applyFavoriteToggle(skyFavorites.value, loc, hasPremium)
  if (result !== 'blocked') {
    skyFavorites.value = list
    void persistFavorites(skyFavorites.value)
  }
  return result
}

// Native GPS via @capacitor/geolocation (its web implementation uses the browser
// Geolocation API, so preview + web keep working). Resolves true on success,
// false if unavailable/denied — the caller keeps the current location.
export const detectSkyLocation = async () => {
  try {
    let perm = await Geolocation.checkPermissions()
    if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
      perm = await Geolocation.requestPermissions({ permissions: ['location'] })
    }
    if (perm.location === 'denied' && perm.coarseLocation === 'denied') return false
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 600000,
    })
    setSkyLocationCoords(pos.coords.latitude, pos.coords.longitude, 'gps')
    return true
  } catch {
    return false
  }
}

<template>
  <q-page class="skh">
    <div class="skh-sky" :style="skyStyle" aria-hidden="true"></div>
    <div class="skh-fade" aria-hidden="true"></div>
    <canvas ref="fxCanvas" class="skh-fx" aria-hidden="true"></canvas>
    <div class="skh-particles" aria-hidden="true">
      <span v-for="p in particles" :key="p.id" class="skh-particle" :style="p.style"></span>
    </div>

    <div v-if="loading" class="skh-loading"><q-spinner color="white" size="34px" /></div>

    <section v-else-if="sky" class="skh-screen">
      <header class="skh-head">
        <button type="button" class="skh-loc hit-44" @click="openLocationSheet">
          <span class="skh-loc__dot"></span>
          <span class="skh-loc__name">{{ locationLabel }}</span>
          <q-icon name="expand_more" size="15px" class="skh-loc__caret" />
        </button>
        <div class="skh-kick">{{ tt('skyHome.kicker') }} · {{ formatToday }}</div>
        <div class="skh-cond-slot">
          <button
            v-if="conditions"
            type="button"
            class="skh-cond"
            :class="`skh-cond--${conditions.band}`"
            @click="openCondSheet"
          >
            <span class="skh-cond__dot"></span>
            {{ conditionsLabel }} · {{ conditions.cloudCoverPct }}% {{ tt('skyHome.cloudLabel') }}
          </button>
        </div>
      </header>

      <div class="skh-hero">
        <button
          type="button"
          class="skh-moonwrap"
          :aria-label="moonAria"
          @click="openMoonSheet"
        >
          <div class="skh-moonhalo" aria-hidden="true"></div>
          <canvas ref="moonCanvas" class="skh-moon"></canvas>
        </button>
        <div class="skh-caption">
          <div class="skh-phase">{{ tt(`astro.phases.${sky.moonPhaseKey}`) }}</div>
          <div class="skh-sub">
            {{ sky.illuminationPct }}% {{ tt('skyHome.illuminated') }}<template v-if="nextFullMoon">
              · <span class="skh-accent">{{ tt('skyHome.events.fullMoon') }} {{ untilLabel(nextFullMoon.daysUntil) }}</span></template>
          </div>
          <div class="skh-rs">
            {{ tt('skyHome.moonRises') }} {{ formatTime(moonRS.rise) }} ·
            {{ tt('skyHome.moonSets') }} {{ formatTime(moonRS.set) }}
          </div>
        </div>

        <div class="skh-essentials">
          <button type="button" class="skh-fact" @click="openMoonSheet">
            <span class="skh-fact__label">{{ tt('skyHome.moonTitle') }}</span>
            <span class="skh-fact__val">{{ moonNowLabel }}</span>
          </button>
          <button type="button" class="skh-fact" @click="openSunSheet">
            <span class="skh-fact__label">{{ tt('skyHome.sunTitle') }}</span>
            <span class="skh-fact__val">{{ formatTime(sun.sunset) }}</span>
          </button>
          <button type="button" class="skh-fact" @click="openSky">
            <span class="skh-fact__label">{{ tt('skyHome.visibleShort') }}</span>
            <span class="skh-fact__val">
              <template v-if="topVisible">
                {{ tt(`astro.planets.${topVisible.planetKey}`) }} · {{ tt(`skyHome.compass.${topVisible.azimuthKey}`) }}
              </template>
              <template v-else>—</template>
            </span>
          </button>
        </div>
      </div>

      <footer class="skh-foot">
        <button
          v-if="tonightHighlight"
          type="button"
          class="skh-more skh-more--event"
          @click="openHighlight"
        >
          <span class="skh-event__dot"></span>
          <span class="skh-event__name">{{ tt(`skyHome.events.${tonightHighlight.key}`) }}</span>
          <span class="skh-event__when">· {{ untilLabel(tonightHighlight.daysUntil) }}</span>
          <q-icon name="chevron_right" size="18px" />
        </button>
        <button v-else type="button" class="skh-more" @click="openSky">
          <span>{{ tt('skyHome.openSky') }}</span>
          <q-icon name="chevron_right" size="18px" />
        </button>
      </footer>
    </section>

    <!-- Location picker -->
    <q-dialog v-model="locationOpen" position="bottom">
      <q-card class="skh-sheet">
        <div class="skh-sheet__title">{{ tt('skyHome.locationTitle') }}</div>
        <button type="button" class="skh-sheet__detect" @click="useMyLocation">
          <q-icon name="my_location" size="18px" />
          <span>{{ tt('skyHome.locationDetect') }}</span>
        </button>
        <div class="skh-sheet__list">
          <div v-for="c in cities" :key="c.key" class="skh-sheet__cityrow">
            <button
              type="button"
              class="skh-sheet__city"
              :class="{ 'skh-sheet__city--active': loc.cityKey === c.key }"
              @click="pickCity(c.key)"
            >
              {{ tt(`skyHome.cities.${c.key}`) }}
            </button>
            <button
              type="button"
              class="skh-sheet__star"
              :class="{ 'skh-sheet__star--on': isCityFavorite(c) }"
              :aria-label="tt('skyHome.savePlace')"
              @click="onToggleFavorite(c)"
            >
              <q-icon :name="isCityFavorite(c) ? 'star' : 'star_border'" size="18px" />
            </button>
          </div>
        </div>
        <div class="skh-sheet__hint">{{ tt('skyHome.savedPlacesHint') }}</div>
      </q-card>
    </q-dialog>

    <!-- Moon detail -->
    <q-dialog v-model="moonSheetOpen" position="bottom">
      <q-card v-if="moonDetail" class="skh-sheet">
        <div class="skh-sheet__title">
          {{ tt(`astro.phases.${moonDetail.phaseKey}`) }} · {{ moonDetail.illuminationPct }}%
        </div>
        <div class="skh-rows">
          <div class="skh-row">
            <span>{{ tt('skyHome.distance') }}</span>
            <span>{{ formatKm(moonDetail.distanceKm) }}</span>
          </div>
          <div class="skh-row">
            <span>{{ tt('skyHome.apparentSize') }}</span>
            <span>{{ moonDetail.angularDiameterDeg.toFixed(2) }}°</span>
          </div>
          <div class="skh-row">
            <span>{{ tt('skyHome.libration') }}</span>
            <span>{{ librationLabel }}</span>
          </div>
          <div v-if="moonDetail.nextApsis" class="skh-row">
            <span>{{ apsisLabel }}</span>
            <span>{{ untilLabel(moonDetail.nextApsis.daysUntil) }}</span>
          </div>
        </div>
        <div class="skh-sheet__sub">{{ tt('skyHome.nextPhasesTitle') }}</div>
        <div class="skh-rows">
          <div v-for="ph in moonDetail.nextPhases" :key="ph.key" class="skh-row">
            <span>{{ tt(`skyHome.events.${ph.key}`) }}</span>
            <span class="skh-row__right">
              <span class="skh-row__accent">{{ untilLabel(ph.daysUntil) }} · {{ formatShort(ph.date) }}</span>
              <button
                type="button"
                class="skh-bell"
                :class="{ 'skh-bell--on': isScheduled(ph) }"
                :aria-label="tt('skyHome.notifyAria')"
                @click="toggleReminder(ph)"
              >
                <q-icon :name="isScheduled(ph) ? 'notifications_active' : 'notifications_none'" size="18px" />
              </button>
            </span>
          </div>
        </div>
      </q-card>
    </q-dialog>

    <!-- Tonight's cloud cover -->
    <q-dialog v-model="condSheetOpen" position="bottom">
      <q-card v-if="conditions" class="skh-sheet">
        <div class="skh-sheet__title">{{ tt('skyHome.conditionsTitle') }}</div>
        <div class="skh-cloudrows">
          <div v-for="h in conditions.hours" :key="h.t" class="skh-cloudrow">
            <span class="skh-cloudrow__t">{{ formatTime(new Date(h.t)) }}</span>
            <span class="skh-cloudrow__bar"><span :style="{ width: h.pct + '%' }"></span></span>
            <span class="skh-cloudrow__pct">{{ h.pct }}%</span>
          </div>
        </div>
        <div v-if="conditions.best" class="skh-sheet__note">
          {{ tt('skyHome.bestWindow', { t: formatTime(new Date(conditions.best.t)) }) }} · {{ conditions.best.pct }}%
        </div>
      </q-card>
    </q-dialog>

    <!-- Sun detail -->
    <q-dialog v-model="sunSheetOpen" position="bottom">
      <q-card v-if="sunDetail" class="skh-sheet">
        <div class="skh-sheet__title">{{ tt('skyHome.sunTitle') }}</div>
        <div class="skh-rows">
          <div class="skh-row">
            <span>{{ tt('skyHome.dawn') }}</span><span>{{ formatTime(sunDetail.dawn) }}</span>
          </div>
          <div class="skh-row">
            <span>{{ tt('skyHome.sunrise') }}</span><span>{{ formatTime(sunDetail.sunrise) }}</span>
          </div>
          <div class="skh-row">
            <span>{{ tt('skyHome.goldenHour') }}</span><span>{{ formatTime(sunDetail.goldenEveningStart) }}</span>
          </div>
          <div class="skh-row">
            <span>{{ tt('skyHome.sunset') }}</span><span>{{ formatTime(sunDetail.sunset) }}</span>
          </div>
          <div class="skh-row">
            <span>{{ tt('skyHome.darkShort') }}</span><span>{{ formatTime(sunDetail.dusk) }}</span>
          </div>
          <div v-if="sunDetail.dayLengthMs" class="skh-row">
            <span>{{ tt('skyHome.dayLength') }}</span><span>{{ dayLengthLabel }}</span>
          </div>
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { tapHaptic } from 'src/helpers/haptics.js'
import { useRouter } from 'vue-router'
import { t, currentLocale } from 'src/i18n'
import {
  computeSkyForDate,
  computeSunTimes,
  computeVisibleTonight,
  computeMoonDetail,
  computeSunDetail,
  computeUpcomingSkyEvents,
  findUpcomingLunarEvents,
  riseSetForLocalDay,
  horizontalPosition,
  azimuthToCompassKey,
  makeObserver,
} from 'src/helpers/skyCore.js'
import { drawMoon, onMoonReady } from 'src/helpers/moonRender.js'
import { createShootingStars } from 'src/helpers/starfield.js'
import {
  scheduleSkyEvent,
  cancelSkyEvent,
  getScheduledIds,
  notifId,
} from 'src/services/skyNotifications.js'
import { fetchTonightConditions } from 'src/services/skyWeather.js'
import { buildWidgetSnapshot } from 'src/helpers/widgetSnapshotCore.js'
import { syncWidgetSnapshot } from 'src/services/widgetBridge.js'
import milkywayUrl from 'src/assets/images/milkyway.webp'
import {
  skyLocation,
  loadSkyLocation,
  detectSkyLocation,
  setSkyLocationCity,
  SKY_CITIES,
  loadSkyFavorites,
  toggleSkyFavorite,
  isFavorite,
} from 'src/stores/skyLocation.js'
import { usePremiumAccess } from 'src/stores/premiumAccess.js'

const locale = computed(() => currentLocale.value || 'en')
const tt = (key, vars) => {
  let s = t(locale.value, key)
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v)
  return s
}
const router = useRouter()

const loading = ref(true)
const sky = ref(null)
const moonRS = ref({ rise: null, set: null })
const sun = ref({ sunrise: null, sunset: null, darkStart: null })
const visible = ref([])
const nextFullMoon = ref(null)
const eventFeed = ref([])
const moonDetail = ref(null)
const sunDetail = ref(null)
const moonPos = ref({ altitude: 0, azimuth: 0 })
const conditions = ref(null)
const moonCanvas = ref(null)
const fxCanvas = ref(null)
const locationOpen = ref(false)
const moonSheetOpen = ref(false)
const sunSheetOpen = ref(false)
const condSheetOpen = ref(false)
const scheduledIds = ref(new Set())
const cities = SKY_CITIES
const loc = skyLocation
const skyStyle = { backgroundImage: `url(${milkywayUrl})` }

const topVisible = computed(() => visible.value[0] || null)

// Tonight's headline event — the single most notable thing coming up in the sky.
// Ranks by intrinsic notability, discounted by how far off it is, and skips the
// full moon (already in the caption) and minor phases so the line always adds
// something new. Falls back to null → footer shows the plain "Tonight's sky".
const highlightWeight = (ev) => {
  if (ev.type === 'lunarEclipse') return 100
  if (ev.type === 'solarEclipse') return 95
  if (ev.type === 'meteor') return 70
  if (ev.type === 'apsis' && ev.key === 'perigee') return 55
  if (ev.type === 'moonPhase' && ev.key === 'newMoon') return 48
  if (ev.type === 'season') return 40
  return null // fullMoon (caption), quarters, apogee — skip
}
const tonightHighlight = computed(() => {
  let best = null
  let bestScore = -Infinity
  for (const ev of eventFeed.value) {
    if (ev.daysUntil > 60) continue
    const w = highlightWeight(ev)
    if (w == null) continue
    const score = w - ev.daysUntil * 1.1
    if (score > bestScore) {
      bestScore = score
      best = ev
    }
  }
  return best
})

// Floating luminous motes — the same ambient "living sky" as the horoscope
// screen (HoroscopeComponent). CSS-driven; skipped when reduced-motion is on.
const particles = ref([])
const buildParticles = () => {
  const reduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    particles.value = []
    return
  }
  const colors = ['rgba(255,255,255,0.9)', 'rgba(159,216,246,0.8)', 'rgba(255,220,180,0.65)']
  const out = []
  for (let i = 0; i < 16; i += 1) {
    // Slow, gentle drift — calm ambience, not a swarm.
    const dur = 20 + Math.random() * 22
    out.push({
      id: i,
      style: {
        '--x': (Math.random() * 100).toFixed(2),
        '--y': (Math.random() * 100).toFixed(2),
        '--s': (1.2 + Math.random() * 2.6).toFixed(2),
        '--blur': (Math.random() * 1.2).toFixed(2),
        '--dur': dur.toFixed(2),
        '--delay': (-Math.random() * dur).toFixed(2),
        '--dx': (-16 + Math.random() * 32).toFixed(2),
        '--dy': (-(55 + Math.random() * 95)).toFixed(2),
        '--o': (0.18 + Math.random() * 0.45).toFixed(2),
        '--c': colors[Math.floor(Math.random() * colors.length)],
      },
    })
  }
  particles.value = out
}

let Astronomy = null
let enginePromise = null
const loadEngine = async () => {
  if (!enginePromise) enginePromise = import('astronomy-engine')
  const mod = await enginePromise
  return mod?.default || mod
}

const recompute = () => {
  if (!Astronomy) return
  const now = new Date()
  const observer = makeObserver(Astronomy, loc.value.lat, loc.value.lon)
  sky.value = computeSkyForDate(Astronomy, now)
  moonRS.value = riseSetForLocalDay(Astronomy, 'moon', observer, now)
  sun.value = computeSunTimes(Astronomy, observer, now)
  visible.value = computeVisibleTonight(Astronomy, observer, now)
  nextFullMoon.value = findUpcomingLunarEvents(Astronomy, now).fullMoon
  eventFeed.value = computeUpcomingSkyEvents(Astronomy, now, { horizonDays: 120, limit: 12 })
  moonDetail.value = computeMoonDetail(Astronomy, now)
  sunDetail.value = computeSunDetail(Astronomy, observer, now)
  moonPos.value = horizontalPosition(Astronomy, 'moon', observer, now)
  syncWidget()
}

// Tonight's observing conditions (cloud cover) — networked, non-blocking.
const loadConditions = async () => {
  conditions.value = await fetchTonightConditions(loc.value.lat, loc.value.lon)
}

// Push the current moon to the home-screen widget (fire-and-forget, native-only).
const syncWidget = () => {
  if (!sky.value) return
  const s = sky.value
  const sub = nextFullMoon.value
    ? `${tt('skyHome.events.fullMoon')} ${untilLabel(nextFullMoon.value.daysUntil)}`
    : `${tt('skyHome.moonRises')} ${formatTime(moonRS.value.rise)} · ${tt('skyHome.moonSets')} ${formatTime(moonRS.value.set)}`
  void syncWidgetSnapshot(
    buildWidgetSnapshot({
      moonPhaseKey: s.moonPhaseKey,
      moonPhaseLabel: tt(`astro.phases.${s.moonPhaseKey}`),
      illuminationPct: s.illuminationPct,
      subLine: sub,
      locationLabel: locationLabel.value,
    }),
  )
}

const redrawMoon = () => {
  if (!sky.value) return
  drawMoon(moonCanvas.value, sky.value.illumination, sky.value.waxing, { detail: true })
}
const offMoonReady = onMoonReady(redrawMoon)

let skyFx = null
let resizeRaf = 0
const onResize = () => {
  cancelAnimationFrame(resizeRaf)
  resizeRaf = requestAnimationFrame(() => {
    skyFx?.resize()
    redrawMoon()
  })
}
// Keep the readings live: recompute whenever the app returns to the foreground
// (a new "now", and a possible date rollover), then repaint the moon.
const onVisible = () => {
  if (document.visibilityState !== 'visible') return
  recompute()
  void loadConditions()
  void nextTick(() => redrawMoon())
}

const openMoonSheet = () => {
  void tapHaptic()
  moonSheetOpen.value = true
}
const openSunSheet = () => {
  void tapHaptic()
  sunSheetOpen.value = true
}
const openCondSheet = () => {
  void tapHaptic()
  condSheetOpen.value = true
}
const openLocationSheet = () => {
  void tapHaptic()
  locationOpen.value = true
}

const pickCity = (cityKey) => {
  void tapHaptic()
  setSkyLocationCity(cityKey)
  locationOpen.value = false
}

const { hasPremiumAccess } = usePremiumAccess()
const cityToLoc = (c) => ({ lat: c.lat, lon: c.lon, cityKey: c.key })
const isCityFavorite = (c) => isFavorite(cityToLoc(c))
const onToggleFavorite = (c) => {
  void tapHaptic()
  const result = toggleSkyFavorite(cityToLoc(c), hasPremiumAccess.value)
  if (result === 'blocked') {
    // Free users keep one saved place; more is a premium convenience.
    locationOpen.value = false
    router.push({ name: 'premium', query: { source: 'sky_favorites' } })
  }
}
const useMyLocation = async () => {
  void tapHaptic()
  await detectSkyLocation()
  locationOpen.value = false
}

const locationLabel = computed(() =>
  loc.value.cityKey ? tt(`skyHome.cities.${loc.value.cityKey}`) : tt('skyHome.myLocation'),
)
const conditionsLabel = computed(() => {
  const band = conditions.value?.band
  if (band === 'clear') return tt('skyHome.condClear')
  if (band === 'cloudy') return tt('skyHome.condCloudy')
  return tt('skyHome.condPartly')
})
const formatToday = computed(() => {
  try {
    return new Intl.DateTimeFormat(locale.value, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(new Date())
  } catch {
    return new Date().toDateString()
  }
})
const formatTime = (date) => {
  if (!date) return '—'
  try {
    return new Intl.DateTimeFormat(locale.value, { hour: '2-digit', minute: '2-digit' }).format(date)
  } catch {
    return '—'
  }
}
const untilLabel = (days) => {
  if (days <= 0) return tt('skyHome.today')
  if (days === 1) return tt('skyHome.tomorrow')
  return tt('skyHome.inDays', { n: days })
}
const formatShort = (date) => {
  if (!date) return '—'
  try {
    return new Intl.DateTimeFormat(locale.value, { month: 'short', day: 'numeric' }).format(date)
  } catch {
    return date.toDateString()
  }
}
const formatKm = (km) => {
  try {
    return `${new Intl.NumberFormat(locale.value).format(km)} ${tt('skyHome.kmAbbr')}`
  } catch {
    return `${km} ${tt('skyHome.kmAbbr')}`
  }
}

// "Moon now": its current altitude + direction if it's up, otherwise the rise.
const moonNowLabel = computed(() => {
  const alt = Math.round(moonPos.value.altitude)
  if (alt > 0) return `${alt}° ${tt(`skyHome.compass.${azimuthToCompassKey(moonPos.value.azimuth)}`)}`
  if (moonRS.value.rise) return `↑ ${formatTime(moonRS.value.rise)}`
  return tt('skyHome.belowHorizon')
})
const moonAria = computed(() =>
  sky.value
    ? `${tt(`astro.phases.${sky.value.moonPhaseKey}`)}, ${sky.value.illuminationPct}% ${tt('skyHome.illuminated')}`
    : tt('skyHome.moonTitle'),
)
const librationLabel = computed(() => {
  if (!moonDetail.value) return ''
  const { librationLat, librationLon } = moonDetail.value
  const ns = librationLat >= 0 ? 'N' : 'S'
  const ew = librationLon >= 0 ? 'E' : 'W'
  return `${Math.abs(librationLat)}° ${ns} · ${Math.abs(librationLon)}° ${ew}`
})
const apsisLabel = computed(() =>
  moonDetail.value?.nextApsis
    ? tt(`skyHome.${moonDetail.value.nextApsis.kind === 'perigee' ? 'perigeeShort' : 'apogeeShort'}`)
    : '',
)
const dayLengthLabel = computed(() => {
  const d = sunDetail.value
  if (!d?.dayLengthMs) return '—'
  const h = Math.floor(d.dayLengthMs / 3600000)
  const m = Math.round((d.dayLengthMs % 3600000) / 60000)
  let s = `${h}${tt('skyHome.hourAbbr')} ${m}${tt('skyHome.minAbbr')}`
  if (typeof d.dayLengthDeltaMs === 'number') {
    const dm = Math.round(d.dayLengthDeltaMs / 60000)
    if (dm !== 0) s += ` (${dm > 0 ? '+' : '−'}${Math.abs(dm)} ${tt('skyHome.minAbbr')})`
  }
  return s
})

const openSky = () => {
  void tapHaptic()
  router.push({ name: 'sky', query: { source: 'sky_home' } })
}
const openHighlight = () => {
  void tapHaptic()
  const ev = tonightHighlight.value
  if (!ev) return router.push({ name: 'sky', query: { source: 'sky_home' } })
  router.push({ name: 'sky', query: { source: 'sky_home', focus: `${ev.type}:${ev.key}` } })
}

// ── Event reminders (local notifications) ──
const phaseEventKey = (ph) => `moon-${ph.key}-${ph.date.toISOString().slice(0, 10)}`
const isScheduled = (ph) => scheduledIds.value.has(notifId(phaseEventKey(ph)))
const refreshScheduled = async () => {
  scheduledIds.value = await getScheduledIds()
}
const toggleReminder = async (ph) => {
  void tapHaptic()
  const key = phaseEventKey(ph)
  if (isScheduled(ph)) {
    await cancelSkyEvent(key)
  } else {
    await scheduleSkyEvent({
      key,
      title: tt(`skyHome.events.${ph.key}`),
      body: tt('skyHome.notifyBody'),
      at: ph.date,
    })
  }
  await refreshScheduled()
}
watch(moonSheetOpen, (open) => {
  if (open) void refreshScheduled()
})

watch(
  () => loc.value,
  () => {
    recompute()
    void loadConditions()
    void nextTick(() => redrawMoon())
  },
  { deep: true },
)

onMounted(async () => {
  try {
    await loadSkyLocation()
    void loadSkyFavorites()
    Astronomy = await loadEngine()
    recompute()
  } catch (e) {
    console.error('[SkyHomePage] load failed', e)
  } finally {
    loading.value = false
  }
  buildParticles()
  void loadConditions()
  await nextTick()
  redrawMoon()
  skyFx = createShootingStars(fxCanvas.value)
  skyFx.start()
  window.addEventListener('resize', onResize)
  document.addEventListener('visibilitychange', onVisible)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  document.removeEventListener('visibilitychange', onVisible)
  cancelAnimationFrame(resizeRaf)
  skyFx?.stop()
  offMoonReady?.()
})
</script>

<style scoped lang="scss">
.skh {
  position: relative;
  height: 100vh;
  height: 100dvh;
  color: #e9edf4;
  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
  overflow: hidden;
}

/* Background layers */
.skh-sky {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-color: #050d15;
  background-size: cover;
  background-position: 50% 46%;
  transform: scale(1.18);
  animation: skh-drift 42s ease-in-out infinite alternate;
  will-change: transform;
}
@keyframes skh-drift {
  0% {
    transform: scale(1.18) translate(-2.6%, -2.1%);
  }
  100% {
    transform: scale(1.27) translate(2.9%, 3.7%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .skh-sky {
    animation: none;
    transform: scale(1.16);
  }
}
.skh-fade {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    linear-gradient(
      180deg,
      rgba(7, 19, 29, 0.62) 0%,
      rgba(7, 19, 29, 0) 22%,
      rgba(7, 19, 29, 0) 52%,
      rgba(5, 13, 21, 0.86) 88%,
      #050d15 100%
    ),
    radial-gradient(120% 55% at 50% 40%, rgba(7, 19, 29, 0) 42%, rgba(7, 19, 29, 0.4) 100%),
    linear-gradient(0deg, rgba(12, 38, 56, 0.14), rgba(12, 38, 56, 0.14));
}
.skh-fx,
.skh-particles {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}
.skh-particles {
  overflow: hidden;
}
.skh-particle {
  position: absolute;
  left: calc(var(--x) * 1%);
  top: calc(var(--y) * 1%);
  width: calc(var(--s) * 1px);
  height: calc(var(--s) * 1px);
  border-radius: 999px;
  background: radial-gradient(circle, var(--c) 0%, rgba(255, 255, 255, 0) 72%);
  mix-blend-mode: screen;
  filter: blur(calc(var(--blur) * 1px));
  will-change: transform, opacity;
  transform: translate3d(0, 0, 0);
  opacity: 0;
}
@media (prefers-reduced-motion: no-preference) {
  .skh-particle {
    animation:
      skhParticleMove calc(var(--dur) * 1s) linear infinite,
      skhParticleFade calc(var(--dur) * 1s) ease-in-out infinite;
    animation-delay: calc(var(--delay) * 1s), calc(var(--delay) * 1s);
  }
  @keyframes skhParticleMove {
    from {
      transform: translate3d(0, 0, 0);
    }
    to {
      transform: translate3d(calc(var(--dx) * 1px), calc(var(--dy) * 1px), 0);
    }
  }
  @keyframes skhParticleFade {
    0% {
      opacity: 0;
    }
    15% {
      opacity: var(--o);
    }
    85% {
      opacity: var(--o);
    }
    100% {
      opacity: 0;
    }
  }
}

.skh-loading {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: center;
  padding-top: 40vh;
}

/* Single screen — everything fits, no scroll */
.skh-screen {
  position: relative;
  z-index: 2;
  height: 100%;
  max-width: 520px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  // Top: clear the notch (mirrors the classic home). Bottom: clear the floating nav pill.
  padding: max(52px, calc(env(safe-area-inset-top) + 12px)) 22px calc(104px + env(safe-area-inset-bottom));
}

.skh-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 0 0 auto;
}
.skh-loc {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 15px;
  border-radius: 999px;
  border: 1px solid rgba(150, 180, 220, 0.16);
  background: rgba(10, 18, 30, 0.4);
  backdrop-filter: blur(6px);
  color: rgba(226, 236, 250, 0.9);
  font-size: 13px;
  transition: transform 0.12s ease;
}
.skh-loc:active {
  transform: scale(0.97);
}
.skh-loc__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #91bcff;
  box-shadow: 0 0 8px #91bcff;
}
.skh-loc__caret {
  opacity: 0.6;
}
.skh-kick {
  margin-top: 10px;
  font-size: 10.5px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: rgba(170, 192, 220, 0.62);
  text-align: center;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.6);
}
.skh-cond-slot {
  margin-top: 8px;
  min-height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.skh-cond {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid rgba(150, 180, 220, 0.14);
  background: rgba(8, 14, 24, 0.4);
  backdrop-filter: blur(6px);
  font-size: 12px;
  color: rgba(214, 225, 242, 0.82);
  font-family: inherit;
  cursor: pointer;
  transition: transform 0.12s ease;
}
.skh-cond:active {
  transform: scale(0.97);
}
.skh-cloudrows {
  display: grid;
  gap: 8px;
  margin-top: 2px;
}
.skh-cloudrow {
  display: grid;
  grid-template-columns: 52px 1fr 40px;
  align-items: center;
  gap: 10px;
}
.skh-cloudrow__t {
  font-size: 12px;
  color: rgba(200, 214, 240, 0.66);
  font-variant-numeric: tabular-nums;
}
.skh-cloudrow__bar {
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.skh-cloudrow__bar > span {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(127, 200, 255, 0.7), rgba(150, 172, 200, 0.85));
}
.skh-cloudrow__pct {
  font-size: 12px;
  color: rgba(233, 240, 250, 0.9);
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.skh-sheet__note {
  margin-top: 14px;
  font-size: 13px;
  color: rgba(145, 188, 255, 0.9);
  font-variant-numeric: tabular-nums;
}
.skh-cond__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.skh-cond--clear .skh-cond__dot {
  background: #7fdca0;
  box-shadow: 0 0 8px rgba(127, 220, 160, 0.7);
}
.skh-cond--partly .skh-cond__dot {
  background: #e2c07a;
  box-shadow: 0 0 8px rgba(226, 192, 122, 0.6);
}
.skh-cond--cloudy .skh-cond__dot {
  background: rgba(150, 172, 200, 0.7);
}

/* Hero group grows to fill and stays centered */
.skh-hero {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
}
.skh-moonwrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  // Smooth, weighted press + release (no snap) — matches the iOS feel.
  transition: transform 0.32s cubic-bezier(0.22, 0.61, 0.36, 1);
}
.skh-moonwrap:active {
  transform: scale(0.965);
  transition-duration: 0.14s;
}
.skh-moonhalo {
  position: absolute;
  width: 150%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(4, 7, 12, 0.5) 30%, rgba(4, 7, 12, 0) 68%);
  pointer-events: none;
}
.skh-moon {
  position: relative;
  // Bound by BOTH width and height so the whole screen fits with breathing room.
  width: min(58vw, 30vh, 272px);
  aspect-ratio: 1;
  filter: drop-shadow(0 12px 50px rgba(150, 180, 230, 0.32));
  // Very gentle suspended float so the hero feels alive, not pinned — subtle
  // and slow (Apple-calm), never a bob.
  animation: skh-moonfloat 10s ease-in-out infinite alternate;
  will-change: transform;
}
@keyframes skh-moonfloat {
  0% {
    transform: translateY(-3px);
  }
  100% {
    transform: translateY(3px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .skh-moon {
    animation: none;
    transform: none;
  }
}
.skh-caption {
  text-align: center;
  text-shadow: 0 1px 12px rgba(0, 0, 0, 0.7);
}
.skh-phase {
  font-size: 29px;
  font-weight: 300;
  letter-spacing: -0.01em;
  line-height: 1.05;
}
.skh-sub {
  margin-top: 8px;
  font-size: 13.5px;
  font-weight: 300;
  color: rgba(200, 218, 244, 0.75);
}
.skh-rs {
  margin-top: 5px;
  font-size: 12.5px;
  color: rgba(150, 178, 214, 0.6);
  font-variant-numeric: tabular-nums;
}
.skh-accent {
  color: #91bcff;
}

/* Compact essentials row */
.skh-essentials {
  display: flex;
  gap: 8px;
  width: 100%;
  max-width: 420px;
}
.skh-fact {
  flex: 1 1 0;
  min-width: 0;
  display: grid;
  gap: 3px;
  justify-items: center;
  text-align: center;
  padding: 10px 8px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    radial-gradient(120% 120% at 20% 0%, rgba(112, 156, 255, 0.14) 0%, transparent 60%),
    linear-gradient(160deg, rgba(14, 20, 32, 0.72), rgba(6, 10, 18, 0.82));
  font-family: inherit;
  cursor: pointer;
  transition: transform 0.12s ease;
}
.skh-fact:active {
  transform: scale(0.97);
}
.skh-fact__label {
  font-size: 8.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(200, 214, 240, 0.5);
}
.skh-fact__val {
  font-size: 13px;
  color: rgba(233, 240, 250, 0.94);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* Footer: link to the detailed Sky screen + attribution */
.skh-foot {
  flex: 0 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.skh-more {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 9px 18px;
  border-radius: 999px;
  border: 1px solid rgba(150, 180, 220, 0.2);
  background: rgba(10, 18, 30, 0.42);
  backdrop-filter: blur(6px);
  color: rgba(226, 236, 250, 0.92);
  font-size: 13.5px;
  transition: transform 0.12s ease;
}
.skh-more:active {
  transform: scale(0.97);
}
.skh-more .q-icon {
  color: rgba(145, 188, 255, 0.9);
}
.skh-more--event {
  gap: 8px;
  padding: 9px 14px 9px 16px;
  max-width: min(88vw, 420px);
}
.skh-event__dot {
  flex: 0 0 auto;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #91bcff;
  box-shadow: 0 0 8px rgba(145, 188, 255, 0.9);
}
.skh-event__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
  color: rgba(230, 238, 250, 0.95);
}
.skh-event__when {
  flex: 0 0 auto;
  color: rgba(150, 178, 214, 0.75);
  font-variant-numeric: tabular-nums;
}

/* Location sheet */
.skh-sheet {
  width: 100%;
  background: #0b1220;
  border-radius: 18px 18px 0 0;
  padding: 18px 16px calc(84px + env(safe-area-inset-bottom));
  color: #e9edf4;
}
.skh-sheet__title {
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(184, 205, 236, 0.55);
  margin-bottom: 12px;
}
.skh-sheet__sub {
  margin: 16px 0 8px;
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(184, 205, 236, 0.45);
}
.skh-rows {
  display: grid;
}
.skh-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 2px;
  font-size: 14px;
  border-bottom: 1px solid rgba(148, 178, 214, 0.08);
}
.skh-row:last-child {
  border-bottom: 0;
}
.skh-row span:first-child {
  color: rgba(200, 214, 240, 0.66);
}
.skh-row span:last-child {
  color: rgba(233, 240, 250, 0.94);
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.skh-row__accent {
  color: rgba(145, 188, 255, 0.9) !important;
}
.skh-row__right {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.skh-bell {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(9, 14, 23, 0.5);
  color: rgba(200, 214, 240, 0.6);
  transition: transform 0.12s ease;
}
.skh-bell:active {
  transform: scale(0.9);
}
.skh-bell--on {
  border-color: rgba(145, 188, 255, 0.5);
  background: rgba(64, 96, 156, 0.3);
  color: #cfe0ff;
}
.skh-sheet__detect {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 13px 14px;
  border-radius: 12px;
  border: 1px solid rgba(141, 190, 240, 0.35);
  background: rgba(96, 148, 210, 0.14);
  color: rgba(226, 236, 250, 0.95);
  font-size: 14px;
  margin-bottom: 14px;
}
.skh-sheet__list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.skh-sheet__cityrow {
  display: flex;
  align-items: stretch;
  gap: 4px;
}
.skh-sheet__city {
  flex: 1 1 auto;
  min-width: 0;
  text-align: left;
  padding: 12px 10px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(9, 14, 23, 0.65);
  color: rgba(214, 225, 242, 0.85);
  font-size: 14px;
}
.skh-sheet__star {
  flex: 0 0 auto;
  width: 40px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(9, 14, 23, 0.65);
  color: rgba(150, 178, 214, 0.5);
  display: grid;
  place-items: center;
  transition: color 0.15s ease, border-color 0.15s ease;
}
.skh-sheet__star--on {
  color: #91bcff;
  border-color: rgba(145, 188, 255, 0.4);
}
.skh-sheet__hint {
  margin-top: 12px;
  font-size: 11px;
  line-height: 1.4;
  color: rgba(150, 178, 214, 0.55);
  text-align: center;
}
.skh-sheet__city--active {
  border-color: rgba(141, 190, 240, 0.5);
  background: rgba(64, 96, 156, 0.3);
  color: #fff;
}
</style>

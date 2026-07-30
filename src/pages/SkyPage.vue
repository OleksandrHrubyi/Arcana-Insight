<template>
  <q-page class="sky-page">
    <canvas ref="starCanvas" class="sky-stars" aria-hidden="true"></canvas>

    <div v-if="loading" class="sky-loading"><q-spinner color="white" size="34px" /></div>

    <div v-else-if="sky" class="sky-content">
      <header class="sky-header">
        <div class="sky-loc"><span class="sky-loc__dot"></span>{{ locationLabel }}</div>
        <div class="sky-kicker">{{ tt('skyPage.kicker') }}</div>
        <div class="sky-date">{{ formatToday }}</div>
      </header>

      <!-- Best time to observe tonight: astronomical darkness minus moonlight, + clouds -->
      <section v-if="observing" class="sky-card sky-observe">
        <div class="sky-section-title">{{ tt('skyPage.observeTitle') }}</div>
        <div v-if="observeRange" class="sky-observe__range">{{ observeRange }}</div>
        <div v-else class="sky-observe__range sky-observe__range--none">
          {{ tt('skyPage.observeNoDarkness') }}
        </div>
        <div class="sky-observe__verdict">{{ observeVerdict }}</div>
        <div
          v-if="conditions"
          class="sky-observe__cloud"
          :class="`sky-observe__cloud--${conditions.band}`"
        >
          <span class="sky-observe__clouddot"></span>
          {{ conditionsLabel }} · {{ conditions.cloudCoverPct }}% {{ tt('skyHome.cloudLabel') }}
        </div>
      </section>

      <!-- Month calendar (centrepiece) -->
      <section class="sky-card sky-cal">
        <div class="sky-cal__head">
          <button type="button" class="sky-cal__nav hit-44" @click="stepMonth(-1)">
            <q-icon name="chevron_left" size="20px" />
          </button>
          <div class="sky-cal__title">{{ monthLabel }}</div>
          <button type="button" class="sky-cal__nav hit-44" @click="stepMonth(1)">
            <q-icon name="chevron_right" size="20px" />
          </button>
        </div>
        <div class="sky-cal__grid sky-cal__grid--head" aria-hidden="true">
          <span v-for="w in weekdayLabels" :key="w" class="sky-cal__wd">{{ w }}</span>
        </div>
        <div class="sky-cal__grid">
          <span v-for="n in leadingBlanks" :key="`b${n}`" class="sky-cal__blank"></span>
          <div
            v-for="cell in monthCells"
            :key="cell.day"
            class="sky-cal__day"
            :class="{ 'sky-cal__day--today': cell.isToday }"
          >
            <canvas
              class="sky-cal__moon"
              :data-illum="cell.illumination"
              :data-waxing="cell.waxing ? '1' : '0'"
            ></canvas>
            <span class="sky-cal__num">{{ cell.day }}</span>
          </div>
        </div>
      </section>

      <!-- Moon tonight (distance / apparent size / next approach — not on home) -->
      <section v-if="moonDetail" class="sky-card">
        <div class="sky-section-title">{{ tt('skyPage.moonTitle') }}</div>
        <div class="sky-moon-grid">
          <div class="sky-stat">
            <span class="sky-stat__label">{{ tt('skyPage.illumination') }}</span>
            <span class="sky-stat__val">{{ moonDetail.illuminationPct }}%</span>
          </div>
          <div class="sky-stat">
            <span class="sky-stat__label">{{ tt('skyHome.distance') }}</span>
            <span class="sky-stat__val">{{ formatKm(moonDetail.distanceKm) }}</span>
          </div>
          <div class="sky-stat">
            <span class="sky-stat__label">{{ tt('skyHome.apparentSize') }}</span>
            <span class="sky-stat__val">{{ formatDeg(moonDetail.angularDiameterDeg) }}</span>
          </div>
        </div>
        <div v-if="moonDetail.nextApsis" class="sky-moon-cap">
          <span class="sky-accent">{{ tt(`skyHome.events.${moonDetail.nextApsis.kind}`) }}</span>
          · {{ untilLabel(moonDetail.nextApsis.daysUntil) }} · {{ formatKm(moonDetail.nextApsis.distanceKm) }}
        </div>
        <div v-if="bearings?.moonRise || bearings?.moonSet" class="sky-moon-horizon">
          <template v-if="bearings.moonRise">
            {{ tt('skyHome.moonRises') }} {{ tt(`skyHome.compass.${bearings.moonRise.azimuthKey}`) }} {{ bearings.moonRise.deg }}°
          </template>
          <template v-if="bearings.moonRise && bearings.moonSet"> · </template>
          <template v-if="bearings.moonSet">
            {{ tt('skyHome.moonSets') }} {{ tt(`skyHome.compass.${bearings.moonSet.azimuthKey}`) }} {{ bearings.moonSet.deg }}°
          </template>
        </div>
      </section>

      <!-- Upcoming events -->
      <section ref="eventsSection" class="sky-card">
        <div class="sky-section-title">{{ tt('skyPage.eventsTitle') }}</div>
        <div class="sky-events">
          <div
            v-for="ev in eventList"
            :key="ev.type + ev.key + ev.daysUntil"
            class="sky-event"
            :class="{ 'sky-event--focus': focusEvId === `${ev.type}:${ev.key}` }"
            :data-ev="`${ev.type}:${ev.key}`"
          >
            <span class="sky-event__main">
              <span class="sky-event__name">{{ tt(`skyHome.events.${ev.key}`) }}</span>
              <span class="sky-event__when">{{ untilLabel(ev.daysUntil) }} · {{ formatShort(ev.date) }}</span>
            </span>
            <button
              type="button"
              class="sky-bell"
              :class="{ 'sky-bell--on': isScheduled(ev) }"
              :aria-label="tt('skyHome.notifyAria')"
              @click="toggleReminder(ev)"
            >
              <q-icon :name="isScheduled(ev) ? 'notifications_active' : 'notifications_none'" size="17px" />
            </button>
          </div>
        </div>
      </section>

      <!-- Visible this evening -->
      <section class="sky-card">
        <div class="sky-section-title">{{ tt('skyHome.visibleTitle') }}</div>
        <div v-if="visible.length" class="sky-vis">
          <div v-for="p in visible" :key="p.planetKey" class="sky-vis__row">
            <div class="sky-vis__top">
              <span class="sky-vis__name">
                {{ tt(`astro.planets.${p.planetKey}`) }}
                <span v-if="p.retrograde" class="sky-rx">℞</span>
              </span>
              <span class="sky-vis__meta">
                {{ tt(`skyHome.compass.${p.azimuthKey}`) }} · {{ p.altitude }}° · {{ formatMag(p.magnitude) }}
              </span>
            </div>
            <div v-if="planetTimeLine(p)" class="sky-vis__times">{{ planetTimeLine(p) }}</div>
          </div>
        </div>
        <div v-else class="sky-empty">{{ tt('skyHome.visibleEmpty') }}</div>
      </section>

      <!-- ISS passes -->
      <section v-if="issReady" class="sky-card">
        <div class="sky-section-title">{{ tt('skyHome.issTitle') }}</div>
        <div v-if="issPasses.length" class="sky-iss">
          <div v-for="(pass, i) in issPasses" :key="i" class="sky-iss__pass">
            <div class="sky-iss__info">
              <span class="sky-iss__time">{{ formatPassTime(pass.peakTime) }}</span>
              <span class="sky-iss__path">
                {{ tt(`skyHome.compass.${pass.startAzKey}`) }} → {{ tt(`skyHome.compass.${pass.endAzKey}`) }}
                · {{ tt('skyHome.issMax') }} {{ pass.maxEl }}° · {{ formatDuration(pass.durationSec) }}
              </span>
            </div>
            <button
              type="button"
              class="sky-bell"
              :class="{ 'sky-bell--on': isIssScheduled(pass) }"
              :aria-label="tt('skyHome.notifyAria')"
              @click="toggleIssReminder(pass)"
            >
              <q-icon :name="isIssScheduled(pass) ? 'notifications_active' : 'notifications_none'" size="17px" />
            </button>
          </div>
        </div>
        <div v-else class="sky-empty">{{ tt('skyHome.issEmpty') }}</div>
      </section>

      <!-- Premium satellite pack (Tiangong, Hubble) -->
      <section v-if="premiumSatsReady" class="sky-card">
        <div class="sky-section-title">
          {{ tt('skyPage.satMoreTitle') }}
          <span v-if="!hasPremiumAccess" class="sky-sat-badge">{{ tt('skyPage.satBadge') }}</span>
        </div>
        <template v-if="hasPremiumAccess">
          <div v-for="s in premiumSats" :key="s.key" class="sky-sat-group">
            <div class="sky-sat-group__name">{{ tt(`skyPage.sats.${s.key}`) }}</div>
            <div v-if="s.passes.length" class="sky-iss">
              <div v-for="(pass, i) in s.passes" :key="i" class="sky-iss__pass">
                <span class="sky-iss__time">{{ formatPassTime(pass.peakTime) }}</span>
                <span class="sky-iss__path">
                  {{ tt(`skyHome.compass.${pass.startAzKey}`) }} → {{ tt(`skyHome.compass.${pass.endAzKey}`) }}
                  · {{ tt('skyHome.issMax') }} {{ pass.maxEl }}° · {{ formatDuration(pass.durationSec) }}
                </span>
              </div>
            </div>
            <div v-else class="sky-empty">{{ tt('skyHome.issEmpty') }}</div>
          </div>
        </template>
        <button v-else type="button" class="sky-sat-lock" @click="openSatPremium">
          <q-icon name="lock" size="16px" class="sky-sat-lock__icon" />
          <span class="sky-sat-lock__copy">
            <span class="sky-sat-lock__title">{{ tt('skyPage.satLockTitle') }}</span>
            <span class="sky-sat-lock__hint">{{ tt('skyPage.satLockHint') }}</span>
          </span>
          <q-icon name="chevron_right" size="18px" />
        </button>
      </section>

      <!-- Sun & twilight -->
      <section v-if="sunInfo" class="sky-card">
        <div class="sky-section-title">{{ tt('skyHome.sunTitle') }}</div>
        <div class="sky-rows">
          <div class="sky-row"><span>{{ tt('skyHome.dawn') }}</span><span>{{ formatTime(sunInfo.dawn) }}</span></div>
          <div class="sky-row">
            <span>{{ tt('skyHome.sunrise') }}</span>
            <span>{{ formatTime(sunInfo.sunrise) }}<template v-if="bearings?.sunrise"> · {{ tt(`skyHome.compass.${bearings.sunrise.azimuthKey}`) }} {{ bearings.sunrise.deg }}°</template></span>
          </div>
          <div class="sky-row"><span>{{ tt('skyHome.goldenHour') }}</span><span>{{ formatTime(sunInfo.goldenEveningStart) }}</span></div>
          <div class="sky-row">
            <span>{{ tt('skyHome.sunset') }}</span>
            <span>{{ formatTime(sunInfo.sunset) }}<template v-if="bearings?.sunset"> · {{ tt(`skyHome.compass.${bearings.sunset.azimuthKey}`) }} {{ bearings.sunset.deg }}°</template></span>
          </div>
          <div class="sky-row"><span>{{ tt('skyHome.darkShort') }}</span><span>{{ formatTime(sunInfo.dusk) }}</span></div>
          <div v-if="sunInfo.dayLengthMs" class="sky-row">
            <span>{{ tt('skyHome.dayLength') }}</span><span>{{ dayLengthLabel }}</span>
          </div>
        </div>
      </section>

      <!-- Planets -->
      <section class="sky-card">
        <div class="sky-section-title">{{ tt('skyPage.planetsTitle') }}</div>
        <div class="sky-rows">
          <div v-for="p in planets" :key="p.planetKey" class="sky-row">
            <span>{{ tt(`astro.planets.${p.planetKey}`) }}</span>
            <span>
              {{ tt(`zodiac.${p.signKey}`) }} {{ p.degInSign }}°
              <span v-if="p.retrograde" class="sky-rx">℞</span>
            </span>
          </div>
        </div>
      </section>
    </div>
  </q-page>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { t, currentLocale } from 'src/i18n'
import {
  computeSkyForDate,
  computeMonthMoonPhases,
  computeMoonDetail,
  computeUpcomingSkyEvents,
  computePlanetSigns,
  computeVisibleTonight,
  computeSunDetail,
  computeObservingWindow,
  bodyViewTimes,
  bearingAt,
  makeObserver,
} from 'src/helpers/skyCore.js'
import { drawMoon, onMoonReady } from 'src/helpers/moonRender.js'
import {
  scheduleSkyEvent,
  cancelSkyEvent,
  getScheduledIds,
  notifId,
} from 'src/services/skyNotifications.js'
import {
  fetchIssTle,
  fetchSatelliteTle,
  computeVisiblePasses,
  PREMIUM_SATELLITES,
} from 'src/services/issPasses.js'
import { usePremiumAccess } from 'src/stores/premiumAccess.js'
import { tapHaptic } from 'src/helpers/haptics.js'
import { fetchTonightConditions } from 'src/services/skyWeather.js'
import { skyLocation, loadSkyLocation, SKY_CITIES } from 'src/stores/skyLocation.js'

const locale = computed(() => currentLocale.value || 'en')
const tt = (key, vars) => {
  let s = t(locale.value, key)
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v)
  return s
}
const loading = ref(true)
const sky = ref(null)
const moonDetail = ref(null)
const observing = ref(null)
const conditions = ref(null)
const bearings = ref(null)
const eventFeed = ref([])
const scheduledIds = ref(new Set())
const issPasses = ref([])
const issReady = ref(false)
const premiumSats = ref([])
const premiumSatsReady = ref(false)
const planets = ref([])
const visible = ref([])
const sunInfo = ref(null)
const monthCells = ref([])
const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth())
const starCanvas = ref(null)
const eventsSection = ref(null)
const focusEvId = ref(null)
const route = useRoute()
const router = useRouter()
const { hasPremiumAccess } = usePremiumAccess()
let focusTimer = 0

let Astronomy = null
let enginePromise = null
const loadEngine = async () => {
  if (!enginePromise) enginePromise = import('astronomy-engine')
  const mod = await enginePromise
  return mod?.default || mod
}

// Subtle static starfield backdrop (fixed behind the scrolling content).
const drawStars = () => {
  const canvas = starCanvas.value
  if (!canvas) return
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  if (!w || !h) return
  const dpr = Math.min(window.devicePixelRatio || 2, 2)
  canvas.width = w * dpr
  canvas.height = h * dpr
  const x = canvas.getContext('2d')
  if (!x) return
  x.setTransform(dpr, 0, 0, dpr, 0, 0)
  x.clearRect(0, 0, w, h)
  let seed = 20260728
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  const n = Math.round((w * h) / 2600)
  for (let i = 0; i < n; i += 1) {
    const px = rnd() * w
    const py = rnd() * h
    const r = rnd() * 0.9 + 0.2
    const a = rnd() * 0.4 + 0.1
    x.beginPath()
    x.arc(px, py, r, 0, 7)
    x.fillStyle = rnd() > 0.9 ? `rgba(255,236,214,${a})` : `rgba(206,224,255,${a})`
    x.fill()
  }
}

const drawCalendarMoons = () => {
  document.querySelectorAll('.sky-cal__moon').forEach((canvas) => {
    const illum = Number(canvas.getAttribute('data-illum')) || 0
    const waxing = canvas.getAttribute('data-waxing') === '1'
    drawMoon(canvas, illum, waxing, { detail: false })
  })
}

const redrawAll = () => {
  drawStars()
  drawCalendarMoons()
}
const offMoonReady = onMoonReady(redrawAll)
let resizeRaf = 0
const onResize = () => {
  cancelAnimationFrame(resizeRaf)
  resizeRaf = requestAnimationFrame(drawStars)
}

const buildMonth = () => {
  if (!Astronomy) return
  const cells = computeMonthMoonPhases(Astronomy, viewYear.value, viewMonth.value)
  const now = new Date()
  const isThisMonth = now.getFullYear() === viewYear.value && now.getMonth() === viewMonth.value
  monthCells.value = cells.map((c) => ({ ...c, isToday: isThisMonth && c.day === now.getDate() }))
}

const stepMonth = (delta) => {
  void tapHaptic()
  let m = viewMonth.value + delta
  let y = viewYear.value
  if (m < 0) {
    m = 11
    y -= 1
  } else if (m > 11) {
    m = 0
    y += 1
  }
  viewMonth.value = m
  viewYear.value = y
  buildMonth()
  void nextTick(() => drawCalendarMoons())
}

const leadingBlanks = computed(() => {
  const first = new Date(viewYear.value, viewMonth.value, 1).getDay()
  return (first + 6) % 7
})
const weekdayLabels = computed(() =>
  ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((k) => tt(`skyPage.weekdays.${k}`)),
)
const eventList = computed(() => eventFeed.value)

const locationLabel = computed(() => {
  const key = skyLocation.value.cityKey
  return key && SKY_CITIES.some((c) => c.key === key)
    ? tt(`skyHome.cities.${key}`)
    : tt('skyHome.myLocation')
})

// ── Event reminders (local notifications) ──
const eventKey = (ev) => `sky-${ev.type}-${ev.key}-${ev.date.toISOString().slice(0, 10)}`
const isScheduled = (ev) => scheduledIds.value.has(notifId(eventKey(ev)))
const refreshScheduled = async () => {
  scheduledIds.value = await getScheduledIds()
}
const toggleReminder = async (ev) => {
  void tapHaptic()
  const key = eventKey(ev)
  if (isScheduled(ev)) {
    await cancelSkyEvent(key)
  } else {
    await scheduleSkyEvent({
      key,
      title: tt(`skyHome.events.${ev.key}`),
      body: tt('skyHome.notifyBody'),
      at: ev.date,
    })
  }
  await refreshScheduled()
}

// ISS pass reminders — fire ~10 min before the pass so the user can get outside.
const issPassKey = (pass) => `iss-${new Date(pass.peakTime).toISOString()}`
const isIssScheduled = (pass) => scheduledIds.value.has(notifId(issPassKey(pass)))
const toggleIssReminder = async (pass) => {
  void tapHaptic()
  const key = issPassKey(pass)
  if (isIssScheduled(pass)) {
    await cancelSkyEvent(key)
  } else {
    await scheduleSkyEvent({
      key,
      title: tt('skyPage.issNotifyTitle'),
      body: tt('skyPage.issNotifyBody', {
        from: tt(`skyHome.compass.${pass.startAzKey}`),
        to: tt(`skyHome.compass.${pass.endAzKey}`),
        max: pass.maxEl,
      }),
      at: new Date(pass.start),
      leadMinutes: 10,
    })
  }
  await refreshScheduled()
}

const formatToday = computed(() => formatFull(new Date()))
const monthLabel = computed(() => {
  try {
    return new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric' }).format(
      new Date(viewYear.value, viewMonth.value, 1),
    )
  } catch {
    return `${viewMonth.value + 1}/${viewYear.value}`
  }
})
const dayLengthLabel = computed(() => {
  const d = sunInfo.value
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

const formatFull = (date) => {
  try {
    return new Intl.DateTimeFormat(locale.value, { weekday: 'long', month: 'long', day: 'numeric' }).format(date)
  } catch {
    return date.toDateString()
  }
}
const formatShort = (date) => {
  try {
    return new Intl.DateTimeFormat(locale.value, { month: 'short', day: 'numeric' }).format(date)
  } catch {
    return date.toDateString()
  }
}
const formatTime = (date) => {
  if (!date) return '—'
  try {
    return new Intl.DateTimeFormat(locale.value, { hour: '2-digit', minute: '2-digit' }).format(date)
  } catch {
    return '—'
  }
}
const formatMag = (mag) => `${mag > 0 ? '+' : ''}${mag.toFixed(1)}`
// "when to look" line for a visible planet: its peak (only while still climbing)
// and when it leaves the sky.
const planetTimeLine = (p) => {
  const tms = p.times
  if (!tms) return ''
  const parts = []
  const stillClimbing = tms.transit && (!tms.set || tms.transit.getTime() < tms.set.getTime())
  if (stillClimbing) {
    parts.push(`${tt('skyPage.highest')} ${formatTime(tms.transit)} · ${tms.transitAltitude}°`)
  }
  if (tms.set) parts.push(`${tt('skyPage.setsAt')} ${formatTime(tms.set)}`)
  else if (tms.rise) parts.push(`${tt('skyPage.risesAt')} ${formatTime(tms.rise)}`)
  return parts.join(' · ')
}
const formatKm = (km) => {
  try {
    return `${new Intl.NumberFormat(locale.value).format(km)} ${tt('skyHome.kmAbbr')}`
  } catch {
    return `${km} ${tt('skyHome.kmAbbr')}`
  }
}
const formatDeg = (deg) => `${deg.toFixed(2)}°`

// Tonight's observing conditions (cloud cover) — networked, non-blocking.
const loadConditions = async () => {
  conditions.value = await fetchTonightConditions(skyLocation.value.lat, skyLocation.value.lon)
}
const conditionsLabel = computed(() => {
  const band = conditions.value?.band
  if (band === 'clear') return tt('skyHome.condClear')
  if (band === 'cloudy') return tt('skyHome.condCloudy')
  return tt('skyHome.condPartly')
})

// "Best time to observe" — headline range + verdict copy from the window quality.
const observeRange = computed(() => {
  const w = observing.value
  if (!w || !w.hasDarkness || !w.windowStart || !w.windowEnd) return null
  return `${formatTime(w.windowStart)} – ${formatTime(w.windowEnd)}`
})
const observeVerdict = computed(() => {
  const w = observing.value
  if (!w) return ''
  switch (w.quality) {
    case 'moonless':
      return tt('skyPage.observeMoonless')
    case 'afterMoonset':
      return tt('skyPage.observeAfterMoonset', { t: formatTime(w.moonSet) })
    case 'beforeMoonrise':
      return tt('skyPage.observeBeforeMoonrise', { t: formatTime(w.moonRise) })
    case 'moonWashout':
      return tt('skyPage.observeMoonWashout', { p: w.moonIlluminationPct })
    default:
      return tt('skyPage.observeNoDarknessSub')
  }
})
const untilLabel = (days) => {
  if (days <= 0) return tt('skyPage.today')
  if (days === 1) return tt('skyPage.tomorrow')
  return tt('skyPage.inDays', { n: days })
}

const formatPassTime = (date) => {
  try {
    return new Intl.DateTimeFormat(locale.value, { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(date)
  } catch {
    return date.toISOString()
  }
}
const formatDuration = (sec) => `${Math.round(sec / 60)} ${tt('skyHome.minAbbr')}`

const loadIssPasses = async () => {
  try {
    const tle = await fetchIssTle()
    if (tle && Astronomy) {
      issPasses.value = computeVisiblePasses(
        Astronomy,
        tle,
        { lat: skyLocation.value.lat, lon: skyLocation.value.lon, elevKm: 0.05 },
        { days: 5, minEl: 10, limit: 4 },
      )
    }
  } catch (e) {
    console.error('[SkyPage] ISS load failed', e)
  } finally {
    issReady.value = true
  }
}

// Premium satellite pack (Tiangong, Hubble) — same on-device SGP4 pipeline as the
// free ISS, gated behind premium. Free users see a locked teaser instead.
const loadPremiumSatPasses = async () => {
  if (!hasPremiumAccess.value) {
    premiumSatsReady.value = true
    return
  }
  try {
    const loc = { lat: skyLocation.value.lat, lon: skyLocation.value.lon, elevKm: 0.05 }
    const out = []
    for (const s of PREMIUM_SATELLITES) {
      const tle = await fetchSatelliteTle(s.catnr)
      const passes = tle && Astronomy
        ? computeVisiblePasses(Astronomy, tle, loc, { days: 5, minEl: 10, limit: 3 })
        : []
      out.push({ key: s.key, passes })
    }
    premiumSats.value = out
  } catch (e) {
    console.error('[SkyPage] premium sats load failed', e)
  } finally {
    premiumSatsReady.value = true
  }
}
const openSatPremium = () => {
  void tapHaptic()
  router.push({ name: 'premium', query: { source: 'sky_satellites' } })
}

onMounted(async () => {
  try {
    await loadSkyLocation()
    Astronomy = await loadEngine()
    const now = new Date()
    const observer = makeObserver(Astronomy, skyLocation.value.lat, skyLocation.value.lon)
    sky.value = computeSkyForDate(Astronomy, now)
    moonDetail.value = computeMoonDetail(Astronomy, now)
    observing.value = computeObservingWindow(Astronomy, observer, now)
    eventFeed.value = computeUpcomingSkyEvents(Astronomy, now, { limit: 12 })
    planets.value = computePlanetSigns(Astronomy, now)
    visible.value = computeVisibleTonight(Astronomy, observer, now).map((p) => ({
      ...p,
      times: bodyViewTimes(Astronomy, p.planetKey, observer, now),
    }))
    sunInfo.value = computeSunDetail(Astronomy, observer, now)
    const moonRS = bodyViewTimes(Astronomy, 'moon', observer, now)
    bearings.value = {
      sunrise: bearingAt(Astronomy, 'sun', observer, sunInfo.value.sunrise),
      sunset: bearingAt(Astronomy, 'sun', observer, sunInfo.value.sunset),
      moonRise: bearingAt(Astronomy, 'moon', observer, moonRS.rise),
      moonSet: bearingAt(Astronomy, 'moon', observer, moonRS.set),
    }
    void refreshScheduled()
    void loadIssPasses()
    void loadPremiumSatPasses()
    void loadConditions()
    buildMonth()
  } catch (e) {
    console.error('[SkyPage] load failed', e)
  } finally {
    loading.value = false
  }
  await nextTick()
  redrawAll()
  focusRequestedEvent()
  window.addEventListener('resize', onResize)
})

// When arriving from the home's "tonight's headline event" chip, scroll to that
// event in the list and highlight it briefly — so the tap lands on the event
// the user asked for, not the top-of-page calendar.
const focusRequestedEvent = () => {
  const focus = route.query.focus
  if (!focus || typeof focus !== 'string') return
  const row = document.querySelector(`.sky-event[data-ev="${CSS.escape(focus)}"]`)
  const target = row || eventsSection.value?.$el || eventsSection.value
  if (!target || typeof target.scrollIntoView !== 'function') return
  target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  if (!row) return
  focusEvId.value = focus
  focusTimer = window.setTimeout(() => {
    focusEvId.value = null
  }, 2800)
}

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  cancelAnimationFrame(resizeRaf)
  if (focusTimer) clearTimeout(focusTimer)
  offMoonReady?.()
})
</script>

<style scoped lang="scss">
.sky-page {
  position: relative;
  min-height: 100vh;
  color: #e9edf4;
  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
  overflow-x: hidden;
}
.sky-stars {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}
.sky-loading {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  padding-top: 40vh;
}
.sky-content {
  position: relative;
  z-index: 1;
  max-width: 520px;
  margin: 0 auto;
  padding: calc(90px + env(safe-area-inset-top)) 16px calc(96px + env(safe-area-inset-bottom));
  display: grid;
  gap: 16px;
}

/* Header */
.sky-header {
  text-align: center;
  display: grid;
  gap: 5px;
  justify-items: center;
  margin-bottom: 4px;
}
.sky-loc {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 13px;
  border-radius: 999px;
  border: 1px solid rgba(150, 180, 220, 0.16);
  background: rgba(10, 18, 30, 0.4);
  font-size: 12.5px;
  color: rgba(226, 236, 250, 0.9);
}
.sky-loc__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #91bcff;
  box-shadow: 0 0 8px #91bcff;
}
.sky-kicker {
  margin-top: 4px;
  font-size: 10.5px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: rgba(170, 192, 220, 0.55);
}
.sky-date {
  font-size: 22px;
  font-weight: 300;
  letter-spacing: -0.01em;
  text-transform: capitalize;
}
.sky-accent {
  color: #91bcff;
}

/* Best time to observe — the page's headline answer */
.sky-observe__range {
  font-size: 27px;
  font-weight: 300;
  letter-spacing: 0.01em;
  color: #eef3fb;
  font-variant-numeric: tabular-nums;
}
.sky-observe__range--none {
  font-size: 19px;
  color: rgba(214, 226, 244, 0.9);
}
.sky-observe__verdict {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.4;
  color: rgba(200, 218, 244, 0.72);
}
.sky-observe__cloud {
  margin-top: 13px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(150, 180, 220, 0.16);
  background: rgba(9, 14, 23, 0.5);
  font-size: 12px;
  color: rgba(220, 231, 246, 0.85);
}
.sky-observe__clouddot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #8aa0bd;
}
.sky-observe__cloud--clear .sky-observe__clouddot {
  background: #7fd4a3;
  box-shadow: 0 0 8px rgba(127, 212, 163, 0.8);
}
.sky-observe__cloud--partly .sky-observe__clouddot {
  background: #e6c07a;
  box-shadow: 0 0 8px rgba(230, 192, 122, 0.7);
}
.sky-observe__cloud--cloudy .sky-observe__clouddot {
  background: #8aa0bd;
}

/* Moon-tonight card — stat grid (breaks the stacked-list rhythm) */
.sky-moon-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.sky-stat {
  display: grid;
  gap: 4px;
  justify-items: center;
  text-align: center;
  padding: 12px 6px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(9, 14, 23, 0.4);
}
.sky-stat__label {
  font-size: 9.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(184, 205, 236, 0.5);
}
.sky-stat__val {
  font-size: 15px;
  font-weight: 500;
  color: rgba(233, 240, 250, 0.96);
  font-variant-numeric: tabular-nums;
}
.sky-moon-cap {
  margin-top: 12px;
  text-align: center;
  font-size: 12.5px;
  color: rgba(200, 218, 244, 0.7);
  font-variant-numeric: tabular-nums;
}
.sky-moon-horizon {
  margin-top: 6px;
  text-align: center;
  font-size: 11.5px;
  color: rgba(150, 178, 214, 0.6);
  font-variant-numeric: tabular-nums;
}

/* Shared premium card */
.sky-card {
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    radial-gradient(120% 90% at 18% 0%, rgba(112, 156, 255, 0.15) 0%, rgba(12, 18, 30, 0.1) 44%, transparent 100%),
    linear-gradient(160deg, rgba(14, 20, 32, 0.92), rgba(6, 10, 18, 0.98));
  box-shadow:
    0 18px 40px rgba(2, 6, 12, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  padding: 16px;
}
.sky-section-title {
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.55);
  margin-bottom: 12px;
}

/* Calendar */
.sky-cal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.sky-cal__title {
  font-size: 16px;
  font-weight: 600;
  text-transform: capitalize;
}
.sky-cal__nav {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(9, 14, 23, 0.6);
  color: rgba(214, 225, 242, 0.85);
  display: grid;
  place-items: center;
}
.sky-cal__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
}
.sky-cal__grid--head {
  margin-bottom: 8px;
}
.sky-cal__wd {
  text-align: center;
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(184, 205, 236, 0.4);
}
.sky-cal__blank {
  aspect-ratio: 1;
}
.sky-cal__day {
  position: relative;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border-radius: 12px;
}
.sky-cal__day--today {
  background: rgba(96, 148, 210, 0.16);
  box-shadow: inset 0 0 0 1px rgba(145, 190, 245, 0.55), 0 0 14px rgba(96, 148, 210, 0.35);
}
.sky-cal__moon {
  width: 82%;
  height: 82%;
}
.sky-cal__num {
  position: absolute;
  bottom: 0;
  font-size: 8px;
  color: rgba(214, 225, 242, 0.55);
}

/* Rows (sun, planets) */
.sky-rows {
  display: grid;
}
.sky-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 2px;
  font-size: 14px;
  border-bottom: 1px solid rgba(148, 178, 214, 0.08);
}
.sky-row:last-child {
  border-bottom: 0;
}
.sky-row span:first-child {
  color: rgba(200, 214, 240, 0.7);
}
.sky-row span:last-child {
  color: rgba(233, 240, 250, 0.94);
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.sky-rx {
  color: rgba(226, 176, 120, 0.95);
  margin-left: 2px;
}

/* Events */
.sky-events {
  display: grid;
}
.sky-event {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 2px;
  border-bottom: 1px solid rgba(148, 178, 214, 0.08);
  border-radius: 12px;
  transition:
    background-color 0.5s ease,
    box-shadow 0.5s ease;
}
.sky-event--focus {
  background-color: rgba(145, 188, 255, 0.1);
  box-shadow: inset 0 0 0 1px rgba(145, 188, 255, 0.32);
}
.sky-event:last-child {
  border-bottom: 0;
}
.sky-event__main {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.sky-event__name {
  font-size: 14px;
  color: rgba(233, 240, 250, 0.94);
}
.sky-event__when {
  font-size: 12px;
  color: rgba(141, 190, 240, 0.9);
  font-variant-numeric: tabular-nums;
}
.sky-bell {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(9, 14, 23, 0.55);
  color: rgba(200, 214, 240, 0.55);
  transition: transform 0.12s ease;
}
.sky-bell:active {
  transform: scale(0.9);
}
.sky-bell--on {
  border-color: rgba(145, 188, 255, 0.5);
  background: rgba(64, 96, 156, 0.3);
  color: #cfe0ff;
}

/* Visible tonight */
.sky-vis {
  display: grid;
}
.sky-vis__row {
  display: grid;
  gap: 3px;
  padding: 10px 2px;
  border-bottom: 1px solid rgba(148, 178, 214, 0.08);
}
.sky-vis__row:last-child {
  border-bottom: 0;
}
.sky-vis__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
.sky-vis__name {
  font-size: 14px;
  color: rgba(233, 240, 250, 0.94);
}
.sky-vis__meta {
  font-size: 12.5px;
  color: rgba(184, 205, 236, 0.78);
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.sky-vis__times {
  font-size: 11.5px;
  color: rgba(150, 178, 214, 0.62);
  font-variant-numeric: tabular-nums;
}

/* ISS */
.sky-iss {
  display: grid;
  gap: 10px;
}
.sky-iss__pass {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 11px 12px;
  border-radius: 13px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(9, 14, 23, 0.5);
}
.sky-iss__info {
  display: grid;
  gap: 3px;
  min-width: 0;
}
.sky-iss__time {
  font-size: 14px;
  font-weight: 600;
  color: rgba(233, 240, 250, 0.94);
  text-transform: capitalize;
}
.sky-iss__path {
  font-size: 12px;
  color: rgba(184, 205, 236, 0.78);
  font-variant-numeric: tabular-nums;
}
/* Premium satellite pack */
.sky-sat-badge {
  margin-left: 8px;
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 999px;
  color: #0b1422;
  background: linear-gradient(180deg, #cddaf6, #8ea6e8);
  font-weight: 600;
  vertical-align: middle;
}
.sky-sat-group {
  margin-top: 12px;
}
.sky-sat-group:first-of-type {
  margin-top: 2px;
}
.sky-sat-group__name {
  font-size: 12.5px;
  color: rgba(214, 225, 242, 0.8);
  margin-bottom: 6px;
  font-weight: 500;
}
.sky-sat-lock {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: left;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(145, 188, 255, 0.22);
  background: rgba(64, 96, 156, 0.12);
  color: inherit;
  transition: transform 0.12s ease;
}
.sky-sat-lock:active {
  transform: scale(0.98);
}
.sky-sat-lock__icon {
  color: #91bcff;
  flex: 0 0 auto;
}
.sky-sat-lock__copy {
  display: grid;
  gap: 2px;
  flex: 1 1 auto;
  min-width: 0;
}
.sky-sat-lock__title {
  font-size: 13.5px;
  color: rgba(233, 240, 250, 0.95);
  font-weight: 500;
}
.sky-sat-lock__hint {
  font-size: 11.5px;
  color: rgba(184, 205, 236, 0.7);
  line-height: 1.35;
}
.sky-empty {
  font-size: 13px;
  color: rgba(184, 205, 236, 0.5);
}
</style>

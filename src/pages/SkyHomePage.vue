<template>
  <q-page class="skh">
    <div class="skh-bg" aria-hidden="true"></div>
    <div class="skh-content">
      <div v-if="loading" class="skh-loading"><q-spinner color="white" size="34px" /></div>

      <template v-else-if="sky">
        <!-- Location + date -->
        <header class="skh-head">
          <button type="button" class="skh-loc hit-44" @click="locationOpen = true">
            <q-icon name="place" size="16px" />
            <span class="skh-loc__name">{{ locationLabel }}</span>
            <q-icon name="expand_more" size="16px" class="skh-loc__caret" />
          </button>
          <div class="skh-kicker">{{ tt('skyHome.kicker') }}</div>
          <div class="skh-date">{{ formatToday }}</div>
        </header>

        <!-- Moon hero -->
        <section class="skh-hero">
          <canvas ref="moonCanvas" class="skh-hero__moon"></canvas>
          <div class="skh-hero__phase">{{ tt(`astro.phases.${sky.moonPhaseKey}`) }}</div>
          <div class="skh-hero__illum">{{ sky.illuminationPct }}% {{ tt('skyHome.illuminated') }}</div>
          <div class="skh-hero__rs">
            <span>{{ tt('skyHome.moonRises') }} {{ formatTime(moonRS.rise) }}</span>
            <span class="skh-hero__dot">·</span>
            <span>{{ tt('skyHome.moonSets') }} {{ formatTime(moonRS.set) }}</span>
          </div>
          <div v-if="nextFullMoon" class="skh-hero__next">
            {{ tt('skyHome.events.fullMoon') }} {{ untilLabel(nextFullMoon.daysUntil) }}
          </div>
        </section>

        <!-- Visible this evening -->
        <section class="skh-visible">
          <div class="skh-section-title">{{ tt('skyHome.visibleTitle') }}</div>
          <div v-if="visible.length" class="skh-visible__row">
            <div v-for="p in visible" :key="p.planetKey" class="skh-planet">
              <div class="skh-planet__name">{{ tt(`astro.planets.${p.planetKey}`) }}</div>
              <div class="skh-planet__dir">{{ tt(`skyHome.compass.${p.azimuthKey}`) }} · {{ p.altitude }}°</div>
              <div class="skh-planet__mag">
                {{ formatMag(p.magnitude) }}
                <span v-if="p.retrograde" class="skh-planet__rx">℞</span>
              </div>
            </div>
          </div>
          <div v-else class="skh-empty">{{ tt('skyHome.visibleEmpty') }}</div>
        </section>

        <!-- Sun -->
        <section class="skh-sun">
          <div class="skh-section-title">{{ tt('skyHome.sunTitle') }}</div>
          <div class="skh-sun__row">
            <div class="skh-sun__item">
              <span class="skh-sun__label">{{ tt('skyHome.sunrise') }}</span>
              <span class="skh-sun__val">{{ formatTime(sun.sunrise) }}</span>
            </div>
            <div class="skh-sun__item">
              <span class="skh-sun__label">{{ tt('skyHome.sunset') }}</span>
              <span class="skh-sun__val">{{ formatTime(sun.sunset) }}</span>
            </div>
            <div v-if="sun.darkStart" class="skh-sun__item">
              <span class="skh-sun__dark">{{ tt('skyHome.darkFrom', { t: formatTime(sun.darkStart) }) }}</span>
            </div>
          </div>
        </section>

        <!-- Upcoming events -->
        <section class="skh-events">
          <div class="skh-section-title">{{ tt('skyHome.upcomingTitle') }}</div>
          <div v-for="ev in events" :key="ev.type + ev.key + ev.daysUntil" class="skh-event">
            <span class="skh-event__name">{{ tt(`skyHome.events.${ev.key}`) }}</span>
            <span class="skh-event__meta">
              <span class="skh-event__when">{{ untilLabel(ev.daysUntil) }}</span>
              <span class="skh-event__date">{{ formatShort(ev.date) }}</span>
            </span>
          </div>
        </section>

        <!-- Moon calendar -->
        <section class="skh-cal">
          <div class="skh-cal__head">
            <button type="button" class="skh-cal__nav hit-44" @click="stepMonth(-1)">
              <q-icon name="chevron_left" size="20px" />
            </button>
            <div class="skh-cal__title">{{ monthLabel }}</div>
            <button type="button" class="skh-cal__nav hit-44" @click="stepMonth(1)">
              <q-icon name="chevron_right" size="20px" />
            </button>
          </div>
          <div class="skh-cal__grid skh-cal__grid--head" aria-hidden="true">
            <span v-for="w in weekdayLabels" :key="w" class="skh-cal__wd">{{ w }}</span>
          </div>
          <div class="skh-cal__grid">
            <span v-for="n in leadingBlanks" :key="`b${n}`" class="skh-cal__blank"></span>
            <div
              v-for="cell in monthCells"
              :key="cell.day"
              class="skh-cal__day"
              :class="{ 'skh-cal__day--today': cell.isToday }"
            >
              <canvas
                class="skh-cal__moon"
                :data-illum="cell.illumination"
                :data-waxing="cell.waxing ? '1' : '0'"
              ></canvas>
              <span class="skh-cal__num">{{ cell.day }}</span>
            </div>
          </div>
        </section>

        <!-- Extras (demoted) -->
        <section class="skh-extras">
          <div class="skh-section-title">{{ tt('skyHome.extrasTitle') }}</div>
          <button type="button" class="skh-extra" @click="go('journal')">
            <q-icon name="edit_note" size="18px" />
            <span>{{ tt('skyHome.extrasReflection') }}</span>
            <q-icon name="chevron_right" size="16px" class="skh-extra__arrow" />
          </button>
          <button type="button" class="skh-extra" @click="go('daily')">
            <q-icon name="style" size="18px" />
            <span>{{ tt('skyHome.extrasCard') }}</span>
            <q-icon name="chevron_right" size="16px" class="skh-extra__arrow" />
          </button>
          <button type="button" class="skh-extra" @click="go('horoscope')">
            <q-icon name="brightness_3" size="18px" />
            <span>{{ tt('skyHome.extrasHoroscope') }}</span>
            <q-icon name="chevron_right" size="16px" class="skh-extra__arrow" />
          </button>
        </section>
      </template>
    </div>

    <!-- Location picker -->
    <q-dialog v-model="locationOpen" position="bottom">
      <q-card class="skh-sheet">
        <div class="skh-sheet__title">{{ tt('skyHome.locationTitle') }}</div>
        <button type="button" class="skh-sheet__detect" @click="useMyLocation">
          <q-icon name="my_location" size="18px" />
          <span>{{ tt('skyHome.locationDetect') }}</span>
        </button>
        <div class="skh-sheet__list">
          <button
            v-for="c in cities"
            :key="c.key"
            type="button"
            class="skh-sheet__city"
            :class="{ 'skh-sheet__city--active': loc.cityKey === c.key }"
            @click="pickCity(c.key)"
          >
            {{ tt(`skyHome.cities.${c.key}`) }}
          </button>
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { t, currentLocale } from 'src/i18n'
import {
  computeSkyForDate,
  computeMonthMoonPhases,
  computeSunTimes,
  computeVisibleTonight,
  computeUpcomingSkyEvents,
  findUpcomingLunarEvents,
  riseSetForLocalDay,
  makeObserver,
} from 'src/helpers/skyCore.js'
import { drawMoon, onMoonReady } from 'src/helpers/moonRender.js'
import {
  skyLocation,
  loadSkyLocation,
  detectSkyLocation,
  setSkyLocationCity,
  SKY_CITIES,
} from 'src/stores/skyLocation.js'

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
const events = ref([])
const nextFullMoon = ref(null)
const monthCells = ref([])
const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth())
const moonCanvas = ref(null)
const locationOpen = ref(false)
const cities = SKY_CITIES
const loc = skyLocation

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
  events.value = computeUpcomingSkyEvents(Astronomy, now, { limit: 6 })
  nextFullMoon.value = findUpcomingLunarEvents(Astronomy, now).fullMoon
  buildMonth()
}

const buildMonth = () => {
  if (!Astronomy) return
  const cells = computeMonthMoonPhases(Astronomy, viewYear.value, viewMonth.value)
  const now = new Date()
  const isThisMonth = now.getFullYear() === viewYear.value && now.getMonth() === viewMonth.value
  monthCells.value = cells.map((c) => ({ ...c, isToday: isThisMonth && c.day === now.getDate() }))
}

const stepMonth = (delta) => {
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

const drawCalendarMoons = () => {
  document.querySelectorAll('.skh-cal__moon').forEach((canvas) => {
    const illum = Number(canvas.getAttribute('data-illum')) || 0
    const waxing = canvas.getAttribute('data-waxing') === '1'
    drawMoon(canvas, illum, waxing, { detail: false })
  })
}

const redrawAll = () => {
  if (!sky.value) return
  drawMoon(moonCanvas.value, sky.value.illumination, sky.value.waxing, { detail: true })
  drawCalendarMoons()
}
onMoonReady(redrawAll)

const pickCity = (cityKey) => {
  setSkyLocationCity(cityKey)
  locationOpen.value = false
}
const useMyLocation = async () => {
  const ok = await detectSkyLocation()
  locationOpen.value = false
  if (!ok) return // kept current location silently
}

const locationLabel = computed(() =>
  loc.value.cityKey ? tt(`skyHome.cities.${loc.value.cityKey}`) : tt('skyHome.myLocation'),
)

const leadingBlanks = computed(() => {
  const first = new Date(viewYear.value, viewMonth.value, 1).getDay()
  return (first + 6) % 7
})
const weekdayLabels = computed(() =>
  ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((k) => tt(`skyPage.weekdays.${k}`)),
)
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

const formatFull = (date) => {
  try {
    return new Intl.DateTimeFormat(locale.value, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(date)
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
const untilLabel = (days) => {
  if (days <= 0) return tt('skyHome.today')
  if (days === 1) return tt('skyHome.tomorrow')
  return tt('skyHome.inDays', { n: days })
}

const go = (name) => router.push({ name, query: { source: 'sky_home' } })

watch(
  () => loc.value,
  () => {
    recompute()
    void nextTick(() => redrawAll())
  },
  { deep: true },
)

onMounted(async () => {
  try {
    await loadSkyLocation()
    Astronomy = await loadEngine()
    recompute()
  } catch (e) {
    console.error('[SkyHomePage] load failed', e)
  } finally {
    loading.value = false
  }
  await nextTick()
  redrawAll()
})
</script>

<style scoped lang="scss">
.skh {
  min-height: 100vh;
  color: #e9edf4;
  position: relative;
  overflow: hidden;
}
.skh-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(140% 80% at 50% -10%, #0d2740 0%, #081521 42%, #04080f 100%);
  z-index: 0;
}
.skh-content {
  position: relative;
  z-index: 1;
  padding: calc(18px + env(safe-area-inset-top)) 16px 108px;
  max-width: 520px;
  margin: 0 auto;
  display: grid;
  gap: 22px;
}
.skh-loading {
  display: flex;
  justify-content: center;
  padding: 120px 0;
}

/* Header */
.skh-head {
  text-align: center;
  display: grid;
  gap: 4px;
  justify-items: center;
}
.skh-loc {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(148, 178, 214, 0.16);
  background: rgba(13, 22, 36, 0.55);
  color: rgba(214, 225, 242, 0.9);
  font-size: 13px;
  margin-bottom: 6px;
  transition: transform 0.12s ease;
}
.skh-loc:active {
  transform: scale(0.97);
}
.skh-loc__caret {
  opacity: 0.6;
}
.skh-kicker {
  font-size: 11px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: rgba(184, 205, 236, 0.62);
}
.skh-date {
  font-size: 15px;
  color: rgba(233, 240, 250, 0.9);
  text-transform: capitalize;
}

/* Hero */
.skh-hero {
  display: grid;
  justify-items: center;
  gap: 5px;
  padding: 2px 0;
}
.skh-hero__moon {
  width: min(74vw, 300px);
  height: min(74vw, 300px);
  filter: drop-shadow(0 10px 40px rgba(120, 160, 220, 0.22));
}
.skh-hero__phase {
  font-size: 24px;
  font-weight: 600;
  margin-top: 4px;
}
.skh-hero__illum {
  font-size: 13px;
  color: rgba(184, 205, 236, 0.72);
}
.skh-hero__rs {
  font-size: 13px;
  color: rgba(210, 224, 244, 0.86);
  display: flex;
  gap: 8px;
  margin-top: 2px;
}
.skh-hero__dot {
  opacity: 0.4;
}
.skh-hero__next {
  font-size: 12px;
  color: rgba(141, 190, 240, 0.85);
}

/* Section titles */
.skh-section-title {
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(184, 205, 236, 0.55);
  margin-bottom: 10px;
}

/* Visible tonight */
.skh-visible__row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 2px;
}
.skh-visible__row::-webkit-scrollbar {
  display: none;
}
.skh-planet {
  flex: 0 0 auto;
  min-width: 92px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(148, 178, 214, 0.12);
  background: rgba(13, 22, 36, 0.55);
  display: grid;
  gap: 3px;
}
.skh-planet__name {
  font-size: 14px;
  font-weight: 600;
  color: rgba(233, 240, 250, 0.94);
}
.skh-planet__dir {
  font-size: 12px;
  color: rgba(184, 205, 236, 0.72);
}
.skh-planet__mag {
  font-size: 11px;
  color: rgba(184, 205, 236, 0.5);
  font-variant-numeric: tabular-nums;
}
.skh-planet__rx {
  color: rgba(226, 176, 120, 0.95);
  margin-left: 2px;
}
.skh-empty {
  font-size: 13px;
  color: rgba(184, 205, 236, 0.5);
  padding: 4px 0;
}

/* Sun */
.skh-sun__row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.skh-sun__item {
  display: grid;
  gap: 2px;
}
.skh-sun__label {
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(184, 205, 236, 0.5);
}
.skh-sun__val,
.skh-sun__dark {
  font-size: 14px;
  color: rgba(233, 240, 250, 0.92);
  font-variant-numeric: tabular-nums;
}
.skh-sun__dark {
  color: rgba(141, 190, 240, 0.85);
}
.skh-sun__item:nth-child(3) {
  margin-left: auto;
  text-align: right;
}

/* Events */
.skh-event {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 11px 2px;
  border-bottom: 1px solid rgba(148, 178, 214, 0.08);
}
.skh-event:last-child {
  border-bottom: 0;
}
.skh-event__name {
  font-size: 14px;
  color: rgba(233, 240, 250, 0.9);
}
.skh-event__meta {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.skh-event__when {
  font-size: 12px;
  color: rgba(141, 190, 240, 0.9);
}
.skh-event__date {
  font-size: 11px;
  color: rgba(184, 205, 236, 0.5);
  font-variant-numeric: tabular-nums;
}

/* Calendar */
.skh-cal {
  border-radius: 20px;
  border: 1px solid rgba(148, 178, 214, 0.1);
  background: linear-gradient(180deg, rgba(15, 25, 40, 0.5), rgba(8, 14, 24, 0.6));
  padding: 14px;
}
.skh-cal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.skh-cal__title {
  font-size: 15px;
  font-weight: 600;
  text-transform: capitalize;
}
.skh-cal__nav {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(10, 16, 26, 0.6);
  color: rgba(214, 225, 242, 0.8);
  display: grid;
  place-items: center;
}
.skh-cal__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}
.skh-cal__grid--head {
  margin-bottom: 6px;
}
.skh-cal__wd {
  text-align: center;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(184, 205, 236, 0.45);
}
.skh-cal__blank {
  aspect-ratio: 1;
}
.skh-cal__day {
  position: relative;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border-radius: 10px;
}
.skh-cal__day--today {
  background: rgba(96, 148, 210, 0.18);
  border: 1px solid rgba(141, 190, 240, 0.4);
}
.skh-cal__moon {
  width: 78%;
  height: 78%;
}
.skh-cal__num {
  position: absolute;
  bottom: 1px;
  font-size: 8px;
  color: rgba(214, 225, 242, 0.6);
}

/* Extras */
.skh-extra {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 14px 16px;
  margin-bottom: 8px;
  border-radius: 14px;
  border: 1px solid rgba(148, 178, 214, 0.1);
  background: rgba(11, 18, 30, 0.55);
  color: rgba(214, 225, 242, 0.85);
  font-size: 14px;
  transition: transform 0.12s ease;
}
.skh-extra:active {
  transform: scale(0.98);
}
.skh-extra__arrow {
  position: absolute;
  right: 12px;
  color: rgba(214, 225, 242, 0.4);
}

/* Location sheet */
.skh-sheet {
  width: 100%;
  background: #0b1220;
  border-radius: 18px 18px 0 0;
  padding: 18px 16px calc(18px + env(safe-area-inset-bottom));
  color: #e9edf4;
}
.skh-sheet__title {
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(184, 205, 236, 0.55);
  margin-bottom: 12px;
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
.skh-sheet__city {
  padding: 12px 10px;
  border-radius: 12px;
  border: 1px solid rgba(148, 178, 214, 0.12);
  background: rgba(13, 22, 36, 0.6);
  color: rgba(214, 225, 242, 0.85);
  font-size: 14px;
}
.skh-sheet__city--active {
  border-color: rgba(141, 190, 240, 0.5);
  background: rgba(96, 148, 210, 0.18);
  color: #fff;
}
</style>

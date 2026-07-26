<template>
  <q-page class="sky-page">
    <div class="sky-bg" aria-hidden="true"></div>
    <div class="sky-content">
      <div v-if="loading" class="sky-loading"><q-spinner color="white" size="34px" /></div>

      <template v-else-if="sky">
        <header class="sky-header">
          <div class="sky-kicker">{{ tt('skyPage.kicker') }}</div>
          <div class="sky-date">{{ formatToday }}</div>
        </header>

        <!-- Moon hero -->
        <section class="sky-hero">
          <canvas ref="moonCanvas" class="sky-hero__moon"></canvas>
          <div class="sky-hero__phase">{{ tt(`astro.phases.${sky.moonPhaseKey}`) }}</div>
          <div class="sky-hero__illum">{{ sky.illuminationPct }}% {{ tt('skyPage.illuminated') }}</div>
          <div class="sky-hero__meta">
            {{ tt('astro.moonIn') }} {{ tt(`zodiac.${sky.moonSignKey}`) }}
            <span v-if="events.fullMoon" class="sky-hero__next">
              · {{ tt('skyPage.events.fullMoon') }} {{ untilLabel(events.fullMoon.daysUntil) }}
            </span>
          </div>
        </section>

        <!-- Facts strip -->
        <section class="sky-facts">
          <div class="sky-fact">
            <span class="sky-fact__label">{{ tt('astro.sunIn') }}</span>
            <span class="sky-fact__value">{{ tt(`zodiac.${sky.sunSignKey}`) }} {{ sky.sunDegInSign }}°</span>
          </div>
          <div class="sky-fact">
            <span class="sky-fact__label">{{ tt('astro.cards.dayRuler') }}</span>
            <span class="sky-fact__value">{{ tt(`astro.planets.${sky.planetaryDayKey}`) }}</span>
          </div>
          <div v-if="sky.mercuryRetrograde" class="sky-fact sky-fact--rx">
            <span class="sky-fact__label">{{ tt('astro.planets.mercury') }}</span>
            <span class="sky-fact__value">℞ {{ tt('skyPage.retrograde') }}</span>
          </div>
        </section>

        <!-- Moon calendar -->
        <section class="sky-cal">
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

        <!-- Upcoming events -->
        <section class="sky-events">
          <div class="sky-section-title">{{ tt('skyPage.eventsTitle') }}</div>
          <div class="sky-events__row">
            <div v-for="ev in eventList" :key="ev.key" class="sky-event">
              <div class="sky-event__name">{{ tt(`skyPage.events.${ev.key}`) }}</div>
              <div class="sky-event__when">{{ untilLabel(ev.daysUntil) }}</div>
              <div class="sky-event__date">{{ formatShort(ev.date) }}</div>
            </div>
          </div>
        </section>

        <!-- Planets now -->
        <section class="sky-planets">
          <div class="sky-section-title">{{ tt('skyPage.planetsTitle') }}</div>
          <div v-for="p in planets" :key="p.planetKey" class="sky-planet">
            <span class="sky-planet__name">{{ tt(`astro.planets.${p.planetKey}`) }}</span>
            <span class="sky-planet__sign">
              {{ tt(`zodiac.${p.signKey}`) }} {{ p.degInSign }}°
              <span v-if="p.retrograde" class="sky-planet__rx">℞</span>
            </span>
          </div>
        </section>

        <!-- Secondary: reflection + card (demoted) -->
        <section class="sky-secondary">
          <button type="button" class="sky-secondary__item" @click="go('journal')">
            <q-icon name="edit_note" size="18px" />
            <span>{{ tt('skyPage.secondaryReflection') }}</span>
            <q-icon name="chevron_right" size="16px" class="sky-secondary__arrow" />
          </button>
          <button type="button" class="sky-secondary__item" @click="go('daily')">
            <q-icon name="style" size="18px" />
            <span>{{ tt('skyPage.secondaryCard') }}</span>
            <q-icon name="chevron_right" size="16px" class="sky-secondary__arrow" />
          </button>
        </section>
      </template>
    </div>
  </q-page>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { t, currentLocale } from 'src/i18n'
import {
  computeSkyForDate,
  computeMonthMoonPhases,
  findUpcomingLunarEvents,
  computePlanetSigns,
} from 'src/helpers/skyCore.js'

const locale = computed(() => currentLocale.value || 'en')
const tt = (key, vars) => {
  let s = t(locale.value, key)
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v)
  return s
}
const router = useRouter()

const loading = ref(true)
const sky = ref(null)
const events = ref({})
const planets = ref([])
const monthCells = ref([])
const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth())
const moonCanvas = ref(null)

let Astronomy = null
let enginePromise = null
const loadEngine = async () => {
  if (!enginePromise) enginePromise = import('astronomy-engine')
  const mod = await enginePromise
  return mod?.default || mod
}

// Realistic moon: sphere-shaded surface, accurate terminator (polygon of the lit
// region — no canvas winding ambiguity), maria, glow, dark earthshine.
const drawMoon = (canvas, illumination, waxing, { detail = true } = {}) => {
  if (!canvas) return
  const dpr = Math.min(window.devicePixelRatio || 2, 3)
  const cssSize = canvas.clientWidth || 120
  canvas.width = cssSize * dpr
  canvas.height = cssSize * dpr
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const size = cssSize
  const cx = size / 2
  const cy = size / 2
  const r = (size / 2) * (detail ? 0.82 : 0.92)
  const f = Math.max(0, Math.min(1, illumination))
  const litDir = waxing ? 1 : -1
  ctx.clearRect(0, 0, size, size)

  if (detail) {
    const glow = ctx.createRadialGradient(cx, cy, r * 0.75, cx, cy, r * 1.55)
    glow.addColorStop(0, `rgba(198,216,255,${0.06 + 0.16 * f})`)
    glow.addColorStop(1, 'rgba(198,216,255,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, size, size)
  }

  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()

  const sh = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r)
  sh.addColorStop(0, 'rgba(14,19,33,1)')
  sh.addColorStop(1, 'rgba(7,10,20,1)')
  ctx.fillStyle = sh
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2)

  // Lit-region polygon: terminator (top→bottom) then lit limb (bottom→top).
  const N = detail ? 90 : 40
  ctx.beginPath()
  for (let i = 0; i <= N; i += 1) {
    const y = -r + (2 * r * i) / N
    const X = Math.sqrt(Math.max(0, r * r - y * y))
    const px = cx + litDir * X * (1 - 2 * f)
    const py = cy + y
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  for (let i = N; i >= 0; i -= 1) {
    const y = -r + (2 * r * i) / N
    const X = Math.sqrt(Math.max(0, r * r - y * y))
    ctx.lineTo(cx + litDir * X, cy + y)
  }
  ctx.closePath()
  ctx.save()
  ctx.clip()
  const litX = cx + litDir * r * 0.42
  const surf = ctx.createRadialGradient(litX, cy - r * 0.22, r * 0.1, cx, cy, r * 1.2)
  surf.addColorStop(0, '#f2f4f8')
  surf.addColorStop(0.55, '#ccd0da')
  surf.addColorStop(1, '#8f93a1')
  ctx.fillStyle = surf
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
  if (detail) {
    const maria = [
      [0.34, 0.3, 0.22, 0.19],
      [0.56, 0.4, 0.15, 0.13],
      [0.44, 0.58, 0.2, 0.16],
      [0.66, 0.63, 0.12, 0.1],
      [0.3, 0.5, 0.1, 0.09],
    ]
    for (const [mx, my, mrx, mry] of maria) {
      const qx = cx + (mx - 0.5) * 2 * r
      const qy = cy + (my - 0.5) * 2 * r
      const g = ctx.createRadialGradient(qx, qy, 0, qx, qy, mrx * r * 2.2)
      g.addColorStop(0, 'rgba(116,120,136,0.5)')
      g.addColorStop(1, 'rgba(116,120,136,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.ellipse(qx, qy, mrx * r, mry * r, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()

  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  const ring = ctx.createRadialGradient(cx, cy, r * 0.86, cx, cy, r)
  ring.addColorStop(0, 'rgba(0,0,0,0)')
  ring.addColorStop(1, 'rgba(0,0,0,0.28)')
  ctx.fillStyle = ring
  ctx.fill()
  ctx.restore()
}

const drawCalendarMoons = () => {
  const nodes = document.querySelectorAll('.sky-cal__moon')
  nodes.forEach((canvas) => {
    const illum = Number(canvas.getAttribute('data-illum')) || 0
    const waxing = canvas.getAttribute('data-waxing') === '1'
    drawMoon(canvas, illum, waxing, { detail: false })
  })
}

const buildMonth = () => {
  if (!Astronomy) return
  const cells = computeMonthMoonPhases(Astronomy, viewYear.value, viewMonth.value)
  const now = new Date()
  const isThisMonth = now.getFullYear() === viewYear.value && now.getMonth() === viewMonth.value
  monthCells.value = cells.map((c) => ({
    ...c,
    isToday: isThisMonth && c.day === now.getDate(),
  }))
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

const leadingBlanks = computed(() => {
  // Monday-first grid.
  const first = new Date(viewYear.value, viewMonth.value, 1).getDay() // 0=Sun
  return (first + 6) % 7
})

const weekdayLabels = computed(() =>
  ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((k) => tt(`skyPage.weekdays.${k}`)),
)

const eventList = computed(() =>
  ['newMoon', 'firstQuarter', 'fullMoon', 'lastQuarter']
    .map((key) => (events.value[key] ? { key, ...events.value[key] } : null))
    .filter(Boolean)
    .sort((a, b) => a.daysUntil - b.daysUntil),
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
const untilLabel = (days) => {
  if (days <= 0) return tt('skyPage.today')
  if (days === 1) return tt('skyPage.tomorrow')
  return tt('skyPage.inDays', { n: days })
}

const go = (name) => router.push({ name, query: { source: 'sky' } })

onMounted(async () => {
  try {
    Astronomy = await loadEngine()
    const now = new Date()
    sky.value = computeSkyForDate(Astronomy, now)
    events.value = findUpcomingLunarEvents(Astronomy, now)
    planets.value = computePlanetSigns(Astronomy, now)
    buildMonth()
  } catch (e) {
    console.error('[SkyPage] load failed', e)
  } finally {
    loading.value = false
  }
  // Draw only after loading=false so the canvases are actually in the DOM
  // (the hero + calendar live in the v-else-if="sky" branch).
  await nextTick()
  if (sky.value) {
    drawMoon(moonCanvas.value, sky.value.illumination, sky.value.waxing, { detail: true })
    drawCalendarMoons()
  }
})
</script>

<style scoped lang="scss">
.sky-page {
  min-height: 100vh;
  color: #e9edf4;
  position: relative;
  overflow: hidden;
}
.sky-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(140% 80% at 50% -10%, #0d2740 0%, #081521 42%, #04080f 100%);
  z-index: 0;
}
.sky-content {
  position: relative;
  z-index: 1;
  padding: calc(24px + env(safe-area-inset-top)) 16px 96px;
  max-width: 520px;
  margin: 0 auto;
  display: grid;
  gap: 22px;
}
.sky-loading {
  display: flex;
  justify-content: center;
  padding: 120px 0;
}
.sky-header {
  text-align: center;
  display: grid;
  gap: 4px;
}
.sky-kicker {
  font-size: 11px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: rgba(184, 205, 236, 0.62);
}
.sky-date {
  font-size: 15px;
  color: rgba(233, 240, 250, 0.9);
  text-transform: capitalize;
}

.sky-hero {
  display: grid;
  justify-items: center;
  gap: 6px;
  padding: 6px 0 4px;
}
.sky-hero__moon {
  width: min(74vw, 300px);
  height: min(74vw, 300px);
  filter: drop-shadow(0 10px 40px rgba(120, 160, 220, 0.22));
}
.sky-hero__phase {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 0.01em;
  margin-top: 6px;
}
.sky-hero__illum {
  font-size: 13px;
  color: rgba(184, 205, 236, 0.72);
}
.sky-hero__meta {
  font-size: 13px;
  color: rgba(210, 224, 244, 0.82);
  text-align: center;
}
.sky-hero__next {
  color: rgba(184, 205, 236, 0.6);
}

.sky-facts {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}
.sky-fact {
  display: grid;
  gap: 2px;
  padding: 8px 14px;
  border-radius: 14px;
  border: 1px solid rgba(148, 178, 214, 0.12);
  background: rgba(13, 22, 36, 0.55);
  text-align: center;
}
.sky-fact--rx {
  border-color: rgba(226, 176, 120, 0.3);
}
.sky-fact__label {
  font-size: 9px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(184, 205, 236, 0.55);
}
.sky-fact__value {
  font-size: 13px;
  color: rgba(233, 240, 250, 0.94);
}

.sky-section-title {
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(184, 205, 236, 0.55);
  margin-bottom: 10px;
}

.sky-cal {
  border-radius: 20px;
  border: 1px solid rgba(148, 178, 214, 0.1);
  background: linear-gradient(180deg, rgba(15, 25, 40, 0.5), rgba(8, 14, 24, 0.6));
  padding: 14px;
}
.sky-cal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.sky-cal__title {
  font-size: 15px;
  font-weight: 600;
  text-transform: capitalize;
}
.sky-cal__nav {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(10, 16, 26, 0.6);
  color: rgba(214, 225, 242, 0.8);
  display: grid;
  place-items: center;
}
.sky-cal__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}
.sky-cal__grid--head {
  margin-bottom: 6px;
}
.sky-cal__wd {
  text-align: center;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(184, 205, 236, 0.45);
}
.sky-cal__blank {
  aspect-ratio: 1;
}
.sky-cal__day {
  position: relative;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border-radius: 10px;
}
.sky-cal__day--today {
  background: rgba(96, 148, 210, 0.18);
  border: 1px solid rgba(141, 190, 240, 0.4);
}
.sky-cal__moon {
  width: 78%;
  height: 78%;
}
.sky-cal__num {
  position: absolute;
  bottom: 1px;
  font-size: 8px;
  color: rgba(214, 225, 242, 0.6);
}

.sky-events__row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.sky-event {
  border-radius: 14px;
  border: 1px solid rgba(148, 178, 214, 0.1);
  background: rgba(13, 22, 36, 0.5);
  padding: 12px 14px;
  display: grid;
  gap: 2px;
}
.sky-event__name {
  font-size: 13px;
  font-weight: 600;
  color: rgba(233, 240, 250, 0.94);
}
.sky-event__when {
  font-size: 12px;
  color: rgba(141, 190, 240, 0.9);
}
.sky-event__date {
  font-size: 11px;
  color: rgba(184, 205, 236, 0.55);
}

.sky-planet {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 2px;
  border-bottom: 1px solid rgba(148, 178, 214, 0.08);
}
.sky-planet:last-child {
  border-bottom: 0;
}
.sky-planet__name {
  font-size: 14px;
  color: rgba(233, 240, 250, 0.9);
}
.sky-planet__sign {
  font-size: 13px;
  color: rgba(184, 205, 236, 0.8);
}
.sky-planet__rx {
  color: rgba(226, 176, 120, 0.95);
  margin-left: 4px;
}

.sky-secondary {
  display: grid;
  gap: 8px;
}
.sky-secondary__item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid rgba(148, 178, 214, 0.1);
  background: rgba(11, 18, 30, 0.55);
  color: rgba(214, 225, 242, 0.85);
  font-size: 14px;
  cursor: pointer;
}
.sky-secondary__arrow {
  position: absolute;
  right: 12px;
  color: rgba(214, 225, 242, 0.4);
}
</style>

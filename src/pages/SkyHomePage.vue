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
        <button type="button" class="skh-loc hit-44" @click="locationOpen = true">
          <span class="skh-loc__dot"></span>
          <span class="skh-loc__name">{{ locationLabel }}</span>
          <q-icon name="expand_more" size="15px" class="skh-loc__caret" />
        </button>
        <div class="skh-kick">{{ tt('skyHome.kicker') }} · {{ formatToday }}</div>
      </header>

      <div class="skh-hero">
        <div class="skh-moonwrap">
          <div class="skh-moonhalo" aria-hidden="true"></div>
          <canvas ref="moonCanvas" class="skh-moon"></canvas>
        </div>
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
          <div class="skh-fact">
            <span class="skh-fact__label">{{ tt('skyHome.sunset') }}</span>
            <span class="skh-fact__val">{{ formatTime(sun.sunset) }}</span>
          </div>
          <div v-if="sun.darkStart" class="skh-fact">
            <span class="skh-fact__label">{{ tt('skyHome.darkShort') }}</span>
            <span class="skh-fact__val">{{ formatTime(sun.darkStart) }}</span>
          </div>
          <div v-if="topVisible" class="skh-fact">
            <span class="skh-fact__label">{{ tt('skyHome.visibleShort') }}</span>
            <span class="skh-fact__val">
              {{ tt(`astro.planets.${topVisible.planetKey}`) }} · {{ tt(`skyHome.compass.${topVisible.azimuthKey}`) }}
            </span>
          </div>
        </div>
      </div>

      <footer class="skh-foot">
        <button type="button" class="skh-more" @click="openSky">
          <span>{{ tt('skyHome.openSky') }}</span>
          <q-icon name="chevron_right" size="18px" />
        </button>
        <div class="skh-credit">{{ tt('skyHome.credit') }}</div>
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { t, currentLocale } from 'src/i18n'
import {
  computeSkyForDate,
  computeSunTimes,
  computeVisibleTonight,
  findUpcomingLunarEvents,
  riseSetForLocalDay,
  makeObserver,
} from 'src/helpers/skyCore.js'
import { drawMoon, onMoonReady } from 'src/helpers/moonRender.js'
import { createShootingStars } from 'src/helpers/starfield.js'
import milkywayUrl from 'src/assets/images/milkyway.webp'
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
const nextFullMoon = ref(null)
const moonCanvas = ref(null)
const fxCanvas = ref(null)
const locationOpen = ref(false)
const cities = SKY_CITIES
const loc = skyLocation
const skyStyle = { backgroundImage: `url(${milkywayUrl})` }

const topVisible = computed(() => visible.value[0] || null)

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
  const colors = ['rgba(255,255,255,0.95)', 'rgba(159,216,246,0.85)', 'rgba(255,220,180,0.70)']
  const out = []
  for (let i = 0; i < 24; i += 1) {
    const dur = 8 + Math.random() * 14
    out.push({
      id: i,
      style: {
        '--x': (Math.random() * 100).toFixed(2),
        '--y': (Math.random() * 100).toFixed(2),
        '--s': (1.2 + Math.random() * 2.8).toFixed(2),
        '--blur': (Math.random() * 1.2).toFixed(2),
        '--dur': dur.toFixed(2),
        '--delay': (-Math.random() * dur).toFixed(2),
        '--dx': (-22 + Math.random() * 44).toFixed(2),
        '--dy': (-(90 + Math.random() * 150)).toFixed(2),
        '--o': (0.25 + Math.random() * 0.6).toFixed(2),
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
}

const redrawMoon = () => {
  if (!sky.value) return
  drawMoon(moonCanvas.value, sky.value.illumination, sky.value.waxing, { detail: true })
}
onMoonReady(redrawMoon)

let skyFx = null
let resizeRaf = 0
const onResize = () => {
  cancelAnimationFrame(resizeRaf)
  resizeRaf = requestAnimationFrame(() => {
    skyFx?.resize()
    redrawMoon()
  })
}

const pickCity = (cityKey) => {
  setSkyLocationCity(cityKey)
  locationOpen.value = false
}
const useMyLocation = async () => {
  await detectSkyLocation()
  locationOpen.value = false
}

const locationLabel = computed(() =>
  loc.value.cityKey ? tt(`skyHome.cities.${loc.value.cityKey}`) : tt('skyHome.myLocation'),
)
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

const openSky = () => router.push({ name: 'sky', query: { source: 'sky_home' } })

watch(
  () => loc.value,
  () => {
    recompute()
    void nextTick(() => redrawMoon())
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
  buildParticles()
  await nextTick()
  redrawMoon()
  skyFx = createShootingStars(fxCanvas.value)
  skyFx.start()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  cancelAnimationFrame(resizeRaf)
  skyFx?.stop()
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
  transform: scale(1.16);
  animation: skh-drift 58s ease-in-out infinite alternate;
  will-change: transform;
}
@keyframes skh-drift {
  0% {
    transform: scale(1.16) translate(-1.6%, -1.3%);
  }
  100% {
    transform: scale(1.24) translate(1.8%, 2.8%);
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
  padding: calc(14px + env(safe-area-inset-top)) 22px calc(80px + env(safe-area-inset-bottom));
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
  // Bound by BOTH width and height so the whole screen always fits.
  width: min(62vw, 34vh, 300px);
  aspect-ratio: 1;
  filter: drop-shadow(0 12px 50px rgba(150, 180, 230, 0.32));
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
.skh-credit {
  font-size: 9.5px;
  color: rgba(150, 172, 200, 0.4);
  text-align: center;
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
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(9, 14, 23, 0.65);
  color: rgba(214, 225, 242, 0.85);
  font-size: 14px;
}
.skh-sheet__city--active {
  border-color: rgba(141, 190, 240, 0.5);
  background: rgba(64, 96, 156, 0.3);
  color: #fff;
}
</style>

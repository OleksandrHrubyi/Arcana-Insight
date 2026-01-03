<template>
  <div ref="container" class="container">
    <div class="date-info">
      <div class="date-info-label date-top">DAILY HOROSCOPE</div>
      <div class="date-info-label date-bottom">{{monthDayLabel}}</div>
    </div>

    <!-- ✅ SVG MASK + CLIP + BACKGROUND IMAGE -->
    <svg
      class="sector-svg"
      :viewBox="`0 0 ${svgW} ${svgH}`"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <mask id="ringMask" maskUnits="userSpaceOnUse">
          <rect :width="svgW" :height="svgH" fill="black" />
          <circle :cx="maskCx" :cy="maskCy" :r="maskRTop" fill="white" />
          <circle :cx="maskCx" :cy="maskCy" :r="maskRBottom" fill="black" />
        </mask>

        <clipPath id="sectorClip" clipPathUnits="userSpaceOnUse">
          <polygon :points="clipPoints" />
        </clipPath>

        <!-- ✅ SVG-friendly gradient (без rgba у stop-color) -->
        <linearGradient id="fadeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#000" stop-opacity="0.10" />
          <stop offset="100%" stop-color="#000" stop-opacity="0.55" />
        </linearGradient>
      </defs>

      <g mask="url(#ringMask)" clip-path="url(#sectorClip)">
        <!-- ✅ ЗОРІ (твій файл) -->
        <image
          ref="bgImg"
          :href="bgHref"
          :x="bgX"
          :y="bgY"
          :width="bgSize"
          :height="bgSize"
          preserveAspectRatio="xMidYMin slice"
        />
        <rect :width="svgW" :height="svgH" fill="url(#fadeGrad)" />
      </g>
    </svg>

    <!-- ЛІНІЇ -->
    <div ref="lineLeft" class="line" aria-hidden="true"></div>
    <div ref="lineRight" class="line" aria-hidden="true"></div>

    <div class="top-round" aria-hidden="true"></div>
    <div ref="topBg" class="top-bg" aria-hidden="true"></div>

    <div ref="stage" class="wheel-stage">
      <!-- ✅ колесо: тепер БЕЗ :style — крутиться імперативно -->
      <div ref="wheel" class="wheel" :class="{ gpu: gpuOn }" aria-hidden="true"></div>

      <div class="active-zodiac" aria-hidden="false">
        <div class="active-zodiac-name">{{ activeZodiac.name }}</div>
        <div class="active-zodiac-dates">{{ activeZodiac.dates }}</div>
      </div>

      <div
        ref="dragLayer"
        class="drag-layer"
        :class="{ dragging: isDragging }"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @lostpointercapture="onPointerUp"
      />
    </div>

    <div ref="centerRound" class="center-round" aria-hidden="true">
      <div class="bottom-wrapper">
        <div class="q-px-sm q-pt-md horoscope-info">
<!--          <div class="horoscope-info-title"> Love</div>-->
<!--          <div class="horoscope-info-style">-->
<!--            {{ horoscope[activeZodiac.key]?.love?.detailed }}-->
<!--          </div>-->

          <!--                        energy: {{horoscope[activeZodiac.key]?.energy?.summary}}-->
          <!--                        career: {{horoscope[activeZodiac.key]?.career?.summary}}-->
          <q-tab-panels
            v-model="themeTab"
            animated
            swipeable
            class="bg-transparent"
          >
            <q-tab-panel name="love" class="q-pa-none">
              <div class="horoscope-info-title"> Love</div>
              <div class="horoscope-info-style">
                {{ horoscope[activeZodiac.key]?.love?.detailed }}
              </div>
            </q-tab-panel>

            <q-tab-panel name="career" class="q-pa-none">
              <div class="horoscope-info-title"> Career</div>
              <div class="horoscope-info-style">{{ horoscope[activeZodiac.key]?.career?.summary || '' }}</div>
            </q-tab-panel>

            <q-tab-panel name="energy" class="q-pa-none">
              <div class="horoscope-info-title"> Energy</div>
              <div class="horoscope-info-style">{{ horoscope[activeZodiac.key]?.energy?.summary || '' }}</div>
            </q-tab-panel>
          </q-tab-panels>

          <!-- dots -->
          <div class="dots">
            <button class="dot" :class="{ active: themeTab === 'love' }" @click="themeTab = 'love'"></button>
            <button class="dot" :class="{ active: themeTab === 'career' }" @click="themeTab = 'career'"></button>
            <button class="dot" :class="{ active: themeTab === 'energy' }" @click="themeTab = 'energy'"></button>
          </div>
        </div>
      </div>
    </div>

    <div class="bottom-info" aria-hidden="true"></div>
    <div class="bottom-bg-wrap"></div>
  </div>
</template>

<script>
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { createClient } from "@supabase/supabase-js";
import { localISODate } from 'src/helpers/date.js';
import { saveLocal, loadLocal } from 'src/helpers/localStorageSaver.js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

const DESIGN_W = 440;
const DESIGN_TOP_INSET = 30;
const DESIGN_GAP = 144;
const JOIN_OFFSET = 10;
const ACTIVE_OFFSET = 0;

const BG_MAX = 2048;
const BG_NUDGE_Y_DESIGN = -260;
const BG_NUDGE_X_DESIGN = 0;

const FLING_THRESHOLD_DEG_PER_SEC = 80;
const INERTIA_FRICTION_PER_SEC = 15.2;
const SNAP_STIFFNESS = 90;
const SNAP_DAMPING = 18;

export default {
  name: 'HoroscopeComponent',

  data() {
    return {
      rotation: 0,
      desiredRotation: 0,
      omega: 0,

      mode: 'idle',
      snapTarget: 0,
      lastFrameTs: 0,

      isDragging: false,
      activePointerId: null,
      center: { x: 0, y: 0 },
      startAngle: 0,
      startRotation: 0,

      lastMoveTs: 0,
      lastMoveAngle: 0,

      dragGain: 1,
      velocityGain: 1,

      rafId: null,
      isAnimating: false,

      sectorCount: 12,
      currentSector: 0,
      lastSnapIndex: 0,

      hapticCooldownMs: 70,
      lastHapticTs: 0,
      lastHapticSnapIndex: null,

      gpuOn: false,

      svgW: 0,
      svgH: 0,
      maskCx: 0,
      maskCy: 0,
      maskRBottom: 0,
      maskRTop: 0,
      clipPoints: '',

      bgHref: '/images/test333.svg',
      bgX: 0,
      bgY: 0,
      bgSize: 1024,

      zodiacMeta: [
        { key: 'capricorn', name: 'CAPRICORN', dates: '(22.12 – 19.01)' },
        { key: 'aquarius', name: 'AQUARIUS', dates: '(20.01 – 18.02)' },
        { key: 'pisces', name: 'PISCES', dates: '(19.02 – 20.03)' },
        { key: 'aries', name: 'ARIES', dates: '(21.03 – 19.04)' },
        { key: 'taurus', name: 'TAURUS', dates: '(20.04 – 20.05)' },
        { key: 'gemini', name: 'GEMINI', dates: '(21.05 – 20.06)' },
        { key: 'cancer', name: 'CANCER', dates: '(21.06 – 22.07)' },
        { key: 'leo', name: 'LEO', dates: '(23.07 – 22.08)' },
        { key: 'virgo', name: 'VIRGO', dates: '(23.08 – 22.09)' },
        { key: 'libra', name: 'LIBRA', dates: '(23.09 – 22.10)' },
        { key: 'scorpio', name: 'SCORPIO', dates: '(23.10 – 21.11)' },
        { key: 'sagittarius', name: 'SAGITTARIUS', dates: '(22.11 – 21.12)' },
      ],

      horoscopeToday: '',
      selectedLocale: 'uk',

      // ✅ РЕЄСТР замість масиву
      // horoscope[signKey][theme] = { summary, detailed }
      horoscope: {},

      midnightTimer: null,
      themeTab: 'love'
    };
  },

  computed: {
    stepDeg() {
      return 360 / this.sectorCount;
    },

    activeZodiac() {
      const idx = this.mod(this.currentSector + ACTIVE_OFFSET, 12);
      return this.zodiacMeta[idx];
    },

    monthDayLabel() {
      const now = new Date();
      const label = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(now);
      return label.toUpperCase();
    },

    // ✅ доступ в розмітці:
    // horoscope[activeZodiac.key]?.love?.summary ...
    loveHoroscope() {
      const key = this.activeZodiac?.key;
      return this.horoscope?.[key]?.love?.summary ?? '';
    },
    careerHoroscope() {
      const key = this.activeZodiac?.key;
      return this.horoscope?.[key]?.career?.summary ?? '';
    },
    energyHoroscope() {
      const key = this.activeZodiac?.key;
      return this.horoscope?.[key]?.energy?.summary ?? '';
    },
  },

  mounted() {
    const saved = localStorage.getItem('locale');
    if (saved === 'uk' || saved === 'en') {
      this.selectedLocale = saved;
    }

    this.setVh();
    this.loadHoroscopesForDay();

    this.rotation = Math.round(this.rotation / this.stepDeg) * this.stepDeg;
    this.desiredRotation = this.rotation;
    this.lastSnapIndex = Math.floor(this.rotation / this.stepDeg + 0.5);
    this.currentSector = this.mod(this.lastSnapIndex, this.sectorCount);
    this.horoscopeToday = new Date();
    this.applyScale();

    this.$nextTick(() => {
      this.recalcCenter();
      this.layoutAll();
      this.applyRotationToView(this.rotation, false);

      window.addEventListener('resize', this.onResize, { passive: true });
      window.addEventListener('orientationchange', this.onResize, { passive: true });
    });

    this.scheduleMidnightRefresh();
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onResize);
    this.stopLoop();

    const drag = this.$refs.dragLayer;
    if (this.activePointerId != null && drag?.releasePointerCapture) {
      try { drag.releasePointerCapture(this.activePointerId); } catch (e) { console.log(e); }
    }
    clearTimeout(this.midnightTimer);
  },

  methods: {
    // ✅ перетворює масив рядків в реєстр
    rowsToRegistry(rows) {
      const reg = {};
      for (const row of rows ?? []) {
        const sign = row.sign;   // 'aries'
        const theme = row.theme; // 'love'|'career'|'energy'
        if (!sign || !theme) continue;

        if (!reg[sign]) reg[sign] = {};
        reg[sign][theme] = {
          summary: row.summary,
          detailed: row.detailed,
        };
      }
      return reg;
    },

    // ✅ перетворює реєстр назад у rows (щоб зберігати як раніше, нічого не ламати)
    registryToRows(reg) {
      const rows = [];
      for (const sign of Object.keys(reg || {})) {
        const themes = reg[sign] || {};
        for (const theme of Object.keys(themes)) {
          const item = themes[theme] || {};
          rows.push({
            sign,
            theme,
            summary: item.summary ?? '',
            detailed: item.detailed ?? '',
          });
        }
      }
      return rows;
    },

    async loadHoroscopesForDay({ forceNetwork = false } = {}) {
      const locale = this.selectedLocale;
      const today = localISODate(); // локальна дата юзера

      // 1) локально (як було)
      if (!forceNetwork) {
        const local = await loadLocal();
        if (
          local?.date === today &&
          local?.locale === locale &&
          Array.isArray(local?.rows) &&
          local.rows.length
        ) {
          // ✅ тепер кладемо в реєстр
          this.horoscope = this.rowsToRegistry(local.rows);
          return;
        }
      }

      const fetchByDate = async (date) => {
        const { data, error } = await supabase
        .from("horoscopes")
        .select("sign, theme, summary, detailed")
        .eq("date", date)
        .eq("locale", locale);

        if (error) throw error;
        return data ?? [];
      };

      // 2) мережа: today, якщо пусто — tomorrow (як було)
      let rows = await fetchByDate(today);

      if (!rows.length) {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const tomorrow = `${y}-${m}-${day}`;
        rows = await fetchByDate(tomorrow);
      }

      // ✅ кладемо в реєстр
      const reg = this.rowsToRegistry(rows);
      this.horoscope = reg;

      // 3) зберігаємо локально (структуру з rows лишаємо як є, щоб не ламати твій saver)
      await saveLocal({ date: today, locale, rows: this.registryToRows(reg) });
    },

    scheduleMidnightRefresh() {
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const ms = nextMidnight - now + 200;

      this.midnightTimer = setTimeout(async () => {
        await this.loadHoroscopesForDay({ forceNetwork: true });
        this.scheduleMidnightRefresh();
      }, ms);
    },

    setVh() {
      const vh = window.innerHeight * 0.01;
      const el = this.$refs.container;
      if (el) el.style.setProperty('--vh', `${vh}px`);
    },

    onResize() {
      this.setVh();
      this.applyScale();
      this.$nextTick(() => {
        this.recalcCenter();
        this.layoutAll();
        this.applyRotationToView(this.rotation, false);
      });
    },

    applyScale() {
      const el = this.$refs.container;
      if (!el) return;
      const W = el.getBoundingClientRect().width;
      el.style.setProperty('--s', W / DESIGN_W);
    },

    setLine(el, x1, y1, x2, y2) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      const ang = (Math.atan2(dy, dx) * 180) / Math.PI;

      el.style.left = `${x1}px`;
      el.style.top = `${y1}px`;
      el.style.width = `${len}px`;
      el.style.transform = `rotate(${ang}deg)`;
    },

    layoutAll() {
      this.layoutLinesAndSvg();
    },

    layoutLinesAndSvg() {
      const container = this.$refs.container;
      const leftEl = this.$refs.lineLeft;
      const rightEl = this.$refs.lineRight;
      const centerRound = this.$refs.centerRound;
      const wheel = this.$refs.wheel;

      if (!container || !leftEl || !rightEl || !centerRound || !wheel) return;

      const rect = container.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;
      const s = W / DESIGN_W;

      this.svgW = W;
      this.svgH = H;

      const cx = W / 2;
      const halfGap = (DESIGN_GAP / 2) * s;
      const inset = DESIGN_TOP_INSET * s;

      const c = centerRound.getBoundingClientRect();
      const yJoin = (c.top - rect.top) + (JOIN_OFFSET * s);

      const leftTop = { x: inset, y: 0 };
      const rightTop = { x: W - inset, y: 0 };
      const leftBottom = { x: cx - halfGap, y: yJoin };
      const rightBottom = { x: cx + halfGap, y: yJoin };

      this.setLine(leftEl, leftTop.x, leftTop.y, leftBottom.x, leftBottom.y);
      this.setLine(rightEl, rightTop.x, rightTop.y, rightBottom.x, rightBottom.y);

      this.clipPoints = [
        `${leftTop.x},${leftTop.y}`,
        `${rightTop.x},${rightTop.y}`,
        `${rightBottom.x},${rightBottom.y}`,
        `${leftBottom.x},${leftBottom.y}`,
      ].join(' ');

      const w = wheel.getBoundingClientRect();
      const wx = (w.left - rect.left) + w.width / 2;
      const wy = (w.top - rect.top) + w.height / 2;

      const rBottom = Math.hypot(leftBottom.x - wx, leftBottom.y - wy);

      const topBg = this.$refs.topBg;
      let yTopArc = 140 * s;
      if (topBg) {
        const t = topBg.getBoundingClientRect();
        const TOP_ARC_NUDGE = 84;
        yTopArc = (t.bottom - rect.top) + ((6 - TOP_ARC_NUDGE) * s);
      }

      const rTop = Math.hypot(cx - wx, yTopArc - wy);

      this.maskCx = wx;
      this.maskCy = wy;
      this.maskRBottom = rBottom;
      this.maskRTop = rTop;

      const size = Math.min(rTop * 4, BG_MAX);
      this.bgSize = size;

      const nudgeX = BG_NUDGE_X_DESIGN * s;
      const nudgeY = BG_NUDGE_Y_DESIGN * s;

      this.bgX = wx - size / 2 + nudgeX;
      this.bgY = wy - size / 2 + nudgeY;

      this.setStarsTransform(this.rotation);
    },

    mod(n, m) {
      return ((n % m) + m) % m;
    },

    deltaAngle(a, b) {
      let d = a - b;
      while (d > 180) d -= 360;
      while (d < -180) d += 360;
      return d;
    },

    wrapRotation(rot) {
      rot = ((rot % 360) + 360) % 360;
      if (rot >= 180) rot -= 360;
      return rot;
    },

    getSnapTarget(rotation, omegaDegPerSec) {
      const step = this.stepDeg;
      const idx = rotation / step;

      const fling = Math.abs(omegaDegPerSec) > FLING_THRESHOLD_DEG_PER_SEC;
      let targetIdx;

      if (fling) {
        targetIdx = omegaDegPerSec > 0 ? Math.ceil(idx) : Math.floor(idx);
      } else {
        targetIdx = Math.round(idx);
      }
      return targetIdx * step;
    },

    applyRotationToView(rot, withHaptic) {
      const wheel = this.$refs.wheel;
      if (wheel) {
        wheel.style.transform = `translate3d(-50%, -50%, 0) rotate(${rot}deg)`;
      }
      this.setStarsTransform(rot);
      this.updateSnapState(withHaptic);
    },

    setStarsTransform(rot) {
      const img = this.$refs.bgImg;
      if (!img) return;
      img.setAttribute('transform', `rotate(${rot} ${this.maskCx} ${this.maskCy})`);
    },

    async playHapticForIndex(snapIndex) {
      if (this.lastHapticSnapIndex === snapIndex) return;
      const now = performance.now();
      if (now - this.lastHapticTs < this.hapticCooldownMs) return;

      this.lastHapticTs = now;
      this.lastHapticSnapIndex = snapIndex;

      try { await Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { console.log(e); }
    },

    updateSnapState(withHaptic = true) {
      const step = this.stepDeg;
      const snapIndex = Math.floor((-this.rotation) / step + 0.5);

      if (snapIndex !== this.lastSnapIndex) {
        this.lastSnapIndex = snapIndex;
        this.currentSector = this.mod(snapIndex, this.sectorCount);
      }
      console.log(withHaptic, 'withHaptic');
    },

    recalcCenter() {
      const wheel = this.$refs.wheel;
      if (!wheel) return;
      const rect = wheel.getBoundingClientRect();
      this.center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    },

    getPointerAngle(event) {
      const e = event.touches ? event.touches[0] : event;
      const x = e.clientX - this.center.x;
      const y = e.clientY - this.center.y;
      return (Math.atan2(y, x) * 180) / Math.PI;
    },

    startLoop(mode) {
      if (this.isAnimating) {
        this.mode = mode;
        return;
      }
      this.mode = mode;
      this.isAnimating = true;
      this.gpuOn = true;
      this.lastFrameTs = performance.now();
      this.rafId = requestAnimationFrame(this.tick);
    },

    stopLoop() {
      if (this.rafId != null) cancelAnimationFrame(this.rafId);
      this.rafId = null;
      this.isAnimating = false;
      this.mode = 'idle';
      window.setTimeout(() => { this.gpuOn = false; }, 220);
    },

    tick(now) {
      const dtMsRaw = now - this.lastFrameTs;
      this.lastFrameTs = now;

      const dtMs = Math.min(32, Math.max(1, dtMsRaw));
      const dt = dtMs / 1000;

      if (this.mode === 'drag') {
        this.rotation = this.desiredRotation;
        this.rotation = this.wrapRotation(this.rotation);
        this.applyRotationToView(this.rotation, true);
        this.rafId = requestAnimationFrame(this.tick);
        return;
      }

      if (this.mode === 'inertia') {
        this.rotation += this.omega * dt;
        this.omega *= Math.exp(-INERTIA_FRICTION_PER_SEC * dt);
        this.rotation = this.wrapRotation(this.rotation);
        this.applyRotationToView(this.rotation, false);

        if (Math.abs(this.omega) < 8) {
          this.snapTarget = this.getSnapTarget(this.rotation, this.omega);
          this.mode = 'snap';
        }

        this.rafId = requestAnimationFrame(this.tick);
        return;
      }

      if (this.mode === 'snap') {
        const diff = this.snapTarget - this.rotation;
        const accel = diff * SNAP_STIFFNESS - this.omega * SNAP_DAMPING;
        this.omega += accel * dt;
        this.rotation += this.omega * dt;

        this.rotation = this.wrapRotation(this.rotation);
        this.applyRotationToView(this.rotation, true);

        if (Math.abs(diff) < 0.08 && Math.abs(this.omega) < 6) {
          this.rotation = this.snapTarget;
          this.rotation = this.wrapRotation(this.rotation);
          this.applyRotationToView(this.rotation, true);
          this.stopLoop();
          return;
        }

        this.rafId = requestAnimationFrame(this.tick);
        return;
      }

      this.stopLoop();
    },

    onPointerDown(event) {
      const drag = this.$refs.dragLayer;
      if (!drag || this.isDragging) return;

      this.stopLoop();
      this.recalcCenter();

      this.isDragging = true;
      this.activePointerId = event.pointerId ?? null;

      this.startAngle = this.getPointerAngle(event);
      this.startRotation = this.rotation;

      this.desiredRotation = this.rotation;
      this.omega = 0;

      const now = performance.now();
      this.lastMoveTs = now;
      this.lastMoveAngle = this.startAngle;

      if (this.activePointerId != null && drag.setPointerCapture) {
        try { drag.setPointerCapture(this.activePointerId); } catch (e) { console.log(e); }
      }

      this.startLoop('drag');
    },

    onPointerMove(event) {
      if (!this.isDragging) return;
      if (this.activePointerId != null && event.pointerId != null && event.pointerId !== this.activePointerId) return;

      const now = performance.now();
      const angle = this.getPointerAngle(event);

      const d = this.deltaAngle(angle, this.startAngle);
      this.desiredRotation = this.startRotation + d * this.dragGain;

      const dtMs = Math.max(1, now - this.lastMoveTs);
      const da = this.deltaAngle(angle, this.lastMoveAngle);

      const instantOmega = (da / dtMs) * 1000 * this.dragGain * this.velocityGain;
      this.omega = this.omega * 0.82 + instantOmega * 0.18;

      this.lastMoveTs = now;
      this.lastMoveAngle = angle;
    },

    onPointerUp(event) {
      if (!this.isDragging) return;
      if (this.activePointerId != null && event?.pointerId != null && event.pointerId !== this.activePointerId) return;

      this.isDragging = false;

      const drag = this.$refs.dragLayer;
      if (this.activePointerId != null && drag?.releasePointerCapture) {
        try { drag.releasePointerCapture(this.activePointerId); } catch (e) { console.log(e); }
      }
      this.activePointerId = null;

      if (Math.abs(this.omega) < 30) {
        this.snapTarget = this.getSnapTarget(this.rotation, 0);
        this.mode = 'snap';
        return;
      }

      this.mode = 'inertia';
    },
  },
};
</script>


<style scoped lang="scss">
.container {
  --s: 1;
  --vh: 1vh;

  background: #031018;
  width: 100%;
  max-width: 440px;
  margin: 0 auto;

  height: calc(var(--vh) * 100);

  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  flex-direction: column;

  isolation: isolate;
  contain: layout paint;
}

.sector-svg {
  position: absolute;
  inset: 0;
  z-index: 60;
  pointer-events: none;
}

.line {
  position: absolute;
  height: 1px;
  background: #9fd8f6;
  transform-origin: 0 0;
  z-index: 111;
  pointer-events: none;
}

.wheel-stage {
  position: relative;
  width: 100%;
  height: calc(var(--vh) * 100);
  overflow: hidden;
}

.wheel {
  position: absolute;
  left: 50%;
  top: calc(740px * var(--s));
  width: calc(1800px * var(--s));
  height: calc(1800px * var(--s));
  border-radius: 50%;
  background: url('/images/final.svg') center/contain no-repeat;
  transform-origin: 50% 50%;
  z-index: 80;
  will-change: auto;
  transform: translate3d(-50%, -50%, 0) rotate(0deg);

  @media screen and (max-height: 670px) {
    top: calc(640px * var(--s));
  }
}

.wheel.gpu {
  will-change: transform;
  transform: translate3d(-50%, -50%, 0) rotate(0deg);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.drag-layer {
  position: absolute;
  inset: 0;
  user-select: none;
  z-index: 200;
  touch-action: none;
}

.active-zodiac {
  position: absolute;
  left: 50%;
  top: calc(520px * var(--s));
  transform: translate(-50%, -50%);
  z-index: 500;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
}

.active-zodiac-name {
  margin-top: calc(1px * var(--s));
  font-size: calc(12px * var(--s));
  letter-spacing: 0.14em;
  color: rgba(255, 255, 255, 0.92);
}

.active-zodiac-dates {
  margin-top: calc(1px * var(--s));
  font-size: calc(12px * var(--s));
  color: rgba(159, 216, 246, 0.75);
}

.top-bg {
  background-image: url('/images/darkGradientTop_1x.png');
  background-size: contain;
  background-repeat: no-repeat;
  position: absolute;
  top: calc(-10px * var(--s));
  left: 0;
  right: 0;
  height: calc(143px * var(--s));
  z-index: 300;
}

.center-round {
  background-color: #031018;
  width: calc(530px * var(--s));
  height: calc(530px * var(--s));
  border-radius: 50%;
  border: 1px solid rgba(159, 216, 246, 0.25);
  position: absolute;
  top: calc(480px * var(--s));
  z-index: 250;
  overflow: hidden;
  padding: calc(4px * var(--s));
  display: flex;
  justify-content: center;
  align-items: center;

  @media screen and (max-height: 670px) {
    top: calc(380px * var(--s));
  }
}

.top-round {
  width: calc(1378px * var(--s));
  height: calc(1378px * var(--s));
  position: absolute;
  top: calc(54px * var(--s));
  left: 50%;
  transform: translateX(-50%);
  z-index: 70;
  border: 1px solid rgba(159, 216, 246, 0.25);
  border-radius: 50%;
  pointer-events: none;
}

.bottom-info {
  bottom: 0;
  position: absolute;
  left: 0;
  right: 0;
  z-index: 260;
  background-color: #031018;
}

.date-info {
  position: absolute;
  top: 100px;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2000;
  pointer-events: none;
}

.date-info-label {
  text-align: center;
  white-space: nowrap;
  font-weight: 400;
  font-size: 16px;
  line-height: 24px;
  letter-spacing: 0.12em;
  color: #ffffff;
  margin-bottom: 8px;
}

.date-bottom {
  font-size: 14px;
  line-height: 18px;
  text-align: center;
}

.bottom-wrapper {
  width: 100%;
  height: 100%;
  border: 1px solid rgba(159, 216, 246, 0.25);
  border-radius: 50%;
  position: relative;
  display: flex;
  justify-content: center;
  padding-top: 60px;
}

.horoscope-info {
  max-width: 360px;
  text-align: center;
}

.horoscope-info-title {
  font-weight: 400;
  font-size: 18px;
  line-height: 24px;
  text-align: center;
margin-bottom: 12px;
  color: #FFFFFF;
}

.horoscope-info-style {
  font-style: normal;
  font-weight: 400;
  font-size: 16px;
  line-height: 160%;
  text-align: center;
  color: #7E8AA5;
  height: 180px;
  overflow: auto;
}

.custom-carousel {
  height: max-content;
}

.dots {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
  pointer-events: auto;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  border: none;
  background: rgba(255,255,255,0.25);
}

.dot.active {
  background: rgba(255,255,255,0.9);
}

.bottom-bg-wrap {
  position: fixed;
  bottom: 0;
  z-index: 250;
  background-color: #031018 !important;
  height: 90px;
  width: 100%;
}

@media screen and (max-height: 670px) {
  .bottom-wrapper {
    padding-top: 40px;
  }

  .date-info {
    top: 50px;
  }

  .date-info-label {
    font-size: 12px;
  }

  .horoscope-info-title {
    font-size: 14px;
    margin-bottom: 6px;
  }

  .horoscope-info-style {
    font-size: 12px;
    height: 100px;
  }

  .active-zodiac {
    top: calc(420px * var(--s));
  }

}
</style>

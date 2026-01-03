<template>
  <div ref="container" class="container">
    <div class="date-info">
      <div class="date-info-label date-top">HOROSCOPE FOR</div>
      <div class="date-info-label date-bottom">DECEMBER 19</div>
    </div>

    <!-- ✅ SVG MASK (замість CSS mask-image: radial-gradient) -->
    <svg
      class="sector-svg"
      :viewBox="`0 0 ${svgW} ${svgH}`"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <!-- Маска: біле = видно, чорне = прозоро -->
        <mask id="ringMask" maskUnits="userSpaceOnUse">
          <rect :width="svgW" :height="svgH" fill="black" />
          <!-- Кільце: велике біле коло -->
          <circle :cx="maskCx" :cy="maskCy" :r="maskRTop" fill="white" />
          <!-- Виріз: чорне внутрішнє коло -->
          <circle :cx="maskCx" :cy="maskCy" :r="maskRBottom" fill="black" />
        </mask>

        <!-- Полігон як у тебе (верхній сектор), але в SVG -->
        <clipPath id="sectorClip" clipPathUnits="userSpaceOnUse">
          <polygon :points="clipPoints" />
        </clipPath>
      </defs>

      <!-- Бекграунд під маскою+кліпом -->
      <g mask="url(#ringMask)" clip-path="url(#sectorClip)">
        <!-- image як бекграунд, rotate навколо центру -->
        <!--        <image-->
        <!--          :href="bgHref"-->
        <!--          :x="bgX"-->
        <!--          :y="bgY"-->
        <!--          :width="bgSize"-->
        <!--          :height="bgSize"-->
        <!--          :transform="`rotate(${rotation} ${maskCx} ${maskCy})`"-->
        <!--          preserveAspectRatio="xMidYMid slice"-->
        <!--        />-->
        <!-- легкий градієнт-накладка (SVG, а не ::after на величезному div) -->
        <rect :width="svgW" :height="svgH" fill="url(#fadeGrad)" opacity="1" />
      </g>

      <defs>
        <linearGradient id="fadeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(0,0,0,0.10)" />
          <stop offset="100%" stop-color="rgba(0,0,0,0.55)" />
        </linearGradient>
      </defs>
    </svg>

    <!-- ЛІНІЇ -->
    <div ref="lineLeft" class="line" aria-hidden="true"></div>
    <div ref="lineRight" class="line" aria-hidden="true"></div>

    <div class="top-round" aria-hidden="true"></div>
    <div ref="topBg" class="top-bg" aria-hidden="true"></div>

    <div ref="stage" class="wheel-stage">
      <!-- колесо -->
      <div ref="wheel" class="wheel" :class="{ gpu: gpuOn }" :style="wheelStyle" aria-hidden="true" />

      <!-- ✅ ПІДСВІТКА -->
      <div class="active-zodiac" aria-hidden="false">
        <div class="active-zodiac-name">{{ activeZodiac.name }}</div>
        <div class="active-zodiac-dates">{{ activeZodiac.dates }}</div>
      </div>

      <!-- шар для жестів -->
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
      <div class="bottom-wrapper"></div>
    </div>

    <div class="bottom-info" aria-hidden="true"></div>
  </div>
</template>

<script>
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const DESIGN_W = 440;
const DESIGN_TOP_INSET = 30;
const DESIGN_GAP = 144;
const JOIN_OFFSET = 10;
const ACTIVE_OFFSET = 0;

// ✅ Безпечний cap для iOS GPU (тримаємо текстуру <= 2048)
const BG_MAX = 2048;

export default {
  name: 'HoroscopeComponent',

  data() {
    return {
      rotation: 0,

      // pointer
      isDragging: false,
      activePointerId: null,
      center: { x: 0, y: 0 },
      startAngle: 0,
      startRotation: 0,

      // velocity (deg/ms)
      lastMoveTs: 0,
      lastMoveAngle: 0,
      velocity: 0,
      lastDir: 1,

      // tuning
      dragGain: 0.65,
      velocityGain: 0.75,
      snapVThreshold: 0.06,
      frictionPerFrame: 0.9,
      minVelocity: 0.02,
      maxVelocity: 0.85,
      snapDurationMs: 200,

      // rAF
      rafId: null,
      isAnimating: false,

      // sectors
      sectorCount: 12,
      currentSector: 0,
      lastSnapIndex: 0,

      // haptics
      hapticCooldownMs: 20,
      lastHapticTs: 0,
      lastHapticSnapIndex: null,

      // ✅ GPU: вмикаємо тільки на час обертання
      gpuOn: false,

      // ✅ SVG/layout state
      svgW: 0,
      svgH: 0,
      maskCx: 0,
      maskCy: 0,
      maskRBottom: 0,
      maskRTop: 0,
      clipPoints: '',

      // ✅ bg image placement in svg (square texture)
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

    wheelStyle() {
      return {
        transform: `translate(-50%, -50%) rotate(${this.rotation}deg)`,
        transition: 'none',
      };
    },
  },

  mounted() {
    this.setVh();

    this.rotation = Math.round(this.rotation / this.stepDeg) * this.stepDeg;
    this.lastSnapIndex = Math.floor(this.rotation / this.stepDeg + 0.5);
    this.currentSector = this.mod(this.lastSnapIndex, this.sectorCount);

    this.applyScale();
    this.$nextTick(() => {
      this.recalcCenter();
      this.layoutAll();

      window.addEventListener('resize', this.onResize, { passive: true });
      window.addEventListener('orientationchange', this.onResize, { passive: true });
    });
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onResize);

    this.stopAnim();

    const drag = this.$refs.dragLayer;
    if (this.activePointerId != null && drag?.releasePointerCapture) {
      try { drag.releasePointerCapture(this.activePointerId); } catch (e) {
        console.log(e);
      }
    }
  },

  methods: {
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
      });
    },

    applyScale() {
      const el = this.$refs.container;
      if (!el) return;
      const W = el.getBoundingClientRect().width;
      el.style.setProperty('--s', W / DESIGN_W);
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

    getSnapTarget(rotation, dir) {
      const step = this.stepDeg;
      const idx = rotation / step;
      const targetIdx = dir >= 0 ? Math.ceil(idx) : Math.floor(idx);
      return targetIdx * step;
    },

    gpuEnable() { this.gpuOn = true; },
    gpuDisableSoon() {
      // вимикаємо “дорогі” GPU шари після завершення анімацій
      window.clearTimeout(this._gpuT);
      this._gpuT = window.setTimeout(() => { this.gpuOn = false; }, 300);
    },

    async playHapticForIndex(snapIndex) {
      if (this.lastHapticSnapIndex === snapIndex) return;
      const now = performance.now();
      if (now - this.lastHapticTs < this.hapticCooldownMs) return;
      this.lastHapticTs = now;
      this.lastHapticSnapIndex = snapIndex;
      try { await Haptics.impact({ style: ImpactStyle.Light }); } catch (e) {
        console.log(e);
      }
    },

    updateSnapState(withHaptic = true) {
      const step = this.stepDeg;
      const snapIndex = Math.floor(this.rotation / step + 0.5);
      if (snapIndex !== this.lastSnapIndex) {
        this.lastSnapIndex = snapIndex;
        this.currentSector = this.mod(snapIndex, this.sectorCount);
        if (withHaptic) this.playHapticForIndex(snapIndex);
      }
    },

    stopAnim() {
      if (this.rafId != null) cancelAnimationFrame(this.rafId);
      this.rafId = null;
      this.isAnimating = false;
    },

    animateTo(targetDeg, durationMs) {
      this.stopAnim();
      this.isAnimating = true;
      this.gpuEnable();

      const from = this.rotation;
      const delta = targetDeg - from;
      const start = performance.now();
      const easeOut = (t) => 1 - Math.pow(1 - t, 3);

      const tick = (now) => {
        const t = Math.min(1, (now - start) / durationMs);
        this.rotation = from + delta * easeOut(t);
        this.updateSnapState(false);

        if (t < 1) {
          this.rafId = requestAnimationFrame(tick);
        } else {
          this.stopAnim();
          this.rotation = targetDeg;

          const idx = Math.floor(this.rotation / this.stepDeg + 0.5);
          this.lastSnapIndex = idx;
          this.currentSector = this.mod(idx, this.sectorCount);

          this.gpuDisableSoon();
        }
      };

      this.rafId = requestAnimationFrame(tick);
    },

    startInertia(initialVelocity) {
      this.stopAnim();
      this.isAnimating = true;
      this.gpuEnable();

      let v = Math.max(-this.maxVelocity, Math.min(this.maxVelocity, initialVelocity));
      let lastTs = performance.now();
      let dir = v >= 0 ? 1 : -1;

      const tick = (now) => {
        const dt = now - lastTs;
        lastTs = now;

        if (Math.abs(v) > this.snapVThreshold) dir = v >= 0 ? 1 : -1;

        this.rotation += v * dt;
        this.updateSnapState(true);

        const frames = dt / 16.6667;
        v *= Math.pow(this.frictionPerFrame, frames);

        if (Math.abs(v) <= this.minVelocity) {
          this.stopAnim();
          const target = this.getSnapTarget(this.rotation, dir);
          this.animateTo(target, this.snapDurationMs);
          return;
        }

        this.rafId = requestAnimationFrame(tick);
      };

      this.rafId = requestAnimationFrame(tick);
    },

    onPointerDown(event) {
      const drag = this.$refs.dragLayer;
      if (!drag || this.isDragging) return;

      this.stopAnim();
      this.recalcCenter();

      this.isDragging = true;
      this.gpuEnable();

      this.activePointerId = event.pointerId ?? null;
      this.startAngle = this.getPointerAngle(event);
      this.startRotation = this.rotation;

      this.lastMoveTs = performance.now();
      this.lastMoveAngle = this.startAngle;
      this.velocity = 0;

      this.lastSnapIndex = Math.floor(this.rotation / this.stepDeg + 0.5);
      this.currentSector = this.mod(this.lastSnapIndex, this.sectorCount);

      if (this.activePointerId != null && drag.setPointerCapture) {
        try { drag.setPointerCapture(this.activePointerId); } catch (e) {
          console.log(e);
        }
      }
    },

    onPointerMove(event) {
      if (!this.isDragging) return;
      if (this.activePointerId != null && event.pointerId != null && event.pointerId !== this.activePointerId) return;

      const now = performance.now();
      const angle = this.getPointerAngle(event);

      const d = this.deltaAngle(angle, this.startAngle);
      this.rotation = this.startRotation + d * this.dragGain;

      const dt = Math.max(1, now - this.lastMoveTs);
      const da = this.deltaAngle(angle, this.lastMoveAngle);

      if (Math.abs(da) > 0.02) this.lastDir = da >= 0 ? 1 : -1;

      const instantV = (da / dt) * this.dragGain * this.velocityGain;
      this.velocity = this.velocity * 0.82 + instantV * 0.18;
      this.velocity = Math.max(-this.maxVelocity, Math.min(this.maxVelocity, this.velocity));

      this.lastMoveTs = now;
      this.lastMoveAngle = angle;

      this.updateSnapState(true);
    },

    onPointerUp(event) {
      if (!this.isDragging) return;
      if (this.activePointerId != null && event?.pointerId != null && event.pointerId !== this.activePointerId) return;

      this.isDragging = false;

      const drag = this.$refs.dragLayer;
      if (this.activePointerId != null && drag?.releasePointerCapture) {
        try { drag.releasePointerCapture(this.activePointerId); } catch (e) {
          console.log(e);
        }
      }
      this.activePointerId = null;

      const v = this.velocity;

      if (Math.abs(v) < Math.max(this.minVelocity * 2, this.snapVThreshold)) {
        const target = this.getSnapTarget(this.rotation, this.lastDir);
        this.animateTo(target, this.snapDurationMs);
        return;
      }

      this.startInertia(v);
    },

    // ----- layout -----
    setLine(el, x1, y1, x2, y2) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, dx) * 180 / Math.PI;

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

      // SVG viewport = container px
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

      // points для SVG clip polygon
      this.clipPoints = [
        `${leftTop.x},${leftTop.y}`,
        `${rightTop.x},${rightTop.y}`,
        `${rightBottom.x},${rightBottom.y}`,
        `${leftBottom.x},${leftBottom.y}`,
      ].join(' ');

      // центр колеса
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

      // ✅ square texture size (cap for iOS)
      const size = Math.min(rTop * 4, BG_MAX);
      this.bgSize = size;

      // центруємо square на центрі колеса
      this.bgX = wx - size / 2;
      this.bgY = wy - size / 2;
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

  /* ✅ стабільний vh */
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

/* ✅ SVG шар бекграунду */
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

  /* ✅ не тримаємо will-change завжди */
  will-change: auto;
}

.wheel.gpu {
  will-change: transform;
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.drag-layer {
  position: absolute;
  inset: 0;
  user-select: none;
  z-index: 200;
  touch-action: none; /* тут у тебе саме жест колеса */
}

.active-zodiac {
  position: absolute;
  left: 50%;
  top: calc(420px * var(--s));
  transform: translate(-50%, -50%);
  z-index: 500;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
}

.active-zodiac-name {
  margin-top: calc(4px * var(--s));
  font-size: calc(12px * var(--s));
  letter-spacing: 0.14em;
  color: rgba(255, 255, 255, 0.92);
}

.active-zodiac-dates {
  margin-top: calc(6px * var(--s));
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
  top: calc(466px * var(--s));
  z-index: 250;
  overflow: hidden;
  padding: calc(4px * var(--s));
}

.bottom-wrapper {
  width: 100%;
  height: 100%;
  border: 1px solid rgba(159, 216, 246, 0.25);
  border-radius: 50%;
  position: relative;
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


</style>

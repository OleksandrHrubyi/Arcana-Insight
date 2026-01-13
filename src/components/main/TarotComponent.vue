<template>
  <div class="tarotPage">
    <header class="title">
      <div class="t1">TAROT&nbsp;&nbsp;CARD</div>
      <div class="t2">FOR TODAY</div>
    </header>

    <div
      ref="windowEl"
      class="wheelWindow"
      :class="{ dealt, dragging, inertia, locked: selectedIndex !== null }"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
    >
      <div class="arc arc--outer"></div>
      <div class="arc arc--inner"></div>

      <div
        v-for="(c, i) in cards"
        :key="c.id"
        class="card"
        :class="{
          hidden: !getCardMeta(i).visible,
          disabled: selectedIndex !== null && selectedIndex !== i,
          picked: selectedIndex === i
        }"
        :style="getCardStyle(i)"
        @click="pick(i)"
      >
        <div class="cardInner">
          <div class="cardBack"></div>
        </div>
      </div>
    </div>

    <div class="chooser">
      <div class="chevron" />
      <div class="hint">Choose your card</div>
    </div>

    <!-- простий оверлей БЕЗ блюра: клік поза картою = "Ні" -->
    <div v-if="selectedIndex !== null" class="confirmOverlay" @click="cancelPick"></div>

    <!-- Так / Ні -->
    <div v-if="selectedIndex !== null" class="confirmBar">
      <div class="confirmText">Open this card?</div>
      <div class="confirmActions">
        <button class="btn btnNo" @click="cancelPick">Ні</button>
        <button class="btn btnYes" @click="confirmPick">Так</button>
      </div>
    </div>
  </div>
</template>

<script>
import { Haptics } from '@capacitor/haptics';

export default {
  name: 'TarotPage',
  data() {
    const COUNT = 72;
    return {
      COUNT,
      cards: Array.from({ length: COUNT }, (_, i) => ({ id: i + 1 })),

      fanDeg: 90, // 80..110

      centerX: 0,
      centerY: 0,
      radius: 280,
      cardW: 56,

      rotation: -18,
      dealt: false,

      selectedIndex: null,
      pickedCardId: null,

      dragging: false,
      inertia: false,
      pointerId: null,
      startX: 0,
      startRot: 0,
      lastX: 0,
      lastT: 0,
      vel: 0,
      raf: 0,

      hapticActive: false,
      lastTickIndex: null,
      lastTickAt: 0,
    };
  },
  computed: {
    cardH() {
      return Math.round(this.cardW * 1.55);
    },
    stepDeg() {
      return 360 / this.COUNT;
    },
  },
  mounted() {
    this.computeGeometry();
    this._ro = new ResizeObserver(() => this.computeGeometry());
    this._ro.observe(this.$refs.windowEl);
    requestAnimationFrame(() => requestAnimationFrame(() => this.startDeal()));
  },
  beforeUnmount() {
    if (this._ro) this._ro.disconnect();
    cancelAnimationFrame(this.raf);
    clearTimeout(this._dealTimer);
    this.hapticEnd();
  },
  methods: {
    normalizeDeg(deg) {
      let d = (deg + 180) % 360;
      if (d < 0) d += 360;
      return d - 180;
    },

    computeGeometry() {
      const el = this.$refs.windowEl;
      if (!el) return;

      const w = el.clientWidth;
      const h = el.clientHeight;

      this.cardW = Math.max(52, Math.min(86, Math.round(w * 0.16)));
      this.centerX = w / 2;

      // піднімай/опускай круг
      this.centerY = Math.round(h * 0.5);

      this.radius = Math.max(240, Math.min(420, Math.round(w * 0.85)));
    },

    getCardMeta(i) {
      const thetaDeg = this.normalizeDeg(i * this.stepDeg + this.rotation);
      const theta = thetaDeg * Math.PI / 180;

      const visible = Math.abs(thetaDeg) <= this.fanDeg / 2;
      const depth = Math.cos(theta);

      return { thetaDeg, theta, visible, depth };
    },

    getCardStyle(i) {
      const { thetaDeg, theta, visible } = this.getCardMeta(i);

      const x = this.centerX + this.radius * Math.sin(theta);
      const y = this.centerY + this.radius * (Math.cos(theta) - 1);

      const rot = -thetaDeg * 0.6;

      const z = 3000 - Math.round(Math.abs(thetaDeg) * 20);
      const delay = (i * 18) + 'ms';

      return {
        width: this.cardW + 'px',
        height: this.cardH + 'px',

        '--x': (x - this.centerX) + 'px',
        '--y': (y - this.centerY) + 'px',
        '--rot': rot + 'deg',
        '--delay': delay,

        // для “витягування” карти вниз при виборі
        '--pop': '0px',
        '--scale': '1',

        left: this.centerX + 'px',
        top: this.centerY + 'px',
        zIndex: this.selectedIndex === i ? 9999 : z,
        opacity: 1,
        pointerEvents: visible ? 'auto' : 'none',
      };
    },

    startDeal() {
      this.dealt = false;
      this.selectedIndex = null;
      this.pickedCardId = null;

      clearTimeout(this._dealTimer);
      this._dealTimer = setTimeout(() => {
        this.dealt = true;
      }, 2400);
    },

    pick(i) {
      if (!this.dealt) return;
      const meta = this.getCardMeta(i);
      if (!meta.visible) return;
      if (this.selectedIndex !== null) return;

      this.selectedIndex = i;
      this.pickedCardId = this.cards[i].id;

      Haptics.selectionChanged().catch(() => {
      });
    },

    cancelPick() {
      this.selectedIndex = null;
      this.pickedCardId = null;
      Haptics.selectionChanged().catch(() => {
      });
    },

    confirmPick() {
      if (this.pickedCardId == null) return;

      Haptics.selectionChanged().catch(() => {
      });
      this.$router.push({
        name: 'TarotResult',
        params: { id: this.pickedCardId },
      });
    },

    // ===== HAPTIC (scroll) =====
    currentTickIndex() {
      const raw = (-this.rotation) / this.stepDeg;
      let idx = Math.round(raw) % this.COUNT;
      if (idx < 0) idx += this.COUNT;
      return idx;
    },
    hapticStart() {
      if (this.hapticActive) return;
      this.hapticActive = true;
      Haptics.selectionStart().catch(() => {
      });
      this.lastTickIndex = this.currentTickIndex();
      this.lastTickAt = performance.now();
    },
    hapticTickIfNeeded() {
      if (!this.hapticActive) return;

      const now = performance.now();
      if (now - this.lastTickAt < 55) return;

      const idx = this.currentTickIndex();
      if (idx === this.lastTickIndex) return;

      this.lastTickIndex = idx;
      this.lastTickAt = now;
      Haptics.selectionChanged().catch(() => {
      });
    },
    hapticEnd() {
      if (!this.hapticActive) return;
      this.hapticActive = false;
      Haptics.selectionEnd().catch(() => {
      });
    },

    stopInertia() {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.vel = 0;
      this.inertia = false;
      this.hapticEnd();
    },

    onDown(e) {
      if (!this.dealt) return;
      if (this.selectedIndex !== null) return;

      this.stopInertia();

      this.dragging = true;
      this.inertia = false;
      this.pointerId = e.pointerId;
      e.currentTarget.setPointerCapture?.(e.pointerId);

      this.startX = e.clientX;
      this.startRot = this.rotation;

      this.lastX = e.clientX;
      this.lastT = performance.now();
      this.vel = 0;

      this.hapticStart();
    },

    onMove(e) {
      if (!this.dragging || e.pointerId !== this.pointerId) return;

      const dx = e.clientX - this.startX;
      const k = 0.22;

      this.rotation = this.startRot + dx * k;

      this.hapticTickIfNeeded();

      const now = performance.now();
      const dt = Math.max(8, now - this.lastT);
      const vx = (e.clientX - this.lastX) / dt;
      this.vel = vx * k * 16.6;

      this.lastX = e.clientX;
      this.lastT = now;
    },

    onUp(e) {
      if (!this.dragging || e.pointerId !== this.pointerId) return;

      this.dragging = false;
      this.pointerId = null;
      this.inertia = true;

      const friction = 0.92;
      const minVel = 0.02;

      const tick = () => {
        this.rotation += this.vel;
        this.vel *= friction;

        this.hapticTickIfNeeded();

        if (Math.abs(this.vel) < minVel) {
          this.stopInertia();
          return;
        }
        this.raf = requestAnimationFrame(tick);
      };

      this.raf = requestAnimationFrame(tick);
    },
  },
};
</script>

<style scoped>
.tarotPage {
  height: 100vh;
  background: #0B131B;
  color: #eaf2ff;
  overflow: hidden;
  position: relative;
}

.title {
  padding-top: 62px;
  text-align: center;
  letter-spacing: 0.22em;
  font-weight: 500;
  opacity: 0.95;
}

.t1 {
  font-size: 14px;
}

.t2 {
  font-size: 12px;
  margin-top: 6px;
}

.wheelWindow {
  position: relative;
  width: 100%;
  height: 360px;
  margin-top: 60px;
  overflow: hidden;
  user-select: none;
  touch-action: none;
}

/* заблокувати саме колесо при виборі */
.wheelWindow.locked {
  pointer-events: none;
}

.wheelWindow.locked .picked {
  pointer-events: auto;
}

.arc {
  position: absolute;
  left: 50%;
  top: -210px;
  width: 160%;
  height: 520px;
  border-radius: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  border-top: 1px solid rgba(205, 141, 121, 0.85);
  opacity: 0.9;
}

.arc--inner {
  top: -198px;
  opacity: 0.6;
}

/* АНКОРИМО НИЗ */
.card {
  position: absolute;
  transform: translate(-50%, -100%);
}

.cardInner {
  width: 100%;
  height: 100%;
  transform-origin: 50% 95%;
  backface-visibility: hidden;

  /* ✅ базовий трансформ + можливість “попа” */
  transform: translate3d(var(--x), calc(var(--y) + var(--pop, 0px)), 0) rotate(var(--rot)) scale(var(--scale, 1));

  transition: transform 220ms cubic-bezier(0.2, 0.85, 0.2, 1), opacity 160ms ease, filter 160ms ease;
  will-change: transform;
}

.wheelWindow.dragging .cardInner,
.wheelWindow.inertia .cardInner {
  transition: none;
}

.cardBack {
  width: 100%;
  height: 100%;
  background-image: url("/images/cardV1.png");
  background-size: 100%;
  background-repeat: no-repeat;
  background-position: center;
}

/* стартова “роздача” */
.wheelWindow:not(.dealt) .cardInner {
  animation: deal 900ms cubic-bezier(0.2, 0.85, 0.2, 1) forwards;
  animation-delay: var(--delay);
}

.hidden {
  opacity: 0;
  pointer-events: none;
}

.disabled {
  pointer-events: none;
}

.dimmed .cardInner {
  opacity: 0.14 !important;
}

/* ✅ вибір: карта просто трохи “витягується” вниз + легкий акцент */
.picked .cardInner {
  --pop: 28px; /* скільки витягувати (20..40) */
  --scale: 1.04; /* невелике збільшення */
  filter: brightness(1.08);
}

.picked .cardBack {
  filter: drop-shadow(0 20px 40px rgba(0, 0, 0, 0.45));
}

.chooser {
  position: absolute;
  left: 50%;
  top: 515px;
  transform: translateX(-50%);
  text-align: center;
  opacity: 0.95;
}

.chevron {
  width: 0;
  height: 0;
  margin: 0 auto 10px;
  border-left: 7px solid transparent;
  border-right: 7px solid transparent;
  border-bottom: 9px solid rgba(235, 210, 170, 0.9);
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.35));
}

.hint {
  font-size: 16px;
  letter-spacing: 0.12em;
  color: rgba(234, 242, 255, 0.92);
}

@keyframes deal {
  0% {
    opacity: 0;
    transform: translate3d(0, 240px, 0) rotate(0deg) scale(0.92);
  }
  72% {
    opacity: 1;
    transform: translate3d(calc(var(--x) * 0.25), calc(var(--y) * 0.18), 0) rotate(calc(var(--rot) * 0.35)) scale(1);
  }
  100% {
    opacity: 1;
    transform: translate3d(var(--x), var(--y), 0) rotate(var(--rot)) scale(1);
  }
}

/* ===== confirm UI (без blur) ===== */
.confirmOverlay {
  position: absolute;
  inset: 0;
  z-index: 7000;
  background: transparent; /* легка плівка, можна 0 */
}

.confirmBar {
  position: absolute;
  left: 50%;
  bottom: calc(96px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  z-index: 9000;

  width: min(340px, calc(100% - 32px));
  padding: 12px 14px;

  border-radius: 18px;
  border: 1px solid rgba(205, 141, 121, 0.35);
  background: rgba(7, 14, 22, 0.72);
}

.confirmText {
  text-align: center;
  font-size: 13px;
  letter-spacing: 0.12em;
  opacity: 0.92;
  margin-bottom: 10px;
}

.confirmActions {
  display: flex;
  gap: 12px;
}

.btn {
  flex: 1;
  height: 44px;
  border-radius: 14px;
  border: 1px solid rgba(205, 141, 121, 0.45);
  background: rgba(10, 15, 22, 0.62);
  color: rgba(234, 242, 255, 0.92);
  letter-spacing: 0.10em;
  font-size: 14px;
}

.btnYes {
  border-color: rgba(235, 210, 170, 0.65);
  background: rgba(205, 141, 121, 0.18);
}

.btn:active {
  transform: translateY(1px);
}
</style>

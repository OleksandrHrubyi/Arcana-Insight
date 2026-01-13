<template>
  <div class="tarotPage">
    <header class="title">
      <div class="t1">{{ tt('tarotCard')}}</div>
      <div class="t2">{{ tt('forToday')}} </div>
    </header>

    <div
      ref="windowEl"
      class="wheelWindow"
      :class="{ dealt, dragging, inertia, locked: pendingIndex !== null }"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
    >
<!--      <div class="arc arc&#45;&#45;outer"></div>-->
<!--      <div class="arc arc&#45;&#45;inner"></div>-->

      <div
        v-for="(c, i) in cards"
        :key="c.id"
        class="card"
        :class="{
          hidden: !getCardMeta(i).visible,
          disabled: pendingIndex !== null && pendingIndex !== i,
          picked: pendingIndex === i
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
      <div class="chevron" :class="{'hidden-chevron': pendingIndex !== null }"/>
      <div class="hint" v-if="pendingIndex !== null">{{tt('openThisCard')}}</div>
      <div class="hint" v-else>{{tt('choseYourCard')}}</div>

    </div>

    <!-- overlay без blur, для tap-outside = cancel -->
    <div
      v-if="pendingIndex !== null"
      class="confirmOverlay"
      @click="cancelPick"
    ></div>

    <!-- confirm -->
    <div v-if="pendingIndex !== null" class="confirmBar">
      <div class="confirmActions">
        <div class="auth-btn-wrap">
          <q-btn @click="cancelPick" :label="tt('noTitle')" flat class="auth-btn mono-text" no-caps />
          <span class="auth-separator">|</span>
          <q-btn @click="confirmPick" :label="tt('yesTitle')" flat class="auth-btn mono-text" no-caps />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Haptics } from "@capacitor/haptics";
import { t } from 'src/i18n/index.js';
import tarotData from "../../../src/data/cardsV2/tarot_full.json";

export default {
  name: "TarotPage",
  data() {
    return {
      tarotData,
      cards: tarotData.cards || [],
      fanDeg: 90, // 80..110

      // geometry
      centerX: 0,
      centerY: 0, // "лінія" де стоїть НИЗ карт
      radius: 280,
      cardW: 56,

      // rotation
      rotation: -18,
      dealt: false,

      // selection (confirm)
      pendingIndex: null,

      // drag/inertia
      dragging: false,
      inertia: false,
      pointerId: null,
      startX: 0,
      startRot: 0,
      lastX: 0,
      lastT: 0,
      vel: 0,
      raf: 0,

      // haptic
      hapticActive: false,
      lastTickIndex: null,
      lastTickAt: 0,
      selectedLocale: 'uk',
    };
  },
  computed: {
    COUNT() {
      return this.cards.length || 72;
    },
    cardH() {
      return Math.round(this.cardW * 1.55);
    },
    stepDeg() {
      return 360 / this.COUNT;
    },
    pendingCard() {
      if (this.pendingIndex == null) return null;
      return this.cards[this.pendingIndex] || null;
    },
    tt() {
      return (key) => t(this.selectedLocale, key);
    },
  },
  mounted() {
    const saved = localStorage.getItem('locale');
    if (saved === 'uk' || saved === 'en') {
      this.selectedLocale = saved;
    }
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

      // ширші карти
      this.cardW = Math.max(52, Math.min(86, Math.round(w * 0.16)));
      this.centerX = w / 2;

      // піднімай/опускай круг
      this.centerY = Math.round(h * 0.5);

      this.radius = Math.max(240, Math.min(420, Math.round(w * 0.85)));
    },

    getCardMeta(i) {
      const thetaDeg = this.normalizeDeg(i * this.stepDeg + this.rotation);
      const theta = (thetaDeg * Math.PI) / 160;

      const visible = Math.abs(thetaDeg) <= this.fanDeg / 2;
      const depth = Math.cos(theta);

      return { thetaDeg, theta, visible, depth };
    },

    getCardStyle(i) {
      const { thetaDeg, theta, visible } = this.getCardMeta(i);

      const x = this.centerX + this.radius * Math.sin(theta);
      const y = this.centerY + this.radius * (Math.cos(theta) - 1);

      // поворот "навпаки"
      const rot = -thetaDeg * 0.6;

      const z = 3000 - Math.round(Math.abs(thetaDeg) * 20);
      const delay = i * 18 + "ms";

      return {
        width: this.cardW + "px",
        height: this.cardH + "px",

        "--x": x - this.centerX + "px",
        "--y": y - this.centerY + "px",
        "--rot": rot + "deg",
        "--delay": delay,

        left: this.centerX + "px",
        top: this.centerY + "px",

        zIndex: this.pendingIndex === i ? 9999 : z,
        opacity: 1,
        pointerEvents: visible ? "auto" : "none"
      };
    },

    startDeal() {
      this.dealt = false;
      this.pendingIndex = null;

      clearTimeout(this._dealTimer);
      this._dealTimer = setTimeout(() => {
        this.dealt = true;
      }, 2400);
    },

    // ===== selection confirm =====
    pick(i) {
      if (!this.dealt) return;
      if (this.pendingIndex !== null) return;

      const meta = this.getCardMeta(i);
      if (!meta.visible) return;

      this.pendingIndex = i;
      Haptics.selectionChanged().catch(() => {});
    },

    cancelPick() {
      this.pendingIndex = null;
      Haptics.selectionChanged().catch(() => {});
    },

    confirmPick() {
      const card = this.pendingCard;
      if (!card) return;

      Haptics.selectionChanged().catch(() => {});

      // ✅ головне: передаємо id з JSON
      this.$router.push({
        name: "TarotResult",
        params: { id: card.id }
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
      Haptics.selectionStart().catch(() => {});
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
      Haptics.selectionChanged().catch(() => {});
    },
    hapticEnd() {
      if (!this.hapticActive) return;
      this.hapticActive = false;
      Haptics.selectionEnd().catch(() => {});
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
      if (this.pendingIndex !== null) return;

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
    }
  }
};
</script>

<style scoped>
.tarotPage{
  height: 100vh;
  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
  color: #eaf2ff;
  overflow: hidden;
  position: relative;
}

.title{
  padding-top: 62px;
  text-align: center;
  letter-spacing: 0.22em;
  font-weight: 500;
  opacity: 0.95;
}
.t1{ font-size: 14px; }
.t2{ font-size: 12px; margin-top: 6px; }

.wheelWindow{
  position: relative;
  width: 100%;
  height: 440px;
  margin-top: 60px;
  overflow: hidden;
  user-select: none;
  touch-action: none;
}

/* блокуємо колесо при confirm */
.wheelWindow.locked{
  pointer-events: none;
}
.wheelWindow.locked .picked{
  pointer-events: auto;
}

/* дуги */
.arc{
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
.arc--inner{ top: -198px; opacity: 0.6; }

/* anchor низ */
.card{
  position: absolute;
  transform: translate(-50%, -100%);
}

.cardInner{
  width: 100%;
  height: 100%;
  transform-origin: 50% 95%;
  backface-visibility: hidden;

  transform: translate3d(var(--x), var(--y), 0) rotate(var(--rot));
  transition: transform 220ms cubic-bezier(0.2,0.85,0.2,1), opacity 160ms ease, filter 160ms ease;
  will-change: transform;
}

.wheelWindow.dragging .cardInner,
.wheelWindow.inertia .cardInner{
  transition: none;
}

.cardBack{
  width: 100%;
  height: 100%;
  background-image: url("/images/cardV1.png");
  background-size: 100%;
  background-repeat: no-repeat;
  background-position: center;
}

/* стартова “роздача” */
.wheelWindow:not(.dealt) .cardInner{
  animation: deal 900ms cubic-bezier(0.2,0.85,0.2,1) forwards;
  animation-delay: var(--delay);
}

.hidden{ opacity: 0; pointer-events: none; }

/* лише блокуємо кліки на інших (без затемнення) */
.disabled{
  pointer-events: none;
}

/* вибір: карта трохи виїжджає вниз */
.picked .cardInner{
  transform: translate3d(var(--x), calc(var(--y) + 28px), 0) rotate(var(--rot)) scale(1.04);
  filter: brightness(1.08);
}

.chooser{
  position: absolute;
  left: 50%;
  top: 515px;
  transform: translateX(-50%);
  text-align: center;
  opacity: 0.95;
}
.chevron{
  width: 0;
  height: 0;
  margin: 0 auto 10px;
  border-left: 7px solid transparent;
  border-right: 7px solid transparent;
  border-bottom: 9px solid rgba(235, 210, 170, 0.9);
  filter: drop-shadow(0 8px 16px rgba(0,0,0,0.35));
}
.hint{
  font-size: 16px;
  letter-spacing: 0.12em;
  color: rgba(234, 242, 255, 0.92);
  min-width: 250px;
}

@keyframes deal{
  0%{
    opacity: 0;
    transform: translate3d(0, 240px, 0) rotate(0deg) scale(0.92);
  }
  72%{
    opacity: 1;
    transform: translate3d(calc(var(--x) * 0.25), calc(var(--y) * 0.18), 0)
    rotate(calc(var(--rot) * 0.35)) scale(1);
  }
  100%{
    opacity: 1;
    transform: translate3d(var(--x), var(--y), 0) rotate(var(--rot)) scale(1);
  }
}

/* confirm UI */
.confirmOverlay{
  position: absolute;
  inset: 0;
  z-index: 7000;
  background: transparent;
}

.confirmBar{
  position: absolute;
  left: 50%;
  bottom: calc(220px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  z-index: 9000;

  width: min(340px, calc(100% - 32px));
  padding: 12px 14px;
}

.confirmActions{
  display: flex;
  align-items: center;
  justify-content: center;
}

.hidden-chevron{
  opacity: 0;
pointer-events: none}

.auth-btn-wrap {
  display: flex;
  align-items: center;
  justify-content: space-around;
}
</style>

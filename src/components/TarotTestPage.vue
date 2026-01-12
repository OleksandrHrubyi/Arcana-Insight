<!--<template>-->
<!--  <div class="tarotPage">-->
<!--    <header class="title">-->
<!--      <div class="t1">TAROT&nbsp;&nbsp;CARD</div>-->
<!--      <div class="t2">FOR TODAY</div>-->
<!--    </header>-->

<!--    &lt;!&ndash; Вікно, яке показує лише частину кола &ndash;&gt;-->
<!--    <div-->
<!--      ref="windowEl"-->
<!--      class="wheelWindow"-->
<!--      @pointerdown="onDown"-->
<!--      @pointermove="onMove"-->
<!--      @pointerup="onUp"-->
<!--      @pointercancel="onUp"-->
<!--    >-->
<!--      &lt;!&ndash; Дуги як на макеті &ndash;&gt;-->
<!--      <div class="arc arc&#45;&#45;outer"></div>-->
<!--      <div class="arc arc&#45;&#45;inner"></div>-->

<!--      &lt;!&ndash; Карти &ndash;&gt;-->
<!--      <div-->
<!--        v-for="(c, i) in cards"-->
<!--        :key="c.id"-->
<!--        class="card"-->
<!--        :class="{-->
<!--          hidden: !getCardMeta(i).visible,-->
<!--          dimmed: selectedIndex !== null && selectedIndex !== i,-->
<!--          picked: selectedIndex === i-->
<!--        }"-->
<!--        :style="getCardStyle(i)"-->
<!--        @click="pick(i)"-->
<!--      >-->
<!--        <div class="cardInner">-->
<!--          <div class="cardBack"></div>-->
<!--        </div>-->
<!--      </div>-->
<!--    </div>-->

<!--    <div class="chooser">-->
<!--      <div class="chevron" />-->
<!--      <div class="hint">Choose your card</div>-->
<!--    </div>-->
<!--  </div>-->
<!--</template>-->

<!--<script>-->
<!--export default {-->
<!--  name: "TarotPage",-->
<!--  data() {-->
<!--    const COUNT = 72;-->
<!--    return {-->
<!--      COUNT,-->
<!--      cards: Array.from({ length: COUNT }, (_, i) => ({ id: i + 1 })),-->

<!--      // wheel geometry-->
<!--      centerX: 0,-->
<!--      centerY: 0,-->
<!--      radius: 280,-->
<!--      cardW: 56,-->

<!--      // rotation-->
<!--      rotation: -18, // стартовий поворот для гарного вигляду-->
<!--      dealt: false,-->

<!--      // pick-->
<!--      selectedIndex: null,-->

<!--      // drag/inertia-->
<!--      dragging: false,-->
<!--      pointerId: null,-->
<!--      startX: 0,-->
<!--      startRot: 0,-->
<!--      lastX: 0,-->
<!--      lastT: 0,-->
<!--      vel: 0,-->
<!--      raf: 0-->
<!--    };-->
<!--  },-->
<!--  computed: {-->
<!--    cardH() {-->
<!--      return Math.round(this.cardW * 1.55);-->
<!--    },-->
<!--    stepDeg() {-->
<!--      return 360 / this.COUNT;-->
<!--    }-->
<!--  },-->
<!--  mounted() {-->
<!--    this.computeGeometry();-->

<!--    // resize-->
<!--    this._ro = new ResizeObserver(() => this.computeGeometry());-->
<!--    this._ro.observe(this.$refs.windowEl);-->

<!--    // старт анімації “роздачі”-->
<!--    requestAnimationFrame(() => requestAnimationFrame(() => this.startDeal()));-->
<!--  },-->
<!--  beforeUnmount() {-->
<!--    if (this._ro) this._ro.disconnect();-->
<!--    cancelAnimationFrame(this.raf);-->
<!--  },-->
<!--  methods: {-->
<!--    computeGeometry() {-->
<!--      const el = this.$refs.windowEl;-->
<!--      if (!el) return;-->

<!--      const w = el.clientWidth;-->
<!--      const h = el.clientHeight;-->

<!--      // адаптивний розмір карти-->
<!--      this.cardW = Math.max(40, Math.min(66, Math.round(w * 0.12)));-->

<!--      // центр кола трохи нижче “вікна”, щоб видно була дуга зверху-->
<!--      this.centerX = w / 2;-->
<!--      this.centerY = h * 1.18;-->

<!--      // радіус під мобільний екран-->
<!--      this.radius = Math.max(220, Math.min(420, Math.round(w * 0.95)));-->
<!--    },-->

<!--    // метадані для видимості/глибини-->
<!--    getCardMeta(i) {-->
<!--      const theta = (i * this.stepDeg + this.rotation) * Math.PI / 180;-->

<!--      // depth: 1 = ближче до верху (видиме), -1 = ззаду-->
<!--      const depth = Math.cos(theta);-->

<!--      // видимі тільки ті, що “спереду” (підкрути поріг)-->
<!--      const visible = depth > 0.05;-->

<!--      return { depth, visible, theta };-->
<!--    },-->

<!--    getCardStyle(i) {-->
<!--      const { depth, theta } = this.getCardMeta(i);-->

<!--      const x = this.centerX + this.radius * Math.sin(theta);-->
<!--      const y = this.centerY - this.radius * Math.cos(theta);-->

<!--      // Поворот карти по дотичній-->
<!--      const rot = (theta * 180) / Math.PI;-->

<!--      // zIndex по глибині, щоб передні перекривали задні-->
<!--      const z = Math.round((depth + 1) * 1000);-->

<!--      // “вау роздача”: під час dealt=false карти анімовані CSS-ом від deck до фіналу-->
<!--      const delay = (i * 18) + "ms";-->

<!--      return {-->
<!--        width: this.cardW + "px",-->
<!--        height: this.cardH + "px",-->

<!--        // позиція фіналу через CSS vars-->
<!--        "&#45;&#45;x": (x - this.centerX) + "px",-->
<!--        "&#45;&#45;y": (y - this.centerY) + "px",-->
<!--        "&#45;&#45;rot": (rot) + "deg",-->
<!--        "&#45;&#45;delay": delay,-->

<!--        left: this.centerX + "px",-->
<!--        top: this.centerY + "px",-->
<!--        zIndex: this.selectedIndex === i ? 9999 : z,-->

<!--        // легка прозорість для “далеких”-->
<!--        opacity: this.selectedIndex !== null && this.selectedIndex !== i ? 1 : (0.25 + 0.75 * Math.max(0, depth))-->
<!--      };-->
<!--    },-->

<!--    startDeal() {-->
<!--      this.dealt = false;-->
<!--      this.selectedIndex = null;-->

<!--      // через ~2.4с дозволяємо крутити/клікати-->
<!--      clearTimeout(this._dealTimer);-->
<!--      this._dealTimer = setTimeout(() => {-->
<!--        this.dealt = true;-->
<!--      }, 2400);-->
<!--    },-->

<!--    pick(i) {-->
<!--      if (!this.dealt) return;-->
<!--      const meta = this.getCardMeta(i);-->
<!--      if (!meta.visible) return;-->
<!--      if (this.selectedIndex !== null) return;-->

<!--      this.selectedIndex = i;-->

<!--      // тут можеш робити навігацію / модалку з результатом-->
<!--      // this.$router.push({ name: "TarotResult", params: { id: this.cards[i].id } })-->
<!--    },-->

<!--    stopInertia() {-->
<!--      cancelAnimationFrame(this.raf);-->
<!--      this.raf = 0;-->
<!--      this.vel = 0;-->
<!--    },-->

<!--    onDown(e) {-->
<!--      if (!this.dealt) return;-->
<!--      if (this.selectedIndex !== null) return;-->

<!--      this.stopInertia();-->

<!--      this.dragging = true;-->
<!--      this.pointerId = e.pointerId;-->
<!--      e.currentTarget.setPointerCapture?.(e.pointerId);-->

<!--      this.startX = e.clientX;-->
<!--      this.startRot = this.rotation;-->

<!--      this.lastX = e.clientX;-->
<!--      this.lastT = performance.now();-->
<!--      this.vel = 0;-->
<!--    },-->

<!--    onMove(e) {-->
<!--      if (!this.dragging || e.pointerId !== this.pointerId) return;-->

<!--      const dx = e.clientX - this.startX;-->

<!--      // коефіцієнт: градусів на піксель (підкрути)-->
<!--      const k = 0.22;-->
<!--      this.rotation = this.startRot + dx * k;-->

<!--      // velocity для інерції-->
<!--      const now = performance.now();-->
<!--      const dt = Math.max(8, now - this.lastT);-->
<!--      const vx = (e.clientX - this.lastX) / dt; // px/ms-->
<!--      this.vel = vx * k * 16.6; // ~deg/frame (нормалізація)-->

<!--      this.lastX = e.clientX;-->
<!--      this.lastT = now;-->
<!--    },-->

<!--    onUp(e) {-->
<!--      if (!this.dragging || e.pointerId !== this.pointerId) return;-->

<!--      this.dragging = false;-->
<!--      this.pointerId = null;-->

<!--      // інерція-->
<!--      const friction = 0.92;-->
<!--      const minVel = 0.02;-->

<!--      const tick = () => {-->
<!--        this.rotation += this.vel;-->
<!--        this.vel *= friction;-->

<!--        if (Math.abs(this.vel) < minVel) {-->
<!--          this.stopInertia();-->
<!--          return;-->
<!--        }-->
<!--        this.raf = requestAnimationFrame(tick);-->
<!--      };-->

<!--      this.raf = requestAnimationFrame(tick);-->
<!--    }-->
<!--  }-->
<!--};-->
<!--</script>-->

<!--<style scoped>-->
<!--.tarotPage{-->
<!--  height: 100vh;-->
<!--  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);-->
<!--  color: #eaf2ff;-->
<!--  overflow: hidden;-->
<!--  position: relative;-->
<!--}-->

<!--.title{-->
<!--  padding-top: 62px;-->
<!--  text-align: center;-->
<!--  letter-spacing: 0.22em;-->
<!--  font-weight: 500;-->
<!--  opacity: 0.95;-->
<!--}-->
<!--.t1{ font-size: 14px; }-->
<!--.t2{ font-size: 12px; margin-top: 6px; }-->

<!--/* Вікно: видно лише частину кола */-->
<!--.wheelWindow{-->
<!--  position: relative;-->
<!--  width: 100%;-->
<!--  height: 360px;-->
<!--  margin-top: 60px;-->
<!--  overflow: hidden;          /* обрізаємо круг */-->
<!--  user-select: none;-->
<!--  touch-action: none;        /* важливо для drag у WebView */-->
<!--}-->

<!--/* Дуги як на макеті */-->
<!--.arc{-->
<!--  position: absolute;-->
<!--  left: 50%;-->
<!--  top: -210px;-->
<!--  width: 160%;-->
<!--  height: 520px;-->
<!--  border-radius: 50%;-->
<!--  transform: translateX(-50%);-->
<!--  pointer-events: none;-->
<!--  border-top: 1px solid rgba(205, 141, 121, 0.85);-->
<!--  opacity: 0.9;-->
<!--}-->
<!--.arc&#45;&#45;inner{-->
<!--  top: -198px;-->
<!--  opacity: 0.6;-->
<!--}-->

<!--/* Карти */-->
<!--.card{-->
<!--  position: absolute;-->
<!--  transform: translate(-50%, -50%);-->
<!--}-->

<!--.cardInner{-->
<!--  width: 100%;-->
<!--  height: 100%;-->
<!--  transform-origin: 50% 60%;-->
<!--  backface-visibility: hidden;-->

<!--  /* фінальна поза */-->
<!--  transform: translate3d(var(&#45;&#45;x), var(&#45;&#45;y), 0) rotate(var(&#45;&#45;rot));-->

<!--  /* м’яко реагує на drag/пік */-->
<!--  transition: transform 260ms cubic-bezier(0.2,0.85,0.2,1), opacity 200ms ease;-->
<!--}-->

<!--.cardBack{-->
<!--  width: 100%;-->
<!--  height: 100%;-->
<!--  background-image: url("/images/cardV1.png");-->
<!--  background-size: 100%;-->
<!--}-->

<!--/* Вау-ефект: поки не dealt=true, карти “роздаються” зі стопки */-->
<!--.wheelWindow:not(.dealt) .cardInner{-->
<!--  animation: deal 900ms cubic-bezier(0.2,0.85,0.2,1) forwards;-->
<!--  animation-delay: var(&#45;&#45;delay);-->
<!--}-->

<!--/* під час dealt=true інтеректив */-->
<!--.hidden{-->
<!--  opacity: 0;-->
<!--  pointer-events: none;-->
<!--}-->

<!--/* вибір */-->
<!--.dimmed{-->
<!--  pointer-events: none;-->
<!--}-->
<!--.dimmed .cardInner{-->
<!--  opacity: 0.12 !important;-->
<!--  transform: translate3d(var(&#45;&#45;x), calc(var(&#45;&#45;y) + 16px), 0) rotate(var(&#45;&#45;rot)) scale(0.98);-->
<!--}-->

<!--.picked .cardInner{-->
<!--  transform: translate3d(0, -210px, 0) rotate(0deg) scale(1.35);-->
<!--}-->

<!--/* підказка */-->
<!--.chooser{-->
<!--  position: absolute;-->
<!--  left: 50%;-->
<!--  top: 515px;-->
<!--  transform: translateX(-50%);-->
<!--  text-align: center;-->
<!--  opacity: 0.95;-->
<!--}-->
<!--.chevron{-->
<!--  width: 0;-->
<!--  height: 0;-->
<!--  margin: 0 auto 10px;-->
<!--  border-left: 7px solid transparent;-->
<!--  border-right: 7px solid transparent;-->
<!--  border-bottom: 9px solid rgba(235, 210, 170, 0.9);-->
<!--  filter: drop-shadow(0 8px 16px rgba(0,0,0,0.35));-->
<!--}-->
<!--.hint{-->
<!--  font-size: 16px;-->
<!--  letter-spacing: 0.12em;-->
<!--  color: rgba(234, 242, 255, 0.92);-->
<!--}-->

<!--@keyframes deal{-->
<!--  0%{-->
<!--    opacity: 0;-->
<!--    transform: translate3d(0, 240px, 0) rotate(0deg) scale(0.92);-->
<!--  }-->
<!--  72%{-->
<!--    opacity: 1;-->
<!--    transform: translate3d(calc(var(&#45;&#45;x) * 0.25), calc(var(&#45;&#45;y) * 0.18), 0) rotate(calc(var(&#45;&#45;rot) * 0.35)) scale(1);-->
<!--  }-->
<!--  100%{-->
<!--    opacity: 1;-->
<!--    transform: translate3d(var(&#45;&#45;x), var(&#45;&#45;y), 0) rotate(var(&#45;&#45;rot)) scale(1);-->
<!--  }-->
<!--}-->

<!--@media (prefers-reduced-motion: reduce){-->
<!--  .cardInner{ animation: none !important; transition: none !important; }-->
<!--}-->
<!--</style>-->




<template>
  <div class="tarotPage">
    <header class="title">
      <div class="t1">TAROT&nbsp;&nbsp;CARD</div>
      <div class="t2">FOR TODAY</div>
    </header>

    <!-- Вікно, яке показує лише частину кола -->
    <div
      ref="windowEl"
      class="wheelWindow"
      :class="{ dealt, dragging, inertia }"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
    >
      <!-- Дуги як на макеті -->
      <div class="arc arc--outer"></div>
      <div class="arc arc--inner"></div>

      <!-- Карти -->
      <div
        v-for="(c, i) in cards"
        :key="c.id"
        class="card"
        :class="{
          hidden: !getCardMeta(i).visible,
          dimmed: selectedIndex !== null && selectedIndex !== i,
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
  </div>
</template>

<script>
import { Haptics } from "@capacitor/haptics";

export default {
  name: "TarotPage",
  data() {
    const COUNT = 72;
    return {
      COUNT,
      cards: Array.from({ length: COUNT }, (_, i) => ({ id: i + 1 })),

      // wheel geometry
      centerX: 0,
      centerY: 0,
      radius: 280,
      cardW: 56,

      // rotation
      rotation: -18, // стартовий поворот для гарного вигляду
      dealt: false,

      // pick
      selectedIndex: null,

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
      lastTickAt: 0
    };
  },
  computed: {
    cardH() {
      return Math.round(this.cardW * 1.55);
    },
    stepDeg() {
      return 360 / this.COUNT;
    }
  },
  mounted() {
    this.computeGeometry();

    // resize
    this._ro = new ResizeObserver(() => this.computeGeometry());
    this._ro.observe(this.$refs.windowEl);

    // старт анімації “роздачі”
    requestAnimationFrame(() => requestAnimationFrame(() => this.startDeal()));
  },
  beforeUnmount() {
    if (this._ro) this._ro.disconnect();
    cancelAnimationFrame(this.raf);
    clearTimeout(this._dealTimer);
    this.hapticEnd();
  },
  methods: {
    computeGeometry() {
      const el = this.$refs.windowEl;
      if (!el) return;

      const w = el.clientWidth;
      const h = el.clientHeight;

      // адаптивний розмір карти
      this.cardW = Math.max(40, Math.min(66, Math.round(w * 0.12)));

      // центр кола трохи нижче “вікна”, щоб видно була дуга зверху
      this.centerX = w / 2;
      this.centerY = h * 1.18;

      // радіус під мобільний екран
      this.radius = Math.max(220, Math.min(420, Math.round(w * 0.95)));
    },

    // метадані для видимості/глибини
    getCardMeta(i) {
      const theta = (i * this.stepDeg + this.rotation) * Math.PI / 180;

      const depth = Math.cos(theta);
      const visible = depth > 0.05;

      return { depth, visible, theta };
    },

    getCardStyle(i) {
      const { depth, theta } = this.getCardMeta(i);

      const x = this.centerX + this.radius * Math.sin(theta);
      const y = this.centerY - this.radius * Math.cos(theta);

      // Поворот карти по дотичній
      const rot = (theta * 180) / Math.PI;

      // zIndex по глибині
      const z = Math.round((depth + 1) * 1000);

      const delay = (i * 18) + "ms";

      return {
        width: this.cardW + "px",
        height: this.cardH + "px",

        // ✅ ВАЖЛИВО: без помилок у ключах
        "--x": (x - this.centerX) + "px",
        "--y": (y - this.centerY) + "px",
        "--rot": rot + "deg",
        "--delay": delay,

        left: this.centerX + "px",
        top: this.centerY + "px",
        zIndex: this.selectedIndex === i ? 9999 : z,

        opacity:
          this.selectedIndex !== null && this.selectedIndex !== i
            ? 1
            : (0.25 + 0.75 * Math.max(0, depth))
      };
    },

    startDeal() {
      this.dealt = false;
      this.selectedIndex = null;

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
    },

    // ===== HAPTIC =====
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

/* Вікно: видно лише частину кола */
.wheelWindow{
  position: relative;
  width: 100%;
  height: 360px;
  margin-top: 60px;
  overflow: hidden;
  user-select: none;
  touch-action: none;
}

/* Дуги як на макеті */
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
.arc--inner{
  top: -198px;
  opacity: 0.6;
}

/* Карти */
.card{
  position: absolute;
  transform: translate(-50%, -50%);
}

.cardInner{
  width: 100%;
  height: 100%;
  transform-origin: 50% 60%;
  backface-visibility: hidden;

  transform: translate3d(var(--x), var(--y), 0) rotate(var(--rot));
  transition: transform 260ms cubic-bezier(0.2,0.85,0.2,1), opacity 200ms ease;
  will-change: transform;
}

/* ✅ ФІКС “пригування”: під час drag/інерції відключаємо transition */
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

/* Вау-ефект: поки не dealt=true, карти “роздаються” зі стопки */
.wheelWindow:not(.dealt) .cardInner{
  animation: deal 900ms cubic-bezier(0.2,0.85,0.2,1) forwards;
  animation-delay: var(--delay);
}

.hidden{
  opacity: 0;
  pointer-events: none;
}

.dimmed{
  pointer-events: none;
}
.dimmed .cardInner{
  opacity: 0.12 !important;
  transform: translate3d(var(--x), calc(var(--y) + 16px), 0) rotate(var(--rot)) scale(0.98);
}

.picked .cardInner{
  transform: translate3d(0, -210px, 0) rotate(0deg) scale(1.35);
}

/* підказка */
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
}

@keyframes deal{
  0%{
    opacity: 0;
    transform: translate3d(0, 240px, 0) rotate(0deg) scale(0.92);
  }
  72%{
    opacity: 1;
    transform: translate3d(calc(var(--x) * 0.25), calc(var(--y) * 0.18), 0) rotate(calc(var(--rot) * 0.35)) scale(1);
  }
  100%{
    opacity: 1;
    transform: translate3d(var(--x), var(--y), 0) rotate(var(--rot)) scale(1);
  }
}

@media (prefers-reduced-motion: reduce){
  .cardInner{ animation: none !important; transition: none !important; }
}
</style>


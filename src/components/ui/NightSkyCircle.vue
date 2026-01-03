<template>
  <div ref="root" class="night-sky">
    <canvas ref="c" />
  </div>
</template>

<script>
export default {
  name: 'NightSkyCircle',
  props: {
    // якщо хочеш — можна лишити як “бажаний” розмір, але ми беремо реальний з DOM
    size: { type: Number, default: 770 },
    seed: { type: Number, default: 1 }, // щоб фон був стабільний
  },

  mounted() {
    this.draw();
    this.ro = new ResizeObserver(() => this.draw());
    this.ro.observe(this.$refs.root);
  },

  beforeUnmount() {
    try { this.ro?.disconnect?.(); } catch (e) {
      console.log(e);
    }
  },

  methods: {
    mulberry32(a) {
      return function () {
        let t = (a += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },

    draw() {
      const root = this.$refs.root;
      const canvas = this.$refs.c;
      if (!root || !canvas) return;

      const rect = root.getBoundingClientRect();
      const cssW = Math.max(1, Math.round(rect.width));
      const cssH = Math.max(1, Math.round(rect.height));

      const dpr = Math.min(2, window.devicePixelRatio || 1);

      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);

      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // чистимо
      ctx.clearRect(0, 0, cssW, cssH);

      // кругла маска
      const R = Math.min(cssW, cssH) / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cssW / 2, cssH / 2, R, 0, Math.PI * 2);
      ctx.clip();

      // фон (темний)
      const g = ctx.createRadialGradient(cssW/2, cssH/2, R*0.1, cssW/2, cssH/2, R);
      g.addColorStop(0, '#031018');
      g.addColorStop(1, '#000A10');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cssW, cssH);

      // зірки (без зерна)
      const rand = this.mulberry32(this.seed);
      const starCount = Math.floor((cssW * cssH) / 2500); // щільність
      ctx.fillStyle = 'rgba(255,255,255,0.9)';

      for (let i = 0; i < starCount; i++) {
        const x = rand() * cssW;
        const y = rand() * cssH;

        // трохи різні розміри
        const r = rand() < 0.92 ? (0.6 + rand() * 0.7) : (1.2 + rand() * 1.4);
        const a = 0.25 + rand() * 0.6;

        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.restore();
    },
  },
};
</script>

<style scoped>
.night-sky {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
}
canvas {
  display: block;
}
</style>

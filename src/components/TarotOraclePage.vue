<!-- src/pages/TarotOraclePage.vue -->
<template>
  <q-page class="oracle-page">
    <div class="bg-base"></div>
    <div class="glow"></div>

    <div class="fog fog-1"></div>
    <div class="fog fog-2"></div>
    <div class="floor-haze"></div>

    <div class="clarity"></div>
    <div class="vignette"></div>
    <div class="grain"></div>

    <div class="content">
      <div class="oracle-shell">
        <header class="oracle-top">
          <div class="oracle-brand">Arcana Insight</div>
          <h1 class="oracle-title">Tarot Reading</h1>
          <h1 class="oracle-title">In progress...</h1>
        </header>

        <section class="oracle-hero">
          <div class="hero-orb">
            <div class="orb-ring"></div>
            <div class="orb-ring orb-ring--inner"></div>
            <div class="orb-core"></div>
            <div class="orb-glow"></div>
          </div>
          <div class="hero-cards">
            <div class="hero-card card-left"></div>
            <div class="hero-card card-center"></div>
            <div class="hero-card card-right"></div>
          </div>
        </section>

<!--        <section class="oracle-actions">-->
<!--          <div class="action-label">Обери тему</div>-->
<!--          <div class="action-row">-->
<!--            <button class="chip">Любов</button>-->
<!--            <button class="chip">Робота</button>-->
<!--            <button class="chip">Гроші</button>-->
<!--            <button class="chip">Вибір</button>-->
<!--            <button class="chip">Інше</button>-->
<!--          </div>-->
<!--        </section>-->

<!--        <section class="oracle-panel">-->
<!--          <div class="panel-title">Початок сеансу</div>-->
<!--          <p class="panel-text">-->
<!--            Зосередься на питанні. Коли будеш готовий — витягнемо карту.-->
<!--          </p>-->
<!--          <div class="panel-footer">Три карти · М’який ритм · Чиста інтерпретація</div>-->
<!--        </section>-->
      </div>
    </div>
  </q-page>
</template>

<script>
export default {
  name: 'TarotOraclePage'
}
</script>



<style scoped lang="scss">
/* ===== PAGE ===== */
.oracle-page{
  position: relative;
  overflow: hidden;
  background: transparent;
  isolation: isolate;
  height: 100vh;
}

/* ===== BASE ===== */
.bg-base{
  position: fixed;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    url('/images/bg-tar1.png') center/cover no-repeat,
    radial-gradient(120% 70% at 50% 0%,
      rgba(10, 28, 44, 0.92) 0%,
      rgba(6, 16, 28, 0.98) 50%,
      rgba(3, 12, 20, 1) 100%),
    radial-gradient(800px 600px at 70% 20%,
      rgba(255, 210, 160, 0.08) 0%,
      rgba(0,0,0,0) 60%),
    radial-gradient(900px 700px at 35% 30%,
      rgba(90, 150, 255, 0.08) 0%,
      rgba(0,0,0,0) 60%),
    radial-gradient(800px 600px at 70% 75%,
      rgba(140, 110, 255, 0.05) 0%,
      rgba(0,0,0,0) 68%),
    linear-gradient(180deg, #101721 0%, #12202b 28%, #142632 55%, #080c0f 100%);
}

/* ===== GLOW ===== */
.glow{
  position: fixed;
  inset: -30%;
  z-index: 2;
  pointer-events: none;
  mix-blend-mode: screen;
  opacity: 0.15;
  background:
    radial-gradient(60% 90% at 30% 35%, rgba(140,190,255,0.11) 0%, rgba(0,0,0,0) 66%),
    radial-gradient(55% 80% at 72% 60%, rgba(190,140,255,0.08) 0%, rgba(0,0,0,0) 70%);
  will-change: transform, opacity;
  animation: glowMove 22s ease-in-out infinite alternate,
  glowBreath 9s ease-in-out infinite alternate;
}
@keyframes glowMove{
  0%   { transform: translate3d(-1.0%, -0.6%, 0) scale(1.03) rotate(-0.18deg); }
  100% { transform: translate3d( 1.2%,  0.8%, 0) scale(1.05) rotate( 0.18deg); }
}
@keyframes glowBreath{
  0%   { opacity: 0.11; }
  100% { opacity: 0.17; }
}

/* ===== FOG ===== */
.fog{
  position: fixed;
  inset: -45%;
  z-index: 3;
  pointer-events: none;
  background-image: url('/images/fog.png'); /* або /images/fog_overlay.png */
  background-repeat: no-repeat;
  background-size: cover;
  will-change: transform, opacity;
  transform: translate3d(0,0,0);
}
.fog-1{
  mix-blend-mode: screen;
  opacity: 0.18;
  background-position: 45% 35%;
  animation: fog1Move 18s ease-in-out infinite,
  fog1Breath 10s ease-in-out infinite alternate;
}
.fog-2{
  mix-blend-mode: normal;
  opacity: 0.20;
  background-size: 130% 130%;
  background-position: 62% 58%;
  animation: fog2Move 26s ease-in-out infinite,
  fog2Breath 14s ease-in-out infinite alternate;
}
@keyframes fog1Move{
  0%   { transform: translate3d(-1.6%, -1.0%, 0) scale(1.05) rotate(-0.30deg); }
  50%  { transform: translate3d( 1.6%,  1.0%, 0) scale(1.08) rotate( 0.30deg); }
  100% { transform: translate3d(-1.6%, -1.0%, 0) scale(1.05) rotate(-0.30deg); }
}
@keyframes fog2Move{
  0%   { transform: translate3d( 1.2%,  0.8%, 0) scale(1.10) rotate( 0.20deg); }
  50%  { transform: translate3d(-1.2%, -0.8%, 0) scale(1.13) rotate(-0.20deg); }
  100% { transform: translate3d( 1.2%,  0.8%, 0) scale(1.10) rotate( 0.20deg); }
}
@keyframes fog1Breath{ 0%{opacity:0.15} 100%{opacity:0.21} }
@keyframes fog2Breath{ 0%{opacity:0.15} 100%{opacity:0.19} }

/* ===== FLOOR HAZE ===== */
.floor-haze{
  position: fixed;
  left: 0; right: 0; bottom: 0;
  height: 38vh;
  z-index: 4;
  pointer-events: none;
  background-image: url('/images/fog.png'); /* або /images/fog_overlay.png */
  background-repeat: no-repeat;
  background-size: cover;
  background-position: 50% 100%;
  mix-blend-mode: screen;
  opacity: 0.16;

  -webkit-mask-image: linear-gradient(to top,
    rgba(0,0,0,1) 0%,
    rgba(0,0,0,0.90) 35%,
    rgba(0,0,0,0.35) 70%,
    rgba(0,0,0,0) 100%);
  mask-image: linear-gradient(to top,
    rgba(0,0,0,1) 0%,
    rgba(0,0,0,0.90) 35%,
    rgba(0,0,0,0.35) 70%,
    rgba(0,0,0,0) 100%);

  will-change: transform, opacity;
  animation: floorDrift 24s ease-in-out infinite,
  floorBreath 12s ease-in-out infinite alternate;
}
@keyframes floorDrift{
  0%   { transform: translate3d(-1.2%, 0.6%, 0) scale(1.08) rotate(-0.12deg); }
  50%  { transform: translate3d( 1.2%, 0.0%, 0) scale(1.10) rotate( 0.12deg); }
  100% { transform: translate3d(-1.2%, 0.6%, 0) scale(1.08) rotate(-0.12deg); }
}
@keyframes floorBreath{
  0%   { opacity: 0.12; }
  100% { opacity: 0.19; }
}


@keyframes hazeMove1{
  0%   { transform: translate3d(-1.2%,  0.6%, 0) scale(1.02); }
  100% { transform: translate3d( 1.2%, -0.6%, 0) scale(1.06); }
}
@keyframes hazeMove2{
  0%   { transform: translate3d( 1.4%, -0.4%, 0) scale(1.03); }
  100% { transform: translate3d(-1.4%,  0.4%, 0) scale(1.07); }
}
@keyframes hazeBreath1{ 0%{opacity:0.10} 100%{opacity:0.16} }
@keyframes hazeBreath2{ 0%{opacity:0.06} 100%{opacity:0.12} }

@keyframes haloBreath{
  0%   { opacity: 0.00; transform: translate3d(-50%, 0, 0) scale(0.98); }
  100% { opacity: 0.15; transform: translate3d(-50%, 0, 0) scale(1.02); }
}

/* ===== APPEAR: slower fade + delay ===== */
.seer-enter-active{
  transition: opacity 94200ms cubic-bezier(.12, .72, .12, 1);
  transition-delay: 0s;
}
.seer-enter-from{ opacity: 0; }
.seer-enter-to{ opacity: 1; }

/* Pause inner motion until visible (so it doesn't “move while invisible”) */
.seer-enter-from .seer-haze,
.seer-enter-from .seer-halo{
  animation-play-state: paused;
}
.seer-enter-to .seer-haze,
.seer-enter-to .seer-halo{
  animation-play-state: running;
}

/* ===== CLARITY / VIGNETTE / GRAIN ===== */
.clarity{
  position: fixed;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  opacity: 0.13;
  mix-blend-mode: soft-light;
  background:
    linear-gradient(180deg,
      rgba(255,255,255,0.06) 0%,
      rgba(255,255,255,0.02) 55%,
      rgba(0,0,0,0.10) 100%),
    radial-gradient(80% 80% at 50% 40%,
      rgba(255,255,255,0.04) 0%,
      rgba(0,0,0,0) 60%);
}

.vignette{
  position: fixed;
  inset: 0;
  z-index: 6;
  pointer-events: none;
  background:
    radial-gradient(95% 95% at 50% 45%,
      rgba(0,0,0,0) 54%,
      rgba(0,0,0,0.38) 82%,
      rgba(0,0,0,0.72) 100%),
    linear-gradient(180deg,
      rgba(0,0,0,0.18) 0%,
      rgba(0,0,0,0.05) 45%,
      rgba(0,0,0,0.26) 100%);
}

.grain{
  position: fixed;
  inset: 0;
  z-index: 7;
  pointer-events: none;
  opacity: 0.055;
  mix-blend-mode: overlay;
  background:
    repeating-linear-gradient(0deg,
      rgba(255,255,255,0.020) 0px,
      rgba(255,255,255,0.020) 1px,
      rgba(0,0,0,0.020) 2px,
      rgba(0,0,0,0.020) 3px),
    repeating-linear-gradient(90deg,
      rgba(255,255,255,0.015) 0px,
      rgba(255,255,255,0.015) 1px,
      rgba(0,0,0,0.015) 2px,
      rgba(0,0,0,0.015) 3px);
}

/* content */
.content{ position: relative; z-index: 10; }

.oracle-shell{
  position: relative;
  max-width: 440px;
  margin: 0 auto;
  min-height: 100vh;
  padding: 18px 16px calc(24px + env(safe-area-inset-bottom));
  display: grid;
  grid-template-rows: auto auto auto 1fr;
  gap: 16px;
}

.oracle-top{
  text-align: center;
  display: grid;
  gap: 6px;
}
.oracle-brand{
  text-transform: uppercase;
  letter-spacing: 0.4em;
  font-size: 10px;
  color: rgba(210, 230, 255, 0.55);
}
.oracle-title{
  margin: 0;
  font-size: 24px;
  letter-spacing: 0.22em;
  color: #f6f8ff;
}
.oracle-subtitle{
  margin: 0;
  font-size: 12px;
  color: rgba(210, 230, 255, 0.7);
}

.oracle-hero{
  position: relative;
  height: 320px;
  border-radius: 26px;
  border: 1px solid rgba(150, 190, 255, 0.18);
  box-shadow: 0 30px 70px rgba(0,0,0,0.6);
  overflow: hidden;
}

.hero-orb{
  position: absolute;
  left: 50%;
  top: 22px;
  transform: translateX(-50%);
  width: min(260px, 68vw);
  height: min(260px, 68vw);
  border-radius: 50%;
  display: grid;
  place-items: center;
}
.orb-ring{
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 1px solid rgba(180, 210, 255, 0.25);
  animation: orbSpin 18s linear infinite;
}
.orb-ring--inner{
  width: 72%;
  height: 72%;
  border-style: dashed;
  opacity: 0.6;
  animation-direction: reverse;
}
.orb-core{
  width: 62%;
  height: 62%;
  border-radius: 50%;
  box-shadow: inset 0 0 40px rgba(120, 160, 230, 0.15);
}
.orb-glow{
  position: absolute;
  inset: -30%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 210, 160, 0.18), transparent 60%);
  opacity: 0.7;
  animation: glowPulse 6s ease-in-out infinite;
}

.hero-cards{
  display: none;
  position: absolute;
  left: 50%;
  bottom: 26px;
  transform: translateX(-50%);
  gap: 12px;
}
.hero-card{
  width: 72px;
  height: 108px;
  border-radius: 12px;
  background: linear-gradient(160deg, rgba(20, 30, 48, 0.95), rgba(8, 12, 20, 0.98));
  border: 1px solid rgba(150, 190, 255, 0.2);
  box-shadow: 0 18px 30px rgba(0,0,0,0.45);
  background-image: url('/images/tarot.svg');
  background-size: cover;
  background-position: center;
}
.card-left{ transform: rotate(-6deg) translateY(6px); }
.card-center{ transform: translateY(-4px); }
.card-right{ transform: rotate(6deg) translateY(6px); }

.oracle-actions{
  display: grid;
  gap: 8px;
}
.action-label{
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(220, 236, 255, 0.7);
  text-align: center;
}
.action-row{
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}
.chip{
  border: 1px solid rgba(150, 190, 255, 0.22);
  background: rgba(12, 18, 30, 0.8);
  color: rgba(230, 240, 255, 0.85);
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: transform 200ms ease, border-color 200ms ease;
}
.chip:hover{ transform: translateY(-1px); border-color: rgba(200, 220, 255, 0.45); }

.oracle-panel{
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(120, 160, 230, 0.2);
  box-shadow: 0 16px 36px rgba(0,0,0,0.45);
}
.panel-title{
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(230, 240, 255, 0.9);
  margin-bottom: 6px;
}
.panel-text{
  margin: 0;
  font-size: 13px;
  color: rgba(210, 230, 255, 0.75);
}
.panel-footer{
  margin-top: 10px;
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(200, 220, 255, 0.55);
}

@keyframes orbSpin{ from{ transform: rotate(0deg); } to{ transform: rotate(360deg); } }
@keyframes glowPulse{ 0%, 100%{ opacity: 0.5; } 50%{ opacity: 0.8; } }
/* Reduce motion */
@media (prefers-reduced-motion: reduce){
  .glow, .fog-1, .fog-2, .floor-haze,
  .orb-tilt, .orb-spin, .orb-sparkles, .orb-sheen,
  .stage-glow, .stage-grid{ animation: none !important; }
}

/* bottom bar transparent */
:global(.q-footer),
:global(.q-footer .q-toolbar),
:global(.q-footer .q-tabs),
:global(.q-layout__section--marginal){
  background: transparent !important;
}
</style>

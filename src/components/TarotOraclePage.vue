<template>
  <q-page class="tarot-page">
    <div ref="sceneRef" class="oracle-video-layer" aria-hidden="true">
      <video
        ref="videoRef"
        class="oracle-video"
        autoplay
        muted
        loop
        playsinline
        preload="auto"
        @loadedmetadata="applyPlaybackRate"
      >
        <source src="/tarrotTest/test2.mp4" type="video/mp4" />
      </video>
      <div class="oracle-smoke oracle-smoke--one"></div>
      <div class="oracle-smoke oracle-smoke--two"></div>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'

const videoRef = ref(null)

const applyPlaybackRate = () => {
  if (videoRef.value) {
    videoRef.value.playbackRate = 0.75
  }
}

onMounted(() => {
  applyPlaybackRate()
})
</script>

<style scoped>
.tarot-page {
  background: #000;
}

.oracle-video-layer {
  position: relative;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  background: #000;
}

.oracle-video {
  display: block;
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100dvh;
  object-fit: contain;
  object-position: center center;
  background: #000;
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.oracle-smoke {
  position: absolute;
  inset: -18%;
  z-index: 2;
  pointer-events: none;
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  filter: blur(1px);
  opacity: 0.7;
}

.oracle-smoke--one {
  opacity: 0.2;
  background-image: url('/tarrotTest/smoke-opt.jpg');
  animation: oracle-smoke-drift-a 28s linear infinite alternate;
}

.oracle-smoke--two {
  opacity: 0.14;
  background-image: url('/tarrotTest/smoke-opt.jpg');
  transform: scale(1.12);
  animation: oracle-smoke-drift-b 38s linear infinite alternate;
}

@keyframes oracle-smoke-drift-a {
  0% {
    transform: translate3d(-8%, 6%, 0) scale(1.08);
  }

  50% {
    transform: translate3d(2%, -3%, 0) scale(1.14);
  }

  100% {
    transform: translate3d(8%, -8%, 0) scale(1.1);
  }
}

@keyframes oracle-smoke-drift-b {
  0% {
    transform: translate3d(10%, -4%, 0) scale(1.2);
  }

  50% {
    transform: translate3d(0, 2%, 0) scale(1.14);
  }

  100% {
    transform: translate3d(-10%, 8%, 0) scale(1.22);
  }
}
</style>

<script>
import BottomNavigation from 'components/ui/BottomNavigation.vue'

export default {
  name: 'BlankLayout',
  components: { BottomNavigation },

  computed: {
    showNavigation() {
      return !this.$route.meta?.hideBottomNav
    },
  },
}
</script>

<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container class="page-container">
      <router-view />
    </q-page-container>

    <transition name="nav-up" appear>
      <div v-if="showNavigation" class="bottom-nav-wrap">
        <BottomNavigation />
      </div>
    </transition>
  </q-layout>
</template>

<style scoped>
.page-container {
  height: 100vh;
  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
}

/* обгортка тримає навігацію знизу */
.bottom-nav-wrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  isolation: isolate;
}

.bottom-nav-wrap::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: calc(132px + env(safe-area-inset-bottom, 0px));
  background:
    linear-gradient(180deg, rgba(5, 13, 21, 0) 0%, rgba(5, 13, 21, 0.84) 42%, rgba(5, 13, 21, 1) 72%);
  pointer-events: none;
  z-index: -1;
}

:global(body.hide-bottom-nav .bottom-nav-wrap) {
  display: none;
}

/* анімація появи знизу */
.nav-up-enter-active,
.nav-up-leave-active {
  transition: transform 260ms ease, opacity 260ms ease;
  will-change: transform, opacity;
}

.nav-up-enter-from,
.nav-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

.nav-up-enter-to,
.nav-up-leave-from {
  transform: translateY(0);
  opacity: 1;
}
</style>

<script>
import BottomNavigation from 'components/ui/BottomNavigation.vue'
import { useAuthStore } from 'stores/authStore.js'

export default {
  name: 'BlankLayout',
  components: { BottomNavigation },

  data() {
    return {
      authStore: useAuthStore(),
    }
  },

  created() {
    this.authStore.initAuth()
  },

  computed: {
    showNavigation() {
      return !this.$route.meta?.hideBottomNav
    }
  }
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

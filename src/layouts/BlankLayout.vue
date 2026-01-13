<script>
import BottomNavigation from 'components/ui/BottomNavigation.vue'
import { useAuthStore } from 'stores/authStore.js'

export default {
  name: 'BlankLayout',
  components: { BottomNavigation },

  data() {
    return {
      authStore: useAuthStore(), // реактивний store
    }
  },

  created() {
    this.authStore.initAuth()
  },

  computed: {
    showNavigation() {
      if(!this.authStore.isLoggedIn){
       return  !this.$route.path.includes('/tarot/') && this.$route?.name !== 'arcana'
      }
      else {
        return !this.$route.path.includes('/tarot/')
      }
    }
  }
}
</script>

<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container class="page-container">
      <router-view />
    </q-page-container>
    <BottomNavigation v-if="showNavigation" />
  </q-layout>
</template>

<style scoped>
.page-container {
  height: 100vh;
  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
}
</style>

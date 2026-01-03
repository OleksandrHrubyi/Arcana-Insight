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
    isLoggedIn() {
      console.log(this.authStore.isLoggedIn, 'this.authStore.isLoggedIn');
      return this.authStore.isLoggedIn
    }
  }
}
</script>

<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container class="page-container">
      <router-view />
    </q-page-container>
    <BottomNavigation v-if="isLoggedIn" />
  </q-layout>
</template>

<style scoped>
.page-container {
  height: 100vh;
}
</style>

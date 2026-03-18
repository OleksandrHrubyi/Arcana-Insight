<template>
  <router-view v-slot="{ Component, route }">
    <transition name="route-fade" mode="out-in">
      <component :is="Component" :key="route.fullPath" />
    </transition>
  </router-view>
</template>

<script setup>
import { onMounted } from 'vue'
import { initPushListeners } from 'boot/push'

onMounted(() => {
  void initPushListeners()
})
</script>

<style>
body {
  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
  min-height: 100vh;
}

/*noinspection CssUnusedSymbol*/
.route-fade-enter-active,
.route-fade-leave-active {
  transition: opacity 180ms cubic-bezier(0.4, 0, 0.2, 1);
}

/*noinspection CssUnusedSymbol*/
.route-fade-enter-from,
.route-fade-leave-to {
  opacity: 0;
}
</style>

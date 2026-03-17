<template>
  <router-view v-slot="{ Component, route }">
    <transition name="route-fade" mode="out-in" appear>
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

<style scoped>
/*noinspection CssUnusedSymbol*/
:global(.route-fade-enter-active),
:global(.route-fade-leave-active) {
  transition: opacity 180ms ease;
}

/*noinspection CssUnusedSymbol*/
:global(.route-fade-enter-from),
:global(.route-fade-leave-to) {
  opacity: 0;
}
</style>

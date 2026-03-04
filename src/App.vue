<template>
  <router-view v-slot="{ Component, route }">
    <transition name="route-fade" mode="out-in" appear>
      <component :is="Component" :key="route.fullPath" />
    </transition>
  </router-view>
</template>

<script setup>
import { onMounted } from 'vue'
import { initPushListeners, touchPushDevice } from 'boot/push'

onMounted(() => {
  void initPushListeners()
  void touchPushDevice()
})
</script>

<style scoped>
.route-fade-enter-active,
.route-fade-leave-active {
  transition: opacity 180ms ease;
}

.route-fade-enter-from,
.route-fade-leave-to {
  opacity: 0;
}
</style>

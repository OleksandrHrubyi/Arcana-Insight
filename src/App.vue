<template>
  <router-view />
</template>

<script>
import { defineComponent } from 'vue'
import { initPushListeners } from 'boot/push';
export default defineComponent({
  name: 'App',
  mounted() {
    initPushListeners();
  }
})
</script>

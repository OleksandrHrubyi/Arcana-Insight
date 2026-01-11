<template>
  <router-view />
</template>

<script>
import { defineComponent } from 'vue'
import { initPushListeners, touchPushDevice } from 'boot/push'

export default defineComponent({
  name: 'App',
  mounted () {
    void initPushListeners()
    void touchPushDevice()
  }
})
</script>

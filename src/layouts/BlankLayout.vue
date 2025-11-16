<script>
export default {
  name: 'BlankLayout',
};
</script>

<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container class="page-container">
      <router-view />
    </q-page-container>
  </q-layout>
</template>


<style lang="scss" scoped>
.page-container {
  height: 100vh;
}
</style>

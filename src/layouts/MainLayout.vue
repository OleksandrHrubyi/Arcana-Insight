<script>
export default {
  name: 'MainLayout',
};
</script>

<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="header-container">
      hello
    </q-header>
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>


<style lang="scss" scoped>
.page-container {
  height: 100vh;
}

.header-container {
  background-color: var(--main-light-bg);

}
</style>

<style lang="scss">
.header-container {
  .q-layout__shadow:after {
    box-shadow: none;
  }
}
</style>

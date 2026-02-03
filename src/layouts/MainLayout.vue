<script>
import BottomNavigation from 'components/ui/BottomNavigation.vue';
import { t, currentLocale } from 'src/i18n';

export default {
  name: 'MainLayout',
  components: { BottomNavigation },
  data() {
    return {
    };
  },
  computed: {
    locale() {
      return currentLocale.value || 'en';
    },

    tt() {
      return (key) => t(this.locale, key);
    }
  },
};
</script>

<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="header-container">
      {{ tt('appName') }}
    </q-header>
    <q-page-container>
      <router-view />
    </q-page-container>
    <BottomNavigation/>
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

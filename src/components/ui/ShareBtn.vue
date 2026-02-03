<script>
import { t, currentLocale } from 'src/i18n';

export default {
  name: 'ShareBtn',
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
{{ tt('misc.share') }}
</template>

<style scoped lang="scss">

</style>

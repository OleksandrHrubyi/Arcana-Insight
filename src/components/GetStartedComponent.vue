<script>
import ActionBtn from 'components/ActionBtn.vue';
import img1x from 'src/assets/images/getStarted1x.png';
import img2x from 'src/assets/images/getStarted2x.png';
import { t, currentLocale } from 'src/i18n';

export default {
  name: 'GetStartedComponent',
  components: { ActionBtn },

  data() {
    return { img1x, img2x };
  },

  computed: {
    locale() {
      return currentLocale.value || 'en';
    },

    tt() {
      return (key) => t(this.locale, key);
    }
  },

  methods:{
    handleGetStarted(){
      this.$router.push('/home');
    }
  }

};
</script>

<template>
  <div class="container wrapper">
    <div class="row justify-between column full-height">
      <div>
        <h1 class="title">
          Arcana Insight
        </h1>
        <p class="subtitle">
          {{ tt('getStarted.subtitle') }}
        </p>
        <div class="row items-center justify-center">
          <img
            :src="img1x"
            :srcset="`${img1x} 1x, ${img2x} 2x`"
            :alt="tt('appName')"
            loading="lazy"
            decoding="async"
            width="258px"
            height="258px"
          />
        </div>

      </div>
      <div>
        <ActionBtn :btn-label="tt('getStarted.action')" @onClick="handleGetStarted" />
        <div class="q-mt-lg row items-center justify-center">
          <router-link class="auth-link" to="/login">{{ tt('auth.alreadyUser') }}</router-link>
          <router-link class="auth-link" to="/sign-up">{{ tt('auth.signUpAction') }}</router-link>
        </div>
      </div>
    </div>


  </div>
</template>

<style scoped lang="scss">
.wrapper {
  height: 100vh;
}

.title {
  color: #030303;
  font-size: 34px;
  font-weight: 700;
  line-height: 38px;
  text-align: center;
  margin-top: 96px;
  margin-bottom: 20px;
}

.subtitle {
  color: #030303;
  font-size: 14px;
  line-height: 18px;
  text-align: center;
  margin-bottom: 45px;
}

.auth-link {
  color: #030303;
  font-size: 14px;
  line-height: 16px;
  text-decoration: none;
  padding: 24px;
}
</style>

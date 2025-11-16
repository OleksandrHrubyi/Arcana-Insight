<script>
import ActionBtn from 'components/ActionBtn.vue';
import RegisteredMethodsComponent from 'components/RegisteredMethodsComponent.vue';

export default {
  name: 'LoginComponent',
  components: { RegisteredMethodsComponent, ActionBtn },

  data() {
    return {
      email: '',
      password:'',
      showPassword: false,
    };
  },


  methods:{
    handleLogin(){
      console.log('');
    },

    handleVisibilityPassword(){
      this.showPassword = !this.showPassword;
    }
  }
};
</script>

<template>
  <div class="container full-height">
    <div class="row column justify-between full-height">
      <div>
    <div class="row justify-center items-center image-wrap">
    </div>
    <div class="input-wrapper">
      <q-input outlined rounded label="Email" v-model="email" class="auth-input q-mb-md">
        <template v-slot:prepend>
          <q-icon name="email" size="16px" />
        </template>
      </q-input>
      <q-input outlined rounded label="Password" v-model="password" class="auth-input">
        <template v-slot:prepend>
          <q-icon name="lock" size="16px" />
        </template>
        <template v-slot:append>
          <q-btn @click.stop="handleVisibilityPassword" flat icon="visibility_off" size="10px" class="q-pa-xs" />
        </template>
      </q-input>
      <div class="row items-center justify-end"><q-btn label="Forgot password?" no-caps flat/></div>
    </div>
    <div>
      <ActionBtn btn-label="Login" @onClick="handleLogin"/>
    </div>
    <div>
      <RegisteredMethodsComponent/>
    </div>
    <div class="row items-center justify-center">
      <router-link to="/sign-up" class="auth-link">New here? <span class="q-pl-sm">Sign up</span></router-link>
    </div>
      </div>
    <div class="back-to-main row items-center justify-center">
      <router-link to="/" class="auth-link" aria-label="Back to Home">
        ← Back to Home
      </router-link>
    </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.image-wrap {
  margin-top: 24px;
  margin-bottom: 36px;
}

.auth-input {
  background-color: #fefefe;
  border-radius: 28px;
  box-shadow: 2px 2px 4px rgba(3,3,3,0.1) !important;
}

.input-wrapper {
  margin-bottom: 40px;
}

.auth-link {
  color: #030303;
  font-size: 14px;
  line-height: 16px;
  text-decoration: none;
  padding: 24px;
}

.back-to-main {
  margin-top: auto;
}
</style>

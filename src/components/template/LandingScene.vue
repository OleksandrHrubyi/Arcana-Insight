<template>
  <div class="wrapper">
    <div class="container bg-container">
      <div class="content-wrapper">
        <div class="appear-content">
          What you are waiting for will soon appear
        </div>
        <div class="content-left">
          <div class="content-write">
            <div class="content-bottom"></div>
          </div>
        </div>
     </div>
      <div class="row items-center justify-center logo-wrap">
        <q-img :src="logo" alt="logo" class="logo-img" />
      </div>
      <div class="main-title">
        Can you know your future? We thing YES you can. Just take it
      </div>
      <div class="bottom-btn">
        <q-btn label="Looking for my future" class="no-auth-btn" no-caps flat/>

        <div class="auth-btn-wrap">
          <q-btn label="Login" flat class="auth-btn" no-caps/>
          <q-btn label="Sign up" flat class="auth-btn" no-caps/>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import logo from 'src/assets/images/logo.svg'
export default {
  name: 'LandingScene',

  data () {
    return {
      logo,
      // bg4_1x,
      // bg4_2x,
      // bg4_3x,
      // bg5_1x,
      // bg5_2x,
      // bg5_3x
    }
  },
}
</script>

<style lang="scss" scoped>
.container {
  height: 100vh;
  overflow: hidden;
}

.bg-container {
  position: relative;
  background-image: image-set(
      url('assets/images/bg1@1x.webp') 1x,
      url('assets/images/bg1@2x.webp') 2x,
      url('assets/images/bg1@3x.webp') 3x
  );
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.content-wrapper {
  pointer-events: none;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;

  background-image: image-set(
      url('assets/images/bg2@1x.webp') 1x,
      url('assets/images/bg2@2x.webp') 2x,
      url('assets/images/bg2@3x.webp') 3x
  );
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  height: 100%;
  width: 100%;
}

.content-left {
  background-image: image-set(
      url('assets/images/bg3@1x.webp') 1x,
      url('assets/images/bg3@2x.webp') 2x,
      url('assets/images/bg3@3x.webp') 3x
  );
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  height: 100%;
  width: 100%;
}

.content-write {
  background-image: image-set(
      url('assets/images/bg4@1x.webp') 1x,
      url('assets/images/bg4@2x.webp') 2x,
      url('assets/images/bg4@3x.webp') 3x
  );
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  height: 100%;
  width: 100%;
}

.content-bottom {
  background-image: image-set(
      url('assets/images/bg5@1x.webp') 1x,
      url('assets/images/bg5@2x.webp') 2x,
      url('assets/images/bg5@3x.webp') 3x
  );
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  height: 100%;
  width: 100%;
}

.logo-wrap {
  margin-top: 80px;
}

.logo-img {
  max-width: 170px;
}

.main-title {
  max-width: 300px;
  text-align: center;
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 400;
  font-size: 15px;
  line-height: 20px;
  color: #FFFFFF;
  margin: 24px auto;
}

.appear-content {
  position: absolute;
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 400;
  font-size: 14px;
  line-height: 18px;
  text-align: center;
  color: #FFFFFF;
top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

}

.bottom-btn {
  position: absolute;
  bottom: 80px;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.no-auth-btn {
  z-index: 10;
  width: 250px;
  height: 53px;
  background: linear-gradient(98.11deg, #0C0D0E 14.75%, #242C35 54.07%, #0C0D0E 89.76%);
  border: 1px solid #9FD8F6;
  border-radius: 16px;
  font-style: normal;
  font-weight: 400;
  font-size: 16px;
  line-height: 21px;
  color: #FFFFFF;
  margin-bottom: 24px;

}


.auth-btn {
  z-index: 10;
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 400;
  font-size: 16px;
  line-height: 21px;
  text-align: center;

  color: #FFFFFF;


}

</style>

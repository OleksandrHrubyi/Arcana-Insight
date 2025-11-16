<script>
import img1x from 'src/assets/images/slide1_1x.png';
import img2x from 'src/assets/images/slide1_2x.png';
import img3x from 'src/assets/images/slide1_3x.png';
import img2_1x from 'src/assets/images/slide2_1x.png';
import img2_2x from 'src/assets/images/slide2_2x.png';
import img2_3x from 'src/assets/images/slide2_3x.png';
import img3_1x from 'src/assets/images/slide3_1x.png';
import img3_2x from 'src/assets/images/slide3_2x.png';
import img3_3x from 'src/assets/images/slide3_3x.png';
import home1_1x from 'src/assets/images/home1_1x.png';
import home1_2x from 'src/assets/images/home1_2x.png';
import home2_1x from 'src/assets/images/home2_1x.png';
import home2_2x from 'src/assets/images/home2_2x.png';
import home3_1x from 'src/assets/images/home3_1x.png';
import home3_2x from 'src/assets/images/home3_2x.png';
import home4_1x from 'src/assets/images/home4_1x.png';
import home4_2x from 'src/assets/images/home4_2x.png';

export default {
  name: 'HomeComponent',

  data() {
    return {
      slide: 1,
      img1x,
      img2x,
      img3x,
      img2_1x,
      img2_2x,
      img2_3x,
      img3_1x,
      img3_2x,
      img3_3x,
      home1_1x,
      home1_2x,
      home2_1x,
      home2_2x,
      home3_1x,
      home3_2x,
      home4_1x,
      home4_2x,
    }
  },
};
</script>

<template>
  <div class="container-wrapper">
    <q-carousel
      v-model="slide"
      animated
      swipeable
      infinite
      :autoplay="false"
      height="200px"
      class="home-carousel"
      transition-prev="slide-right"
      transition-next="slide-left"
    >
      <q-carousel-slide :name="1">
        <div class="home-slider-card">
          <img
            :src="img1x"
            :srcset="`${img1x} 1x, ${img2x} 2x, ${img3x} 3x`"
            alt="slide 1"
            loading="lazy"
            decoding="async"
          />
        </div>
      </q-carousel-slide>

      <q-carousel-slide :name="2">
        <div class="home-slider-card">
          <img
            :src="img2_1x"
            :srcset="`${img2_1x} 1x, ${img2_2x} 2x, ${img2_3x} 3x`"
            alt="slide 2"
            loading="lazy"
            decoding="async"
          />
        </div>
      </q-carousel-slide>

      <q-carousel-slide :name="3">
        <div class="home-slider-card">
          <img
            :src="img3_1x"
            :srcset="`${img3_1x} 1x, ${img3_2x} 2x, ${img3_3x} 3x`"
            alt="slide 3"
            loading="lazy"
            decoding="async"
          />
        </div>
      </q-carousel-slide>
    </q-carousel>

    <div class="title">
      Daily Insights
    </div>
    <div class="list">
      <div class="item">
        <div>
          <img
            :src="home1_1x"
            :srcset="`${home1_1x} 1x, ${home1_2x} 2x`"
            alt="slide 1"
            loading="lazy"
            decoding="async"
          />
          <h3 class="subtitle">Tarot</h3>
        </div>

      </div>
      <div class="item">
        <div>
          <img
            :src="home2_1x"
            :srcset="`${home2_1x} 1x, ${home2_2x} 2x`"
            alt="slide 1"
            loading="lazy"
            decoding="async"
          />
          <h3 class="subtitle">Zodiac</h3>
        </div>
      </div>
      <div class="item">
        <div>
          <img
            :src="home3_1x"
            :srcset="`${home3_1x} 1x, ${home3_2x} 2x`"
            alt="slide 1"
            loading="lazy"
            decoding="async"
          />
          <h3 class="subtitle">Daily</h3>
        </div>
      </div>
      <div class="item">
        <div>
          <img
            :src="home4_1x"
            :srcset="`${home4_1x} 1x, ${home4_2x} 2x`"
            alt="slide 1"
            loading="lazy"
            decoding="async"
          />
          <h3 class="subtitle">Astrology</h3>
        </div>
      </div>


    </div>
    <div class="back-to-main row items-center justify-center">
      <router-link to="/" class="auth-link" aria-label="Back to Home">
        ← Back to Home
      </router-link>
    </div>
    <div class="back-to-main row items-center justify-center">
      <router-link to="/settings" class="auth-link" aria-label="Settings">
        Settings
      </router-link>
    </div>
    <div class="back-to-main row items-center justify-center">
      <router-link to="/animation" class="auth-link" aria-label="Settings">
        Test Animation
      </router-link>
    </div>
  </div>
</template>

<style scoped lang="scss">

.container-wrapper {
  padding: 16px;
}

.home-slider-card {
  max-width: 390px;
  width: 100%;
  height: 200px;
  border-radius: 22px;
  box-shadow: 2px 2px 4px rgba(3, 3, 3, 0.1);
  background-position: center center;
  background-size: cover;
  background-repeat: no-repeat;
}

.home-carousel {
  max-width: 390px;
  width: 100%;
  margin: 0 auto; /* по центру */
  border-radius: 16px;
}

.home-slider-card,
.home-carousel .q-carousel__slide {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.home-slider-card img {
  width: 100%;
  height: 100%;
  object-fit: cover; /* заповнює без спотворень */
  display: block;
  pointer-events: none;
}

.title {
  padding: 20px;
  color: #030303;
  font-size: 20px;
  font-weight: 700;
  line-height: 28px;
  text-align: center;
}

.list {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;

}

.item {
  height: 160px;
  background-color: #ffffff;
  border-radius: 10px;
  box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
  width: calc((100% - 15px) / 2);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
}

.subtitle {
  color: #030303;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  text-align: center;
  margin: 0;
}

.auth-link {
  color: #030303;
  font-size: 14px;
  line-height: 16px;
  text-decoration: none;
  padding: 24px;
}
</style>

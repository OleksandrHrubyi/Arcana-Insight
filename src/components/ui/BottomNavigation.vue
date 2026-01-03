<template>
  <q-footer class="telegram-footer no-auth-btn">
    <div class="telegram-pill">
      <div
        v-for="item in items"
        :key="item.name"
        class="telegram-item"
        :class="{ 'telegram-item--active': current === item.name }"
        @click="onClick(item)"
      >
        <img :src="item.icon" class="telegram-icon" alt="" />
        <span class="telegram-label">
          {{ item.label }}
        </span>
      </div>
    </div>
  </q-footer>
</template>

<script>
import { useAuthStore } from 'stores/authStore.js';

export default {
  name: 'BottomNavigation',

  created() {
    const { initAuth } = useAuthStore();
    initAuth();
  },

  data () {
    return {
      current: 'arcana',
      items: [
        { name: 'arcana',    label: 'Arcana',    icon: '/images/arcana.svg', route: '/' },
        { name: 'horoscope', label: 'Horoscope', icon: '/images/horoscope.svg', route: '/horoscope'  },
        { name: 'tarot',     label: 'Tarot',     icon: '/images/tarot.svg', route: '/tarot'  },
        { name: 'settings',  label: 'Settings',  icon: '/images/settings.svg', route: '/settings'  }
      ]
    }
  },

  methods: {
    onClick (item) {
      this.current = item.name
      this.$emit('change', item.name)
      this.$router.push(item.route)

      // якщо використовуєш router:
      // this.$router.push({ name: item.name })
    }
  }
}
</script>

<style scoped>
/* прозорий фон футера, нічого зайвого */
.telegram-footer {
  background: transparent !important;
  box-shadow: none !important;
  border: 0;
  padding-bottom: env(safe-area-inset-bottom);
}

/* маленька «таблетка» як у Telegram */
.telegram-pill {
  margin: 0 auto 20px;
  width: calc(100% - 60px);    /* робимо менше за екран */
  max-width: 400px;
  height: 68px;

  padding: 6px 32px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(10, 10, 12, 0.1); /* темний, майже чорний */
  backdrop-filter: blur(5px);        /* легкий blur як у телеги */

  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow:
    0 0 20px rgba(0, 255, 180, 0.12),  /* м’який зелено-бірюзовий glow */
    0 0 0 1px rgba(255,255,255,0.06);  /* тонкий світлий контур */
}


/* айтем всередині таблетки */
.telegram-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  color: #ffffff;
  opacity: 0.5;

  cursor: pointer;
  transition: background 0.16s ease-out, opacity 0.16s ease-out, transform 0.08s;
}

/* активний таб – темне «коло» всередині плашки */
.telegram-item--active {
  opacity: 1;
  filter: drop-shadow(0 0 6px rgba(0,255,200,0.35));
}

/* підпис під іконкою */
.telegram-label {
  margin-top: 2px;
  font-size: 11px;
  line-height: 1;
  white-space: nowrap;
}

.telegram-icon {
  width: 24px;
}

</style>

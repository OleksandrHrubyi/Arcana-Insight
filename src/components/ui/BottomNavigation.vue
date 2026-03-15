<template>
  <q-footer class="telegram-footer no-auth-btn">
    <nav class="telegram-pill" ref="pill" :aria-label="tt('nav.bottom')">
      <button
        v-for="item in items"
        :key="item.name"
        class="telegram-item"
        :class="{ 'telegram-item--active': current === item.name }"
        type="button"
        :aria-current="current === item.name ? 'page' : undefined"
        :ref="setTabRef(item.name)"
        @click="onClick(item.name)"
      >
        <!-- ICONS -->
        <svg
          v-if="item.name === 'arcana'"
          class="telegram-icon"
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="16" cy="15" r="12" stroke="currentColor" stroke-width="2" />
          <path
            d="M4 16C10.9231 8.24422 20.1538 7.75945 28 16"
            stroke="currentColor"
            stroke-width="2"
          />
        </svg>

        <svg
          v-else-if="item.name === 'horoscope'"
          class="telegram-icon"
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d="M27 14V8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M30 11H24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M21 3V7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M23 5H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          <path
            d="M27.0828 19.0812C25.1198 19.6267 23.0471 19.641 21.0767 19.1228C19.1064 18.6046 17.3089 17.5724 15.8683 16.1317C14.4276 14.6911 13.3954 12.8937 12.8772 10.9233C12.359 8.95291 12.3733 6.88025 12.9188 4.91724L12.9191 4.91733C10.983 5.45595 9.22171 6.49249 7.81085 7.92367C6.39998 9.35486 5.38873 11.1307 4.87785 13.0744C4.36696 15.0181 4.37427 17.0617 4.89905 19.0016C5.42382 20.9416 6.44774 22.7102 7.86881 24.1313C9.28988 25.5523 11.0585 26.5762 12.9985 27.101C14.9384 27.6257 16.982 27.633 18.9257 27.1221C20.8694 26.6112 22.6452 25.5999 24.0764 24.1891C25.5076 22.7782 26.5441 21.0169 27.0827 19.0808L27.0828 19.0812Z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>

        <q-icon
          v-else-if="item.name === 'tarot'"
          name="style"
          size="28px"
          class="telegram-icon telegram-icon--material"
          aria-hidden="true"
        />

        <svg
          v-else
          class="telegram-icon"
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d="M6 10H26" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <path d="M6 16H26" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <path d="M6 22H26" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>

        <span class="telegram-label">{{ tt(item.labelKey) }}</span>
      </button>

      <!-- ✅ одна плавна крапка, що їздить -->
      <span class="telegram-indicator" :style="indicatorStyle"></span>
    </nav>

  </q-footer>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { t, currentLocale } from 'src/i18n'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

// Якщо хочеш лишити initAuth тут — розкоментуй (але краще винести в boot / layout)
// import { useAuthStore } from 'stores/authStore.js'

const emit = defineEmits(['change'])

const route = useRoute()
const router = useRouter()

const pill = ref(null)

const current = ref('arcana')
const selectedLocale = computed(() => currentLocale.value || 'en')

const items = [
  { name: 'arcana', labelKey: 'arcana' },
  { name: 'horoscope', labelKey: 'horoscope' },
  { name: 'tarot', labelKey: 'tarot' },
  { name: 'menu', labelKey: 'nav.menu' }
]


// refs на таби по name
const tabEls = new Map()
const setTabRef = (name) => (el) => {
  if (el) tabEls.set(name, el)
  else tabEls.delete(name)
}

const indicatorX = ref(0)
const indicatorReady = ref(false)

const indicatorStyle = computed(() => ({
  transform: `translateX(${indicatorX.value}px) translateX(-50%)`,
  opacity: indicatorReady.value ? 1 : 0
}))

const tt = (key) => t(selectedLocale.value, key)

function updateIndicator() {
  const tab = tabEls.get(current.value)
  if (!pill.value || !tab) return

  // ✅ стабільніше та швидше ніж getBoundingClientRect()
  indicatorX.value = tab.offsetLeft + tab.offsetWidth / 2
  indicatorReady.value = true
}

async function hapticLight() {
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch(e) {
    console.error(e);
  }
}

async function onClick(name) {
  // ✅ не блокуємо навігацію
  void hapticLight()

  if (name === current.value) return

  current.value = name
  emit('change', name)
  await router.push({ name })
}

// sync з роутом
watch(
  () => route.name,
  (val) => {
    const tab = route.meta?.tab || val || 'arcana'
    current.value = tab
  },
  { immediate: true }
)

// коли змінюється current — перерахувати індикатор після рендера
watch(
  () => current.value,
  async () => {
    await nextTick()
    updateIndicator()
  }
)


let ro = null
const onResizeFallback = () => updateIndicator()

onMounted(async () => {
  // // initAuth (опційно)
  // const { initAuth } = useAuthStore()
  // initAuth()

  await nextTick()
  updateIndicator()

  // ✅ реагує на зміну ширини pill (safe-area, локаль, шрифт, тощо)
  if (pill.value && 'ResizeObserver' in window) {
    ro = new ResizeObserver(() => updateIndicator())
    ro.observe(pill.value)
  } else {
    window.addEventListener('resize', onResizeFallback, { passive: true })
  }
})

onBeforeUnmount(() => {
  if (ro) ro.disconnect()
  window.removeEventListener('resize', onResizeFallback)
})
</script>

<style scoped>
/* Footer: прозорий, без тіней, + safe area */
.telegram-footer {
  background: transparent;
  box-shadow: none !important;
  border: 0;
  padding: 0 0 env(safe-area-inset-bottom);
}

/* контейнер: max-width, падінги */
.telegram-pill {
  margin: 0 auto;
  width: 100%;
  max-width: 448px;

  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 8px;
  padding: 0 16px 16px;
  position: relative;
}

/* таб як button */
.telegram-item {
  position: relative;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  min-width: 70px;
  padding: 12px 12px;
  gap: 8px;

  border-radius: 16px;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;

  background: transparent;
  border: 0;
  outline: none;

  color: rgba(156, 163, 175, 0.7);
  transition: color 500ms ease;
}

.telegram-icon {
  width: 28px;
  height: 28px;
  display: block;
  transition: filter 280ms ease;
}

.telegram-icon--material {
  color: currentColor;
}

.telegram-icon * {
  stroke: currentColor !important;
  transition: stroke 280ms ease;
}

.telegram-label {
  font-size: 12px;
  line-height: 1;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.telegram-item--active {
  color: #ffffff;
}

@keyframes iconWiggle {
  0% { transform: rotate(0deg) scale(1); }
  25% { transform: rotate(-6deg) scale(1.02); }
  50% { transform: rotate(6deg) scale(1.02); }
  75% { transform: rotate(-4deg) scale(1.01); }
  100% { transform: rotate(0deg) scale(1); }
}

.telegram-item:active .telegram-icon {
  transform-origin: 50% 60%;
  animation: iconWiggle 360ms ease-in-out;
}

.telegram-item--active .telegram-icon {
  filter: drop-shadow(0 0 12px rgba(255, 255, 255, 0.8));
}

/* одна крапка */
.telegram-indicator {
  position: absolute;
  left: 0;
  bottom: 12px;

  width: 10px;
  height: 4px;
  border-radius: 999px;
  opacity: 0.95;

  background: #ffffff;
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.8);

  pointer-events: none;
  will-change: transform, opacity;

  transition:
    transform 800ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 180ms ease;
}

.telegram-icon{
  width: 28px;
  height: 28px;
}

.telegram-item{
  gap: 6px; /* трішки компактніше */
}

</style>

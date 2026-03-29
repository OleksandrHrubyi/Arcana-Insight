<template>
  <q-footer
    class="telegram-footer no-auth-btn"
    :class="{ 'telegram-footer--hidden': energySheet }"
  >
    <nav class="telegram-pill" ref="pill" :aria-label="tt('nav.bottom')">
      <button
        v-for="item in items"
        :key="item.name"
        class="telegram-item"
        :class="{
          'telegram-item--active': (current === item.name && item.name !== 'energy') || (item.name === 'energy' && energySheet),
          'telegram-item--energy': item.name === 'energy'
        }"
        type="button"
        :aria-current="item.name !== 'energy' && current === item.name ? 'page' : undefined"
        :ref="setTabRef(item.name)"
        @click="onClick(item.name)"
      >
        <span class="telegram-visual" aria-hidden="true">
          <svg
            v-if="item.name === 'arcana'"
            class="telegram-icon"
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
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

          <span
            v-else-if="item.name === 'energy'"
            class="energy-orb"
          >
            <span class="energy-orb__halo"></span>
            <span class="energy-orb__frame"></span>
            <span class="energy-orb__orbit"></span>
            <span class="energy-orb__core"></span>
            <svg
              class="energy-orb__glyph"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M13.8 2.5L6.4 12.2h4.8l-1.1 9.3 7.6-10h-4.6l.7-9z"
                fill="currentColor"
              />
            </svg>
            <span class="energy-orb__spark energy-orb__spark--one"></span>
            <span class="energy-orb__spark energy-orb__spark--two"></span>
          </span>

          <q-icon
            v-else-if="item.name === 'tarot'"
            name="style"
            size="28px"
            class="telegram-icon telegram-icon--material"
          />

          <svg
            v-else-if="item.name === 'menu'"
            class="telegram-icon"
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M6 10H26" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <path d="M6 16H26" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <path d="M6 22H26" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </span>

        <span class="telegram-label">{{ tt(item.labelKey) }}</span>
      </button>

      <!-- ✅ одна плавна крапка, що їздить -->
      <span class="telegram-indicator" :style="indicatorStyle"></span>
    </nav>
  </q-footer>

  <q-dialog
    v-if="energySheetLoaded"
    v-model="energySheet"
    position="bottom"
    transition-show="slide-up"
    transition-hide="slide-down"
    :transition-duration="440"
    class="nav-energy-dialog"
    @hide="onEnergySheetHide"
  >
    <section class="landing-sheet">
      <div class="landing-sheet__handle" aria-hidden="true"></div>
      <div class="landing-sheet__title">{{ tt('energy') }}</div>

      <div class="landing-sheet__content">
        <DailyRitualProgressComponent
          compact
          variant="b"
          :is-visible="energySheet"
          @request-close="onEnergySheetRequestClose"
          @navigate-to="requestEnergyRoute"
        />
      </div>
    </section>
  </q-dialog>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { t, currentLocale } from 'src/i18n'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import {
  isNavigationHapticsSuppressed,
  suppressNavigationHaptics,
} from 'src/helpers/navigationHaptics'
const DailyRitualProgressComponent = defineAsyncComponent(() =>
  import('src/components/main/DailyRitualProgressComponent.vue'),
)

// Якщо хочеш лишити initAuth тут — розкоментуй (але краще винести в boot / layout)
// import { useAuthStore } from 'stores/authStore.js'

const emit = defineEmits(['change'])

const route = useRoute()
const router = useRouter()

const pill = ref(null)
const energySheet = ref(false)
const energySheetLoaded = ref(false)
const pendingEnergyRoute = ref('')

const current = ref('arcana')
const selectedLocale = computed(() => currentLocale.value || 'en')

const items = [
  { name: 'arcana', labelKey: 'arcana' },
  { name: 'horoscope', labelKey: 'horoscope' },
  { name: 'energy', labelKey: 'energy' },
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
const syncEnergySheetBodyClass = (isOpen) => {
  if (typeof document === 'undefined' || !document.body) return
  document.body.classList.toggle('energy-sheet-open', Boolean(isOpen))
}

function updateIndicator() {
  const tab = tabEls.get(current.value)
  if (!pill.value || !tab) return

  // ✅ стабільніше та швидше ніж getBoundingClientRect()
  indicatorX.value = tab.offsetLeft + tab.offsetWidth / 2
  indicatorReady.value = true
}

async function hapticLight() {
  if (isNavigationHapticsSuppressed()) return
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    // ignore haptics errors
  }
}

async function onClick(name) {
  if (isNavigationHapticsSuppressed()) return
  // ✅ не блокуємо навігацію
  void hapticLight()

  if (name === 'energy') {
    pendingEnergyRoute.value = ''
    energySheetLoaded.value = true
    energySheet.value = true
    return
  }

  if (name === current.value) return

  current.value = name
  emit('change', name)
  try {
    await router.push({ name })
  } catch {
    // ignore navigation race/cancel
  }
}

const requestEnergyRoute = (routeName) => {
  const normalized = String(routeName || '').trim()
  if (!normalized) return
  pendingEnergyRoute.value = normalized
  energySheet.value = false
}

const onEnergySheetRequestClose = () => {
  suppressNavigationHaptics(550)
  energySheet.value = false
}

const onEnergySheetHide = async () => {
  const routeName = pendingEnergyRoute.value
  pendingEnergyRoute.value = ''
  if (!routeName) return
  if (route.name === routeName) return
  try {
    await router.push({ name: routeName })
  } catch {
    // ignore navigation race/cancel
  }
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

watch(
  () => energySheet.value,
  (isOpen) => {
    syncEnergySheetBodyClass(isOpen)
  },
  { immediate: true }
)

let ro = null
const onResizeFallback = () => updateIndicator()

const initializeBottomNavigation = async () => {
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
}

const initializeBottomNavigationSafe = async () => {
  try {
    await initializeBottomNavigation()
  } catch (error) {
    console.warn('[BottomNavigation] init failed', error)
  }
}

onMounted(() => {
  void initializeBottomNavigationSafe()
})

onBeforeUnmount(() => {
  if (ro) ro.disconnect()
  window.removeEventListener('resize', onResizeFallback)
  syncEnergySheetBodyClass(false)
})
</script>

<style scoped>
/* Footer: прозорий, без тіней, + safe area */
.telegram-footer {
  background: transparent;
  box-shadow: none !important;
  border: 0;
  padding: 0 0 env(safe-area-inset-bottom);
  height: calc(86px + env(safe-area-inset-bottom, 0px));
  position: relative;
  z-index: 3;
  pointer-events: auto;
  display: flex;
  align-items: flex-end;
  transition:
    opacity 180ms ease,
    transform 220ms ease,
    visibility 0s linear;
}

.telegram-footer--hidden {
  opacity: 0;
  transform: translateY(14px);
  pointer-events: none;
  visibility: hidden;
}

:global(body.cards-nav-dark .telegram-footer)::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 86px;
  background: linear-gradient(180deg, rgba(5, 13, 21, 0.35) 0%, rgba(5, 13, 21, 0.94) 55%, rgba(5, 13, 21, 1) 100%);
  pointer-events: none;
}

/* контейнер: max-width, падінги */
.telegram-pill {
  margin: 0 auto;
  width: 100%;
  max-width: 448px;

  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 2px;
  padding: 0 12px 16px;
  position: relative;
  pointer-events: auto;
}

/* таб як button */
.telegram-item {
  position: relative;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;

  min-width: 0;
  flex: 1;
  padding: 8px 4px 10px;
  gap: 4px;

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

.telegram-visual {
  width: 100%;
  height: 40px;
  flex: 0 0 40px;
  display: flex;
  align-items: center;
  justify-content: center;
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
  font-size: 11px;
  line-height: 1;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.energy-orb {
  position: relative;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  overflow: hidden;
}

.energy-orb__glyph {
  position: relative;
  z-index: 6;
  width: 16px;
  height: 16px;
  color: rgba(223, 243, 255, 0.97);
  filter:
    drop-shadow(0 0 7px rgba(167, 222, 255, 0.5))
    drop-shadow(0 0 12px rgba(97, 177, 242, 0.28));
}

.energy-orb__core {
  position: absolute;
  inset: 8px;
  border-radius: 999px;
  z-index: 4;
  background: radial-gradient(
    74% 74% at 45% 40%,
    rgba(213, 241, 255, 0.82) 0%,
    rgba(142, 207, 255, 0.4) 45%,
    rgba(53, 113, 170, 0.2) 100%
  );
  box-shadow:
    inset 0 1px 0 rgba(233, 247, 255, 0.46),
    inset 0 -4px 7px rgba(18, 36, 59, 0.44);
}

.energy-orb__frame {
  position: absolute;
  inset: 3px;
  border-radius: 999px;
  z-index: 3;
  border: 1px solid rgba(168, 219, 255, 0.48);
  background:
    radial-gradient(120% 120% at 16% 14%, rgba(186, 231, 255, 0.34) 0%, rgba(186, 231, 255, 0) 56%),
    linear-gradient(180deg, rgba(17, 31, 49, 0.95), rgba(6, 13, 24, 0.98));
  box-shadow:
    0 7px 14px rgba(0, 0, 0, 0.36),
    0 0 14px rgba(115, 191, 248, 0.2),
    inset 0 1px 0 rgba(225, 243, 255, 0.24),
    inset 0 -1px 0 rgba(52, 97, 147, 0.46);
}

.energy-orb__halo {
  position: absolute;
  inset: -3px;
  border-radius: 999px;
  z-index: 2;
  background: radial-gradient(circle, rgba(109, 187, 247, 0.24) 0%, rgba(109, 187, 247, 0) 70%);
}

.energy-orb__orbit {
  position: absolute;
  inset: 6px;
  border-radius: 999px;
  z-index: 5;
  pointer-events: none;
}

.energy-orb__orbit::before,
.energy-orb__orbit::after {
  content: '';
  position: absolute;
  top: -1px;
  left: 50%;
  width: 3px;
  height: 3px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: rgba(206, 239, 255, 0.96);
  box-shadow:
    0 0 6px rgba(132, 199, 248, 0.84),
    0 0 10px rgba(132, 199, 248, 0.4);
}

.energy-orb__orbit::after {
  width: 2px;
  height: 2px;
  top: auto;
  bottom: 1px;
  background: rgba(214, 244, 255, 0.9);
}

.energy-orb__spark {
  position: absolute;
  z-index: 7;
  border-radius: 999px;
  background: rgba(221, 247, 255, 0.9);
  box-shadow: 0 0 5px rgba(160, 219, 255, 0.74);
}

.energy-orb__spark--one {
  width: 2px;
  height: 2px;
  top: 9px;
  right: 11px;
}

.energy-orb__spark--two {
  width: 2px;
  height: 2px;
  bottom: 10px;
  left: 9px;
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

.telegram-item:active .energy-orb {
  transform-origin: 50% 60%;
  animation: iconWiggle 360ms ease-in-out;
}

.telegram-item--active .telegram-icon {
  filter: drop-shadow(0 0 12px rgba(255, 255, 255, 0.8));
}

.telegram-item--energy.telegram-item--active .energy-orb {
  filter: drop-shadow(0 0 10px rgba(204, 234, 255, 0.56));
}

@media (prefers-reduced-motion: no-preference) {
  .energy-orb__halo {
    animation: energy-orb-halo 2.6s ease-in-out infinite;
  }

  .energy-orb__orbit {
    animation: energy-orb-orbit 3s linear infinite;
  }

  .energy-orb__glyph {
    animation: energy-orb-glyph 1.9s ease-in-out infinite;
  }

  .energy-orb__core {
    animation: energy-orb-core 2.2s ease-in-out infinite;
  }

  .energy-orb__spark--one {
    animation: energy-orb-spark 1.7s ease-in-out infinite;
  }

  .energy-orb__spark--two {
    animation: energy-orb-spark 1.7s ease-in-out 0.5s infinite;
  }
}

@keyframes energy-orb-halo {
  0%,
  100% {
    opacity: 0.56;
  }
  50% {
    opacity: 0.88;
  }
}

@keyframes energy-orb-orbit {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes energy-orb-glyph {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.92;
  }
  50% {
    transform: scale(1.08);
    opacity: 1;
  }
}

@keyframes energy-orb-core {
  0%,
  100% {
    opacity: 0.8;
    transform: scale(0.98);
  }
  50% {
    opacity: 1;
    transform: scale(1.03);
  }
}

@keyframes energy-orb-spark {
  0%,
  100% {
    opacity: 0.25;
    transform: scale(0.85);
  }
  50% {
    opacity: 1;
    transform: scale(1.25);
  }
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

:deep(.nav-energy-dialog .q-dialog__backdrop) {
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

:deep(.nav-energy-dialog .q-dialog__inner) {
  padding: 0;
  align-items: flex-end;
}

.landing-sheet {
  width: 100vw;
  max-width: 100vw;
  margin: 0 auto;
  border-radius: 22px 22px 0 0;
  padding: 8px 12px calc(env(safe-area-inset-bottom, 0px) + 24px);
  box-shadow: 0 -16px 46px rgba(0, 0, 0, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #ffffff;
  pointer-events: auto;
  background: #050d15;
}

.landing-sheet__handle {
  width: 36px;
  height: 3px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  margin: 0 auto 10px;
}

.landing-sheet__title {
  text-align: center;
  font-size: 13px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.74);
  margin-bottom: 8px;
}

.landing-sheet__content {
  max-width: 560px;
  margin: 0 auto;
}

</style>

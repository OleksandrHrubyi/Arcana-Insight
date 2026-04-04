import { defineRouter } from '#q-app/wrappers'
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from 'vue-router'
import routes from './routes'
import { scroll } from 'quasar'
import { analytics } from 'src/services/analytics'
import { useAuthStore } from 'stores/authStore.js'
import { isOnboardingComplete } from 'src/helpers/onboardingPrefs'
import { resolveRouteGuardDecision } from './guard'

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter(function (/* { store, ssrContext } */) {
  const { setVerticalScrollPosition } = scroll
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const forceScrollTop = () => {
    if (typeof window === 'undefined') return
    const targets = [
      window,
      document.scrollingElement,
      document.documentElement,
      document.body,
      document.querySelector('.q-page-container'),
      document.querySelector('.q-layout__section--main'),
    ]
    const seen = new Set()
    targets.forEach((target) => {
      if (!target || seen.has(target)) return
      seen.add(target)
      setVerticalScrollPosition(target, 0, 0)
    })
  }

  const Router = createRouter({
    scrollBehavior () {
      return { left: 0, top: 0 }
    },
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE),
  })

  Router.beforeEach(async (to) => {
    const authStore = useAuthStore()

    // On cold start the session restore runs in the background (auth boot is fire-and-forget).
    // Wait for it to finish before making auth decisions, so we don't redirect
    // an already-authenticated user to /login just because the session hasn't loaded yet.
    if (!authStore.state.sessionLoaded) {
      const SESSION_TIMEOUT_MS = 3000
      await Promise.race([
        authStore.waitForSession(),
        new Promise((resolve) => setTimeout(resolve, SESSION_TIMEOUT_MS)),
      ])
    }

    const onboardingComplete = isOnboardingComplete()
    const hasUser = Boolean(authStore.state.user)
    return resolveRouteGuardDecision({
      to,
      onboardingComplete,
      hasUser,
    })
  })

  Router.afterEach((to) => {
    const screenName = to.name || to.path
    analytics.logScreenView(screenName, to.meta?.analyticsClass || screenName)
    requestAnimationFrame(() => {
      forceScrollTop()
      requestAnimationFrame(forceScrollTop)
    })
  })

  return Router
})

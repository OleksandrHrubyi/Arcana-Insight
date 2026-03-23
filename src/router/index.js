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
    console.log('[Router] beforeEach', { to: to.name || to.path, requiresAuth: !!to.meta?.requiresAuth })
    if (!to.meta?.requiresAuth) return true
    if (authStore.state.user) {
      console.log('[Router] cached authStore user present, allow')
      return true
    }
    // Avoid hanging on auth network calls in route guard
    if (authStore.state.user) {
      console.log('[Router] fallback to cached authStore user, allow')
      return true
    }
    return { name: 'login' }
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

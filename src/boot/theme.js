import { boot } from 'quasar/wrappers'

export default boot(({ app }) => {
  const $q = app.config.globalProperties.$q
  const saved = localStorage.getItem('ai_theme') // 'dark' | 'light' | null

  if (saved === 'dark') $q.dark.set(true)
  else if (saved === 'light') $q.dark.set(false)
  else $q.dark.set(true)
})

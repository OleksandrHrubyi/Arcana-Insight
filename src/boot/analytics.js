import { analytics } from 'src/services/analytics'

export default async () => {
  // Keep startup interactive first; init analytics shortly after first paint.
  setTimeout(() => {
    analytics.init()
  }, 1500)
}

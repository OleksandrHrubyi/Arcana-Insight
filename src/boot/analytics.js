import { analytics } from 'src/services/analytics'

export default async () => {
  // Do not block app boot on analytics init.
  analytics.init()
}

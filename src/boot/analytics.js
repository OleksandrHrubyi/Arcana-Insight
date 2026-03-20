import { analytics } from 'src/services/analytics'

export default async () => {
  await analytics.init()
}

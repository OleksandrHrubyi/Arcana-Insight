// Shared light-tap haptic for buttons/taps across the app. Native-only — on
// web/preview the Capacitor Haptics call throws and we no-op via the catch, so
// callers can fire it unconditionally.
import { Haptics, ImpactStyle } from '@capacitor/haptics'

const lightImpact = async (style = ImpactStyle.Light) => {
  try {
    await Haptics.impact({ style })
  } catch {
    // keep UI flow even if haptics is unavailable
  }
}

// Original name kept for existing callers (RitualRewardsPage, …).
export const impactLight = () => lightImpact()

// Preferred name for new callers.
export const tapHaptic = (style = ImpactStyle.Light) => lightImpact(style)

export { ImpactStyle }

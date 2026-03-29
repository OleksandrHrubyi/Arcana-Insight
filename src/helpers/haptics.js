import { Haptics, ImpactStyle } from '@capacitor/haptics'

export const impactLight = async () => {
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    // keep UI flow even if haptics is unavailable
  }
}


export const ENERGY_SHEET_VARIANTS = Object.freeze({
  premium: 'premium',
  premiumLite: 'premium-lite',
})

export const ENERGY_SHEET_VARIANT_STORAGE_KEY = 'arcana_energy_sheet_variant'
export const DEFAULT_ENERGY_SHEET_VARIANT = ENERGY_SHEET_VARIANTS.premium

export const isEnergySheetVariant = (value) =>
  value === ENERGY_SHEET_VARIANTS.premium || value === ENERGY_SHEET_VARIANTS.premiumLite

export const resolveEnergySheetVariant = (explicitValue) => {
  if (isEnergySheetVariant(explicitValue)) return explicitValue
  if (typeof window === 'undefined') return DEFAULT_ENERGY_SHEET_VARIANT
  try {
    const storedValue = localStorage.getItem(ENERGY_SHEET_VARIANT_STORAGE_KEY)
    if (isEnergySheetVariant(storedValue)) return storedValue
  } catch {
    // ignore storage access issues
  }
  return DEFAULT_ENERGY_SHEET_VARIANT
}

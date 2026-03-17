let cached = null
let pending = null

export async function loadTarotData() {
  if (cached) return cached
  if (pending) return pending
  pending = import('src/data/cardsV2/tarot_full.json').then((mod) => {
    cached = mod?.default || mod || null
    return cached
  })
  return pending
}

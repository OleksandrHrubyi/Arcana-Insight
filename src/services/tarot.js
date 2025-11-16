// мінідані для деву; пізніше додамо весь набір 78 карт
const DECK = [
  {
    id: 'the-fool',
    name: 'The Fool',
    keywords: ['початок', 'спонтанність', 'вибір'],
    upright: 'Новий старт, легкість, довіра до процесу.',
    reversed: 'Імпульсивність, необачність, відкладання рішення.',
    img: '/cards/major_00_fool.png'
  },
  {
    id: 'the-magician',
    name: 'The Magician',
    keywords: ['сила волі', 'ресурси', 'фокус'],
    upright: 'Є все необхідне, щоб втілити задум.',
    reversed: 'Розфокус, маніпуляції, сумніви у власних силах.',
    img: '/cards/major_01_magician.png'
  },
  {
    id: 'the-high-priestess',
    name: 'The High Priestess',
    keywords: ['інтуїція', 'таємниця', 'спокій'],
    upright: 'Довірся інтуїції, споглядання дасть відповідь.',
    reversed: 'Ігнор інтуїції, поверхневість, шум заважає чути себе.',
    img: '/cards/major_02_priestess.png'
  }
]

// шанс перевернення (0..1)
const DEFAULT_REVERSED_CHANCE = 0.5

export function drawCard (opts = {}) {
  const reversedChance = opts.reversedChance ?? DEFAULT_REVERSED_CHANCE
  const card = DECK[Math.floor(Math.random() * DECK.length)]
  const reversed = Math.random() < reversedChance
  return { ...card, reversed }
}

export function formatDailyEntry (card) {
  const now = new Date()
  const iso = now.toISOString()
  return {
    id: `${card.id}-${iso}`,
    date: iso,
    cardId: card.id,
    name: card.name,
    reversed: !!card.reversed,
    meaning: card.reversed ? card.reversedText ?? card.reversed : card.upright,
    keywords: card.keywords ?? [],
    img: card.img
  }
}

// експортуємо саму колоду на майбутнє (наприклад, для “Deck Browser”)
export function getDeck () {
  return DECK
}

// @ts-nocheck
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

const MODEL = Deno.env.get('OPENAI_MODEL') || 'gpt-4.1-mini'
const DEFAULT_LOCALE = 'uk'

const POSITION_LABELS = {
  sign: 'Знак',
  past: 'Минуле',
  present: 'Тепер',
  future: 'Поріг',
  root: 'Корінь',
  pressure: 'Тиск',
  hidden: 'Приховане',
  shift: 'Зміна',
  outcome: 'Вихід'
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method Not Allowed' }, 405)
  }

  const body = await req.json().catch(() => null)
  if (!body?.cards?.length) {
    return json({ error: 'Missing cards payload' }, 400)
  }

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) {
      return json(buildFallback(body))
    }

    const locale = normalizeLocale(body?.locale)
    const language = locale === 'en' ? 'English' : 'Ukrainian'

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text:
                  `You write premium tarot interpretations in ${language} for a mobile app. Return strict JSON only. Tone: mystical, calm, emotionally precise, modern, not cheesy. Explain meanings only. Do NOT predict the future, do NOT promise outcomes, do NOT give advice or directives, and avoid fortune-telling language (no "will happen", "you will", "soon", "destined"). Do NOT mention health, medical, legal, financial, or safety advice. Do NOT tell the user what to do. Describe what each card symbolizes and how it relates to the chosen theme/subtheme and the user question in the present moment. Keep it meaning-focused, reflective, and non-prescriptive. Make the reading detailed but concise for a mobile UI. Avoid markdown, disclaimers, therapy talk, and generic filler.`
              }
            ]
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: buildPrompt(body)
              }
            ]
          }
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'tarot_reading',
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                summaryTitle: { type: 'string' },
                opening: { type: 'string' },
                summary: { type: 'string' },
                advice: { type: 'string' },
                cards: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      position: { type: 'string' },
                      positionLabel: { type: 'string' },
                      cardTitle: { type: 'string' },
                      message: { type: 'string' },
                      detail: { type: 'string' },
                      question: { type: 'string' }
                    },
                    required: ['position', 'positionLabel', 'cardTitle', 'message', 'detail', 'question']
                  }
                }
              },
              required: ['summaryTitle', 'opening', 'summary', 'advice', 'cards']
            }
          }
        }
      })
    })

    if (!response.ok) {
      console.error(await response.text())
      return json(buildFallback(body))
    }

    const result = await response.json()
    const text = result.output_text || extractOutputText(result) || '{}'
    const parsed = JSON.parse(text)
    if (!isValidReading(parsed)) {
      return json(buildFallback(body))
    }
    return json(parsed)
  } catch (error) {
    console.error(error)
    return json(buildFallback(body))
  }
})

function buildPrompt(body) {
  return JSON.stringify(
    {
      locale: body.locale,
      theme: body.theme,
      themeLabel: body.themeLabel,
      subTheme: body.subTheme,
      subThemeLabel: body.subThemeLabel,
      question: body.question,
      depth: body.depth,
      cards: body.cards,
      instructions: {
        summaryTitle: '2-4 words',
        opening: 'One strong opening sentence for the whole spread. Present-focused, non-predictive, no advice.',
        summary: 'A fuller overall interpretation, 2-3 sentences. Explain meaning in the chosen theme/subtheme. No advice.',
        advice: 'One closing line that is reflective only (no advice, no directives, no predictions).',
        cardMessage: '1 short mystical sentence per card. Meaning-based, not predictive, no advice.',
        cardDetail: '1 more concrete explanatory sentence per card. Tie to theme/subtheme and question. No advice.',
        cardQuestion: '1 reflective question per card.'
      }
    },
    null,
    2
  )
}

function normalizeLocale(locale) {
  const value = String(locale || DEFAULT_LOCALE).toLowerCase()
  if (value.startsWith('en')) return 'en'
  if (value.startsWith('uk')) return 'uk'
  return DEFAULT_LOCALE
}

function buildFallback(body) {
  const themeSummary = {
    relationships: 'У цьому розкладі все впирається в емоційну чесність між людьми.',
    work: 'У цьому розкладі найважливіше не затягувати з конкретним рішенням.',
    money: 'У цьому розкладі ключова увага йде на баланс ресурсів та витрат.',
    choice: 'У цьому розкладі головна точка сили лежить у твоєму внутрішньому виборі.',
    self: 'У цьому розкладі головна точка сили лежить у твоєму внутрішньому виборі.',
    default: 'У цьому розкладі важливо бачити сенс і контекст, а не поспішати з висновками.'
  }

  return {
    summaryTitle: 'Тлумачення',
    opening: 'Карти вже склали лінію, яку варто дочитати до кінця.',
    summary: themeSummary[body.theme] || themeSummary.self,
    advice: 'Нехай цей розклад підсвітить сенси, які зараз важливі.',
    cards: body.cards.map((card) => ({
      position: card.position,
      positionLabel: card.positionLabel || POSITION_LABELS[card.position] || card.position,
      cardTitle: card.cardTitle,
      message: card.meaning || card.cardTitle,
      detail: (card.keywords || []).slice(0, 3).join(', '),
      question: 'Що в цій карті відгукується найсильніше?'
    }))
  }
}

function extractOutputText(result) {
  const output = Array.isArray(result?.output) ? result.output : []
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : []
    for (const part of content) {
      if (part?.type === 'output_text' && typeof part?.text === 'string') {
        return part.text
      }
      if (part?.type === 'text' && typeof part?.text === 'string') {
        return part.text
      }
    }
  }
  return ''
}

function isValidReading(data) {
  if (!data || typeof data !== 'object') return false
  if (typeof data.summaryTitle !== 'string') return false
  if (typeof data.opening !== 'string') return false
  if (typeof data.summary !== 'string') return false
  if (typeof data.advice !== 'string') return false
  if (!Array.isArray(data.cards) || data.cards.length === 0) return false
  return !containsDisallowed(data)
}

function containsDisallowed(data) {
  const text = [
    data.summaryTitle,
    data.opening,
    data.summary,
    data.advice,
    ...(data.cards || []).flatMap((card) => [card.message, card.detail, card.question, card.cardTitle, card.positionLabel]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const patterns = [
    // future/prediction language
    /\bwill\b/,
    /\bgoing to\b/,
    /\bsoon\b/,
    /\bdestined\b/,
    /\bstands to\b/,
    /\bshall\b/,
    /\b(буде|будуть|станеться|стануть|скоро|неминуче|призведе|приведе|збудеться)\b/,
    // advice / directives
    /\bshould\b/,
    /\bneed to\b/,
    /\bmust\b/,
    /\byou (should|need|must)\b/,
    /\b(треба|потрібно|слід|варто|маєш|повинен|повинна)\b/,
    // medical/legal/financial/safety advice hints
    /\bdoctor\b/,
    /\bmedical\b/,
    /\blegal\b/,
    /\bfinancial advice\b/,
    /\binvestment\b/,
    /\bcredit\b/,
    /\b(лікар|медичн|юридичн|фінансов|інвест|кредит)\w*/,
  ]

  return patterns.some((re) => re.test(text))
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS,
      'content-type': 'application/json'
    }
  })
}

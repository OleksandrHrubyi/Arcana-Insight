// @ts-nocheck
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

const MODEL = Deno.env.get('OPENAI_MODEL') || 'gpt-4.1-mini'

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
                  'You write premium tarot interpretations in Ukrainian for a mobile app. Return strict JSON only. Tone: mystical, calm, emotionally precise, modern, not cheesy. Make the reading meaningfully detailed but still concise enough for a mobile UI. Avoid markdown, disclaimers, therapy talk, and generic filler.'
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
    const text = result.output_text || '{}'
    const parsed = JSON.parse(text)
    return json(parsed)
  } catch (error) {
    console.error(error)
    return json(buildFallback(body))
  }
})

function buildPrompt(body) {
  return JSON.stringify(
    {
      theme: body.theme,
      depth: body.depth,
      state: body.state,
      cards: body.cards,
      instructions: {
        summaryTitle: '2-4 words',
        opening: 'One strong opening sentence for the whole spread.',
        summary: 'A fuller overall interpretation, 2-3 sentences.',
        advice: 'One practical closing line.',
        cardMessage: '1 short mystical sentence per card.',
        cardDetail: '1 more concrete explanatory sentence per card.',
        cardQuestion: '1 reflective question per card.'
      }
    },
    null,
    2
  )
}

function buildFallback(body) {
  const themeSummary = {
    love: 'У цьому розкладі все впирається в емоційну чесність між людьми.',
    work: 'У цьому розкладі найважливіше не затягувати з конкретним рішенням.',
    self: 'У цьому розкладі головна точка сили лежить у твоєму внутрішньому виборі.'
  }

  return {
    summaryTitle: 'Тлумачення',
    opening: 'Карти вже склали лінію, яку варто дочитати до кінця.',
    summary: themeSummary[body.theme] || themeSummary.self,
    advice: 'Подивись, яка карта викликала найбільший внутрішній відгук, і почни з неї.',
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

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS,
      'content-type': 'application/json'
    }
  })
}

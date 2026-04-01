// @ts-nocheck
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') || 'gpt-4.1-mini'
const OPENROUTER_MODEL = Deno.env.get('OPENROUTER_MODEL') || 'openai/gpt-4o-mini'
const OPENROUTER_URL = Deno.env.get('OPENROUTER_URL') || 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_LOCALE = 'uk'
const AI_UNAVAILABLE_CODE = 'AI_UNAVAILABLE'

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
    const locale = normalizeLocale(body?.locale)
    const language = locale === 'en' ? 'English' : 'Ukrainian'
    const providerErrors = []

    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    if (openAiKey) {
      try {
        const openAiReading = await requestOpenAiReading({ body, apiKey: openAiKey, language })
        return withProviderMeta(openAiReading, 'openai', OPENAI_MODEL)
      } catch (error) {
        const reason = resolveReason(error, 'openai_exception')
        providerErrors.push({ provider: 'openai', reason })
        console.error('[tarot-reading] openai failed', reason, error)
      }
    } else {
      providerErrors.push({ provider: 'openai', reason: 'missing_openai_api_key' })
    }

    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY')
    if (openRouterKey) {
      try {
        const openRouterReading = await requestOpenRouterReading({
          body,
          apiKey: openRouterKey,
          language,
        })
        return withProviderMeta(openRouterReading, 'openrouter', OPENROUTER_MODEL)
      } catch (error) {
        const reason = resolveReason(error, 'openrouter_exception')
        providerErrors.push({ provider: 'openrouter', reason })
        console.error('[tarot-reading] openrouter failed', reason, error)
      }
    } else {
      providerErrors.push({ provider: 'openrouter', reason: 'missing_openrouter_api_key' })
    }

    console.error('[tarot-reading] all providers failed', providerErrors)
    return aiError('AI interpretation is unavailable', 503, 'all_providers_failed')
  } catch (error) {
    console.error('[tarot-reading] unhandled error', error)
    return aiError('AI interpretation is unavailable', 503, 'provider_flow_exception')
  }
})

async function requestOpenAiReading({ body, apiKey, language }) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: buildSystemPrompt(language)
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
          schema: tarotReadingSchema(),
        }
      }
    })
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw providerError('openai_http_error', {
      status: response.status,
      details,
    })
  }

  const result = await response.json()
  const text = result.output_text || extractOutputText(result) || '{}'
  const parsed = parseJsonStrict(text, 'openai_invalid_json')
  validateReading(parsed, 'openai_invalid_ai_payload')
  return parsed
}

async function requestOpenRouterReading({ body, apiKey, language }) {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': Deno.env.get('OPENROUTER_HTTP_REFERER') || 'https://arcana-insight.app',
      'X-Title': Deno.env.get('OPENROUTER_X_TITLE') || 'Arcana Insight',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `${buildSystemPrompt(language)} Return a JSON object with keys summaryTitle, opening, summary, advice, cards.`
        },
        {
          role: 'user',
          content: buildPrompt(body)
        }
      ]
    })
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw providerError('openrouter_http_error', {
      status: response.status,
      details,
    })
  }

  const result = await response.json()
  const rawText = extractOpenRouterText(result)
  const parsed = parseJsonStrict(rawText, 'openrouter_invalid_json')
  validateReading(parsed, 'openrouter_invalid_ai_payload')
  return parsed
}

function buildSystemPrompt(language) {
  return `You write premium tarot interpretations in ${language} for a mobile app. Return strict JSON only. Tone: mystical, calm, emotionally precise, modern, not cheesy. Explain meanings only. Do NOT predict the future, do NOT promise outcomes, do NOT give advice or directives, and avoid fortune-telling language (no "will happen", "you will", "soon", "destined"). Do NOT mention health, medical, legal, financial, or safety advice. Do NOT tell the user what to do. Describe what each card symbolizes and how it relates to the chosen theme/subtheme and the user question in the present moment. Keep it meaning-focused, reflective, and non-prescriptive. Make the reading detailed but concise for a mobile UI. Avoid markdown, disclaimers, therapy talk, and generic filler.`
}

function tarotReadingSchema() {
  return {
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

function validateReading(data, reason) {
  if (isValidReading(data)) {
    return
  }
  throw providerError(reason)
}

function extractOpenRouterText(result) {
  const content = result?.choices?.[0]?.message?.content
  if (typeof content === 'string') {
    return content
  }
  if (Array.isArray(content)) {
    return content.map((chunk) => String(chunk?.text || chunk?.content || '')).join(' ').trim()
  }
  return ''
}

function parseJsonStrict(rawText, reason) {
  const text = String(rawText || '').trim()
  if (!text) {
    throw providerError(reason, { details: 'empty_output' })
  }

  try {
    return JSON.parse(text)
  } catch (_error) {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end <= start) {
      throw providerError(reason, { details: 'json_boundaries_not_found' })
    }
    const candidate = text.slice(start, end + 1)
    try {
      return JSON.parse(candidate)
    } catch (_innerError) {
      throw providerError(reason, { details: 'json_parse_failed' })
    }
  }
}

function providerError(reason, extra = {}) {
  const error = new Error(reason)
  error.reason = reason
  Object.assign(error, extra)
  return error
}

function resolveReason(error, fallbackReason) {
  return String(error?.reason || fallbackReason)
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

function withProviderMeta(data, provider, model) {
  return json({
    ...data,
    meta: {
      provider,
      model,
    },
  })
}

function aiError(message, status = 503, reason = 'ai_unavailable') {
  return json(
    {
      error: message,
      code: AI_UNAVAILABLE_CODE,
      reason,
    },
    status,
  )
}

// @ts-nocheck
import { isUserPremium, premiumEnforcementEnabled } from '../_shared/premium.ts'

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
const AI_TIMEOUT_MS = Math.max(15000, Number(Deno.env.get('OPENAI_TIMEOUT_MS') ?? 60000))

// Deno fetch has no default timeout — without this a stalled provider hangs the
// request (and the user's tarot screen) indefinitely.
async function fetchWithTimeout(url, opts, ms = AI_TIMEOUT_MS) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(`timeout after ${ms}ms`), ms)
  try {
    return await fetch(url, { ...opts, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method Not Allowed' }, 405)
  }

  // AI tarot is a paid feature (verify_jwt rejects invalid tokens at the gateway;
  // this is defense-in-depth). Premium users always get it. Non-premium users get
  // exactly ONE free AI reading per account — "your first reading is a gift" — then
  // it's premium-only. Enforcement is flag-gated (RC_ENFORCE_PREMIUM).
  const auth = req.headers.get('Authorization')
  if (!auth) {
    return json({ error: 'Missing authorization' }, 401)
  }

  const SUPA_URL = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('URL')!
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('ANON_KEY')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')!

  let user = null
  let admin = null
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(SUPA_URL, ANON_KEY, { global: { headers: { Authorization: auth } } })
    const res = await supabase.auth.getUser()
    user = res?.data?.user || null
    if (!user) return json({ error: 'Unauthorized' }, 401)
    if (premiumEnforcementEnabled()) {
      admin = createClient(SUPA_URL, SERVICE_KEY, { auth: { persistSession: false } })
    }
  } catch (error) {
    console.error('[tarot-reading] auth check failed', error)
    return json({ error: 'Unauthorized' }, 401)
  }

  const body = await req.json().catch(() => null)
  const isPremium = admin ? await isUserPremium(admin, user.id) : true

  // Clarify mode: premium-only (not part of the free first-reading gift).
  if (body?.mode === 'clarify') {
    if (admin && !isPremium) return json({ error: 'premium_required' }, 403)
    return await handleClarify(body)
  }

  if (!body?.cards?.length) {
    return json({ error: 'Missing cards payload' }, 400)
  }

  // Reading: premium → always; otherwise consume the one free AI reading (the gift).
  let freeAiGift = false
  if (admin && !isPremium) {
    const granted = await consumeFreeAiGrant(admin, user.id, 'tarot')
    if (!granted) return json({ error: 'premium_required' }, 403)
    freeAiGift = true
  }

  try {
    const locale = normalizeLocale(body?.locale)
    const language = locale === 'en' ? 'English' : 'Ukrainian'
    const providerErrors = []

    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    if (openAiKey) {
      try {
        const openAiReading = await requestOpenAiReading({ body, apiKey: openAiKey, language })
        return withProviderMeta(openAiReading, 'openai', OPENAI_MODEL, freeAiGift)
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
        return withProviderMeta(openRouterReading, 'openrouter', OPENROUTER_MODEL, freeAiGift)
      } catch (error) {
        const reason = resolveReason(error, 'openrouter_exception')
        providerErrors.push({ provider: 'openrouter', reason })
        console.error('[tarot-reading] openrouter failed', reason, error)
      }
    } else {
      providerErrors.push({ provider: 'openrouter', reason: 'missing_openrouter_api_key' })
    }

    console.error('[tarot-reading] all providers failed', providerErrors)
    // The AI failed — don't burn the user's one free reading on a failure.
    if (freeAiGift && admin) await refundFreeAiGrant(admin, user.id, 'tarot')
    return aiError('AI interpretation is unavailable', 503, 'all_providers_failed')
  } catch (error) {
    console.error('[tarot-reading] unhandled error', error)
    if (freeAiGift && admin) await refundFreeAiGrant(admin, user.id, 'tarot')
    return aiError('AI interpretation is unavailable', 503, 'provider_flow_exception')
  }
})

// One free AI reading per account: atomically insert the grant. Returns true only
// when newly inserted (= this is their free one); false if it already existed.
async function consumeFreeAiGrant(admin, userId, feature) {
  try {
    const { data, error } = await admin
      .from('ai_free_grants')
      .upsert([{ user_id: userId, feature }], { onConflict: 'user_id,feature', ignoreDuplicates: true })
      .select()
    if (error) {
      console.error('[tarot-reading] free-grant upsert failed', error.message)
      return false
    }
    return Array.isArray(data) && data.length > 0
  } catch (e) {
    console.error('[tarot-reading] free-grant exception', e)
    return false
  }
}

// Refund the grant if the AI call failed, so a failure doesn't consume the gift.
async function refundFreeAiGrant(admin, userId, feature) {
  try {
    await admin.from('ai_free_grants').delete().eq('user_id', userId).eq('feature', feature)
  } catch (e) {
    console.error('[tarot-reading] free-grant refund failed', e)
  }
}

async function requestOpenAiReading({ body, apiKey, language }) {
  const response = await fetchWithTimeout('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      store: false,
      input: [
        { role: 'system', content: buildSystemPrompt(language) },
        { role: 'user', content: buildPrompt(body) },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'tarot_reading',
          strict: true,
          schema: tarotReadingSchema(),
        }
      },
      temperature: 0.6,
      max_output_tokens: 2000,
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
  const response = await fetchWithTimeout(OPENROUTER_URL, {
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
  return `You write premium tarot interpretations in ${language} for a mobile app. Return strict JSON only. Read the spread as one connected reading, the way a thoughtful tarot reader would: show how the cards relate to, build on, or stand in tension with one another, and follow the thread across the positions of the spread instead of describing each card in isolation. Use the position each card sits in, and whether it is reversed, to shape its meaning. Notice any repeated suits, numbers, or motifs and what they emphasize. Tone: mystical, calm, emotionally precise, modern, not cheesy. Explain meanings only. Do NOT predict the future, do NOT promise outcomes, do NOT give advice or directives, and avoid fortune-telling language (no "will happen", "you will", "soon", "destined"). Do NOT mention health, medical, legal, financial, or safety advice. Do NOT tell the user what to do. Relate everything to the chosen theme/subtheme and the user question in the present moment. Keep it meaning-focused, reflective, and non-prescriptive. Make the reading detailed but concise for a mobile UI. Avoid markdown, disclaimers, therapy talk, and generic filler.`
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
      clarifyQuestion: body.clarifyQuestion,
      clarifyAnswer: body.clarifyAnswer,
      depth: body.depth,
      cards: body.cards,
      instructions: {
        summaryTitle: '2-4 words that capture the spread as a whole.',
        opening: 'One strong opening sentence that frames the whole spread as a single connected story. Present-focused, non-predictive, no advice.',
        summary: 'The heart of the reading, 3-4 sentences: weave the cards into one narrative — how they relate, reinforce, or create tension as you move across the positions. Refer to cards by their position and name any repeated suit, number, or motif. Do not just list the cards. No advice.',
        advice: 'One closing line that ties the spread together, reflective only (no advice, no directives, no predictions).',
        cardMessage: '1 short evocative sentence per card, read through its position and orientation (reversed or upright). Meaning-based, not predictive, no advice.',
        cardDetail: '1 sentence per card connecting it to the neighbouring cards or the overall arc, and to the theme/subtheme and question. No advice.',
        cardQuestion: '1 reflective question per card.',
        positions: 'Keep each card\'s given positionLabel and cardTitle unchanged; interpret each card for the position it occupies.',
        clarification: 'If clarifyQuestion and clarifyAnswer are present, treat the answer as the querent\'s focus and let it shape the whole reading.'
      }
    },
    null,
    2
  )
}

// ---- Clarify mode (one focusing question before the draw) ----

async function handleClarify(body) {
  const locale = normalizeLocale(body?.locale)
  const language = locale === 'en' ? 'English' : 'Ukrainian'

  const openAiKey = Deno.env.get('OPENAI_API_KEY')
  if (openAiKey) {
    try {
      return json(await requestOpenAiClarify({ body, apiKey: openAiKey, language }))
    } catch (error) {
      console.error('[tarot-clarify] openai failed', resolveReason(error, 'openai_exception'), error)
    }
  }

  const openRouterKey = Deno.env.get('OPENROUTER_API_KEY')
  if (openRouterKey) {
    try {
      return json(await requestOpenRouterClarify({ body, apiKey: openRouterKey, language }))
    } catch (error) {
      console.error('[tarot-clarify] openrouter failed', resolveReason(error, 'openrouter_exception'), error)
    }
  }

  return aiError('Clarify is unavailable', 503, 'clarify_unavailable')
}

function clarifySchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      question: { type: 'string' },
      options: { type: 'array', items: { type: 'string' } },
    },
    required: ['question', 'options'],
  }
}

function buildClarifySystemPrompt(language) {
  return `You are a thoughtful tarot reader speaking in ${language}. Before any cards are drawn, ask ONE short clarifying question that focuses the reading, based on the querent's theme and their question. It should help narrow what they actually want to look at. Then offer 2 or 3 short, concrete answers they might choose (each a few words, distinct from one another). Warm, calm, concise. Do NOT predict the future, do NOT give advice, do NOT reference specific cards. Return strict JSON only with keys "question" and "options".`
}

function buildClarifyPrompt(body) {
  return JSON.stringify(
    {
      locale: body.locale,
      theme: body.theme,
      themeLabel: body.themeLabel,
      subTheme: body.subTheme,
      subThemeLabel: body.subThemeLabel,
      question: body.question,
      instructions: {
        question: 'One short clarifying question (max ~12 words) to focus the reading.',
        options: '2-3 short candidate answers (each max ~5 words), distinct from each other.',
      },
    },
    null,
    2,
  )
}

async function requestOpenAiClarify({ body, apiKey, language }) {
  const response = await fetchWithTimeout('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      store: false,
      input: [
        { role: 'system', content: buildClarifySystemPrompt(language) },
        { role: 'user', content: buildClarifyPrompt(body) },
      ],
      text: { format: { type: 'json_schema', name: 'tarot_clarify', strict: true, schema: clarifySchema() } },
      temperature: 0.6,
      max_output_tokens: 400,
    }),
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw providerError('openai_http_error', { status: response.status, details })
  }

  const result = await response.json()
  const text = result.output_text || extractOutputText(result) || '{}'
  return validateClarify(parseJsonStrict(text, 'openai_invalid_json'))
}

async function requestOpenRouterClarify({ body, apiKey, language }) {
  const response = await fetchWithTimeout(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': Deno.env.get('OPENROUTER_HTTP_REFERER') || 'https://arcana-insight.app',
      'X-Title': Deno.env.get('OPENROUTER_X_TITLE') || 'Arcana Insight',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `${buildClarifySystemPrompt(language)} Return a JSON object with keys question and options.`,
        },
        { role: 'user', content: buildClarifyPrompt(body) },
      ],
    }),
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw providerError('openrouter_http_error', { status: response.status, details })
  }

  const result = await response.json()
  return validateClarify(parseJsonStrict(extractOpenRouterText(result), 'openrouter_invalid_json'))
}

function validateClarify(data) {
  if (!data || typeof data.question !== 'string' || !data.question.trim()) {
    throw providerError('clarify_invalid_payload')
  }
  const options = Array.isArray(data.options)
    ? data.options.map((opt) => String(opt || '').trim()).filter(Boolean).slice(0, 3)
    : []
  // Reuse the reading content filter so clarifier copy stays non-predictive/safe.
  const guardShape = {
    summaryTitle: data.question,
    opening: '',
    summary: '',
    advice: '',
    cards: options.map((opt) => ({ message: opt })),
  }
  if (containsDisallowed(guardShape)) {
    throw providerError('clarify_disallowed')
  }
  return { question: data.question.trim(), options }
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

function withProviderMeta(data, provider, model, freeAiGift = false) {
  return json({
    ...data,
    meta: {
      provider,
      model,
      freeAiGift,
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

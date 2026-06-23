// supabase/functions/generate-horoscopes/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";

const SIGNS = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
] as const;

const THEMES = ["love", "career", "energy"] as const;

type Sign = typeof SIGNS[number];
type Theme = typeof THEMES[number];

function normalizeTheme(value: unknown): Theme | null {
  const key = String(value ?? "").trim().toLowerCase();
  if (!key) return null;
  if (key === "self" || key === "energy") return "energy";
  if (key === "career" || key === "work") return "career";
  if (key === "love") return "love";
  return null;
}

function isoTodayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/* ------------------------------ prompt rules ------------------------------ */

const SIGN_ARCHETYPES: Record<string, string> = {
  aries:       "Fire · Cardinal · Bold, impulsive, self-starting. Needs to act first, reflect later. Driven by will and independence.",
  taurus:      "Earth · Fixed · Patient, sensory, stubborn. Seeks stability and comfort. Values loyalty and slow-built trust.",
  gemini:      "Air · Mutable · Curious, verbal, restless. Thrives on variety and connection. Processes the world through conversation.",
  cancer:      "Water · Cardinal · Intuitive, protective, moody. Deeply feeling and security-oriented. Leads with emotion and memory.",
  leo:         "Fire · Fixed · Expressive, generous, proud. Needs to be seen and appreciated. Leads with warmth and creative force.",
  virgo:       "Earth · Mutable · Analytical, precise, self-critical. Finds meaning in usefulness. Pays attention to what others overlook.",
  libra:       "Air · Cardinal · Diplomatic, relational, indecisive. Seeks harmony and fairness. Thinks in terms of balance and beauty.",
  scorpio:     "Water · Fixed · Intense, perceptive, controlling. Goes deep or not at all. Values truth, loyalty, and transformation.",
  sagittarius: "Fire · Mutable · Optimistic, blunt, freedom-seeking. Thrives on exploration and meaning. Resists being contained.",
  capricorn:   "Earth · Cardinal · Disciplined, strategic, reserved. Builds for the long term. Earns trust through consistency.",
  aquarius:    "Air · Fixed · Independent, unconventional, detached. Thinks in systems and ideals. Values progress over tradition.",
  pisces:      "Water · Mutable · Empathic, imaginative, boundary-less. Absorbs the emotional field around them. Seeks transcendence.",
};

function signArchetypesBlock(): string {
  return Object.entries(SIGN_ARCHETYPES)
    .map(([sign, desc]) => `${sign}: ${desc}`)
    .join("\n");
}

/* ---------------------------- per-sign Moon facts ---------------------------
 * The Moon changes sign every ~2.5 days and is the most legitimate driver of a
 * DAILY horoscope. The astro context gives us the Moon's sign globally; here we
 * derive, for EACH zodiac sign, the real angular relationship between that sign
 * and the current Moon sign (conjunction / sextile / square / trine / quincunx /
 * opposition). This makes each of the 12 outputs astronomically distinct instead
 * of differing only in prose. Phrasing is strictly descriptive ("the Moon is in
 * a fellow earth sign") + gentle reflective framing — never predictive.
 */
const SIGN_ELEMENT: Record<string, string> = {
  aries: "fire", leo: "fire", sagittarius: "fire",
  taurus: "earth", virgo: "earth", capricorn: "earth",
  gemini: "air", libra: "air", aquarius: "air",
  cancer: "water", scorpio: "water", pisces: "water",
};

function moonRelationFor(targetSign: string, moonSign: string | null): string | null {
  if (!moonSign) return null;
  const ti = SIGNS.indexOf(targetSign as Sign);
  const mi = SIGNS.indexOf(moonSign as Sign);
  if (ti < 0 || mi < 0) return null;
  if (ti === mi) {
    return "the Moon is in your own sign today — feelings sit close to the surface; an inward, personal day";
  }
  let dist = Math.abs(ti - mi) % 12;
  if (dist > 6) dist = 12 - dist;
  const el = SIGN_ELEMENT[moonSign] ?? "";
  switch (dist) {
    case 6: return `the Moon is in ${moonSign}, the sign opposite yours — relationships and balance are in focus`;
    case 4: return `the Moon is in ${moonSign}, a fellow ${el} sign — emotionally easy, things tend to flow`;
    case 3: return `the Moon is in ${moonSign}, at a tense angle to your sign — a day to slow down rather than push`;
    case 2: return `the Moon is in ${moonSign}, a friendly sign to yours — light, sociable support`;
    case 5: return `the Moon is in ${moonSign} today, asking for a small adjustment in pace`;
    case 1: return `the Moon is in neighbouring ${moonSign} today`;
    default: return `the Moon is in ${moonSign} today`;
  }
}

/* ---------------------------- per-sign ruler transit ------------------------
 * Each sign has a traditional ruling planet. We already know each planet's sign
 * and retrograde state, so for the signs ruled by Mercury/Venus/Mars/Jupiter/
 * Saturn we can state a real, sign-specific fact ("your ruler Venus is in
 * Cancer"). Cancer (Moon) and Leo (Sun) are intentionally omitted: their rulers
 * are already covered by the Moon relation (T2) and the global Sun sign, so a
 * ruler line there would be redundant. Strictly descriptive — never predictive.
 */
const SIGN_RULER: Record<string, string> = {
  aries: "mars", scorpio: "mars",
  taurus: "venus", libra: "venus",
  gemini: "mercury", virgo: "mercury",
  sagittarius: "jupiter", pisces: "jupiter",
  capricorn: "saturn", aquarius: "saturn",
  // cancer (Moon) and leo (Sun) handled by the Moon relation / Sun sign instead.
};

const RULER_DISPLAY: Record<string, string> = {
  mercury: "Mercury", venus: "Venus", mars: "Mars", jupiter: "Jupiter", saturn: "Saturn",
};

function rulerTransitFor(targetSign: string, planets: any): string | null {
  const ruler = SIGN_RULER[targetSign];
  if (!ruler || !planets) return null;
  const state = planets[ruler];
  if (!state?.sign) return null;
  const retro = state.retrograde === true ? ", currently retrograde" : "";
  return `your ruling planet ${RULER_DISPLAY[ruler]} is in ${state.sign}${retro}`;
}

function rulesEn() {
  return `
You write daily horoscopes. Tone: modern, calm, friendly, grounded.

SIGN ARCHETYPES (use these to shape each horoscope — weave naturally, do not list traits explicitly):
${signArchetypesBlock()}

SAFETY:
- No medical advice/diagnosis/treatment.
- No financial instructions like "buy/invest/sell".
- No fatalistic claims ("this will definitely happen").

REALISM (STRICT):
- If astroContext is NOT provided: do NOT mention retrogrades, eclipses, aspects, planet positions, or specific astro dates.
- If astroContext is provided: you may mention ONLY 1–2 facts that are explicitly present in "Allowed facts".
- If mercuryRetrograde / venusRetrograde / marsRetrograde = false (or null): do NOT mention that planet's retrograde at all.
- If eclipse = null: do NOT mention eclipses at all.
- If aspects is empty: do NOT mention aspects at all.
- PER-SIGN FACTS: if "moonRelation" and/or "rulerTransit" is provided for the sign you are writing, you SHOULD weave ONE of them into that sign's text naturally (it counts as one allowed fact). Describe the fact, never predict from it.
- Do NOT invent anything beyond Allowed facts.

STYLE:
- Avoid clichés. Vary sentence openings (do not start everything with "Today").
- Each sign must sound distinct — shaped by its archetype (element, modality, core traits).
- Add 1 concrete everyday situation (message, meeting, choice, routine) that fits the sign's nature.
- Add 1 micro-action (<= 10 words) in detailed that feels natural for this sign.

LENGTH:
- summary: 1–2 sentences (<= ~180 chars).
- detailed: 4–6 sentences (<= ~600 chars).

Return JSON only (no markdown).
`.trim();
}

function rulesTranslateUk() {
  return `
Ти професійний перекладач (англійська -> українська).

ПРАВИЛА (СТРОГО):
- ЛИШЕ переклад. Не додавай, не прибирай і не змінюй зміст.
- Збережи ту саму конкретну життєву ситуацію та мікро-дію (тільки переклади).
- Збережи приблизно ту саму кількість речень і тон (спокійний, сучасний, дружній).
- Не додавай астрологічних фактів, яких нема в тексті.
- НЕ використовуй переноси рядка: summary і detailed мають бути в один рядок (без реальних \\n).
- Обмеження довжини:
  - summary: 1–2 речення (до ~180 символів)
  - detailed: 4–6 речень (до ~600 символів)

Поверни ТІЛЬКИ JSON (без markdown).
`.trim();
}

/* ------------------------------ utils ------------------------------ */

function normalizeJson(v: any) {
  if (!v) return null;
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  }
  return v;
}

function getOutputText(data: any): string {
  if (typeof data?.output_text === "string" && data.output_text) return data.output_text;
  return (data?.output ?? [])
    .flatMap((o: any) => o?.content ?? [])
    .filter((c: any) => c?.type === "output_text" && typeof c?.text === "string")
    .map((c: any) => c.text)
    .join("");
}

/**
 * Fixes occasional invalid JSON from the model:
 * - removes CR/LF outside strings
 * - escapes real CR/LF inside strings as \\r/\\n
 */
function sanitizeJsonText(raw: string): string {
  let out = "";
  let inStr = false;
  let esc = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];

    if (!inStr) {
      if (ch === "\n" || ch === "\r") continue;
      if (ch === '"') inStr = true;
      out += ch;
      continue;
    }

    if (esc) {
      out += ch;
      esc = false;
      continue;
    }

    if (ch === "\\") {
      out += ch;
      esc = true;
      continue;
    }

    if (ch === '"') {
      inStr = false;
      out += ch;
      continue;
    }

    if (ch === "\n") {
      out += "\\n";
      continue;
    }
    if (ch === "\r") {
      out += "\\r";
      continue;
    }

    out += ch;
  }

  return out;
}

/**
 * COMPACT whitelist for the model:
 * - NO notables
 * - NO orbDeg (avoid pseudo-precision)
 * - aspects included only if orbDeg <= 3 (strong aspect) OR if orbDeg missing
 */
function compactContext(full: any) {
  if (!full) return null;

  const ctxVersion = full?.context_version ?? full?.version ?? "v1";

  const rawAspects = Array.isArray(full?.aspects) ? full.aspects : [];
  const aspects = rawAspects
    .filter((a: any) => {
      if (typeof a?.orbDeg === "number") return a.orbDeg <= 3;
      return true;
    })
    .slice(0, 2)
    .map((a: any) => ({
      a: a?.a ?? null,
      b: a?.b ?? null,
      type: a?.type ?? null,
    }))
    .filter((a: any) => a.a && a.b && a.type);

  const keywords = Array.isArray(full?.keywords) ? full.keywords.slice(0, 5) : [];

  return {
    context_version: ctxVersion,
    date: full?.date ?? null,
    sun: { sign: full?.sun?.sign ?? null },
    moon: {
      sign: full?.moon?.sign ?? null,
      phase: full?.moon?.phase ?? null,
    },
    // build-astro-context stores retrograde nested per planet (full.mercury.retrograde).
    // The old flat read (full.mercuryRetrograde) never matched, so retrograde was
    // silently dropped from every horoscope. Read nested first, keep flat as fallback.
    mercuryRetrograde:
      typeof full?.mercury?.retrograde === "boolean"
        ? full.mercury.retrograde
        : (typeof full?.mercuryRetrograde === "boolean" ? full.mercuryRetrograde : null),
    venusRetrograde: typeof full?.venus?.retrograde === "boolean" ? full.venus.retrograde : null,
    marsRetrograde: typeof full?.mars?.retrograde === "boolean" ? full.mars.retrograde : null,
    // Planet signs + retrograde, used to derive each sign's ruling-planet transit (T4).
    planets: {
      mercury: { sign: full?.mercury?.sign ?? null, retrograde: full?.mercury?.retrograde ?? null },
      venus:   { sign: full?.venus?.sign ?? null,   retrograde: full?.venus?.retrograde ?? null },
      mars:    { sign: full?.mars?.sign ?? null,    retrograde: full?.mars?.retrograde ?? null },
      jupiter: { sign: full?.jupiter?.sign ?? null, retrograde: full?.jupiter?.retrograde ?? null },
      saturn:  { sign: full?.saturn?.sign ?? null,  retrograde: full?.saturn?.retrograde ?? null },
    },
    eclipse: full?.eclipse
      ? {
          type: full.eclipse.type ?? null,
          kind: full.eclipse.kind ?? null,
          date: full.eclipse.date ?? null,
          proximityDays: full.eclipse.proximityDays ?? null,
        }
      : null,
    aspects,
    keywords,
  };
}

async function loadAstroContextFull(supabase: any, dateISO: string) {
  try {
    const { data, error } = await supabase.from("astro_context").select("context").eq("date", dateISO).maybeSingle();
    if (error) return null;
    return normalizeJson(data?.context);
  } catch {
    return null;
  }
}

/* ------------------------------ OpenAI calls ------------------------------ */

type HoroscopeItem = { sign: Sign; theme: Theme; summary: string; detailed: string };

function makeHoroSchema(count: number) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["items"],
    properties: {
      items: {
        type: "array",
        minItems: count,
        maxItems: count,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["sign", "theme", "summary", "detailed"],
          properties: {
            sign: { type: "string", enum: [...SIGNS] },
            theme: { type: "string", enum: [...THEMES] },
            summary: { type: "string" },
            detailed: { type: "string" },
          },
        },
      },
    },
  } as const;
}

function validateItems(items: any, label: string, expectedCount: number): HoroscopeItem[] {
  if (!Array.isArray(items) || items.length !== expectedCount) {
    throw new Error(`${label}: expected ${expectedCount} items, got ${items?.length}`);
  }
  const keySet = new Set(items.map((x: any) => `${x.sign}:${x.theme}`));
  if (keySet.size !== expectedCount) throw new Error(`${label}: duplicate sign/theme pairs`);
  return items as HoroscopeItem[];
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function serializeError(error: any) {
  if (!error) return null;
  return {
    message: String(error.message ?? ""),
    details: error.details ?? null,
    hint: error.hint ?? null,
    code: error.code ?? null,
  };
}

async function callOpenAIJsonSchema(params: {
  model: string;
  system: string;
  user: string;
  schemaName: string;
  schema: any;
  temperature: number;
  maxTokens: number;
}) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
  const timeoutMs = Math.max(15000, Number(Deno.env.get("OPENAI_TIMEOUT_MS") ?? 90000));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(`OpenAI timeout after ${timeoutMs}ms`), timeoutMs);

  console.log(`[generate-horoscopes] OpenAI start: ${params.schemaName}, model=${params.model}`);

  let resp: Response;
  try {
    resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: params.model,
        store: false,
        input: [
          { role: "system", content: params.system },
          { role: "user", content: params.user },
        ],
        text: {
          format: { type: "json_schema", name: params.schemaName, strict: true, schema: params.schema },
        },
        temperature: params.temperature,
        max_output_tokens: params.maxTokens,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    throw new Error(`OpenAI fetch failed (${params.schemaName}): ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timeout);
  }

  console.log(`[generate-horoscopes] OpenAI done: ${params.schemaName}, status=${resp.status}`);

  if (!resp.ok) {
    const err = await resp.text().catch(() => "");
    console.error(`[generate-horoscopes] OpenAI error ${resp.status}:`, err);
    throw new Error(`OpenAI error ${resp.status}`);
  }

  const data = await resp.json();
  const outTextRaw = getOutputText(data);
  if (!outTextRaw) throw new Error("OpenAI: empty output_text");

  const outText = sanitizeJsonText(outTextRaw);

  let parsed: any;
  try {
    parsed = JSON.parse(outText);
  } catch (e) {
    throw new Error(`JSON.parse failed: ${String(e)} | tail=${outText.slice(-220)}`);
  }

  return parsed;
}

/**
 * OpenRouter fallback for the same JSON-shaped calls. OpenRouter's
 * /chat/completions uses response_format: json_object (no strict schema), so the
 * required shape is described in the system prompt and parsed defensively.
 */
async function callOpenRouterJson(params: {
  model: string;
  system: string;
  user: string;
  schemaName: string;
  schema: any;
  temperature: number;
  maxTokens: number;
}) {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");
  const model = Deno.env.get("OPENROUTER_MODEL") ?? "openai/gpt-4o-mini";
  const url = Deno.env.get("OPENROUTER_URL") ?? "https://openrouter.ai/api/v1/chat/completions";
  const count = params.schema?.properties?.items?.minItems ?? null;
  const shapeHint = `Return ONLY a JSON object of the form {"items":[{"sign":string,"theme":string,"summary":string,"detailed":string}]}${count ? ` with EXACTLY ${count} items` : ""}. No markdown, no commentary.`;

  const timeoutMs = Math.max(15000, Number(Deno.env.get("OPENAI_TIMEOUT_MS") ?? 90000));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(`OpenRouter timeout after ${timeoutMs}ms`), timeoutMs);

  console.log(`[generate-horoscopes] OpenRouter start: ${params.schemaName}, model=${model}`);

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": Deno.env.get("OPENROUTER_HTTP_REFERER") ?? "https://arcana-insight.app",
        "X-Title": Deno.env.get("OPENROUTER_X_TITLE") ?? "Arcana Insight",
      },
      body: JSON.stringify({
        model,
        temperature: params.temperature,
        max_tokens: params.maxTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `${params.system}\n\n${shapeHint}` },
          { role: "user", content: params.user },
        ],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    throw new Error(`OpenRouter fetch failed (${params.schemaName}): ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timeout);
  }

  console.log(`[generate-horoscopes] OpenRouter done: ${params.schemaName}, status=${resp.status}`);

  if (!resp.ok) {
    const err = await resp.text().catch(() => "");
    console.error(`[generate-horoscopes] OpenRouter error ${resp.status}:`, err);
    throw new Error(`OpenRouter error ${resp.status}`);
  }

  const data = await resp.json();
  const rawContent = data?.choices?.[0]?.message?.content;
  const outTextRaw = typeof rawContent === "string"
    ? rawContent
    : Array.isArray(rawContent)
      ? rawContent.map((c: any) => String(c?.text ?? c?.content ?? "")).join("")
      : "";
  if (!outTextRaw) throw new Error("OpenRouter: empty content");

  const outText = sanitizeJsonText(outTextRaw);
  try {
    return JSON.parse(outText);
  } catch (_e) {
    const start = outText.indexOf("{");
    const end = outText.lastIndexOf("}");
    if (start === -1 || end <= start) {
      throw new Error(`OpenRouter JSON.parse failed (${params.schemaName}) | tail=${outText.slice(-220)}`);
    }
    return JSON.parse(outText.slice(start, end + 1));
  }
}

/**
 * Provider fallback: try OpenAI first, then OpenRouter. Throws AI_UNAVAILABLE
 * (carrying both provider reasons) only if every provider fails. Used for both
 * generation and translation so an OpenAI outage no longer drops the daily run.
 */
async function callModelJson(params: {
  model: string;
  system: string;
  user: string;
  schemaName: string;
  schema: any;
  temperature: number;
  maxTokens: number;
}) {
  const providerErrors: string[] = [];

  if (Deno.env.get("OPENAI_API_KEY")) {
    try {
      return await callOpenAIJsonSchema(params);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      providerErrors.push(`openai: ${msg}`);
      console.error(`[generate-horoscopes] openai failed (${params.schemaName}):`, msg);
    }
  } else {
    providerErrors.push("openai: missing_openai_api_key");
  }

  if (Deno.env.get("OPENROUTER_API_KEY")) {
    try {
      return await callOpenRouterJson(params);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      providerErrors.push(`openrouter: ${msg}`);
      console.error(`[generate-horoscopes] openrouter failed (${params.schemaName}):`, msg);
    }
  } else {
    providerErrors.push("openrouter: missing_openrouter_api_key");
  }

  throw new Error(`AI_UNAVAILABLE (${params.schemaName}): ${providerErrors.join(" | ")}`);
}

/**
 * Server-side safety backstop, calibrated for DAILY HOROSCOPES (longer and more
 * conversational than tarot, which uses a stricter guard). It only catches
 * genuinely unsafe copy — hard fatalism, medical, and financial instructions —
 * NOT every "will"/"should", to avoid dropping legitimate horoscope text. The
 * prompt remains the primary defense; this is the last line. EN + UK.
 */
function containsDisallowed(text: string): boolean {
  const t = String(text || "").toLowerCase();
  const patterns = [
    // hard fatalism / determinism
    /\bwill (definitely|certainly|surely|undoubtedly)\b/,
    /\b(is|are) (destined|guaranteed|fated|predetermined)\b/,
    /\b(inevitably|unavoidably)\b/,
    /\b(неминуче|обов'?язково станеться|точно станеться|гарантовано|судилося|приречен)\w*/,
    // medical
    /\b(diagnos|disease|symptom|medication|prescrib|illness)\w*/,
    /\b(see|consult|visit)\s+(a\s+)?doctor\b/,
    /\b(лікар|діагноз|хвороб|ліки|симптом|лікуванн|медичн)\w*/,
    // financial instructions
    /\b(buy|sell|invest\s+in|invest\s+your)\s+(stock|shares|crypto|bitcoin)\b/,
    /\binvest(ment)?\s+(advice|in\b)/,
    /\b(інвестуй|купуй\s+акці|продавай\s+акці|вклади\s+гроші|кредит)\w*/,
  ];
  return patterns.some((re) => re.test(t));
}

async function generateTheme12En(params: {
  date: string;
  theme: Theme;
  astroCompact: any | null;
}): Promise<HoroscopeItem[]> {
  const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";

  const astroLine = params.astroCompact
    ? `Allowed facts (ONLY these are allowed to mention, max 1–2 facts): ${JSON.stringify(params.astroCompact)}`
    : `astroContext: NOT PROVIDED. Allowed facts: null.`;

  // Per-sign grounded facts: Moon-relationship (T2) + ruling-planet transit (T4).
  // Each is a real, sign-specific astronomical fact the model may weave in.
  const moonSign: string | null = params.astroCompact?.moon?.sign ?? null;
  const planets = params.astroCompact?.planets ?? null;
  const perSignFacts = SIGNS.reduce((acc, sign) => {
    const facts: Record<string, string> = {};
    const moonRel = moonRelationFor(sign, moonSign);
    if (moonRel) facts.moonRelation = moonRel;
    const rulerRel = rulerTransitFor(sign, planets);
    if (rulerRel) facts.rulerTransit = rulerRel;
    if (Object.keys(facts).length) acc[sign] = facts;
    return acc;
  }, {} as Record<string, Record<string, string>>);
  const perSignMoonLine = Object.keys(perSignFacts).length
    ? `Per-sign facts (for the sign you are writing, weave in ONE of its grounded facts — moonRelation and/or rulerTransit — naturally, counting toward your allowed facts): ${JSON.stringify(perSignFacts)}`
    : "";

  const user = `
Date (UTC): ${params.date}
Language: en
Theme: ${params.theme}

Themes (definitions — stay within these boundaries):
- love: romantic relationships, emotional connections, intimacy, attraction, communication with a partner or potential partner
- career: work, ambition, productivity, professional decisions, colleagues, goals
- energy: inner state, emotional rhythm, intuition, mental clarity, connection to self — NOT physical health, NOT romantic or career advice

${astroLine}
${perSignMoonLine}

Generate EXACTLY 12 items: one for each zodiac sign, all with theme "${params.theme}".
Return valid JSON strictly matching the schema.
`.trim();

  const parsed = await callModelJson({
    model,
    system: rulesEn(),
    user,
    schemaName: `horoscopes_day_en_${params.theme}`,
    schema: makeHoroSchema(12),
    temperature: 0.85,
    maxTokens: 1800,
  });

  const items = validateItems(parsed?.items, `OpenAI generate EN ${params.theme}`, 12);
  for (const item of items) {
    if (item.theme !== params.theme) {
      throw new Error(`OpenAI generate EN ${params.theme}: returned wrong theme "${item.theme}"`);
    }
  }
  return items;
}

async function generateDay36En(params: { date: string; astroCompact: any | null }): Promise<HoroscopeItem[]> {
  const out: HoroscopeItem[] = [];
  for (const theme of THEMES) {
    console.log(`[generate-horoscopes] Generating EN theme=${theme} date=${params.date}`);
    const items = await generateTheme12En({ date: params.date, theme, astroCompact: params.astroCompact });
    out.push(...items);
  }
  return validateItems(out, "OpenAI generate EN all themes", 36);
}

async function translateChunkEnToUk(params: { date: string; itemsEn: HoroscopeItem[] }): Promise<HoroscopeItem[]> {
  const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";

  const user = `
Date (UTC): ${params.date}

Переклади наступні елементи гороскопу з англійської на українську.
СТРОГО: поверни валідний JSON, без переносів рядків у значеннях.

Вхідний JSON:
${JSON.stringify({ items: params.itemsEn })}
`.trim();

  const parsed = await callModelJson({
    model,
    system: rulesTranslateUk(),
    user,
    schemaName: "horoscopes_translate_uk",
    schema: makeHoroSchema(params.itemsEn.length),
    temperature: 0,
    maxTokens: 2000,
  });

  const itemsUk = parsed?.items;
  if (!Array.isArray(itemsUk) || itemsUk.length !== params.itemsEn.length) {
    throw new Error(`Translate: expected ${params.itemsEn.length} items, got ${itemsUk?.length}`);
  }

  // key sanity
  const enKeys = new Set(params.itemsEn.map((x) => `${x.sign}:${x.theme}`));
  const ukKeys = new Set(itemsUk.map((x: any) => `${x.sign}:${x.theme}`));
  for (const k of enKeys) if (!ukKeys.has(k)) throw new Error(`Translate: missing key ${k}`);

  // also sanitize each string field (extra safety)
  return itemsUk.map((x: any) => ({
    sign: x.sign,
    theme: x.theme,
    summary: String(x.summary ?? "").replace(/\s+/g, " ").trim(),
    detailed: String(x.detailed ?? "").replace(/\s+/g, " ").trim(),
  })) as HoroscopeItem[];
}

async function translateChunkEnToUkWithRetry(
  params: { date: string; itemsEn: HoroscopeItem[] },
  depth = 0,
): Promise<HoroscopeItem[]> {
  try {
    return await translateChunkEnToUk(params);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const shouldSplit =
      params.itemsEn.length > 1 &&
      (
        message.includes("JSON.parse failed") ||
        message.includes("OpenAI fetch failed") ||
        message.includes("OpenAI timeout") ||
        /OpenAI error:\s*5\d\d/.test(message)
      );

    if (!shouldSplit) throw error;

    const mid = Math.ceil(params.itemsEn.length / 2);
    const left = params.itemsEn.slice(0, mid);
    const right = params.itemsEn.slice(mid);

    console.warn(
      `[generate-horoscopes] Retrying translate chunk by splitting size=${params.itemsEn.length} -> ${left.length}+${right.length}, depth=${depth}, reason=${message.slice(0, 180)}`,
    );

    const leftPart = await translateChunkEnToUkWithRetry({ date: params.date, itemsEn: left }, depth + 1);
    const rightPart = await translateChunkEnToUkWithRetry({ date: params.date, itemsEn: right }, depth + 1);
    return [...leftPart, ...rightPart];
  }
}

async function translateDay36EnToUk(params: { date: string; itemsEn: HoroscopeItem[] }): Promise<HoroscopeItem[]> {
  // Smaller chunks reduce truncation risk during strict JSON translation.
  const chunks = chunkArray(params.itemsEn, 6);

  const itemsUk: HoroscopeItem[] = [];
  for (const [index, chunk] of chunks.entries()) {
    console.log(`[generate-horoscopes] Translating UK chunk ${index + 1}/${chunks.length} date=${params.date}`);
    const part = await translateChunkEnToUkWithRetry({ date: params.date, itemsEn: chunk });
    itemsUk.push(...part);
  }

  if (itemsUk.length !== params.itemsEn.length) {
    throw new Error(`Translate: expected ${params.itemsEn.length} items, got ${itemsUk.length}`);
  }

  const keySet = new Set(itemsUk.map((x) => `${x.sign}:${x.theme}`));
  if (keySet.size !== params.itemsEn.length) throw new Error("Translate: duplicate sign/theme pairs");

  return itemsUk;
}

/* ------------------------------ handler ------------------------------ */

Deno.serve(async (req) => {
  try {
    // auth (cron secret)
    const required = Deno.env.get("CRON_SECRET") ?? "";
    const provided = req.headers.get("x-cron-secret") ?? "";
    if (!required || provided !== required) return new Response("Unauthorized", { status: 401 });

    // supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    // payload
    const body = await req.json().catch(() => ({} as any));
    const date =
      body?.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? String(body.date) : addDaysISO(isoTodayUTC(), 1);

    const force = body?.force === true;
    const requestedTheme: Theme | null = normalizeTheme(body?.theme);
    const themesToGenerate: Theme[] = requestedTheme ? [requestedTheme] : [...THEMES];
    const expectedPerLocale = themesToGenerate.length * SIGNS.length;

    // We always generate BOTH locales: en + uk. Theme-specific runs skip the count check:
    // upsert is idempotent and this avoids fragile filtered count queries in production.
    if (!force && !requestedTheme) {
      const makeCountQuery = (locale: "en" | "uk") => {
        return supabase
          .from("horoscopes")
          .select("*", { count: "exact", head: true })
          .eq("date", date)
          .eq("locale", locale);
      };

      const [enCountRes, ukCountRes] = await Promise.all([makeCountQuery("en"), makeCountQuery("uk")]);

      if (enCountRes.error || ukCountRes.error) {
        return new Response(
          JSON.stringify({ ok: false, step: "count", date, error: serializeError(enCountRes.error ?? ukCountRes.error) }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }

      if ((enCountRes.count ?? 0) >= expectedPerLocale && (ukCountRes.count ?? 0) >= expectedPerLocale) {
        return new Response(
          JSON.stringify({
            ok: true,
            skipped: true,
            date,
            theme: requestedTheme,
            enCount: enCountRes.count,
            ukCount: ukCountRes.count,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    }

    // load astro context
    let astroFull = await loadAstroContextFull(supabase, date);

    // B6 guard: generate-horoscopes depends on build-astro-context having run first
    // for this date. If the astro context is missing (cron order race / build
    // failure), the whole day would silently generate WITHOUT any astronomical
    // grounding (the "NOT PROVIDED" branch). Before accepting that, make ONE
    // best-effort attempt to build the context inline, then reload. Never throw —
    // if it still fails we proceed ungrounded but log loudly so it's visible.
    if (!astroFull) {
      console.error(
        `[generate-horoscopes] astro_context MISSING for ${date} — attempting inline build-astro-context before generating ungrounded`,
      );
      try {
        const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
        const res = await fetch(`${supabaseUrl}/functions/v1/build-astro-context`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
            "x-cron-secret": cronSecret,
          },
          body: JSON.stringify({ date, days: 1 }),
        });
        if (!res.ok) {
          console.error(`[generate-horoscopes] inline build-astro-context failed (${res.status}) for ${date}`);
        } else {
          astroFull = await loadAstroContextFull(supabase, date);
        }
      } catch (err) {
        console.error(`[generate-horoscopes] inline build-astro-context threw for ${date}:`, serializeError(err));
      }
      if (!astroFull) {
        console.error(
          `[generate-horoscopes] PROCEEDING WITHOUT astro grounding for ${date} — horoscopes will be generic this run`,
        );
      }
    }

    const astroCompact = compactContext(astroFull);

    // generate EN (canonical)
    const itemsEn = requestedTheme
      ? await generateTheme12En({ date, theme: requestedTheme, astroCompact })
      : await generateDay36En({ date, astroCompact });

    // translate EN -> UK (robust: chunked + sanitized)
    const itemsUk = await translateDay36EnToUk({ date, itemsEn });

    const rows = [
      ...itemsEn.map((x) => ({
        date,
        sign: x.sign,
        theme: x.theme,
        locale: "en",
        summary: String(x.summary ?? "").trim(),
        detailed: String(x.detailed ?? "").trim(),
        context: astroFull,
        context_date: astroFull?.date ?? date,
        context_compact: astroCompact,
      })),
      ...itemsUk.map((x) => ({
        date,
        sign: x.sign,
        theme: x.theme,
        locale: "uk",
        summary: String(x.summary ?? "").trim(),
        detailed: String(x.detailed ?? "").trim(),
        context: astroFull,
        context_date: astroFull?.date ?? date,
        context_compact: astroCompact,
      })),
    ];

    // Safety backstop: drop any sign/theme whose EN or UK copy trips the content
    // guard, so unsafe AI text never reaches users. Dropped items self-heal on
    // the next cron run (the count-check below stays unmet and re-generates).
    const disallowedKeys = new Set<string>();
    for (const r of rows) {
      if (containsDisallowed(`${r.summary} ${r.detailed}`)) {
        disallowedKeys.add(`${r.sign}:${r.theme}`);
      }
    }
    if (disallowedKeys.size > 0) {
      console.error(
        `[generate-horoscopes] dropping ${disallowedKeys.size} disallowed sign/theme pair(s) for ${date}:`,
        [...disallowedKeys].join(", "),
      );
    }
    const safeRows = rows.filter((r) => !disallowedKeys.has(`${r.sign}:${r.theme}`));

    if (safeRows.length === 0) {
      console.error(`[generate-horoscopes] all items failed the content guard for ${date}; nothing written`);
      return new Response(
        JSON.stringify({ ok: false, step: "content_guard", date, dropped: [...disallowedKeys] }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    const { error: upsertErr } = await supabase.from("horoscopes").upsert(safeRows, {
      onConflict: "date,sign,theme,locale",
    });

    if (upsertErr) {
      return new Response(JSON.stringify({ ok: false, step: "upsert", date, error: serializeError(upsertErr) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        inserted: safeRows.length,
        dropped: [...disallowedKeys],
        date,
        theme: requestedTheme,
        locales: ["en", "uk"],
        hasAstro: !!astroFull,
        compactAspectsCount: Array.isArray(astroCompact?.aspects) ? astroCompact.aspects.length : 0,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("generate-horoscopes failed:", e?.stack ?? e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

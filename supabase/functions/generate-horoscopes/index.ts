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

const THEMES = ["love", "career", "spirit"] as const;

type Sign = typeof SIGNS[number];
type Theme = typeof THEMES[number];

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
- If mercuryRetrograde = false: do NOT mention retrograde at all.
- If eclipse = null: do NOT mention eclipses at all.
- If aspects is empty: do NOT mention aspects at all.
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
    mercuryRetrograde: typeof full?.mercuryRetrograde === "boolean" ? full.mercuryRetrograde : null,
    eclipse: full?.eclipse
      ? {
          type: full.eclipse.type ?? null,
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
    throw new Error(`OpenAI error: ${resp.status} ${err}`);
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

async function generateTheme12En(params: {
  date: string;
  theme: Theme;
  astroCompact: any | null;
}): Promise<HoroscopeItem[]> {
  const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";

  const astroLine = params.astroCompact
    ? `Allowed facts (ONLY these are allowed to mention, max 1–2 facts): ${JSON.stringify(params.astroCompact)}`
    : `astroContext: NOT PROVIDED. Allowed facts: null.`;

  const user = `
Date (UTC): ${params.date}
Language: en
Theme: ${params.theme}

Themes (definitions — stay within these boundaries):
- love: romantic relationships, emotional connections, intimacy, attraction, communication with a partner or potential partner
- career: work, ambition, productivity, professional decisions, colleagues, goals
- spirit: inner state, intuition, spiritual clarity, connection to self, inner voice, sense of meaning — NOT physical health, NOT energy levels

${astroLine}

Generate EXACTLY 12 items: one for each zodiac sign, all with theme "${params.theme}".
Return valid JSON strictly matching the schema.
`.trim();

  const parsed = await callOpenAIJsonSchema({
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

  const parsed = await callOpenAIJsonSchema({
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

async function translateDay36EnToUk(params: { date: string; itemsEn: HoroscopeItem[] }): Promise<HoroscopeItem[]> {
  // Smaller chunks reduce edge runtime spikes and OpenAI latency.
  const chunks = [
    params.itemsEn.slice(0, 12),
    params.itemsEn.slice(12, 24),
    params.itemsEn.slice(24, 36),
  ];

  const itemsUk: HoroscopeItem[] = [];
  for (const [index, chunk] of chunks.entries()) {
    console.log(`[generate-horoscopes] Translating UK chunk ${index + 1}/${chunks.length} date=${params.date}`);
    const part = await translateChunkEnToUk({ date: params.date, itemsEn: chunk });
    itemsUk.push(...part);
  }

  if (itemsUk.length !== 36) throw new Error(`Translate: expected 36 items, got ${itemsUk.length}`);

  const keySet = new Set(itemsUk.map((x) => `${x.sign}:${x.theme}`));
  if (keySet.size !== 36) throw new Error("Translate: duplicate sign/theme pairs");

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

    // We always generate BOTH locales: en + uk
    if (!force) {
      const [enCountRes, ukCountRes] = await Promise.all([
        supabase.from("horoscopes").select("*", { count: "exact", head: true }).eq("date", date).eq("locale", "en"),
        supabase.from("horoscopes").select("*", { count: "exact", head: true }).eq("date", date).eq("locale", "uk"),
      ]);

      if (enCountRes.error || ukCountRes.error) {
        return new Response(
          JSON.stringify({ ok: false, step: "count", date, error: enCountRes.error ?? ukCountRes.error }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }

      if ((enCountRes.count ?? 0) >= 36 && (ukCountRes.count ?? 0) >= 36) {
        return new Response(JSON.stringify({ ok: true, skipped: true, date, enCount: enCountRes.count, ukCount: ukCountRes.count }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // load astro context
    const astroFull = await loadAstroContextFull(supabase, date);
    const astroCompact = compactContext(astroFull);

    // generate EN (canonical)
    const itemsEn = await generateDay36En({ date, astroCompact });

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

    const { error: upsertErr } = await supabase.from("horoscopes").upsert(rows, {
      onConflict: "date,sign,theme,locale",
    });

    if (upsertErr) {
      return new Response(JSON.stringify({ ok: false, step: "upsert", date, error: upsertErr }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        inserted: rows.length, // 72
        date,
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

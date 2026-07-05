// supabase/functions/personal-horoscope/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";
import { isUserPremium, premiumEnforcementEnabled } from "../_shared/premium.ts";
import { consumeAiQuota, refundAiQuota } from "../_shared/aiQuota.ts";
import { notifyError } from "../_shared/notify.ts";

const SIGNS = [
  "aries","taurus","gemini","cancer","leo","virgo",
  "libra","scorpio","sagittarius","capricorn","aquarius","pisces",
] as const;
type Sign = typeof SIGNS[number];

const SIGN_ARCHETYPES: Record<string, string> = {
  aries:       "Fire · Cardinal · Bold, impulsive, self-starting. Acts first, reflects later. Driven by will and independence.",
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

const MOON_SIGN_LAYER: Record<string, string> = {
  aries:       "Emotionally impulsive, needs quick outlets for feelings, recharges through action.",
  taurus:      "Emotionally steady, craves security and comfort, resists sudden change.",
  gemini:      "Emotionally restless, processes feelings through talking, needs mental stimulation.",
  cancer:      "Deeply emotional, highly intuitive, retreats when overwhelmed.",
  leo:         "Needs emotional recognition, generous with loved ones, pride is a sensitive point.",
  virgo:       "Processes emotions analytically, worries quietly, finds comfort in routine.",
  libra:       "Needs harmony in relationships, avoids conflict, emotionally unsettled by imbalance.",
  scorpio:     "Intense emotional depth, slow to trust, remembers everything.",
  sagittarius: "Emotionally free-spirited, dislikes heavy feelings, lightens mood with humor.",
  capricorn:   "Emotionally reserved, shows care through actions, work is an emotional anchor.",
  aquarius:    "Emotionally detached, needs independence, loyal to ideals over people.",
  pisces:      "Highly empathic, absorbs others' moods, needs solitude to restore.",
};

function isoTodayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function normalizeJson(v: any) {
  if (!v) return null;
  if (typeof v === "string") { try { return JSON.parse(v); } catch { return null; } }
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

function sanitizeJsonText(raw: string): string {
  let out = ""; let inStr = false; let esc = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (!inStr) {
      if (ch === "\n" || ch === "\r") continue;
      if (ch === '"') inStr = true;
      out += ch; continue;
    }
    if (esc) { out += ch; esc = false; continue; }
    if (ch === "\\") { out += ch; esc = true; continue; }
    if (ch === '"') { inStr = false; out += ch; continue; }
    if (ch === "\n") { out += "\\n"; continue; }
    if (ch === "\r") { out += "\\r"; continue; }
    out += ch;
  }
  return out;
}

function compactAstroContext(full: any) {
  if (!full) return null;
  const rawAspects = Array.isArray(full?.aspects) ? full.aspects : [];
  const aspects = rawAspects
    .filter((a: any) => typeof a?.orbDeg !== "number" || a.orbDeg <= 4)
    .slice(0, 3)
    .map((a: any) => ({ a: a?.a, b: a?.b, type: a?.type }))
    .filter((a: any) => a.a && a.b && a.type);
  return {
    date: full?.date ?? null,
    sun: { sign: full?.sun?.sign ?? null },
    moon: { sign: full?.moon?.sign ?? null, phase: full?.moon?.phase ?? null },
    mercuryRetrograde: full?.mercury?.retrograde ?? full?.mercuryRetrograde ?? null,
    eclipse: full?.eclipse ? { type: full.eclipse.type, kind: full.eclipse.kind ?? null, proximityDays: full.eclipse.proximityDays } : null,
    aspects,
    keywords: Array.isArray(full?.keywords) ? full.keywords.slice(0, 5) : [],
  };
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

const OPENROUTER_MODEL = Deno.env.get("OPENROUTER_MODEL") ?? "openai/gpt-4o-mini";
const OPENROUTER_URL = Deno.env.get("OPENROUTER_URL") ?? "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = Math.max(15000, Number(Deno.env.get("OPENAI_TIMEOUT_MS") ?? 60000));

async function fetchWithTimeout(url: string, opts: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(`timeout after ${ms}ms`), ms);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function parseJsonLoose(text: string): any {
  try {
    return JSON.parse(text);
  } catch (_e) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("json_parse_failed");
    return JSON.parse(text.slice(start, end + 1));
  }
}

/**
 * Server-side safety backstop, calibrated for daily horoscopes (mirrors
 * generate-horoscopes). Catches hard fatalism / medical / financial-instruction
 * patterns only — NOT every "will"/"should" — in EN + UK. The prompt remains the
 * primary defense; this is the last line before content reaches the user.
 */
function containsDisallowed(text: string): boolean {
  const t = String(text || "").toLowerCase();
  const patterns = [
    /\bwill (definitely|certainly|surely|undoubtedly)\b/,
    /\b(is|are) (destined|guaranteed|fated|predetermined)\b/,
    /\b(inevitably|unavoidably)\b/,
    /\b(неминуче|обов'?язково станеться|точно станеться|гарантовано|судилося|приречен)\w*/,
    /\b(diagnos|disease|symptom|medication|prescrib|illness)\w*/,
    /\b(see|consult|visit)\s+(a\s+)?doctor\b/,
    /\b(лікар|діагноз|хвороб|ліки|симптом|лікуванн|медичн)\w*/,
    /\b(buy|sell|invest\s+in|invest\s+your)\s+(stock|shares|crypto|bitcoin)\b/,
    /\binvest(ment)?\s+(advice|in\b)/,
    /\b(інвестуй|купуй\s+акці|продавай\s+акці|вклади\s+гроші|кредит)\w*/,
  ];
  return patterns.some((re) => re.test(t));
}

const PERSONAL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["intro", "love", "career", "energy"],
  properties: {
    intro:   { type: "string" },
    love:    { type: "string" },
    career:  { type: "string" },
    energy:  { type: "string" },
  },
} as const;

type Reading = { intro: string; love: string; career: string; energy: string };

function validateReading(parsed: any): Reading {
  if (!parsed?.intro || !parsed?.love || !parsed?.career || !parsed?.energy) {
    throw new Error("incomplete_ai_payload");
  }
  return {
    intro:  String(parsed.intro).trim(),
    love:   String(parsed.love).trim(),
    career: String(parsed.career).trim(),
    energy: String(parsed.energy).trim(),
  };
}

async function requestReadingOpenAI(system: string, user: string): Promise<Reading> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("missing_openai_api_key");
  const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";
  const resp = await fetchWithTimeout("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      store: false,
      input: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      text: { format: { type: "json_schema", name: "personal_horoscope", strict: true, schema: PERSONAL_SCHEMA } },
      temperature: 0.88,
      max_output_tokens: 1200,
    }),
  }, REQUEST_TIMEOUT_MS);

  if (!resp.ok) {
    const err = await resp.text().catch(() => "");
    console.error(`[personal-horoscope] openai http ${resp.status}: ${err.slice(0, 200)}`);
    throw new Error(`openai_http_${resp.status}`);
  }
  const data = await resp.json();
  const raw = getOutputText(data);
  if (!raw) throw new Error("openai_empty_output");
  return validateReading(parseJsonLoose(sanitizeJsonText(raw)));
}

async function requestReadingOpenRouter(system: string, user: string): Promise<Reading> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) throw new Error("missing_openrouter_api_key");
  const shapeHint = 'Return ONLY a JSON object: {"intro":string,"love":string,"career":string,"energy":string}. No markdown, no commentary.';
  const resp = await fetchWithTimeout(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": Deno.env.get("OPENROUTER_HTTP_REFERER") ?? "https://arcana-insight.app",
      "X-Title": Deno.env.get("OPENROUTER_X_TITLE") ?? "Arcana Insight",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      temperature: 0.88,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${system}\n\n${shapeHint}` },
        { role: "user", content: user },
      ],
    }),
  }, REQUEST_TIMEOUT_MS);

  if (!resp.ok) {
    const err = await resp.text().catch(() => "");
    console.error(`[personal-horoscope] openrouter http ${resp.status}: ${err.slice(0, 200)}`);
    throw new Error(`openrouter_http_${resp.status}`);
  }
  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  const rawText = typeof content === "string"
    ? content
    : Array.isArray(content) ? content.map((c: any) => String(c?.text ?? c?.content ?? "")).join("") : "";
  if (!rawText) throw new Error("openrouter_empty");
  return validateReading(parseJsonLoose(sanitizeJsonText(rawText)));
}

async function generatePersonalReading(params: {
  sign: Sign;
  moonSign: string | null;
  date: string;
  astroCompact: any | null;
  interests: string[];
  locale: string;
}): Promise<Reading> {
  const archetype = SIGN_ARCHETYPES[params.sign] ?? "";
  const moonLayer = params.moonSign ? (MOON_SIGN_LAYER[params.moonSign] ?? "") : "";

  const astroLine = params.astroCompact
    ? `Astro context (ONLY mention facts explicitly listed here, max 1–2 per section): ${JSON.stringify(params.astroCompact)}`
    : "Astro context: not available.";

  const interestLine = params.interests.length
    ? `User's stated interests: ${params.interests.join(", ")}. Lean slightly into these topics where natural.`
    : "";

  const moonLine = params.moonSign && moonLayer
    ? `Moon sign: ${params.moonSign}. Emotional layer: ${moonLayer}. Weave this into the reading naturally.`
    : "";

  const langLine = params.locale === "uk"
    ? "Write entirely in Ukrainian. Tone: modern, calm, personal. No formal/archaic language."
    : "Write in English. Tone: modern, calm, personal, grounded.";

  const system = `
You write deeply personal daily horoscope readings. You are speaking directly to one person.

SIGN: ${params.sign}
Archetype: ${archetype}
${moonLine}

RULES:
- Speak directly to the reader ("you", "your").
- Weave the sign archetype and moon layer naturally — do not list or name them.
- Each section must feel written FOR this specific sign, not generic.
- ${langLine}
- No medical, financial, or fatalistic claims.
- No invented astro facts — only use what is in the provided astro context.
- Avoid clichés. Vary openings. Be specific and grounded.

SECTION DEFINITIONS:
- intro: A personal overview of the day — inner state, overall energy, what this day holds for this sign specifically. (3–4 sentences)
- love: Romantic or emotional connections, intimacy, communication with partner or potential partner. (2–3 sentences)
- career: Work, ambition, productivity, professional decisions. (2–3 sentences)
- energy: Inner state, emotional rhythm, intuition, clarity, and connection to self — NOT physical health, NOT romantic or career advice. (2–3 sentences)

Return JSON only (no markdown).
`.trim();

  const user = `
Date: ${params.date}
${astroLine}
${interestLine}

Generate a personal reading with 4 sections: intro, love, career, energy.
`.trim();

  // Provider fallback: OpenAI -> OpenRouter -> AI_UNAVAILABLE.
  const providerErrors: string[] = [];
  let reading: Reading | null = null;

  if (Deno.env.get("OPENAI_API_KEY")) {
    try {
      reading = await requestReadingOpenAI(system, user);
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      providerErrors.push(`openai: ${m}`);
      console.error("[personal-horoscope] openai failed:", m);
    }
  } else {
    providerErrors.push("openai: missing_openai_api_key");
  }

  if (!reading) {
    if (Deno.env.get("OPENROUTER_API_KEY")) {
      try {
        reading = await requestReadingOpenRouter(system, user);
      } catch (err) {
        const m = err instanceof Error ? err.message : String(err);
        providerErrors.push(`openrouter: ${m}`);
        console.error("[personal-horoscope] openrouter failed:", m);
      }
    } else {
      providerErrors.push("openrouter: missing_openrouter_api_key");
    }
  }

  if (!reading) throw new Error(`AI_UNAVAILABLE: ${providerErrors.join(" | ")}`);

  // Safety backstop — never return unsafe AI copy to the user.
  if (containsDisallowed(`${reading.intro} ${reading.love} ${reading.career} ${reading.energy}`)) {
    console.error("[personal-horoscope] reading tripped content guard; rejecting");
    throw new Error("AI_UNAVAILABLE: content_guard");
  }

  return reading;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  try {
    // --- auth: require valid JWT ---
    const authHeader = req.headers.get("authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return json({ ok: false, error: "unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify JWT and get user
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ ok: false, error: "unauthorized" }, 401);

    // --- load user profile ---
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

    // --- server-side premium gate (personal horoscope is Premium-only) ---
    // Opt-in via RC_ENFORCE_PREMIUM so it can ship before the webhook back-fills
    // existing subscribers (otherwise paying users with no row yet would get 403).
    if (premiumEnforcementEnabled() && !(await isUserPremium(adminClient, user.id))) {
      return json({ ok: false, error: "premium_required" }, 403);
    }

    const { data: profile } = await adminClient
      .from("app_users")
      .select("date_of_birth, zodiac_sign, interests")
      .eq("id", user.id)
      .maybeSingle();

    // --- parse request body ---
    const body = await req.json().catch(() => ({} as any));
    const locale = (body?.locale === "uk") ? "uk" : "en";
    const today = isoTodayUTC();
    const date = body?.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
      ? String(body.date)
      : today;

    // sign: prefer body param, fallback to profile
    const rawSign = String(body?.sign ?? profile?.zodiac_sign ?? "").toLowerCase();
    const sign = SIGNS.includes(rawSign as Sign) ? (rawSign as Sign) : null;
    if (!sign) {
      return json({ ok: false, error: "sign_required", hint: "Pass sign in body or set zodiac_sign in profile" }, 400);
    }

    // moon sign: from body (computed client-side)
    const rawMoon = String(body?.moonSign ?? "").toLowerCase();
    const moonSign = SIGNS.includes(rawMoon as Sign) ? rawMoon : null;

    // interests
    const interests: string[] = Array.isArray(body?.interests)
      ? body.interests.filter((x: any) => typeof x === "string").slice(0, 6)
      : Array.isArray(profile?.interests)
        ? (profile.interests as string[]).slice(0, 6)
        : [];

    // --- load astro context ---
    const { data: astroRow } = await adminClient
      .from("astro_context")
      .select("context")
      .eq("date", date)
      .maybeSingle();

    const astroFull = normalizeJson(astroRow?.context);
    const astroCompact = compactAstroContext(astroFull);

    // --- server-side cache lookup ---
    // The personal reading is deterministic for a given (user, date, sign, moon,
    // locale) tuple, so cache it to avoid a full model call on every open (the
    // most-opened AI surface). `force` (regenerate button) bypasses the read but
    // still refreshes the stored row. Any cache error degrades gracefully to a
    // fresh generation — a missing `personal_horoscopes` table never 500s.
    const force = body?.force === true;
    const moonKey = moonSign ?? "";
    if (!force) {
      try {
        const { data: cached } = await adminClient
          .from("personal_horoscopes")
          .select("reading")
          .eq("user_id", user.id)
          .eq("date", date)
          .eq("sign", sign)
          .eq("moon_sign", moonKey)
          .eq("locale", locale)
          .maybeSingle();
        const cachedReading = normalizeJson(cached?.reading);
        if (cachedReading?.intro && cachedReading?.love && cachedReading?.career && cachedReading?.energy) {
          return json({ ok: true, date, sign, moonSign, locale, hasAstro: !!astroFull, cached: true, reading: cachedReading });
        }
      } catch (err) {
        console.error("[personal-horoscope] cache read failed (continuing):", err instanceof Error ? err.message : String(err));
      }
    }

    // --- daily AI ceiling (after the cache: cache hits cost nothing) ---
    // Bounds worst-case OpenAI spend per account, independent of RC_ENFORCE_PREMIUM.
    const quota = await consumeAiQuota(adminClient, user.id, "personal_horoscope");
    if (!quota.allowed) return json({ ok: false, error: "daily_limit_reached" }, 429);

    // --- generate ---
    let reading;
    try {
      reading = await generatePersonalReading({ sign, moonSign, date, astroCompact, interests, locale });
    } catch (err) {
      // Provider failure must not burn the user's allowance.
      await refundAiQuota(adminClient, user.id, "personal_horoscope");
      throw err;
    }

    // --- persist to cache (best-effort) ---
    try {
      await adminClient
        .from("personal_horoscopes")
        .upsert(
          {
            user_id: user.id,
            date,
            sign,
            moon_sign: moonKey,
            locale,
            reading,
            has_astro: !!astroFull,
          },
          { onConflict: "user_id,date,sign,moon_sign,locale" },
        );
    } catch (err) {
      console.error("[personal-horoscope] cache write failed (non-fatal):", err instanceof Error ? err.message : String(err));
    }

    return json({ ok: true, date, sign, moonSign, locale, hasAstro: !!astroFull, cached: false, reading });
  } catch (e: any) {
    const reason = String(e?.message ?? e ?? "error");
    console.error("[personal-horoscope] failed:", e?.stack ?? e);
    const aiDown = reason.startsWith("AI_UNAVAILABLE");
    notifyError(`personal-horoscope: ${aiDown ? "AI unavailable" : "server error"}`, reason.slice(0, 400));
    return json(
      {
        ok: false,
        code: aiDown ? "AI_UNAVAILABLE" : "server_error",
        error: aiDown ? "AI reading is temporarily unavailable" : "Something went wrong",
      },
      aiDown ? 503 : 500,
    );
  }
});

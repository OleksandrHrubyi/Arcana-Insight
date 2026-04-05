// supabase/functions/personal-horoscope/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";

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
    eclipse: full?.eclipse ? { type: full.eclipse.type, proximityDays: full.eclipse.proximityDays } : null,
    aspects,
    keywords: Array.isArray(full?.keywords) ? full.keywords.slice(0, 5) : [],
  };
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

async function generatePersonalReading(params: {
  sign: Sign;
  moonSign: string | null;
  date: string;
  astroCompact: any | null;
  interests: string[];
  locale: string;
}): Promise<{ intro: string; love: string; career: string; energy: string }> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
  const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";

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

  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      store: false,
      input: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "personal_horoscope",
          strict: true,
          schema: PERSONAL_SCHEMA,
        },
      },
      temperature: 0.88,
      max_output_tokens: 1200,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text().catch(() => "");
    throw new Error(`OpenAI error: ${resp.status} ${err}`);
  }

  const data = await resp.json();
  const raw = getOutputText(data);
  if (!raw) throw new Error("OpenAI: empty output");

  let parsed: any;
  try { parsed = JSON.parse(sanitizeJsonText(raw)); } catch (e) {
    throw new Error(`JSON parse failed: ${String(e)}`);
  }

  if (!parsed?.intro || !parsed?.love || !parsed?.career || !parsed?.energy) {
    throw new Error("Incomplete response from OpenAI");
  }

  return {
    intro:  String(parsed.intro).trim(),
    love:   String(parsed.love).trim(),
    career: String(parsed.career).trim(),
    energy: String(parsed.energy).trim(),
  };
}

Deno.serve(async (req) => {
  try {
    // --- auth: require valid JWT ---
    const authHeader = req.headers.get("authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return new Response("Unauthorized", { status: 401 });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify JWT and get user
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response("Unauthorized", { status: 401 });

    // --- load user profile ---
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

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
      return new Response(
        JSON.stringify({ ok: false, error: "sign_required", hint: "Pass sign in body or set zodiac_sign in profile" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
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

    // --- generate ---
    const reading = await generatePersonalReading({ sign, moonSign, date, astroCompact, interests, locale });

    return new Response(
      JSON.stringify({
        ok: true,
        date,
        sign,
        moonSign,
        locale,
        hasAstro: !!astroFull,
        reading,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("personal-horoscope failed:", e?.stack ?? e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e?.message ?? e) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});

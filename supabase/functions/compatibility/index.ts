// supabase/functions/compatibility/index.ts
//
// AI synastry narrative. The client computes the deterministic synastry
// (charts, real aspects, dimension scores) with src/helpers/compatibilityCore.js
// and sends those FACTS here; this function turns them into a warm, grounded,
// PERSONAL reading. Premium feature. OpenAI -> OpenRouter fallback, strict JSON,
// content-safety guard, deterministic cache keyed by the pair + type + locale.
//
// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2";
import { isUserPremium, premiumEnforcementEnabled } from "../_shared/premium.ts";

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

const SIGNS = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
];
const RELATIONSHIP_TYPES = ["romantic", "friend", "family", "colleague"];

async function fetchWithTimeout(url: string, opts: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(`timeout after ${ms}ms`), ms);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
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
 * Server-side safety backstop for RELATIONSHIP copy. Beyond the horoscope
 * guard (fatalism / medical / financial), it blocks deterministic relationship
 * predictions — the most likely way an AI synastry reading goes wrong and the
 * thing App Store + our content guardrails most dislike. EN + UK.
 */
function containsDisallowed(text: string): boolean {
  const t = String(text || "").toLowerCase();
  const patterns = [
    // hard fatalism / determinism
    /\bwill (definitely|certainly|surely|undoubtedly)\b/,
    /\b(is|are) (destined|guaranteed|fated|predetermined|meant to be)\b/,
    /\b(inevitably|unavoidably)\b/,
    // relationship-outcome determinism
    /\b(will|are going to|going to)\s+(marry|get married|break up|divorce|cheat|leave (you|each other)|fall in love)\b/,
    /\b(soulmates?|twin flames?)\b/,
    /\bguaranteed (love|relationship|marriage|future)\b/,
    /\b(неминуче|обов'?язково станеться|точно станеться|гарантовано|судилося|приречен)\w*/,
    /\b(одружит|поберет|розлуч|розійдут|зрад|покине|кине вас|споріднена душа|друга половинка)\w*/,
    // medical
    /\b(diagnos|disease|symptom|medication|prescrib|illness)\w*/,
    /\b(лікар|діагноз|хвороб|ліки|симптом|лікуванн|медичн)\w*/,
    // financial instructions
    /\b(buy|sell|invest\s+in|invest\s+your)\s+(stock|shares|crypto|bitcoin)\b/,
    /\b(інвестуй|купуй\s+акці|продавай\s+акці|вклади\s+гроші|кредит)\w*/,
  ];
  return patterns.some((re) => re.test(t));
}

function buildSchema(dimensionKeys: string[]) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["overview", "dimensions", "dynamic", "advice"],
    properties: {
      overview: { type: "string" },
      dynamic: { type: "string" },
      advice: { type: "string" },
      dimensions: {
        type: "array",
        minItems: dimensionKeys.length,
        maxItems: dimensionKeys.length,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["key", "text"],
          properties: {
            key: { type: "string", enum: dimensionKeys },
            text: { type: "string" },
          },
        },
      },
    },
  };
}

type Reading = { overview: string; dynamic: string; advice: string; dimensions: { key: string; text: string }[] };

function validateReading(parsed: any, dimensionKeys: string[]): Reading {
  if (!parsed?.overview || !parsed?.dynamic || !parsed?.advice || !Array.isArray(parsed?.dimensions)) {
    throw new Error("incomplete_ai_payload");
  }
  const byKey = new Map(parsed.dimensions.map((d: any) => [d?.key, String(d?.text ?? "").trim()]));
  const dimensions = dimensionKeys.map((key) => ({ key, text: String(byKey.get(key) ?? "").trim() }));
  if (dimensions.some((d) => !d.text)) throw new Error("incomplete_ai_dimensions");
  return {
    overview: String(parsed.overview).trim(),
    dynamic: String(parsed.dynamic).trim(),
    advice: String(parsed.advice).trim(),
    dimensions,
  };
}

const PLANET_LABEL: Record<string, string> = {
  sun: "Sun", moon: "Moon", mercury: "Mercury", venus: "Venus", mars: "Mars", jupiter: "Jupiter", saturn: "Saturn",
};
const CHART_PLANETS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"];

function describeFacts(facts: any): string {
  const a = facts?.a ?? {};
  const b = facts?.b ?? {};
  const chart = (c: any) =>
    CHART_PLANETS.map((p) => `${PLANET_LABEL[p]} in ${c?.[p] ?? "?"}`).join(", ");
  const conns = Array.isArray(facts?.connections)
    ? facts.connections
        .map((c: any) => `${PLANET_LABEL[c?.pa] ?? c?.pa} ${c?.type} ${PLANET_LABEL[c?.pb] ?? c?.pb} (orb ${c?.orb}°, ${c?.harmony})`)
        .join("; ")
    : "";
  const dims = Array.isArray(facts?.dimensions)
    ? facts.dimensions.map((d: any) => `${d?.key}: ${d?.score}/100`).join(", ")
    : "";
  const lines = [
    `Relationship type: ${facts?.relationshipType}`,
    `Overall match: ${facts?.overallScore}/100 (${facts?.tier})`,
    `Person A — ${chart(a)}`,
    `Person B — ${chart(b)}`,
    `Real synastry aspects (between their charts): ${conns || "none tight"}`,
    `Dimension scores: ${dims}`,
  ];
  if (facts?.rising?.a || facts?.rising?.b) {
    lines.push(`Rising signs — A: ${facts.rising.a ?? "unknown"}, B: ${facts.rising.b ?? "unknown"}`);
  }
  if (Array.isArray(facts?.houses) && facts.houses.length) {
    const overlays = facts.houses
      .map((o: any) => `${o?.who === "a" ? "A's" : "B's"} ${PLANET_LABEL[o?.planet] ?? o?.planet} falls in ${o?.who === "a" ? "B's" : "A's"} house ${o?.house}`)
      .join("; ");
    lines.push(`House overlays: ${overlays}`);
  }
  return lines.join("\n");
}

function buildSystem(locale: string, dimensionKeys: string[]): string {
  const langLine = locale === "uk"
    ? "Write entirely in Ukrainian. Tone: modern, warm, calm, personal."
    : "Write in English. Tone: modern, warm, calm, personal.";
  return `
You write grounded astrological COMPATIBILITY readings for two people, based on real synastry (the aspects between their charts). You speak about "the two of you" / "you both".

${langLine}

RULES (non-negotiable):
- Describe how the two energies INTERACT — strengths, friction, and how to work with it.
- Base everything ONLY on the provided signs and real aspects. Do NOT invent placements.
- NO predictions or determinism: never say they will marry, break up, divorce, cheat, are "soulmates", "destined", or "meant to be". No guaranteed outcomes.
- No medical, financial, or fatalistic claims.
- Reflective and practical, not fortune-telling. It's about understanding the dynamic, not foretelling it.
- Reference the actual aspects naturally (e.g. a harmonious Venus–Mars trine, a Moon square that needs patience). Avoid jargon dumps.
- If rising signs and "house overlays" are provided, weave 1–2 of them in naturally (e.g. "their Venus lighting up your partnership house"). If absent, don't mention houses or rising.
- Vary sentence openings. Be specific to THIS pair, never generic.

OUTPUT (JSON only, no markdown):
- overview: 3–4 sentences on the overall connection between the two of you.
- dimensions: one short paragraph (2–3 sentences) for EACH of these keys: ${dimensionKeys.join(", ")}.
- dynamic: 2–3 sentences naming the core dynamic (what flows, what to navigate).
- advice: ONE concrete, kind, practical suggestion (<= 30 words) for getting the best from this connection.
`.trim();
}

async function requestOpenAI(system: string, user: string, schema: any): Promise<any> {
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
      text: { format: { type: "json_schema", name: "compatibility_reading", strict: true, schema } },
      temperature: 0.85,
      max_output_tokens: 1300,
    }),
  }, REQUEST_TIMEOUT_MS);
  if (!resp.ok) {
    const err = await resp.text().catch(() => "");
    console.error(`[compatibility] openai http ${resp.status}: ${err.slice(0, 200)}`);
    throw new Error(`openai_http_${resp.status}`);
  }
  const data = await resp.json();
  const raw = getOutputText(data);
  if (!raw) throw new Error("openai_empty_output");
  return parseJsonLoose(sanitizeJsonText(raw));
}

async function requestOpenRouter(system: string, user: string): Promise<any> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) throw new Error("missing_openrouter_api_key");
  const shapeHint = 'Return ONLY a JSON object: {"overview":string,"dimensions":[{"key":string,"text":string}],"dynamic":string,"advice":string}. No markdown.';
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
      temperature: 0.85,
      max_tokens: 1300,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${system}\n\n${shapeHint}` },
        { role: "user", content: user },
      ],
    }),
  }, REQUEST_TIMEOUT_MS);
  if (!resp.ok) {
    const err = await resp.text().catch(() => "");
    console.error(`[compatibility] openrouter http ${resp.status}: ${err.slice(0, 200)}`);
    throw new Error(`openrouter_http_${resp.status}`);
  }
  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  const rawText = typeof content === "string"
    ? content
    : Array.isArray(content) ? content.map((c: any) => String(c?.text ?? c?.content ?? "")).join("") : "";
  if (!rawText) throw new Error("openrouter_empty");
  return parseJsonLoose(sanitizeJsonText(rawText));
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normalizeFacts(body: any) {
  const relationshipType = RELATIONSHIP_TYPES.includes(String(body?.relationshipType))
    ? String(body.relationshipType) : "romantic";
  const locale = body?.locale === "uk" ? "uk" : "en";
  const validSign = (s: any) => (SIGNS.includes(String(s)) ? String(s) : null);
  const chart = (c: any) => ({
    sun: validSign(c?.sun), moon: validSign(c?.moon), mercury: validSign(c?.mercury),
    venus: validSign(c?.venus), mars: validSign(c?.mars),
    jupiter: validSign(c?.jupiter), saturn: validSign(c?.saturn),
  });
  const a = chart(body?.a);
  const b = chart(body?.b);
  if (!a.sun || !b.sun) return null;
  const dimensions = Array.isArray(body?.dimensions)
    ? body.dimensions.filter((d: any) => d?.key).map((d: any) => ({ key: String(d.key), score: Number(d.score) || 0, aspect: String(d.aspect ?? "") }))
    : [];
  if (!dimensions.length) return null;
  const connections = Array.isArray(body?.connections)
    ? body.connections.slice(0, 6).map((c: any) => ({
        pa: String(c?.pa ?? ""), pb: String(c?.pb ?? ""), type: String(c?.type ?? ""),
        harmony: String(c?.harmony ?? ""), orb: Number(c?.orb) || 0,
      }))
    : [];
  const rising = {
    a: validSign(body?.rising?.a),
    b: validSign(body?.rising?.b),
  };
  const houses = Array.isArray(body?.houses)
    ? body.houses.slice(0, 6).map((o: any) => ({
        who: o?.who === "b" ? "b" : "a",
        planet: String(o?.planet ?? ""),
        house: Number(o?.house) || 0,
      })).filter((o: any) => o.house >= 1 && o.house <= 12)
    : [];
  return {
    relationshipType, locale, a, b, dimensions, connections, rising, houses,
    overallScore: Number(body?.overallScore) || 0,
    tier: String(body?.tier ?? ""),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return json({ ok: false, error: "unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ ok: false, error: "unauthorized" }, 401);

    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

    // AI synastry narrative is a premium feature (deterministic synastry is computed
    // client-side). Flag-gated server enforcement so a logged-in non-subscriber can't
    // trigger paid AI completions by calling the API directly. Checked before parsing
    // facts so premium gating doesn't depend on input shape.
    if (premiumEnforcementEnabled() && !(await isUserPremium(adminClient, user.id))) {
      return json({ ok: false, error: "premium_required" }, 403);
    }

    const body = await req.json().catch(() => ({} as any));
    const facts = normalizeFacts(body);
    if (!facts) return json({ ok: false, error: "invalid_facts" }, 400);

    const dimensionKeys = facts.dimensions.map((d: any) => d.key);

    // Deterministic cache: same charts + type + locale -> same reading. Hashed so
    // raw inputs aren't stored. Global (not per-user) since it's just astrology text.
    const keySource = JSON.stringify({ a: facts.a, b: facts.b, c: facts.connections, t: facts.relationshipType, l: facts.locale });
    const pairHash = await sha256Hex(keySource);
    const force = body?.force === true;

    if (!force) {
      try {
        const { data: cached } = await adminClient
          .from("compatibility_readings")
          .select("reading")
          .eq("pair_hash", pairHash)
          .maybeSingle();
        const r = cached?.reading;
        if (r?.overview && Array.isArray(r?.dimensions)) {
          return json({ ok: true, cached: true, relationshipType: facts.relationshipType, locale: facts.locale, reading: r });
        }
      } catch (err) {
        console.error("[compatibility] cache read failed (continuing):", err instanceof Error ? err.message : String(err));
      }
    }

    const system = buildSystem(facts.locale, dimensionKeys);
    const userPrompt = `${describeFacts(facts)}\n\nWrite the compatibility reading as specified.`;
    const schema = buildSchema(dimensionKeys);

    const providerErrors: string[] = [];
    let parsed: any = null;
    if (Deno.env.get("OPENAI_API_KEY")) {
      try { parsed = await requestOpenAI(system, userPrompt, schema); }
      catch (err) { const m = err instanceof Error ? err.message : String(err); providerErrors.push(`openai: ${m}`); console.error("[compatibility] openai failed:", m); }
    } else {
      providerErrors.push("openai: missing_openai_api_key");
    }
    if (!parsed) {
      if (Deno.env.get("OPENROUTER_API_KEY")) {
        try { parsed = await requestOpenRouter(system, userPrompt); }
        catch (err) { const m = err instanceof Error ? err.message : String(err); providerErrors.push(`openrouter: ${m}`); console.error("[compatibility] openrouter failed:", m); }
      } else {
        providerErrors.push("openrouter: missing_openrouter_api_key");
      }
    }
    if (!parsed) {
      console.error("[compatibility] AI unavailable:", providerErrors.join(" | "));
      return json({ ok: false, code: "AI_UNAVAILABLE", error: "AI reading is temporarily unavailable" }, 503);
    }

    let reading: Reading;
    try {
      reading = validateReading(parsed, dimensionKeys);
    } catch (err) {
      console.error("[compatibility] invalid AI payload:", err instanceof Error ? err.message : String(err));
      return json({ ok: false, code: "AI_UNAVAILABLE", error: "AI reading is temporarily unavailable" }, 503);
    }

    // Content-safety backstop — never return unsafe relationship copy.
    const allText = [reading.overview, reading.dynamic, reading.advice, ...reading.dimensions.map((d) => d.text)].join(" ");
    if (containsDisallowed(allText)) {
      console.error("[compatibility] reading tripped content guard; rejecting");
      return json({ ok: false, code: "AI_UNAVAILABLE", error: "AI reading is temporarily unavailable" }, 503);
    }

    // Persist to cache (best-effort).
    try {
      await adminClient
        .from("compatibility_readings")
        .upsert({ pair_hash: pairHash, relationship_type: facts.relationshipType, locale: facts.locale, reading }, { onConflict: "pair_hash" });
    } catch (err) {
      console.error("[compatibility] cache write failed (non-fatal):", err instanceof Error ? err.message : String(err));
    }

    return json({ ok: true, cached: false, relationshipType: facts.relationshipType, locale: facts.locale, reading });
  } catch (e: any) {
    console.error("[compatibility] failed:", e?.stack ?? e);
    return json({ ok: false, code: "server_error", error: "Something went wrong" }, 500);
  }
});

// scripts/astro-context.mjs
// Node.js ESM (.mjs)

try {
  // optional for local dev, не ламає GH Actions якщо dotenv нема
  await import("dotenv/config");
} catch {}

import { createClient } from "@supabase/supabase-js";
import * as Astronomy from "astronomy-engine";

// ---------- env ----------
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRole) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, serviceRole, {
  auth: { persistSession: false },
});

const CONTEXT_VERSION = "v1";

const SIGNS = [
  "aries","taurus","gemini","cancer","leo","virgo",
  "libra","scorpio","sagittarius","capricorn","aquarius","pisces",
];

function iso(d) {
  return d.toISOString().slice(0, 10);
}

function isoTodayUTC() {
  return iso(new Date());
}

function addDaysISO(dateISO, days) {
  const d = new Date(dateISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}

function atNoonUTC(dateISO) {
  return new Date(dateISO + "T12:00:00Z");
}

function addDaysDate(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function toAstroTime(date) {
  // ✅ стабільно для astronomy-engine: потрібен AstroTime (де є .tt)
  if (typeof Astronomy.MakeTime === "function") return Astronomy.MakeTime(date);
  return new Astronomy.AstroTime(date);
}

function absAngleDiff(a, b) {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

function signedDeltaDeg(next, prev) {
  let d = (next - prev) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

function moonPhaseName(elongDeg) {
  const x = ((elongDeg % 360) + 360) % 360;
  if (x < 22.5 || x >= 337.5) return "New Moon";
  if (x < 67.5) return "Waxing Crescent";
  if (x < 112.5) return "First Quarter";
  if (x < 157.5) return "Waxing Gibbous";
  if (x < 202.5) return "Full Moon";
  if (x < 247.5) return "Waning Gibbous";
  if (x < 292.5) return "Last Quarter";
  return "Waning Crescent";
}

function signFromLongitude(lonDeg) {
  const lon = ((lonDeg % 360) + 360) % 360;
  const idx = Math.floor(lon / 30) % 12;
  return SIGNS[idx];
}

// ✅ СТАБІЛЬНО: GeoVector -> Ecliptic -> elon
function eclipticLon(body, date) {
  const time = toAstroTime(date);
  const vec = Astronomy.GeoVector(body, time, false);
  const ecl = Astronomy.Ecliptic(vec);
  return ecl.elon;
}

const ASPECTS = [
  { name: "conjunction", deg: 0, orb: 6 },
  { name: "sextile", deg: 60, orb: 4.5 },
  { name: "square", deg: 90, orb: 5 },
  { name: "trine", deg: 120, orb: 5 },
  { name: "opposition", deg: 180, orb: 6 },
];

function findTopAspectsMoon(dateISO) {
  const t0 = atNoonUTC(dateISO);

  const moonLon = eclipticLon(Astronomy.Body.Moon, t0);
  const sunLon = eclipticLon(Astronomy.Body.Sun, t0);
  const mercLon = eclipticLon(Astronomy.Body.Mercury, t0);
  const venLon = eclipticLon(Astronomy.Body.Venus, t0);
  const marsLon = eclipticLon(Astronomy.Body.Mars, t0);

  const candidates = [
    { a: "Moon", b: "Sun", aLon: moonLon, bLon: sunLon },
    { a: "Moon", b: "Mercury", aLon: moonLon, bLon: mercLon },
    { a: "Moon", b: "Venus", aLon: moonLon, bLon: venLon },
    { a: "Moon", b: "Mars", aLon: moonLon, bLon: marsLon },
  ];

  const found = [];

  for (const c of candidates) {
    const diff = absAngleDiff(c.aLon, c.bLon);
    for (const asp of ASPECTS) {
      const orb = Math.abs(diff - asp.deg);
      if (orb <= asp.orb) {
        found.push({ a: c.a, b: c.b, type: asp.name, orbDeg: Number(orb.toFixed(2)) });
        break;
      }
    }
  }

  found.sort((x, y) => x.orbDeg - y.orbDeg);
  return found.slice(0, 2);
}

function tryEclipseInfo(dateISO) {
  // best-effort: шукаємо вікно ±14 днів, беремо найближче
  try {
    const t0 = atNoonUTC(dateISO);
    const windowStart = addDaysDate(t0, -14);
    const windowEnd = addDaysDate(t0, 14);

    const startT = toAstroTime(windowStart);
    const endMs = windowEnd.getTime();

    let eclipse = null;

    // Lunar
    const le = Astronomy.SearchLunarEclipse(startT);
    if (le?.peak) {
      const peakDate = le.peak.date ? le.peak.date : le.peak; // різні версії
      const peak = peakDate?.date ? peakDate.date : peakDate;
      const peakTime = peak instanceof Date ? peak : (peak?.toDate ? peak.toDate() : null);

      if (peakTime && peakTime.getTime() <= endMs) {
        const peakISO = iso(peakTime);
        const prox = Math.round(Math.abs((Date.parse(peakISO) - Date.parse(dateISO)) / 86400000));
        eclipse = { type: "lunar", date: peakISO, proximityDays: prox };
      }
    }

    // Solar
    const se = Astronomy.SearchGlobalSolarEclipse(startT);
    if (se?.peak) {
      const peakDate = se.peak.date ? se.peak.date : se.peak;
      const peak = peakDate?.date ? peakDate.date : peakDate;
      const peakTime = peak instanceof Date ? peak : (peak?.toDate ? peak.toDate() : null);

      if (peakTime && peakTime.getTime() <= endMs) {
        const peakISO = iso(peakTime);
        const prox = Math.round(Math.abs((Date.parse(peakISO) - Date.parse(dateISO)) / 86400000));
        const solar = { type: "solar", date: peakISO, proximityDays: prox };

        if (!eclipse || solar.proximityDays < eclipse.proximityDays) eclipse = solar;
      }
    }

    return eclipse;
  } catch {
    return null;
  }
}

function buildContext(dateISO) {
  const t0 = atNoonUTC(dateISO);
  const t1 = addDaysDate(t0, 1);

  const sunLon0 = eclipticLon(Astronomy.Body.Sun, t0);
  const moonLon0 = eclipticLon(Astronomy.Body.Moon, t0);

  const mercLon0 = eclipticLon(Astronomy.Body.Mercury, t0);
  const mercLon1 = eclipticLon(Astronomy.Body.Mercury, t1);
  const mercuryRetrograde = signedDeltaDeg(mercLon1, mercLon0) < 0;

  const elong = absAngleDiff(moonLon0, sunLon0);
  const phase = moonPhaseName(elong);

  const aspects = findTopAspectsMoon(dateISO);
  const eclipse = tryEclipseInfo(dateISO);

  const keywords = [];
  if (phase.includes("New")) keywords.push("reset");
  else if (phase.includes("Waxing")) keywords.push("build");
  else if (phase.includes("Full")) keywords.push("highlight");
  else keywords.push("release");

  if (mercuryRetrograde) keywords.push("rethink", "revisit");

  if (aspects.some(a => a.type === "trine" || a.type === "sextile")) keywords.push("ease");
  if (aspects.some(a => a.type === "square" || a.type === "opposition")) keywords.push("tension");

  keywords.push("clarity");

  const notables = [];
  // notables — це “людська” підказка для дебагу / історії
  notables.push(`Moon phase: ${phase}`);
  if (mercuryRetrograde) notables.push("Mercury retrograde (double-check plans/messages).");
  if (eclipse) notables.push(`${eclipse.type === "lunar" ? "Lunar" : "Solar"} eclipse nearby (${eclipse.proximityDays} days).`);
  for (const a of aspects) notables.push(`${a.a} ${a.type} ${a.b} (orb~${a.orbDeg}°)`);

  return {
    version: CONTEXT_VERSION,
    date: dateISO,
    sun: { sign: signFromLongitude(sunLon0) },
    moon: { sign: signFromLongitude(moonLon0), phase },
    mercuryRetrograde,
    eclipse,
    aspects,
    keywords: keywords.slice(0, 6),
    notables,
  };
}

async function upsertContext(dateISO) {
  const ctx = buildContext(dateISO);

  const { error } = await supabase
    .from("astro_context")
    .upsert([{ date: dateISO, context: ctx, version: CONTEXT_VERSION }], { onConflict: "date" });

  if (error) throw error;
  console.log("✅ upsert astro_context:", dateISO);
}

/* ------------------------------ CLI handling ------------------------------ */

function parseArgsDates() {
  // Підтримка:
  // node scripts/astro-context.mjs --date 2026-01-07 --date 2026-01-08
  // або без аргументів: +1/+2
  const dates = [];
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--date" && argv[i + 1] && /^\d{4}-\d{2}-\d{2}$/.test(argv[i + 1])) {
      dates.push(argv[i + 1]);
      i++;
    }
  }
  if (dates.length) return dates;

  const today = isoTodayUTC();
  return [addDaysISO(today, 1), addDaysISO(today, 2)];
}

async function main() {
  const dates = parseArgsDates();
  for (const d of dates) await upsertContext(d);
}

main().catch((e) => {
  console.error("astro-context failed:", e?.stack ?? e);
  process.exit(1);
});

// scripts/astro-context.mjs
import "dotenv/config";
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

// ---------- helpers ----------
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

const SIGNS = [
  "aries","taurus","gemini","cancer","leo","virgo",
  "libra","scorpio","sagittarius","capricorn","aquarius","pisces",
];

function signFromLongitude(lonDeg) {
  const lon = ((lonDeg % 360) + 360) % 360;
  const idx = Math.floor(lon / 30) % 12;
  return SIGNS[idx];
}

// astronomy-engine часто очікує AstroTime (де є .tt)
function toAstroTime(date) {
  if (typeof Astronomy.MakeTime === "function") return Astronomy.MakeTime(date);
  return new Astronomy.AstroTime(date);
}

// стабільний шлях: GeoVector -> Ecliptic
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

function findAspects(moonLon, others) {
  const found = [];
  for (const o of others) {
    const diff = absAngleDiff(moonLon, o.lon);
    for (const asp of ASPECTS) {
      const orbDeg = Math.abs(diff - asp.deg);
      if (orbDeg <= asp.orb) {
        found.push({ a: "Moon", b: o.name, type: asp.name, orbDeg: Number(orbDeg.toFixed(2)) });
        break;
      }
    }
  }
  found.sort((x, y) => x.orbDeg - y.orbDeg);
  return found.slice(0, 2);
}

function buildContext(dateISO) {
  const t0 = atNoonUTC(dateISO);
  const t1 = new Date(t0);
  t1.setUTCDate(t1.getUTCDate() + 1);

  const sunLon0 = eclipticLon(Astronomy.Body.Sun, t0);
  const moonLon0 = eclipticLon(Astronomy.Body.Moon, t0);

  const mercLon0 = eclipticLon(Astronomy.Body.Mercury, t0);
  const mercLon1 = eclipticLon(Astronomy.Body.Mercury, t1);
  const mercuryRetrograde = signedDeltaDeg(mercLon1, mercLon0) < 0;

  const venusLon0 = eclipticLon(Astronomy.Body.Venus, t0);
  const marsLon0  = eclipticLon(Astronomy.Body.Mars, t0);

  const elong = absAngleDiff(moonLon0, sunLon0);
  const phase = moonPhaseName(elong);

  const aspects = findAspects(moonLon0, [
    { name: "Sun", lon: sunLon0 },
    { name: "Venus", lon: venusLon0 },
    { name: "Mars", lon: marsLon0 },
    { name: "Mercury", lon: mercLon0 },
  ]);

  const keywords = [];
  if (phase.includes("New")) keywords.push("reset");
  else if (phase.includes("Waxing")) keywords.push("build");
  else if (phase.includes("Full")) keywords.push("highlight");
  else keywords.push("release");

  if (mercuryRetrograde) keywords.push("rethink", "revisit");
  if (aspects.some(a => a.type === "trine" || a.type === "sextile")) keywords.push("ease");
  if (aspects.some(a => a.type === "square" || a.type === "opposition")) keywords.push("tension");
  keywords.push("clarity");

  const notables = [
    `Moon phase: ${phase}`,
    ...aspects.map(a => `${a.a} ${a.type} ${a.b} (orb~${a.orbDeg}°)`),
  ];

  return {
    version: "v1",
    date: dateISO,
    sun: { sign: signFromLongitude(sunLon0) },
    moon: { sign: signFromLongitude(moonLon0), phase },
    mercuryRetrograde,
    eclipse: null,
    aspects,
    keywords: keywords.slice(0, 5),
    notables,
  };
}

async function upsertContext(dateISO) {
  const ctx = buildContext(dateISO);

  const { error } = await supabase
    .from("astro_context")
    .upsert([{ date: dateISO, context: ctx, version: "v1" }], { onConflict: "date" });

  if (error) throw error;

  console.log("upsert astro_context:", dateISO);
}

async function main() {
  const todayUTC = isoTodayUTC();
  const dates = [addDaysISO(todayUTC, 1), addDaysISO(todayUTC, 2)];

  for (const d of dates) {
    await upsertContext(d);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

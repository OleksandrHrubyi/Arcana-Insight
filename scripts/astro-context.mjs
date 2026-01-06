import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import Astronomy from "astronomy-engine";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRole) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

const GEO = new Astronomy.Observer(0, 0, 0);

function iso(d) {
  return d.toISOString().slice(0, 10);
}

function atNoonUTC(dateISO) {
  return new Date(dateISO + "T12:00:00Z");
}

function addDays(dateISO, days) {
  const d = new Date(dateISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
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

function eclipticLon(body, date) {
  const eq = Astronomy.Equator(body, date, GEO, true, true);
  const ecl = Astronomy.Ecliptic(eq);
  return ecl.elon;
}

function signFromLongitude(lonDeg) {
  const SIGNS = ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"];
  const lon = ((lonDeg % 360) + 360) % 360;
  const idx = Math.floor(lon / 30) % 12;
  return SIGNS[idx];
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

function buildContext(dateISO) {
  const t0 = atNoonUTC(dateISO);
  const t1 = new Date(t0);
  t1.setUTCDate(t1.getUTCDate() + 1);

  const sunLon0 = eclipticLon(Astronomy.Body.Sun, t0);
  const moonLon0 = eclipticLon(Astronomy.Body.Moon, t0);

  const mercLon0 = eclipticLon(Astronomy.Body.Mercury, t0);
  const mercLon1 = eclipticLon(Astronomy.Body.Mercury, t1);
  const mercuryRetrograde = signedDeltaDeg(mercLon1, mercLon0) < 0;

  const elong = absAngleDiff(moonLon0, sunLon0);
  const phase = moonPhaseName(elong);

  const keywords = [];
  if (phase.includes("New")) keywords.push("reset");
  else if (phase.includes("Waxing")) keywords.push("build");
  else if (phase.includes("Full")) keywords.push("highlight");
  else keywords.push("release");
  if (mercuryRetrograde) keywords.push("rethink", "revisit");
  keywords.push("clarity");

  return {
    version: "v1",
    date: dateISO,
    sun: { sign: signFromLongitude(sunLon0) },
    moon: { sign: signFromLongitude(moonLon0), phase },
    mercuryRetrograde,
    keywords: keywords.slice(0, 5),
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
  // генеруємо контекст на +1 і +2 дні (як і твої гороскопи)
  const todayUTC = iso(new Date());
  const dates = [addDays(todayUTC, 1), addDays(todayUTC, 2)];

  for (const d of dates) {
    await upsertContext(d);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

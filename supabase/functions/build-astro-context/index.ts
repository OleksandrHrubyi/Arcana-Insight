// supabase/functions/build-astro-context/index.ts
//
// Computes real astronomical context for a given date and writes it to
// the `astro_context` table. Run this BEFORE generate-horoscopes.
//
// POST body (JSON):
//   { date?: "YYYY-MM-DD", days?: 1..7, force?: boolean }
//   - date:  start date (default: tomorrow UTC)
//   - days:  how many consecutive days to build (default: 1, max 7)
//   - force: overwrite existing rows (default: false)
//
// Auth: x-cron-secret header must match CRON_SECRET env var.

// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2";
import Astronomy from "npm:astronomy-engine";

/* ─── Types ──────────────────────────────────────────────────────────── */

type SignName =
  | "aries" | "taurus" | "gemini" | "cancer"
  | "leo" | "virgo" | "libra" | "scorpio"
  | "sagittarius" | "capricorn" | "aquarius" | "pisces";

type PhaseName =
  | "new" | "waxing_crescent" | "first_quarter" | "waxing_gibbous"
  | "full" | "waning_gibbous" | "last_quarter" | "waning_crescent";

type AspectType = "conjunction" | "sextile" | "square" | "trine" | "opposition";

interface PlanetState {
  sign: SignName;
  lon: number;        // ecliptic longitude 0..360
  retrograde: boolean;
}

interface Aspect {
  a: string;
  b: string;
  type: AspectType;
  orbDeg: number;     // absolute orb in degrees (always positive)
  applying: boolean;  // true = planets moving toward exact aspect
}

interface EclipseInfo {
  type: "solar" | "lunar";
  date: string;        // ISO date of closest eclipse
  proximityDays: number;
}

interface AstroContext {
  context_version: "v2";
  date: string;
  sun: { sign: SignName; lon: number };
  moon: {
    sign: SignName;
    lon: number;
    phase: PhaseName;
    illumination: number;   // 0..1
  };
  mercury: PlanetState;
  venus:   PlanetState;
  mars:    PlanetState;
  jupiter: PlanetState;
  saturn:  PlanetState;
  aspects: Aspect[];
  eclipse: EclipseInfo | null;
  keywords: string[];
}

/* ─── Astronomy helpers ──────────────────────────────────────────────── */

const SIGNS: SignName[] = [
  "aries","taurus","gemini","cancer","leo","virgo",
  "libra","scorpio","sagittarius","capricorn","aquarius","pisces",
];

const ASPECT_ANGLES: { type: AspectType; deg: number }[] = [
  { type: "conjunction", deg: 0   },
  { type: "sextile",     deg: 60  },
  { type: "square",      deg: 90  },
  { type: "trine",       deg: 120 },
  { type: "opposition",  deg: 180 },
];

// Maximum orb (degrees) to consider an aspect active
const MAX_ORB = 4;

function makeTime(date: Date) {
  return typeof Astronomy.MakeTime === "function"
    ? Astronomy.MakeTime(date)
    : new Astronomy.AstroTime(date);
}

function eclipticLon(body: unknown, date: Date): number {
  return Astronomy.Ecliptic(Astronomy.GeoVector(body, makeTime(date), false)).elon;
}

function normLon(lon: number): number {
  return ((lon % 360) + 360) % 360;
}

function signFromLon(lon: number): SignName {
  return SIGNS[Math.floor(normLon(lon) / 30) % 12];
}

/** Shortest signed angular difference next - prev, range -180..180 */
function signedDelta(next: number, prev: number): number {
  let d = (next - prev) % 360;
  if (d > 180)  d -= 360;
  if (d < -180) d += 360;
  return d;
}

/** Illumination fraction 0..1 from Moon elongation */
function illuminationFromPhaseAngle(phaseAngleDeg: number): number {
  return (1 - Math.cos((phaseAngleDeg * Math.PI) / 180)) / 2;
}

function phaseNameFromAngle(elong: number): PhaseName {
  const x = normLon(elong);
  if (x < 22.5 || x >= 337.5) return "new";
  if (x < 67.5)  return "waxing_crescent";
  if (x < 112.5) return "first_quarter";
  if (x < 157.5) return "waxing_gibbous";
  if (x < 202.5) return "full";
  if (x < 247.5) return "waning_gibbous";
  if (x < 292.5) return "last_quarter";
  return "waning_crescent";
}

function getPlanetState(body: unknown, date: Date): PlanetState {
  const dt = 24 * 3600 * 1000; // 1 day forward
  const lon0 = eclipticLon(body, date);
  const lon1 = eclipticLon(body, new Date(date.getTime() + dt));
  return {
    sign: signFromLon(lon0),
    lon: Math.round(normLon(lon0) * 100) / 100,
    retrograde: signedDelta(lon1, lon0) < 0,
  };
}

/**
 * Absolute angular difference between two ecliptic longitudes, 0..180.
 */
function absDiff(a: number, b: number): number {
  const d = Math.abs(normLon(a) - normLon(b)) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * Find all major aspects between a set of named planet longitudes.
 * Returns aspects sorted by orb (tightest first), max MAX_ORB degrees.
 */
function computeAspects(
  planets: { name: string; lon: number; lon1: number }[],
): Aspect[] {
  const result: Aspect[] = [];

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const pa = planets[i];
      const pb = planets[j];

      const diff0 = absDiff(pa.lon, pb.lon);
      const diff1 = absDiff(pa.lon1, pb.lon1);

      for (const { type, deg } of ASPECT_ANGLES) {
        const orb0 = Math.abs(diff0 - deg);
        const orb1 = Math.abs(diff1 - deg);
        if (orb0 <= MAX_ORB) {
          result.push({
            a: pa.name,
            b: pb.name,
            type,
            orbDeg: Math.round(orb0 * 100) / 100,
            applying: orb1 < orb0, // getting closer = applying
          });
          break; // only one aspect type per pair
        }
      }
    }
  }

  // Sort by orb (tightest first)
  result.sort((a, b) => a.orbDeg - b.orbDeg);

  return result;
}

/**
 * Check for solar or lunar eclipse within ±15 days of the given date.
 * A solar eclipse happens near a new moon when the Moon is near the ecliptic
 * (ecliptic latitude close to 0). We approximate by checking the lunar node
 * proximity using the Moon's ecliptic latitude.
 */
function checkEclipse(date: Date): EclipseInfo | null {
  const WINDOW_DAYS = 15;
  const MS_PER_DAY = 86400000;

  // Scan new and full moons within the window
  const candidates: { type: "solar" | "lunar"; date: Date; latDeg: number }[] = [];

  for (const phaseAngle of [0, 180]) {
    // Search backwards and forwards
    for (const startOffset of [-WINDOW_DAYS, 0]) {
      try {
        const startDate = new Date(date.getTime() + startOffset * MS_PER_DAY);
        const found = Astronomy.SearchMoonPhase(phaseAngle, startDate, WINDOW_DAYS + 2);
        if (!found) continue;

        const moonTime = makeTime(found.date);
        const moonEcl = Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Moon, moonTime, false));

        candidates.push({
          type: phaseAngle === 0 ? "solar" : "lunar",
          date: found.date,
          latDeg: Math.abs(moonEcl.elat),
        });
      } catch {
        // SearchMoonPhase can throw if no result in window
      }
    }
  }

  // Eclipse threshold: latitude < ~1.5° (solar) or < ~1.0° (lunar) near nodes
  // Using a generous 1.5° for both since this is approximate
  const ECLIPSE_LAT_THRESHOLD = 1.5;

  for (const c of candidates) {
    const daysAway = Math.abs((c.date.getTime() - date.getTime()) / MS_PER_DAY);
    if (daysAway <= WINDOW_DAYS && c.latDeg < ECLIPSE_LAT_THRESHOLD) {
      return {
        type: c.type,
        date: c.date.toISOString().slice(0, 10),
        proximityDays: Math.round(daysAway),
      };
    }
  }

  return null;
}

/* ─── Context builder ────────────────────────────────────────────────── */

function buildContext(dateISO: string): AstroContext {
  const date = new Date(dateISO + "T12:00:00Z"); // noon UTC — representative for the day
  const date1 = new Date(date.getTime() + 86400000); // tomorrow noon

  // Sun
  const sunLon0 = eclipticLon(Astronomy.Body.Sun, date);
  const sun = {
    sign: signFromLon(sunLon0),
    lon: Math.round(normLon(sunLon0) * 100) / 100,
  };

  // Moon
  const moonLon0 = eclipticLon(Astronomy.Body.Moon, date);
  const sunLonN  = normLon(sunLon0);
  const moonLonN = normLon(moonLon0);
  let elongation = moonLonN - sunLonN;
  if (elongation < 0) elongation += 360;
  const moon = {
    sign: signFromLon(moonLon0),
    lon: Math.round(moonLonN * 100) / 100,
    phase: phaseNameFromAngle(elongation),
    illumination: Math.round(illuminationFromPhaseAngle(elongation) * 100) / 100,
  };

  // Inner + outer planets
  const mercury = getPlanetState(Astronomy.Body.Mercury, date);
  const venus   = getPlanetState(Astronomy.Body.Venus,   date);
  const mars    = getPlanetState(Astronomy.Body.Mars,    date);
  const jupiter = getPlanetState(Astronomy.Body.Jupiter, date);
  const saturn  = getPlanetState(Astronomy.Body.Saturn,  date);

  // Aspects — use today + tomorrow longitudes to detect applying/separating
  const planetLons: { name: string; lon: number; lon1: number }[] = [
    { name: "sun",     lon: sunLon0,                                    lon1: eclipticLon(Astronomy.Body.Sun,     date1) },
    { name: "moon",    lon: moonLon0,                                   lon1: eclipticLon(Astronomy.Body.Moon,    date1) },
    { name: "mercury", lon: normLon(mercury.lon),                       lon1: eclipticLon(Astronomy.Body.Mercury, date1) },
    { name: "venus",   lon: normLon(venus.lon),                         lon1: eclipticLon(Astronomy.Body.Venus,   date1) },
    { name: "mars",    lon: normLon(mars.lon),                          lon1: eclipticLon(Astronomy.Body.Mars,    date1) },
    { name: "jupiter", lon: normLon(jupiter.lon),                       lon1: eclipticLon(Astronomy.Body.Jupiter, date1) },
    { name: "saturn",  lon: normLon(saturn.lon),                        lon1: eclipticLon(Astronomy.Body.Saturn,  date1) },
  ];

  const aspects = computeAspects(planetLons);

  // Eclipse
  const eclipse = checkEclipse(date);

  // Keywords — what the AI is allowed to reference
  const keywords: string[] = [
    `sun_in_${sun.sign}`,
    `moon_in_${moon.sign}`,
    moon.phase,
  ];
  if (mercury.retrograde) keywords.push("mercury_retrograde");
  if (venus.retrograde)   keywords.push("venus_retrograde");
  if (mars.retrograde)    keywords.push("mars_retrograde");

  // Add aspect keywords for tight aspects (orb ≤ 2°)
  for (const asp of aspects.filter(a => a.orbDeg <= 2)) {
    keywords.push(`${asp.a}_${asp.type}_${asp.b}`);
  }

  if (eclipse) keywords.push(`${eclipse.type}_eclipse`);

  return {
    context_version: "v2",
    date: dateISO,
    sun,
    moon,
    mercury,
    venus,
    mars,
    jupiter,
    saturn,
    aspects,
    eclipse,
    keywords,
  };
}

/* ─── Utils ──────────────────────────────────────────────────────────── */

function isoTodayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/* ─── Handler ────────────────────────────────────────────────────────── */

Deno.serve(async (req: Request) => {
  try {
    // Auth
    const required = Deno.env.get("CRON_SECRET") ?? "";
    const provided  = req.headers.get("x-cron-secret") ?? "";
    if (!required || provided !== required) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Parse body
    const body = await req.json().catch(() => ({} as Record<string, unknown>));

    const startDate = (
      typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
        ? body.date
        : addDaysISO(isoTodayUTC(), 1)
    );

    const days  = clamp(Number(body.days ?? 1), 1, 7);
    const force = body.force === true;

    // Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const results: { date: string; status: "built" | "skipped" | "error"; error?: string }[] = [];

    for (let i = 0; i < days; i++) {
      const dateISO = addDaysISO(startDate, i);

      // Skip if already exists and force=false
      if (!force) {
        const { data: existing } = await supabase
          .from("astro_context")
          .select("date")
          .eq("date", dateISO)
          .maybeSingle();

        if (existing) {
          results.push({ date: dateISO, status: "skipped" });
          continue;
        }
      }

      try {
        const context = buildContext(dateISO);

        const { error: upsertErr } = await supabase
          .from("astro_context")
          .upsert({ date: dateISO, context }, { onConflict: "date" });

        if (upsertErr) throw new Error(upsertErr.message);

        results.push({ date: dateISO, status: "built" });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[build-astro-context] ${dateISO} failed:`, msg);
        results.push({ date: dateISO, status: "error", error: msg });
      }
    }

    const built   = results.filter(r => r.status === "built").length;
    const skipped = results.filter(r => r.status === "skipped").length;
    const errors  = results.filter(r => r.status === "error").length;

    return new Response(
      JSON.stringify({ ok: errors === 0, built, skipped, errors, results }),
      { status: errors > 0 ? 207 : 200, headers: { "Content-Type": "application/json" } },
    );

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[build-astro-context] fatal:", msg);
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});

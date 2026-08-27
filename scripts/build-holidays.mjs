/**
 * Regenerates the `countries` block of holidays.json from published calendars.
 *
 * WHY A GENERATOR AND NOT A HAND-WRITTEN FILE
 * -------------------------------------------
 * India's list was hand-written, and at one country that was fine. At fifty it
 * is not: a public holiday list is roughly 700 dates per year, a third of them
 * lunar or Hijri and therefore un-guessable, and every one of them is a claim
 * the site makes to somebody planning real leave. Hand-typing that is how you
 * ship a Diwali on the wrong Sunday. This script derives the whole thing from
 * two published sources and records, per country, which source answered.
 *
 * SOURCES
 *   1. Google's public holiday calendars (calendar.google.com .../basic.ics).
 *      The primary source. It is the only one of the two that distinguishes a
 *      public holiday from an observance, that marks Hijri dates as tentative,
 *      and that names the exact subdivisions a regional holiday applies to.
 *   2. Nager.Date (date.nager.at). Used only to cross-check, and to report
 *      disagreements at the end of a run. It is deliberately NOT merged in:
 *      it has no observance/holiday distinction, so merging would quietly
 *      import commemorative days nobody gets off.
 *
 * Run it with `node scripts/build-holidays.mjs`. Downloads are cached under
 * .cache/holidays/ so a re-run is offline and instant; pass --refresh to
 * re-fetch. Pass --report to print the cross-check without writing the file.
 *
 * WHAT COUNTS AS A HOLIDAY HERE
 * -----------------------------
 * A day this country's workers are, as a rule, not expected to be at work.
 * That means:
 *   - nationwide public holidays, always;
 *   - a regional public holiday only where it covers at least half the
 *     country's subdivisions (`MIN_SUBDIVISION_SHARE`), recorded with
 *     `scope: "most"` so the UI can say so. Australia's King's Birthday is the
 *     case this exists for: six states of eight, so leaving it out would have
 *     cost most Australians a June long weekend, and calling it national would
 *     have promised Queensland and WA a day they do not get;
 *   - nothing else. Observances, commemorative days, half-days and school
 *     holidays are dropped. "Public holiday" here has to mean a day off, or
 *     the leave arithmetic on top of it is fiction.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, ".cache", "holidays");
const OUT = join(ROOT, "holidays.json");

/**
 * The window, matching CALENDAR_START/CALENDAR_END in src/data/vacation-solver.ts.
 *
 * The ten days past the end of 2027 are not decoration: without them a break
 * that starts on 30 December 2027 has nothing to bridge to, because the New
 * Year holiday it is built around falls outside the data. Every country in the
 * list except Israel observes 1 January, and rather than hand-maintaining that
 * exception the window simply runs into 2028 and takes whatever each calendar
 * says — including the substitute days, since 1 January 2028 is a Saturday.
 */
const WINDOW_START = "2026-01-01";
const WINDOW_END = "2028-01-10";

const REFRESH = process.argv.includes("--refresh");
const REPORT_ONLY = process.argv.includes("--report");

/** Years a country must be populated for before it is fit to publish. */
const REQUIRED_YEARS = ["2026", "2027"];

/**
 * A regional holiday needs this share of the country's subdivisions to be
 * carried. Half is the line because below it the holiday is the exception
 * rather than the rule, and a planner that offers a break most of its readers
 * cannot take is worse than one that stays quiet.
 */
const MIN_SUBDIVISION_SHARE = 0.5;

/**
 * The countries the site covers, in the order the picker groups them.
 *
 * `cal` is the Google calendar id; the ids are not systematic (some are ISO
 * codes, some are demonyms, some are names) because Google added them over
 * fifteen years and never migrated the old ones — `en.uk`, `en.japanese` and
 * `en.ae` are all live today. `nager` is the ISO code for the cross-check, or
 * null where Nager.Date has no such country.
 *
 * `weekend` is the pair of weekday numbers (0 = Sunday) that are NOT working
 * days, MOST SIGNIFICANT FIRST — the first is the day a six-day work week keeps.
 * It defaults to [0, 6], Sunday then Saturday, and is spelled out only where
 * that is wrong. Israel rests Friday-Saturday around a Saturday Sabbath, so it
 * is [6, 5]; Egypt rests Friday-Saturday around a Friday, so it is [5, 6]. Get
 * this wrong and every Israeli result shifts by two days, because a holiday
 * landing on their Sunday is a real day off rather than one the weekend already
 * covered. The UAE moved to a Saturday-Sunday weekend in January 2022, so it
 * takes the default despite the neighbours.
 */
const COUNTRIES = [
  // --- Asia-Pacific ---------------------------------------------------------
  { code: "IN", name: "India", group: "Asia-Pacific", cal: "indian", nager: null, hub: "Bengaluru, Hyderabad, Pune" },
  { code: "CN", name: "China", group: "Asia-Pacific", cal: "china", nager: "CN", hub: "Beijing, Shenzhen, Hangzhou" },
  { code: "JP", name: "Japan", group: "Asia-Pacific", cal: "japanese", nager: "JP", hub: "Tokyo, Osaka" },
  { code: "KR", name: "South Korea", group: "Asia-Pacific", cal: "south_korea", nager: "KR", hub: "Seoul, Pangyo" },
  { code: "TW", name: "Taiwan", group: "Asia-Pacific", cal: "taiwan", nager: null, hub: "Taipei, Hsinchu" },
  { code: "HK", name: "Hong Kong", group: "Asia-Pacific", cal: "hong_kong", nager: "HK", hub: "Hong Kong" },
  { code: "SG", name: "Singapore", group: "Asia-Pacific", cal: "singapore", nager: "SG", hub: "Singapore" },
  { code: "MY", name: "Malaysia", group: "Asia-Pacific", cal: "malaysia", nager: null, hub: "Kuala Lumpur, Penang" },
  { code: "ID", name: "Indonesia", group: "Asia-Pacific", cal: "indonesian", nager: "ID", hub: "Jakarta, Bandung" },
  { code: "PH", name: "Philippines", group: "Asia-Pacific", cal: "philippines", nager: "PH", hub: "Manila, Cebu" },
  { code: "VN", name: "Vietnam", group: "Asia-Pacific", cal: "vietnamese", nager: "VN", hub: "Ho Chi Minh City, Hanoi" },
  { code: "TH", name: "Thailand", group: "Asia-Pacific", cal: "th", nager: null, hub: "Bangkok" },
  { code: "AU", name: "Australia", group: "Asia-Pacific", cal: "australian", nager: "AU", hub: "Sydney, Melbourne" },
  { code: "NZ", name: "New Zealand", group: "Asia-Pacific", cal: "new_zealand", nager: "NZ", hub: "Auckland, Wellington" },

  // --- Europe ---------------------------------------------------------------
  { code: "GB", name: "United Kingdom", group: "Europe", cal: "uk", nager: "GB", hub: "London, Manchester" },
  { code: "IE", name: "Ireland", group: "Europe", cal: "irish", nager: "IE", hub: "Dublin, Cork" },
  { code: "DE", name: "Germany", group: "Europe", cal: "german", nager: "DE", hub: "Berlin, Munich" },
  { code: "FR", name: "France", group: "Europe", cal: "french", nager: "FR", hub: "Paris, Toulouse" },
  { code: "NL", name: "Netherlands", group: "Europe", cal: "dutch", nager: "NL", hub: "Amsterdam, Eindhoven" },
  { code: "BE", name: "Belgium", group: "Europe", cal: "be", nager: "BE", hub: "Brussels, Ghent" },
  { code: "CH", name: "Switzerland", group: "Europe", cal: "ch", nager: "CH", hub: "Zurich, Lausanne" },
  { code: "AT", name: "Austria", group: "Europe", cal: "austrian", nager: "AT", hub: "Vienna, Linz" },
  { code: "ES", name: "Spain", group: "Europe", cal: "spain", nager: "ES", hub: "Madrid, Barcelona" },
  { code: "PT", name: "Portugal", group: "Europe", cal: "portuguese", nager: "PT", hub: "Lisbon, Porto" },
  { code: "IT", name: "Italy", group: "Europe", cal: "italian", nager: "IT", hub: "Milan, Rome" },
  { code: "PL", name: "Poland", group: "Europe", cal: "polish", nager: "PL", hub: "Warsaw, Kraków, Wrocław" },
  { code: "CZ", name: "Czechia", group: "Europe", cal: "czech", nager: "CZ", hub: "Prague, Brno" },
  { code: "RO", name: "Romania", group: "Europe", cal: "romanian", nager: "RO", hub: "Bucharest, Cluj-Napoca" },
  { code: "UA", name: "Ukraine", group: "Europe", cal: "ukrainian", nager: "UA", hub: "Kyiv, Lviv" },
  { code: "EE", name: "Estonia", group: "Europe", cal: "ee", nager: "EE", hub: "Tallinn, Tartu" },
  { code: "SE", name: "Sweden", group: "Europe", cal: "swedish", nager: "SE", hub: "Stockholm, Malmö" },
  { code: "NO", name: "Norway", group: "Europe", cal: "norwegian", nager: "NO", hub: "Oslo, Trondheim" },
  { code: "DK", name: "Denmark", group: "Europe", cal: "danish", nager: "DK", hub: "Copenhagen, Aarhus" },
  { code: "FI", name: "Finland", group: "Europe", cal: "finnish", nager: "FI", hub: "Helsinki, Tampere" },
  { code: "GR", name: "Greece", group: "Europe", cal: "greek", nager: "GR", hub: "Athens, Thessaloniki" },

  // --- Americas -------------------------------------------------------------
  { code: "US", name: "United States", group: "Americas", cal: "usa", nager: "US", hub: "Bay Area, Seattle, Austin" },
  { code: "CA", name: "Canada", group: "Americas", cal: "canadian", nager: "CA", hub: "Toronto, Vancouver, Montreal" },
  { code: "MX", name: "Mexico", group: "Americas", cal: "mexican", nager: "MX", hub: "Guadalajara, Mexico City" },
  { code: "BR", name: "Brazil", group: "Americas", cal: "brazilian", nager: "BR", hub: "São Paulo, Florianópolis" },
  { code: "AR", name: "Argentina", group: "Americas", cal: "ar", nager: "AR", hub: "Buenos Aires, Córdoba" },

  // --- Middle East & Africa -------------------------------------------------
  { code: "IL", name: "Israel", group: "Middle East & Africa", cal: "jewish", nager: null, weekend: [6, 5], hub: "Tel Aviv, Herzliya" },
  { code: "AE", name: "United Arab Emirates", group: "Middle East & Africa", cal: "ae", nager: null, hub: "Dubai, Abu Dhabi" },
  { code: "TR", name: "Türkiye", group: "Middle East & Africa", cal: "turkish", nager: "TR", hub: "Istanbul, Ankara" },
  { code: "EG", name: "Egypt", group: "Middle East & Africa", cal: "eg", nager: "EG", weekend: [5, 6], hub: "Cairo, Alexandria" },
  { code: "ZA", name: "South Africa", group: "Middle East & Africa", cal: "sa", nager: "ZA", hub: "Cape Town, Johannesburg" },
  { code: "NG", name: "Nigeria", group: "Middle East & Africa", cal: "ng", nager: "NG", hub: "Lagos, Abuja" },
  { code: "KE", name: "Kenya", group: "Middle East & Africa", cal: "ke", nager: "KE", hub: "Nairobi" },
];

/**
 * Subdivisions excluded from the "what share of the country observes this"
 * denominator.
 *
 * These are external territories with populations in the hundreds — Cocos
 * (Keeling) has about 600 people and Heard Island has none at all. Counting
 * them as peers of New South Wales dilutes the share enough to matter: with
 * them in the denominator Australia's King's Birthday scores 6/12 rather than
 * 6/8, and Labour Day drops under the line entirely.
 */
const MINOR_SUBDIVISIONS = new Set([
  "Christmas Island",
  "Cocos and Keeling Islands",
  "Heard and McDonald Islands",
  "Norfolk Island",
  "Jervis Bay Territory",
]);

/**
 * Hand-researched additions, applied after extraction.
 *
 * Every entry here is a place the Google calendar is demonstrably incomplete,
 * and each one carries the source that was checked. This table is deliberately
 * small and deliberately explicit: the moment it starts absorbing "dates I am
 * fairly sure of" it stops being a correction to a source and becomes a second,
 * unverifiable source of its own.
 */
const SUPPLEMENTS = {
  /**
   * Boxing Day substitutes. Google's Australian calendar carries Boxing Day
   * itself but not the weekday granted when it lands on a weekend, and it
   * lands on one in both years: Saturday in 2026, Sunday in 2027. Every state
   * but South Australia grants the Monday (SA grants it too, under the name
   * Proclamation Day), so leaving them out costs Australia its only summer
   * long weekend in each year.
   * Source: publicholidays.com.au 2026 and 2027 tables.
   */
  AU: [
    { date: "2026-12-28", name: "Boxing Day Holiday", scope: "national" },
    { date: "2027-12-27", name: "Christmas Day Holiday", scope: "national" },
    { date: "2027-12-28", name: "Boxing Day Holiday", scope: "national" },
  ],

  /**
   * Singapore grants the following Monday whenever a public holiday falls on a
   * Sunday. Google applies that rule everywhere except here: the second day of
   * Chinese New Year 2027 is Sunday 7 February, and the Monday it earns is
   * missing — which turns a four-day Lunar New Year break into a three-day one.
   * Source: Ministry of Manpower public holiday rule; Nager.Date agrees.
   */
  SG: [{ date: "2027-02-08", name: "Chinese New Year Holiday", scope: "national" }],

  /**
   * The whole of Indonesia's 2027.
   *
   * Indonesia sets its public holidays by a joint ministerial decree (the SKB)
   * published a few months ahead, and the 2027 decree is not out — which is
   * why Google's calendar simply stops at the end of 2026. The alternative to
   * this table was dropping the country, and a planner that covers Jakarta for
   * one year and then goes silent is worse than one that says out loud which
   * year is estimated.
   *
   * So every date here is marked tentative and the country carries a note.
   * The Islamic and Buddhist dates are not guesses: they are the same dates
   * Google publishes for Malaysia, Singapore and the UAE in 2027, which agree
   * with each other to the day. The civic and Christian ones are arithmetic.
   * Source: publicholidays.co.id 2027 table (itself marked an estimate),
   * cross-checked against the Malaysian, Singaporean and Emirati calendars.
   *
   * Cuti bersama — the collective leave days the decree adds around Idul Fitri
   * and Christmas — are absent, because they are a policy choice rather than a
   * calculable date. Indonesia's real 2027 will be more generous than this.
   */
  ID: [
    { date: "2027-01-01", name: "New Year's Day", scope: "national" },
    { date: "2027-01-05", name: "Isra Mi'raj", scope: "national", tentative: true },
    { date: "2027-02-06", name: "Chinese New Year", scope: "national", tentative: true },
    { date: "2027-03-09", name: "Bali Hindu New Year (Nyepi)", scope: "national", tentative: true },
    { date: "2027-03-10", name: "Idul Fitri", scope: "national", tentative: true },
    { date: "2027-03-11", name: "Idul Fitri Holiday", scope: "national", tentative: true },
    { date: "2027-03-26", name: "Good Friday", scope: "national" },
    { date: "2027-05-01", name: "International Labor Day", scope: "national" },
    { date: "2027-05-06", name: "Ascension Day of Jesus Christ", scope: "national" },
    { date: "2027-05-17", name: "Idul Adha", scope: "national", tentative: true },
    { date: "2027-05-20", name: "Waisak Day", scope: "national", tentative: true },
    { date: "2027-06-01", name: "Pancasila Day", scope: "national" },
    { date: "2027-06-06", name: "Islamic New Year", scope: "national", tentative: true },
    { date: "2027-08-15", name: "Maulid Nabi Muhammad", scope: "national", tentative: true },
    { date: "2027-08-17", name: "Indonesian Independence Day", scope: "national" },
    { date: "2027-12-25", name: "Christmas Day", scope: "national" },
    { date: "2027-12-26", name: "Isra Mi'raj", scope: "national", tentative: true },
    { date: "2028-01-01", name: "New Year's Day", scope: "national" },
  ],
};

/**
 * Caveats a country carries that the dates alone cannot express.
 *
 * Shown next to the results, because each one is a case where a correct
 * calendar still produces a misleading plan.
 */
const NOTES = {
  CN: "Golden Week is paid for: the State Council moves the neighbouring Saturday or Sunday to a working day, and publishes the swap each autumn. Those make-up days are not in this calendar, so a Chinese break shown here can cost a weekend it does not mention.",
  ID: "2027 is an estimate. Indonesia fixes its holidays by joint decree a few months ahead, and the 2027 decree is not published yet. The collective-leave days (cuti bersama) it usually adds around Idul Fitri are not included, so the real year will be more generous.",
  GB: "Scotland keeps a different list — 2 January and St Andrew's Day instead of Easter Monday — and Northern Ireland adds two more. These are the days common to England and Wales.",
  IN: "Gazetted national holidays. Your state adds its own, and most IT employers publish a shorter list than the government's.",
  AU: "State lists diverge sharply after the national days: Labour Day alone falls in March, May and October depending on where you sit.",
  CH: "Only four holidays are federal. The rest are cantonal, and the ones here are those a majority of cantons keep.",
  DE: "Nine holidays are nationwide; Bavaria and Baden-Württemberg keep several more. The ones here are those observed in at least half the states.",
  MY: "State lists vary widely, and several holidays follow a moon sighting. The ones here are those kept in at least half the states.",
  AE: "The Islamic dates depend on a moon sighting and are typically confirmed only days ahead; the UAE also often extends Eid by decree.",
};

/* ========================================================================== */
/* Fetching                                                                   */
/* ========================================================================== */

async function cachedFetch(name, url) {
  const path = join(CACHE, name);
  if (!REFRESH && existsSync(path)) return readFileSync(path, "utf8");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const text = await res.text();
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(path, text, "utf8");
  return text;
}

const googleUrl = (cal) =>
  `https://calendar.google.com/calendar/ical/en.${cal}%23holiday%40group.v.calendar.google.com/public/basic.ics`;

const nagerUrl = (year, iso) =>
  `https://date.nager.at/api/v3/PublicHolidays/${year}/${iso}`;

/* ========================================================================== */
/* iCalendar parsing                                                          */
/* ========================================================================== */

/**
 * Undoes RFC 5545 line folding, then RFC 5545 TEXT escaping.
 *
 * Both steps are load-bearing and the second one is easy to skip. Inside a
 * DESCRIPTION a comma is written `\,` and a line break `\n` — as literal
 * backslash sequences, not as the characters themselves. Splitting a
 * subdivision list on a bare comma without unescaping first leaves a trailing
 * backslash glued to every name, so "Victoria\" and "Victoria" count as two
 * different states and every share calculation comes out low.
 */
function unescapeText(value) {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function parseIcs(text) {
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const events = [];
  for (const [, block] of unfolded.matchAll(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/g)) {
    const field = (name) => {
      const m = block.match(new RegExp(`^${name}[^:\\r\\n]*:(.*)$`, "m"));
      return m ? unescapeText(m[1].trim()) : "";
    };
    const start = field("DTSTART");
    if (!/^\d{8}$/.test(start)) continue; // skip timed/recurring oddities
    events.push({
      start,
      end: field("DTEND"),
      name: field("SUMMARY"),
      desc: field("DESCRIPTION"),
    });
  }
  return events;
}

const isoOf = (yyyymmdd) =>
  `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;

/** DTEND is exclusive, so a three-day festival is one event, not three. */
function expandDays(ev) {
  const start = new Date(`${isoOf(ev.start)}T00:00:00Z`);
  const end = /^\d{8}$/.test(ev.end)
    ? new Date(`${isoOf(ev.end)}T00:00:00Z`)
    : new Date(start.getTime() + 86400000);
  const out = [];
  for (let d = start; d < end; d = new Date(d.getTime() + 86400000)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

const firstLine = (desc) => desc.split("\n")[0].trim();

function subdivisionsOf(desc) {
  const m = firstLine(desc).match(/^Public holiday in (.+)$/);
  if (!m) return null;
  return m[1].split(",").map((s) => s.trim()).filter(Boolean);
}

/** Google appends these to the SUMMARY; the date and scope already say it. */
const SUMMARY_SUFFIX = /\s*\((?:regional|substitute|observed|common local) holiday\)\s*$/i;

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dayNameOf = (iso) => DAY_NAMES[new Date(`${iso}T00:00:00Z`).getUTCDay()];

/* ========================================================================== */
/* Per-country extraction                                                     */
/* ========================================================================== */

function extractCountry(country, ics) {
  const events = parseIcs(ics);

  // The denominator: every subdivision this calendar ever names, minus the
  // rounding-error territories. Derived rather than hardcoded so a country
  // that gains a state does not silently skew every share.
  const union = new Set();
  for (const ev of events) {
    for (const s of subdivisionsOf(ev.desc) ?? []) {
      if (!MINOR_SUBDIVISIONS.has(s)) union.add(s);
    }
  }

  /** One entry per date. Ties are broken toward the wider observance. */
  const byDate = new Map();

  for (const ev of events) {
    const head = firstLine(ev.desc);
    if (!head.startsWith("Public holiday")) continue; // observances, seasons
    if (/half-day/i.test(ev.desc)) continue; // not a day off

    const subs = subdivisionsOf(ev.desc);
    let share = 1;
    if (subs) {
      const counted = subs.filter((s) => !MINOR_SUBDIVISIONS.has(s));
      share = union.size ? counted.length / union.size : 1;
      if (share < MIN_SUBDIVISION_SHARE) continue;
    }

    const name = ev.name.replace(SUMMARY_SUFFIX, "").trim();
    const tentative = /tentative/i.test(ev.desc);

    for (const date of expandDays(ev)) {
      if (date < WINDOW_START || date > WINDOW_END) continue;
      const existing = byDate.get(date);
      if (existing && existing.share >= share) continue;
      byDate.set(date, { date, name, share, tentative });
    }
  }

  // Supplements fill gaps rather than override: where the calendar already has
  // the date, the published source wins.
  for (const extra of SUPPLEMENTS[country.code] ?? []) {
    if (extra.date < WINDOW_START || extra.date > WINDOW_END) continue;
    if (byDate.has(extra.date)) continue;
    byDate.set(extra.date, {
      date: extra.date,
      name: extra.name,
      share: extra.scope === "national" ? 1 : MIN_SUBDIVISION_SHARE,
      tentative: Boolean(extra.tentative),
      supplemented: true,
    });
  }

  return {
    subdivisions: union.size,
    holidays: [...byDate.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((h) => ({
        id: `${country.code.toLowerCase()}-${h.date}`,
        name: h.name,
        date: h.date,
        day: dayNameOf(h.date),
        // "national" everywhere it is not qualified, so the common case reads
        // as the plain fact it is; "most" carries the caveat the UI shows.
        scope: h.share === 1 ? "national" : "most",
        ...(h.share === 1 ? {} : { observedShare: Math.round(h.share * 100) }),
        // Hijri dates depend on a moon sighting nobody can schedule. Saying so
        // in the data is the only honest option: the alternative is a site
        // that states Eid to the day and is wrong about it one year in three.
        ...(h.tentative ? { tentative: true } : {}),
      })),
  };
}

/* ========================================================================== */
/* Main                                                                       */
/* ========================================================================== */

const warnings = [];

/**
 * India and the United States keep their hand-curated lists.
 *
 * Both predate this script and both are better than what it would produce.
 * India's is the DoPT gazetted list with five states layered under it, which
 * Google's calendar does not carry at all; the US one states each federal
 * holiday once on the date it is actually observed, where Google lists 4 July
 * 2026 twice — once on the Saturday and once on the Friday it moves to.
 *
 * So they are read out of holidays.json rather than out of an .ics, and the
 * `countries` block becomes a view onto them rather than a second copy. That
 * is the whole point: a second copy is a thing that drifts, and outputs/
 * faq.test.ts asserts against the originals.
 */
function fromCuratedList(code, rows) {
  return {
    subdivisions: 0,
    holidays: rows
      .filter((h) => h.date >= WINDOW_START && h.date <= WINDOW_END)
      .map((h) => ({
        id: h.id,
        name: h.name,
        date: h.date,
        day: dayNameOf(h.date),
        scope: "national",
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

async function main() {
  const existing = JSON.parse(readFileSync(OUT, "utf8"));
  const countries = {};
  const coverage = [];

  for (const country of COUNTRIES) {
    let extracted;
    if (country.code === "IN") {
      extracted = fromCuratedList("IN", existing.national_holidays);
    } else if (country.code === "US") {
      extracted = fromCuratedList("US", existing.state_specific_holidays.USA);
    } else {
      const ics = await cachedFetch(`${country.cal}.ics`, googleUrl(country.cal));
      extracted = extractCountry(country, ics);
    }
    const { subdivisions, holidays } = extracted;

    const perYear = Object.fromEntries(
      REQUIRED_YEARS.map((y) => [y, holidays.filter((h) => h.date.startsWith(y)).length])
    );

    // A country missing a whole year is not "a bit thin", it is a calendar that
    // stops mid-way while the UI goes on claiming it is covered. Rather than
    // ship that, the run says so loudly and the country is left out by hand.
    for (const y of REQUIRED_YEARS) {
      if (perYear[y] < 5) {
        warnings.push(
          `${country.code} (${country.name}): only ${perYear[y]} holidays for ${y} — too thin to publish.`
        );
      }
    }

    countries[country.code] = {
      name: country.name,
      group: country.group,
      hub: country.hub,
      weekend: country.weekend ?? [0, 6],
      subdivisions,
      ...(NOTES[country.code] ? { note: NOTES[country.code] } : {}),
      source:
        country.code === "IN" || country.code === "US"
          ? "Curated list — see `sources` above"
          : `Google public holiday calendar (en.${country.cal})`,
      holidays,
    };
    coverage.push({ code: country.code, ...perYear, subdivisions });
  }

  // ---- cross-check against Nager.Date ------------------------------------
  const diffs = [];
  for (const country of COUNTRIES) {
    if (!country.nager) continue;
    for (const year of REQUIRED_YEARS) {
      let rows;
      try {
        rows = JSON.parse(
          await cachedFetch(`nager-${country.nager}-${year}.json`, nagerUrl(year, country.nager))
        );
      } catch {
        continue;
      }
      const theirs = new Set(rows.filter((r) => r.global).map((r) => r.date));
      const ours = new Set(
        countries[country.code].holidays
          .filter((h) => h.date.startsWith(year))
          .map((h) => h.date)
      );
      const missing = [...theirs].filter((d) => !ours.has(d));
      if (missing.length) {
        diffs.push(`${country.code} ${year}: in Nager.Date but not ours — ${missing.join(", ")}`);
      }
    }
  }

  console.log("coverage (holidays per year, after filtering):");
  for (const c of coverage) {
    console.log(
      `  ${c.code}  2026=${String(c[2026]).padStart(2)}  2027=${String(c[2027]).padStart(2)}  subdivisions=${c.subdivisions}`
    );
  }

  if (diffs.length) {
    console.log("\ncross-check against Nager.Date (review each before shipping):");
    for (const d of diffs) console.log(`  ${d}`);
  }

  if (warnings.length) {
    console.log("\nWARNINGS:");
    for (const w of warnings) console.log(`  ${w}`);
  }

  if (REPORT_ONLY) return;


  existing.countries = countries;
  existing.countryOrder = COUNTRIES.map((c) => c.code);
  existing.sources = [
    ...existing.sources.filter((s) => !s.startsWith("Google")),
    "Google public holiday calendars (calendar.google.com), cross-checked against Nager.Date",
  ];
  writeFileSync(OUT, `${JSON.stringify(existing, null, 2)}\n`, "utf8");
  console.log(`\nwrote ${OUT} — ${Object.keys(countries).length} countries`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

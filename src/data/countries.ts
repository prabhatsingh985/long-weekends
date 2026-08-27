/**
 * The country list, as the rest of the site sees it.
 *
 * holidays.json is generated (see scripts/build-holidays.mjs) and is shaped for
 * the generator's convenience. This module is the shape the UI wants: an
 * ordered array, a lookup by code, the continent groups the picker draws, and
 * the two legacy region values still in circulation.
 *
 * Nothing here re-states a fact from the data file. Counts are derived, groups
 * are derived from each country's own `group`, and the order is the order the
 * generator wrote — so adding a country to scripts/build-holidays.mjs is the
 * only edit needed to make it appear everywhere on the site.
 */
import holidaysData from "../../holidays.json";

export interface CountryHoliday {
  id: string;
  name: string;
  date: string;
  day: string;
  /** "national" everywhere, or "most" where a majority of states observe it. */
  scope: "national" | "most";
  /** Percentage of subdivisions observing it; present only when scope is "most". */
  observedShare?: number;
  /** Hijri and other sighting-dependent dates, which can move by a day. */
  tentative?: boolean;
}

export interface Country {
  code: string;
  name: string;
  group: string;
  /** Where the work is, for the country page. Not used in the solver. */
  hub: string;
  /**
   * The two weekday numbers that are rest days, most-significant first
   * (0 = Sunday). The first is the one a six-day work week keeps.
   */
  weekend: [number, number];
  /** Caveat shown beside the results; absent for most countries. */
  note?: string;
  source: string;
  holidays: CountryHoliday[];
}

const raw = holidaysData.countries as Record<string, Omit<Country, "code">>;

export const COUNTRIES: Country[] = (holidaysData.countryOrder as string[]).map(
  (code) => ({ code, ...raw[code] }) as Country
);

export const COUNTRY_BY_CODE: Record<string, Country> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c])
);

export const COUNTRY_CODES = COUNTRIES.map((c) => c.code);

/**
 * The two region values that predate the country list.
 *
 * "ALL" meant Pan-India and "USA" meant the US federal calendar, and both are
 * still live in three places that cannot simply be renamed: the footer's
 * `/?region=ALL` links, any URL a visitor has already shared, and
 * outputs/faq.test.ts. They resolve to the ISO codes rather than being
 * migrated, so old links keep working forever at the cost of two map entries.
 */
export const LEGACY_REGIONS: Record<string, string> = { ALL: "IN", USA: "US" };

/**
 * India's state groupings, layered on top of the national list.
 *
 * These are region values in their own right — "SOUTH" resolves to India plus
 * Karnataka and Tamil Nadu — and they are the reason region codes are not
 * simply ISO codes. No other country has sub-national data, so no other
 * country has entries here.
 */
export const INDIA_SUB_REGIONS: Record<string, string[]> = {
  SOUTH: ["KA", "TN"],
  WEST: ["MH"],
  NORTH: ["DL"],
  EAST: ["WB"],
};

/** Resolves any region value — ISO code, legacy alias, or India sub-region. */
export function resolveCountryCode(region: string): string {
  if (LEGACY_REGIONS[region]) return LEGACY_REGIONS[region];
  if (INDIA_SUB_REGIONS[region]) return "IN";
  return COUNTRY_BY_CODE[region] ? region : "IN";
}

/** True for any value the region control will accept. */
export function isKnownRegion(region: string): boolean {
  return (
    region in LEGACY_REGIONS ||
    region in INDIA_SUB_REGIONS ||
    region in COUNTRY_BY_CODE
  );
}

/**
 * The continent groups, in the order the generator listed them.
 *
 * Derived rather than declared so a new group needs no edit here — the first
 * country to carry it creates it, in the position it first appears.
 */
export interface CountryGroup {
  name: string;
  countries: Country[];
}

export const COUNTRY_GROUPS: CountryGroup[] = COUNTRIES.reduce<CountryGroup[]>(
  (groups, country) => {
    const found = groups.find((g) => g.name === country.group);
    if (found) found.countries.push(country);
    else groups.push({ name: country.group, countries: [country] });
    return groups;
  },
  []
);

/**
 * How many holidays a country has in a given calendar year.
 *
 * Used by the country index and by the tests that check the copy. It counts
 * the data rather than a stored number, because a stored number is a second
 * source of truth for a question the data already answers.
 */
export function holidayCount(country: Country, year: string): number {
  return country.holidays.filter((h) => h.date.startsWith(year)).length;
}

/** Countries whose data carries at least one sighting-dependent date. */
export function hasTentativeDates(country: Country): boolean {
  return country.holidays.some((h) => h.tentative);
}

/**
 * Extra words the picker's filter box should match on.
 *
 * The country name alone is not what people type. "UK" is the only name half
 * the country uses for itself and does not appear in "United Kingdom"; nobody
 * searching for the Netherlands is guaranteed to spell it; and a developer
 * looking for their own office types the city, not the country. Names, ISO
 * codes and the `hub` cities are matched automatically — this covers what is
 * left.
 */
export const SEARCH_ALIASES: Record<string, string> = {
  US: "usa america united states states",
  GB: "uk britain great britain england scotland wales british",
  AE: "uae emirates dubai abu dhabi",
  KR: "korea south korea rok",
  TR: "turkey turkiye",
  CZ: "czech czech republic",
  NL: "holland dutch",
  CH: "swiss suisse schweiz",
  DE: "deutschland",
  // "Bangalore" is the spelling most of the world still types, and the city was
  // renamed in 2014 — so the hub field says Bengaluru and the search has to
  // accept both, or the country this site was built for is unfindable by its
  // best-known city.
  IN: "bharat bangalore bombay mumbai delhi ncr chennai gurgaon noida",
  VN: "viet nam saigon",
  HK: "hongkong",
  ZA: "rsa south africa",
  NZ: "aotearoa",
  IE: "eire republic of ireland",
  PH: "pilipinas",
  MY: "malaysian",
  EG: "misr",
  IL: "israeli",
  GR: "hellas hellenic",
  AT: "osterreich austrian",
  BE: "belgian",
  SE: "sverige",
  NO: "norge",
  DK: "danmark",
  FI: "suomi",
  PL: "polska",
  BR: "brasil",
  MX: "mexico mejico",
  JP: "nippon japanese",
  CN: "prc mainland china",
  TW: "roc chinese taipei",
};

/** Everything the picker's filter matches a country on, pre-lowercased. */
export function searchTextFor(country: Country): string {
  return [country.code, country.name, country.hub, SEARCH_ALIASES[country.code] ?? ""]
    .join(" ")
    .toLowerCase();
}

/**
 * A short label for the country's rest days, e.g. "Fri–Sat".
 *
 * Worth surfacing because it silently changes every answer on the page. Israel
 * and Egypt rest on Friday and Saturday, so their Sunday holidays are real days
 * off rather than ones the weekend already covered — a reader who assumes
 * Saturday-Sunday will read those results as wrong when they are right.
 */
const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function weekendLabel(country: Country): string {
  const [a, b] = [...country.weekend].sort((x, y) => x - y);
  // Sunday is 0, so a Saturday-Sunday weekend sorts to [0, 6] and would read
  // "Sun–Sat", which is a week rather than a weekend.
  if (a === 0 && b === 6) return "Sat–Sun";
  return `${SHORT_DAYS[a]}–${SHORT_DAYS[b]}`;
}

/**
 * The country data, checked against the promises the site makes about it.
 *
 * outputs/faq.test.ts pins the numbers the copy quotes for India and the US.
 * This file is the equivalent for the other forty-five: not their exact dates,
 * which are generated and would make this a transcription of the data file, but
 * the invariants that have to hold for any of them to be safe to publish.
 *
 * The distinction matters. A test asserting "Germany has 12 holidays in 2026"
 * fails every time the data is regenerated and teaches nobody anything. A test
 * asserting "every country the picker offers can actually answer a query" fails
 * only when something is genuinely broken — a calendar that stopped mid-year, a
 * country with no artwork, a weekend that silently reverted to Saturday-Sunday.
 *
 * Every call passes an explicit `fromDate`. The solver otherwise filters from
 * today, so a suite written without it would pass in January and fail in
 * December for no reason but the calendar.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  COUNTRIES,
  COUNTRY_BY_CODE,
  COUNTRY_GROUPS,
  LEGACY_REGIONS,
  resolveCountryCode,
  isKnownRegion,
  searchTextFor,
  weekendLabel,
  holidayCount,
} from "../src/data/countries";
import { FLAGS } from "../src/data/flags";
import { getBannerTheme } from "../src/scripts/plan-view";
import {
  solveVacationPlans,
  buildCalendarMap,
  cleanFestivalName,
  BRIDGE_DAY,
  CALENDAR_START,
  CALENDAR_END,
} from "../src/data/vacation-solver";

/** Before the first day the data covers, so nothing is filtered as "past". */
const WHOLE_WINDOW = "2025-12-31";

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const COUNTRIES_PAGE = read("../src/pages/countries.astro");
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Every plan title the site can produce, solved once.
 *
 * Two title assertions below each need the whole cross-product of countries and
 * leave budgets, and running the solver twice over forty-seven calendars inside
 * `it()` bodies took long enough to trip vitest's five-second per-test timeout —
 * intermittently, which is the worst way for a suite to fail. Hoisted to module
 * scope it runs once, during import, where there is no such clock.
 */
const EVERY_TITLE = [1, 2].flatMap((leaves) =>
  COUNTRIES.flatMap((c) =>
    solveVacationPlans({ leaves, region: c.code, fromDate: WHOLE_WINDOW }).map(
      (p) => p.title
    )
  )
);

describe("the country list", () => {
  it("covers the countries the picker claims, with no duplicates", () => {
    expect(COUNTRIES.length).toBeGreaterThanOrEqual(40);
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("keeps India and the United States, whose lists the FAQ pins", () => {
    expect(COUNTRY_BY_CODE.IN?.name).toBe("India");
    expect(COUNTRY_BY_CODE.US?.name).toBe("United States");
  });

  it("puts every country in exactly one continent group", () => {
    const grouped = COUNTRY_GROUPS.flatMap((g) => g.countries.map((c) => c.code));
    expect(grouped.sort()).toEqual(COUNTRIES.map((c) => c.code).sort());
  });

  /**
   * A missing flag renders the neutral fallback tile rather than breaking, so
   * nothing would visibly fail — the picker would just show a country with a
   * grey rectangle beside forty-six drawn ones, which is the kind of fault that
   * ships.
   */
  it("has drawn artwork for every country", () => {
    const noArt = COUNTRIES.filter((c) => !FLAGS[c.code]).map((c) => c.code);
    expect(noArt).toEqual([]);
  });

  it("gives every country a hub, a group and a source", () => {
    const incomplete = COUNTRIES.filter(
      (c) => !c.hub || !c.group || !c.source
    ).map((c) => c.code);
    expect(incomplete).toEqual([]);
  });
});

describe("every country's holiday list is fit to publish", () => {
  it.each(COUNTRIES.map((c) => [c.code, c.name] as const))(
    "%s (%s) covers both 2026 and 2027",
    (code) => {
      const country = COUNTRY_BY_CODE[code];
      // Five is the floor the generator warns at. A country below it is not
      // thin, it is a calendar that stops mid-way while the UI goes on
      // claiming it is covered.
      expect(holidayCount(country, "2026")).toBeGreaterThanOrEqual(5);
      expect(holidayCount(country, "2027")).toBeGreaterThanOrEqual(5);
    }
  );

  it("states the weekday each date actually falls on", () => {
    const wrong = COUNTRIES.flatMap((c) =>
      c.holidays
        .filter((h) => DAYS[new Date(`${h.date}T00:00:00Z`).getUTCDay()] !== h.day)
        .map((h) => `${c.code} ${h.date} says ${h.day}: ${h.name}`)
    );
    expect(wrong).toEqual([]);
  });

  it("lists each date at most once per country", () => {
    const dupes = COUNTRIES.flatMap((c) => {
      const seen = new Set<string>();
      return c.holidays
        .filter((h) => (seen.has(h.date) ? true : (seen.add(h.date), false)))
        .map((h) => `${c.code} ${h.date}`);
    });
    expect(dupes).toEqual([]);
  });

  /**
   * A date outside the solver's window is invisible: buildCalendarMap never
   * walks to it, so it is carried in the file, counted on the country page, and
   * absent from every result. Silent disagreement between what the page says a
   * country has and what the planner can offer.
   */
  it("holds no date the solver's calendar cannot reach", () => {
    const outside = COUNTRIES.flatMap((c) =>
      c.holidays
        .filter((h) => h.date < CALENDAR_START || h.date > CALENDAR_END)
        .map((h) => `${c.code} ${h.date}`)
    );
    expect(outside).toEqual([]);
  });

  it("marks a holiday as national or as observed by most of the country", () => {
    const bad = COUNTRIES.flatMap((c) =>
      c.holidays
        .filter((h) => h.scope !== "national" && h.scope !== "most")
        .map((h) => `${c.code} ${h.date} scope=${h.scope}`)
    );
    expect(bad).toEqual([]);
  });

  /** `scope: "most"` is the caveat the UI shows; without the share it cannot. */
  it("records the observed share wherever the scope is not national", () => {
    const missing = COUNTRIES.flatMap((c) =>
      c.holidays
        .filter((h) => h.scope === "most" && typeof h.observedShare !== "number")
        .map((h) => `${c.code} ${h.date}`)
    );
    expect(missing).toEqual([]);
  });
});

describe("every country can answer the question the site asks of it", () => {
  it.each(COUNTRIES.map((c) => [c.code, c.name] as const))(
    "%s (%s) yields plans at zero and one leave",
    (code) => {
      const free = solveVacationPlans({ leaves: 0, region: code, fromDate: WHOLE_WINDOW });
      const one = solveVacationPlans({ leaves: 1, region: code, fromDate: WHOLE_WINDOW });
      // A country offering nothing at either budget is one whose card on
      // /countries reads "0 free breaks, 1 leave → 0 days" — a dead entry in a
      // list whose whole purpose is to say we cover it.
      expect(free.length + one.length).toBeGreaterThan(0);
      expect(one.some((p) => p.totalDaysOff >= 3)).toBe(true);
    }
  );

  it("gives each country its own answer rather than India's", () => {
    const firstFree = (code: string) =>
      solveVacationPlans({ leaves: 0, region: code, fromDate: WHOLE_WINDOW })
        .map((p) => p.startDate)
        .sort()[0];
    // Sampled rather than exhaustive: two countries sharing a first free break
    // is a coincidence, not a bug — Christmas is on the same day everywhere.
    const answers = new Set(["IN", "US", "JP", "IL", "BR", "TH"].map(firstFree));
    expect(answers.size).toBeGreaterThanOrEqual(4);
  });
});

describe("region values resolve the way the URLs promise", () => {
  it("keeps the two legacy values working", () => {
    // Every ?region=ALL / ?region=USA link shared before the country picker
    // existed still has to land on the right calendar.
    expect(LEGACY_REGIONS).toEqual({ ALL: "IN", USA: "US" });
    expect(resolveCountryCode("ALL")).toBe("IN");
    expect(resolveCountryCode("USA")).toBe("US");
    expect(isKnownRegion("ALL")).toBe(true);
    expect(isKnownRegion("USA")).toBe(true);
  });

  /**
   * "SOUTH", "WEST", "NORTH" and "EAST" used to mean India plus one or two
   * state gazettes. They are not region values any more, and a link carrying
   * one has to fall back to India rather than resolve to something that no
   * longer exists.
   */
  it("no longer accepts the retired India sub-regions", () => {
    for (const key of ["SOUTH", "WEST", "NORTH", "EAST"]) {
      expect(isKnownRegion(key)).toBe(false);
      expect(resolveCountryCode(key)).toBe("IN");
    }
  });

  it("resolves every country code to itself", () => {
    for (const c of COUNTRIES) {
      expect(resolveCountryCode(c.code)).toBe(c.code);
      expect(isKnownRegion(c.code)).toBe(true);
    }
  });

  /** applyParams() gates on isKnownRegion, so junk must not reach the solver. */
  it("rejects a value it cannot answer for, and falls back to India", () => {
    expect(isKnownRegion("ZZ")).toBe(false);
    expect(isKnownRegion("")).toBe(false);
    expect(resolveCountryCode("ZZ")).toBe("IN");
  });

  it("solves a legacy value identically to the code it resolves to", () => {
    const viaAlias = solveVacationPlans({ leaves: 1, region: "USA", fromDate: WHOLE_WINDOW });
    const viaCode = solveVacationPlans({ leaves: 1, region: "US", fromDate: WHOLE_WINDOW });
    expect(viaAlias.map((p) => p.id)).toEqual(viaCode.map((p) => p.id));
  });

  /**
   * The state-layering pass is gone, so a retired sub-region value now solves
   * as plain India rather than India plus a gazette. This is the assertion that
   * the layering really was removed and not merely hidden from the picker.
   */
  it("solves a retired sub-region identically to India", () => {
    const national = solveVacationPlans({ leaves: 0, region: "IN", fromDate: WHOLE_WINDOW });
    const south = solveVacationPlans({ leaves: 0, region: "SOUTH", fromDate: WHOLE_WINDOW });
    expect(south.map((p) => p.id)).toEqual(national.map((p) => p.id));
  });

  it("offers no country whose calendar is sub-national", () => {
    // Every code the picker can produce is a country, not a region inside one.
    const nonCountry = COUNTRIES.filter((c) => !/^[A-Z]{2}$/.test(c.code)).map((c) => c.code);
    expect(nonCountry).toEqual([]);
  });
});

/**
 * The reason `weekend` exists as data rather than a constant.
 *
 * Israel's working week runs Sunday to Thursday. With a hardcoded
 * Saturday-Sunday weekend, every Israeli Sunday holiday was absorbed into a
 * weekend the reader does not actually have, and every Friday was shown as a
 * working day they would need to book leave for — an answer wrong in both
 * directions at once, on a calendar that looked entirely plausible.
 */
describe("countries that do not rest on Saturday and Sunday", () => {
  it("gives Israel a Friday-Saturday weekend and Egypt the same", () => {
    expect(weekendLabel(COUNTRY_BY_CODE.IL)).toBe("Fri–Sat");
    expect(weekendLabel(COUNTRY_BY_CODE.EG)).toBe("Fri–Sat");
    expect(weekendLabel(COUNTRY_BY_CODE.US)).toBe("Sat–Sun");
    expect(weekendLabel(COUNTRY_BY_CODE.IN)).toBe("Sat–Sun");
  });

  it("treats Israeli Fridays as off and Israeli Sundays as working", () => {
    const cal = buildCalendarMap("IL", 5);
    // 2026-06-05 is a Friday, 2026-06-07 the Sunday after it.
    expect(cal.get("2026-06-05")?.isWeekend).toBe(true);
    expect(cal.get("2026-06-07")?.isWeekend).toBe(false);
  });

  it("still treats Sunday as the weekend everywhere else", () => {
    const cal = buildCalendarMap("US", 5);
    expect(cal.get("2026-06-07")?.isWeekend).toBe(true);
    expect(cal.get("2026-06-05")?.isWeekend).toBe(false);
  });

  /**
   * The six-day switch drops the country's SECOND rest day, not Saturday
   * specifically — which is why `weekend` is ordered. For India that leaves
   * Sunday; for Israel it has to leave Saturday, not Friday.
   */
  it("keeps the right day when the work week is six days", () => {
    const india = buildCalendarMap("IN", 6);
    expect(india.get("2026-06-07")?.isWeekend).toBe(true); // Sunday
    expect(india.get("2026-06-06")?.isWeekend).toBe(false); // Saturday

    const israel = buildCalendarMap("IL", 6);
    expect(israel.get("2026-06-06")?.isWeekend).toBe(true); // Saturday
    expect(israel.get("2026-06-05")?.isWeekend).toBe(false); // Friday
  });
});

describe("the picker's filter finds what people type", () => {
  it.each([
    ["bangalore", "IN"],
    ["bengaluru", "IN"],
    ["america", "US"],
    ["uk", "GB"],
    ["britain", "GB"],
    ["holland", "NL"],
    ["emirates", "AE"],
    ["seoul", "KR"],
    ["tokyo", "JP"],
    ["são paulo", "BR"],
    ["czech", "CZ"],
    ["turkey", "TR"],
  ])("%s matches %s", (query, code) => {
    // The same substring test createMenu applies to `data-search`.
    expect(searchTextFor(COUNTRY_BY_CODE[code])).toContain(query.toLowerCase());
  });

  it("gives every country a searchable string carrying its code and name", () => {
    for (const c of COUNTRIES) {
      const hay = searchTextFor(c);
      expect(hay).toContain(c.code.toLowerCase());
      expect(hay).toContain(c.name.toLowerCase());
      expect(hay).toBe(hay.toLowerCase());
    }
  });
});

/**
 * Card titles are built by collapsing each holiday in the window to the
 * festival it belongs to and joining what is left.
 *
 * That worked while every name was an Indian or American festival. The other
 * calendars publish their multi-day holidays as separate rows with scaffolding
 * words on them — "Spring Festival Eve", "Second day of Chinese New Year",
 * "Substitute Bank Holiday for Boxing Day" — and each one arrived as a distinct
 * "festival", so a ten-day Lunar New Year came out titled "Spring Festival
 * Holiday & Spring Festival Eve & Chinese New Year".
 */
describe("plan titles name festivals, not the scaffolding around them", () => {
  it.each([
    ["Spring Festival Eve", "Spring Festival"],
    ["Second day of Chinese New Year", "Chinese New Year"],
    ["Chinese New Year's Day", "Chinese New Year"],
    ["Day off for Constitution Day", "Constitution"],
    ["Substitute Bank Holiday for Boxing Day", "Boxing"],
    ["The day following the Mid-Autumn Festival", "Mid-Autumn Festival"],
    // Google writes the typographic apostrophe; the curated lists write the
    // typewriter one. A rule that knows only one silently skips 45 countries.
    ["Presidents’ Day", "Presidents"],
    ["New Year’s Holiday", "New Year"],
    ["All Saints' Day", "All Saints"],
    // The originals, which must not regress.
    ["Diwali/Deepavali", "Diwali"],
    ["Mahatma Gandhi's Birthday", "Mahatma Gandhi"],
    ["Independence Day", "Independence"],
  ])("%s collapses to %s", (raw, expected) => {
    expect(cleanFestivalName(raw)).toBe(expected);
  });

  it("never reduces a name to nothing", () => {
    const empties = COUNTRIES.flatMap((c) =>
      c.holidays.filter((h) => !cleanFestivalName(h.name).trim()).map((h) => h.name)
    );
    expect(empties).toEqual([]);
  });

  /**
   * A bridge day exists because of the holidays either side of it. Japan and
   * Argentina both publish one, and it was being named in titles as though it
   * were an occasion: "Respect for the Aged & Bridge Public +1 more".
   */
  it("does not name a bridge day beside a real festival", () => {
    expect(cleanFestivalName("Bridge Public holiday")).toBe(BRIDGE_DAY);
    expect(cleanFestivalName("Tourist Bridge Holiday")).toBe(BRIDGE_DAY);

    const withBridge = EVERY_TITLE.filter(
      (t) => t.includes(BRIDGE_DAY) && t.includes("&")
    );
    expect(withBridge).toEqual([]);
  });

  it("caps a title at two festivals and a count", () => {
    const overlong = EVERY_TITLE.filter((t) => (t.match(/&/g) ?? []).length > 1);
    expect(overlong).toEqual([]);
  });
});

/**
 * Result cards are coloured and given a motif by matching the holiday's name
 * against THEME_RULES. Adding forty-five countries added roughly a thousand
 * names those rules had never seen: half of every card on the site fell through
 * to the grey "Public holiday" fallback, so a Japanese Golden Week and a German
 * Whit Monday looked like the same undifferentiated tile.
 *
 * A threshold rather than an exact figure, because the long tail is genuinely
 * long — Kenya's Mashujaa Day is not worth a rule of its own — and the point is
 * to catch a regression, not to freeze the rule list.
 */
describe("result cards are themed rather than falling back to grey", () => {
  const themed = COUNTRIES.flatMap((c) =>
    c.holidays.map((h) =>
      getBannerTheme({
        festivalName: h.name,
        title: h.name,
        startDate: h.date,
      } as never)
    )
  );

  it("gives at least 90% of holidays a specific theme", () => {
    const generic = themed.filter((t) => t.season === "Public holiday").length;
    expect(generic / themed.length).toBeLessThan(0.1);
  });

  it("does not paint Lunar New Year as a midwinter holiday", () => {
    // "Chinese New Year" contains "new year", so before the lunar rules were
    // added ahead of the winter one it was drawn with a snowflake.
    const cny = getBannerTheme({
      festivalName: "Chinese New Year",
      title: "Chinese New Year",
      startDate: "2026-02-17",
    } as never);
    expect(cny.season).toBe("Lunar new year");
  });

  it("keeps India's and the US's own festivals on their existing themes", () => {
    const diwali = getBannerTheme({
      festivalName: "Diwali",
      title: "Diwali",
      startDate: "2026-11-08",
    } as never);
    expect(diwali.season).toBe("Festival of lights");

    const july4 = getBannerTheme({
      festivalName: "Independence Day",
      title: "Independence",
      startDate: "2026-07-03",
    } as never);
    expect(july4.season).toBe("Fourth of July");
  });
});

/**
 * The coverage page states its numbers by deriving them. These check that it
 * still does — a hardcoded count is the one way that page can lie, and it is
 * the page whose entire job is to be believed.
 */
describe("the coverage page counts rather than claims", () => {
  it("derives its totals from the data", () => {
    expect(COUNTRIES_PAGE).toContain("const total = COUNTRIES.length;");
    expect(COUNTRIES_PAGE).toContain("solveVacationPlans({");
  });

  it("never writes the country count as a literal in its copy", () => {
    const body = COUNTRIES_PAGE.split("---").slice(2).join("---");
    expect(body).not.toContain(`${COUNTRIES.length} countries`);
    expect(body).toContain("{total}");
  });

  it("links every country to a region-filtered homepage URL", () => {
    expect(COUNTRIES_PAGE).toContain("href={`/?region=${country.code}`}");
  });
});

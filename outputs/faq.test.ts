/**
 * Every number the site states out loud, recomputed from the shipped solver.
 *
 * Six files across the codebase have cited this test as the reason their
 * figures can be trusted — index.astro's FAQ says "every number below is
 * recomputed from the shipped solver by outputs/faq.test.ts", and about.astro
 * says the same. For a long time neither this file nor a runner existed, so
 * those claims were decoration. Every assertion here held when it was written;
 * the point is that they cannot quietly stop holding.
 *
 * If a change to holidays.json moves one of these, that is not a broken
 * test — it is the copy on two pages going out of date, and both have to be
 * edited with it.
 *
 * Every call passes an explicit `fromDate`. The solver otherwise filters from
 * today, so a suite written without it would pass in January and fail in
 * December for no reason but the calendar.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  solveVacationPlans,
  cleanFestivalName,
  CALENDAR_END,
  NATIONAL_HOLIDAYS,
  STATE_SPECIFIC_HOLIDAYS,
} from "../src/data/vacation-solver";
import type { VacationPlan } from "../src/types";

/** Before the first day the data covers, so nothing is filtered as "past". */
const WHOLE_YEAR = "2025-12-31";

const solve = (leaves: number, region: "ALL" | "USA" = "ALL"): VacationPlan[] =>
  solveVacationPlans({ leaves, workWeek: 5, region, fromDate: WHOLE_YEAR });

/** Plans starting inside calendar 2026 — the year the copy is about. The data
 *  runs to 2027-01-10 so New Year plans would otherwise inflate every count. */
const inCalendar2026 = (plans: VacationPlan[]) =>
  plans.filter((p) => p.startDate.startsWith("2026"));

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const INDEX = read("../src/pages/index.astro");
const ABOUT = read("../src/pages/about.astro");

describe("free long weekends (0 leaves)", () => {
  const free = inCalendar2026(solve(0));

  it("there are nine, and every one is exactly three days", () => {
    expect(free).toHaveLength(9);
    expect(free.every((p) => p.totalDaysOff === 3)).toBe(true);
  });

  it("falls on the nine dates the FAQ enumerates", () => {
    expect(free.map((p) => p.startDate).sort()).toEqual([
      "2026-01-24",
      "2026-02-14",
      "2026-04-03",
      "2026-05-01",
      "2026-06-26",
      "2026-08-28",
      "2026-10-02",
      "2026-09-04",
      "2026-12-25",
    ].sort());
  });

  it("leaves March, July and November with nothing free", () => {
    const months = new Set(free.map((p) => p.startDate.slice(5, 7)));
    expect(months.has("03")).toBe(false);
    expect(months.has("07")).toBe(false);
    expect(months.has("11")).toBe(false);
  });

  it("December's only free break is 25-27 Dec", () => {
    const dec = free.filter((p) => p.startDate.slice(5, 7) === "12");
    expect(dec).toHaveLength(1);
    expect(dec[0].startDate).toBe("2026-12-25");
    expect(dec[0].endDate).toBe("2026-12-27");
  });

  it("is stated as nine on both pages that quote it", () => {
    expect(INDEX).toContain("<strong>Nine</strong>");
    expect(INDEX).toContain("nine long weekends in 2026 that cost no leave");
    expect(ABOUT).toContain("nine long weekends that cost no leave at all");
  });
});

describe("one leave day", () => {
  const four = inCalendar2026(solve(1)).filter((p) => p.totalDaysOff === 4);

  it("buys 22 four-day breaks across 13 festivals", () => {
    expect(four).toHaveLength(22);
    const festivals = new Set(four.map((p) => cleanFestivalName(p.festivalName)));
    expect(festivals.size).toBe(13);
  });

  it("the earliest is Republic Day, 23-26 January", () => {
    const earliest = [...four].sort((a, b) =>
      a.startDate.localeCompare(b.startDate)
    )[0];
    expect(earliest.startDate).toBe("2026-01-23");
    expect(earliest.endDate).toBe("2026-01-26");
  });

  it("bridges New Year into a four-day run ending 3 January 2027", () => {
    const ny = solve(1).find((p) => p.startDate === "2026-12-31");
    expect(ny).toBeDefined();
    expect(ny!.totalDaysOff).toBe(4);
    expect(ny!.endDate).toBe("2027-01-03");
  });

  it("is stated as 22 across 13 on both pages that quote it", () => {
    expect(INDEX).toContain("four-day break 22 times over, across 13 different festivals");
    expect(ABOUT).toContain("<strong>22 four-day breaks</strong>");
    expect(ABOUT).toContain("13 different festivals");
  });
});

describe("the spring cluster", () => {
  it("two leaves buy six days from 31 March to 5 April", () => {
    const best = solve(2).reduce((a, b) => (b.totalDaysOff > a.totalDaysOff ? b : a));
    expect(best.totalDaysOff).toBe(6);
    expect(best.startDate).toBe("2026-03-31");
    expect(best.endDate).toBe("2026-04-05");
  });

  it("no other month of 2026 reaches six days on two leaves", () => {
    const six = inCalendar2026(solve(2)).filter((p) => p.totalDaysOff === 6);
    expect(six).toHaveLength(1);
  });

  it("three leaves buy nine days from 28 March", () => {
    const best = solve(3).reduce((a, b) => (b.totalDaysOff > a.totalDaysOff ? b : a));
    expect(best.totalDaysOff).toBe(9);
    expect(best.startDate).toBe("2026-03-28");
    expect(best.endDate).toBe("2026-04-05");
  });
});

describe("the longest runs the year allows", () => {
  /** Scoped to 2026: the FAQ question is "…in 2026?", and the data now runs
   *  through 2027, whose own clusters are a different answer to a different
   *  question. */
  const maxAt = (leaves: number) =>
    inCalendar2026(solve(leaves)).reduce((a, b) =>
      b.totalDaysOff > a.totalDaysOff ? b : a
    );

  it("10 leaves reach 18 days, 19 March to 5 April", () => {
    const best = maxAt(10);
    expect(best.totalDaysOff).toBe(18);
    expect(best.startDate).toBe("2026-03-19");
    expect(best.endDate).toBe("2026-04-05");
  });

  /**
   * The reason the FAQ answer had to be reworded. It called 18 days "the
   * longest run the year allows" while the solver went on producing longer
   * ones for anyone with the balance to spend.
   */
  it("but longer runs exist above 10 leaves, so 18 is not the ceiling", () => {
    expect(maxAt(11).totalDaysOff).toBe(19);
    expect(maxAt(13).totalDaysOff).toBe(21);
  });

  it("the FAQ no longer claims 18 is the maximum", () => {
    expect(INDEX).not.toContain("The longest run the year allows");
    expect(INDEX).toContain("The longest one worth taking");
    expect(INDEX).toContain("11 leaves buys 19 days in February, 13 buys 21");
  });
});

describe("the gazetted national list", () => {
  const in2026 = NATIONAL_HOLIDAYS.filter((h) => h.date.startsWith("2026"));

  /** Only index.astro states this figure in its body. about.astro names DoPT as
   *  the source but never quotes the count, so there is nothing to pin there. */
  it("holds 17 holidays in calendar 2026", () => {
    expect(in2026).toHaveLength(17);
    expect(INDEX).toContain("<strong>17 gazetted national holidays</strong>");
  });

  it("splits 9 on a Friday or Monday, 3 on a weekend, 5 midweek", () => {
    const dow = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();
    const fridayOrMonday = in2026.filter((h) => dow(h.date) === 5 || dow(h.date) === 1);
    const onWeekend = in2026.filter((h) => dow(h.date) === 0 || dow(h.date) === 6);
    const midweek = in2026.filter((h) => {
      const d = dow(h.date);
      return d >= 2 && d <= 4;
    });

    expect(fridayOrMonday).toHaveLength(9);
    expect(onWeekend).toHaveLength(3);
    expect(midweek).toHaveLength(5);
    // The FAQ's "twelve touch a weekend" is these first two groups together.
    expect(fridayOrMonday.length + onWeekend.length).toBe(12);
    expect(INDEX).toContain("<strong>Twelve of the 17 gazetted national holidays</strong>");
  });

  it("the three swallowed by a weekend are the ones the FAQ names", () => {
    const dow = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();
    const names = in2026
      .filter((h) => dow(h.date) === 0 || dow(h.date) === 6)
      .map((h) => cleanFestivalName(h.name))
      .sort();
    expect(names).toEqual(["Diwali", "Id-ul-Fitr", "Independence"]);
  });
});

describe("state holiday counts quoted on both pages", () => {
  /** Per calendar year: the file now holds 2026 and 2027, and the sentence in
   *  the FAQ is about 2026. */
  it.each([
    ["KA", 7],
    ["MH", 4],
    ["DL", 3],
    ["WB", 3],
    ["TN", 2],
  ])("%s carries %i in 2026", (code, count) => {
    const list = STATE_SPECIFIC_HOLIDAYS[code as keyof typeof STATE_SPECIFIC_HOLIDAYS];
    expect(list.filter((h) => h.date.startsWith("2026"))).toHaveLength(count);
  });

  it("is stated the same way in the FAQ", () => {
    expect(INDEX).toContain(
      "seven more for Karnataka, four for Maharashtra, three each for Delhi and West Bengal, and two for Tamil Nadu"
    );
  });
});

describe("the US federal calendar", () => {
  const usa = STATE_SPECIFIC_HOLIDAYS.USA;

  /** Neither is a federal holiday, and Easter is always a Sunday, so it used to
   *  produce a plan titled "Easter Sunday (Post-Break)". */
  it("carries neither Good Friday nor Easter Sunday", () => {
    const names = usa.map((h) => h.name);
    expect(names).not.toContain("Good Friday");
    expect(names).not.toContain("Easter Sunday");
  });

  it("names Independence Day once, on the observed date", () => {
    const july = usa.filter((h) => h.date.startsWith("2026-07"));
    expect(july).toHaveLength(1);
    expect(july[0].date).toBe("2026-07-03");
    // The duplicate pair used to render as "Independence Day Holiday & Independence".
    const plan = solve(0, "USA").find((p) => p.startDate === "2026-07-03");
    expect(plan?.title).toBe("Independence");
  });

  /** The window runs to 2027-01-10 and the Indian list already covered it, so a
   *  US visitor in late December silently lost the New Year break. */
  it("reaches New Year's Day 2027, like the national list does", () => {
    expect(usa.some((h) => h.date === "2027-01-01")).toBe(true);
    expect(solve(0, "USA").some((p) => p.startDate === "2027-01-01")).toBe(true);
  });
});

describe("the FAQ and its structured data cannot disagree", () => {
  /**
   * Google treats a FAQPage whose markup contradicts the visible answer as
   * spam, which is why index.astro renders both from one `FAQ` array. This
   * guards the arrangement rather than the text: if anyone gives the JSON-LD
   * its own copy of the prose, `item.a` stops being the single source.
   */
  it("renders both the accordion and the JSON-LD from the same item.a", () => {
    expect(INDEX).toContain("mainEntity: FAQ.map(");
    expect(INDEX).toContain("acceptedAnswer: { \"@type\": \"Answer\", text: item.a }");
    expect(INDEX).toContain("set:html={item.a}");
  });

  it("escapes < before inlining the schema into a script element", () => {
    expect(INDEX).toContain('JSON.stringify(faqSchema).replace(/</g, "\\\\u003c")');
  });
});

/* ==========================================================================
   2027 — added so the calendar does not run dry mid-year
   ==========================================================================
   These exist because of a question with a concrete answer: what does someone
   arriving in November see? While the data stopped at 2027-01-10, the answer
   was "two months and seven options", and by 5 January 2027 it was "nothing at
   all". Extending the window is the only fix for that; these tests stop it
   silently shrinking back.
*/
describe("the 2027 calendar", () => {
  const in2027 = NATIONAL_HOLIDAYS.filter((h) => h.date.startsWith("2027"));

  it("carries the 17 gazetted holidays of DoPT's 2027 list", () => {
    expect(in2027).toHaveLength(17);
  });

  /**
   * India and the US bridge differently here, which is the point of checking
   * both. 1 January 2028 is a Saturday, so on the Indian calendar it buys
   * nothing on its own and Friday 31 December costs a leave day. US federal
   * rules move the observance to that Friday, so the same weekend is free.
   */
  it("reaches into 2028 so a New Year break can bridge", () => {
    expect(CALENDAR_END).toBe("2028-01-10");

    const india = solve(1).find((p) => p.startDate === "2027-12-31");
    expect(india?.endDate).toBe("2028-01-02");

    const usa = solve(0, "USA").find((p) => p.startDate === "2027-12-31");
    expect(usa?.endDate).toBe("2028-01-02");
  });

  it("gives India five free long weekends in 2027", () => {
    const free = solve(0).filter((p) => p.startDate.startsWith("2027"));
    expect(free.map((p) => p.startDate).sort()).toEqual([
      "2027-01-01",
      "2027-03-26",
      "2027-04-17",
      "2027-05-15",
      "2027-10-29",
    ]);
  });
});

describe("every holiday row is internally consistent", () => {
  const all = [
    ...NATIONAL_HOLIDAYS.map((h) => ({ ...h, scope: "national" })),
    ...Object.entries(STATE_SPECIFIC_HOLIDAYS).flatMap(([k, v]) =>
      v.map((h) => ({ ...h, scope: k }))
    ),
  ];
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  /** A mistyped weekday is the easiest error to make when hand-entering a
   *  gazette and the hardest to notice, because nothing reads the field. */
  it("states the weekday its own date actually falls on", () => {
    const wrong = all
      // A few rows label a multi-day festival as a span ("Sunday to Wednesday").
      .filter((h) => !h.day.includes(" to "))
      .filter((h) => DAYS[new Date(`${h.date}T00:00:00Z`).getUTCDay()] !== h.day)
      .map((h) => `${h.scope} ${h.date} says ${h.day}: ${h.name}`);
    expect(wrong).toEqual([]);
  });

  it("uses each id once", () => {
    const ids = all.map((h) => h.id);
    expect(ids.length - new Set(ids).size).toBe(0);
  });

  it("lists each date at most once within a list", () => {
    const dupes: string[] = [];
    const check = (rows: { date: string }[], label: string) => {
      const seen = new Set<string>();
      rows.forEach((r) => {
        if (seen.has(r.date)) dupes.push(`${label} ${r.date}`);
        seen.add(r.date);
      });
    };
    check(NATIONAL_HOLIDAYS, "national");
    Object.entries(STATE_SPECIFIC_HOLIDAYS).forEach(([k, v]) => check(v, k));
    expect(dupes).toEqual([]);
  });
});

describe("a festival that recurs is not deduplicated across years", () => {
  /**
   * The bug adding 2027 exposed. The canonical-deal key was
   * `festival + strategy + leaves`, which is unique only while the data holds
   * one year. With two, "Good Friday__zero__0" matched both 2026 and 2027, the
   * first written won, and the second disappeared from the results entirely.
   */
  it("Good Friday gives a free weekend in both 2026 and 2027", () => {
    const free = solve(0).map((p) => p.startDate);
    expect(free).toContain("2026-04-03");
    expect(free).toContain("2027-03-26");
  });

  it("every recurring US federal holiday survives into 2027", () => {
    const free2027 = solve(0, "USA").filter((p) => p.startDate.startsWith("2027"));
    // Nine of these vanished under the old key; all of them recur by name.
    expect(free2027.length).toBeGreaterThanOrEqual(9);
    expect(free2027.map((p) => p.startDate)).toContain("2027-09-04"); // Labor Day
    expect(free2027.map((p) => p.startDate)).toContain("2027-12-24"); // Christmas
  });

  it("keeps both New Years of 2027 — 1 January and the observed 31 December", () => {
    const usa = solve(0, "USA").map((p) => p.startDate);
    expect(usa).toContain("2027-01-01");
    expect(usa).toContain("2027-12-31");
  });
});

describe("runway: what a visitor actually finds, by the month they arrive", () => {
  /**
   * The regression that matters most to a launched site. Each row is a real
   * arrival date; the assertion is that the tool still has something to say.
   * Before 2027 was added, November returned 7 one-leave options and January
   * 2027 returned zero.
   */
  const runway = (fromDate: string) =>
    solveVacationPlans({ leaves: 1, workWeek: 5, region: "ALL", fromDate });

  it.each([
    ["2026-11-01", 20],
    ["2026-12-01", 20],
    ["2027-01-05", 15],
    ["2027-06-01", 8],
  ])("arriving %s still finds at least %i one-leave breaks", (from, min) => {
    expect(runway(from).length).toBeGreaterThanOrEqual(min);
  });

  it("spans more than a single calendar year from any 2026 arrival", () => {
    const months = new Set(runway("2026-11-01").map((p) => p.startDate.slice(0, 7)));
    expect(months.size).toBeGreaterThanOrEqual(8);
  });
});

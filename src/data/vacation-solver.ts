import type { VacationPlan, CalendarDay, RegionCode } from "../types";
import holidaysData from "../../holidays.json";
import { COUNTRY_BY_CODE, resolveCountryCode } from "./countries";

/**
 * India's gazetted list, kept as a named export because outputs/faq.test.ts
 * pins figures against it and the homepage copy quotes those figures.
 *
 * The data file was `holidays_2026.json` and this binding was
 * `NATIONAL_HOLIDAYS_2026`, back when it held a single year. It now carries
 * 2026 and 2027, so both names were about to become false — and a year baked
 * into a name invites the worse mistake of adding a second file beside it and
 * having two sources of truth for the same question.
 */
export const NATIONAL_HOLIDAYS = holidaysData.national_holidays;

/**
 * The US federal schedule, hand-transcribed from the OPM list.
 *
 * It used to live under `state_specific_holidays.USA` — the United States
 * modelled as a state of India, which was a workable joke at two calendars and
 * nonsense at forty-seven. It has its own key now. Like NATIONAL_HOLIDAYS it is
 * exported because `countries.US` is generated from it and the tests check the
 * two agree.
 */
export const US_FEDERAL_HOLIDAYS = holidaysData.us_federal_holidays;

/** Re-exported for convenience; the single definition lives in ../types. It
 *  used to be imported above AND redeclared here, which is a TS conflict. */
export type { RegionCode };

/**
 * Inclusive bounds of the holiday data we actually hold.
 *
 * These two strings are the ONLY place the window is written. buildCalendarMap
 * used to repeat them as `new Date(2026, 0, 1)` and `new Date(2027, 0, 10)`,
 * which meant extending the calendar required editing the same fact in three
 * places and the two copies could disagree without anything failing — the
 * solver would simply stop finding breaks in a year the data covered.
 *
 * The end runs ten days past the last full year so a New Year break can be
 * bridged from December into January.
 */
export const CALENDAR_START = "2026-01-01";
export const CALENDAR_END = "2028-01-10";

/**
 * Today, clamped into the span the holiday data covers.
 *
 * The previous version fell back to a hardcoded "2026-08-20" for any date
 * before the window and did nothing at all for dates after the data ends — so
 * once the calendar ran out, every query silently returned zero plans with no
 * way for the UI to tell "no matches" apart from "we have run out of calendar".
 * Callers compare against CALENDAR_END, or call isCalendarExhausted(), to tell
 * the two apart; the results grid does exactly that in its empty state.
 */
export function getTodayIso(): string {
  const now = new Date();
  const today = formatLocalIso(now);
  if (today < CALENDAR_START) return CALENDAR_START;
  if (today > CALENDAR_END) return CALENDAR_END;
  return today;
}

/** True once the bundled calendar can no longer answer "what's next". */
export function isCalendarExhausted(): boolean {
  return formatLocalIso(new Date()) > CALENDAR_END;
}

/**
 * The date a plan must start STRICTLY AFTER to count as upcoming.
 *
 * This is deliberately not `getTodayIso()`. A break that starts today, or that
 * started yesterday and is still running, cannot be planned for — you would
 * have had to file the leave already — so showing it as "next up" is wrong.
 * The solver therefore filters on `startDate > cutoff`, and this is the cutoff.
 *
 * The one case that needs care is a visitor whose clock is before the data
 * window (or a build run early). Clamping to CALENDAR_START the way
 * getTodayIso() does would combine with the strict `>` to silently drop every
 * plan starting on 1 January. The cutoff sits one day earlier instead, so the
 * whole calendar survives the filter.
 */
export function getUpcomingCutoffIso(): string {
  const today = formatLocalIso(new Date());
  if (today < CALENDAR_START) return "2025-12-31";
  if (today > CALENDAR_END) return CALENDAR_END;
  return today;
}

/**
 * Evaluated once when this module is first imported.
 *
 * In the browser that happens on page load, so it is the visitor's real current
 * date — which is what makes "next up" correct for someone returning days after
 * the site was built. Anything computed from this in page frontmatter, by
 * contrast, is frozen at build time; see the highlight list on the homepage,
 * which is re-filtered on the client for exactly that reason.
 */
export const CURRENT_DATE_REF = getUpcomingCutoffIso();

export interface SolverOptions {
  leaves: number;
  workWeek?: number;
  region?: RegionCode;
  month?: string;
  /**
   * Plans must start STRICTLY AFTER this date. Pass `getUpcomingCutoffIso()`,
   * not `getTodayIso()` — the latter clamps up to CALENDAR_START, which would
   * make the strict comparison drop every plan starting on 1 January.
   */
  fromDate?: string;
  customHolidays?: string[];
}

export function formatLocalIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Which weekdays are rest days for a region, honouring the work-week toggle.
 *
 * Two things this has to get right that a hardcoded Saturday-Sunday pair did
 * not. Israel and Egypt rest on Friday and Saturday, so treating their Sunday
 * as a weekend both hides a real working day and swallows the Sunday holidays
 * that are the whole point of their calendars. And the six-day toggle has to
 * drop the country's SECOND rest day, not Saturday specifically — which is why
 * `weekend` is ordered with the more significant day first.
 */
function weekendDaysFor(region: RegionCode, workWeek: number): Set<number> {
  const country = COUNTRY_BY_CODE[resolveCountryCode(region)];
  const [primary, secondary] = country?.weekend ?? [0, 6];
  return workWeek === 6 ? new Set([primary]) : new Set([primary, secondary]);
}

export function buildCalendarMap(
  region: RegionCode = "ALL",
  workWeek: number = 5,
  customHolidays?: string[]
): Map<string, CalendarDay> {
  const holidayMap = new Map<string, string>();
  const countryCode = resolveCountryCode(region);
  const country = COUNTRY_BY_CODE[countryCode];

  // Names a company list can borrow, so an uploaded date that happens to be a
  // real holiday shows its real name rather than "Company Holiday". Drawn from
  // the country in play rather than only from India's list, which is why an
  // American or German office list now gets named days too.
  const knownFestivals = new Map<string, string>();
  (country?.holidays ?? []).forEach((h) => knownFestivals.set(h.date, h.name));

  if (customHolidays && customHolidays.length > 0) {
    // An uploaded office list REPLACES the national list rather than merging
    // with it. That is deliberate: a plan built on a gazetted holiday the
    // user's employer does not observe would tell them to show up to an empty
    // office, or to burn PTO they did not budget for. The company list is the
    // authority on which days they actually get.
    customHolidays.forEach((dt) => {
      const festivalName = knownFestivals.get(dt) || "Company Holiday";
      holidayMap.set(dt, festivalName);
    });
  } else {
    /**
     * The country's own list, and nothing layered under it.
     *
     * There used to be a second pass here that merged Indian state gazettes on
     * top — Karnataka's list for "SOUTH", Maharashtra's for "WEST" and so on.
     * That went when the site became a country-level planner: sub-national
     * lists existed for exactly one of the forty-seven countries, so they made
     * India behave unlike everywhere else and implied a level of detail the
     * other forty-six could not match. Anyone whose real list differs from the
     * national one — which is most people — is better served by the Company
     * Holiday Optimizer, which plans against their actual days rather than a
     * guess based on where they live.
     */
    (country?.holidays ?? []).forEach((h) => {
      holidayMap.set(h.date, h.name);
    });
  }

  const weekendDays = weekendDaysFor(region, workWeek);
  const calendar = new Map<string, CalendarDay>();
  // Derived from the constants rather than repeated as literals — see the note
  // on CALENDAR_START. Parsed component-wise so the range is local midnight,
  // matching formatLocalIso below; `new Date("2026-01-01")` is UTC and would
  // start the calendar a day early for anyone east of Greenwich.
  const [sy, sm, sd] = CALENDAR_START.split("-").map(Number);
  const [ey, em, ed] = CALENDAR_END.split("-").map(Number);
  const startDate = new Date(sy, sm - 1, sd);
  const endDate = new Date(ey, em - 1, ed);

  const curr = new Date(startDate);
  while (curr <= endDate) {
    const isoDate = formatLocalIso(curr);
    const dayOfWeek = curr.getDay();
    const isWeekend = weekendDays.has(dayOfWeek);
    const isHol = holidayMap.has(isoDate);
    const holName = holidayMap.get(isoDate) || null;

    calendar.set(isoDate, {
      date: isoDate,
      dayOfWeek,
      isWeekend,
      isHoliday: isHol,
      holidayName: holName,
    });

    curr.setDate(curr.getDate() + 1);
  }

  return calendar;
}

function getDayName(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "short" });
}

function getDayNumber(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00");
  return String(d.getDate()).padStart(2, "0");
}

/**
 * Collapses a raw holiday name to the festival it belongs to.
 *
 * Exported because the highlight list has to group on the same notion of "same
 * festival" that titles are built from — otherwise "Raksha Bandhan" and
 * "Raksha Bandhan (Pre-Break)" read as two different festivals and the list
 * shows one weekend twice.
 */
/**
 * What a holiday that exists only because of its neighbours is called.
 *
 * Exported so the title builder can recognise it without matching on prose.
 */
export const BRIDGE_DAY = "Bridge Day";

export function cleanFestivalName(name: string): string {
  let cleaned = name.split("/")[0].split("(")[0].trim();

  /**
   * Scaffolding words a multi-day festival wears on its extra days.
   *
   * These arrived with the other forty-five countries and each one used to
   * produce a separate "festival". China's Spring Festival is published as
   * "Spring Festival Eve", "Chinese New Year" and seven days of "Spring
   * Festival Holiday"; Taiwan and Korea prefix their substitute days with "Day
   * off for"; Hong Kong writes "The day following the Mid-Autumn Festival". A
   * ten-day break built from those came out titled "Spring Festival Holiday &
   * Spring Festival Eve & Chinese New Year", which is one festival named three
   * times and read as three.
   *
   * Stripped in a loop because they stack: "Second day of Chinese New Year
   * Holiday" needs both ends taken off before it collapses onto the same
   * festival as the first day.
   */
  const LEADING =
    /^(?:the\s+)?(?:substitute\s+(?:bank\s+)?holiday\s+for|day\s+(?:off\s+for|following(?:\s+the)?)|first|second|third|fourth|fifth)\s+(?:day\s+of\s+)?/i;
  const TRAILING = /\s+(?:holidays?|eve|observed|golden\s+week\s+holiday)$/i;

  let previous: string;
  do {
    previous = cleaned;
    cleaned = cleaned.replace(LEADING, "").replace(TRAILING, "").trim();
  } while (cleaned !== previous && cleaned.length > 0);

  /**
   * Names that describe the mechanism rather than an occasion.
   *
   * Japan grants the weekday between two holidays automatically and calls it a
   * "Bridge Public holiday"; Argentina does the same as a "Tourist Bridge
   * Holiday". Stripping the scaffolding above leaves "Bridge Public", which is
   * not a thing — and it was appearing in card titles as though it were a
   * festival, next to the real one it bridges to.
   */
  if (/^(?:bridge\s+public|tourist\s+bridge|bridge|public)$/i.test(cleaned)) {
    return BRIDGE_DAY;
  }

  // Kept last, and kept separate: these trim a name down to the festival it
  // belongs to rather than removing scaffolding around it.
  //
  // Both apostrophes are matched. Google's calendars use the typographic one
  // ("Presidents’ Day", "New Year’s Holiday") while the hand-written Indian and
  // US lists use the typewriter one, and a rule that knows only about the
  // second silently stops working on forty-five countries.
  cleaned = cleaned
    .replace(/\s+Day$/, "")
    .replace(/\s+Jayanti$/, "")
    .replace(/['’]s\s+Birthday$/, "")
    // A trailing possessive, once "Day" is off the end. Without this the same
    // festival appears twice in one title: Singapore publishes both "Chinese
    // New Year's Day" and "Chinese New Year Holiday", which reduced to
    // "Chinese New Year's" and "Chinese New Year" and read as two festivals.
    // The cost is "Children" for Children's Day, which is a fair trade.
    .replace(/['’]s?$/, "")
    .trim();

  // Everything above can strip a name to nothing — "Holiday" on its own, or
  // "Day". A blank title is worse than a redundant one, so fall back.
  return cleaned || name.trim();
}

function generateDealTitle(
  primaryHoliday: string,
  totalDays: number,
  leavesNeeded: number,
  strategy: string,
  holidaysInWindow: { name: string }[]
): string {
  const distinctFestivals: string[] = [];
  holidaysInWindow.forEach(h => {
    const c = cleanFestivalName(h.name);
    if (!distinctFestivals.includes(c)) distinctFestivals.push(c);
  });

  /**
   * A bridge day is named only when it is all there is.
   *
   * It is a consequence of the holidays either side of it, not an occasion of
   * its own, so "Respect for the Aged & Bridge Day" names one festival and one
   * mechanism as though they were two festivals. Dropped when anything real is
   * in the window, kept when it is not — a window can consist of nothing else.
   */
  const named = distinctFestivals.filter((f) => f !== BRIDGE_DAY);
  if (named.length > 0) {
    distinctFestivals.length = 0;
    distinctFestivals.push(...named);
  }

  /**
   * At most two names, then a count.
   *
   * A long window can genuinely span four or five unrelated holidays — Japan's
   * Golden Week is Constitution Memorial, Greenery and Children's Day, and a
   * three-leave bridge picks up more. Joining all of them produced titles like
   * "Constitution Memorial & Greenery & Children's & Constitution Memorial Day
   * observed", which the card then truncated mid-word, so the reader got the
   * first name and an ellipsis. Two names and "+2 more" fits, and says the same
   * thing.
   */
  const festivalLabel =
    distinctFestivals.length === 0
      ? cleanFestivalName(primaryHoliday)
      : distinctFestivals.length <= 2
        ? distinctFestivals.join(" & ")
        : `${distinctFestivals.slice(0, 2).join(" & ")} +${distinctFestivals.length - 2} more`;

  if (leavesNeeded === 0) {
    return `${festivalLabel}`;
  }

  if (strategy === "pre") {
    return `${festivalLabel} (Pre-Break)`;
  } else if (strategy === "post") {
    return `${festivalLabel} (Post-Break)`;
  }

  return `${festivalLabel}`;
}

export function solveVacationPlans(options: SolverOptions): VacationPlan[] {
  const {
    leaves,
    workWeek = 5,
    region = "ALL",
    month = "ALL",
    fromDate = CURRENT_DATE_REF,
    customHolidays,
  } = options;

  const calendarMap = buildCalendarMap(region, workWeek, customHolidays);
  const calendar = Array.from(calendarMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  const plans: VacationPlan[] = [];
  const minDaysOff = leaves === 0 ? 3 : leaves + 2;
  const maxDaysOff = Math.min(leaves + 10, 21);

  for (let i = 0; i <= calendar.length - minDaysOff; i++) {
    for (let len = minDaysOff; len <= maxDaysOff; len++) {
      if (i + len > calendar.length) break;

      const window = calendar.slice(i, i + len);
      const startDay = window[0];
      const endDay = window[window.length - 1];

      // Window must connect to either a weekend/holiday on at least one end, or bridge between weekends
      const startConnected = startDay.isWeekend || startDay.isHoliday;
      const endConnected = endDay.isWeekend || endDay.isHoliday;
      
      if (!startConnected && !endConnected) continue;

      let leavesNeeded = 0;
      const holidaysInWindow: { name: string; date: string }[] = [];
      const leaveIndices: number[] = [];
      const holIndices: number[] = [];

      window.forEach((day, idx) => {
        if (!day.isWeekend && !day.isHoliday) {
          leavesNeeded += 1;
          leaveIndices.push(idx);
        }
        if (day.isHoliday && day.holidayName) {
          holidaysInWindow.push({ name: day.holidayName, date: day.date });
          holIndices.push(idx);
        }
      });

      if (holidaysInWindow.length === 0) continue;

      if (leavesNeeded !== leaves) continue;

      if (leavesNeeded > 0 && len / leavesNeeded < 1.3) continue;

      const minHolIdx = Math.min(...holIndices);
      const maxHolIdx = Math.max(...holIndices);

      let strategy: "zero" | "pre" | "post" | "bridge" = "bridge";
      if (leavesNeeded === 0) {
        if (!startConnected || !endConnected) continue;
        strategy = "zero";
      } else {
        const allLeavesBefore = leaveIndices.every(idx => idx < minHolIdx);
        const allLeavesAfter = leaveIndices.every(idx => idx > maxHolIdx);
        if (allLeavesBefore) strategy = "pre";
        else if (allLeavesAfter) strategy = "post";
        else strategy = "bridge";
      }

      const primaryHol = holidaysInWindow[0].name;
      const efficiency = leavesNeeded === 0 ? `${len}.0X FREE` : `${(len / leavesNeeded).toFixed(1)}X Efficiency`;
      const title = generateDealTitle(primaryHol, len, leavesNeeded, strategy, holidaysInWindow);

      const daysArray = window.map((d) => {
        let type: "weekend" | "holiday" | "leave" = "weekend";
        if (d.isHoliday) type = "holiday";
        else if (!d.isWeekend) type = "leave";

        return {
          date: d.date,
          dayName: getDayName(d.date),
          dayNum: getDayNumber(d.date),
          type,
          label: d.holidayName || undefined,
        };
      });

      plans.push({
        id: `plan_${startDay.date}_${endDay.date}_${leavesNeeded}_${len}`,
        title,
        startDate: startDay.date,
        endDate: endDay.date,
        totalDaysOff: len,
        leavesRequired: leavesNeeded,
        efficiencyMultiplier: efficiency,
        festivalName: primaryHol,
        strategy,
        days: daysArray,
      });
    }
  }

  /**
   * One canonical plan per festival OCCURRENCE, per strategy, per leave budget.
   *
   * The occurrence part is why the year is in the key. While the data held a
   * single year, `festival + strategy + leaves` was accidentally the same thing
   * — every festival appeared once. The moment 2027 was added it stopped being:
   * "Good Friday__zero__0" described Good Friday 2026 AND Good Friday 2027, the
   * first one written won every tie, and the second silently vanished from the
   * results. It cost the 2027 calendar its free Good Friday weekend and nine of
   * the eleven US federal ones, all of which recur under the same name.
   *
   * The occurrence is the window's FIRST HOLIDAY, identified by its exact date
   * rather than by its year. The year alone is not enough, and New Year is the
   * case that proves it: 1 January 2027 and the observed 31 December 2027 are
   * both "New Year's" in 2027, twelve months apart, and a year-granular key
   * threw the December one away. Not startDate either — a pre-break beginning
   * 31 December belongs to the January holiday inside it, not to the December
   * it starts in.
   *
   * What this still collapses is the only thing it was ever meant to: several
   * window LENGTHS around the same holiday at the same strategy and budget,
   * where the longest wins.
   */
  const canonicalDeals = new Map<string, VacationPlan>();

  plans.forEach((plan) => {
    const festKey = cleanFestivalName(plan.festivalName);
    const occurrence =
      plan.days.find((d) => d.type === "holiday")?.date ?? plan.startDate;
    const groupKey = `${festKey}__${occurrence}__${plan.strategy}__${plan.leavesRequired}`;

    const existing = canonicalDeals.get(groupKey);
    if (!existing) {
      canonicalDeals.set(groupKey, plan);
    } else {
      if (plan.totalDaysOff > existing.totalDaysOff) {
        canonicalDeals.set(groupKey, plan);
      } else if (plan.totalDaysOff === existing.totalDaysOff && plan.leavesRequired < existing.leavesRequired) {
        canonicalDeals.set(groupKey, plan);
      }
    }
  });

  let deduplicatedPlans = Array.from(canonicalDeals.values());

  // STRICT UPCOMING FILTER. `>` and not `>=`: a break that starts today has
  // already begun, and nobody can file leave for it retroactively, so it is not
  // something this tool can offer. Every surface — the results grid, the hero
  // badge, the month rail, the company optimizer — inherits the rule from here.
  if (fromDate) {
    deduplicatedPlans = deduplicatedPlans.filter((p) => p.startDate > fromDate);
  }

  if (month && month !== "ALL") {
    deduplicatedPlans = deduplicatedPlans.filter((p) => {
      const startMonth = p.startDate.split("-")[1];
      const endMonth = p.endDate.split("-")[1];
      return startMonth === month || endMonth === month;
    });
  }

  deduplicatedPlans.sort((a, b) => {
    if (b.totalDaysOff !== a.totalDaysOff) {
      return b.totalDaysOff - a.totalDaysOff;
    }
    return a.startDate.localeCompare(b.startDate);
  });

  return deduplicatedPlans;
}

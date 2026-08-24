import type { VacationPlan, CalendarDay, RegionCode } from "../types";
import holidaysData from "../../holidays_2026.json";

export const NATIONAL_HOLIDAYS_2026 = holidaysData.national_holidays;
export const STATE_SPECIFIC_HOLIDAYS = holidaysData.state_specific_holidays;

/** Re-exported for convenience; the single definition lives in ../types. It
 *  used to be imported above AND redeclared here, which is a TS conflict. */
export type { RegionCode };

export const REGION_STATE_MAP: Record<RegionCode, string[]> = {
  ALL: [],
  SOUTH: ["KA", "TN"],
  WEST: ["MH"],
  NORTH: ["DL"],
  EAST: ["WB"],
  USA: ["USA"],
};

/** Inclusive bounds of the holiday data we actually hold. */
export const CALENDAR_START = "2026-01-01";
export const CALENDAR_END = "2027-01-10";

/**
 * Today, clamped into the span the holiday data covers.
 *
 * The previous version fell back to a hardcoded "2026-08-20" for any date
 * before 2026 and did nothing at all for dates after the data ends — so from
 * 2027-01-11 onwards every query silently returned zero plans with no way for
 * the UI to tell "no matches" apart from "we have run out of calendar".
 * Callers can now compare against CALENDAR_END to detect that case.
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

export function buildCalendarMap(
  region: RegionCode = "ALL",
  workWeek: number = 5,
  customHolidays?: string[]
): Map<string, CalendarDay> {
  const holidayMap = new Map<string, string>();

  const knownFestivals = new Map<string, string>();
  NATIONAL_HOLIDAYS_2026.forEach((h) => knownFestivals.set(h.date, h.name));
  Object.values(STATE_SPECIFIC_HOLIDAYS).forEach((arr) => {
    arr.forEach((h) => {
      if (!knownFestivals.has(h.date)) knownFestivals.set(h.date, h.name);
    });
  });

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
  } else if (region === "USA") {
    const usaHols = STATE_SPECIFIC_HOLIDAYS["USA"] || [];
    usaHols.forEach((h) => {
      holidayMap.set(h.date, h.name);
    });
  } else {
    NATIONAL_HOLIDAYS_2026.forEach((h) => {
      holidayMap.set(h.date, h.name);
    });

    const states = REGION_STATE_MAP[region] || [];
    states.forEach((st) => {
      const stateHols = STATE_SPECIFIC_HOLIDAYS[st] || [];
      stateHols.forEach((h) => {
        if (!holidayMap.has(h.date)) {
          holidayMap.set(h.date, h.name);
        }
      });
    });
  }

  const calendar = new Map<string, CalendarDay>();
  const startDate = new Date(2026, 0, 1);
  const endDate = new Date(2027, 0, 10);

  const curr = new Date(startDate);
  while (curr <= endDate) {
    const isoDate = formatLocalIso(curr);
    const dayOfWeek = curr.getDay();
    const isWeekend = workWeek === 5 ? (dayOfWeek === 0 || dayOfWeek === 6) : (dayOfWeek === 0);
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
export function cleanFestivalName(name: string): string {
  let cleaned = name.split("/")[0].split("(")[0].trim();
  cleaned = cleaned.replace(/\s+Day$/, "").replace(/\s+Jayanti$/, "").replace(/'s Birthday$/, "").trim();
  return cleaned;
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

  const festivalLabel = distinctFestivals.length > 0 ? distinctFestivals.join(" & ") : cleanFestivalName(primaryHoliday);

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

  const canonicalDeals = new Map<string, VacationPlan>();

  plans.forEach((plan) => {
    const festKey = cleanFestivalName(plan.festivalName);
    const groupKey = `${festKey}__${plan.strategy}__${plan.leavesRequired}`;

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

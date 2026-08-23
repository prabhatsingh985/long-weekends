import type { VacationPlan, CalendarDay, RegionCode } from "../types";
import holidaysData from "../../holidays_2026.json";

export const NATIONAL_HOLIDAYS_2026 = holidaysData.national_holidays;
export const STATE_SPECIFIC_HOLIDAYS = holidaysData.state_specific_holidays;

export type RegionCode = "ALL" | "SOUTH" | "WEST" | "NORTH" | "EAST" | "USA";

export const REGION_STATE_MAP: Record<RegionCode, string[]> = {
  ALL: [],
  SOUTH: ["KA", "TN"],
  WEST: ["MH"],
  NORTH: ["DL"],
  EAST: ["WB"],
  USA: ["USA"],
};

export function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const today = `${y}-${m}-${d}`;
  return today >= "2026-01-01" ? today : "2026-08-20";
}

export const CURRENT_DATE_REF = getTodayIso();

export interface SolverOptions {
  leaves: number;
  workWeek?: number;
  region?: RegionCode;
  month?: string;
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

function cleanFestivalName(name: string): string {
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

  // STRICT UPCOMING FILTER: Vacation must start on or after fromDate (No past vacations)
  if (fromDate) {
    deduplicatedPlans = deduplicatedPlans.filter((p) => p.startDate >= fromDate);
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

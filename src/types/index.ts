/** A single day inside a plan, as produced by the solver. */
export interface PlanDay {
  date: string;
  /** Short weekday name, e.g. "Mon". */
  dayName: string;
  /** Zero-padded day of month, e.g. "08". */
  dayNum: string;
  type: "weekend" | "holiday" | "leave";
  /** Holiday name; only present when `type` is "holiday". */
  label?: string;
}

/**
 * A candidate break.
 *
 * This used to declare `month`, `state`, `vibe`, `formula`, `themes` and
 * `recommendedSpots` — fields left over from the retired hardcoded dataset that
 * the solver has never produced, and it was missing `festivalName` and
 * `strategy`, which the solver does. It now matches the real shape.
 */
export interface VacationPlan {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  totalDaysOff: number;
  leavesRequired: number;
  /** Pre-formatted display string, e.g. "4.0X Efficiency". */
  efficiencyMultiplier: string;
  /** Raw name of the first holiday in the window. */
  festivalName: string;
  strategy: "zero" | "pre" | "post" | "bridge";
  days: PlanDay[];
}

/**
 * A value the region control can hold.
 *
 * Three kinds of string live in here, and the union used to enumerate only the
 * first two:
 *   - "ALL" and "USA", the original two choices. They are aliases now, not
 *     codes, and they survive because the footer links and any URL a visitor
 *     has already shared still carry them.
 *   - "SOUTH" | "WEST" | "NORTH" | "EAST", India's state groupings, which
 *     layer state holidays on top of the national list.
 *   - an ISO-3166 alpha-2 country code, for each of the countries in
 *     holidays.json.
 *
 * It is a plain `string` rather than a union of all forty-seven codes on
 * purpose. The codes come from generated data — adding a country means running
 * scripts/build-holidays.mjs, not editing a type — so a hand-written union
 * would be a second list to keep in step, and it would go stale silently.
 * `isKnownRegion()` in src/data/countries.ts is the runtime check that a value
 * is one the data can actually answer for, and every entry point uses it.
 */
export type RegionCode = string;

export interface CalendarDay {
  date: string;
  dayOfWeek: number;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName: string | null;
}

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

export type RegionCode = "ALL" | "SOUTH" | "WEST" | "NORTH" | "EAST" | "USA";

export interface CalendarDay {
  date: string;
  dayOfWeek: number;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName: string | null;
}

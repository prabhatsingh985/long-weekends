/**
 * The interactive half of a results page: leave-budget pills, month rail,
 * sort menu, card grid, empty state and calendar dialog.
 *
 * The homepage and the company optimizer ran two near-identical copies of this
 * logic, which had already diverged — the optimizer's sort dropdown offered
 * different options, and its empty state was a dead end with no way out. Both
 * pages now mount this, supplying only a `solve` callback for where their
 * holidays come from.
 *
 * Required markup IDs are listed in `ResultsRefs` below; a missing one is
 * skipped rather than thrown, so a page can opt out of e.g. the month rail.
 */
import type { VacationPlan, CalendarDay } from "../types";
import {
  renderPlanGrid,
  renderPlanCalendar,
  formatDateRange,
  pluralLeaves,
  sortPlans,
  DEFAULT_SORT,
  type SortKey,
} from "./plan-view";
import { createMenu } from "./menu";
import { createDialog } from "./dialog";
import { MAX_LEAVES } from "../data/vacation-solver";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export interface ResultsOptions {
  /** All plans for a leave budget, unfiltered by month. */
  solve: (leaves: number) => VacationPlan[];
  /** Context for the modal grid: weekends/holidays outside the plan. */
  calendar?: () => Map<string, CalendarDay> | null;
  todayIso: string;
  /**
   * Inclusive ISO bounds for the month rail, e.g. the visitor's cutoff and
   * CALENDAR_END. The rail is built from this on the CLIENT.
   *
   * It used to be written in page frontmatter, which froze it at build time in
   * two ways that both got worse when the data grew past one year. It listed
   * months that had already passed — a build in August still offered August in
   * November, greyed out but occupying the rail — and it could not offer months
   * added after the build, so extending the calendar into 2027 would have left
   * eleven months of new content unreachable behind a rail that stopped at
   * January. Built here, it is always exactly the span the visitor can still
   * plan inside.
   */
  monthRange?: { from: string; to: string };
  initialLeaves?: number;
  /** Highest value the custom stepper will go to. Defaults to MAX_LEAVES. */
  maxLeaves?: number;
}

export interface ResultsHandle {
  /** Re-run the solver, e.g. after the region or work week changed. */
  refresh: () => void;
  /** Set the leave budget from outside, e.g. from the hero search. */
  setLeaves: (n: number) => void;
  getLeaves: () => number;
}

function el<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

export function mountResults(options: ResultsOptions): ResultsHandle | null {
  const grid = el<HTMLElement>("vacationGrid");
  if (!grid) return null;

  const maxLeaves = options.maxLeaves ?? MAX_LEAVES;

  const badge = el<HTMLElement>("resultsBadge");
  const subtext = el<HTMLElement>("resultsSubtext");
  const emptyState = el<HTMLElement>("emptyState");
  const emptyTitle = el<HTMLElement>("emptyStateTitle");
  const emptySub = el<HTMLElement>("emptyStateSub");
  const emptyAction = el<HTMLButtonElement>("emptyStateAction");

  const budgetRail = el<HTMLElement>("budgetRail");
  const monthRail = el<HTMLElement>("monthRail");
  const customWrapper = el<HTMLElement>("customChipWrapper");
  const customDisplay = el<HTMLElement>("customLeavesDisplay");
  const btnDec = el<HTMLButtonElement>("btnDecLeave");
  const btnInc = el<HTMLButtonElement>("btnIncLeave");

  // The stepper's own value button also carries data-leaves, but with the
  // literal "custom" — including it here would make Number() return NaN and
  // silently reset the budget to zero.
  const budgetPills = budgetRail
    ? Array.from(
        budgetRail.querySelectorAll<HTMLElement>(
          '[data-leaves]:not([data-leaves="custom"])'
        )
      )
    : [];
  /**
   * Pills are keyed "YYYY-MM", not "MM".
   *
   * A bare month number was unambiguous only while the data covered one year.
   * With 2026 and 2027 both present, filtering on "11" matched November in
   * BOTH — so picking November returned two different Novembers interleaved,
   * and the count beside the pill was the sum of two years.
   */
  function buildMonthRail(): HTMLElement[] {
    if (!monthRail || !options.monthRange) {
      return monthRail
        ? Array.from(monthRail.querySelectorAll<HTMLElement>("[data-month]"))
        : [];
    }

    const { from, to } = options.monthRange;
    const mk = (value: string, long: string, short: string) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pill";
      b.dataset.month = value;
      b.setAttribute("aria-pressed", String(value === "ALL"));
      const s1 = document.createElement("span");
      s1.className = "sm:hidden";
      s1.textContent = short;
      const s2 = document.createElement("span");
      s2.className = "hidden sm:inline";
      s2.textContent = long;
      b.append(s1, s2);
      return b;
    };

    const pills = [mk("ALL", "All months", "All")];
    let [y, m] = [Number(from.slice(0, 4)), Number(from.slice(5, 7))];
    const [ey, em] = [Number(to.slice(0, 4)), Number(to.slice(5, 7))];
    // Guard against a bad range spinning forever; 36 months is far more than
    // the data will ever hold.
    for (let guard = 0; guard < 36 && (y < ey || (y === ey && m <= em)); guard++) {
      const value = `${y}-${String(m).padStart(2, "0")}`;
      const name = MONTH_NAMES[m - 1];
      // The year is always shown. The rail now spans two calendar years, so
      // "Nov" alone no longer identifies a month.
      pills.push(mk(value, `${name} ${y}`, `${name.slice(0, 3)} ${String(y).slice(2)}`));
      if (++m > 12) {
        m = 1;
        y++;
      }
    }

    monthRail.replaceChildren(...pills);
    return pills;
  }

  const monthPills = buildMonthRail();

  /* --- state ------------------------------------------------------------- */
  let leaves = options.initialLeaves ?? 0;
  let customValue = 3;
  let month = "ALL";
  let sort: SortKey = DEFAULT_SORT;
  let all: VacationPlan[] = [];
  let visible: VacationPlan[] = [];

  /** True when `leaves` is only reachable through the stepper. */
  const isCustom = () => !budgetPills.some((p) => p.dataset.leaves === String(leaves));

  /* --- painting ---------------------------------------------------------- */
  function inMonth(plan: VacationPlan, key: string): boolean {
    // Matches the solver's own rule: a break that starts in October and ends in
    // November belongs to both months, because that is how a person looking for
    // "something in November" thinks about it.
    return plan.startDate.slice(0, 7) === key || plan.endDate.slice(0, 7) === key;
  }

  /** "November 2026" from a "2026-11" pill key. */
  function nameOf(key: string): string {
    return `${MONTH_NAMES[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
  }

  function monthLabel(): string {
    if (month === "ALL") return "every month still ahead";
    return nameOf(month);
  }

  function paintPills() {
    budgetPills.forEach((p) => {
      const on = p.dataset.leaves === String(leaves);
      p.setAttribute("aria-pressed", String(on));
    });
    monthPills.forEach((p) => {
      p.setAttribute("aria-pressed", String(p.dataset.month === month));
    });

    if (customWrapper) {
      // A <div role="group"> cannot carry aria-pressed, so the selected look is
      // a class that shares the pill's pressed rule.
      customWrapper.classList.toggle("is-on", isCustom());
    }
    if (customDisplay) customDisplay.textContent = String(customValue);
    if (btnDec) btnDec.disabled = customValue <= 1;
    if (btnInc) btnInc.disabled = customValue >= maxLeaves;
  }

  /**
   * Greys out months with nothing to show for the current budget. Without this
   * the rail happily offers a month and then returns an empty grid, which reads
   * as a broken tool rather than an empty month.
   */
  function paintMonthAvailability() {
    let selectedStillValid = month === "ALL";

    monthPills.forEach((p) => {
      const mm = p.dataset.month || "ALL";
      if (mm === "ALL") return;
      const count = all.filter((plan) => inMonth(plan, mm)).length;
      const btn = p as HTMLButtonElement;
      btn.disabled = count === 0;
      btn.title = count
        ? `${count} ${count === 1 ? "break" : "breaks"} in ${nameOf(mm)}`
        : `Nothing in ${nameOf(mm)} for this budget`;
      if (mm === month && count > 0) selectedStillValid = true;
    });

    // Never leave the user parked on a month that now has nothing in it.
    if (!selectedStillValid) month = "ALL";
  }

  function paintSummary() {
    const n = visible.length;
    if (badge) badge.textContent = n === 1 ? "1 break" : `${n} breaks`;
    if (subtext) {
      const cost = leaves === 0 ? "costing you nothing" : `costing ${pluralLeaves(leaves)} each`;
      subtext.textContent = `${cost}, across ${monthLabel()}`;
    }
  }

  /**
   * True when NO leave budget can produce a break — the bundled calendar is
   * spent, as opposed to this one budget being unlucky.
   *
   * Deliberately a probe rather than `isCalendarExhausted()`. That helper only
   * turns true after the last date in the data, but the results dry up well
   * before then: the final break sits weeks or months short of the end, and in
   * that gap the empty state used to tell a zero-leave visitor that "one leave
   * day is usually enough to bridge it" and offer a button that returned the
   * same empty grid. Asking the solver is the only way to know which of the two
   * situations this is.
   *
   * Only reached when the grid is already empty at "all months", so the extra
   * solver runs are rare and bounded.
   */
  function nextViableBudget(from: number): number | null {
    const ceiling = Math.min(maxLeaves, Math.max(from, 0) + 5);
    for (let l = Math.max(from, 0); l <= ceiling; l++) {
      if (options.solve(l).length > 0) return l;
    }
    return null;
  }

  /** True when NO budget produces anything: the calendar is spent. */
  function calendarIsSpent(): boolean {
    return nextViableBudget(0) === null;
  }

  function paintEmptyState() {
    if (!emptyState) return;
    const show = visible.length === 0;
    emptyState.hidden = !show;
    if (!show) return;

    // THREE different problems, and they need different answers. The third one
    // is the one this used to get wrong.
    const monthIsTheProblem = month !== "ALL" && all.length > 0;
    const spent = !monthIsTheProblem && all.length === 0 && calendarIsSpent();

    if (emptyTitle) {
      emptyTitle.textContent = spent
        ? "The calendar has run out"
        : monthIsTheProblem
          ? `Nothing worth taking in ${monthLabel()}`
          : leaves === 0
            ? "No free long weekends left"
            : `Nothing lines up for ${pluralLeaves(leaves)}`;
    }
    if (emptySub) {
      emptySub.textContent = spent
        ? "Every break on this calendar has already passed. More dates arrive when the next year's holiday list is published."
        : monthIsTheProblem
          ? `There are ${all.length} other breaks still ahead for this budget.`
          : leaves === 0
            ? "Every remaining public holiday falls mid-week. One leave day is usually enough to bridge it."
            : "Try a different number of leaves — the holidays left may need one more or one fewer.";
    }
    if (emptyAction) {
      if (monthIsTheProblem) {
        emptyAction.hidden = false;
        emptyAction.textContent = "Show every month";
        emptyAction.dataset.act = "clear-month";
      } else {
        /**
         * The suggested budget is the next one that ACTUALLY returns something,
         * not simply `leaves + 1`.
         *
         * An escape hatch that leads nowhere is worse than none, and +1 walks
         * into that constantly: an isolated midweek holiday needs two leave
         * days to reach a weekend at all, so a zero-leave visitor was offered
         * "Try 1 leave instead" and got the same empty grid back. When nothing
         * at any budget helps — the calendar is spent — the button goes away
         * rather than being relabelled.
         */
        const next = nextViableBudget(leaves + 1);
        emptyAction.hidden = next === null;
        if (next !== null) {
          emptyAction.textContent = `Try ${pluralLeaves(next)} instead`;
          emptyAction.dataset.act = "more-leaves";
          emptyAction.dataset.leaves = String(next);
        }
      }
    }
  }

  function paint() {
    grid.innerHTML = renderPlanGrid(visible);
    bindCardButtons();
    paintPills();
    paintSummary();
    paintEmptyState();
  }

  function applyFilter() {
    const filtered = month === "ALL" ? all : all.filter((p) => inMonth(p, month));
    visible = sortPlans(filtered, sort);
    paint();
  }

  function recompute() {
    all = options.solve(leaves);
    paintMonthAvailability();
    applyFilter();
  }

  /* --- calendar dialog --------------------------------------------------- */
  const modalRoot = el<HTMLElement>("calendarModal");
  const modalPanel = el<HTMLElement>("calendarDialog");
  const modalTitle = el<HTMLElement>("calModalTitle");
  const modalDates = el<HTMLElement>("calModalDates");
  const modalContent = el<HTMLElement>("calModalContent");

  const dialog =
    modalRoot && modalPanel
      ? createDialog({
          root: modalRoot,
          panel: modalPanel,
          closers: [el<HTMLElement>("btnCloseCalendarModal")],
        })
      : null;

  function openCalendar(plan: VacationPlan) {
    if (!dialog) return;
    if (modalTitle) modalTitle.textContent = plan.title;
    if (modalDates) {
      modalDates.textContent =
        `${formatDateRange(plan.startDate, plan.endDate)} · ${plan.totalDaysOff} days off · ` +
        (plan.leavesRequired ? pluralLeaves(plan.leavesRequired) : "no leave");
    }
    if (modalContent) {
      modalContent.innerHTML = renderPlanCalendar(
        plan,
        options.calendar?.() ?? null,
        options.todayIso
      );
    }
    dialog.open();
  }

  function bindCardButtons() {
    grid.querySelectorAll<HTMLElement>(".btn-open-cal").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.idx);
        const plan = visible[idx];
        if (plan) openCalendar(plan);
      });
    });
  }

  /* --- controls ---------------------------------------------------------- */
  budgetPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      leaves = Number(pill.dataset.leaves) || 0;
      recompute();
    });
  });

  function setCustom(n: number) {
    customValue = Math.min(maxLeaves, Math.max(1, n));
    leaves = customValue;
    recompute();
  }
  btnDec?.addEventListener("click", () => setCustom(customValue - 1));
  btnInc?.addEventListener("click", () => setCustom(customValue + 1));
  customWrapper
    ?.querySelector<HTMLElement>('[data-leaves="custom"]')
    ?.addEventListener("click", () => setCustom(customValue));

  monthPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      month = pill.dataset.month || "ALL";
      applyFilter();
    });
  });

  emptyAction?.addEventListener("click", () => {
    if (emptyAction.dataset.act === "clear-month") {
      month = "ALL";
      applyFilter();
    } else {
      // Whatever the label promised. It used to recompute `leaves + 1` here
      // while the label named the next VIABLE budget, so the two could differ
      // and the button would land somewhere other than where it said.
      setCustom(Number(emptyAction.dataset.leaves) || leaves + 1);
    }
  });

  const sortTrigger = el<HTMLElement>("sortTrigger");
  const sortMenu = el<HTMLElement>("sortMenu");
  if (sortTrigger && sortMenu) {
    createMenu({
      trigger: sortTrigger,
      menu: sortMenu,
      display: el<HTMLElement>("sortLabel"),
      valueAttr: "data-sort",
      onSelect: (v) => {
        sort = v as SortKey;
        applyFilter();
      },
    });
  }

  /* --- month rail overflow affordance ------------------------------------
     The scrollbar is hidden, so arrows and edge fades are the only cue that
     there is more rail. They appear only when there is actually somewhere to
     scroll, so they never lie about the content. */
  const railPrev = el<HTMLButtonElement>("monthRailPrev");
  const railNext = el<HTMLButtonElement>("monthRailNext");
  const fadeL = el<HTMLElement>("monthFadeL");
  const fadeR = el<HTMLElement>("monthFadeR");

  function paintRail() {
    if (!monthRail) return;
    const max = monthRail.scrollWidth - monthRail.clientWidth;
    const atStart = monthRail.scrollLeft <= 2;
    const atEnd = monthRail.scrollLeft >= max - 2;
    const scrollable = max > 4;

    if (railPrev) railPrev.hidden = !scrollable || atStart;
    if (railNext) railNext.hidden = !scrollable || atEnd;
    fadeL?.setAttribute("data-visible", String(scrollable && !atStart));
    fadeR?.setAttribute("data-visible", String(scrollable && !atEnd));
  }

  if (monthRail) {
    const step = () => Math.max(160, monthRail.clientWidth * 0.7);
    railPrev?.addEventListener("click", () =>
      monthRail.scrollBy({ left: -step(), behavior: "smooth" })
    );
    railNext?.addEventListener("click", () =>
      monthRail.scrollBy({ left: step(), behavior: "smooth" })
    );
    monthRail.addEventListener("scroll", paintRail, { passive: true });
    window.addEventListener("resize", paintRail);
    paintRail();
  }

  recompute();

  return {
    refresh: recompute,
    setLeaves(n: number) {
      leaves = Math.max(0, n);
      if (isCustom()) customValue = leaves;
      recompute();
    },
    getLeaves: () => leaves,
  };
}

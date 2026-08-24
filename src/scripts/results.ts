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
  initialLeaves?: number;
  /** Highest value the custom stepper will go to. */
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

  const maxLeaves = options.maxLeaves ?? 10;

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
  const monthPills = monthRail
    ? Array.from(monthRail.querySelectorAll<HTMLElement>("[data-month]"))
    : [];

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
  function inMonth(plan: VacationPlan, mm: string): boolean {
    // Matches the solver's own rule: a break that starts in October and ends in
    // November belongs to both months, because that is how a person looking for
    // "something in November" thinks about it.
    return plan.startDate.slice(5, 7) === mm || plan.endDate.slice(5, 7) === mm;
  }

  function monthLabel(): string {
    if (month === "ALL") return "every month left this year";
    return MONTH_NAMES[Number(month) - 1];
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
        ? `${count} ${count === 1 ? "break" : "breaks"} in ${MONTH_NAMES[Number(mm) - 1]}`
        : `Nothing in ${MONTH_NAMES[Number(mm) - 1]} for this budget`;
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

  function paintEmptyState() {
    if (!emptyState) return;
    const show = visible.length === 0;
    emptyState.hidden = !show;
    if (!show) return;

    // Two different problems need two different escape hatches.
    const monthIsTheProblem = month !== "ALL" && all.length > 0;
    if (emptyTitle) {
      emptyTitle.textContent = monthIsTheProblem
        ? `Nothing worth taking in ${monthLabel()}`
        : leaves === 0
          ? "No free long weekends left"
          : `Nothing lines up for ${pluralLeaves(leaves)}`;
    }
    if (emptySub) {
      emptySub.textContent = monthIsTheProblem
        ? `There are ${all.length} other breaks in the rest of the year for this budget.`
        : leaves === 0
          ? "Every remaining public holiday falls mid-week. One leave day is usually enough to bridge it."
          : "Try a different number of leaves — the holidays left may need one more or one fewer.";
    }
    if (emptyAction) {
      if (monthIsTheProblem) {
        emptyAction.textContent = "Show every month";
        emptyAction.dataset.act = "clear-month";
      } else {
        const next = leaves === 0 ? 1 : leaves + 1;
        emptyAction.textContent = `Try ${pluralLeaves(next)} instead`;
        emptyAction.dataset.act = "more-leaves";
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
      setCustom(leaves === 0 ? 1 : leaves + 1);
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

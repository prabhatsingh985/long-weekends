/**
 * Rendering for vacation plans: the card, the modal calendar, and the
 * festival -> banner-theme mapping.
 *
 * Both the homepage and the company optimizer showed the same cards, but each
 * kept its own copy of the markup and the two had already drifted apart (one
 * had a leave-cost badge the other lacked, and the "efficiency" line was
 * formatted differently). Everything visual now lives here so a change lands
 * on both pages at once.
 */
import type { VacationPlan, PlanDay, CalendarDay } from "../types";
import { cleanFestivalName } from "../data/vacation-solver";

/* ==========================================================================
   Banner themes
   ==========================================================================
   Instead of stock photography, each card gets a deep gradient keyed to the
   festival it is built around, plus one oversized motif glyph. The gradients
   live in global.css as `.bnr-*` and were all contrast-checked against the
   white text they carry.

   Matching is on `plan.festivalName` — the RAW holiday name — not `plan.title`,
   because the title has already been through cleanFestivalName() and had
   suffixes like "Day" and "Jayanti" stripped off.
*/
export interface BannerTheme {
  /** Gradient class, e.g. "bnr-festive". */
  cls: string;
  /** Motif glyph shown large and faint behind the banner text. */
  motif: string;
  /** Short human label for the eyebrow, e.g. "Festive season". */
  season: string;
}

const THEME_RULES: { re: RegExp; theme: BannerTheme }[] = [
  {
    // Diwali cluster: the lamps-and-lights run from Dussehra to Chhath.
    re: /diwali|deepavali|dussehra|dasara|vijay|navami|ayudha|durga|chhath|kanakadasa|bhai|govardhan/i,
    theme: { cls: "bnr-festive", motif: "🪔", season: "Festival of lights" },
  },

  /* -- East and Southeast Asia ------------------------------------------------
     These sit ABOVE the "new year" rule below, and the order is load-bearing:
     "Lunar New Year" and "Chinese New Year" both contain the words that rule
     matches on, so leaving them to it painted the largest holiday in Asia as a
     midwinter snowflake. They are matched first and get their own motif. */
  {
    re: /lunar new year|chinese new year|spring festival|seollal|tet\b|tết|losar/i,
    theme: { cls: "bnr-festive", motif: "🧧", season: "Lunar new year" },
  },
  {
    // Chuseok and Mid-Autumn are the same harvest moon under two names.
    re: /mid-autumn|chuseok|moon festival|double ninth|chung yeung/i,
    theme: { cls: "bnr-harvest", motif: "🌕", season: "Harvest moon" },
  },
  {
    re: /dragon boat|duanwu/i,
    theme: { cls: "bnr-summer", motif: "🐉", season: "Dragon Boat Festival" },
  },
  {
    // Tomb Sweeping / Qingming: a spring day of remembrance, not a celebration.
    re: /qing ?ming|tomb sweeping|ching ming/i,
    theme: { cls: "bnr-spring", motif: "🌿", season: "Day of remembrance" },
  },
  {
    // Songkran and Nyepi are new-year festivals that the spring rule below
    // would otherwise miss entirely.
    re: /songkran|nyepi|day of silence|hindu new year/i,
    theme: { cls: "bnr-spring", motif: "🌸", season: "New year, new season" },
  },
  {
    // Word-bounded: an unanchored /holi/ also matches "Holiday".
    re: /\bholi\b|dhulandi|rangpanchami/i,
    theme: { cls: "bnr-spring", motif: "🎨", season: "Colours of spring" },
  },
  {
    // Regional new years, all of them spring.
    re: /ugadi|gudi\s*padwa|poila|boishakh|puthandu|vishu|bihu|baisakhi|tamil new year|navreh/i,
    theme: { cls: "bnr-spring", motif: "🌸", season: "New year, new season" },
  },
  {
    re: /raksha|rakhi|janmashtami|ganesh|chaturthi|onam|nag panchami/i,
    theme: { cls: "bnr-monsoon", motif: "☔", season: "Monsoon break" },
  },
  {
    re: /christmas|new year|boxing/i,
    theme: { cls: "bnr-winter", motif: "❄️", season: "Year end" },
  },
  {
    re: /pongal|sankranti|makar|lohri|thanksgiving|uzhavar|harvest/i,
    theme: { cls: "bnr-harvest", motif: "🌾", season: "Harvest season" },
  },
  {
    // Midsummer is the Nordic summer holiday, and the most likely reason a
    // Swede or a Finn is looking at this page in June.
    re: /midsummer|midsommar|juhannus|sankt hans/i,
    theme: { cls: "bnr-summer", motif: "☀️", season: "Midsummer" },
  },
  {
    // Japan's outdoors holidays, which are the shape of its summer calendar.
    re: /greenery|mountain day|marine day|sea day|showa|shōwa/i,
    theme: { cls: "bnr-summer", motif: "🌿", season: "Summer break" },
  },
  {
    re: /memorial|labor day|labour day|workers'? day|tourist bridge/i,
    theme: { cls: "bnr-summer", motif: "🌤️", season: "Summer break" },
  },
  {
    /* Britain and Ireland name half their calendar after the banks rather than
       after anything that happened, so there is nothing for the rules below to
       match on: "Early May Bank Holiday" is a day off with no subject. */
    re: /bank holiday/i,
    theme: { cls: "bnr-summer", motif: "🍃", season: "Bank holiday" },
  },
  {
    // Carnival empties offices across Brazil for the better part of a week.
    re: /carnival|carnaval|shrove|pancake day|mardi gras|rosenmontag/i,
    theme: { cls: "bnr-spring", motif: "🎭", season: "Carnival" },
  },
  {
    re: /equinox|vernal/i,
    theme: { cls: "bnr-spring", motif: "🌱", season: "Turn of the season" },
  },
  {
    /* The civic rule, widened from India and the US to the whole list.
       `\bnational\b` and not `national`, or every "International Labour Day"
       in Europe gets filed as somebody's national day. */
    re: /republic|gandhi|ambedkar|netaji|shivaji|rajyotsava|maharashtra|karnataka|patel|king|presidents|juneteenth|veterans|columbus|indigenous|may day|\bnational\b|constitution|liberation|unification|unity|sovereignty|revolution|victory|armistice|remembrance|anzac|waitangi|australia day|canada day|bastille|foundation|proclamation|emancipation|freedom|heritage|reconciliation|coming of age|culture day|respect for the aged|sports day|children|emperor|queen|monarch|accession|flag day|statehood|hangul|peace memorial|retrocession|teachers|youth day|pancasila|heroes|bonifacio|rizal|valor|aquino|women's day|hispanic|portugal day|ochi|\bhus\b|czechoslovak|matariki|chakri|coronation|chulalongkorn|malaysia day|victoria day|agong|establishment day|liberty|defenders|human rights|democracy|family day|goodwill|armed forces|san mart|güemes|tiradentes|awareness|jamhuri|madaraka|mashujaa|mazingira|solidarity|cultural diversity|haatzmaut|public service/i,
    theme: { cls: "bnr-civic", motif: "🏛️", season: "National holiday" },
  },
  {
    /* Days of religious observance, across every tradition the list touches.
       Deliberately the last specific rule: several of these words turn up
       inside civic and seasonal names too, and the rules above should get
       first refusal on them. */
    re: /shivratri|shivaratri|id-ul|idul|eid|hari raya|bayram|sacrifice feast|arafat|hijra|muharram|maulid|mawlid|milad|isra|mi'?raj|ramzan|ramadan|nuzul|good friday|maundy|holy saturday|easter|palm sunday|whit|pentecost|ascension|assumption|corpus christi|epiphany|all saints|all souls|immaculate|annunciation|reformation|st\.? stephen|synaxis|buddha|vesak|wesak|waisak|thaipusam|purnima|mahavir|guru|nanak|gurpurab|parsi|navroz|jayanti|guadalupe|virgin|rosh hashana|yom kippur|sukkot|passover|pesach|shavuot|simchat|purim|hanukkah|independence movement|\bst\.?\s|saint|feast of|dormition|clean monday|holy spirit|holy week|black saturday/i,
    theme: { cls: "bnr-sacred", motif: "🕯️", season: "Day of observance" },
  },
];

const FALLBACK_THEME: BannerTheme = {
  cls: "bnr-brand",
  motif: "🗓️",
  season: "Public holiday",
};

export function getBannerTheme(plan: VacationPlan): BannerTheme {
  const name = `${plan.festivalName || ""} ${plan.title || ""}`;

  // "Independence Day" appears in both calendars — India in August, the USA in
  // July. Identical string, different holiday, so the month has to break the
  // tie before the generic rules get a look at it.
  //
  // India's motif is a sparkler rather than 🇮🇳 because Windows ships no flag
  // glyphs and drew the emoji as a bare "IN" on the card banner.
  if (/independence/i.test(name)) {
    return plan.startDate.slice(5, 7) === "07"
      ? { cls: "bnr-summer", motif: "🎆", season: "Fourth of July" }
      : { cls: "bnr-civic", motif: "🎇", season: "Independence Day" };
  }

  for (const rule of THEME_RULES) {
    if (rule.re.test(name)) return rule.theme;
  }
  return FALLBACK_THEME;
}

/* ==========================================================================
   Formatting
   ========================================================================== */
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Parses "YYYY-MM-DD" as a LOCAL date. `new Date(iso)` would read it as UTC
 *  and land on the previous day for anyone west of Greenwich. */
export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/**
 * "7 – 10 Nov 2026" | "30 Oct – 2 Nov 2026" | "30 Dec 2026 – 2 Jan 2027"
 * Repeats the month or year only when it actually changes.
 */
export function formatDateRange(startIso: string, endIso: string): string {
  const s = parseIso(startIso);
  const e = parseIso(endIso);
  const sameYear = s.getFullYear() === e.getFullYear();
  const sameMonth = sameYear && s.getMonth() === e.getMonth();

  const left = sameMonth
    ? `${s.getDate()}`
    : sameYear
      ? `${s.getDate()} ${MONTHS_SHORT[s.getMonth()]}`
      : `${s.getDate()} ${MONTHS_SHORT[s.getMonth()]} ${s.getFullYear()}`;

  return `${left} – ${e.getDate()} ${MONTHS_SHORT[e.getMonth()]} ${e.getFullYear()}`;
}

export function pluralLeaves(n: number): string {
  return `${n} ${n === 1 ? "leave" : "leaves"}`;
}

/** Days-off per leave spent. Null when the break is free. */
export function efficiency(plan: VacationPlan): string | null {
  if (!plan.leavesRequired) return null;
  return `${(plan.totalDaysOff / plan.leavesRequired).toFixed(1)}× per leave`;
}

const STRATEGY_COPY: Record<VacationPlan["strategy"], string> = {
  zero: "Costs you nothing",
  pre: "Take leave before",
  post: "Take leave after",
  bridge: "Bridge the gap",
};

/** Holiday names are interpolated into HTML, so escape defensively even though
 *  they currently all originate from the bundled JSON. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ==========================================================================
   Day ribbon
   ==========================================================================
   The ribbon is the signature element of the product, so it repays some care.
   Colour never carries meaning alone: PTO days are the only dashed ones and
   the only ones with a cost marker, and every cell keeps a written tag.
*/
const DAY_META: Record<PlanDay["type"], { cls: string; tag: string; word: string }> = {
  holiday: { cls: "day-holiday", tag: "Holiday", word: "public holiday" },
  weekend: { cls: "day-weekend", tag: "Weekend", word: "weekend" },
  leave: { cls: "day-pto", tag: "Leave", word: "your leave" },
};

function renderDay(day: PlanDay): string {
  const meta = DAY_META[day.type];
  const cost =
    day.type === "leave"
      ? `<span class="day-cost" aria-hidden="true">-1</span>`
      : "";
  return `<div class="day ${meta.cls}">
    ${cost}
    <span class="day-dow">${escapeHtml(day.dayName)}</span>
    <span class="day-num">${escapeHtml(day.dayNum)}</span>
    <span class="day-tag">${meta.tag}</span>
  </div>`;
}

/**
 * Plans can run to 21 days, which will never fit as full-width cells. Past
 * nine days the strip switches to a compact cell and scrolls; the container is
 * focusable so it can also be scrolled from the keyboard, and it carries a
 * text summary as its accessible name because 21 tiny cells make for a
 * miserable screen-reader walk.
 */
function renderDayStrip(plan: VacationPlan): string {
  const compact = plan.days.length > 9 ? " day-strip-compact" : "";
  const counts = { holiday: 0, weekend: 0, leave: 0 };
  plan.days.forEach((d) => (counts[d.type] += 1));

  const summary =
    `${plan.totalDaysOff} days off: ` +
    [
      counts.holiday ? `${counts.holiday} public holiday${counts.holiday === 1 ? "" : "s"}` : "",
      counts.weekend ? `${counts.weekend} weekend day${counts.weekend === 1 ? "" : "s"}` : "",
      counts.leave ? `${pluralLeaves(counts.leave)} of yours` : "",
    ]
      .filter(Boolean)
      .join(", ");

  return `<div class="day-strip${compact}" role="group" tabindex="0" aria-label="${escapeHtml(summary)}">
    ${plan.days.map(renderDay).join("")}
  </div>`;
}

/* ==========================================================================
   Card
   ========================================================================== */
export function renderPlanCard(plan: VacationPlan, index: number): string {
  const theme = getBannerTheme(plan);
  const start = parseIso(plan.startDate);
  const eyebrow = `${MONTHS_SHORT[start.getMonth()].toUpperCase()} · ${theme.season}`;
  const ratio = efficiency(plan);
  const range = formatDateRange(plan.startDate, plan.endDate);

  const costTag = plan.leavesRequired
    ? `<span class="tag tag-pto"><span class="dot dot-pto" aria-hidden="true"></span>${pluralLeaves(plan.leavesRequired)}</span>`
    : `<span class="tag tag-holiday"><span class="dot dot-holiday" aria-hidden="true"></span>No leave</span>`;

  return `<article class="card card-interactive flex flex-col overflow-hidden">
    <div class="banner ${theme.cls}">
      <span class="banner-motif" aria-hidden="true">${theme.motif}</span>
      <div class="min-w-0">
        <p class="banner-eyebrow truncate">${escapeHtml(eyebrow)}</p>
        <p class="mt-1 text-[0.8125rem] font-bold">${STRATEGY_COPY[plan.strategy]}</p>
      </div>
      <div class="shrink-0 text-right">
        <p class="banner-figure">${plan.totalDaysOff}</p>
        <p class="banner-figure-label">days off</p>
      </div>
    </div>

    <div class="flex grow flex-col gap-3 p-4">
      <div>
        <h3 class="text-[0.9375rem] font-extrabold leading-snug">${escapeHtml(plan.title)}</h3>
        <p class="mt-1 font-mono text-xs font-semibold text-muted tabular">${escapeHtml(range)}</p>
      </div>

      ${renderDayStrip(plan)}

      <div class="mt-auto flex items-center justify-between gap-2 pt-1">
        <div class="flex min-w-0 items-center gap-2">
          ${costTag}
          ${ratio ? `<span class="truncate font-mono text-[0.6875rem] font-semibold text-muted">${ratio}</span>` : ""}
        </div>
        <button
          type="button"
          class="btn btn-ghost btn-sm btn-open-cal shrink-0"
          data-idx="${index}"
          aria-label="See ${escapeHtml(plan.title)} on a calendar, ${escapeHtml(range)}"
        >Calendar</button>
      </div>
    </div>
  </article>`;
}

export function renderPlanGrid(plans: VacationPlan[]): string {
  return plans.map((plan, i) => renderPlanCard(plan, i)).join("");
}

/* ==========================================================================
   Modal calendar
   ==========================================================================
   Weeks start on Monday, which is how a work week is actually read, and how
   the previous Sunday-first grid made every Sat–Sun break look like it was
   split across two rows.
*/
const DOW_MON_FIRST = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

/** Every "YYYY-MM" the plan touches, in order. */
function monthsSpanned(plan: VacationPlan): string[] {
  const keys: string[] = [];
  plan.days.forEach((d) => {
    const k = monthKey(d.date);
    if (!keys.includes(k)) keys.push(k);
  });
  return keys;
}

/**
 * The grid is `aria-hidden` on purpose: 35 numbered cells read aloud one by
 * one tells a screen-reader user nothing. `renderPlanBreakdown` below is the
 * accessible equivalent and is shown to everyone, not tucked away.
 */
function renderMonth(
  key: string,
  planDays: Map<string, PlanDay>,
  calendar: Map<string, CalendarDay> | null,
  todayIso: string
): string {
  const [year, month] = key.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // Monday-first offset

  const cells: string[] = [];
  for (let i = 0; i < lead; i++) cells.push(`<div></div>`);

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const inPlan = planDays.get(iso);
    const ctx = calendar?.get(iso);

    let cls = "cal-cell";
    if (inPlan) {
      cls += ` ${DAY_META[inPlan.type].cls.replace("day-", "cal-cell-")}`;
    } else if (ctx && (ctx.isWeekend || ctx.isHoliday)) {
      cls += " cal-cell-off";
    }
    if (iso === todayIso) cls += " cal-cell-today";

    cells.push(`<div class="${cls}">${d}</div>`);
  }

  return `<div>
    <p class="mb-2 text-xs font-bold uppercase tracking-widest text-muted">
      ${MONTHS_LONG[month - 1]} ${year}
    </p>
    <div class="grid grid-cols-7 gap-1" aria-hidden="true">
      ${DOW_MON_FIRST.map(
        (d) =>
          `<div class="pb-1 text-center text-[0.625rem] font-bold uppercase text-muted">${d}</div>`
      ).join("")}
      ${cells.join("")}
    </div>
  </div>`;
}

/** The list that replaces the old per-day hover tooltips, which were
 *  unreachable by keyboard and invisible on touch. */
function renderPlanBreakdown(plan: VacationPlan): string {
  const holidays = plan.days.filter((d) => d.type === "holiday");
  const leaves = plan.days.filter((d) => d.type === "leave");

  const line = (d: PlanDay, label: string, dotCls: string) => {
    const dt = parseIso(d.date);
    return `<li class="flex items-center gap-2.5 py-1.5">
      <span class="dot ${dotCls}" aria-hidden="true"></span>
      <span class="font-mono text-xs font-semibold text-body tabular shrink-0">
        ${d.dayName} ${dt.getDate()} ${MONTHS_SHORT[dt.getMonth()]}
      </span>
      <span class="min-w-0 truncate text-xs font-semibold text-ink">${escapeHtml(label)}</span>
    </li>`;
  };

  const sections: string[] = [];

  if (holidays.length) {
    sections.push(`<div>
      <h4 class="mb-1 text-[0.6875rem] font-bold uppercase tracking-widest text-muted">
        Public holidays you get free
      </h4>
      <ul class="divide-y divide-hairline">
        ${holidays.map((d) => line(d, d.label || "Public holiday", "dot-holiday")).join("")}
      </ul>
    </div>`);
  }

  if (leaves.length) {
    sections.push(`<div>
      <h4 class="mb-1 text-[0.6875rem] font-bold uppercase tracking-widest text-muted">
        Leave to apply for (${pluralLeaves(leaves.length)})
      </h4>
      <ul class="divide-y divide-hairline">
        ${leaves.map((d) => line(d, "Apply for leave", "dot-pto")).join("")}
      </ul>
    </div>`);
  } else {
    sections.push(`<p class="tag tag-holiday">
      <span class="dot dot-holiday" aria-hidden="true"></span>
      This break costs you no leave at all
    </p>`);
  }

  return `<div class="flex flex-col gap-4">${sections.join("")}</div>`;
}

/**
 * Full modal body. `calendar` is optional; pass the solver's map to also shade
 * weekends and holidays that fall outside the plan, which is what makes the
 * grid readable as a month rather than a floating cluster of coloured cells.
 */
export function renderPlanCalendar(
  plan: VacationPlan,
  calendar: Map<string, CalendarDay> | null,
  todayIso: string
): string {
  const planDays = new Map<string, PlanDay>();
  plan.days.forEach((d) => planDays.set(d.date, d));

  const keys = monthsSpanned(plan);
  const months = keys
    .map((k) => renderMonth(k, planDays, calendar, todayIso))
    .join("");

  // Written out in full rather than built by interpolation: Tailwind extracts
  // class names as literal strings from source, so a computed `grid-cols-${n}`
  // never gets generated.
  const cols = keys.length > 1 ? "sm:grid-cols-2" : "sm:grid-cols-1";

  return `<div class="flex flex-col gap-6">
    <div class="grid gap-6 ${cols}">
      ${months}
    </div>
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-control bg-surface-soft px-3 py-2.5">
      <span class="flex items-center gap-2 text-[0.6875rem] font-bold text-body">
        <span class="dot dot-holiday" aria-hidden="true"></span>Public holiday
      </span>
      <span class="flex items-center gap-2 text-[0.6875rem] font-bold text-body">
        <span class="dot dot-weekend" aria-hidden="true"></span>Weekend
      </span>
      <span class="flex items-center gap-2 text-[0.6875rem] font-bold text-body">
        <span class="dot dot-pto" aria-hidden="true"></span>Your leave
      </span>
    </div>
    ${renderPlanBreakdown(plan)}
  </div>`;
}

/* ==========================================================================
   Sorting
   ==========================================================================
   Shared so the two pages cannot disagree about what a sort means.

   Two orders, not four. "Best value" (days off per leave) and "Fewest leaves"
   were dropped because the leave budget above the grid already answers the
   question they were asking: a visitor who cares about spending fewer days
   picks a smaller budget, and every plan shown is then the best value at that
   budget. Four options that mostly reshuffled the same short list read as more
   choice than the page actually had. What is left is the genuine axis — soonest
   versus longest.
*/
export type SortKey = "days" | "date";

export const SORT_LABELS: Record<SortKey, string> = {
  days: "Longest break",
  date: "Soonest first",
};

/** The order the grid opens in. Named so the pages cannot drift from it. */
export const DEFAULT_SORT: SortKey = "date";

export function sortPlans(plans: VacationPlan[], key: SortKey): VacationPlan[] {
  const out = [...plans];

  switch (key) {
    case "days":
      out.sort(
        (a, b) =>
          b.totalDaysOff - a.totalDaysOff || a.startDate.localeCompare(b.startDate)
      );
      break;
    default:
      out.sort(
        (a, b) =>
          a.startDate.localeCompare(b.startDate) || b.totalDaysOff - a.totalDaysOff
      );
  }
  return out;
}

/* ==========================================================================
   Highlight selection
   ==========================================================================
   The "Long weekends still ahead" list is a chronological summary, not the
   results grid, so it needs one row per festival rather than every variant the
   solver can build around it.

   This used to be inline in index.astro and deduplicated on `plan.title`,
   which does not do that: the solver emits "Raksha Bandhan" for the free
   3-day version and "Raksha Bandhan (Pre-Break)" for the same weekend with a
   leave day in front, so both survived and the list showed one festival two or
   three times. It also made the page contradict itself — the list opened with
   the 27 Aug pre-break while the badge above it named the 28 Aug free break,
   because the badge asks for the cheapest option and the list was sorted purely
   by date.

   Grouping on the festival and keeping the cheapest variant fixes both: one row
   per festival, and the first row is by construction the same plan the badge
   names.
*/

/**
 * "Raksha Bandhan (Pre-Break)" and "Raksha Bandhan" are the same festival.
 *
 * Uses the solver's own naming rule rather than a second regex here, so the two
 * cannot drift into disagreeing about what counts as one festival.
 */
function festivalKey(plan: VacationPlan): string {
  return cleanFestivalName(plan.festivalName || plan.title).toLowerCase();
}

export function selectHighlights(plans: VacationPlan[], limit = 6): VacationPlan[] {
  const best = new Map<string, VacationPlan>();

  for (const plan of plans) {
    const key = festivalKey(plan);
    const held = best.get(key);
    // Cheapest wins; on a tie the longer break is the better row, and on a
    // second tie the earlier one, so the result does not depend on input order.
    const better =
      !held ||
      plan.leavesRequired < held.leavesRequired ||
      (plan.leavesRequired === held.leavesRequired &&
        (plan.totalDaysOff > held.totalDaysOff ||
          (plan.totalDaysOff === held.totalDaysOff && plan.startDate < held.startDate)));
    if (better) best.set(key, plan);
  }

  return [...best.values()]
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, limit);
}

/**
 * The next breaks, soonest first — the single answer to "what is coming up".
 *
 * The hero badge and the highlight list are both answering that question, and
 * they used to answer it with two different heuristics that happened to agree
 * on most dates. The badge asked for the cheapest leave budget that had
 * anything and then took the earliest plan *within* it, which means it skipped
 * nearer breaks that cost a day: standing on 14 Feb 2026 it announced Good
 * Friday on 3 April while Id-ul-Fitr sat unmentioned on 20 March, seven weeks
 * closer. That is the opposite of "next".
 *
 * So the order is reversed here — earliest first, cheapest only as the
 * tie-break within one festival, which is what selectHighlights already does.
 * The budget widens beyond the floor only when the narrower band is empty, so
 * the search never reaches past a nearer break to find a pricier one.
 *
 * `solve` is a callback rather than options because the caller owns region,
 * work week and (on the optimizer) a custom holiday list.
 */
export function nextBreaks(
  solve: (leaves: number) => VacationPlan[],
  options: { budgetFloor?: number; budgetCeiling?: number; limit?: number } = {}
): VacationPlan[] {
  const floor = options.budgetFloor ?? 1;
  const ceiling = options.budgetCeiling ?? 4;
  const pool: VacationPlan[] = [];

  for (let cap = 0; cap <= ceiling; cap++) {
    pool.push(...solve(cap));
    if (cap < floor) continue;
    const rows = selectHighlights(pool, options.limit);
    if (rows.length) return rows;
  }
  return [];
}

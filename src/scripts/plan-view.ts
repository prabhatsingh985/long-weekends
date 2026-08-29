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
    /* The Diwali cluster. It used to also list kanakadasa, chhath, durga,
       ayudha and govardhan — names that only ever appeared in the Indian state
       gazettes, so they have matched nothing since those lists were removed. */
    re: /diwali|deepavali|dussehra|dasara|vijay|navami/i,
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
  /* A rule for India's regional new years — Ugadi, Gudi Padwa, Poila Boishakh,
     Puthandu, Vishu, Bihu, Baisakhi — used to sit here. Every one of them was a
     state holiday, so it died with the state lists. The spring new years still
     in the data are Songkran and Nyepi, which have their own rule above. */
  {
    re: /raksha|rakhi|janmashtami|ganesh|chaturthi/i,
    theme: { cls: "bnr-monsoon", motif: "☔", season: "Monsoon break" },
  },
  {
    re: /christmas|new year|boxing/i,
    theme: { cls: "bnr-winter", motif: "❄️", season: "Year end" },
  },
  {
    re: /pongal|sankranti|makar|lohri|thanksgiving|harvest/i,
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
    re: /republic|gandhi|king|presidents|juneteenth|veterans|columbus|indigenous|may day|\bnational\b|constitution|liberation|unification|unity|sovereignty|revolution|victory|armistice|remembrance|anzac|waitangi|australia day|canada day|bastille|foundation|proclamation|emancipation|freedom|heritage|reconciliation|coming of age|culture day|respect for the aged|sports day|children|emperor|queen|monarch|accession|flag day|statehood|hangul|peace memorial|retrocession|teachers|youth day|pancasila|heroes|bonifacio|rizal|valor|aquino|women's day|hispanic|portugal day|ochi|\bhus\b|czechoslovak|matariki|chakri|coronation|chulalongkorn|malaysia day|victoria day|agong|establishment day|liberty|defenders|human rights|democracy|family day|goodwill|armed forces|san mart|güemes|tiradentes|awareness|jamhuri|madaraka|mashujaa|mazingira|solidarity|cultural diversity|haatzmaut|public service/i,
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

/** Short weekday names, indexed by `Date.getDay()`.
 *
 *  Derived from the parsed date rather than read off `PlanDay.dayName`, so the
 *  ends of a range and the cells of the ribbon cannot disagree about a
 *  weekday — the range is built from ISO strings and the ribbon from the
 *  solver's own labels. */
const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * The two ends of a break, each as "3" | "30 Oct" | "30 Dec 2026", plus the
 * weekday each one falls on.
 *
 * Month and year are repeated on the left only when they actually change,
 * which is what keeps "3 – 6 Sep 2026" from reading as two unrelated dates
 * while still spelling "30 Dec 2026 – 2 Jan 2027" out in full.
 */
export function rangeEndpoints(
  startIso: string,
  endIso: string
): { from: string; to: string; fromDow: string; toDow: string } {
  const s = parseIso(startIso);
  const e = parseIso(endIso);
  const sameYear = s.getFullYear() === e.getFullYear();
  const sameMonth = sameYear && s.getMonth() === e.getMonth();

  return {
    from: sameMonth
      ? `${s.getDate()}`
      : sameYear
        ? `${s.getDate()} ${MONTHS_SHORT[s.getMonth()]}`
        : `${s.getDate()} ${MONTHS_SHORT[s.getMonth()]} ${s.getFullYear()}`,
    to: `${e.getDate()} ${MONTHS_SHORT[e.getMonth()]} ${e.getFullYear()}`,
    fromDow: DOW_SHORT[s.getDay()],
    toDow: DOW_SHORT[e.getDay()],
  };
}

/**
 * "7 – 10 Nov 2026" | "30 Oct – 2 Nov 2026" | "30 Dec 2026 – 2 Jan 2027"
 * Repeats the month or year only when it actually changes.
 */
export function formatDateRange(startIso: string, endIso: string): string {
  const { from, to } = rangeEndpoints(startIso, endIso);
  return `${from} – ${to}`;
}

/**
 * How far off a break is, in the words a person would use: "In 6 days",
 * "In 3 weeks", "In 2 months".
 *
 * A card carrying only a date makes the reader do the subtraction against
 * today before they know whether it is worth planning around, and that is the
 * first thing anyone wants from it. The precision decays on purpose — days up
 * to a fortnight, then weeks, then months — because "In 47 days" is a number
 * you have to think about and "In 7 weeks" is not.
 *
 * Null for a break that has already finished, so a grid left open overnight
 * shows no countdown rather than a negative one.
 */
export function countdownLabel(
  startIso: string,
  endIso: string,
  todayIso: string
): string | null {
  if (!todayIso) return null;
  const today = parseIso(todayIso);
  // Rounded, not floored: both sides are local midnights, so a DST boundary
  // between them leaves a 23- or 25-hour remainder that would otherwise shift
  // every countdown across the change by a day.
  const daysFromToday = (iso: string) =>
    Math.round((parseIso(iso).getTime() - today.getTime()) / 86400000);

  if (daysFromToday(endIso) < 0) return null;

  const away = daysFromToday(startIso);
  if (away < 0) return "Happening now";
  if (away === 0) return "Starts today";
  if (away === 1) return "Tomorrow";
  if (away <= 13) return `In ${away} days`;
  if (away <= 70) return `In ${Math.round(away / 7)} weeks`;
  const months = Math.round(away / 30.44);
  return `In ${months} month${months === 1 ? "" : "s"}`;
}

export function pluralLeaves(n: number): string {
  return `${n} ${n === 1 ? "leave" : "leaves"}`;
}

/** Days-off per leave spent. Null when the break is free. */
export function efficiency(plan: VacationPlan): string | null {
  if (!plan.leavesRequired) return null;
  return `${(plan.totalDaysOff / plan.leavesRequired).toFixed(1)}× per leave`;
}

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
   ==========================================================================
   Top to bottom the card answers, in order: which festival, how long, which
   dates, which days, and where that total came from.

   The last of those is what used to be missing. The banner announced "4 days
   off" and the ribbon showed four coloured cells, and a reader had to count
   the cells themselves to see that three of the four were free — the whole
   point of the plan. It is now written out as the sum it is.
*/

/** The dates, with the weekday each end falls on and how far off it is.
 *
 *  "3 – 6 Sep" alone does not say whether the break touches a weekend, which
 *  is most of what makes one legible at a glance, and it does not say whether
 *  it is next week or next year. */
function renderWhen(plan: VacationPlan, todayIso: string): string {
  const { from, to, fromDow, toDow } = rangeEndpoints(plan.startDate, plan.endDate);
  const eta = countdownLabel(plan.startDate, plan.endDate, todayIso);
  // The three labels that mean "this changes what you do this week".
  const soon =
    eta === "Happening now" || eta === "Starts today" || eta === "Tomorrow";

  return `<div class="plan-when">
    <p class="plan-when-dates">
      <span class="plan-when-dow">${fromDow}</span> ${from}
      <span class="plan-when-arrow" aria-hidden="true">→</span>
      <span class="plan-when-dow">${toDow}</span> ${to}
    </p>
    ${eta ? `<span class="plan-eta${soon ? " plan-eta-soon" : ""}">${eta}</span>` : ""}
  </div>`;
}

/** The total as the sum it is: what the calendar gives you, then what you pay,
 *  then the answer. Dots match the legend above the grid and the ribbon
 *  colours, so the row is readable without re-learning anything. */
function renderMath(plan: VacationPlan): string {
  const counts = { holiday: 0, weekend: 0, leave: 0 };
  plan.days.forEach((d) => (counts[d.type] += 1));

  const chip = (dot: string, text: string) =>
    `<span class="math-chip"><span class="dot ${dot}" aria-hidden="true"></span>${text}</span>`;

  const terms = [
    counts.holiday &&
      chip("dot-holiday", `${counts.holiday} holiday${counts.holiday === 1 ? "" : "s"}`),
    counts.weekend &&
      chip("dot-weekend", `${counts.weekend} weekend day${counts.weekend === 1 ? "" : "s"}`),
    counts.leave && chip("dot-pto", pluralLeaves(counts.leave)),
  ].filter(Boolean) as string[];

  return `<p class="plan-math">
    ${terms.join(`<span class="math-op" aria-hidden="true">+</span>`)}
    <span class="math-total">= ${plan.totalDaysOff} days off</span>
  </p>`;
}

/* Drawn rather than set as an emoji: 🗓️ is the one glyph on this card that
   would sit inside a line of UI text, and Windows renders it at a different
   weight and baseline from the label beside it. */
const CALENDAR_ICON =
  `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" ` +
  `stroke-width="2.2" stroke-linecap="round" aria-hidden="true">` +
  `<rect x="3" y="5.5" width="18" height="15.5" rx="3"></rect>` +
  `<path d="M8 2.5v5M16 2.5v5M3 11h18"></path></svg>`;

export function renderPlanCard(
  plan: VacationPlan,
  index: number,
  todayIso = ""
): string {
  const theme = getBannerTheme(plan);
  const start = parseIso(plan.startDate);
  // The year belongs in the eyebrow now that the data spans two of them: "SEP"
  // on its own left the reader to guess which September they were being
  // offered, and the answer was sometimes eighteen months away.
  const eyebrow = `${MONTHS_SHORT[start.getMonth()].toUpperCase()} ${start.getFullYear()} · ${theme.season}`;
  const ratio = efficiency(plan);
  const range = formatDateRange(plan.startDate, plan.endDate);

  const costTag = plan.leavesRequired
    ? `<span class="tag tag-pto"><span class="dot dot-pto" aria-hidden="true"></span>${pluralLeaves(plan.leavesRequired)}</span>`
    : `<span class="tag tag-holiday"><span class="dot dot-holiday" aria-hidden="true"></span>No leave</span>`;

  return `<article class="card card-interactive plan-card flex flex-col overflow-hidden">
    <div class="banner ${theme.cls}">
      <span class="banner-motif" aria-hidden="true">${theme.motif}</span>
      <div class="min-w-0">
        <p class="banner-eyebrow truncate">${escapeHtml(eyebrow)}</p>
        <h3 class="banner-title">${escapeHtml(plan.title)}</h3>
      </div>
      <div class="banner-count shrink-0">
        <p class="banner-figure">${plan.totalDaysOff}</p>
        <p class="banner-figure-label">days off</p>
      </div>
    </div>

    <div class="flex grow flex-col gap-2.5 p-4">
      ${renderWhen(plan, todayIso)}

      ${renderDayStrip(plan)}

      ${renderMath(plan)}

      <div class="mt-auto flex items-center justify-between gap-2 pt-0.5">
        <div class="flex min-w-0 items-center gap-2">
          ${costTag}
          ${ratio ? `<span class="truncate font-mono text-[0.6875rem] font-semibold text-muted">${ratio}</span>` : ""}
        </div>
        <button
          type="button"
          class="btn btn-ghost btn-sm btn-open-cal shrink-0 gap-1.5"
          data-idx="${index}"
          aria-label="See ${escapeHtml(plan.title)} on a calendar, ${escapeHtml(range)}"
        >${CALENDAR_ICON}Calendar</button>
      </div>
    </div>
  </article>`;
}

/** `todayIso` is optional so a caller with no clock still renders a card; it
 *  loses only the countdown. */
export function renderPlanGrid(plans: VacationPlan[], todayIso = ""): string {
  return plans.map((plan, i) => renderPlanCard(plan, i, todayIso)).join("");
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

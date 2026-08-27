# The Long Weekends

A leave planner for 2026 and 2027, covering **47 countries**. Public holidays
are fixed; your leave balance is not. Pick where you work, tell it how many days
you can spare, and it finds every way to turn a holiday into a long break,
ranked by how many days off each leave day buys.

Live at **[thelongweekends.com](https://thelongweekends.com)**.

Static Astro site. No backend and no accounts. Google Analytics counts page
views; every calculation — including reading an uploaded office holiday PDF —
runs in the browser and is never uploaded.

> Adding or removing a third-party script makes `src/pages/privacy.astro`
> wrong until it is edited. That page is written from an audit of the code, not
> from a template.

## Commands

| Command | What it does |
| :-- | :-- |
| `npm install` | Install dependencies |
| `npm run dev` | Dev server on `localhost:4321` |
| `npm run build` | Production build to `./dist/` |
| `npm run preview` | Serve the build locally |
| `npm test` | Run the guard suite in `outputs/` |
| `npm run test:watch` | Same, in watch mode |

Requires Node ≥ 22.12.

## How it fits together

```
holidays.json               the only data file — one calendar per country, 47 of them
scripts/build-holidays.mjs  regenerates the country block from published calendars
src/data/countries.ts       the country list as the UI wants it: groups, aliases, weekends
src/data/flags.ts           flag artwork for all 47, drawn as SVG
src/data/vacation-solver.ts the engine: calendar -> candidate breaks -> ranked plans
src/scripts/plan-view.ts    all rendering: cards, day ribbon, modal calendar, sorting
src/scripts/results.ts      the interactive shell both result pages mount
src/scripts/menu.ts         WAI-ARIA menu button (country picker, budget, sort)
src/scripts/dialog.ts       modal with focus trap and scroll lock
src/components/RegionMenu.astro  the searchable country picker, rendered 3x per page
src/pages/countries.astro   the coverage page — every calendar with its real numbers
src/layouts/Layout.astro    the single <html> shell — canonicals, OG, theme init
outputs/                    tests that pin the site's factual claims
```

Two pages compute breaks — the homepage (national calendar) and
`/company-optimizer` (your employer's list). They mount the **same**
`mountResults()` controller and differ only in the `solve` callback they pass
it. Anything visual lives in `plan-view.ts` so a change lands on both at once.

Components communicate through `CustomEvent`s on `document` rather than reaching
into each other's DOM: `lw:region`, `lw:setregion`, `lw:workweek`, `lw:search`.
The `lw:region` / `lw:setregion` split separates a user's choice from a
programmatic sync, which is what stops the navbar, hero and grid echoing each
other in a loop.

## How the solver works

`solveVacationPlans({ leaves, workWeek, region, month, fromDate })` walks every
window of 3–21 consecutive days across the calendar and keeps the ones where:

- at least one public holiday falls inside the window,
- an endpoint touches a weekend or a holiday (so the break actually connects),
- the number of working days inside equals the leave budget **exactly**, and
- the window returns at least 1.3 days off per leave day spent.

Survivors are grouped by `festival + occurrence date + strategy + leave count`,
the longest in each group wins, and anything starting on or before `fromDate` is
dropped — a break that has already begun cannot be planned for. The occurrence
date is in the key because without it a festival that recurs, such as Good
Friday, collapses to a single plan across all years.

Two date helpers look redundant and are not. `getTodayIso()` clamps into the data
window; `getUpcomingCutoffIso()` deliberately does not, because clamping plus the
strict `startDate > cutoff` filter would silently delete every 1 January plan.

## Holiday data

`holidays.json` holds three blocks:

- **`countries`** — every country the picker offers, keyed by ISO-3166 alpha-2,
  each with its holidays, its `weekend` days and its `group`. This is what the
  solver reads.
- **`national_holidays`** — India's gazetted list, hand-transcribed. `countries.IN`
  is generated *from* it rather than beside it, so the two cannot drift.
- **`us_federal_holidays`** — the curated OPM list that `countries.US` is
  generated from, same arrangement as India's.

Sources are listed in the file's own `sources` array.

There are **no sub-national lists**, for anywhere. India used to carry five
state gazettes under `state_specific_holidays`, reachable through region values
`SOUTH` / `WEST` / `NORTH` / `EAST`. They were removed: sub-national data
existed for exactly one of the 47 countries, so it made India behave unlike
everywhere else and implied a level of detail nothing else could match. Anyone
whose real list differs from the national one is served by `/company-optimizer`
instead, which plans against their actual days.

### Regenerating the country lists

```
node scripts/build-holidays.mjs           # from the cache in .cache/holidays/
node scripts/build-holidays.mjs --refresh # re-download first
node scripts/build-holidays.mjs --report  # print the cross-check, write nothing
```

The generator compiles from Google's published public-holiday calendars and
cross-checks every country against Nager.Date, printing each disagreement for
review. India and the US are *not* compiled — they are read out of the curated
lists above.

What it keeps: nationwide public holidays, plus regional ones observed by at
least half a federal country's subdivisions (recorded as `scope: "most"`, which
is a data-quality decision inside the generator — the site never offers a
regional calendar). What it drops: observances, commemorative days and
half-days — a "public holiday" here has to mean a day off, or the leave
arithmetic on top of it is fiction.

Two hand-maintained exceptions live in the script's `SUPPLEMENTS` table, each
with the source that was checked: Australia's Boxing Day substitutes, which
Google omits, and the whole of Indonesia's 2027, which is an estimate because
the decree that fixes it is not published yet.

### Region codes

`?region=` accepts an ISO code (`DE`, `SG`) or the two legacy values `ALL` and
`USA` that predate the country picker. The legacy pair resolve to `IN` and
`US`, so every link shared before this existed still works. Anything else —
including the retired `SOUTH` / `WEST` / `NORTH` / `EAST` — is rejected by
`isKnownRegion()` and falls back to India. That function in
`src/data/countries.ts` is the single gate; nothing else should pattern-match a
region string.

### Weekends are per country

`country.weekend` is a pair of weekday numbers, most significant first. It
defaults to `[0, 6]` (Sunday, Saturday) and is spelled out where that is wrong —
Israel is `[6, 5]` and Egypt `[5, 6]`, both resting Friday and Saturday. Get it
wrong and every result for those countries shifts by two days. The six-day
work-week toggle drops the *second* entry, which is why the pair is ordered.

The planning window is `CALENDAR_START` to `CALENDAR_END` in the solver —
currently `2026-01-01` to `2028-01-10`. Those two strings are the **only** place
the range is written; `buildCalendarMap()` derives its loop bounds from them.
Extending to another year means adding rows to the JSON, moving `CALENDAR_END`,
and updating whatever figures the tests pin.

> **2027 dates are not gazette-verified yet.** See
> [HOLIDAYS_2027_VERIFY.md](HOLIDAYS_2027_VERIFY.md) for what has been
> cross-checked for India and what still needs confirming against the
> notifications. For the other countries, dates set by a moon sighting carry
> `tentative: true` and Indonesia's whole 2027 is an estimate.

**Editing this file will move numbers the site states out loud.** `npm test`
recomputes all of them and fails if the copy no longer matches — see below.

## Tests

`outputs/` holds three guard suites. None tests the framework; all pin claims
the site makes that would otherwise rot silently.

- **`faq.test.ts`** recomputes every figure quoted in the homepage FAQ and on
  `/about` from the shipped solver — the nine free long weekends and their exact
  dates, the 22 four-day breaks across 13 festivals, the weekday split of the
  gazetted list, the spring cluster. If the holiday data
  changes, this fails and the copy on both pages has to be edited with it.
- **`countries.test.ts`** is the equivalent for the other 45 countries, but pins
  *invariants* rather than dates — every country covers both years, states the
  right weekday for each date, has drawn flag artwork, yields real plans, and
  resolves from its region code. It also guards the removal of the state lists:
  the retired sub-region values must stay unknown and must solve as plain India. Plus the two things that are easy to break
  silently: Israel's and Egypt's Friday–Saturday weekends, and the share of
  result cards that get a themed banner rather than the grey fallback.
- **`sitemap.test.ts`** pins the canonical origin in `astro.config.mjs` to the
  one repeated in `public/robots.txt`, checks every route under `src/pages/`
  appears in the sitemap, checks every sitemap entry is linked from the footer
  (so no page is an orphan), and checks no `noindex` page is listed.

## Conventions worth knowing

- **Comments explain *why*, and often what the previous version got wrong.**
  Keep that when editing — several bugs in this repo were comments describing a
  mechanism that had never been written.
- **Colour never carries meaning alone.** Leave days in the day ribbon are
  dashed *and* carry a `-1` marker *and* a written tag.
- **Mono type is reserved for figures you read exactly** — dates, day counts,
  leave counts, clause numbers. Sans is for language you read fluently.
- **Design tokens live in `:root` / `.dark`** in `global.css` and reach Tailwind
  through `@theme inline`, so one utility class resolves correctly in both
  themes with no `dark:` variant. Contrast ratios are annotated where they drove
  the choice.
- **Interactive controls clear 24×24 CSS px** (WCAG 2.5.8 AA) and body text
  clears 10px.
- **The build emits `about.html`, not `about/index.html`** (`build.format: "file"`
  plus `trailingSlash: "never"`), so the served path, the canonical tag and the
  sitemap entry are the same string.

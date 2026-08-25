# The Long Weekends

A leave planner for 2026. Public holidays are fixed; your leave balance is not.
Tell it how many days you can spare and it finds every way to turn a holiday
into a long break, ranked by how many days off each leave day buys.

Live at **[thelongweekends.com](https://thelongweekends.com)**.

Static Astro site. No backend, no accounts, no analytics, no cookies. Every
calculation — including reading an uploaded office holiday PDF — runs in the
browser.

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
holidays_2026.json          the only data file — gazetted + state + US federal
src/data/vacation-solver.ts the engine: calendar -> candidate breaks -> ranked plans
src/scripts/plan-view.ts    all rendering: cards, day ribbon, modal calendar, sorting
src/scripts/results.ts      the interactive shell both result pages mount
src/scripts/menu.ts         WAI-ARIA menu button (region, budget, sort)
src/scripts/dialog.ts       modal with focus trap and scroll lock
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

Survivors are grouped by `festival + strategy + leave count`, the longest in each
group wins, and anything starting on or before `fromDate` is dropped — a break
that has already begun cannot be planned for.

Two date helpers look redundant and are not. `getTodayIso()` clamps into the data
window; `getUpcomingCutoffIso()` deliberately does not, because clamping plus the
strict `startDate > cutoff` filter would silently delete every 1 January plan.

## Holiday data

`holidays_2026.json` holds `national_holidays` (17 gazetted days in 2026, plus
New Year 2027) and `state_specific_holidays` keyed by `KA`, `MH`, `DL`, `WB`,
`TN` and `USA`. Sources are listed in the file's own `sources` array.

The planning window is `2026-01-01` to `2027-01-10`, declared as `CALENDAR_START`
/ `CALENDAR_END` in the solver. Extending the year means editing the JSON, those
two constants, and the figures the tests pin.

**Editing this file will move numbers the site states out loud.** `npm test`
recomputes all of them and fails if the copy no longer matches — see below.

## Tests

`outputs/` holds two guard suites. Neither tests the framework; both pin claims
the site makes that would otherwise rot silently.

- **`faq.test.ts`** recomputes every figure quoted in the homepage FAQ and on
  `/about` from the shipped solver — the nine free long weekends and their exact
  dates, the 22 four-day breaks across 13 festivals, the weekday split of the
  gazetted list, the state counts, the spring cluster. If the holiday data
  changes, this fails and the copy on both pages has to be edited with it.
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

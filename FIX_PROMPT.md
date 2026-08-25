# Fix brief — The Long Weekends

Paste everything below the line into a fresh Claude Code session at the repo root.

---

You are working in `C:\Users\ps265\Desktop\longweekends` — a static Astro 7 + Tailwind 4
site (The Long Weekends) that computes optimal leave placement around Indian gazetted
holidays and US federal holidays for 2026. No backend, no UI framework, everything runs
in the browser.

An audit found the defects below. Every one has been reproduced — do not re-investigate
whether they are real, go straight to fixing. Work through them in the order given
(P0 → P3) and commit in logical groups, not one giant commit.

## Ground rules

- **Match the existing code style.** This codebase documents *why*, not *what*, and
  records what the previous version got wrong. Keep that convention in anything you add.
- **Do not weaken accessibility.** Existing ARIA (`aria-pressed` button groups,
  `menuitemradio` with roving tabindex, the focus-trapping dialog) is correct — preserve it.
- **Do not regress the responsive layout.** There is currently *zero* horizontal
  overflow at 306px, 375px, 753px and 1425px on every page. Re-verify after your changes.
- Colour must never be the only carrier of meaning; the day ribbon already pairs colour
  with a dashed border, a `-1` marker and a text tag. Keep that.
- Run `npm run build` after each group. It must stay clean.

---

## P0 — Broken functionality

### 1. `tools={false}` is a no-op; dead controls ship on six pages

`src/layouts/DocPage.astro:62` and `src/layouts/ErrorPage.astro:45` both render
`<Navbar tools={false} />`, with a comment pointing at "the note in Navbar.astro".
`src/components/Navbar.astro` declares **no `Props` interface and never reads `tools`**.

Result, verified in the built HTML and live in the browser: `/about`, `/contact`,
`/privacy`, `/terms`, `/404` and `/500` each render 2 region triggers and 4 workweek
buttons. Clicking them dispatches `lw:workweek` into a page with no results grid to
consume it. The user changes a control and nothing happens.

**Fix:** add a real `Props` interface to `Navbar.astro` with `tools?: boolean`
(default `true`). When `tools` is false, render neither the desktop control bar's
region/workweek group nor the mobile second row's region/workweek controls — but keep
the brand link, the page-switch link and the theme toggle, which are useful everywhere.
Then write the note in `Navbar.astro` that DocPage and ErrorPage already claim exists.

Verify: `/about` and `/404` must ship **0** `data-region-trigger` and **0**
`.workweek-btn`; `/` and `/company-optimizer` must be unchanged.

### 2. `/#faq` is a dead anchor

`src/pages/404.astro` links to `/#faq`. There is no `id="faq"` anywhere on the homepage.

**Fix:** add `id="faq"` to the FAQ block in `src/pages/index.astro` (the
`<div class="mt-14 border-t border-hairline pt-10">` that wraps the "Frequently asked
questions" heading), and give it `scroll-mt-[12rem]` so the two sticky bars do not cover
the heading on arrival — the same offset `#results` already uses and for the same reason.

### 3. Footer link promises holidays it cannot show

`src/components/Footer.astro` has `{ href: "/?month=10", label: "Diwali & Durga Puja runs" }`.
Diwali 2026 is **8 November** (month 11), and Durga Puja is a West-Bengal-only holiday
that the region selector cannot even reach. At the default 0-leave budget, `/?month=10`
returns exactly one card: Mahatma Gandhi's Birthday.

**Fix:** either point it at `/?month=11&leaves=1` and relabel it honestly (e.g.
"Diwali week — 1 leave"), or relabel the October link for what it actually shows
("Gandhi Jayanti & Dussehra"). Pick one and make the label match the result.

---

## P1 — Factual errors in user-facing content

Every number below was checked by running the shipped solver. Fix the copy, not the solver.

### 4. The "longest possible weekend" answer is wrong

`src/pages/index.astro`, FAQ entry "Which is the most extended possible weekend in 2026?":

> "The longest run the year allows is an 18-day stretch from Thursday 19 March to
> Sunday 5 April … but it costs 10 leave days."

The 18-day plan at 10 leaves is real, but it is **not** the longest the year allows.
Actual per-budget maxima from the solver:

```
10 leaves → 18 days   11 leaves → 19 days
12 leaves → 20 days (13 Feb – 4 Mar)   13 leaves → 21 days
```

**Fix:** rewrite the claim as the longest run that is still *worth taking* (which is
clearly the intent), or state the true maximum. Do not leave "the longest run the year
allows" attached to the 18-day figure.

### 5. US holiday data contains non-holidays

In `holidays_2026.json`, `state_specific_holidays.USA` lists:

- **Good Friday (2026-04-03)** — not a US federal holiday.
- **Easter Sunday (2026-04-05)** — not a federal holiday, and always a Sunday. It
  generates a nonsense plan titled "Easter Sunday (Post-Break)".

**Fix:** remove both from the USA list. Confirm afterwards that the US 0-leave results
still include a 3-day break in early April only if a real federal holiday supports it
(it will not — that is correct).

### 6. US calendar is missing New Year 2027

The planning window runs to `2027-01-10` (`CALENDAR_END` in
`src/data/vacation-solver.ts`) and the Indian national list includes `2027-01-01`.
The USA list stops at 2026-12-25. A US visitor in late December 2026 silently loses the
New Year break, and `isCalendarExhausted()` does not fire to explain the gap.

**Fix:** add New Year's Day 2027-01-01 to the USA list, matching the shape of the
existing entries.

### 7. Duplicate US Independence Day entries produce a broken title

The USA list has both `Independence Day Holiday` (2026-07-03) and `Independence Day`
(2026-07-04). July 4 2026 is a Saturday, so July 3 is the observed holiday. Having both
makes cards read **"Independence Day Holiday & Independence"**.

**Fix:** keep one entry. Prefer a single `Independence Day (observed)` on 2026-07-03,
and confirm the card title reads cleanly afterwards.

---

## P2 — Responsive & accessibility

The layout itself is sound — no horizontal overflow anywhere, the grid steps 1 → 2 → 3
columns correctly, the calendar modal is a proper bottom sheet on mobile, dark mode is
consistent. The problems are **touch-target size and type density**, not broken layout.

### 8. Tap targets below the WCAG 2.5.8 AA minimum (24×24 CSS px)

Measured live at 375px:

| Control | Actual size |
|---|---|
| `#btnDecLeave` / `#btnIncLeave` (`.stepper-btn`) | **18 × 18** |
| custom-leaves value button (`[data-leaves="custom"]`) | **50 × 16** |
| Footer site-nav links (About / Contact / Privacy / Terms) | **17** tall |

The steppers are primary controls — they are how a user picks any budget above 2.

**Fix:** in `src/styles/global.css`, give `.stepper-btn` a real hit area of at least
44×44 on touch (`min-height`/`min-width`, or a `::after` overlay if the visual size must
stay small so the pill does not grow). Give the custom-leaves value button the same
vertical hit area. Give footer nav links `py-1` (or an equivalent) to clear 24px.
Keep the visual design — grow the target, not the ink.

### 9. 9px type

`.seg-label`, `.banner-figure-label`, `.day-dow` and `.day-tag` compute to **9px**.
The day ribbon is the signature element of the product and its weekday/type labels are
the smallest text on the site.

**Fix:** raise the floor to 10px (0.625rem) for these four. Verify the day cells still
fit at 306px — the ribbon already switches to a compact cell past 9 days and scrolls,
so it has room to give.

### 10. Mobile control row orphans the "Office" button

At ≤ ~330px the `flex-wrap` row in `src/components/Navbar.astro` (the `lg:hidden`
second row) wraps to two lines, and because the page-switch link carries `ml-auto` it
lands alone on the second row hard against the right edge. It reads as a layout bug.

**Fix:** either drop `ml-auto` below `sm` so the three controls flow left-to-right and
wrap naturally, or let the link take full width on its own row when it wraps. Verify at
320px and 375px.

### 11. Sticky chrome eats a quarter of the mobile viewport

Navbar (69px) + filter bar (104px) = **173px of a 694px viewport — 25%** — permanently
occupied before a single result is visible.

**Fix (lower priority, judgement call):** consider collapsing the two filter rails into
one row below `sm`, or letting the filter bar un-stick on scroll-down and return on
scroll-up. Do not just shrink the tap targets to buy the space — that conflicts with
item 8. If you conclude the current trade-off is right, say so and leave it.

---

## P3 — Infrastructure & hygiene

### 12. Every sitemap URL points at a redirect

Astro's default `build.format: 'directory'` emits `dist/about/index.html`, so the page
serves at **`/about/`**. Both `src/pages/sitemap.xml.ts` and the canonical tag built in
`src/layouts/Layout.astro` declare **`/about`**. They agree with each other but not with
what the host serves, so all six sitemap entries except `/` resolve through a 301.

The sitemap's own comment calls this "one of the few sitemap mistakes Search Console
actually complains about" and claims it was handled. It was not.

**Fix:** pick one canonical form and make config, canonical tags and sitemap agree.
Simplest is to set `trailingSlash: 'never'` + `build: { format: 'file' }` in
`astro.config.mjs` so the emitted files match the declared URLs. If you instead keep
directory format, add the trailing slash to both the canonical and the sitemap entries.
Whichever you choose, `/` must stay `/` and not become `/index.html`.

### 13. The guardrail tests cited in six files do not exist

`outputs/sitemap.test.ts` and `outputs/faq.test.ts` are named as build-gating safety nets
in `astro.config.mjs`, `src/pages/sitemap.xml.ts`, `public/robots.txt`,
`src/components/Footer.astro`, `src/pages/index.astro` and `src/pages/about.astro` —
"fails the build if a page is forgotten", "recomputes every number from the shipped
solver". There is no `outputs/` directory, no test file, no test runner, and no `test`
script in `package.json`.

**Fix:** write them. Add a test runner (`vitest` is the natural fit for a Vite project)
and a `"test"` script, then create:

- **`outputs/sitemap.test.ts`** — assert that (a) the origin in `public/robots.txt`
  matches `site` in `astro.config.mjs` exactly, (b) every non-error route under
  `src/pages/` appears in `ENTRIES` in `sitemap.xml.ts`, (c) every sitemap entry is
  linked from `src/components/Footer.astro`, (d) no `noindex` page is in the sitemap.
- **`outputs/faq.test.ts`** — import the real solver and recompute every number quoted
  in the homepage FAQ and in `src/pages/about.astro`. These currently hold and must be
  pinned: **9** free long weekends in 2026, all exactly **3** days, on 24–26 Jan,
  14–16 Feb, 3–5 Apr, 1–3 May, 26–28 Jun, 28–30 Aug, 4–6 Sep, 2–4 Oct, 25–27 Dec;
  **17** gazetted national holidays; **12** touching a weekend (**9** Fri/Mon, **3** on
  a weekend, **5** midweek); **22** four-day breaks across **13** festivals for one
  leave; 6 days for 2 leaves at 31 Mar – 5 Apr; no free break in March, July or
  November; state counts KA 7, MH 4, DL 3, WB 3, TN 2.

If a fix in P1 changes any of these numbers, update the copy **and** the test together.

### 14. Vendor scripts: no SRI, render-blocking, floating version

`src/pages/company-optimizer.astro:28` loads pdf.js from cdnjs and **`tesseract.js@5`**
(floating major) from jsDelivr as blocking `<head>` scripts with no `integrity`
attribute. This is the page that reads users' uploaded documents.

**Fix, in order of preference:**
1. Install both as npm dependencies and bundle them — removes the third-party origin
   entirely and makes the "Nothing leaves your browser" promise fully true.
2. If they must stay on a CDN: pin `tesseract.js` to an exact version, add `integrity`
   + `crossorigin="anonymous"` to both tags, and load them `defer` rather than blocking.

Either way, `src/pages/privacy.astro` documents the current third-party origins in its
frontmatter comment and in its body — **update that page to match whatever you do.**

### 15. Project metadata

- `package.json` has `"name": ""`. Set it to `thelongweekends`.
- `README.md` is still the unmodified Astro starter template ("Astro Starter Kit:
  Basics"). Replace it with a real README: what the site does, where holiday data lives,
  how the solver works, how to run dev/build/test.

---

## Out of scope — note but do not change without asking

- **6-day work week yields zero 0-leave breaks.** This is mathematically correct (a
  Sunday-only weekend cannot make a 3-day run without leave). The default budget is 0,
  so toggling to 6-day drops the user into the empty state — but that state already
  offers "Try 1 leave instead", so it degrades gracefully. Leave it.
- **Month rail is baked at build time** from `getTodayIso()` in page frontmatter, so it
  goes stale between deploys. `paintMonthAvailability()` disables the dead months, so it
  self-heals visually. Fixing properly means rendering the rail on the client. Flag the
  trade-off; do not rewrite it unprompted.
- **`REGION_STATE_MAP` has SOUTH/WEST/NORTH/EAST** and the data file carries 19 state
  holidays for KA/MH/DL/WB/TN, but `RegionMenu.astro` and `Hero.astro` offer only
  `ALL` and `USA`. The state calendars work correctly when invoked directly. This is a
  shipped-but-unexposed feature, not a bug — ask before either exposing or deleting it.

---

## Definition of done

1. `npm run build` completes clean.
2. `npm test` passes (after item 13).
3. `/about` and `/404` ship zero region/workweek controls; `/` and `/company-optimizer`
   are unchanged.
4. No horizontal overflow at 320px, 375px, 768px and 1440px on all 8 routes.
5. No interactive control smaller than 24×24 CSS px; no body text under 10px.
6. Sitemap URLs, canonical tags and served paths all agree.
7. Every number in the homepage FAQ and `/about` is reproduced by `outputs/faq.test.ts`.
8. `src/pages/privacy.astro` accurately describes the third-party origins the site
   actually contacts.

Report at the end: what you changed, what you deliberately left alone and why, and any
numbers in the copy that moved as a result of the data fixes in items 5–7.

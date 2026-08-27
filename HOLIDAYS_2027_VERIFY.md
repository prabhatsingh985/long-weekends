# 2027 holiday data — verification checklist

**Status: UNVERIFIED. Do not launch on these dates without checking the rows marked ⚠️.**

The 2027 entries in `holidays.json` were researched from public sources, not
copied from a gazette PDF. Everything below has passed two automated checks —
`outputs/faq.test.ts` asserts that every row's `day` field matches the weekday
its own date actually falls on, and that no date or id is duplicated — but a
date can be internally consistent and still be the wrong date.

Confidence is split three ways. Work top-down; the ⚠️ rows are the only ones
that need real effort.

---

## ✅ High confidence — national (DoPT)

Source: DoPT O.M. **F.No. 12/2/2023-JCA dated 16 July 2026**, Annexure-I
(17 gazetted holidays for Delhi/New Delhi offices).

Cross-checked two ways: every weekday was recomputed, and an independent
summary of the same O.M. reported "4 create automatic long weekends, 5 fall on
weekends" — the list below gives exactly 4 on a Friday/Monday and 5 on a
weekend, which is a strong signal the rows are the real ones.

| Date | Day | Holiday |
| :-- | :-- | :-- |
| 26 Jan 2027 | Tue | Republic Day |
| 10 Mar 2027 | Wed | Id-ul-Fitr ⚠️ moon |
| 23 Mar 2027 | Tue | Holi |
| 26 Mar 2027 | Fri | Good Friday |
| 15 Apr 2027 | Thu | Ram Navami |
| 19 Apr 2027 | Mon | Mahavir Jayanti |
| 17 May 2027 | Mon | Id-ul-Zuha ⚠️ moon |
| 20 May 2027 | Thu | Buddha Purnima |
| 16 Jun 2027 | Wed | Muharram ⚠️ moon |
| 15 Aug 2027 | Sun | Independence Day / Id-e-Milad |
| 25 Aug 2027 | Wed | Janmashtami |
| 2 Oct 2027 | Sat | Mahatma Gandhi's Birthday |
| 9 Oct 2027 | Sat | Dussehra (Vijaya Dashmi) |
| 29 Oct 2027 | Fri | Diwali (Deepavali) |
| 14 Nov 2027 | Sun | Guru Nanak's Birthday |
| 25 Dec 2027 | Sat | Christmas Day |

Two things worth knowing about this list:

- **Independence Day and Id-e-Milad share 15 August 2027.** They are stored as
  one row named `Independence Day / Id-e-Milad`, because the solver keys its
  calendar by date and a second row would have silently overwritten the first.
  The `/` is meaningful — `cleanFestivalName()` splits on it, so cards read
  "Independence".
- **`New Year's Day 2028-01-01` is in the national list and is not gazetted.**
  It is carried so a New Year break can bridge out of December, the same
  convention 2026 already used for 2027-01-01. It falls on a Saturday, so it
  changes nothing on the Indian calendar.

## ✅ High confidence — US federal

Derived from the statutory rules (nth-weekday and the Saturday→Friday /
Sunday→Monday observance shift), then confirmed against published 2027 lists.
All three shifted observances matched.

| Stored date | Day | Holiday | Actual date |
| :-- | :-- | :-- | :-- |
| 1 Jan 2027 | Fri | New Year's Day | — |
| 18 Jan 2027 | Mon | M L King Day | — |
| 15 Feb 2027 | Mon | Presidents' Day | — |
| 31 May 2027 | Mon | Memorial Day | — |
| 18 Jun 2027 | Fri | Juneteenth (observed) | Sat 19 Jun |
| 5 Jul 2027 | Mon | Independence Day (observed) | Sun 4 Jul |
| 6 Sep 2027 | Mon | Labor Day | — |
| 11 Oct 2027 | Mon | Columbus Day | — |
| 11 Nov 2027 | Thu | Veterans Day | — |
| 25 Nov 2027 | Thu | Thanksgiving Day | — |
| 24 Dec 2027 | Fri | Christmas (observed) | Sat 25 Dec |
| 31 Dec 2027 | Fri | New Year's Day (observed) | Sat 1 Jan 2028 |

## ✗ State holidays — removed

This file used to carry two more sections here: a table of fixed-date state
holidays, and a longer one of lunar state holidays that still needed checking
against Karnataka's DPAR notification, Maharashtra's GAD GR and the rest.

**Both are gone, along with the data they described.** The site is a
country-level planner now: `holidays.json` carries one calendar per country and
no sub-national lists for anywhere, so there are no state dates left to verify.
See the "Holiday data" section of the README for why.

The other 45 countries are compiled by `scripts/build-holidays.mjs`, which
cross-checks each against a second source and prints every disagreement. Run it
with `--report` to see the current list. What still needs a human eye there is
the same class of problem as below: dates set by a moon sighting, and countries
that had not published their 2027 list when the data was compiled — Indonesia's
whole 2027 is an estimate for that reason.

---

## After you verify

1. Correct any wrong dates in `holidays.json`.
2. Run `npm test`. The suite will fail loudly if a weekday no longer matches its
   date, if a date is duplicated, or if a figure quoted on the homepage or
   `/about` has moved. **A failure here is the point** — it means page copy
   needs editing too, not that the test is broken.
3. `outputs/faq.test.ts` pins the five free 2027 long weekends by exact date
   (`the 2027 calendar > gives India five free long weekends in 2027`). If a
   correction adds or removes one, update that list and the 2027 FAQ answer in
   `src/pages/index.astro`, which names Good Friday, Mahavir Jayanti, Id-ul-Zuha
   and Diwali explicitly.
4. Delete this file once the rows above are confirmed.

## Not covered

**Moon-sighting festivals** — Id-ul-Fitr, Id-ul-Zuha, Muharram and Id-e-Milad
are announced at short notice and can move a day in either direction. DoPT's own
list carries this caveat. Nothing can fix that in advance; the site simply
reflects the published list.

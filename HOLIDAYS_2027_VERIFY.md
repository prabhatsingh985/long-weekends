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

## ✅ High confidence — fixed-date state holidays

These fall on the same calendar date every year, so only the weekday could be
wrong, and that is machine-checked.

| Date | State | Holiday |
| :-- | :-- | :-- |
| 23 Jan 2027 | WB | Netaji Subhas Chandra Bose Jayanti |
| 19 Feb 2027 | MH | Chhatrapati Shivaji Maharaj Jayanti |
| 14 Apr 2027 | KA | Dr. B.R. Ambedkar Jayanti |
| 14 Apr 2027 | TN | Tamil New Year (Puthandu) |
| 1 May 2027 | MH | Maharashtra Day |
| 1 Nov 2027 | KA | Kannada Rajyotsava |

---

## ⚠️ Needs checking against the state gazette

These are lunar or panchang-derived and came from festival-calendar sites, not
from a state government notification. Several are internally corroborated —
noted where so — but **each state publishes its own list and can differ by a
day**, and some of these are the holiday that creates a long weekend, so a
one-day error changes the answer the site gives.

| Date | Day | State | Holiday | Notes |
| :-- | :-- | :-- | :-- | :-- |
| 15 Jan 2027 | Fri | KA | Makar Sankranti | **Sources disagree — 14 vs 15 Jan.** 15 Jan chosen. Creates a 3-day weekend, so this one matters. |
| 15 Jan 2027 | Fri | TN | Pongal | Same disagreement; Pongal tracks Sankranti. Also creates a 3-day weekend. |
| 15 Jan 2027 | Fri | DL | Guru Gobind Singh Jayanti | Creates a 3-day weekend. |
| 7 Apr 2027 | Wed | KA | Ugadi | Corroborated: Holi 23 Mar + 15 days, and Ram Navami 15 Apr is Ugadi + 8, which matches DoPT. |
| 7 Apr 2027 | Wed | MH | Gudi Padwa | Same day as Ugadi by definition. |
| 15 Apr 2027 | Thu | WB | Poila Boishakh | Sometimes observed 14 Apr. |
| 17 Aug 2027 | Tue | DL | Raksha Bandhan | Corroborated: Janmashtami 25 Aug is Rakhi + 8, which matches DoPT. |
| 4 Sep 2027 | Sat | KA, MH | Ganesh Chaturthi | Corroborated: Janmashtami + 10. Falls on a Saturday, so it adds nothing either way. |
| 6 Oct 2027 | Wed | WB | Durga Puja (Saptami→Dashami) | Stored as the Saptami date; Dashami is DoPT's Dussehra, 9 Oct. |
| 8 Oct 2027 | Fri | KA | Maha Navami / Ayudha Puja | Navami, the day before DoPT's Dussehra. Creates a 3-day weekend. |
| 4 Nov 2027 | Thu | DL | Chhath Puja | Consistent with Diwali 29 Oct + 6 days. |
| 16 Nov 2027 | Tue | KA | Kanakadasa Jayanti | Least corroborated row in the file. |

### Where to check

- **Karnataka** — DPAR General Holidays notification
- **Maharashtra** — GAD public holiday GR
- **Delhi** — GNCTD Services Department holiday list
- **West Bengal** — Finance Dept (Audit Branch) holiday notification
- **Tamil Nadu** — P&AR Department holiday GO

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

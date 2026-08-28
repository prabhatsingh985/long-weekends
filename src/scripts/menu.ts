/**
 * A small WAI-ARIA menu button.
 *
 * Shared by the hero search capsule and the results sort control so the two
 * cannot drift apart. Both used to be `<div>`s with click handlers: no Tab
 * stop, no `aria-expanded`, and a selected state painted with a dark zinc
 * fill that was invisible on a light popover.
 *
 * Expects markup shaped like:
 *
 *   <button aria-haspopup="menu" aria-expanded="false" aria-controls="x">…</button>
 *   <div id="x" role="menu" hidden>
 *     <button role="menuitemradio" aria-checked="true"  tabindex="0"  data-v="a">…</button>
 *     <button role="menuitemradio" aria-checked="false" tabindex="-1" data-v="b">…</button>
 *   </div>
 *
 * The menu stays in the DOM and uses the `hidden` attribute, which keeps it
 * out of both the tab order and the accessibility tree while closed.
 */
export interface MenuOptions {
  trigger: HTMLElement;
  menu: HTMLElement;
  /** Attribute on each item holding its value, e.g. "data-region". */
  valueAttr: string;
  /** Element whose text shows the current choice. Reads `data-label`. */
  display?: HTMLElement | null;
  onSelect?: (value: string, item: HTMLElement) => void;
  /**
   * Optional filter box inside the menu.
   *
   * Added for the country picker. Four options are a list you read; forty-seven
   * are a list you search, and without a box the only way to reach Vietnam is
   * forty-odd presses of ArrowDown. Supplying it turns the menu into a
   * type-to-filter list: focus opens in the input, matching is against each
   * item's `data-search` text, and the arrow keys walk what is left.
   *
   * Items are hidden with the `hidden` attribute, which keeps them out of the
   * accessibility tree as well as out of sight — a screen reader should not be
   * told there are forty-seven options when three match.
   */
  search?: HTMLInputElement | null;
  /** Shown when the filter matches nothing. */
  empty?: HTMLElement | null;
}

export interface MenuHandle {
  open: (where?: "selected" | "first" | "last") => void;
  close: (restoreFocus?: boolean) => void;
  isOpen: () => boolean;
  /** Sets the checked item from a value without firing `onSelect`. */
  setValue: (value: string) => void;
}

export function createMenu(options: MenuOptions): MenuHandle | null {
  const { trigger, menu, valueAttr, display, onSelect, search, empty } = options;

  /**
   * Everything the arrow keys can land on, in DOM order.
   *
   * Usually that is exactly the radio items. A menu may also hold a control
   * that is not one of the choices, though — the hero's budget menu ends in a
   * number field for the budgets its four presets do not name — and Tab is no
   * way to reach it, because Tab closes the menu. Anything marked
   * `data-menu-stop` joins the ring, so ArrowDown off the last preset walks
   * into the field instead of wrapping back to the top past a control the
   * keyboard could otherwise never get to at all.
   */
  const stops = Array.from(
    menu.querySelectorAll<HTMLElement>('[role="menuitemradio"], [data-menu-stop]')
  );

  /** The subset that is a choice. Only these are filtered, marked or selected. */
  const items = stops.filter((it) => it.getAttribute("role") === "menuitemradio");
  if (!items.length) return null;

  /**
   * A region of the menu that owns its own keys.
   *
   * Arrow keys mean "move between options" everywhere in a menu except inside
   * a field that has its own use for them: in the budget menu's number input,
   * Up and Down step the number and Home and End are cursor commands. Marking
   * the wrapper `data-menu-freeform` hands those keys back to the browser.
   *
   * Escape and Tab are deliberately not included. Dismissing an open menu has
   * to work from everywhere inside it, and they are also the only way out of
   * a freeform region — the arrows that would otherwise walk back to the list
   * belong to the field while the caret is in it.
   */
  const freeform = (t: EventTarget | null) =>
    t instanceof Element && !!t.closest("[data-menu-freeform]");

  const isOpen = () => !menu.hidden;

  /**
   * The items the arrow keys can currently reach.
   *
   * Every navigation path goes through this rather than through `stops`,
   * because with a filter applied they are different lists — and walking the
   * full one would move focus onto a hidden element, which browsers handle by
   * silently dropping the focus somewhere unhelpful.
   */
  const visible = () => (search ? stops.filter((it) => !it.hidden) : stops);

  /** Section headings, hidden when the filter empties the section under them. */
  const groups = Array.from(menu.querySelectorAll<HTMLElement>("[data-menu-group]"));

  /** Matches --popover-gap in global.css. */
  const GAP = 10;
  /** Below this there is no point opening downward at all. */
  const MIN_USABLE = 140;
  /**
   * How much extra room a flip has to buy before it is worth taking.
   *
   * Without it, a trigger sitting near the middle of a short viewport flips on
   * a few pixels' difference, and then flips back on the next scroll frame —
   * the menu appears to jump from one side of the trigger to the other while
   * the user is reading it. Roughly one item's height, so a flip always gains
   * at least one more visible option.
   */
  const FLIP_MARGIN = 48;

  /**
   * Decides whether the menu hangs below the trigger or above it.
   *
   * The hero menus used to be pinned above with a hardcoded Tailwind class, so
   * they covered the headline and overlapped the sticky header even when there
   * was plenty of room underneath. Placement is a function of where the trigger
   * happens to be in the viewport, which only the browser knows, so it belongs
   * here rather than in the markup.
   *
   * Must run while the menu is visible — a hidden element measures as zero.
   */
  function place() {
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - GAP;
    const spaceAbove = rect.top - GAP;

    // Clear any previous cap before measuring, or the menu's natural height is
    // read as whatever it was constrained to last time.
    menu.style.maxHeight = "";
    const needed = menu.offsetHeight;

    // Prefer below, and only flip when below genuinely cannot serve: the menu
    // does not fit, and above has meaningfully more room to offer. Note that
    // "fits above" is covered by the same test, since a menu that fits above
    // needs more room than below was able to give.
    const useAbove =
      needed > spaceBelow &&
      spaceAbove > spaceBelow + FLIP_MARGIN &&
      spaceAbove >= MIN_USABLE;

    menu.classList.toggle("popover-above", useAbove);
    menu.classList.toggle("popover-below", !useAbove);

    // Cap only when the menu really is taller than its side allows, so short
    // menus never get a scrollbar they have no use for.
    const available = Math.max(MIN_USABLE, useAbove ? spaceAbove : spaceBelow);
    menu.style.maxHeight = needed > available ? `${available}px` : "";

    placeHorizontally();
  }

  /**
   * Keeps the menu inside the viewport left-to-right.
   *
   * This function is the other half of a job `place()` was only doing
   * vertically. Horizontal position was left entirely to a Tailwind class in
   * the markup — `right-0` or `left-0` — which is a static guess about where
   * the trigger will sit, and the sort control breaks that guess: its row is
   * `flex-wrap`, so below roughly 500px the heading pushes the Sort button onto
   * its own line at the LEFT of the container, while the menu stays pinned to
   * the container's RIGHT edge and extends 240px leftwards from there. At 418px
   * that put its left edge 47px outside the viewport, with the labels
   * ("Soonest first", "Longest break") sliced off — visible and unusable.
   *
   * Fixed here rather than with a breakpoint on that one menu, because the bug
   * belongs to every menu this factory builds: any trigger near either edge of
   * a narrow screen can reproduce it. The anchoring class still decides the
   * preferred side; this only nudges the result back inside when that side
   * would overflow, so the common case is untouched.
   *
   * The correction is written to the `--popover-shift` custom property rather
   * than straight to `transform`, and that detail matters. `.pop-in` animates
   * `transform`, and a running CSS animation outranks an inline style — so an
   * inline `transform` here would be ignored for the 160ms the menu is opening,
   * showing it clipped and then snapping it into place. The property is
   * composed into both the static rule and the keyframes in global.css, so the
   * menu animates open already in the right position.
   *
   * Cleared first so a previous frame's correction is never measured as part
   * of the natural position.
   */
  function placeHorizontally() {
    menu.style.setProperty("--popover-shift", "0px");

    const margin = 8;
    const viewport = document.documentElement.clientWidth;
    const rect = menu.getBoundingClientRect();

    let shift = 0;
    if (rect.left < margin) {
      shift = margin - rect.left;
    } else if (rect.right > viewport - margin) {
      shift = viewport - margin - rect.right;
    }

    // A menu wider than the screen cannot be shifted fully into view; pinning
    // its left edge at least keeps the labels readable from their start rather
    // than splitting the overflow across both edges.
    if (rect.width > viewport - margin * 2) {
      shift = margin - rect.left;
    }

    menu.style.setProperty("--popover-shift", `${Math.round(shift)}px`);
  }

  function focusAt(i: number) {
    const list = visible();
    if (!list.length) return;
    const idx = (i + list.length) % list.length;
    stops.forEach((it) => {
      it.tabIndex = -1;
    });
    list[idx].tabIndex = 0;
    list[idx].focus();
    // A filtered list is taller than the menu, so the match the arrow keys
    // reached can easily be below the fold.
    list[idx].scrollIntoView({ block: "nearest" });
  }

  /**
   * Applies the filter box to the item list.
   *
   * Matching is a plain substring test against `data-search`, which each item
   * carries pre-lowercased and already holding every string worth typing — the
   * country name, its code, and the cities that make it recognisable, so
   * "bangalore" finds India and "kr" finds South Korea.
   */
  function applyFilter() {
    if (!search) return;
    const q = search.value.trim().toLowerCase();
    let matches = 0;

    items.forEach((it) => {
      const hay = it.dataset.search || it.textContent?.toLowerCase() || "";
      const on = !q || hay.includes(q);
      it.hidden = !on;
      if (on) matches++;
    });

    // A heading with nothing under it reads as a section that failed to load.
    groups.forEach((g) => {
      const owned = items.filter((it) => it.closest("[data-menu-section]") === g.parentElement);
      g.hidden = owned.length > 0 && owned.every((it) => it.hidden);
    });

    if (empty) empty.hidden = matches > 0;
    // The list changed height, so where it can hang and how tall it may be
    // both changed with it.
    if (isOpen()) place();
  }

  function open(where: "selected" | "first" | "last" = "selected") {
    menu.hidden = false;
    place();
    menu.classList.add("pop-in");
    trigger.setAttribute("aria-expanded", "true");

    // A filter left over from last time would open the menu already narrowed
    // to whatever was typed then, which reads as most of the list having
    // vanished.
    if (search) {
      search.value = "";
      applyFilter();
    }

    const list = visible();
    let i = 0;
    if (where === "last") {
      i = list.length - 1;
    } else if (where === "selected") {
      const found = list.findIndex(
        (it) => it.getAttribute("aria-checked") === "true"
      );
      i = found < 0 ? 0 : found;
    }

    if (search) {
      // Focus goes to the box, not to an item: the point of a filter is that
      // you can start typing. The selected item is still scrolled to, so the
      // list opens showing where you are rather than at the top.
      stops.forEach((it) => {
        it.tabIndex = -1;
      });
      list[i]?.scrollIntoView({ block: "center" });
      search.focus();
    } else {
      focusAt(i);
    }
  }

  function close(restoreFocus = true) {
    if (!isOpen()) return;
    menu.hidden = true;
    menu.classList.remove("pop-in");
    trigger.setAttribute("aria-expanded", "false");
    if (restoreFocus) trigger.focus();
  }

  /** `null` unchecks everything; see setValue() for why that is a real case. */
  function mark(item: HTMLElement | null) {
    items.forEach((it) => {
      const on = it === item;
      it.setAttribute("aria-checked", String(on));
      // Optional tick glyph, used by the sort control.
      it.querySelector("[data-check]")?.classList.toggle("hidden", !on);
    });
    if (display && item?.dataset.label) display.textContent = item.dataset.label;
  }

  function select(item: HTMLElement) {
    mark(item);
    onSelect?.(item.getAttribute(valueAttr) || "", item);
    close();
  }

  // Enter and Space already produce a `click` on a <button>, so handling them
  // here as well would open the menu and immediately toggle it shut.
  trigger.addEventListener("click", () => (isOpen() ? close() : open()));
  trigger.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      open("first");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      open("last");
    }
  });

  menu.addEventListener("keydown", (e) => {
    const list = visible();
    const i = list.indexOf(document.activeElement as HTMLElement);
    // From the filter box, ArrowDown means "into the results" — so start
    // before the first item rather than at the last one, which is where an
    // index of -1 would otherwise wrap to.
    const inSearch = search && document.activeElement === search;

    // A field that brought its own meaning for these keys keeps them.
    const own = freeform(e.target);

    switch (e.key) {
      case "ArrowDown":
        if (own) break;
        e.preventDefault();
        focusAt(inSearch ? 0 : i + 1);
        break;
      case "ArrowUp":
        if (own) break;
        e.preventDefault();
        focusAt(inSearch ? list.length - 1 : i - 1);
        break;
      case "Home":
        // Inside a text box these are cursor commands and must stay that way.
        if (inSearch || own) break;
        e.preventDefault();
        focusAt(0);
        break;
      case "End":
        if (inSearch || own) break;
        e.preventDefault();
        focusAt(list.length - 1);
        break;
      case "Enter":
        // Typing a country and pressing Enter should pick it. Without this the
        // filter box swallows the key and nothing happens, which reads as the
        // search having failed.
        if (own) break;
        if (inSearch && list.length) {
          e.preventDefault();
          select(list[0]);
        }
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        // Let focus move on naturally, just dismiss the menu behind it.
        close(false);
        break;
    }
  });

  search?.addEventListener("input", applyFilter);

  items.forEach((it) => it.addEventListener("click", () => select(it)));

  document.addEventListener("pointerdown", (e) => {
    const t = e.target as Node;
    if (!menu.contains(t) && !trigger.contains(t)) close(false);
  });

  // Scrolling and rotating both change how much room the trigger has, so an
  // open menu has to re-measure or it ends up hanging off screen. Coalesced
  // into one frame because scroll fires far more often than layout changes.
  let queued = false;
  function replace() {
    if (!isOpen() || queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      if (isOpen()) place();
    });
  }
  window.addEventListener("scroll", replace, { passive: true });
  window.addEventListener("resize", replace);

  return {
    open,
    close,
    isOpen,
    setValue(value: string) {
      /* A value no item names unchecks the lot, which is not the same as doing
         nothing. A menu can legitimately hold a value none of its options
         carries — the hero's budget menu takes any number up to MAX_LEAVES
         from the stepper at its foot — and leaving the last preset ticked
         there would have the open menu claiming the budget is still 3 while
         the capsule above it reads "7 leaves". */
      mark(items.find((it) => it.getAttribute(valueAttr) === value) ?? null);
    },
  };
}

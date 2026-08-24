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
}

export interface MenuHandle {
  open: (where?: "selected" | "first" | "last") => void;
  close: (restoreFocus?: boolean) => void;
  isOpen: () => boolean;
  /** Sets the checked item from a value without firing `onSelect`. */
  setValue: (value: string) => void;
}

export function createMenu(options: MenuOptions): MenuHandle | null {
  const { trigger, menu, valueAttr, display, onSelect } = options;

  const items = Array.from(
    menu.querySelectorAll<HTMLElement>('[role="menuitemradio"]')
  );
  if (!items.length) return null;

  const isOpen = () => !menu.hidden;

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
  }

  function focusAt(i: number) {
    const idx = (i + items.length) % items.length;
    items.forEach((it, n) => {
      it.tabIndex = n === idx ? 0 : -1;
    });
    items[idx].focus();
  }

  function open(where: "selected" | "first" | "last" = "selected") {
    menu.hidden = false;
    place();
    menu.classList.add("pop-in");
    trigger.setAttribute("aria-expanded", "true");

    let i = 0;
    if (where === "last") {
      i = items.length - 1;
    } else if (where === "selected") {
      const found = items.findIndex(
        (it) => it.getAttribute("aria-checked") === "true"
      );
      i = found < 0 ? 0 : found;
    }
    focusAt(i);
  }

  function close(restoreFocus = true) {
    if (!isOpen()) return;
    menu.hidden = true;
    menu.classList.remove("pop-in");
    trigger.setAttribute("aria-expanded", "false");
    if (restoreFocus) trigger.focus();
  }

  function mark(item: HTMLElement) {
    items.forEach((it) => {
      const on = it === item;
      it.setAttribute("aria-checked", String(on));
      // Optional tick glyph, used by the sort control.
      it.querySelector("[data-check]")?.classList.toggle("hidden", !on);
    });
    if (display && item.dataset.label) display.textContent = item.dataset.label;
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
    const i = items.indexOf(document.activeElement as HTMLElement);
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusAt(i + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusAt(i - 1);
        break;
      case "Home":
        e.preventDefault();
        focusAt(0);
        break;
      case "End":
        e.preventDefault();
        focusAt(items.length - 1);
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
      const item = items.find((it) => it.getAttribute(valueAttr) === value);
      if (item) mark(item);
    },
  };
}

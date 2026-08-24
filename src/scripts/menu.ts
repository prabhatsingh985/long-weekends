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

  function focusAt(i: number) {
    const idx = (i + items.length) % items.length;
    items.forEach((it, n) => {
      it.tabIndex = n === idx ? 0 : -1;
    });
    items[idx].focus();
  }

  function open(where: "selected" | "first" | "last" = "selected") {
    menu.hidden = false;
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

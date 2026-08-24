/**
 * A modal dialog with the behaviour a modal is supposed to have.
 *
 * The previous implementation toggled `.hidden`/`.opacity-0` on a div with no
 * `role`, no `aria-modal`, no focus management and no scroll lock. That meant:
 * Escape did nothing, Tab walked straight out of the dialog into the page
 * behind it, closing the dialog dropped focus to the top of the document, and
 * on iOS the background scrolled under the overlay.
 *
 * Visibility is driven by the `hidden` attribute. Tailwind's preflight hides
 * `[hidden]` with `display: none !important`, which also takes the dialog out
 * of the tab order and the accessibility tree — something the old opacity
 * approach never did, leaving an invisible but fully focusable modal on top of
 * every page.
 */

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export interface DialogOptions {
  /** The full-screen backdrop element; also the click-outside target. */
  root: HTMLElement;
  /** The panel inside the backdrop. Clicks in here must not dismiss. */
  panel: HTMLElement;
  /** Any number of close buttons. */
  closers?: (HTMLElement | null)[];
  /** Runs after the dialog is shown, e.g. to move focus somewhere specific. */
  onOpen?: () => void;
}

export interface DialogHandle {
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
}

export function createDialog(options: DialogOptions): DialogHandle {
  const { root, panel, closers = [], onOpen } = options;
  let lastFocused: HTMLElement | null = null;

  const isOpen = () => !root.hidden;

  function focusables(): HTMLElement[] {
    return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement
    );
  }

  function open() {
    if (isOpen()) return;
    // Remember where focus came from so it can be handed back on close —
    // otherwise a keyboard user is dumped at the top of the document and has to
    // tab all the way back to the card they were reading.
    lastFocused = document.activeElement as HTMLElement | null;
    root.hidden = false;
    document.documentElement.classList.add("scroll-locked");
    onOpen?.();

    const first = focusables()[0];
    // Fall back to the panel itself, which carries tabindex="-1" so it can hold
    // focus without becoming a tab stop.
    (first || panel).focus();
  }

  function close() {
    if (!isOpen()) return;
    root.hidden = true;
    document.documentElement.classList.remove("scroll-locked");
    lastFocused?.focus?.();
    lastFocused = null;
  }

  closers.forEach((el) => el?.addEventListener("click", close));

  // Only a press that both starts and ends on the backdrop dismisses. Using
  // `click` alone would close the dialog when a text selection that began
  // inside the panel happened to end on the backdrop.
  let downOnBackdrop = false;
  root.addEventListener("pointerdown", (e) => {
    downOnBackdrop = e.target === root;
  });
  root.addEventListener("click", (e) => {
    if (e.target === root && downOnBackdrop) close();
    downOnBackdrop = false;
  });

  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== "Tab") return;

    // Focus trap: wrap at both ends so Tab can never reach the page behind.
    const items = focusables();
    if (!items.length) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && (active === first || active === panel)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  });

  return { open, close, isOpen };
}

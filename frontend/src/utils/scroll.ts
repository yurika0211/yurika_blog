const SCROLLABLE_OVERFLOW = /(auto|scroll|overlay)/;

let documentScrollLocks = 0;
let previousBodyOverflow = "";
let previousHtmlOverflow = "";

export const lockDocumentScroll = () => {
  if (typeof document === "undefined") {
    return () => undefined;
  }

  if (documentScrollLocks === 0) {
    previousBodyOverflow = document.body.style.overflow;
    previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
  }

  documentScrollLocks += 1;

  return () => {
    documentScrollLocks = Math.max(0, documentScrollLocks - 1);
    if (documentScrollLocks === 0) {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    }
  };
};

const canScrollAxis = (
  element: HTMLElement,
  deltaX: number,
  deltaY: number,
) => {
  const styles = window.getComputedStyle(element);
  const overflowX = SCROLLABLE_OVERFLOW.test(styles.overflowX);
  const overflowY = SCROLLABLE_OVERFLOW.test(styles.overflowY);

  if (Math.abs(deltaY) >= Math.abs(deltaX)) {
    if (!overflowY) {
      return false;
    }
    if (deltaY < 0) {
      return element.scrollTop > 0;
    }
    return element.scrollTop + element.clientHeight < element.scrollHeight - 1;
  }

  if (!overflowX) {
    return false;
  }
  if (deltaX < 0) {
    return element.scrollLeft > 0;
  }
  return element.scrollLeft + element.clientWidth < element.scrollWidth - 1;
};

export const isNestedScrollTarget = (
  target: EventTarget | null,
  deltaX = 0,
  deltaY = 0,
  boundary?: HTMLElement,
) => {
  if (!(target instanceof Element)) {
    return false;
  }

  const formControl = target.closest(
    'textarea, select, [contenteditable="true"]',
  );
  if (formControl instanceof HTMLElement) {
    return true;
  }

  let current: HTMLElement | null =
    target instanceof HTMLElement ? target : target.parentElement;

  while (current && current !== boundary) {
    if (canScrollAxis(current, deltaX, deltaY)) {
      return true;
    }
    current = current.parentElement;
  }

  return false;
};

export const attachHorizontalWheel = (
  rail: HTMLElement,
  options?: {
    minWidth?: number;
    root?: Window | HTMLElement;
  },
) => {
  const minWidth = options?.minWidth ?? 0;
  const root = options?.root ?? rail;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  let targetLeft = rail.scrollLeft;
  let currentLeft = rail.scrollLeft;
  let lastTime = 0;

  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    targetLeft = rail.scrollLeft;
    currentLeft = rail.scrollLeft;
  };

  const animate = (time: number) => {
    const elapsed = Math.min(time - lastTime, 40);
    lastTime = time;
    targetLeft = Math.max(
      0,
      Math.min(targetLeft, rail.scrollWidth - rail.clientWidth),
    );
    // Integrate independently of browser pixel rounding or native snap adjustment.
    const remaining = targetLeft - currentLeft;
    if (Math.abs(remaining) < 0.75) {
      rail.scrollLeft = targetLeft;
      frame = 0;
      return;
    }
    currentLeft += remaining * (1 - Math.exp(-elapsed / 65));
    rail.scrollLeft = currentLeft;
    frame = requestAnimationFrame(animate);
  };

  const handleWheel = (event: Event) => {
    if (!(event instanceof WheelEvent)) {
      return;
    }
    if (window.innerWidth < minWidth) {
      return;
    }
    if (event.ctrlKey || event.defaultPrevented) {
      return;
    }
    // A window listener must never consume a menu/dialog's input.
    if (
      !(event.target instanceof Node) ||
      !rail.parentElement?.contains(event.target)
    ) {
      return;
    }
    // Preserve the browser's own trackpad momentum and horizontal gestures.
    if (
      event.shiftKey ||
      Math.abs(event.deltaX) > Math.abs(event.deltaY) * 0.5
    ) {
      stop();
      return;
    }
    if (
      !event.deltaY ||
      isNestedScrollTarget(event.target, event.deltaX, event.deltaY, rail)
    ) {
      return;
    }
    const unit =
      event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rail.clientWidth : 1;
    if (!frame) {
      currentLeft = rail.scrollLeft;
      targetLeft = rail.scrollLeft;
    }
    const next = Math.max(
      0,
      Math.min(
        targetLeft + event.deltaY * unit,
        rail.scrollWidth - rail.clientWidth,
      ),
    );
    if (next === targetLeft) return;
    event.preventDefault();
    targetLeft = next;
    if (reducedMotion.matches) {
      rail.scrollLeft = targetLeft;
    } else if (!frame) {
      lastTime = performance.now();
      frame = requestAnimationFrame(animate);
    }
  };

  root.addEventListener("wheel", handleWheel, { passive: false });
  const stage = rail.parentElement;
  stage?.addEventListener("pointerdown", stop, { passive: true });
  stage?.addEventListener("keydown", stop);
  reducedMotion.addEventListener("change", stop);
  return () => {
    stop();
    root.removeEventListener("wheel", handleWheel);
    stage?.removeEventListener("pointerdown", stop);
    stage?.removeEventListener("keydown", stop);
    reducedMotion.removeEventListener("change", stop);
  };
};

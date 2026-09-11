const SCROLLABLE_OVERFLOW = /(auto|scroll|overlay)/;

let documentScrollLocks = 0;
let previousBodyOverflow = '';
let previousHtmlOverflow = '';

export const lockDocumentScroll = () => {
  if (typeof document === 'undefined') {
    return () => undefined;
  }

  if (documentScrollLocks === 0) {
    previousBodyOverflow = document.body.style.overflow;
    previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
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

const canScrollAxis = (element: HTMLElement, deltaX: number, deltaY: number) => {
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
) => {
  if (!(target instanceof Element)) {
    return false;
  }

  const formControl = target.closest('textarea, select, [contenteditable="true"]');
  if (formControl instanceof HTMLElement) {
    return true;
  }

  let current: HTMLElement | null =
    target instanceof HTMLElement ? target : target.parentElement;

  while (current) {
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
  const minWidth = options?.minWidth ?? 1024;
  const root = options?.root ?? rail;

  const handleWheel = (event: Event) => {
    if (!(event instanceof WheelEvent)) {
      return;
    }
    if (window.innerWidth < minWidth) {
      return;
    }
    if (event.ctrlKey) {
      return;
    }

    const primaryDelta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (!primaryDelta) {
      return;
    }

    if (isNestedScrollTarget(event.target, event.deltaX, event.deltaY)) {
      return;
    }

    event.preventDefault();
    rail.scrollBy({
      left: primaryDelta,
      behavior: 'auto',
    });
  };

  root.addEventListener('wheel', handleWheel, { passive: false });
  return () => root.removeEventListener('wheel', handleWheel);
};

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const STORAGE_KEY = 'scroll:positions';

function getPositions(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function savePosition(path: string, y: number): void {
  try {
    const positions = getPositions();
    positions[path] = y;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // ignore
  }
}

/**
 * Saves scroll position when leaving a route, restores it when returning.
 * Must be called inside a Router context.
 */
export function useScrollRestore() {
  const { pathname, search } = useLocation();
  const key = pathname + search;
  const prevKey = useRef(key);

  // Save scroll position of current page before navigating away
  useEffect(() => {
    const prev = prevKey.current;
    prevKey.current = key;

    if (prev !== key) {
      savePosition(prev, window.scrollY);
    }

    // Restore scroll position for new page (with small delay for render)
    const saved = getPositions()[key];
    if (saved != null && saved > 0) {
      // Use requestAnimationFrame to wait for DOM paint
      const raf = requestAnimationFrame(() => {
        window.scrollTo(0, saved);
      });
      return () => cancelAnimationFrame(raf);
    } else {
      window.scrollTo(0, 0);
    }
  }, [key]);

  // Save on beforeunload (refresh/close)
  useEffect(() => {
    const handleUnload = () => savePosition(key, window.scrollY);
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [key]);
}

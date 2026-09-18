import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigationType } from "react-router-dom";
import { attachHorizontalWheel, lockDocumentScroll } from "../utils/scroll";

/** Native scrolling remains the source of truth. Only chapter changes render React. */
export function useHandscroll() {
  const navigationType = useNavigationType();
  const restoreOnMount = useRef(navigationType === "POP");
  const railRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const positions = useRef<number[]>([]);
  const [chapter, setChapter] = useState(0);

  const goTo = useCallback((index: number) => {
    const rail = railRef.current;
    if (!rail) return;
    const position =
      positions.current[
        Math.max(0, Math.min(index, positions.current.length - 1))
      ];
    rail.scrollTo({
      left: position ?? 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    const stage = stageRef.current;
    if (!rail || !stage) return;
    const unlock = lockDocumentScroll();
    const detachWheel = attachHorizontalWheel(rail);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const panels = Array.from(
      rail.querySelectorAll<HTMLElement>("[data-chapter]"),
    );
    const mount = rail.firstElementChild;
    let frame = 0;
    let maximum = 0;
    let lastLeft = 0;
    let drag: { id: number; x: number; left: number; moved: boolean } | null =
      null;

    const update = () => {
      frame = 0;
      const left = rail.scrollLeft;
      lastLeft = left;
      const progress =
        maximum > 0 ? Math.max(0, Math.min(left / maximum, 1)) : 0;
      stage.style.setProperty("--reading-progress", String(progress));
      stage.style.setProperty(
        "--cover-shift",
        `${reducedMotion.matches ? 0 : Math.min(left * 0.12, 100)}px`,
      );
      progressRef.current?.setAttribute(
        "aria-valuenow",
        String(Math.round(progress * 100)),
      );
      let active = 0;
      positions.current.forEach((position, index) => {
        if (left + rail.clientWidth * 0.35 >= position) active = index;
      });
      if (maximum > 0 && left >= maximum - 2) active = panels.length - 1;
      setChapter((previous) => (previous === active ? previous : active));
    };
    const requestUpdate = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const measure = () => {
      maximum = Math.max(0, rail.scrollWidth - rail.clientWidth);
      positions.current = panels.map((panel, index) =>
        index === 0 ? 0 : panel.offsetLeft,
      );
      requestUpdate();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target !== rail || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const direction = ["ArrowRight", "PageDown"].includes(event.key)
        ? 1
        : ["ArrowLeft", "PageUp"].includes(event.key)
          ? -1
          : 0;
      if (direction) {
        event.preventDefault();
        rail.scrollBy({
          left: direction * rail.clientWidth * 0.8,
          behavior: reducedMotion.matches ? "instant" : "smooth",
        });
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        goTo(event.key === "Home" ? 0 : panels.length - 1);
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (
        event.pointerType !== "mouse" ||
        event.button !== 0 ||
        !(event.target instanceof Element)
      )
        return;
      if (
        !event.target.closest("[data-drag-surface]") ||
        event.target.closest("a, button")
      )
        return;
      drag = {
        id: event.pointerId,
        x: event.clientX,
        left: rail.scrollLeft,
        moved: false,
      };
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const delta = drag.x - event.clientX;
      if (!drag.moved && Math.abs(delta) < 6) return;
      drag.moved = true;
      rail.setPointerCapture(event.pointerId);
      rail.classList.add("is-dragging");
      rail.scrollLeft = drag.left + delta;
    };
    const endDrag = () => {
      if (drag && rail.hasPointerCapture(drag.id))
        rail.releasePointerCapture(drag.id);
      drag = null;
      rail.classList.remove("is-dragging");
    };
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    if (mount) observer.observe(mount);
    measure();
    // Restore a reader's place on Back/refresh; an explicit home link opens the cover.
    if (restoreOnMount.current) {
      try {
        const saved = Number(sessionStorage.getItem("handscroll:home"));
        if (Number.isFinite(saved) && saved > 0) {
          stage.dataset.restored = "true";
          rail.scrollLeft = Math.min(saved, maximum);
        }
      } catch {
        // Storage can be unavailable in private/embedded contexts.
      }
    }
    lastLeft = rail.scrollLeft;
    const savePosition = () => {
      try {
        sessionStorage.setItem("handscroll:home", String(lastLeft));
      } catch {
        /* Optional persistence. */
      }
    };
    window.addEventListener("pagehide", savePosition);
    rail.addEventListener("scroll", requestUpdate, { passive: true });
    rail.addEventListener("keydown", onKeyDown);
    rail.addEventListener("pointerdown", onPointerDown);
    rail.addEventListener("pointermove", onPointerMove);
    rail.addEventListener("pointerup", endDrag);
    rail.addEventListener("pointercancel", endDrag);
    rail.addEventListener("lostpointercapture", endDrag);
    reducedMotion.addEventListener("change", requestUpdate);
    return () => {
      savePosition();
      window.removeEventListener("pagehide", savePosition);
      cancelAnimationFrame(frame);
      observer.disconnect();
      detachWheel();
      unlock();
      endDrag();
      rail.removeEventListener("scroll", requestUpdate);
      rail.removeEventListener("keydown", onKeyDown);
      rail.removeEventListener("pointerdown", onPointerDown);
      rail.removeEventListener("pointermove", onPointerMove);
      rail.removeEventListener("pointerup", endDrag);
      rail.removeEventListener("pointercancel", endDrag);
      rail.removeEventListener("lostpointercapture", endDrag);
      reducedMotion.removeEventListener("change", requestUpdate);
    };
  }, [goTo]);

  return { railRef, stageRef, progressRef, chapter, goTo };
}

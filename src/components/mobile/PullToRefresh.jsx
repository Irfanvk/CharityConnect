import React, { useState, useRef, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";

const TRIGGER_DISTANCE = 70; // px of (resisted) pull needed to refresh
const MIN_PULL_MS = 200; // a quick flick is a scroll, never a refresh

// The app scrolls inside the layout's own container (not the window), so the
// "am I at the very top?" check must look at whichever element actually scrolls.
function findScroller(el) {
  let node = el?.parentElement;
  while (node && node !== document.body) {
    const { overflowY } = window.getComputedStyle(node);
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }
  return document.scrollingElement || document.documentElement;
}

// True when the touch began inside a nested scroll area (a list, a table, a
// dialog) that is itself scrolled down — dragging there should scroll it.
function insideScrolledChild(target, stopAt) {
  let node = target;
  while (node && node !== stopAt) {
    if (node.scrollTop > 0) return true;
    node = node.parentElement;
  }
  return false;
}

export default function PullToRefresh({ onRefresh, children }) {
  const [pullPx, setPullPx] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef(null);
  const gesture = useRef(null); // { startX, startY, startTime, scroller, active, distance }
  const refreshingRef = useRef(false);

  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  const reset = useCallback(() => {
    gesture.current = null;
    setPullPx(0);
  }, []);

  const handleTouchStart = useCallback((e) => {
    gesture.current = null;
    if (refreshingRef.current || e.touches.length !== 1) return;
    const scroller = findScroller(containerRef.current);
    // Only a gesture that STARTS with the page resting exactly at the top can
    // become a pull. Anywhere else, dragging down just scrolls up.
    if (scroller.scrollTop > 0 || insideScrolledChild(e.target, scroller)) return;
    const t = e.touches[0];
    gesture.current = {
      startX: t.clientX,
      startY: t.clientY,
      startTime: e.timeStamp,
      scroller,
      active: false,
      distance: 0,
    };
  }, []);

  const handleTouchMove = useCallback((e) => {
    const g = gesture.current;
    if (!g || refreshingRef.current) return;

    const t = e.touches[0];
    const dy = t.clientY - g.startY;
    const dx = t.clientX - g.startX;

    if (!g.active) {
      // Decide once the finger has moved a little: must be a clear downward,
      // mostly vertical drag with the page still at the top.
      if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;
      if (dy <= 0 || Math.abs(dx) > Math.abs(dy) || g.scroller.scrollTop > 0) {
        gesture.current = null;
        return;
      }
      g.active = true;
    }

    if (dy <= 0 || g.scroller.scrollTop > 0) {
      reset();
      return;
    }

    e.preventDefault();
    g.distance = Math.min(dy * 0.5, 110);
    setPullPx(g.distance);
  }, [reset]);

  const handleTouchEnd = useCallback(async (e) => {
    const g = gesture.current;
    reset();
    if (!g?.active || refreshingRef.current) return;
    const elapsed = e.timeStamp - g.startTime;
    if (g.distance >= TRIGGER_DISTANCE && elapsed >= MIN_PULL_MS) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
  }, [onRefresh, reset]);

  // touchmove needs { passive: false } so preventDefault works on iOS Safari
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    el.addEventListener("touchcancel", reset, { passive: true });
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchcancel", reset);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, reset]);

  const visible = pullPx > 0 || refreshing;
  const ready = pullPx >= TRIGGER_DISTANCE;

  return (
    <div ref={containerRef} className="min-h-screen">
      <div
        className={`fixed top-16 left-0 right-0 z-40 flex items-center justify-center lg:hidden pointer-events-none transition-opacity duration-150 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        style={{
          transform: `translateY(${refreshing ? 8 : pullPx - 50}px)`,
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        <div className="bg-white dark:bg-slate-800 rounded-full p-3 shadow-lg">
          <RefreshCw
            className={`w-5 h-5 ${ready || refreshing ? "text-emerald-600" : "text-slate-400"} ${refreshing ? "animate-spin" : ""}`}
            style={refreshing ? undefined : { transform: `rotate(${pullPx * 3}deg)` }}
          />
        </div>
      </div>

      {children}
    </div>
  );
}

import React, { useState, useRef, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";

export default function PullToRefresh({ onRefresh, children }) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const startTime = useRef(0);
  const pullDistance = useRef(0);
  const containerRef = useRef(null);
  const refreshingRef = useRef(false);

  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  const handleTouchStart = useCallback((e) => {
    // Reset on every touch so a stale startY from a previous (non-top) touch
    // never leaks into this gesture — without this, fast scrolling that
    // happens to settle at scrollY 0 mid-fling could compute a huge bogus
    // "pull distance" from the old startY and trigger an unwanted refresh.
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      startTime.current = e.timeStamp;
    } else {
      startY.current = 0;
      startTime.current = 0;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (startY.current === 0 || refreshingRef.current) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;

    if (distance > 0 && window.scrollY === 0) {
      // Resistance curve so a fast flick needs much more finger travel to
      // reach the trigger threshold than a deliberate slow pull.
      pullDistance.current = Math.min(distance * 0.5, 100);
      setPulling(pullDistance.current > 60);

      if (pullDistance.current > 0) {
        e.preventDefault();
      }
    } else {
      // Scrolled away from the top (or moved upward) mid-gesture — cancel
      // the pull so a fast scroll can't be mistaken for a refresh drag.
      startY.current = 0;
      pullDistance.current = 0;
      setPulling(false);
    }
  }, []);

  const handleTouchEnd = useCallback(async (e) => {
    const elapsed = startTime.current ? e.timeStamp - startTime.current : 0;
    // A genuine pull-to-refresh is a slow, deliberate drag. A fast flick can
    // rack up the same pixel distance in a fraction of the time — require a
    // minimum duration so quick scroll gestures never trigger a refresh.
    const isDeliberatePull = elapsed >= 200;

    if (pullDistance.current > 60 && isDeliberatePull && !refreshingRef.current) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }

    setPulling(false);
    startY.current = 0;
    startTime.current = 0;
    pullDistance.current = 0;
  }, [onRefresh]);

  // Attach touchmove with { passive: false } so preventDefault works on iOS Safari
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div
      ref={containerRef}
      className="min-h-screen"
    >
      {/* Pull to refresh indicator */}
      <div 
        className={`fixed top-16 left-0 right-0 flex items-center justify-center transition-all duration-200 lg:hidden ${
          pulling || refreshing ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ 
          transform: `translateY(${pulling ? pullDistance.current - 60 : 0}px)`,
          paddingTop: 'env(safe-area-inset-top)'
        }}
      >
        <div className="bg-white dark:bg-slate-800 rounded-full p-3 shadow-lg">
          <RefreshCw className={`w-5 h-5 text-emerald-600 ${refreshing ? 'animate-spin' : ''}`} />
        </div>
      </div>
      
      {children}
    </div>
  );
}
import React, { useState, useRef } from "react";
import { RefreshCw } from "lucide-react";

export default function PullToRefresh({ onRefresh, children }) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pullDistance = useRef(0);

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (startY.current === 0 || refreshing) return;
    
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;
    
    if (distance > 0 && window.scrollY === 0) {
      pullDistance.current = Math.min(distance, 100);
      setPulling(pullDistance.current > 60);
      
      if (pullDistance.current > 0) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance.current > 60 && !refreshing) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
    
    setPulling(false);
    startY.current = 0;
    pullDistance.current = 0;
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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
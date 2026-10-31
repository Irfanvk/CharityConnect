import React from "react";
import { THEME_PRESETS, resolveThemeId } from "@/themes/presets";

const Crescent = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
  </svg>
);

const Lantern = ({ className }) => (
  <svg viewBox="0 0 24 40" className={className} fill="currentColor" aria-hidden="true">
    <rect x="11" y="0" width="2" height="8" />
    <path d="M7 8h10l2 6-2 14H7L5 14l2-6Z" opacity=".9" />
    <rect x="9" y="30" width="6" height="3" rx="1" />
  </svg>
);

const Star = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="m12 2 2.6 6.4L21 9.3l-5 4.4 1.5 6.8L12 17l-5.5 3.5L8 13.7 3 9.3l6.4-.9L12 2Z" />
  </svg>
);

// Decorative only: aria-hidden, no pointer events, low opacity so text contrast is unaffected.
export default function ThemeDecoration({ themeId, className = "" }) {
  const decoration = THEME_PRESETS[resolveThemeId(themeId)].decoration;
  if (!decoration) return null;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-y-0 right-0 flex items-center gap-3 pr-4 text-amber-500/60 dark:text-amber-300/40 ${className}`}
    >
      {decoration === "ramadan" && (
        <>
          <Lantern className="h-8 w-4 -translate-y-1" />
          <Crescent className="h-8 w-8" />
          <Lantern className="hidden h-6 w-3 translate-y-1 sm:block" />
        </>
      )}
      {decoration === "eid" && (
        <>
          <Star className="h-4 w-4" />
          <Star className="h-6 w-6" />
          <Crescent className="h-7 w-7" />
          <Star className="hidden h-3 w-3 sm:block" />
        </>
      )}
      {decoration === "festive" && (
        <>
          <Star className="h-5 w-5 text-orange-500/60" />
          <Star className="h-5 w-5 text-slate-400/60" />
          <Star className="h-5 w-5 text-green-600/60" />
        </>
      )}
      {decoration === "campaign" && (
        <>
          <Star className="h-4 w-4" />
          <Star className="h-6 w-6" />
        </>
      )}
    </div>
  );
}

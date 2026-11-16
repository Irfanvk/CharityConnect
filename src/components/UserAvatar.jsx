import React, { useState } from "react";
import { Plus } from "lucide-react";

const SIZES = {
  sm: "h-9 w-9 text-sm",
  md: "h-12 w-12 text-lg",
  lg: "h-16 w-16 text-2xl",
  xl: "h-20 w-20 text-3xl",
};

export function initialsOf(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/**
 * The person's round photo; without one (or if it fails to load) a coloured circle with
 * their initials. `showAdd` puts a small "+" on it as a nudge to add a photo.
 */
export default function UserAvatar({ url, name, size = "sm", showAdd = false, className = "" }) {
  const [broken, setBroken] = useState(false);
  const hasPhoto = Boolean(url) && !broken;
  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      <span className={`flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 font-semibold text-white ring-2 ring-white dark:ring-slate-900 ${SIZES[size] || SIZES.sm}`}>
        {hasPhoto ? (
          <img src={url} alt={name || "Profile photo"} className="h-full w-full object-cover" onError={() => setBroken(true)} />
        ) : (
          initialsOf(name)
        )}
      </span>
      {showAdd && !hasPhoto && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-white dark:ring-slate-900" aria-hidden>
          <Plus className="h-3 w-3" />
        </span>
      )}
    </span>
  );
}

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { usePublicSettings } from "@/lib/usePublicSettings";

const STYLES = {
  info: "bg-sky-50 text-sky-950 border-sky-200 dark:bg-sky-950 dark:text-sky-50 dark:border-sky-800",
  success: "bg-emerald-50 text-emerald-950 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-50 dark:border-emerald-800",
  warning: "bg-amber-50 text-amber-950 border-amber-300 dark:bg-amber-950 dark:text-amber-50 dark:border-amber-800",
  festive: "bg-gradient-to-r from-amber-50 via-rose-50 to-violet-50 text-slate-900 border-amber-200 dark:from-amber-950 dark:via-rose-950 dark:to-violet-950 dark:text-slate-50 dark:border-amber-800",
};

const storageKey = (userId) => `announcement_dismissed:${userId ?? "anon"}`;

const readDismissed = (userId) => {
  try {
    return window.localStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
};

const isHttps = (value) => /^https:\/\//i.test(String(value || ""));

// Text is rendered as a React text node (escaped); the link is only used when it is https.
export default function AnnouncementBanner({ userId }) {
  const { announcement } = usePublicSettings();
  const [dismissedStamp, setDismissedStamp] = useState(() => readDismissed(userId));

  useEffect(() => {
    setDismissedStamp(readDismissed(userId));
  }, [userId]);

  if (!announcement?.text) return null;
  const stamp = announcement.updated_at || "none";
  if (announcement.dismissible && dismissedStamp === stamp) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(storageKey(userId), stamp);
    } catch {
      /* storage unavailable: hide for this session only */
    }
    setDismissedStamp(stamp);
  };

  return (
    <div role="status" className={`flex items-start gap-3 border-b px-4 py-2 text-sm lg:px-8 ${STYLES[announcement.style] || STYLES.info}`}>
      <p className="flex-1">
        {announcement.text}
        {isHttps(announcement.link_url) && (
          <>
            {" "}
            <a href={announcement.link_url} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
              Learn more
            </a>
          </>
        )}
      </p>
      {announcement.dismissible && (
        <button type="button" onClick={dismiss} aria-label="Dismiss announcement" className="rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

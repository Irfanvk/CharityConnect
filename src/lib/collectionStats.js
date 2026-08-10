import { startOfDay, startOfWeek, startOfMonth, startOfYear, isAfter, isEqual } from "@/lib/dateTime";

const MEMBER_STATS_VISIBLE_KEY = "cc_member_stats_visible";

/**
 * Compute collection stats from an array of challans.
 * Only counts challans with status === 'approved'.
 *
 * @param {Array} challans - Normalized challan objects
 * @returns {{ today: number, thisWeek: number, thisMonth: number, thisYear: number, allTime: number }}
 */
export function computeCollectionStats(challans) {
  const now = new Date();
  const dayStart = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const monthStart = startOfMonth(now);
  const yearStart = startOfYear(now);

  let today = 0;
  let thisWeek = 0;
  let thisMonth = 0;
  let thisYear = 0;
  let allTime = 0;

  for (const c of challans) {
    if (c.status !== "approved") continue;
    const amt = Number(c.amount) || 0;
    if (amt <= 0) continue;

    allTime += amt;

    const date = new Date(c.approved_at || c.created_date || c.created_at);
    if (isNaN(date.getTime())) continue;

    if (isAfter(date, yearStart) || isEqual(date, yearStart)) {
      thisYear += amt;
    }
    if (isAfter(date, monthStart) || isEqual(date, monthStart)) {
      thisMonth += amt;
    }
    if (isAfter(date, weekStart) || isEqual(date, weekStart)) {
      thisWeek += amt;
    }
    if (isAfter(date, dayStart) || isEqual(date, dayStart)) {
      today += amt;
    }
  }

  return { today, thisWeek, thisMonth, thisYear, allTime };
}

/** Admin sets whether members can see collection stats */
export function setMemberStatsVisible(visible) {
  try {
    localStorage.setItem(MEMBER_STATS_VISIBLE_KEY, visible ? "1" : "0");
  } catch {
    // Silently fail in restricted storage contexts
  }
}

/** Read the admin preference for member stats visibility */
export function isMemberStatsVisible() {
  try {
    return localStorage.getItem(MEMBER_STATS_VISIBLE_KEY) === "1";
  } catch {
    return false;
  }
}

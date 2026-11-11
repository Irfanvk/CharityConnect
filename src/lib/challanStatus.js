/**
 * A "pending" challan with nothing handed in (no proof, not a bulk payment,
 * not admin-recorded) is a month that is simply not paid yet - the 2026-04
 * import created one for every unpaid month. The backend sends
 * `submitted: false` for those; older responses without the flag count as submitted.
 */
export const isNotPaidYet = (challan) =>
  Boolean(challan) && challan.submitted === false && ["pending", "generated"].includes(challan.status);

/** "2026-02" -> "Feb 2026"; anything else is returned unchanged. */
export function formatMonth(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value || ""));
  if (!match) return value || "";
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

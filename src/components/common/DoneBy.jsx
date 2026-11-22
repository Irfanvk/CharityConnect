import { formatBusinessDate } from "@/lib/businessTime";

// "Approved by admin (A12) · 20 Nov 2026" in small text. The server already sends admins as
// "admin (A12)" (never their name) and members by their own name.
export function doneByText(verb, by, at) {
  if (!by) return "";
  const day = at ? formatBusinessDate(at, { day: "numeric" }) : "";
  return `${verb} by ${by}${day ? ` · ${day}` : ""}`;
}

export default function DoneBy({ verb, by, at, className = "" }) {
  const text = doneByText(verb, by, at);
  if (!text) return null;
  return <span className={`block text-xs text-muted-foreground ${className}`}>{text}</span>;
}

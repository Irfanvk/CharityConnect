import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Hourglass } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { formatMonth } from "@/lib/challanStatus";

/*
 * Dashboard notice for payments started without proof.
 * Members: their own, with a link to My payments. Admins: those open 2+ days, with a link
 * to the Unfinished payments page. Shows nothing when there are none.
 */
export default function UnfinishedNotice({ isAdmin }) {
  const { data } = useQuery({
    queryKey: ["challans", "unfinished", isAdmin ? "48" : "mine"],
    queryFn: () => charityClient.challans.unfinished(isAdmin ? { min_hours: 48 } : {}),
    staleTime: 60 * 1000,
    retry: false,
  });
  const items = (data?.items || []).filter((i) => !isAdmin || !i.already_paid);
  if (!items.length) return null;

  const n = items.length;
  const members = new Set(items.map((i) => i.member_id)).size;
  const title = isAdmin
    ? `${n} unfinished payment${n === 1 ? "" : "s"} from ${members} member${members === 1 ? "" : "s"}`
    : `${n === 1 ? "1 payment is" : `${n} payments are`} not finished`;
  const text = isAdmin
    ? "Started 2+ days ago with no proof. Remind, record or cancel them."
    : `No proof uploaded yet: ${items.slice(0, 3).map((i) => (i.month ? formatMonth(i.month) : i.what)).join(", ")}${n > 3 ? ` and ${n - 3} more` : ""}. Upload the proof or cancel.`;

  return (
    <Link
      to={isAdmin ? "/Unfinished" : "/Challans?unfinished=1"}
      className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-900"><Hourglass className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm">{text}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0" />
    </Link>
  );
}

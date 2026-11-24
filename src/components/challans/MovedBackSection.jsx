import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, History, Undo2 } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { formatISTDate } from "@/lib/dateTime";
import PaymentHistoryDialog from "@/components/challans/PaymentHistoryDialog";

/*
 * Payments that were approved, then moved back for checking, and are not approved again yet.
 * Their money is not counted until then. Admins are reminded once a week after 7 days.
 */

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const days = (n) => (n <= 0 ? "today" : `${n} day${n === 1 ? "" : "s"} ago`);

export default function MovedBackSection({ highlight = false }) {
  const [historyFor, setHistoryFor] = useState(null);
  const { data } = useQuery({
    queryKey: ["challans", "moved-back"],
    queryFn: () => charityClient.challans.movedBack(),
    staleTime: 60 * 1000,
  });
  const items = data?.items || [];
  const remindAfter = data?.remind_after_days || 7;
  if (items.length === 0) {
    return highlight ? (
      <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
        No payment is waiting to be approved again.
      </p>
    ) : null;
  }

  return (
    <section className={`space-y-3 rounded-2xl border p-4 ${highlight ? "border-amber-400 bg-amber-50/60" : "border-amber-200 bg-amber-50/30"} dark:border-amber-800 dark:bg-amber-950/20`}>
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <Undo2 className="h-5 w-5 text-amber-600" />Moved back, waiting to be approved again ({items.length})
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          This money is not counted until another admin approves it again. Admins are reminded after {remindAfter} days.
        </p>
      </div>
      <ul className="space-y-2">
        {items.map((item) => {
          const late = item.days >= remindAfter;
          const link = item.kind === "bulk"
            ? `/Challans?status=pending&bulk=${encodeURIComponent(item.bulk_group_id)}`
            : `/Challans?status=pending&challan=${item.id}`;
          return (
            <li key={`${item.kind}-${item.bulk_group_id || item.id}`} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white">{item.what}</p>
                  <p className="font-mono text-xs text-slate-500">{item.number}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-semibold">{item.member_code}</span> · {item.member_name || "Member"}
                  </p>
                </div>
                <p className="shrink-0 text-lg font-bold tabular-nums">{inr(item.amount)}</p>
              </div>
              <p className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${late ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>
                {late && <AlertTriangle className="h-3.5 w-3.5" />}
                Moved back {days(item.days)}
                {item.moved_back_at && ` (${formatISTDate(item.moved_back_at, { day: "numeric", month: "short" })})`}
                {item.moved_back_by && ` by ${item.moved_back_by}`}
              </p>
              {item.reason && <p className="mt-1 text-sm text-amber-900 dark:text-amber-200">Reason: {item.reason}</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button asChild className="h-10 gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                  <Link to={link}>Open to check<ArrowRight className="h-4 w-4" /></Link>
                </Button>
                <Button variant="outline" className="h-10 gap-1.5 bg-white"
                  onClick={() => setHistoryFor(item.kind === "bulk" ? { bulkGroupId: item.bulk_group_id } : { id: item.id })}>
                  <History className="h-4 w-4" />History
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <PaymentHistoryDialog target={historyFor} onOpenChange={(open) => { if (!open) setHistoryFor(null); }} />
    </section>
  );
}

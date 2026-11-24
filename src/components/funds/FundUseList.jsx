import React from "react";
import { formatBusinessDate } from "@/lib/businessTime";

/**
 * Fund use entries as members see them.
 * Only approved entries are money spent. A rejected entry is shown crossed out
 * with the committee's reason, and a waiting one is marked as not counted yet.
 */
export function approvedFundRecords(records = []) {
  return records.filter((r) => r?.status === "approved");
}

export default function FundUseList({ records = [], limit = 5, emptyText = "No fund use recorded yet." }) {
  const shown = [...records]
    .sort((a, b) => new Date(b?.date || b?.created_at || 0) - new Date(a?.date || a?.created_at || 0))
    .slice(0, limit);

  if (shown.length === 0) {
    return <p className="text-sm text-slate-500">{emptyText}</p>;
  }

  return (
    <div className="space-y-2">
      {shown.map((record) => {
        const rejected = record.status === "rejected";
        const waiting = record.status !== "approved" && !rejected;
        const box = rejected
          ? "bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900"
          : "bg-slate-50 dark:bg-slate-800";
        return (
          <div key={record.id} className={`rounded-lg p-3 ${box}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className={`text-sm font-medium text-slate-800 dark:text-slate-100 ${rejected ? "line-through decoration-rose-400" : ""}`}>
                  {record.title || "Fund use"}
                </p>
                <p className="text-xs text-slate-500">
                  {record.category || "Other"} •{" "}
                  {record.date ? formatBusinessDate(record.date, { month: "short", day: "2-digit", year: "numeric" }) : "—"}
                </p>
              </div>
              <span
                className={`text-sm font-semibold whitespace-nowrap ${
                  rejected ? "text-slate-400 line-through" : waiting ? "text-slate-400" : "text-rose-600"
                }`}
              >
                ₹{Number(record.amount || 0).toLocaleString()}
              </span>
            </div>
            {rejected && (
              <div className="mt-2 text-xs text-rose-700 dark:text-rose-300">
                <p className="font-semibold">Rejected — this money was not spent and is not counted.</p>
                {record.rejection_reason && <p className="mt-0.5">Reason: {record.rejection_reason}</p>}
              </div>
            )}
            {waiting && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                Waiting for approval — not counted yet.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

import React from "react";
import { doneByText } from "@/components/common/DoneBy";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { formatMonth } from "@/lib/challanStatus";

/*
 * A member's monthly fee over time (admins, in the member form). A new fee always starts
 * NEXT month; this month and earlier keep the fee of that time, paid months keep what was paid.
 */
const SOURCE = { start: "starting fee", admin: "changed by an admin", request: "member's request approved" };

export default function FeeHistory({ memberId, currentFee, newFee }) {
  const { data } = useQuery({
    queryKey: ["members", memberId, "fees"],
    queryFn: () => charityClient.members.feeHistory(memberId),
    enabled: Boolean(memberId),
    staleTime: 30 * 1000,
  });
  const changing = Number.isFinite(Number(newFee)) && Number(newFee) > 0 && Math.abs(Number(newFee) - Number(currentFee || 0)) > 0.005;
  const history = data?.history || [];
  const waiting = data?.upcoming || null;
  // the entry in force now: the last one that is not the waiting change
  const nowIndex = history.length - 1 - (waiting && history[history.length - 1]?.effective_from === waiting.effective_from ? 1 : 0);

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
      {changing && (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-900">
          The new fee ₹{Number(newFee).toLocaleString("en-IN")} starts next month. This month and earlier months stay at the fee of that time; paid months keep what was paid.
        </p>
      )}
      <p className="flex items-center gap-1.5 font-semibold text-slate-700"><History className="h-4 w-4" />Fee history</p>
      {history.length === 0 ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <ol className="space-y-1">
          {[...history].reverse().map((h, i) => (
            <li key={`${h.effective_from}-${i}`} className="flex flex-wrap justify-between gap-2">
              <span>From {formatMonth(h.effective_from)}{h === history[nowIndex] ? " (now)" : waiting && h.effective_from === waiting.effective_from && h === history[history.length - 1] ? " (starts next month)" : ""}</span>
              <span className="font-semibold tabular-nums">₹{Number(h.amount).toLocaleString("en-IN")}</span>
              <span className="w-full text-xs text-slate-500">
                {SOURCE[h.source] || h.source}{h.changed_by ? ` · ${doneByText("Changed", h.changed_by, h.created_at)}` : ""}{h.note ? ` · ${h.note}` : ""}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

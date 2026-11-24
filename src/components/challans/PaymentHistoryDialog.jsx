import React from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Edit3, History, Loader2, PlayCircle, RotateCcw, Upload, XCircle, Bell } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatBusinessDateTime } from "@/lib/businessTime";
import { formatMonth } from "@/lib/challanStatus";

/*
 * The story of one payment, from the audit log: started → proof → approved → moved back
 * (why) → changed (old → new) → new proof → approved again. Members see "the committee".
 * target = { id } for one payment or { bulkGroupId } for several months with one proof.
 */

const ICONS = {
  challan_approve: [CheckCircle2, "text-emerald-600 bg-emerald-50"],
  bulk_approve: [CheckCircle2, "text-emerald-600 bg-emerald-50"],
  challan_revert: [RotateCcw, "text-amber-700 bg-amber-50"],
  bulk_revert: [RotateCcw, "text-amber-700 bg-amber-50"],
  challan_reject: [XCircle, "text-rose-600 bg-rose-50"],
  bulk_reject: [XCircle, "text-rose-600 bg-rose-50"],
  challan_update: [Edit3, "text-sky-700 bg-sky-50"],
  challan_proof_upload: [Upload, "text-violet-700 bg-violet-50"],
  challan_unfinished_remind: [Bell, "text-slate-500 bg-slate-100"],
};

const show = (field, value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (field === "Amount" || field === "Amount received") return `₹${Number(value).toLocaleString("en-IN")}`;
  if (field === "Month") return formatMonth(value);
  if (field === "Paid by") return String(value).replace("_", " ");
  return String(value);
};

export default function PaymentHistoryDialog({ target, onOpenChange }) {
  const open = Boolean(target);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["challans", "history", target?.id || null, target?.bulkGroupId || null],
    queryFn: () => charityClient.challans.history(target),
    enabled: open,
    staleTime: 30 * 1000,
  });
  const steps = data?.steps || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><History className="h-5 w-5 text-slate-600" />Payment history</DialogTitle>
          <DialogDescription>{data?.number ? `${data.number} · ` : ""}everything that happened to this payment, oldest first.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="flex items-center gap-2 py-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading…</p>
        ) : isError ? (
          <p className="py-6 text-sm text-rose-600">Could not load the history. Please try again.</p>
        ) : steps.length === 0 ? (
          <p className="py-6 text-sm text-slate-500">No history recorded for this payment.</p>
        ) : (
          <ol className="relative space-y-4 border-l border-slate-200 pl-6 dark:border-slate-700">
            {steps.map((s) => {
              const [Icon, cls] = ICONS[s.action] || [PlayCircle, "text-slate-600 bg-slate-100"];
              return (
                <li key={`${s.id}-${s.action}`} className="relative">
                  <span className={`absolute -left-[34px] flex h-7 w-7 items-center justify-center rounded-full ${cls}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.label}</p>
                  <p className="text-xs text-slate-500">
                    {s.at ? formatBusinessDateTime(s.at) : ""}{s.by ? ` · ${s.by}` : ""}
                  </p>
                  {s.reason && (
                    <p className="mt-1 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                      Reason: {s.reason}
                    </p>
                  )}
                  {s.changes?.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-xs text-slate-700 dark:text-slate-300">
                      {s.changes.map((c) => (
                        <li key={c.field}>
                          {c.field}: <span className="line-through text-slate-400">{show(c.field, c.from)}</span> → <b>{show(c.field, c.to)}</b>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        )}
        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

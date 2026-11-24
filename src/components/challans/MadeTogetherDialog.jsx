import React, { useEffect, useState } from "react";
import { Layers, Loader2, Trash2 } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { formatMonth } from "@/lib/challanStatus";

/*
 * Undo for many "not paid yet" months made one by one at the same time (e.g. 36 separate
 * challans instead of one): join them into one payment (one payment number, the member
 * uploads one proof for all) or cancel them all. Nothing paid is ever touched.
 * action = { kind: "join" | "cancel", rows: [challan...] }
 */

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export function madeTogetherKey(c) {
  if (!c || c.is_bulk_group || c.bulk_group_id || c.type !== "monthly" || c.status !== "generated") return null;
  if (c.proof_url || c.proof_path || !c.created_by_user_id) return null;
  const at = String(c.created_at || c.created_date || "").slice(0, 19);
  return at ? `${c.member_id}|${c.created_by_user_id}|${at}` : null;
}

export default function MadeTogetherDialog({ action, onOpenChange, onDone }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  useEffect(() => { if (action) { setBusy(false); setReason("Made one by one by mistake"); } }, [action]);

  const rows = [...(action?.rows || [])].sort((a, b) => String(a.month).localeCompare(String(b.month)));
  const join = action?.kind === "join";
  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const first = rows[0];
  const last = rows[rows.length - 1];
  const who = first ? [first.member_code, first.member_name].filter(Boolean).join(" · ") : "";

  const go = async () => {
    setBusy(true);
    try {
      const ids = rows.map((r) => Number(r.id));
      if (join) {
        const out = await charityClient.challans.join(ids);
        toast({ title: "Joined into one payment", description: `${rows.length} months are now payment ${out?.challan_no}. The member can pay and upload one proof for all.` });
      } else {
        await charityClient.challans.cancelMany(ids, reason.trim());
        toast({ title: `${rows.length} payments cancelled`, description: "Nothing was paid on them. The months can be made again any time." });
      }
      onDone?.();
      onOpenChange(false);
    } catch (e) {
      const detail = typeof e?.data?.detail === "string" ? e.data.detail : e?.message;
      toast({ title: join ? "Could not join them" : "Could not cancel them", description: detail || "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={Boolean(action)} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {join ? <Layers className="h-5 w-5 text-emerald-600" /> : <Trash2 className="h-5 w-5 text-rose-600" />}
            {join ? `Join ${rows.length} months into one payment?` : `Cancel all ${rows.length} payments?`}
          </DialogTitle>
          <DialogDescription>{who}</DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border bg-slate-50 p-3 text-sm dark:bg-slate-900">
          <p className="font-semibold">{first && last ? `${formatMonth(first.month)} – ${formatMonth(last.month)}` : ""} ({rows.length} months)</p>
          <p className="text-slate-600 dark:text-slate-300">{inr(total)} in all · nothing paid yet</p>
        </div>
        {join ? (
          <p className="text-sm text-slate-700 dark:text-slate-300">
            They get one payment number. The member sees one payment and uploads one proof for all the months, or you record the money with <b>New payment</b> when it comes. Either way it becomes one bulk payment.
          </p>
        ) : (
          <div className="space-y-1.5">
            <p className="text-sm text-slate-700 dark:text-slate-300">They are removed. Each cancel is kept in the Audit log with your reason.</p>
            <Textarea rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" />
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Back</Button>
          <Button onClick={go} disabled={busy} className={join ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{join ? "Yes, join them" : "Yes, cancel all"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

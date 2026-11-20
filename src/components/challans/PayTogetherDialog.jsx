import React, { useEffect, useMemo, useState } from "react";
import { CheckSquare, Loader2, Square } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { usePublicSettings } from "@/lib/usePublicSettings";
import { formatMonth } from "@/lib/challanStatus";
import ProofPicker, { proofFileProblem } from "@/components/challans/ProofPicker";
import PaymentInstructions from "@/components/branding/PaymentInstructions";

/*
 * Pay several open months with one proof. The member ticks the months (all ticked when
 * opened from a payment started with "one proof for all, upload later"), adds one proof,
 * and the months become one payment that an admin checks in one step.
 */

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function PayTogetherDialog({ open, onOpenChange, candidates = [], initialIds = [], onDone }) {
  const { toast } = useToast();
  const maxUploadMb = Number(usePublicSettings().proof_max_upload_mb) || 5;
  const [picked, setPicked] = useState([]);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const months = useMemo(
    () => [...candidates].sort((a, b) => String(a.month).localeCompare(String(b.month))),
    [candidates],
  );
  useEffect(() => {
    if (!open) return;
    const start = initialIds.length ? initialIds.map(String) : months.map((c) => String(c.id));
    setPicked(start);
    setFile(null);
    setError("");
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const chosen = months.filter((c) => picked.includes(String(c.id)));
  const total = chosen.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const toggle = (id) => setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const pick = (f) => {
    if (!f) { setFile(null); return; }
    const problem = proofFileProblem(f, maxUploadMb);
    setError(problem);
    setFile(problem ? null : f);
  };

  const send = async () => {
    setBusy(true);
    try {
      const uploaded = await charityClient.files.upload(file);
      const proofId = uploaded?.file_url || uploaded?.proof_file_id || uploaded?.filename || null;
      if (!proofId) throw new Error("The proof did not upload. Please try again.");
      const result = await charityClient.challans.payTogether({ challan_ids: chosen.map((c) => Number(c.id)), proof_file_id: proofId });
      toast({
        title: "Payment sent",
        description: `${result?.challan_no ? `${result.challan_no} · ` : ""}${chosen.length} months, ${inr(total)}. An admin will check it.`,
      });
      onDone?.(result);
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Could not send the payment", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pay months with one proof</DialogTitle>
          <DialogDescription>Tick the months this payment covers, then add the payment screenshot or receipt.</DialogDescription>
        </DialogHeader>

        <ul className="divide-y divide-slate-100 rounded-lg border bg-slate-50">
          {months.map((c) => {
            const on = picked.includes(String(c.id));
            return (
              <li key={c.id}>
                <button type="button" onClick={() => toggle(String(c.id))} aria-pressed={on}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left ${on ? "bg-emerald-50/60" : "hover:bg-white"}`}>
                  {on ? <CheckSquare className="h-4 w-4 shrink-0 text-emerald-600" /> : <Square className="h-4 w-4 shrink-0 text-slate-300" />}
                  <span className="flex-1 text-sm font-medium text-slate-800">{formatMonth(c.month)}</span>
                  <span className="text-sm tabular-nums text-slate-600">{inr(c.amount)}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
          <span>{chosen.length} month{chosen.length === 1 ? "" : "s"}</span><span>Total {inr(total)}</span>
        </div>

        <PaymentInstructions />

        <ProofPicker file={file} onPick={pick} onClear={() => setFile(null)} prompt="Add one proof for these months"
          maxUploadMb={maxUploadMb} error={error} />

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button type="button" onClick={send} disabled={busy || chosen.length < 2 || !file} className="bg-emerald-600 hover:bg-emerald-700">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send payment
          </Button>
        </div>
        {chosen.length < 2 && <p className="text-right text-xs text-slate-500">Tick at least two months (for one month, use Upload proof on it).</p>}
      </DialogContent>
    </Dialog>
  );
}

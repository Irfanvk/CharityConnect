import React, { useEffect, useState } from "react";
import { AlertTriangle, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { currentBusinessDate } from "@/lib/businessTime";
import ProofPicker, { proofFileProblem } from "@/components/challans/ProofPicker";
import { formatMonth } from "@/lib/challanStatus";

/*
 * Approve a payment after checking it against the bank: date received, how it was paid,
 * the bank / UPI / UTR reference, the amount actually received, an optional note and an
 * optional bank record (screenshot or PDF of the statement line). A reference already used
 * for another payment is shown and needs "approve anyway".
 *
 * payment = { kind: "single" | "bulk", id, bulkGroupId, number, memberLabel, what, amount,
 *             duplicateNote, method, reference, receivedOn }
 */

const METHODS = [["upi", "UPI"], ["bank_transfer", "Bank transfer"], ["cash", "Cash"], ["cheque", "Cheque"], ["other", "Other (e.g. exchange house)"]];
const NEEDS_REF = ["upi", "bank_transfer", "cheque"];
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

/** A challan, a grouped list row or a bulk payment, as the approve screen shows it. */
export function toApprovalPayment(item) {
  if (!item) return null;
  const bulk = Boolean(item.is_bulk_group || (!item.id && item.bulk_group_id) || item.months_count > 1);
  const months = [...(item.months_covered || item.months || (item.month ? [item.month] : []))].filter(Boolean).sort();
  const monthText = months.length > 1
    ? `${formatMonth(months[0])} – ${formatMonth(months[months.length - 1])} (${months.length} months)`
    : months.length ? formatMonth(months[0]) : "";
  const donation = ["donation", "campaign"].includes(item.type) || item.backend_type === "campaign";
  return {
    kind: bulk ? "bulk" : "single",
    id: bulk ? null : item.id,
    bulkGroupId: item.bulk_group_id || null,
    number: item.challan_no || (!bulk && item.challan_number) || item.bulk_group_id || `CH-${item.id}`,
    memberLabel: [item.member_code, item.member_name].filter(Boolean).join(" · ") || "Member",
    what: donation ? `Donation${item.campaign_name ? ` · ${item.campaign_name}` : ""}` : `Monthly fee · ${monthText}`,
    amount: Number((bulk ? item.total_amount ?? item.amount : item.amount) || 0),
    duplicateNote: item.proof_duplicate_of || null,
    method: item.payment_method || null,
    reference: item.transaction_ref || "",
    receivedOn: item.received_on || null,
  };
}

export default function ApprovePaymentDialog({ payment, onOpenChange, onApproved }) {
  const { toast } = useToast();
  const open = Boolean(payment);
  const [receivedOn, setReceivedOn] = useState(currentBusinessDate());
  const [method, setMethod] = useState("upi");
  const [reference, setReference] = useState("");
  const [noReference, setNoReference] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [record, setRecord] = useState(null);
  const [recordError, setRecordError] = useState("");
  const [duplicate, setDuplicate] = useState(null);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!payment) return;
    setReceivedOn(payment.receivedOn || currentBusinessDate());
    setMethod(METHODS.some(([v]) => v === payment.method) ? payment.method : "upi");
    setReference(payment.reference || "");
    setNoReference(false);
    setAmount(String(payment.amount ?? ""));
    setNote("");
    setRecord(null);
    setRecordError("");
    setDuplicate(null);
    setConfirmDuplicate(false);
  }, [payment]);

  const due = Number(payment?.amount || 0);
  const received = amount === "" ? NaN : Number(amount);
  const amountDiffers = Number.isFinite(received) && Math.abs(received - due) > 0.5;
  const refNeeded = NEEDS_REF.includes(method) && !noReference;
  const noteNeeded = amountDiffers || (NEEDS_REF.includes(method) && noReference) || method === "other";
  const ready = receivedOn && Number.isFinite(received) && received >= 0
    && (!refNeeded || reference.trim()) && (!noteNeeded || note.trim()) && (!duplicate || confirmDuplicate);

  const viewProof = async () => {
    setOpening(true);
    try {
      const link = await charityClient.files.proofLink(payment.kind === "bulk" ? { bulkGroupId: payment.bulkGroupId } : { challanId: payment.id });
      if (link?.url) window.open(link.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast({ title: "Could not open the proof", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setOpening(false);
    }
  };

  const approve = async () => {
    setBusy(true);
    try {
      let recordId;
      if (record) {
        const up = await charityClient.files.upload(record);
        recordId = up?.file_url || undefined;
      }
      const verification = {
        received_on: receivedOn,
        payment_method: method,
        transaction_ref: refNeeded || reference.trim() ? reference.trim() : undefined,
        received_amount: received,
        verification_note: note.trim() || undefined,
        bank_record_file_id: recordId,
        confirm_duplicate_ref: confirmDuplicate || undefined,
      };
      const result = payment.kind === "bulk"
        ? await charityClient.bulkOperations.approve(payment.bulkGroupId, { admin_notes: note.trim() || undefined, ...verification })
        : await charityClient.challans.approve(payment.id, verification);
      toast({ title: "Payment approved", description: `${payment.number || ""} · the member was told and the receipt is ready.` });
      onApproved?.(result, payment);
      onOpenChange(false);
    } catch (e) {
      // The server sends details as {detail: [{msg, input: {duplicate_of}}]} (or {detail: {...}}).
      const detail = e?.data?.detail;
      const usedFor = (Array.isArray(detail) ? detail[0]?.input?.duplicate_of : detail?.duplicate_of) || null;
      if (e?.status === 409 && usedFor) {
        setDuplicate(usedFor);
      } else {
        toast({ title: "Could not approve", description: e?.message || "Please try again.", variant: "destructive" });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600" />Approve payment</DialogTitle>
          <DialogDescription>Check the money in the bank (statement or bank app), then fill in what you see.</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-slate-50 p-3 text-sm dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-xs text-slate-500">{payment?.number}</p>
              <p className="font-semibold text-slate-900 dark:text-white">{payment?.memberLabel}</p>
              <p className="text-slate-600 dark:text-slate-300">{payment?.what}</p>
            </div>
            <p className="shrink-0 text-lg font-bold tabular-nums">{inr(due)}</p>
          </div>
          <Button type="button" variant="outline" size="sm" className="mt-2 h-8 gap-1.5 bg-white" onClick={viewProof} disabled={opening}>
            {opening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}View member's proof
          </Button>
        </div>

        {payment?.duplicateNote && (
          <p className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{payment.duplicateNote}. Make sure this is a different payment.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ap-date">Date received *</Label>
            <Input id="ap-date" type="date" value={receivedOn} max={currentBusinessDate()} onChange={(e) => setReceivedOn(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Paid by *</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{METHODS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {NEEDS_REF.includes(method) && (
          <div className="space-y-1.5">
            <Label htmlFor="ap-ref">Bank / UPI reference (UTR) {refNeeded && "*"}</Label>
            <Input id="ap-ref" value={reference} maxLength={100} disabled={noReference}
              onChange={(e) => { setReference(e.target.value); setDuplicate(null); setConfirmDuplicate(false); }}
              placeholder="e.g. 431245678901" />
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={noReference} onChange={(e) => { setNoReference(e.target.checked); setDuplicate(null); }} />
              No reference shown in the bank (explain in the note)
            </label>
          </div>
        )}

        {duplicate && (
          <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">
            <p className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>This reference was already used for <b>{duplicate}</b>.</span></p>
            <label className="mt-2 flex items-center gap-2">
              <input type="checkbox" checked={confirmDuplicate} onChange={(e) => setConfirmDuplicate(e.target.checked)} />
              I checked: one transfer really covers both. Approve anyway.
            </label>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="ap-amount">Amount received (₹) *</Label>
          <Input id="ap-amount" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
          {amountDiffers && <p className="text-xs text-amber-700">Different from the amount due ({inr(due)}). Please add a note.</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ap-note">Note {noteNeeded ? "*" : "(optional)"}</Label>
          <Textarea id="ap-note" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder={amountDiffers ? "e.g. Bank charge of ₹50 deducted" : "e.g. Paid through Al Ansari exchange"} />
        </div>

        <div className="space-y-1.5">
          <Label>Bank record (optional)</Label>
          <ProofPicker file={record} onClear={() => setRecord(null)} prompt="Screenshot or PDF of the bank statement line" maxUploadMb={5} error={recordError}
            onPick={(f) => { if (!f) { setRecord(null); return; } const p = proofFileProblem(f, 5); setRecordError(p); setRecord(p ? null : f); }} />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button type="button" onClick={approve} disabled={busy || !ready} className="bg-emerald-600 hover:bg-emerald-700">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Approve
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

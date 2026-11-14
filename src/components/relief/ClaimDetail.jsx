import React, { useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { format } from "@/lib/dateTime";
import { formatMemberId } from "@/lib/utils";
import { DocSlot, EligibilityChecks, ReliefStatus, docHref } from "./ReliefParts";

const METHODS = ["cash", "bank_transfer", "upi", "cheque"];

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-wrap justify-between gap-x-3 py-1.5 text-sm">
      <span className="text-slate-500">{label}</span><span className="font-medium text-slate-900 break-all">{value}</span>
    </div>
  );
}

/** One action dialog: approve (note), reject / cancel (reason), mark paid. */
function ActionDialog({ R, kind, claim, onClose, onDone }) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [paidOn, setPaidOn] = useState(format(new Date(), "yyyy-MM-dd"));
  const [method, setMethod] = useState("bank_transfer");
  const [receipt, setReceipt] = useState(null);
  const [busy, setBusy] = useState(false);
  const needsText = kind === "reject" || kind === "cancel";
  const title = { approve: R.t("confirmApprove"), reject: R.t("confirmReject"), paid: R.t("markPaid"), cancel: R.t("cancelClaim") }[kind];

  const run = async () => {
    setBusy(true);
    try {
      let out;
      if (kind === "approve") out = await charityClient.relief.approve(claim.id, text || null);
      if (kind === "reject") out = await charityClient.relief.reject(claim.id, text);
      if (kind === "cancel") out = await charityClient.relief.cancel(claim.id, text);
      if (kind === "paid") out = await charityClient.relief.markPaid(claim.id, { paid_on: paidOn, method, reference: text || null, receipt_url: receipt?.url || null });
      toast({ title: R.t("saved") });
      onDone(out);
    } catch (error) {
      toast({ title: R.t("failed"), description: error?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{claim.member_name} · {R.t(`reason_${claim.reason}`)} · {R.money(claim.amount)}</DialogDescription>
        </DialogHeader>
        {kind === "reject" && <p className="text-sm font-medium text-rose-700">{R.t("rejectWarning")}</p>}
        {kind === "paid" ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>{R.t("paidOn")}</Label><Input type="date" value={paidOn} max={format(new Date(), "yyyy-MM-dd")} onChange={(e) => setPaidOn(e.target.value)} className="h-11" /></div>
              <div className="space-y-1">
                <Label>{R.t("paidBy")}</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>{METHODS.map((m) => <SelectItem key={m} value={m}>{R.t(`method_${m}`)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label>{R.t("reference")}</Label><Input value={text} onChange={(e) => setText(e.target.value)} className="h-11" /></div>
            <DocSlot R={R} kind="other" doc={receipt} onChange={setReceipt} />
            <p className="-mt-1 text-xs text-slate-500">{R.t("receipt")}</p>
          </div>
        ) : (
          <div className="space-y-1">
            <Label>{kind === "approve" ? R.t("approveNote") : kind === "reject" ? R.t("rejectReason") : R.t("cancelReason")}</Label>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={1000} />
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>{R.t("close")}</Button>
          <Button
            onClick={run}
            disabled={busy || (needsText && !text.trim()) || (kind === "paid" && !paidOn)}
            className={kind === "reject" || kind === "cancel" ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {{ approve: R.t("approve"), reject: R.t("reject"), paid: R.t("save"), cancel: R.t("cancelClaim") }[kind]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ClaimDetail({ R, claim, viewerId, onChanged }) {
  const [action, setAction] = useState(null);
  const relationLabel = claim.receiver?.relation ? R.t(`relation_${claim.receiver.relation}`) : null;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <p className="text-xl font-bold text-slate-900">{claim.member_name}</p>
          <p className="text-sm text-slate-600">{formatMemberId(claim.member_code)}</p>
          <p className="mt-1 text-base font-semibold text-slate-800">
            {R.t(`reason_${claim.reason}`)}{claim.illness_type ? ` · ${R.t(`illness_${claim.illness_type}`)}` : ""}
          </p>
          {claim.reason === "retirement" && claim.gulf_from_year && (
            <p className="text-sm text-slate-600">{R.t("gulfYears")}: {claim.gulf_from_year} – {claim.gulf_to_year}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-emerald-800">{R.money(claim.amount)}</p>
          <ReliefStatus R={R} status={claim.status} />
          {claim.status === "pending" && (
            <p className="mt-1 text-sm text-slate-600">{R.t("approvalsProgress", { n: claim.approvals_count, total: claim.approvals_needed })}</p>
          )}
        </div>
      </div>

      {/* What this admin can do */}
      <div className="flex flex-wrap gap-2">
        {claim.can_decide && (
          <>
            <Button onClick={() => setAction("approve")} className="h-12 gap-2 bg-emerald-600 px-6 text-base hover:bg-emerald-700"><CheckCircle2 className="h-5 w-5" />{R.t("approve")}</Button>
            <Button onClick={() => setAction("reject")} variant="outline" className="h-12 gap-2 border-rose-300 px-6 text-base text-rose-700 hover:bg-rose-50"><XCircle className="h-5 w-5" />{R.t("reject")}</Button>
          </>
        )}
        {claim.can_mark_paid && <Button onClick={() => setAction("paid")} className="h-12 bg-emerald-600 px-6 text-base hover:bg-emerald-700">{R.t("markPaid")}</Button>}
        {claim.can_cancel && <Button onClick={() => setAction("cancel")} variant="ghost" className="h-12 text-slate-600">{R.t("cancelClaim")}</Button>}
      </div>
      {claim.status === "pending" && claim.created_by_user_id === viewerId && <p className="text-sm text-slate-600">{R.t("youCreated")}</p>}
      {claim.my_decision && <p className="text-sm text-slate-600">{R.t("youDecided", { decision: R.t(claim.my_decision === "approve" ? "approve" : "reject") })}</p>}
      {claim.rejection_reason && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{claim.rejection_reason}</p>}
      {claim.cancelled_reason && <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{claim.cancelled_reason}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="space-y-2">
          <p className="text-base font-bold text-slate-900">{R.t("rulesCheck")}</p>
          <EligibilityChecks R={R} eligibility={claim.eligibility} compact />
        </section>
        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="mb-1 text-base font-bold text-slate-900">{R.t("receiver")}</p>
            <Row label={R.t("receiverName")} value={claim.receiver?.name} />
            <Row label={R.t("relation")} value={relationLabel} />
            <Row label={R.t("phone")} value={claim.receiver?.phone} />
            <Row label={R.t("bankAccount")} value={claim.receiver?.bank_account} />
            <Row label={R.t("ifsc")} value={claim.receiver?.ifsc} />
            <Row label={R.t("bankName")} value={claim.receiver?.bank_name} />
            <Row label={R.t("upi")} value={claim.receiver?.upi} />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="mb-2 text-base font-bold text-slate-900">{R.t("documents")}</p>
            <ul className="space-y-1.5">
              {(claim.documents || []).map((d, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">{R.t(`doc_${d.kind}`)}{d.name ? ` · ${d.name}` : ""}</span>
                  <a href={docHref(d.url)} target="_blank" rel="noreferrer" className="shrink-0 rounded-md border border-slate-200 px-3 py-1 text-slate-700 hover:bg-slate-50">{R.t("viewDoc")}</a>
                </li>
              ))}
            </ul>
          </div>
          {claim.details && <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">{claim.details}</p>}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
            <p className="mb-1 text-base font-bold text-slate-900">{R.t("decisions")}</p>
            <p className="text-slate-600">{R.t("createdBy")}: <b>{claim.created_by_name}</b> · {R.date(claim.created_at)}</p>
            {(claim.decisions || []).map((d, i) => (
              <p key={i} className="flex items-start gap-2 py-1">
                {d.decision === "approve" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />}
                <span><b>{d.admin_name}</b> · {R.date(d.at)}{d.note ? ` · ${d.note}` : ""}</span>
              </p>
            ))}
            {claim.status === "paid" && (
              <p className="mt-2 font-medium text-emerald-800">
                ✓ {R.t("status_paid")}: {R.date(claim.paid_on)} · {R.t(`method_${claim.paid_method}`)}{claim.paid_reference ? ` · ${claim.paid_reference}` : ""}
                {claim.paid_receipt_url && <> · <a className="underline" href={docHref(claim.paid_receipt_url)} target="_blank" rel="noreferrer">{R.t("receipt")}</a></>}
              </p>
            )}
          </div>
        </section>
      </div>

      {action && <ActionDialog R={R} kind={action} claim={claim} onClose={() => setAction(null)} onDone={(out) => { setAction(null); onChanged(out); }} />}
    </div>
  );
}

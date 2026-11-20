import React from "react";
import { CheckCircle2, Clock, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PaymentInstructions from "@/components/branding/PaymentInstructions";

/*
 * Shown right after a payment is saved: its real number(s), what it covers and the amount.
 * Without proof yet: how to pay (bank details / QR) and "Upload proof now".
 * info = { numbers: [..], what, amount, sent, note, uploadLabel }
 */

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function PaymentStartedDialog({ info, onOpenChange, onUploadNow }) {
  const open = Boolean(info);
  const numbers = [...new Set(info?.numbers || [])].filter(Boolean);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {info?.sent ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Clock className="h-5 w-5 text-amber-600" />}
            {info?.sent ? "Payment sent" : "Payment started"}
          </DialogTitle>
          <DialogDescription>
            {info?.sent ? "An admin will check the proof. You will get a notification when it is approved." : "Pay the amount below, then upload the payment screenshot or receipt."}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {numbers.length > 1 ? "Payment numbers" : "Payment number"}
          </p>
          <p className="mt-0.5 break-words font-mono text-xl font-bold text-slate-900 dark:text-white">
            {numbers.length > 3 ? `${numbers[0]} … ${numbers[numbers.length - 1]}` : numbers.join(", ") || "—"}
          </p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <p className="min-w-0 text-sm text-slate-700 dark:text-slate-200">{info?.what}</p>
            <p className="shrink-0 text-xl font-bold tabular-nums text-slate-900 dark:text-white">{inr(info?.amount)}</p>
          </div>
          {info?.note && <p className="mt-2 text-xs text-slate-500">{info.note}</p>}
        </div>

        {!info?.sent && <PaymentInstructions />}

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{info?.sent ? "Done" : "Upload later"}</Button>
          {!info?.sent && onUploadNow && (
            <Button type="button" onClick={onUploadNow} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Upload className="h-4 w-4" />{info?.uploadLabel || "Upload proof now"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

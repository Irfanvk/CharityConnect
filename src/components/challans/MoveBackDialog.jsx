import React, { useEffect, useState } from "react";
import { CalendarX, FileWarning, Hash, Loader2, MoreHorizontal, ReceiptText, Undo2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/*
 * Move a payment back for checking: pick what is wrong (big buttons), add a short note.
 * The reason saved is "<what is wrong>: <note>", so reasons can be counted later.
 */

export const MOVE_BACK_REASONS = [
  ["Wrong date", CalendarX],
  ["Proof problem", FileWarning],
  ["Wrong amount", Wallet],
  ["Wrong month", ReceiptText],
  ["Wrong reference", Hash],
  ["Other", MoreHorizontal],
];

export default function MoveBackDialog({ open, onOpenChange, onConfirm, minLength = 10, wasApproved = true, label }) {
  const [kind, setKind] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setKind(null); setNote(""); setBusy(false); }
  }, [open]);

  const reason = kind ? (kind === "Other" ? note.trim() : `${kind}: ${note.trim()}`) : "";
  const ready = Boolean(kind) && note.trim().length >= 3 && reason.length >= minLength;

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm(reason);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Undo2 className="h-5 w-5 text-amber-600" />Move back for checking</DialogTitle>
          <DialogDescription>
            {label ? `${label}. ` : ""}
            {wasApproved
              ? "The money stops counting until it is approved again. A different admin must approve it again, not you."
              : "It goes back to the list of payments to check."}
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">What is wrong?</p>
        <div className="grid grid-cols-2 gap-2">
          {MOVE_BACK_REASONS.map(([text, Icon]) => (
            <button
              key={text}
              type="button"
              onClick={() => setKind(text)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-medium transition-colors ${
                kind === text
                  ? "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
                  : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />{text}
            </button>
          ))}
        </div>

        {kind && (
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {kind === "Other" ? "Write what is wrong" : "A short note"}
            </p>
            <Textarea
              rows={2}
              maxLength={300}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={{
                "Wrong date": "e.g. Paid on 3 Oct, not 13 Oct",
                "Proof problem": "e.g. Screenshot is blurry, amount not visible",
                "Wrong amount": "e.g. Bank shows ₹450, not ₹500",
                "Wrong month": "e.g. This was for September",
                "Wrong reference": "e.g. UTR does not match the bank",
              }[kind] || "Explain what is wrong"}
            />
            {!ready && note.trim().length > 0 && (
              <p className="text-xs text-rose-600">Please write a little more ({minLength} characters at least).</p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={confirm} disabled={!ready || busy} className="bg-amber-600 hover:bg-amber-700">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Move back
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

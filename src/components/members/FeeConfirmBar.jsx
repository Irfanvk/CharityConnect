import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeIndianRupee, Loader2 } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { formatBusinessDate } from "@/lib/businessTime";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const errorText = (e) => (typeof e?.data?.detail === "string" ? e.data.detail : e?.message) || "Please try again.";

/* Admins, on the Members page: new members who joined by invite and chose their own monthly
   fee. Confirm it, or set another amount (with a reason the member sees). */
export default function FeeConfirmBar({ focusMemberId }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["fees-to-confirm"],
    queryFn: () => charityClient.members.feesToConfirm(),
    staleTime: 60 * 1000,
  });
  const [changing, setChanging] = useState(null); // the member whose fee is being changed
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const confirm = useMutation({
    mutationFn: ({ id, body }) => charityClient.members.confirmFee(id, body),
    onSuccess: (out) => {
      toast({ title: out?.changed ? "Fee set" : "Fee confirmed", description: `${inr(out?.monthly_amount)} a month. The member was told.` });
      setChanging(null);
      queryClient.invalidateQueries({ queryKey: ["fees-to-confirm"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (e) => toast({ title: "Could not save", description: errorText(e), variant: "destructive" }),
  });

  if (!data.length) return null;
  const sorted = focusMemberId ? [...data].sort((a, b) => (b.member_id === Number(focusMemberId)) - (a.member_id === Number(focusMemberId))) : data;
  return (
    <div className="space-y-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
      <p className="flex items-center gap-1.5 font-semibold">
        <BadgeIndianRupee className="h-4 w-4" />New members' fees to confirm ({data.length})
      </p>
      {sorted.map((m) => (
        <div key={m.member_id} className={`flex flex-col gap-2 rounded-lg bg-white p-2 sm:flex-row sm:items-center sm:justify-between ${Number(focusMemberId) === m.member_id ? "ring-2 ring-sky-300" : ""}`}>
          <span>
            <span className="font-semibold">{m.full_name || m.member_code}</span> <span className="text-xs text-slate-500">{m.member_code}</span>
            <span className="block text-slate-700">
              Chose <b>{inr(m.monthly_amount)}</b> a month{m.joined ? ` · joined ${formatBusinessDate(m.joined, { day: "numeric" })}` : ""}
            </span>
          </span>
          <span className="flex shrink-0 gap-2">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={confirm.isPending}
              onClick={() => confirm.mutate({ id: m.member_id, body: {} })}>
              Confirm {inr(m.monthly_amount)}
            </Button>
            <Button size="sm" variant="outline" className="bg-white" disabled={confirm.isPending}
              onClick={() => { setChanging(m); setAmount(String(m.monthly_amount || "")); setNote(""); }}>
              Change
            </Button>
          </span>
        </div>
      ))}

      <Dialog open={Boolean(changing)} onOpenChange={(open) => { if (!open) setChanging(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Set the monthly fee</DialogTitle>
            <DialogDescription>
              {changing?.full_name || changing?.member_code} chose {inr(changing?.monthly_amount)}. The new amount applies from
              the month they joined; payments already handed in keep their amount.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="fee-amount">Monthly fee (₹)</Label>
              <Input id="fee-amount" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fee-note">Reason (the member sees this)</Label>
              <Textarea id="fee-note" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Committee rate for members working in the Gulf" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setChanging(null)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700"
                disabled={confirm.isPending || amount === "" || Number(amount) < 0 ||
                  (Number(amount) !== Number(changing?.monthly_amount) && !note.trim())}
                onClick={() => confirm.mutate({ id: changing.member_id, body: { monthly_amount: Number(amount), note: note.trim() || undefined } })}>
                {confirm.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

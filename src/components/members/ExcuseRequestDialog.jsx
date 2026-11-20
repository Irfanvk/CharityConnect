import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { monthName, useT } from "@/lib/appLanguage";

/*
 * Members: ask the committee to excuse months they cannot pay (e.g. no work). An admin
 * approves or rejects; until then the months still show as not paid.
 */
const STATUS = {
  requested: { label: "Waiting for the committee", cls: "border-amber-200 bg-amber-50 text-amber-800" },
  approved: { label: "Excused", cls: "border-sky-200 bg-sky-50 text-sky-800" },
  rejected: { label: "Not approved", cls: "border-slate-200 bg-slate-50 text-slate-600" },
};

export default function ExcuseRequestDialog({ open, onOpenChange, months = [] }) {
  const L = useT();
  const { t } = L;
  const qc = useQueryClient();
  const { toast } = useToast();
  const [picked, setPicked] = useState([]);
  const [reason, setReason] = useState("");
  const { data } = useQuery({ queryKey: ["my-seasonal"], queryFn: () => charityClient.members.mySeasonal(), enabled: open });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["my-seasonal"] }); qc.invalidateQueries({ queryKey: ["my-statement"] }); };
  const fail = (err) => toast({ title: t("Not sent"), description: err?.message || t("Please try again."), variant: "destructive" });
  const send = useMutation({
    mutationFn: () => charityClient.members.requestExcused({ months: picked, reason }),
    onSuccess: () => { refresh(); setPicked([]); setReason(""); toast({ title: t("Request sent"), description: t("The committee will answer you here.") }); },
    onError: fail,
  });
  const withdraw = useMutation({ mutationFn: (id) => charityClient.members.cancelExcusedRequest(id), onSuccess: refresh, onError: fail });
  const asked = new Set((data?.excused || []).filter((e) => e.status !== "rejected").map((e) => e.month));
  const choices = months.filter((m) => !asked.has(m));
  const toggle = (m) => setPicked((p) => (p.includes(m) ? p.filter((x) => x !== m) : [...p, m].sort()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Ask to be excused")}</DialogTitle>
          <DialogDescription>{t("If you cannot pay some months (for example, no work), ask the committee. If they agree, nothing is owed for those months.")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {choices.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-3 text-slate-600">{t("There is no month to ask for in this year.")}</p>
          ) : (
            <>
              <p className="font-semibold text-slate-700">{t("Which months?")}</p>
              <div className="grid grid-cols-3 gap-1.5">
                {choices.map((m) => (
                  <button key={m} type="button" onClick={() => toggle(m)} aria-pressed={picked.includes(m)}
                    className={`rounded-lg border px-2 py-2 font-semibold ${picked.includes(m) ? "border-sky-600 bg-sky-600 text-white" : "border-slate-200 bg-white"}`}>
                    {monthName(m, L.locale)}
                  </button>
                ))}
              </div>
              <div className="space-y-1">
                <Label htmlFor="excuse-why">{t("Why?")}</Label>
                <Textarea id="excuse-why" rows={2} maxLength={300} placeholder={t("e.g. No work these months")} value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
              <Button className="h-11 w-full bg-emerald-600 hover:bg-emerald-700" disabled={!picked.length || reason.trim().length < 5 || send.isPending} onClick={() => send.mutate()}>
                {send.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("Send request")}
              </Button>
            </>
          )}
          {(data?.excused || []).length > 0 && (
            <div className="space-y-1">
              <p className="font-semibold text-slate-700">{t("My requests")}</p>
              <ul className="space-y-1">
                {data.excused.map((e) => (
                  <li key={e.id} className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 p-2">
                    <span>
                      <span className="font-semibold">{monthName(e.month, L.locale)}</span>{" "}
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS[e.status]?.cls || ""}`}>{t(STATUS[e.status]?.label || e.status)}</span>
                      {e.status === "rejected" && e.decision_note && <span className="block text-xs text-slate-600">{e.decision_note}</span>}
                    </span>
                    {e.status === "requested" && (
                      <Button size="icon" variant="ghost" title={t("Withdraw")} disabled={withdraw.isPending} onClick={() => withdraw.mutate(e.id)}><Trash2 className="h-4 w-4" /></Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

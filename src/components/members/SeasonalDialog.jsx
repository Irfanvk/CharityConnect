import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarOff, Check, HandCoins, Loader2, Trash2, X } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { formatMonth } from "@/lib/challanStatus";

/*
 * Admins: months a member cannot pay (backend seasonal.py).
 * - Excused months: owed nothing (e.g. no work); members can ask, an admin decides here.
 * - Yearly pledge: for seasonal members, a total for the Aug-Jul year instead of every month.
 * - Monthly membership off: owes no monthly fee at all (e.g. one-time contributions only).
 */
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export const fyMonths = (year) => [8, 9, 10, 11, 12].map((m) => `${year}-${String(m).padStart(2, "0")}`)
  .concat([1, 2, 3, 4, 5, 6, 7].map((m) => `${year + 1}-${String(m).padStart(2, "0")}`));
const STATUS = {
  approved: { label: "Excused", cls: "border-sky-200 bg-sky-50 text-sky-800" },
  requested: { label: "Asked by member", cls: "border-amber-200 bg-amber-50 text-amber-800" },
  rejected: { label: "Not approved", cls: "border-slate-200 bg-slate-50 text-slate-600" },
};

export default function SeasonalDialog({ member, open, onOpenChange }) {
  const id = member?.id;
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ["members", id, "seasonal"],
    queryFn: () => charityClient.members.seasonal(id),
    enabled: Boolean(open && id),
  });
  const currentYear = data?.current_year;
  const [year, setYear] = useState(null);
  useEffect(() => { if (open && currentYear && year === null) setYear(currentYear); }, [open, currentYear, year]);
  useEffect(() => { if (!open) setYear(null); }, [open]);
  const months = useMemo(() => (year ? fyMonths(year) : []), [year]);
  const { data: statement } = useQuery({
    queryKey: ["members", id, "seasonal-year", year],
    queryFn: () => charityClient.reports.memberStatement(id, { from_month: months[0], to_month: months[11] }),
    enabled: Boolean(open && id && year),
  });
  const stateOf = useMemo(() => Object.fromEntries((statement?.months || []).map((m) => [m.month, m.state])), [statement]);

  const [picked, setPicked] = useState([]);
  const [reason, setReason] = useState("");
  const [pledgeAmount, setPledgeAmount] = useState("");
  const [pledgeNote, setPledgeNote] = useState("");
  const [rejecting, setRejecting] = useState(null); // { id, note }
  const [confirmOff, setConfirmOff] = useState(false);
  useEffect(() => { setPicked([]); }, [year]);
  useEffect(() => {
    const p = (data?.pledges || []).find((x) => x.year === year);
    setPledgeAmount(p ? String(p.amount) : "");
    setPledgeNote(p?.note || "");
  }, [data, year]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["members", id] });
    qc.invalidateQueries({ queryKey: ["excuse-requests"] });
    qc.invalidateQueries({ queryKey: ["members"] });
    qc.invalidateQueries({ queryKey: ["reports"] });
  };
  const fail = (err) => toast({ title: "Not saved", description: err?.message || "Please try again.", variant: "destructive" });
  const run = (fn, done) => ({ mutationFn: fn, onSuccess: (out) => { refresh(); done?.(out); }, onError: fail });

  const excuse = useMutation(run(() => charityClient.members.excuseMonths(id, { months: picked, reason }), (out) => {
    toast({ title: "Months excused", description: `${out.excused.map(formatMonth).join(", ")}: nothing is owed.` });
    setPicked([]); setReason("");
  }));
  const decide = useMutation(run(({ eid, approve, note }) => charityClient.members.decideExcused(id, eid, { approve, note }),
    () => setRejecting(null)));
  const unexcuse = useMutation(run((eid) => charityClient.members.removeExcused(id, eid)));
  const pledge = useMutation(run(() => charityClient.members.setPledge(id, { year, amount: Number(pledgeAmount), note: pledgeNote }),
    (out) => toast({ title: "Pledge saved", description: `${out.label}: ${inr(out.amount)}` })));
  const unpledge = useMutation(run((pid) => charityClient.members.removePledge(id, pid)));
  const monthly = useMutation(run((on) => charityClient.members.setMonthlyMember(id, on), (out) => {
    setConfirmOff(false);
    toast({ title: out.monthly_member ? "Monthly membership on" : "Not a monthly member now",
      description: out.monthly_member ? "Set the monthly fee in Edit; it starts next month." : "No monthly fee is owed. One-time contributions still work." });
  }));

  const isMonthly = data?.monthly_member !== false;
  const fee = Number(data?.monthly_fee || member?.monthly_amount || 0);
  const pledgeForYear = (data?.pledges || []).find((x) => x.year === year);
  const excusedForYear = (data?.excused || []).filter((e) => months.includes(e.month));
  const requests = (data?.excused || []).filter((e) => e.status === "requested");
  const toggle = (m) => setPicked((p) => (p.includes(m) ? p.filter((x) => x !== m) : [...p, m].sort()));
  const name = member?.full_name || member?.name || member?.member_code;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Months not paid: {name}</DialogTitle>
          <DialogDescription>
            {member?.member_code} · Excused months, a yearly pledge for seasonal work, or no monthly membership.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <p className="flex items-center gap-2 py-6 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading…</p>
        ) : (
          <div className="space-y-5 text-sm">
            {/* Monthly membership */}
            <section className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">Monthly member</p>
                  <p className="text-slate-600">
                    {isMonthly ? `Pays ${inr(fee)} a month.` : "Not a monthly member: no monthly fee is owed (one-time contributions only)."}
                  </p>
                </div>
                <Switch checked={isMonthly} disabled={monthly.isPending}
                  onCheckedChange={(on) => (on ? monthly.mutate(true) : setConfirmOff(true))} aria-label="Monthly member" />
              </div>
              {confirmOff && (
                <div className="mt-3 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
                  <p>Turn off monthly membership? The monthly fee becomes ₹0, no month is owed any more, and the &quot;not paid yet&quot; months are removed. Paid months stay as they are.</p>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700" disabled={monthly.isPending} onClick={() => monthly.mutate(false)}>Yes, turn off</Button>
                    <Button size="sm" variant="outline" onClick={() => setConfirmOff(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </section>

            {/* Requests waiting */}
            {requests.length > 0 && (
              <section className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="font-semibold text-amber-900">Asked by the member ({requests.length})</p>
                {requests.map((e) => (
                  <div key={e.id} className="rounded-lg bg-white p-2">
                    <p><span className="font-semibold">{formatMonth(e.month)}</span> · {e.reason}</p>
                    {rejecting?.id === e.id ? (
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <Input autoFocus placeholder="Why not? (the member sees this)" value={rejecting.note}
                          onChange={(ev) => setRejecting({ id: e.id, note: ev.target.value })} />
                        <Button size="sm" variant="destructive" disabled={!rejecting.note.trim() || decide.isPending}
                          onClick={() => decide.mutate({ eid: e.id, approve: false, note: rejecting.note })}>Reject</Button>
                        <Button size="sm" variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700" disabled={decide.isPending}
                          onClick={() => decide.mutate({ eid: e.id, approve: true })}><Check className="h-4 w-4" />Approve</Button>
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => setRejecting({ id: e.id, note: "" })}><X className="h-4 w-4" />Reject</Button>
                      </div>
                    )}
                  </div>
                ))}
              </section>
            )}

            {isMonthly && (
              <>
                {/* Year */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-700">Year</span>
                  {[currentYear - 1, currentYear, currentYear + 1].filter((y) => y >= 2024).map((y) => (
                    <button key={y} type="button" onClick={() => setYear(y)} aria-pressed={year === y}
                      className={`rounded-full border px-3 py-1.5 font-semibold ${year === y ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 bg-white text-slate-700"}`}>
                      {y}-{y + 1}
                    </button>
                  ))}
                </div>

                {/* Excused months */}
                <section className="space-y-2 rounded-xl border border-slate-200 p-3">
                  <p className="flex items-center gap-1.5 font-semibold text-slate-900"><CalendarOff className="h-4 w-4" />Excused months</p>
                  <p className="text-slate-600">
                    Nothing is owed for an excused month and no reminder is sent.
                    {data.excused_limit_per_year > 0 ? ` At most ${data.excused_limit_per_year} a year (${data.excused_this_year} used in ${data.current_year_label}).` : ""}
                  </p>
                  <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                    {months.map((m) => {
                      const st = stateOf[m];
                      const done = st === "paid" || st === "waiting";
                      const excused = st === "excused";
                      const on = picked.includes(m);
                      return (
                        <button key={m} type="button" disabled={done || excused} onClick={() => toggle(m)} aria-pressed={on}
                          className={`rounded-lg border px-2 py-1.5 text-left ${on ? "border-sky-600 bg-sky-600 text-white"
                            : excused ? "border-sky-200 bg-sky-50 text-sky-800" : done ? "border-emerald-200 bg-emerald-50 text-emerald-800 opacity-70"
                              : "border-slate-200 bg-white hover:border-sky-300"}`}>
                          <span className="block font-semibold">{formatMonth(m)}</span>
                          <span className="text-xs">{excused ? "Excused" : st === "paid" ? "Paid" : st === "waiting" ? "Waiting" : st === "pledge" ? "Pledge year" : "Not paid"}</span>
                        </button>
                      );
                    })}
                  </div>
                  {picked.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="excuse-reason">Reason (the member sees it)</Label>
                      <Textarea id="excuse-reason" rows={2} maxLength={300} placeholder="e.g. No work these months" value={reason} onChange={(e) => setReason(e.target.value)} />
                      <Button className="bg-sky-600 hover:bg-sky-700" disabled={!reason.trim() || excuse.isPending} onClick={() => excuse.mutate()}>
                        {excuse.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Excuse {picked.length} month{picked.length > 1 ? "s" : ""}
                      </Button>
                    </div>
                  )}
                  {excusedForYear.length > 0 && (
                    <ul className="space-y-1">
                      {excusedForYear.map((e) => (
                        <li key={e.id} className="flex items-start justify-between gap-2 rounded-lg bg-slate-50 p-2">
                          <span>
                            <span className="font-semibold">{formatMonth(e.month)}</span>{" "}
                            <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS[e.status]?.cls || ""}`}>{STATUS[e.status]?.label || e.status}</span>
                            <span className="block text-xs text-slate-600">{e.reason}{e.decided_by ? ` · ${e.decided_by}` : ""}{e.decision_note ? ` · ${e.decision_note}` : ""}</span>
                          </span>
                          {e.status !== "requested" && (
                            <Button size="icon" variant="ghost" title={e.status === "approved" ? "Undo: the month is owed again" : "Remove"}
                              disabled={unexcuse.isPending} onClick={() => unexcuse.mutate(e.id)}><Trash2 className="h-4 w-4" /></Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {/* Pledge */}
                <section className="space-y-2 rounded-xl border border-slate-200 p-3">
                  <p className="flex items-center gap-1.5 font-semibold text-slate-900"><HandCoins className="h-4 w-4" />Yearly pledge (seasonal work)</p>
                  <p className="text-slate-600">
                    Instead of every month, the member promises a total for {year}-{year + 1} and pays when they can. Months are not owed one by one; what is left is owed by the end of July.
                  </p>
                  {pledgeForYear && (
                    <div className="rounded-lg bg-emerald-50 p-2 text-emerald-900">
                      Pledged {inr(pledgeForYear.amount)} · paid {inr(pledgeForYear.paid)}
                      {pledgeForYear.waiting > 0 ? ` · waiting ${inr(pledgeForYear.waiting)}` : ""} · <b>left {inr(pledgeForYear.left)}</b>
                    </div>
                  )}
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="pledge-amount">Total for the year (₹)</Label>
                      <Input id="pledge-amount" type="number" min="1" className="w-36" value={pledgeAmount} onChange={(e) => setPledgeAmount(e.target.value)} />
                    </div>
                    {fee > 0 && [3, 6, 9].map((n) => (
                      <Button key={n} type="button" size="sm" variant="outline" onClick={() => setPledgeAmount(String(n * fee))}>{n} × {inr(fee)}</Button>
                    ))}
                  </div>
                  <Input placeholder="Note, e.g. works 6 months a year" maxLength={300} value={pledgeNote} onChange={(e) => setPledgeNote(e.target.value)} />
                  <div className="flex gap-2">
                    <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={!(Number(pledgeAmount) > 0) || pledge.isPending} onClick={() => pledge.mutate()}>
                      {pledgeForYear ? "Change pledge" : "Save pledge"}
                    </Button>
                    {pledgeForYear && (
                      <Button variant="outline" disabled={unpledge.isPending} onClick={() => unpledge.mutate(pledgeForYear.id)}>Remove pledge</Button>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

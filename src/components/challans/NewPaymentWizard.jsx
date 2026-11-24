import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Camera, CheckCircle2, ChevronRight, FileCheck2, HandCoins, Heart,
  Landmark, Loader2, Search, Smartphone, User, UserRound, CalendarDays, Globe2,
} from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { isAdminRole } from "@/lib/roles";
import { usePublicSettings } from "@/lib/usePublicSettings";
import { currentBusinessDate, currentBusinessMonth, formatBusinessDate } from "@/lib/businessTime";
import { formatMonth } from "@/lib/challanStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { isOwnMemberRecord } from "@/components/challans/AdminRecordPaymentForm";

/*
 * "New payment" for admins and executives, one simple question per screen:
 *   whose payment -> what for -> which months (or campaign) -> cash in hand, or how it was sent
 *   -> proof / reference / date -> check -> saved.
 * Saved with the same "money already received" entry as before (another admin verifies it).
 * One month is a single payment; several months become one payment together (bulk) automatically.
 * My own payment (admins pay like every member, with one login): same simple steps, saved like a
 * member's payment with the screenshot; another admin approves it (nobody records money for themselves).
 */

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const SENT_WAYS = [
  { value: "upi", icon: Smartphone, title: "UPI", sub: "GPay, PhonePe, Paytm…", refLabel: "UPI reference / UTR number" },
  { value: "bank_transfer", icon: Landmark, title: "Bank transfer", sub: "NEFT, IMPS, RTGS", refLabel: "UTR / reference number" },
  { value: "cheque", icon: FileCheck2, title: "Cheque", sub: "Cheque or demand draft", refLabel: "Cheque number" },
  { value: "other", icon: Globe2, title: "Exchange house / other", sub: "Al Ansari, Lulu, a friend…", refLabel: "" },
];
const NEEDS_REF = ["upi", "bank_transfer", "cheque"];

function BigChoice({ icon: Icon, title, sub, onClick, tone = "emerald", disabled = false }) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    sky: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-4 text-left transition hover:border-emerald-400 hover:bg-emerald-50/40 active:scale-[0.99] disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
    >
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${tones[tone]}`}>
        <Icon className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-slate-900 dark:text-white">{title}</span>
        {sub && <span className="block text-sm text-slate-500 dark:text-slate-400">{sub}</span>}
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
    </button>
  );
}

function Question({ children, hint }) {
  return (
    <div className="space-y-1">
      <p className="text-lg font-semibold leading-snug text-slate-900 dark:text-white">{children}</p>
      {hint && <p className="text-sm text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

export default function NewPaymentWizard({
  open, onOpenChange, currentUser, ownMember, onOwnSubmit, onPayLater, onRecorded,
  presetMember = null, // opened from a member (Members, Unfinished): starts at "What for?"
}) {
  const { toast } = useToast();
  const settings = usePublicSettings();
  const maxUploadMb = Number(settings.proof_max_upload_mb) || 5;
  const today = currentBusinessDate();
  const fileRef = useRef(null);

  const [step, setStep] = useState("who");
  const [own, setOwn] = useState(false); // my own payment (as a member)
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [member, setMember] = useState(null);
  const [kind, setKind] = useState("monthly");
  const [months, setMonths] = useState([]);
  const [customAmount, setCustomAmount] = useState(false);
  const [amountPerMonth, setAmountPerMonth] = useState("");
  const [campaign, setCampaign] = useState(null);
  const [donation, setDonation] = useState("");
  const [method, setMethod] = useState(null); // cash | upi | bank_transfer | cheque | other
  const [reference, setReference] = useState("");
  const [paidOn, setPaidOn] = useState(today);
  const [collectedBy, setCollectedBy] = useState("");
  const [note, setNote] = useState("");
  const [proof, setProof] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const start = presetMember && !isOwnMemberRecord(presetMember, currentUser) ? presetMember : null;
    setStep(start ? "what" : (ownMember ? "who" : "pick")); setOwn(false); setHistory([]); setSearch(""); setTerm(""); setMember(start); setKind("monthly");
    setMonths([]); setCustomAmount(false); setAmountPerMonth(""); setCampaign(null); setDonation("");
    setMethod(null); setReference(""); setPaidOn(currentBusinessDate());
    setCollectedBy(currentUser?.id ? String(currentUser.id) : ""); setNote(""); setProof(null); setSaving(false);
  }, [open, currentUser, presetMember, ownMember]);

  useEffect(() => {
    const t = setTimeout(() => setTerm(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const go = (next) => { setHistory((h) => [...h, step]); setStep(next); };
  const back = () => {
    if (!history.length) { onOpenChange(false); return; }
    setStep(history[history.length - 1]);
    setHistory(history.slice(0, -1));
  };

  // ---- data
  const { data: found = [], isFetching: searching } = useQuery({
    queryKey: ["members", "wizard-search", term],
    enabled: open && term.length > 0,
    queryFn: () => charityClient.members.list({ search: term, limit: 12 }),
  });
  const { data: payable, isFetching: loadingMonths } = useQuery({
    queryKey: ["challans", "payable-months", "wizard", member?.id],
    enabled: open && !!member && kind === "monthly",
    queryFn: () => charityClient.challans.payableMonths({ member_id: Number(member.id), include_upcoming: true, include_unpaid_placeholders: true }),
  });
  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    enabled: open && kind === "campaign",
    queryFn: () => charityClient.campaigns.list(),
  });
  const canPickCollector = isAdminRole(currentUser);
  const { data: collectors = [] } = useQuery({
    queryKey: ["users", "collectors"],
    enabled: open && method === "cash" && canPickCollector,
    queryFn: async () => {
      const users = await charityClient.users.list({ is_active: true, limit: 200 });
      return users.filter((u) => ["admin", "superadmin", "executive"].includes(String(u.role).toLowerCase()));
    },
    placeholderData: currentUser ? [currentUser] : [],
  });

  const firstName = own ? "you" : String(member?.full_name || "the member").split(" ")[0];
  const allMonths = payable?.all_months || [];
  const thisMonth = payable?.current_month || currentBusinessMonth();
  const unpaid = allMonths.filter((m) => m <= thisMonth);
  const fees = payable?.month_fees || {};
  const feeOf = (m) => Number(fees[m] ?? member?.monthly_amount ?? 0);
  const total = kind === "monthly"
    ? (customAmount ? months.length * Number(amountPerMonth || 0) : months.reduce((s, m) => s + feeOf(m), 0))
    : Number(donation || 0);
  const amountChanged = kind === "monthly" && customAmount && months.some((m) => Number(amountPerMonth) !== feeOf(m));
  const noteRequired = !own && (method === "cash" || method === "other" || amountChanged);
  const way = SENT_WAYS.find((w) => w.value === method);
  const activeCampaigns = campaigns.filter((c) => String(c.status).toLowerCase() === "active");
  const results = useMemo(() => found.slice(0, 10), [found]);

  const pickProof = (file) => {
    if (!file) return;
    if (file.size > maxUploadMb * 1024 * 1024) {
      toast({ title: `The file must be ${maxUploadMb} MB or smaller.`, variant: "destructive" });
      return;
    }
    setProof(file);
  };

  const detailsProblem = () => {
    if (!paidOn || paidOn > today) return "The date can't be in the future.";
    if ((own || NEEDS_REF.includes(method)) && !proof) return "Please add the payment screenshot or photo.";
    if (noteRequired && !note.trim()) return "Please write a short note.";
    return null;
  };

  const saveOwn = async () => {
    setSaving(true);
    try {
      const many = kind === "monthly" && months.length > 1;
      await onOwnSubmit?.({
        member_id: member.id,
        type: kind === "monthly" ? "monthly" : "donation",
        payment_method: method,
        notes: note.trim() || undefined,
        amount: total,
        ...(kind === "monthly"
          ? {
            month: months[0], selected_months: months, months_covered: months, months_count: months.length,
            member_monthly_amount: Number(member?.monthly_amount || 0) || (months.length ? total / months.length : 0),
            proof_mode: many ? "shared" : "individual",
            shared_proof_file: many ? proof : null,
            proof_file: many ? null : proof,
          }
          : { campaign_id: campaign.id, campaign_name: campaign.title, proof_file: proof, proof_mode: "individual" }),
      });
      onOpenChange(false);
    } catch {
      // the Payments page shows the error; stay here so it can be tried again
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        member_id: member.id,
        type: kind,
        payment_method: method,
        received_on: paidOn,
        transaction_ref: NEEDS_REF.includes(method) ? reference.trim() || undefined : undefined,
        collected_by_user_id: method === "cash" ? (collectedBy || currentUser?.id) : undefined,
        entry_notes: note.trim() || undefined,
        ...(kind === "monthly"
          ? { months, ...(customAmount ? { amount_per_month: amountPerMonth } : {}) }
          : { campaign_id: campaign.id, amount: donation }),
      };
      const created = await charityClient.challans.adminRecord(payload, proof);
      go("done");
      onRecorded?.(created);
    } catch (error) {
      toast({
        title: error?.status === 409 ? "Already entered?" : "Could not save",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const forWhat = kind === "monthly"
    ? `${months.length} ${months.length === 1 ? "month" : "months"} (${months.map(formatMonth).join(", ")})`
    : `donation to ${campaign?.title || "a campaign"}`;
  const howText = method === "cash" ? "in cash, to " + (String(collectedBy) === String(currentUser?.id)
    ? "you" : (collectors.find((u) => String(u.id) === String(collectedBy))?.full_name || "a committee member"))
    : `by ${way?.title || method}`;

  // ---- screens
  const screens = {
    who: (
      <div className="space-y-3">
        <Question>Whose payment is it?</Question>
        <BigChoice icon={User} tone="amber" title="My own payment"
          sub={`${ownMember?.full_name || "Me"} · ${ownMember?.member_code || ownMember?.member_id || ""}`.trim()}
          onClick={() => { setOwn(true); setMember(ownMember); setMonths([]); go("what"); }} />
        <BigChoice icon={UserRound} tone="sky" title="Another member's payment" sub="Money a member paid or sent to you"
          onClick={() => { setOwn(false); setMember(null); go("pick"); }} />
      </div>
    ),

    pick: (
      <div className="space-y-4">
        <Question hint="Type a name, member ID or phone number.">Which member?</Question>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, MEM-0012 or phone"
            className="h-12 pl-10 text-base" />
        </div>
        {searching && results.length === 0 && <p className="text-sm text-slate-500"><Loader2 className="mr-1 inline h-4 w-4 animate-spin" />Searching…</p>}
        {!searching && term && results.length === 0 && <p className="text-sm text-slate-500">No member found.</p>}
        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((m) => {
              const mine = isOwnMemberRecord(m, currentUser);
              return (
                <BigChoice
                  key={m.id}
                  icon={UserRound}
                  tone={mine ? "slate" : "sky"}
                  title={m.full_name || m.member_code}
                  sub={mine ? (onOwnSubmit ? "This is you: tap to pay your own" : "This is you: use New payment on the Payments page") : [m.member_code || m.member_id, m.phone].filter(Boolean).join(" · ")}
                  disabled={mine && !onOwnSubmit}
                  onClick={() => { setOwn(mine); setMember(m); setMonths([]); go("what"); }}
                />
              );
            })}
          </div>
        )}
        <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-700">
          <button type="button" className="w-full text-center text-sm text-slate-500 underline-offset-2 hover:underline"
            onClick={() => { onOpenChange(false); onPayLater?.(); }}>
            Only make a challan for a member to pay later
          </button>
        </div>
      </div>
    ),

    what: (
      <div className="space-y-3">
        <Question>{own ? "What are you paying for?" : `What is ${firstName} paying for?`}</Question>
        <BigChoice icon={CalendarDays} title={own ? "My monthly fee" : "Monthly fee"} sub={member?.monthly_amount ? `${inr(member.monthly_amount)} a month` : undefined}
          onClick={() => { setKind("monthly"); go("months"); }} />
        <BigChoice icon={Heart} tone="rose" title={own ? "My donation to a campaign" : "Donation to a campaign"} onClick={() => { setKind("campaign"); go("campaign"); }} />
      </div>
    ),

    months: (
      <div className="space-y-4">
        <Question hint="Tap the months this money is for.">Which months?</Question>
        {loadingMonths ? (
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        ) : allMonths.length === 0 ? (
          <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{own ? "You have" : `${firstName} has`} no unpaid months. 🎉</p>
        ) : (
          <>
            {unpaid.length > 1 && (
              <Button type="button" variant="outline" className="h-11 w-full text-base" onClick={() => setMonths(unpaid)}>
                All unpaid months ({unpaid.length})
              </Button>
            )}
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {allMonths.map((m) => {
                const on = months.includes(m);
                return (
                  <button key={m} type="button"
                    onClick={() => setMonths((prev) => (on ? prev.filter((x) => x !== m) : [...prev, m].sort()))}
                    className={`rounded-lg border-2 px-2 py-2.5 text-sm font-medium ${on ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"}`}>
                    {formatMonth(m)}
                    <span className={`block text-xs ${on ? "text-emerald-100" : m > thisMonth ? "text-sky-600" : "text-slate-500"}`}>
                      {m > thisMonth ? "ahead" : inr(feeOf(m))}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
        {months.length > 0 && (
          <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800">
            <p className="text-base font-semibold">{months.length} {months.length === 1 ? "month" : "months"} · {inr(total)}</p>
            <p className="text-slate-600 dark:text-slate-300">
              {months.length === 1 ? "Saved as one payment." : "Saved together as one payment (one number, one proof)."}
            </p>
            {own ? null : !customAmount ? (
              <button type="button" className="mt-1 text-sm text-emerald-700 hover:underline"
                onClick={() => { setCustomAmount(true); setAmountPerMonth(String(member?.monthly_amount || "")); }}>
                The amount is different?
              </button>
            ) : (
              <div className="mt-2 space-y-1">
                <Label htmlFor="wiz-apm">Amount for each month (₹)</Label>
                <Input id="wiz-apm" type="number" inputMode="decimal" min="1" value={amountPerMonth}
                  onChange={(e) => setAmountPerMonth(e.target.value)} className="h-11 text-base" />
                {amountChanged && <p className="text-xs text-amber-700">Different from the fee: you'll write the reason in a note.</p>}
              </div>
            )}
          </div>
        )}
        <Button className="h-12 w-full bg-emerald-600 text-base hover:bg-emerald-700" disabled={!months.length || total <= 0}
          onClick={() => go("how")}>
          Next
        </Button>
      </div>
    ),

    campaign: (
      <div className="space-y-4">
        <Question>Which campaign?</Question>
        {activeCampaigns.length === 0 ? (
          <p className="text-sm text-slate-500">No campaign is running.</p>
        ) : (
          <div className="space-y-2">
            {activeCampaigns.map((c) => (
              <button key={c.id} type="button" onClick={() => setCampaign(c)}
                className={`w-full rounded-xl border-2 p-3 text-left text-base font-medium ${campaign?.id === c.id ? "border-emerald-600 bg-emerald-50" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"}`}>
                {c.title}
              </button>
            ))}
          </div>
        )}
        {campaign && (
          <div className="space-y-1">
            <Label htmlFor="wiz-don" className="text-base">How much? (₹)</Label>
            <Input id="wiz-don" type="number" inputMode="decimal" min="1" value={donation}
              onChange={(e) => setDonation(e.target.value)} className="h-12 text-lg" />
          </div>
        )}
        <Button className="h-12 w-full bg-emerald-600 text-base hover:bg-emerald-700" disabled={!campaign || Number(donation) <= 0}
          onClick={() => go("how")}>
          Next
        </Button>
      </div>
    ),

    how: own ? (
      <div className="space-y-3">
        <Question>How did you pay?</Question>
        {SENT_WAYS.map((w) => (
          <BigChoice key={w.value} icon={w.icon} tone="sky" title={w.title} sub={w.sub}
            onClick={() => { setMethod(w.value); go("details"); }} />
        ))}
        <BigChoice icon={HandCoins} tone="slate" title="Cash" sub="Given to another admin or the treasurer"
          onClick={() => { setMethod("cash"); go("ownCash"); }} />
      </div>
    ) : (
      <div className="space-y-3">
        <Question>Did {firstName} give the money to you, in your hand?</Question>
        <BigChoice icon={HandCoins} title="Yes, cash in my hand" sub="I (or a committee member) received it"
          onClick={() => { setMethod("cash"); go("details"); }} />
        <BigChoice icon={Smartphone} tone="sky" title="No, they sent it" sub="UPI, bank transfer, cheque…"
          onClick={() => go("sentHow")} />
      </div>
    ),

    ownCash: (
      <div className="space-y-4">
        <Question>Give the cash to another admin</Question>
        <p className="rounded-lg bg-amber-50 p-3 text-base text-amber-900 dark:bg-amber-900/20 dark:text-amber-100">
          Nobody records cash for themselves. Hand the {inr(total)} to another admin or the treasurer. They enter it with
          <b> New payment → Another member's payment → your name → Yes, cash in my hand</b>, and a third admin approves it.
        </p>
        <Button className="h-12 w-full text-base" variant="outline" onClick={() => onOpenChange(false)}>OK, close</Button>
      </div>
    ),

    sentHow: (
      <div className="space-y-3">
        <Question>How did {firstName} send it?</Question>
        {SENT_WAYS.map((w) => (
          <BigChoice key={w.value} icon={w.icon} tone="sky" title={w.title} sub={w.sub}
            onClick={() => { setMethod(w.value); go("details"); }} />
        ))}
      </div>
    ),

    details: (
      <div className="space-y-4">
        {method === "cash" ? (
          <Question hint="This is saved, and another admin checks it.">Cash received: a few details</Question>
        ) : (
          <Question hint={own ? `Upload the ${method === "cheque" ? "photo of the cheque" : "screenshot of your payment"}.` : `Upload the ${method === "cheque" ? "photo of the cheque" : "screenshot"} ${firstName} sent you.`}>
            {way?.title}: add the proof
          </Question>
        )}

        {method !== "cash" && (
          <div className="space-y-2">
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
              onChange={(e) => { pickProof(e.target.files?.[0]); e.target.value = ""; }} />
            <Button type="button" variant="outline" className="h-14 w-full gap-2 border-2 border-dashed text-base"
              onClick={() => fileRef.current?.click()}>
              <Camera className="h-5 w-5" />
              {proof ? "Change the photo / file" : method === "cheque" ? "Add photo of the cheque" : "Add the screenshot"}
            </Button>
            {proof && <p className="flex items-center gap-1 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />{proof.name}</p>}
            {method === "other" && !own && <p className="text-xs text-slate-500">Optional for this way of paying.</p>}
          </div>
        )}

        {NEEDS_REF.includes(method) && !own && (
          <div className="space-y-1">
            <Label htmlFor="wiz-ref" className="text-base">{way?.refLabel} <span className="font-normal text-slate-500">(if you can see it)</span></Label>
            <Input id="wiz-ref" value={reference} maxLength={100} onChange={(e) => setReference(e.target.value)}
              placeholder={method === "cheque" ? "e.g. 004512" : "e.g. 431245678901"} className="h-12 text-base" />
            <p className="text-xs text-slate-500">
              {method === "cheque"
                ? "The number printed at the bottom of the cheque. Leave it empty if you can't read it."
                : "Look on the screenshot for \"UTR\", \"UPI Ref No.\" or \"Transaction ID\". Not there? Leave it empty: the screenshot is enough, and the admin who approves checks the money in the bank."}
            </p>
          </div>
        )}

        {!own && <div className="space-y-1">
          <Label htmlFor="wiz-date" className="text-base">{method === "cash" ? "When did you get it?" : "When did they send it?"}</Label>
          <Input id="wiz-date" type="date" max={today} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} className="h-12 text-base" />
        </div>}

        {method === "cash" && canPickCollector && (
          <div className="space-y-1">
            <Label className="text-base">Who received the cash?</Label>
            <div className="grid grid-cols-1 gap-2">
              {collectors.map((u) => (
                <button key={u.id} type="button" onClick={() => setCollectedBy(String(u.id))}
                  className={`rounded-lg border-2 px-3 py-2 text-left text-sm ${String(collectedBy) === String(u.id) ? "border-emerald-600 bg-emerald-50 font-semibold" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"}`}>
                  {u.full_name || u.username}{String(u.id) === String(currentUser?.id) ? " (me)" : ""}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="wiz-note" className="text-base">Note {noteRequired ? "" : "(optional)"}</Label>
          <Textarea id="wiz-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="text-base"
            placeholder={method === "cash" ? "e.g. Given after Friday prayer at the masjid" : amountChanged ? "Why the amount is different" : "Anything the checking admin should know"} />
        </div>

        {method === "cash" && (
          <div className="space-y-2">
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
              onChange={(e) => { pickProof(e.target.files?.[0]); e.target.value = ""; }} />
            <Button type="button" variant="ghost" className="w-full gap-2 text-slate-600" onClick={() => fileRef.current?.click()}>
              <Camera className="h-4 w-4" />{proof ? `Receipt photo: ${proof.name}` : "Add a photo of the receipt (optional)"}
            </Button>
          </div>
        )}

        <Button className="h-12 w-full bg-emerald-600 text-base hover:bg-emerald-700"
          onClick={() => {
            const problem = detailsProblem();
            if (problem) { toast({ title: problem, variant: "destructive" }); return; }
            go("review");
          }}>
          Next
        </Button>
      </div>
    ),

    review: (
      <div className="space-y-4">
        <Question>Is this right?</Question>
        <div className="space-y-2 rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 text-base text-emerald-950 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-50">
          {own ? (
            <p>You pay <b>{inr(total)}</b> for {kind === "monthly" ? `your ${forWhat}` : forWhat}, {howText}.</p>
          ) : (
          <p>
            <b>{member?.full_name}</b> ({member?.member_code || member?.member_id}) paid <b>{inr(total)}</b> for {forWhat},{" "}
            {howText}, on {formatBusinessDate(paidOn)}.
          </p>
          )}
          {reference && <p className="text-sm">{way?.refLabel}: {reference}</p>}
          {proof && <p className="text-sm">Proof: {proof.name}</p>}
          {note && <p className="text-sm">Note: {note}</p>}
          {kind === "monthly" && months.length > 1 && <p className="text-sm">Saved together as one payment.</p>}
        </div>
        <p className="text-sm text-amber-700">Another admin will check and approve it.</p>
        <Button className="h-12 w-full bg-emerald-600 text-base hover:bg-emerald-700" disabled={saving} onClick={own ? saveOwn : save}>
          {saving && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}{own ? "Yes, send it" : "Yes, save"}
        </Button>
      </div>
    ),

    done: (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
        <p className="text-lg font-semibold">Saved</p>
        <p className="text-slate-600 dark:text-slate-300">{inr(total)} from {member?.full_name}. Another admin will check it.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button variant="outline" className="h-12 text-base" onClick={() => {
            const keep = presetMember && !isOwnMemberRecord(presetMember, currentUser) ? presetMember : null;
            setHistory([]); setStep(keep ? "what" : (ownMember ? "who" : "pick")); setOwn(false); setMember(keep); setSearch(""); setMonths([]); setMethod(null);
            setReference(""); setNote(""); setProof(null); setCampaign(null); setDonation(""); setCustomAmount(false);
            setPaidOn(currentBusinessDate());
          }}>
            Enter another payment
          </Button>
          <Button className="h-12 bg-emerald-600 text-base hover:bg-emerald-700" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </div>
    ),
  };

  const order = ["who", "what", kind === "monthly" ? "months" : "campaign", "how", "details", "review"];
  const progress = step === "sentHow" || step === "ownCash" ? 3 : step === "pick" ? 0 : Math.max(order.indexOf(step), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step !== "who" && step !== "done" && !(step === "pick" && !ownMember) && (
              <button type="button" onClick={back} className="-ml-1 rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Back">
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            New payment
          </DialogTitle>
          <DialogDescription className="sr-only">Enter a payment step by step.</DialogDescription>
          {step !== "done" && (
            <div className="flex gap-1 pt-1" aria-hidden>
              {order.map((s, i) => (
                <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= progress ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"}`} />
              ))}
            </div>
          )}
          {member && step !== "who" && step !== "pick" && step !== "done" && (
            <p className="flex items-center gap-1 pt-1 text-sm text-slate-600 dark:text-slate-300">
              <UserRound className="h-4 w-4" />{own ? "My own payment · " : ""}{member.full_name} · {member.member_code || member.member_id}
            </p>
          )}
        </DialogHeader>
        {screens[step]}
      </DialogContent>
    </Dialog>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, HeartPulse, Loader2, Plane, UserRound, X } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { formatMemberId } from "@/lib/utils";
import { RELATIONS } from "@/lib/reliefI18n";
import { MemberPicker } from "@/components/reports/simple/ReportsShared";
import { DocSlot, EligibilityChecks, ReliefStatus } from "./ReliefParts";

const REASON_ICONS = { death: UserRound, illness: HeartPulse, retirement: Plane };
const ILLNESSES = ["heart_attack", "kidney_failure", "cancer", "stroke"];

function Field({ label, children, className = "" }) {
  return <div className={`space-y-1 ${className}`}><Label className="text-sm font-medium text-slate-700">{label}</Label>{children}</div>;
}

export default function NewClaimForm({ R, scheme, onCreated }) {
  const { toast } = useToast();
  const [member, setMember] = useState(null);
  const [reason, setReason] = useState(null);
  const [illness, setIllness] = useState("");
  const [fromYear, setFromYear] = useState("");
  const [toYear, setToYear] = useState(String(new Date().getFullYear()));
  const [amount, setAmount] = useState("");
  const [relation, setRelation] = useState("self");
  const [receiver, setReceiver] = useState({ name: "", phone: "", bank_account: "", ifsc: "", bank_name: "", upi: "" });
  const [docs, setDocs] = useState({});
  const [others, setOthers] = useState([]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const minimum = reason ? scheme.amounts[reason] : 0;
  useEffect(() => { if (reason) setAmount(String(scheme.amounts[reason])); }, [reason, scheme]);
  useEffect(() => {
    // Death: someone in the family receives it; otherwise the member themself.
    setRelation(reason === "death" ? "wife" : "self");
  }, [reason]);
  useEffect(() => {
    if (relation === "self" && member) {
      setReceiver((r) => ({ ...r, name: member.full_name || member.username || "", phone: r.phone || member.phone || "" }));
    }
  }, [relation, member]);

  const eligibilityQuery = useQuery({
    queryKey: ["relief", "eligibility", member?.id, reason, fromYear, toYear],
    queryFn: () => charityClient.relief.eligibility(member.id, {
      ...(reason ? { reason } : {}),
      ...(reason === "retirement" && fromYear && toYear ? { gulf_from_year: fromYear, gulf_to_year: toYear } : {}),
    }),
    enabled: Boolean(member),
  });
  const eligibility = eligibilityQuery.data?.eligibility;
  const blocked = Boolean(reason && eligibility?.blocked_reasons?.includes(reason));
  const required = reason ? scheme.required_documents[reason] : [];

  const missing = useMemo(() => {
    const out = [];
    if (!member) out.push(R.t("member"));
    if (!reason) out.push(R.t("reason"));
    if (reason === "illness" && !illness) out.push(R.t("illness"));
    if (reason === "retirement" && (!fromYear || !toYear)) out.push(R.t("gulfYears"));
    if (!receiver.name.trim()) out.push(R.t("receiverName"));
    required.forEach((k) => { if (!docs[k]) out.push(R.t(`doc_${k}`)); });
    if (reason && Number(amount) < minimum) out.push(R.t("amountMin", { min: R.money(minimum) }));
    return out;
  }, [member, reason, illness, fromYear, toYear, receiver.name, required, docs, amount, minimum, R]);

  const submit = async () => {
    setBusy(true);
    try {
      const created = await charityClient.relief.create({
        member_id: member.id,
        reason,
        illness_type: reason === "illness" ? illness : null,
        details,
        amount: Number(amount),
        receiver_name: receiver.name,
        receiver_relation: relation,
        receiver_phone: receiver.phone,
        receiver_bank_account: receiver.bank_account,
        receiver_ifsc: receiver.ifsc,
        receiver_bank_name: receiver.bank_name,
        receiver_upi: receiver.upi,
        gulf_from_year: reason === "retirement" ? Number(fromYear) : null,
        gulf_to_year: reason === "retirement" ? Number(toYear) : null,
        documents: [...Object.values(docs), ...others].filter(Boolean),
      });
      toast({ title: R.t("claimCreated") });
      onCreated(created);
    } catch (error) {
      toast({ title: R.t("failed"), description: error?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const years = [];
  for (let y = new Date().getFullYear(); y >= 1970; y--) years.push(String(y));

  return (
    <div className="space-y-5">
      {/* 1. Member */}
      <section className="space-y-2">
        <p className="text-base font-bold text-slate-900">1. {R.t("chooseMember")}</p>
        {member ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <span>
              <span className="block font-semibold text-slate-900">{member.full_name || member.username}</span>
              <span className="text-sm text-slate-600">{formatMemberId(member.member_code)}{member.phone ? ` · ${member.phone}` : ""}</span>
            </span>
            <Button variant="ghost" size="sm" onClick={() => { setMember(null); setDocs({}); setOthers([]); }}><X className="h-4 w-4" /></Button>
          </div>
        ) : (
          <MemberPicker L={R} onPick={setMember} />
        )}
      </section>

      {member && (
        <>
          {/* 2. Reason */}
          <section className="space-y-2">
            <p className="text-base font-bold text-slate-900">2. {R.t("reason")}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {["death", "illness", "retirement"].map((r) => {
                const Icon = REASON_ICONS[r];
                const on = reason === r;
                const has = eligibility?.blocked_reasons?.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${on ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                  >
                    <Icon className={`h-8 w-8 shrink-0 ${on ? "text-emerald-700" : "text-slate-500"}`} />
                    <span>
                      <span className="block font-semibold text-slate-900">{R.t(`reason_${r}`)}</span>
                      <span className="block text-sm text-slate-600">{R.money(scheme.amounts[r])}</span>
                      {has && <span className="block text-xs font-medium text-rose-700">{R.t("status_pending")} / {R.t("status_paid")}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
            {reason === "illness" && (
              <Field label={R.t("illness")}>
                <Select value={illness} onValueChange={setIllness}>
                  <SelectTrigger className="h-11 bg-white"><SelectValue placeholder={R.t("illness")} /></SelectTrigger>
                  <SelectContent>{ILLNESSES.map((i) => <SelectItem key={i} value={i}>{R.t(`illness_${i}`)}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            )}
            {reason === "retirement" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label={`${R.t("gulfYears")}: ${R.t("fromYear")}`}>
                  <Select value={fromYear} onValueChange={setFromYear}>
                    <SelectTrigger className="h-11 bg-white"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label={R.t("toYear")}>
                  <Select value={toYear} onValueChange={setToYear}>
                    <SelectTrigger className="h-11 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
            )}
            {blocked && (
              <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">
                <AlertTriangle className="h-5 w-5 shrink-0" />{R.t("alreadyHasClaim")}
              </p>
            )}
          </section>

          {/* Rules check */}
          <section className="space-y-2">
            <p className="text-base font-bold text-slate-900">{R.t("rulesCheck")}</p>
            {eligibilityQuery.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : <EligibilityChecks R={R} eligibility={eligibility} compact />}
            {eligibility?.earlier_claims?.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <p className="mb-1 font-semibold text-slate-700">{R.t("earlierRelief")}</p>
                {eligibility.earlier_claims.map((c) => (
                  <p key={c.id} className="flex items-center justify-between gap-2 py-0.5">
                    <span>{R.t(`reason_${c.reason}`)} · {R.money(c.amount)}</span><ReliefStatus R={R} status={c.status} />
                  </p>
                ))}
              </div>
            )}
          </section>

          {reason && !blocked && (
            <>
              {/* 3. Amount */}
              <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label={`3. ${R.t("amount")} (${R.t("amountMin", { min: R.money(minimum) })})`}>
                  <Input type="number" inputMode="numeric" min={minimum} step="1000" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-11 bg-white text-lg font-semibold" />
                </Field>
              </section>

              {/* 4. Receiver */}
              <section className="space-y-2">
                <p className="text-base font-bold text-slate-900">4. {R.t("receiver")}</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label={R.t("relation")}>
                    <Select value={relation} onValueChange={setRelation}>
                      <SelectTrigger className="h-11 bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RELATIONS.filter((r) => reason !== "death" || r !== "self").map((r) => <SelectItem key={r} value={r}>{R.t(`relation_${r}`)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label={R.t("receiverName")}><Input value={receiver.name} onChange={(e) => setReceiver({ ...receiver, name: e.target.value })} className="h-11 bg-white" /></Field>
                  <Field label={R.t("phone")}><Input type="tel" value={receiver.phone} onChange={(e) => setReceiver({ ...receiver, phone: e.target.value })} className="h-11 bg-white" /></Field>
                  <Field label={R.t("upi")}><Input value={receiver.upi} onChange={(e) => setReceiver({ ...receiver, upi: e.target.value })} className="h-11 bg-white" /></Field>
                  <Field label={R.t("bankAccount")}><Input inputMode="numeric" value={receiver.bank_account} onChange={(e) => setReceiver({ ...receiver, bank_account: e.target.value })} className="h-11 bg-white" /></Field>
                  <Field label={R.t("ifsc")}><Input value={receiver.ifsc} onChange={(e) => setReceiver({ ...receiver, ifsc: e.target.value.toUpperCase() })} className="h-11 bg-white uppercase" /></Field>
                  <Field label={R.t("bankName")} className="sm:col-span-2"><Input value={receiver.bank_name} onChange={(e) => setReceiver({ ...receiver, bank_name: e.target.value })} className="h-11 bg-white" /></Field>
                </div>
              </section>

              {/* 5. Documents */}
              <section className="space-y-2">
                <p className="text-base font-bold text-slate-900">5. {R.t("documents")}</p>
                {required.map((kind) => (
                  <DocSlot key={kind} R={R} kind={kind} required doc={docs[kind]} onChange={(d) => setDocs({ ...docs, [kind]: d })} />
                ))}
                {others.map((doc, i) => (
                  <DocSlot key={`o${i}`} R={R} kind="other" doc={doc} onChange={(d) => setOthers(others.map((o, j) => (j === i ? d : o)))} />
                ))}
                <Button type="button" variant="ghost" size="sm" onClick={() => setOthers([...others, null])} disabled={others.some((o) => !o)}>
                  + {R.t("addOther")}
                </Button>
              </section>

              {/* 6. Details */}
              <Field label={`6. ${R.t("details")}`}>
                <Textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={2000} className="bg-white" />
              </Field>

              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                {missing.length > 0 && <p className="text-sm text-amber-800">{R.t("required")}: {missing.join(", ")}</p>}
                <p className="text-xs text-slate-500">{R.t("fundUseNote")}</p>
                <Button onClick={submit} disabled={busy || missing.length > 0} className="h-12 w-full bg-emerald-600 text-base hover:bg-emerald-700 sm:w-auto">
                  {busy && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}{R.t("sendForApproval")}
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

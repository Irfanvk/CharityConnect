import React, { useRef, useState } from "react";
import { CheckCircle2, FileText, Loader2, MinusCircle, Upload, XCircle } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { countryName } from "@/lib/countries";
import { STATUS_STYLE } from "@/lib/reliefI18n";

/** Files on Cloudinary are full links; local uploads ("/uploads/…") live on the API server. */
export function docHref(url) {
  if (!url || /^https?:\/\//i.test(url)) return url;
  const base = String(import.meta.env.VITE_CHARITY_APP_BASE_URL || "").replace(/\/$/, "");
  return `${base}/${String(url).replace(/^\//, "")}`;
}

export function ReliefStatus({ R, status }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[status] || STATUS_STYLE.cancelled}`}>
      {R.t(`status_${status}`)}
    </span>
  );
}

/** The committee's rules and the current amounts. */
export function ReliefRules({ R, scheme }) {
  const rules = R.rules;
  return (
    <section className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
      <h2 className="text-lg font-bold text-emerald-900">{rules.title}</h2>
      <p className="text-sm font-semibold text-emerald-800">{rules.heading}</p>
      <ol className="list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-slate-800">
        {rules.rules.map((rule, i) => <li key={i}>{rule}</li>)}
      </ol>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[15px] leading-relaxed text-amber-900">
        <p className="font-semibold">{rules.noteHeading}</p>
        <p>{rules.note}</p>
      </div>
      {scheme && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {["death", "illness", "retirement"].map((reason) => (
            <div key={reason} className="rounded-xl border border-emerald-200 bg-white p-3">
              <p className="text-sm text-slate-600">{R.t(`reason_${reason}`)}</p>
              <p className="text-xl font-bold text-emerald-800">{R.money(scheme.amounts[reason])}</p>
            </div>
          ))}
        </div>
      )}
      <p className="text-sm text-slate-600">{R.t("howToApply")}</p>
    </section>
  );
}

function checkValue(R, check) {
  switch (check.key) {
    case "unpaid_months": return R.t("check_unpaid_months_value", { value: check.value });
    case "membership_months": return R.t("check_membership_months_value", { value: check.value });
    case "first_year_paid": return R.t("check_first_year_paid_value", { value: check.value, limit: check.limit });
    case "lives_abroad": return check.value ? countryName(check.value) || check.value : R.t("notEntered");
    case "gulf_years": return check.value === null || check.value === undefined ? "—" : R.t("check_gulf_years_value", { value: check.value });
    default: return String(check.value ?? "");
  }
}

/** ✓ / ✕ / – for each rule. */
export function EligibilityChecks({ R, eligibility, compact = false }) {
  if (!eligibility) return null;
  return (
    <div className="space-y-2">
      <p className={`flex items-center gap-2 rounded-xl border p-3 font-semibold ${eligibility.all_ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
        {eligibility.all_ok ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}
        {eligibility.all_ok ? R.t("allRulesMet") : R.t("someRulesNotMet")}
      </p>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {eligibility.checks.map((c) => (
          <li key={c.key} className={`flex items-start justify-between gap-3 ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
            <span className="flex items-start gap-2">
              {c.ok === null ? <MinusCircle className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" />
                : c.ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />}
              <span>
                <span className="block text-sm font-medium text-slate-800">{R.t(`check_${c.key}`, { limit: c.limit })}</span>
                {c.months?.length > 0 && <span className="block text-xs text-rose-700">{R.monthList(c.months)}</span>}
              </span>
            </span>
            <span className={`shrink-0 text-sm ${c.ok === false ? "font-semibold text-rose-700" : "text-slate-500"}`}>
              {c.ok === null ? R.t("notNeeded") : checkValue(R, c)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One document slot: upload / change / open. */
export function DocSlot({ R, kind, doc, required, onChange }) {
  const { toast } = useToast();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const pick = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const res = await charityClient.files.upload(file);
      onChange({ kind, url: res.file_url, name: file.name });
    } catch (error) {
      toast({ title: R.t("failed"), description: error?.message, variant: "destructive" });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };
  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 ${doc ? "border-emerald-200 bg-emerald-50/60" : required ? "border-amber-200 bg-amber-50/60" : "border-slate-200 bg-white"}`}>
      <span className="flex min-w-0 items-center gap-2">
        {doc ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : <FileText className="h-5 w-5 shrink-0 text-slate-400" />}
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-800">
            {R.t(`doc_${kind}`)}{required && <span className="ml-1 text-xs font-normal text-amber-700">({R.t("required")})</span>}
          </span>
          {doc?.name && <span className="block truncate text-xs text-slate-500">{doc.name}</span>}
        </span>
      </span>
      <span className="flex gap-2">
        {doc && <a href={docHref(doc.url)} target="_blank" rel="noreferrer" className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">{R.t("viewDoc")}</a>}
        <input ref={input} type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => input.current?.click()} className="bg-white">
          {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
          {busy ? R.t("uploading") : doc ? R.t("replace") : R.t("upload")}
        </Button>
      </span>
    </div>
  );
}

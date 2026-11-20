import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowLeft, CheckCircle2, Clock, Loader2, Receipt, XCircle } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import ReceiptDialog from "@/components/challans/ReceiptDialog";
import { receiptDate } from "@/components/challans/ReceiptCard";
import { monthName, useT } from "@/lib/appLanguage";

/*
 * My statement (members, and admins who are members): one Aug-Jul year month by month
 * (paid, waiting for approval, not paid), what is still owed, and the whole payment history
 * with a receipt for every paid payment. Opened from My payments and from Profile.
 */

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const STATE = {
  paid: { label: "Paid", cls: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: CheckCircle2 },
  waiting: { label: "Waiting", cls: "border-amber-200 bg-amber-50 text-amber-800", icon: Clock },
  not_paid: { label: "Not paid", cls: "border-rose-200 bg-rose-50 text-rose-800", icon: AlertCircle },
  rejected: { label: "Not accepted", cls: "border-rose-200 bg-rose-50 text-rose-800", icon: XCircle },
  ahead: { label: "Later", cls: "border-slate-200 bg-slate-50 text-slate-500", icon: null },
};

export default function MyStatement() {
  const L = useT();
  const { t } = L;
  const month = (m) => monthName(m, L.locale);
  const what = (h) => {
    if (h.type === "campaign") return `${t("Donation")}${h.campaign_title ? ` · ${h.campaign_title}` : ""}`;
    const ms = [...(h.months || [])].sort();
    const range = ms.length > 1 ? `${month(ms[0])} – ${month(ms[ms.length - 1])} (${t("{n} months", { n: ms.length })})` : month(ms[0]);
    return `${t("Monthly fee")} · ${range}`;
  };
  const months_ = (n) => t(n === 1 ? "1 month" : "{n} months", { n });
  const [year, setYear] = useState(null);
  const [receiptFor, setReceiptFor] = useState(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-statement", year],
    queryFn: () => charityClient.reports.myStatement(year),
    retry: false,
  });

  const current = data?.current_month || "";
  const months = data?.months || [];
  const owed = months.filter((m) => m.state === "not_paid" && m.month <= current);
  const paid = months.filter((m) => m.state === "paid");
  const waiting = months.filter((m) => m.state === "waiting");
  const sum = (list) => list.reduce((s, m) => s + Number(m.amount || 0), 0);
  const openReceipt = (r) => setReceiptFor(r.bulk_group_id ? { bulkGroupId: r.bulk_group_id } : { challanId: r.challan_id });

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" className="h-10 gap-1.5 bg-white"><Link to="/Challans"><ArrowLeft className="h-4 w-4" />{t("My payments")}</Link></Button>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("My statement")}</h1>
        {data?.member && <p className="text-slate-600 dark:text-slate-300">{data.member.name} · {data.member.member_code} · {t("{amount} a month", { amount: inr(data.member.monthly_amount) })}</p>}
      </div>

      {isLoading ? (
        <p className="flex items-center justify-center gap-2 py-10 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />{t("Loading…")}</p>
      ) : error ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">{error?.message || t("Your statement is not available.")}</p>
      ) : data ? (
        <>
          {/* Year */}
          <div className="flex flex-wrap gap-2">
            {(data.years || []).map((y) => (
              <button key={y} type="button" onClick={() => setYear(y)} aria-pressed={data.year === y}
                className={`rounded-full border px-4 py-2 text-sm font-semibold ${data.year === y ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"}`}>
                {y}-{y + 1}
              </button>
            ))}
          </div>

          {/* The answer first */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
              <p className="text-xs font-semibold uppercase">{t("Paid")}</p>
              <p className="text-lg font-bold">{inr(sum(paid))}</p>
              <p className="text-xs">{months_(paid.length)}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <p className="text-xs font-semibold uppercase">{t("Waiting")}</p>
              <p className="text-lg font-bold">{inr(sum(waiting))}</p>
              <p className="text-xs">{months_(waiting.length)}</p>
            </div>
            <div className={`rounded-2xl border p-3 ${owed.length ? "border-rose-200 bg-rose-50 text-rose-900" : "border-slate-200 bg-white text-slate-700"}`}>
              <p className="text-xs font-semibold uppercase">{t("Still owed")}</p>
              <p className="text-lg font-bold">{inr(sum(owed))}</p>
              <p className="text-xs">{months_(owed.length)} · {t("up to now")}</p>
            </div>
          </div>

          {/* Months of the year */}
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t("Year {label}, month by month", { label: data.label })}</h2>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {months.map((m) => {
                const s = m.state === "not_paid" && m.month > current ? STATE.ahead : STATE[m.state] || STATE.not_paid;
                const Icon = s.icon;
                return (
                  <li key={m.month} className={`rounded-xl border p-3 ${s.cls}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{month(m.month)}</span>
                      {Icon && <Icon className="h-4 w-4 shrink-0" />}
                    </div>
                    <p className="text-sm">{t(s.label)} · {inr(m.amount)}</p>
                    {m.paid_on && <p className="text-xs opacity-80">{t("on {date}", { date: receiptDate(m.paid_on) })}</p>}
                    {m.state === "paid" && m.challan_id && (
                      <button type="button" onClick={() => setReceiptFor({ challanId: m.challan_id })} className="mt-1 text-xs font-semibold underline underline-offset-2">{t("Receipt")}</button>
                    )}
                  </li>
                );
              })}
            </ul>
            {owed.length > 0 && (
              <Button asChild className="h-11 bg-emerald-600 hover:bg-emerald-700"><Link to="/Challans">{t("Pay what I owe")}</Link></Button>
            )}
          </section>

          {/* Every payment */}
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t("All my payments")}</h2>
            {(data.history || []).length === 0 ? (
              <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500">{t("No payments yet.")}</p>
            ) : (
              <ul className="space-y-2">
                {data.history.map((h) => {
                  const s = STATE[h.state] || STATE.not_paid;
                  return (
                    <li key={h.key} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-xs text-slate-500">{h.number}</p>
                          <p className="font-semibold text-slate-900 dark:text-white">{what(h)}</p>
                          <p className="text-xs text-slate-500">
                            {h.state === "paid" ? t("Paid {date}", { date: receiptDate(h.paid_on) })
                              : h.state === "waiting" ? t("Sent {date} · an admin will check it", { date: receiptDate(h.sent_on) })
                                : h.state === "rejected" ? `${t("Not accepted")}${h.rejection_reason ? `: ${h.rejection_reason}` : ""}`
                                  : t("Started {date} · no proof yet", { date: receiptDate(h.started_on) })}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-bold tabular-nums">{inr(h.amount)}</p>
                          <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${s.cls}`}>{t(s.label)}</span>
                        </div>
                      </div>
                      {h.receipt && (
                        <Button variant="outline" size="sm" onClick={() => openReceipt(h.receipt)} className="mt-2 h-9 gap-1.5 bg-white">
                          <Receipt className="h-4 w-4" />{t("Receipt")}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      ) : null}

      <ReceiptDialog target={receiptFor} onOpenChange={(v) => { if (!v) setReceiptFor(null); }} />
    </div>
  );
}

import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Clock, Eye, FileText, Layers, Loader2, Receipt, Trash2, Upload, XCircle } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { formatBusinessDate } from "@/lib/businessTime";
import { isNotPaidYet } from "@/lib/challanStatus";
import { useT, monthName } from "@/lib/appLanguage";

/*
 * Members' Challans: what they owe, one "Pay now" button, and their payments in three
 * plain groups — To pay, Waiting (handed in, an admin checks it) and Paid.
 * Every card has one clear action: "Upload proof" or "View proof".
 */

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

/** A monthly payment still open (nothing handed in): it can be paid with others using one proof. */
export const canPayTogether = (c) =>
  Boolean(c) && !c.is_bulk_group && !c.is_number_group && c.type === "monthly" && c.status !== "rejected"
  && c.status !== "approved" && (c.status === "generated" || isNotPaidYet(c));

/** Started by the member but nothing handed in yet: they can upload the proof or cancel it. */
export const isUnfinished = (c) =>
  Boolean(c) && !c.is_bulk_group && c.entry_source === "self" && c.status !== "rejected"
  && (c.status === "generated" || isNotPaidYet(c));

/** to_pay | waiting | paid */
export function memberBucket(challan) {
  if (challan.status === "approved") return "paid";
  if (challan.status === "rejected" || challan.status === "generated" || isNotPaidYet(challan)) return "to_pay";
  return "waiting";
}

const BUCKETS = {
  to_pay: { label: "To pay", icon: AlertCircle, tone: "border-rose-200 bg-rose-50 text-rose-800" },
  waiting: { label: "Waiting", icon: Clock, tone: "border-amber-200 bg-amber-50 text-amber-800" },
  paid: { label: "Paid", icon: CheckCircle2, tone: "border-emerald-200 bg-emerald-50 text-emerald-800" },
};

function whatFor(challan, L) {
  const month = (m) => monthName(m, L.locale);
  if (challan.type !== "monthly") return challan.campaign_name || L.t("Donation");
  if ((challan.is_bulk_group || challan.is_number_group) && challan.months_covered?.length > 1) {
    const months = [...challan.months_covered].sort();
    return `${month(months[0])} – ${month(months[months.length - 1])} (${L.t("{n} months", { n: months.length })})`;
  }
  return month(challan.month);
}

function statusLine(challan, L) {
  const bucket = memberBucket(challan);
  if (bucket === "paid") {
    const on = challan.approved_at || challan.received_on;
    return { text: on ? L.t("Paid · approved {date}", { date: formatBusinessDate(on, { day: "numeric", month: "short", year: "numeric" }) }) : L.t("Paid"), icon: CheckCircle2, cls: "text-emerald-700" };
  }
  if (bucket === "waiting") return { text: L.t("Proof sent · an admin will check it"), icon: Clock, cls: "text-amber-700" };
  if (challan.status === "rejected") return { text: L.t("Not accepted · please upload a new proof"), icon: XCircle, cls: "text-rose-700" };
  return { text: L.t("Not paid yet · pay, then upload the proof"), icon: AlertCircle, cls: "text-rose-700" };
}

function PaymentCard({ challan, onUpload, onViewProof, onDelete, canDelete, hasProof, onReceipt }) {
  const L = useT();
  const { t } = L;
  const bucket = memberBucket(challan);
  const line = statusLine(challan, L);
  const Icon = line.icon;
  return (
    <li
      data-deeplink={challan.is_bulk_group ? `bulk-${challan.bulk_group_id}` : `challan-${challan.id}`}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-bold text-slate-900 dark:text-white">{whatFor(challan, L)}</p>
          <p className="text-xs text-slate-500">
            {challan.type === "monthly" ? t(challan.is_number_group ? "Monthly fee · one payment" : "Monthly fee") : t("Donation")} · {challan.challan_number}
          </p>
        </div>
        <p className="shrink-0 text-lg font-bold tabular-nums text-slate-900 dark:text-white">{inr(challan.amount)}</p>
      </div>
      <p className={`mt-2 flex items-center gap-1.5 text-sm font-medium ${line.cls}`}>
        <Icon className="h-4 w-4 shrink-0" />{line.text}
      </p>
      {challan.status === "rejected" && challan.rejection_reason && (
        <p className="mt-1 rounded-md bg-rose-50 px-2 py-1 text-xs text-rose-800">{t("Reason")}: {challan.rejection_reason}</p>
      )}
      {challan.entry_notes && (
        <p className="mt-1 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900 break-words"><span className="font-semibold">{t("Note")}:</span> {challan.entry_notes}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {bucket === "to_pay" && !challan.is_bulk_group && (
          <Button onClick={() => onUpload(challan)} className="h-11 gap-2 bg-emerald-600 px-5 text-base hover:bg-emerald-700">
            <Upload className="h-5 w-5" />{t(challan.status === "rejected" ? "Upload new proof" : "Upload proof")}
          </Button>
        )}
        {bucket === "paid" && onReceipt && (
          <Button onClick={() => onReceipt(challan)} className="h-11 gap-2 bg-emerald-600 px-5 hover:bg-emerald-700">
            <Receipt className="h-5 w-5" />{t("Receipt")}
          </Button>
        )}
        {hasProof && (
          <Button variant="outline" onClick={() => onViewProof(challan)} className="h-11 gap-2 bg-white">
            <Eye className="h-5 w-5" />{t("View proof")}
          </Button>
        )}
        {canDelete && (
          <Button variant="ghost" onClick={() => onDelete(challan)} className="h-11 gap-1.5 text-slate-500 hover:text-rose-600">
            <Trash2 className="h-4 w-4" />{t("Cancel")}
          </Button>
        )}
      </div>
    </li>
  );
}

export default function MemberChallansView({
  entries, isLoading, myMember, onPay, onUpload, onViewProof, onDelete, getProofUrl, onPayTogether, onReceipt,
}) {
  const [shown, setShown] = useState(20);
  const L = useT();
  const { t } = L;
  const month = (m) => monthName(m, L.locale);

  const { data: payable } = useQuery({
    queryKey: ["challans", "payable-months", "member-summary", myMember?.id],
    queryFn: () => charityClient.challans.payableMonths({ include_upcoming: false }),
    enabled: Boolean(myMember?.id),
    staleTime: 60 * 1000,
  });

  const groups = useMemo(() => {
    const out = { to_pay: [], waiting: [], paid: [] };
    for (const entry of entries) out[memberBucket(entry)].push(entry);
    // Months started together ("one proof for all, upload later") share one payment number:
    // show them as one card whose Upload proof covers them all.
    const byNumber = {};
    out.to_pay.filter(canPayTogether).forEach((c) => {
      if (c.challan_no) (byNumber[c.challan_no] = byNumber[c.challan_no] || []).push(c);
    });
    const grouped = new Set();
    Object.entries(byNumber).forEach(([no, rows]) => {
      if (rows.length < 2) return;
      rows.forEach((r) => grouped.add(r.id));
      const months = rows.map((r) => r.month).sort();
      out.to_pay.push({
        ...rows[0],
        id: `number:${no}`,
        is_number_group: true,
        rows,
        challan_number: no,
        months_covered: months,
        month: months[0],
        amount: rows.reduce((sum, r) => sum + Number(r.amount || 0), 0),
      });
    });
    out.to_pay = out.to_pay.filter((c) => !grouped.has(c.id));
    // To pay: oldest month first, so the next one to pay is on top.
    out.to_pay.sort((a, b) => String(a.month || "").localeCompare(String(b.month || "")));
    return out;
  }, [entries]);

  const fee = Number(myMember?.monthly_amount || 0);
  // Owed = months with no challan yet (from the server) + "to pay" monthly challans.
  const owedMonths = useMemo(() => {
    const set = new Set(payable?.pending_months || []);
    if (payable?.current_month_payable && payable?.current_month) set.add(payable.current_month);
    groups.to_pay.filter((c) => c.type === "monthly").forEach((c) => {
      (c.months_covered?.length ? c.months_covered : [c.month]).forEach((m) => m && m <= (payable?.current_month || "9999-99") && set.add(m));
    });
    return [...set].sort();
  }, [payable, groups]);
  // Each owed month at its own amount: the challan's amount, else that month's fee (fee history).
  const owedAmount = useMemo(() => {
    const byMonth = {};
    groups.to_pay.filter((c) => c.type === "monthly").forEach((c) => {
      (c.is_number_group ? c.rows : [c]).forEach((r) => { if (r.month) byMonth[r.month] = Number(r.amount || 0); });
    });
    return owedMonths.reduce((sum, m) => sum + (byMonth[m] ?? Number(payable?.month_fees?.[m] ?? fee)), 0);
  }, [owedMonths, groups, payable, fee]);
  const lastPaid = groups.paid.filter((c) => c.type === "monthly").map((c) => c.month).filter(Boolean).sort().pop();

  // A link from a notification (?challan=12 or ?bulk=BCH-0003) opens the tab that holds it.
  // Worked out while rendering, so the card is on screen when the page scrolls to it.
  const [params] = useSearchParams();
  const linked = useMemo(() => {
    const id = params.get("challan");
    const bulk = params.get("bulk");
    if (!id && !bulk) return null;
    for (const [key, items] of Object.entries(groups)) {
      const index = items.findIndex((c) => (bulk ? c.bulk_group_id === bulk : String(c.id) === id || c.challan_ids?.map(String).includes(id)));
      if (index >= 0) return { key, index };
    }
    return null;
  }, [params, groups]);
  const [picked, setPicked] = useState(null);
  const tab = picked || linked?.key || "to_pay";
  const visible = Math.max(shown, linked && linked.key === tab ? linked.index + 1 : 0);

  const list = groups[tab];
  const unfinished = groups.to_pay.flatMap((c) => (c.is_number_group ? c.rows : [c])).filter(isUnfinished);
  const payTogetherRows = groups.to_pay.flatMap((c) => (c.is_number_group ? c.rows : [c])).filter(canPayTogether);
  const upload = (c) => (c.is_number_group ? onPayTogether?.(c.rows, c.rows.map((r) => r.id)) : onUpload(c));
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild variant="outline" className="h-10 gap-2 bg-white">
          <Link to="/MyStatement"><FileText className="h-4 w-4" />{t("My statement")}</Link>
        </Button>
      </div>
      {/* The answer first */}
      {isLoading ? null : owedMonths.length > 0 ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
          <p className="flex items-center gap-2 text-lg font-bold"><AlertCircle className="h-6 w-6 shrink-0" />{t("You owe {amount}", { amount: inr(owedAmount) })}</p>
          <p className="mt-1 text-sm">
            {t(owedMonths.length === 1 ? "1 month" : "{n} months", { n: owedMonths.length })}:{" "}
            {owedMonths.length > 4
              ? `${month(owedMonths[0])} – ${month(owedMonths[owedMonths.length - 1])}`
              : owedMonths.map(month).join(", ")}
          </p>
          <Button onClick={onPay} className="mt-3 h-12 w-full bg-emerald-600 text-base hover:bg-emerald-700 sm:w-auto sm:px-8">{t("Pay now")}</Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <p className="flex items-center gap-2 text-lg font-bold"><CheckCircle2 className="h-6 w-6 shrink-0" />{t("You are paid up")}</p>
          {lastPaid && <p className="mt-1 text-sm">{t("Paid up to {month}. You can also pay ahead.", { month: month(lastPaid) })}</p>}
          <Button onClick={onPay} variant="outline" className="mt-3 h-11 border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100">{t("Pay ahead or donate")}</Button>
        </div>
      )}
      {unfinished.length > 0 && (
        <div className={`rounded-xl border px-3 py-2 text-sm ${params.get("unfinished") ? "border-rose-300 bg-rose-50 text-rose-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
          <p className="flex items-center gap-2 font-semibold">
            <Upload className="h-4 w-4 shrink-0" />
            {t(unfinished.length === 1 ? "1 payment is not finished" : "{n} payments are not finished", { n: unfinished.length })}
          </p>
          <p className="mt-0.5">
            {t("No proof was uploaded yet for: {list}.", {
              list: unfinished.slice(0, 4).map((c) => whatFor(c, L)).join(", ")
                + (unfinished.length > 4 ? ` ${t("and {n} more", { n: unfinished.length - 4 })}` : ""),
            })}{" "}
            {t("Tap Upload proof below, or Cancel if you started it by mistake.")}
          </p>
        </div>
      )}
      {groups.waiting.length > 0 && (
        <p className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <Clock className="h-4 w-4 shrink-0" />{t(groups.waiting.length === 1 ? "1 payment is waiting for an admin to check." : "{n} payments are waiting for an admin to check.", { n: groups.waiting.length })}
        </p>
      )}

      {onPayTogether && payTogetherRows.length > 1 && (
        <Button
          variant="outline"
          onClick={() => onPayTogether(payTogetherRows, [])}
          className="h-11 w-full gap-2 border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50 sm:w-auto"
        >
          <Layers className="h-5 w-5" />{t("Pay several months with one proof")}
        </Button>
      )}

      {/* Three plain groups */}
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {Object.entries(BUCKETS).map(([key, b]) => {
          const BIcon = b.icon;
          const on = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => { setPicked(key); setShown(20); }}
              aria-pressed={on}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-sm font-semibold ${on ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-300"}`}
            >
              <BIcon className="h-4 w-4" />{t(b.label)}
              <span className="rounded-full bg-slate-200 px-1.5 text-xs dark:bg-slate-700">{groups[key].length}</span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <p className="flex items-center justify-center gap-2 py-10 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />{t("Loading…")}</p>
      ) : list.length === 0 ? (
        tab === "to_pay" && owedMonths.length > 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="text-slate-700 dark:text-slate-200">
              {t("No challan yet for the months you owe ({n}).", { n: owedMonths.length })}
            </p>
            <p className="text-sm text-slate-500">{t("Tap Pay now, choose the months, then add the payment proof.")}</p>
            <Button onClick={onPay} className="mt-3 h-11 bg-emerald-600 px-6 hover:bg-emerald-700">{t("Pay now")}</Button>
          </div>
        ) : (
          <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900">
            {t(tab === "to_pay" ? "Nothing to pay." : tab === "waiting" ? "Nothing waiting." : "No payments yet.")}
          </p>
        )
      ) : (
        <>
          <ul className="space-y-3">
            {list.slice(0, visible).map((c) => (
              <PaymentCard
                key={c.id}
                challan={c}
                onUpload={upload}
                onReceipt={onReceipt}
                onViewProof={onViewProof}
                onDelete={onDelete}
                hasProof={Boolean(getProofUrl(c)) || (c.is_bulk_group && memberBucket(c) !== "to_pay")}
                // Only a payment the member started themself, with no proof yet, can be cancelled.
                canDelete={!c.is_number_group && (isUnfinished(c) || (!c.is_bulk_group && c.status === "generated" && c.entry_source !== "admin" && c.entry_source !== "import"))}
              />
            ))}
          </ul>
          {list.length > visible && (
            <div className="text-center">
              <Button variant="outline" onClick={() => setShown(visible + 20)} className="h-11">{t("Show more ({n})", { n: list.length - visible })}</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

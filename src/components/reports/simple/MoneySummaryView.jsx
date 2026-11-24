import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownCircle, ArrowUpCircle, CalendarDays, ChevronDown, ChevronRight, HandCoins, Hourglass, Wallet } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import FinancialSummaryPanel from "@/components/reports/FinancialSummaryPanel";
import CashCollectedReport from "@/components/reports/CashCollectedReport";
import { currentBusinessMonth } from "@/lib/businessTime";
import { LoadState } from "./ReportsShared";

function BigNumber({ icon: Icon, label, value, sub, tone, onClick }) {
  const tones = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    red: "border-rose-200 bg-rose-50 text-rose-800",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
    blue: "border-sky-200 bg-sky-50 text-sky-800",
    slate: "border-slate-200 bg-white text-slate-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
  };
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick} className={`flex min-w-0 items-center gap-3 rounded-2xl border p-4 text-left ${tones[tone]} ${onClick ? "transition hover:-translate-y-0.5 hover:shadow-md" : ""}`}>
      <Icon className="h-10 w-10 shrink-0" />
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block truncate text-2xl font-bold tabular-nums">{value}</span>
        {sub && <span className="block text-xs opacity-75">{sub}</span>}
      </span>
    </Tag>
  );
}

/** The statement panel (English, CSV/PDF), loaded only when opened. Its "outstanding" is the
    same "still to collect" as the tile above (the dues report), and opens that report. */
function DetailedAccounts({ challanStats, fundSummary, dues, onOpenDues }) {
  return (
    <div className="space-y-4">
      <FinancialSummaryPanel
        challanStats={challanStats}
        fundSummary={fundSummary}
        pendingAmount={Number(dues?.total_amount_due || 0)}
        pendingCount={Number(dues?.total_months_due || 0)}
        pendingMembers={Number(dues?.members_with_dues || 0)}
        onOpenReceivables={onOpenDues}
        isLoading={!dues}
        isAdmin
      />
      <CashCollectedReport />
    </div>
  );
}

export default function MoneySummaryView({ L, onOpenDues, onOpenPayments }) {
  const [details, setDetails] = useState(false);
  const month = currentBusinessMonth();
  const year = month.slice(0, 4);
  const stats = useQuery({ queryKey: ["challans", "collection-stats"], queryFn: () => charityClient.challans.collectionStats(), staleTime: 5 * 60 * 1000 });
  const funds = useQuery({ queryKey: ["fund-utilizations", "summary"], queryFn: () => charityClient.fundUtilizations.summary(), staleTime: 5 * 60 * 1000 });
  const dues = useQuery({ queryKey: ["reports", "dues", { status: "active", sort: "amount_desc", min_months: 1 }], queryFn: () => charityClient.reports.dues({ status: "active", sort: "amount_desc", min_months: 1 }) });
  // Same numbers as All payments: monthly fees by the month they are for, donations by the day given.
  const feesThisMonth = useQuery({
    queryKey: ["reports", "payments", "summary-month", month],
    queryFn: () => charityClient.reports.payments({ type: "monthly", state: "paid", limit: 1, month_from: month, month_to: month }),
    staleTime: 2 * 60 * 1000,
  });
  const paidThisYear = useQuery({
    queryKey: ["reports", "payments", "summary-year", year],
    queryFn: () => charityClient.reports.payments({ state: "paid", limit: 1, month_from: `${year}-01`, month_to: `${year}-12` }),
    staleTime: 2 * 60 * 1000,
  });
  const waiting = useQuery({
    queryKey: ["reports", "payments", "summary-waiting"],
    queryFn: () => charityClient.reports.payments({ state: "waiting", limit: 1 }),
    staleTime: 60 * 1000,
  });

  const moneyIn = funds.data?.total_collected ?? stats.data?.all_time ?? 0;
  const moneyOut = funds.data?.total_utilized ?? 0;
  const balance = funds.data?.available_balance ?? moneyIn - moneyOut;
  const paid = (q) => q.data?.totals?.paid;
  const open = (filters) => onOpenPayments?.(filters);
  const dots = "\u2026";

  return (
    <LoadState L={L} query={stats}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <BigNumber icon={ArrowDownCircle} tone="green" label={L.t("moneyIn")} value={L.money(moneyIn)} sub={L.t("allTimeApproved")} />
          <BigNumber icon={ArrowUpCircle} tone="red" label={L.t("moneyOut")} value={L.money(moneyOut)} sub={L.t("allTimeApproved")} />
          <BigNumber icon={Wallet} tone="blue" label={L.t("balance")} value={L.money(balance)} sub={L.t("inMinusOut")} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <BigNumber
            icon={CalendarDays}
            tone="slate"
            label={L.t("feesForMonth", { month: L.longMonth(month) })}
            value={paid(feesThisMonth) ? L.money(paid(feesThisMonth).amount) : dots}
            sub={paid(feesThisMonth) ? `${L.t("count")}: ${paid(feesThisMonth).count}` : null}
            onClick={() => open({ when: "this_month", state: "paid", type: "monthly" })}
          />
          <BigNumber
            icon={CalendarDays}
            tone="slate"
            label={L.t("paidInYear", { year })}
            value={paid(paidThisYear) ? L.money(paid(paidThisYear).amount) : dots}
            sub={L.t("feesAndDonations")}
            onClick={() => open({ when: "this_year", state: "paid" })}
          />
          <BigNumber
            icon={Hourglass}
            tone="amber"
            label={L.t("waitingApproval")}
            value={waiting.data ? L.money(waiting.data.totals.waiting.amount) : dots}
            sub={waiting.data ? `${L.t("count")}: ${waiting.data.totals.waiting.count}` : null}
            onClick={() => open({ when: "all", state: "waiting" })}
          />
          <BigNumber
            icon={HandCoins}
            tone="rose"
            label={L.t("toCollect")}
            value={dues.data ? L.money(dues.data.total_amount_due) : dots}
            sub={dues.data ? L.t("memberCount", { n: dues.data.members_with_dues }) : null}
            onClick={onOpenDues}
          />
        </div>

        <button
          type="button"
          onClick={() => setDetails((v) => !v)}
          aria-expanded={details}
          className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left font-semibold text-slate-700 hover:bg-slate-50"
        >
          {L.t("detailedAccounts")}
          {details ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </button>
        {details && <DetailedAccounts challanStats={stats.data} fundSummary={funds.data} dues={dues.data} onOpenDues={onOpenDues} />}
      </div>
    </LoadState>
  );
}

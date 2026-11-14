import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownCircle, ArrowUpCircle, CalendarDays, ChevronDown, ChevronRight, HandCoins, Wallet } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import FinancialSummaryPanel from "@/components/reports/FinancialSummaryPanel";
import CashCollectedReport from "@/components/reports/CashCollectedReport";
import { LoadState } from "./ReportsShared";

const OUTSTANDING_PAGE = 50;

function BigNumber({ icon: Icon, label, value, tone, onClick }) {
  const tones = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    red: "border-rose-200 bg-rose-50 text-rose-800",
    blue: "border-sky-200 bg-sky-50 text-sky-800",
    slate: "border-slate-200 bg-white text-slate-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
  };
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick} className={`flex items-center gap-3 rounded-2xl border p-4 text-left ${tones[tone]} ${onClick ? "hover:shadow-sm" : ""}`}>
      <Icon className="h-10 w-10 shrink-0" />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-2xl font-bold tabular-nums">{value}</span>
      </span>
    </Tag>
  );
}

/** The previous detailed panel, loaded only when opened. */
function DetailedAccounts({ challanStats, fundSummary }) {
  const [page, setPage] = useState(0);
  const outstanding = useQuery({
    queryKey: ["challans", "outstanding", page],
    queryFn: () => charityClient.challans.outstanding({ skip: page * OUTSTANDING_PAGE, limit: OUTSTANDING_PAGE }),
  });
  const { data: members = [] } = useQuery({
    queryKey: ["members", "all-for-reports"],
    queryFn: async () => {
      let all = [];
      for (let skip = 0; ; skip += 500) {
        const chunk = await charityClient.members.list({ skip, limit: 500 });
        all = all.concat(chunk);
        if (chunk.length < 500) return all;
      }
    },
  });
  const loadAll = async () => {
    let items = [];
    let total = 0;
    let skip = 0;
    do {
      const p = await charityClient.challans.outstanding({ skip, limit: OUTSTANDING_PAGE });
      items = items.concat(p.items);
      total = p.total;
      skip += OUTSTANDING_PAGE;
    } while (items.length < total);
    return { items, total_amount: Number(outstanding.data?.total_amount || 0) };
  };
  return (
    <div className="space-y-4">
      <FinancialSummaryPanel
        challanStats={challanStats}
        fundSummary={fundSummary}
        pendingAmount={Number(outstanding.data?.total_amount || 0)}
        pendingCount={Number(outstanding.data?.total || 0)}
        pendingChallans={outstanding.data?.items || []}
        pendingPage={page}
        pendingPageSize={OUTSTANDING_PAGE}
        pendingTotal={Number(outstanding.data?.total || 0)}
        onPendingPageChange={setPage}
        loadAllPendingChallans={loadAll}
        members={members}
        isLoading={outstanding.isLoading}
        isAdmin
      />
      <CashCollectedReport />
    </div>
  );
}

export default function MoneySummaryView({ L, onOpenDues }) {
  const [details, setDetails] = useState(false);
  const stats = useQuery({ queryKey: ["challans", "collection-stats"], queryFn: () => charityClient.challans.collectionStats(), staleTime: 5 * 60 * 1000 });
  const funds = useQuery({ queryKey: ["fund-utilizations", "summary"], queryFn: () => charityClient.fundUtilizations.summary(), staleTime: 5 * 60 * 1000 });
  const dues = useQuery({ queryKey: ["reports", "dues", { status: "active", sort: "amount_desc", min_months: 1 }], queryFn: () => charityClient.reports.dues({ status: "active", sort: "amount_desc", min_months: 1 }) });

  const moneyIn = funds.data?.total_collected ?? stats.data?.all_time ?? 0;
  const moneyOut = funds.data?.total_utilized ?? 0;
  const balance = funds.data?.available_balance ?? moneyIn - moneyOut;

  return (
    <LoadState L={L} query={stats}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <BigNumber icon={ArrowDownCircle} tone="green" label={L.t("moneyIn")} value={L.money(moneyIn)} />
          <BigNumber icon={ArrowUpCircle} tone="red" label={L.t("moneyOut")} value={L.money(moneyOut)} />
          <BigNumber icon={Wallet} tone="blue" label={L.t("balance")} value={L.money(balance)} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <BigNumber icon={CalendarDays} tone="slate" label={L.t("inThisMonth")} value={L.money(stats.data?.this_month)} />
          <BigNumber icon={CalendarDays} tone="slate" label={L.t("inThisYear")} value={L.money(stats.data?.this_year)} />
          <BigNumber
            icon={HandCoins}
            tone="amber"
            label={`${L.t("toCollect")}${dues.data ? ` · ${L.t("memberCount", { n: dues.data.members_with_dues })}` : ""}`}
            value={dues.data ? L.money(dues.data.total_amount_due) : "…"}
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
        {details && <DetailedAccounts challanStats={stats.data} fundSummary={funds.data} />}
      </div>
    </LoadState>
  );
}

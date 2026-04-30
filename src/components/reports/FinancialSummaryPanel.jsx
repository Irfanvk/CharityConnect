import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CalendarDays,
  CalendarRange,
  AlertCircle,
} from "lucide-react";

/** Format a number as Indian-locale currency with Rs. prefix */
function fmt(amount) {
  if (amount == null || isNaN(Number(amount))) return "—";
  const n = Number(amount);
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function MetricCard({ icon: Icon, label, value, sub, iconBg, loading, highlight }) {
  return (
    <Card
      className={
        highlight
          ? "border-emerald-300 bg-emerald-50 shadow-sm"
          : "shadow-sm"
      }
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className={`rounded-full p-2.5 ${iconBg}`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
        {loading ? (
          <>
            <Skeleton className="h-7 w-28 mb-1.5" />
            <Skeleton className="h-3 w-36 mb-1" />
          </>
        ) : (
          <>
            <p
              className={`text-xl font-bold tracking-tight ${
                highlight ? "text-emerald-700" : "text-slate-800"
              }`}
            >
              {value}
            </p>
            <p className="text-sm font-medium text-slate-600 mt-0.5 leading-tight">
              {label}
            </p>
            {sub && (
              <p className="text-xs text-slate-400 mt-0.5 leading-tight">{sub}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * FinancialSummaryPanel
 *
 * Displays a high-level financial position summary using formal accounting terms.
 *
 * Props:
 *   challanStats   — from /challans/collection-stats: { today, this_week, this_month, this_year, all_time }
 *   fundSummary    — from /fund-utilizations/summary: { total_collected, total_utilized, available_balance }
 *   pendingAmount  — sum of pending/generated challan amounts (computed in parent)
 *   pendingCount   — count of pending/generated challans
 *   isLoading      — whether either query is still loading
 */
export default function FinancialSummaryPanel({
  challanStats,
  fundSummary,
  pendingAmount = 0,
  pendingCount = 0,
  isLoading = false,
}) {
  // Gross Receipts: prefer fund-utilizations (backend computes it from approved challans)
  // Fall back to challan collection-stats all_time
  const grossReceipts =
    fundSummary?.total_collected ?? challanStats?.all_time ?? 0;

  const disbursements = fundSummary?.total_utilized ?? 0;

  // Net Balance / Cash on Hand — prefer backend-computed value
  const netBalance =
    fundSummary?.available_balance ?? grossReceipts - disbursements;

  const mtd = challanStats?.this_month ?? 0;
  const ytd = challanStats?.this_year ?? 0;

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-emerald-600" />
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
          Financial Position
        </h2>
        <span className="text-xs text-slate-400 ml-1">(All figures in approved receipts)</span>
      </div>
      <Separator className="bg-slate-200" />

      {/* Row 1: primary balances */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard
          icon={TrendingUp}
          label="Gross Receipts"
          value={fmt(grossReceipts)}
          sub="Total approved collections (all time)"
          iconBg="bg-green-600"
          loading={isLoading}
        />
        <MetricCard
          icon={TrendingDown}
          label="Total Disbursements"
          value={fmt(disbursements)}
          sub="Funds utilised / expenditure recorded"
          iconBg="bg-red-500"
          loading={isLoading}
        />
        <MetricCard
          icon={Wallet}
          label="Net Balance (Cash on Hand)"
          value={fmt(netBalance)}
          sub="Gross Receipts minus Total Disbursements"
          iconBg={netBalance >= 0 ? "bg-emerald-600" : "bg-orange-500"}
          loading={isLoading}
          highlight
        />
      </div>

      {/* Row 2: period & receivables */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard
          icon={CalendarDays}
          label="Month-to-Date Receipts"
          value={fmt(mtd)}
          sub="Approved collections this calendar month"
          iconBg="bg-blue-500"
          loading={isLoading}
        />
        <MetricCard
          icon={CalendarRange}
          label="Year-to-Date Receipts"
          value={fmt(ytd)}
          sub="Approved collections this calendar year"
          iconBg="bg-indigo-500"
          loading={isLoading}
        />
        <MetricCard
          icon={AlertCircle}
          label="Outstanding Receivables"
          value={fmt(pendingAmount)}
          sub={`${pendingCount} challan${pendingCount !== 1 ? "s" : ""} pending approval`}
          iconBg="bg-amber-500"
          loading={isLoading}
        />
      </div>
    </div>
  );
}

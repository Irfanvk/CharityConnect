import React from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
    TrendingUp,
    TrendingDown,
    Wallet,
    CalendarDays,
    CalendarRange,
    AlertCircle,
    Download,
    FileDown,
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
                            className={`text-xl font-bold tracking-tight ${highlight ? "text-emerald-700" : "text-slate-800"
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
 * Restricted to admin / superadmin roles only.
 *
 * Props:
 *   challanStats   — from /challans/collection-stats: { today, this_week, this_month, this_year, all_time }
 *   fundSummary    — from /fund-utilizations/summary: { total_collected, total_utilized, available_balance }
 *   pendingAmount  — sum of pending/generated challan amounts (computed in parent)
 *   pendingCount   — count of pending/generated challans
 *   isLoading      — whether either query is still loading
 *   isAdmin        — must be true (admin or superadmin) to render this panel
 */
export default function FinancialSummaryPanel({
  challanStats,
  fundSummary,
  pendingAmount = 0,
  pendingCount = 0,
  isLoading = false,
  isAdmin = false,
}) {
  // Guard: render nothing for non-admin users
  if (!isAdmin) return null;

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

  // ── Metric rows for export ────────────────────────────────────────────────
  const metrics = [
    { label: "Gross Receipts", value: grossReceipts, note: "Total approved collections (all time)" },
    { label: "Total Disbursements", value: disbursements, note: "Funds utilised / expenditure recorded" },
    { label: "Net Balance (Cash on Hand)", value: netBalance, note: "Gross Receipts minus Total Disbursements" },
    { label: "Month-to-Date Receipts", value: mtd, note: "Approved collections this calendar month" },
    { label: "Year-to-Date Receipts", value: ytd, note: "Approved collections this calendar year" },
    { label: "Outstanding Receivables", value: pendingAmount, note: `${pendingCount} challan${pendingCount !== 1 ? "s" : ""} pending approval` },
  ];

  // ── CSV export ────────────────────────────────────────────────────────────
  function handleDownloadCSV() {
    const generatedAt = format(new Date(), "dd MMM yyyy, hh:mm a");
    const rows = [
      ["CharityHub – Financial Position Statement"],
      [`Generated: ${generatedAt}`],
      [],
      ["Metric", "Amount (INR)", "Notes"],
      ...metrics.map((m) => [
        m.label,
        Number(m.value).toLocaleString("en-IN", { maximumFractionDigits: 2 }),
        m.note,
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial-position-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── PDF export ────────────────────────────────────────────────────────────
  const PDF_BRAND = [16, 122, 87];
  const PDF_BORDER = [200, 220, 210];
  const PDF_ALT = [245, 250, 247];

  function handleDownloadPDF() {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const generatedAt = format(new Date(), "dd MMM yyyy, hh:mm a");

    // Header band
    doc.setFillColor(...PDF_BRAND);
    doc.rect(0, 0, pageW, 60, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("CharityHub", 36, 26);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text("Financial Position Statement", 36, 44);
    doc.setFontSize(9);
    doc.text(`Generated: ${generatedAt}`, pageW - 36, 44, { align: "right" });

    // Disclaimer note
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(8);
    doc.text("All figures reflect approved receipts only. Outstanding Receivables are pending approval.", 36, 76);

    // Summary table
    autoTable(doc, {
      head: [["Metric", "Amount (INR)", "Notes"]],
      body: metrics.map((m) => [
        m.label,
        Number(m.value).toLocaleString("en-IN", { maximumFractionDigits: 2 }),
        m.note,
      ]),
      startY: 90,
      margin: { left: 36, right: 36 },
      styles: {
        fontSize: 10,
        cellPadding: { top: 7, bottom: 7, left: 8, right: 8 },
        lineColor: PDF_BORDER,
        lineWidth: 0.3,
        textColor: [30, 41, 59],
      },
      headStyles: {
        fillColor: PDF_BRAND,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 10,
      },
      alternateRowStyles: { fillColor: PDF_ALT },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 175 },
        1: { halign: "right", cellWidth: 120 },
        2: { fontSize: 8.5, textColor: [100, 116, 139] },
      },
      // Highlight the Net Balance row
      didParseCell: ({ row, column, cell, section }) => {
        if (section === "body" && row.index === 2) {
          cell.styles.fillColor = [220, 240, 230];
          cell.styles.textColor = [5, 90, 60];
          if (column.index === 0 || column.index === 1) cell.styles.fontStyle = "bold";
        }
      },
      tableLineColor: PDF_BORDER,
      tableLineWidth: 0.3,
    });

    // Footer
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text("CharityHub \u2022 Financial Position Statement \u2022 Confidential", 36, pageH - 20);
    doc.text("Page 1 of 1", pageW - 36, pageH - 20, { align: "right" });

    doc.save(`financial-position-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Wallet className="h-4 w-4 text-emerald-600" />
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
          Financial Position
        </h2>
        <span className="text-xs text-slate-400 ml-1">(All figures in approved receipts)</span>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-xs border-emerald-600 text-emerald-700 hover:bg-emerald-50"
            disabled={isLoading}
            onClick={handleDownloadCSV}
          >
            <Download className="w-3 h-3 mr-1" />
            CSV
          </Button>
          <Button
            size="sm"
            className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700"
            disabled={isLoading}
            onClick={handleDownloadPDF}
          >
            <FileDown className="w-3 h-3 mr-1" />
            PDF
          </Button>
        </div>
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

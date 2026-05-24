import React, { useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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

function MetricCard({ icon: Icon, label, value, sub, iconBg, loading, highlight, onClick }) {
    return (
        <Card
            className={
                (highlight
                    ? "border-emerald-300 bg-emerald-50 shadow-sm"
                    : "shadow-sm") +
                (onClick ? " cursor-pointer hover:shadow-md hover:border-amber-300 transition-shadow" : "")
            }
            onClick={onClick}
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

/** PDF theme colours (module-level so they're created once) */
const PDF_BRAND = [16, 122, 87];
const PDF_BORDER = [200, 220, 210];
const PDF_ALT = [245, 250, 247];

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
    pendingChallans = [],
    members = [],
    isLoading = false,
    isAdmin = false,
}) {
    // Guard: render nothing for non-admin users
    if (!isAdmin) return null;

    const [receivablesOpen, setReceivablesOpen] = useState(false);

    // Member name lookup
    const mlookup = {};
    members.forEach((m) => {
        mlookup[String(m.id)] = m.full_name || m.member_name || `Member #${m.id}`;
    });
    function memberName(c) {
        return c.member_name || mlookup[String(c.member_id)] || `Member #${c.member_id ?? "?"}`;
    }

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

    const asOfDate = format(new Date(), "dd MMM yyyy");

    // ── Metric rows for export ────────────────────────────────────────────────
    const metrics = [
        { label: "Gross Receipts", value: grossReceipts, note: "Total approved collections (all time)" },
        { label: "Total Disbursements", value: disbursements, note: "Funds utilised / expenditure recorded" },
        { label: "Net Balance (Cash on Hand)", value: netBalance, note: "Gross Receipts minus Total Disbursements" },
        { label: "Month-to-Date Receipts", value: mtd, note: "Approved collections this calendar month" },
        { label: "Year-to-Date Receipts", value: ytd, note: "Approved collections this calendar year" },
        { label: `Outstanding Receivables (as of ${asOfDate})`, value: pendingAmount, note: `${pendingCount} challan${pendingCount !== 1 ? "s" : ""} pending/generated — all unpaid challans as of ${asOfDate}` },
    ];

    // ── Receivables CSV download ──────────────────────────────────────────────
    function handleReceivablesCSV() {
        const generatedAt = format(new Date(), "dd MMM yyyy, hh:mm a");
        const headerRow = ["#", "Challan ID", "Member Name", "Month", "Type", "Amount (INR)", "Status", "Raised On"];
        const dataRows = pendingChallans.map((c, i) => [
            i + 1,
            c.id,
            memberName(c),
            c.month || "",
            c.type || "",
            Number(c.amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 }),
            c.status,
            c.created_date ? format(new Date(c.created_date), "dd MMM yyyy") : "",
        ]);
        const totalRow = ["", "", "", "", "TOTAL",
            Number(pendingAmount).toLocaleString("en-IN", { maximumFractionDigits: 2 }),
            "", ""];
        const rows = [
            [`PMB GCC PORTAL – Outstanding Receivables as of ${asOfDate}`],
            [`Generated: ${generatedAt}`],
            [],
            headerRow,
            ...dataRows,
            [],
            totalRow,
        ];
        const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `outstanding-receivables-${format(new Date(), "yyyy-MM-dd")}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ── Receivables PDF download ──────────────────────────────────────────────
    function handleReceivablesPDF() {
        const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
        const pageW = doc.internal.pageSize.getWidth();
        const generatedAt = format(new Date(), "dd MMM yyyy, hh:mm a");

        doc.setFillColor(...PDF_BRAND);
        doc.rect(0, 0, pageW, 52, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("PMB GCC PORTAL", 28, 22);
        doc.setFontSize(9);
        doc.text(`As of: ${asOfDate}`, pageW - 28, 26, { align: "right" });
        doc.text(`Generated: ${generatedAt}`, pageW - 28, 40, { align: "right" });

        const tableBody = pendingChallans.map((c, i) => [
            String(i + 1),
            String(c.id),
            memberName(c),
            c.month || "",
            c.type || "",
            Number(c.amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 }),
            c.status,
            c.created_date ? format(new Date(c.created_date), "dd MMM yyyy") : "",
        ]);

        autoTable(doc, {
            head: [["#", "Challan ID", "Member Name", "Month", "Type", "Amount (INR)", "Status", "Raised On"]],
            body: tableBody,
            foot: [["", "", "", "", "TOTAL",
                Number(pendingAmount).toLocaleString("en-IN", { maximumFractionDigits: 2 }),
                "", ""]],
            showFoot: "lastPage",
            startY: 64,
            margin: { left: 28, right: 28 },
            styles: {
                fontSize: 8,
                cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
                lineColor: PDF_BORDER,
                lineWidth: 0.3,
                textColor: [30, 41, 59],
            },
            headStyles: { fillColor: PDF_BRAND, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
            alternateRowStyles: { fillColor: PDF_ALT },
            footStyles: { fillColor: [220, 240, 230], textColor: [5, 90, 60], fontStyle: "bold", fontSize: 8.5 },
            columnStyles: {
                0: { cellWidth: 24, halign: "center" },
                1: { cellWidth: 52, halign: "center" },
                5: { halign: "right", fontStyle: "bold" },
                6: { cellWidth: 62, halign: "center" },
                7: { cellWidth: 72, halign: "center" },
            },
            tableLineColor: PDF_BORDER,
            tableLineWidth: 0.3,
            didParseCell: ({ cell, column, section }) => {
                if (section === "body" && column.index === 6) {
                    const st = String(cell.raw || "").toLowerCase();
                    if (st === "pending") { cell.styles.fillColor = [255, 251, 235]; cell.styles.textColor = [161, 98, 7]; }
                    else if (st === "generated") { cell.styles.fillColor = [245, 247, 250]; cell.styles.textColor = [60, 80, 100]; }
                }
            },
        });

        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            const pageH = doc.internal.pageSize.getHeight();
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(150, 150, 150);
            doc.text(`PMB GCC PORTAL • Outstanding Receivables • Confidential`, 28, pageH - 14);
            doc.text(`Page ${i} of ${totalPages}`, pageW - 28, pageH - 14, { align: "right" });
        }

        doc.save(`outstanding-receivables-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    }

    // ── CSV export ────────────────────────────────────────────────────────────
    function handleDownloadCSV() {
        const generatedAt = format(new Date(), "dd MMM yyyy, hh:mm a");
        const rows = [
            ["PMB GCC PORTAL – Financial Position Statement"],
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
        doc.text("PMB GCC PORTAL", 36, 26);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.text("Financial Position Statement", 36, 44);
        doc.setFontSize(9);
        doc.text(`Generated: ${generatedAt}`, pageW - 36, 44, { align: "right" });

        // Disclaimer note
        doc.setTextColor(80, 80, 80);
        doc.setFontSize(8);
        doc.text(`All figures reflect approved receipts only. Outstanding Receivables shown as of ${asOfDate} (all unpaid challans regardless of age).`, 36, 76);

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
        doc.text("PMB GCC PORTAL • Financial Position Statement • Confidential", 36, pageH - 20);
        doc.text("Page 1 of 1", pageW - 36, pageH - 20, { align: "right" });

        doc.save(`financial-position-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    }

    return (
        <>
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                    <Wallet className="h-4 w-4 text-emerald-600" />
                    <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                        Financial Position
                    </h2>
                    <span className="text-xs text-slate-400 ml-1">(All figures in approved receipts &bull; as of {format(new Date(), "dd MMM yyyy")})</span>
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
                        sub={`${pendingCount} challan${pendingCount !== 1 ? "s" : ""} pending/generated — as of ${asOfDate} (all-time unpaid)`}
                        iconBg="bg-amber-500"
                        loading={isLoading}
                        onClick={() => !isLoading && setReceivablesOpen(true)}
                    />
                </div>
            </div>

            {/* ── Outstanding Receivables drill-down dialog ── */}
            <Dialog open={receivablesOpen} onOpenChange={setReceivablesOpen}>
                <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                            Outstanding Receivables
                            <span className="text-sm font-normal text-slate-500 ml-1">as of {asOfDate}</span>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center justify-between py-1">
                        <p className="text-sm text-slate-500">
                            {pendingCount} challan{pendingCount !== 1 ? "s" : ""} &bull; Total:
                            <span className="font-semibold text-amber-700 ml-1">{fmt(pendingAmount)}</span>
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 text-xs border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                                onClick={handleReceivablesCSV}
                            >
                                <Download className="w-3 h-3 mr-1" />
                                CSV
                            </Button>
                            <Button
                                size="sm"
                                className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700"
                                onClick={handleReceivablesPDF}
                            >
                                <FileDown className="w-3 h-3 mr-1" />
                                PDF
                            </Button>
                        </div>
                    </div>
                    <Separator />
                    <div className="overflow-y-auto flex-1">
                        {pendingChallans.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-10">No outstanding receivables.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-10">#</TableHead>
                                        <TableHead>Member</TableHead>
                                        <TableHead>Month</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Raised On</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingChallans.map((c, i) => (
                                        <TableRow key={c.id ?? i}>
                                            <TableCell className="text-slate-400 text-xs">{i + 1}</TableCell>
                                            <TableCell className="font-medium text-sm">{memberName(c)}</TableCell>
                                            <TableCell className="text-sm">{c.month || "—"}</TableCell>
                                            <TableCell className="text-sm capitalize">{c.type || "—"}</TableCell>
                                            <TableCell className="text-right font-semibold text-sm">{fmt(c.amount)}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    className={
                                                        c.status === "pending"
                                                            ? "bg-amber-100 text-amber-700 border-0"
                                                            : "bg-slate-100 text-slate-600 border-0"
                                                    }
                                                >
                                                    {c.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-500">
                                                {c.created_date ? format(new Date(c.created_date), "dd MMM yyyy") : "—"}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                    <Separator />
                    <DialogFooter className="flex items-center justify-between !flex-row pt-1">
                        <span className="text-xs text-slate-400">All figures are as of {asOfDate}. Includes all pending and generated challans.</span>
                        <Button variant="ghost" size="sm" onClick={() => setReceivablesOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

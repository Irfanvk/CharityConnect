import React, { useEffect, useMemo, useState } from "react";
import { charityClient } from "@/api/charityClient";
import { useQuery } from "@tanstack/react-query";
import { format, formatISTDateTime } from "@/lib/dateTime";
import { useSearchParams } from "react-router-dom";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Download, FileText, FileDown, Search, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ReportFilters from "@/components/reports/ReportFilters";
import MemberActivityReport, { exportMemberCSV } from "@/components/reports/MemberActivityReport";
import DonationSummaryReport, { exportDonationCSV } from "@/components/reports/DonationSummaryReport";
import ChallanStatusReport, { exportChallanCSV } from "@/components/reports/ChallanStatusReport";
import FinancialSummaryPanel from "@/components/reports/FinancialSummaryPanel";

const MEMBERS_REPORT_BATCH_SIZE = 200;
const CHALLANS_REPORT_BATCH_SIZE = 200;
const CAMPAIGNS_REPORT_BATCH_SIZE = 200;

function downloadCSV({ headers, rows, filename }) {
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filename}.csv`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

// Colour palette for the PDF
const PDF_BRAND_COLOR = [16, 122, 87];   // emerald-700 approx
const PDF_HEADER_BG = [16, 122, 87];
const PDF_ALT_ROW = [245, 250, 247];
const PDF_BORDER = [200, 220, 210];

function downloadPDF({ headers, rows, filename, reportName, periodLabel }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const generatedAt = `${formatISTDateTime(new Date())} IST`;  

  // ── Header band ──────────────────────────────────────────────────────────
  doc.setFillColor(...PDF_BRAND_COLOR);
  doc.rect(0, 0, pageW, 52, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("PMB GCC PORTAL", 28, 22);

  // Period / generated-at — right-aligned
  doc.setFontSize(9);
  if (periodLabel) {
    doc.text(periodLabel, pageW - 28, 22, { align: "right" });
  }
  doc.text(`Generated (IST): ${generatedAt}`, pageW - 28, 36, { align: "right" });

  // ── Table ─────────────────────────────────────────────────────────────────
  autoTable(doc, {
    head: [headers],
    body: rows.map((row) => row.map((cell) => String(cell ?? ""))),
    startY: 64,
    margin: { left: 28, right: 28 },
    styles: {
      fontSize: 8,
      cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
      overflow: "linebreak",
      lineColor: PDF_BORDER,
      lineWidth: 0.3,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: PDF_HEADER_BG,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: PDF_ALT_ROW,
    },
    tableLineColor: PDF_BORDER,
    tableLineWidth: 0.3,
  });

  // ── Footer on every page ─────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    const pageH = doc.internal.pageSize.getHeight();
    doc.text(`PMB GCC PORTAL • ${reportName}`, 28, pageH - 14);
    doc.text(`Page ${i} of ${totalPages}`, pageW - 28, pageH - 14, { align: "right" });
  }

  doc.save(`${filename}.pdf`);
}

// ── Pivot PDF: member × month matrix ─────────────────────────────────────
function buildChallanPivotData(challans, members, period, value, extraFilters = {}) {
  const { statusFilter = "all", typeFilter = "all" } = extraFilters;

  // Period filter — for yearly pivot use the challan's month field (not created_date)
  // so a Jan challan created in Feb still lands in Jan
  let list = [...challans];
  if (period !== "all") {
    list = list.filter((c) => {
      const slot = c.month || (c.created_date ? c.created_date.slice(0, 7) : null);
      return slot ? slot.startsWith(value) : false;
    });
  }
  if (typeFilter !== "all") list = list.filter((c) => c.type === typeFilter);
  if (statusFilter !== "all") list = list.filter((c) => c.status === statusFilter);

  // Member name + id lookup
  const mlookup = {};
  members.forEach((m) => {
    mlookup[String(m.id)] = {
      name: m.full_name || m.member_name || `Member #${m.id}`,
      code: m.member_code || m.member_id || String(m.id),
    };
  });
  const getNameAndCode = (c) => {
    const entry = mlookup[String(c.member_id)];
    return {
      name: c.member_name || entry?.name || `Member #${c.member_id ?? "?"}`,
      code: entry?.code || (c.member_id != null ? String(c.member_id) : "—"),
    };
  };

  // Always use the 12 fixed months of the selected year so columns are predictable
  const year = value && value.length >= 4 ? value.slice(0, 4) : String(new Date().getFullYear());
  const months = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, "0");
    return `${year}-${m}`;
  });

  // Group: memberKey -> monthKey -> { amount, status }; also track member metadata
  const memberData = {};
  const memberMeta = {}; // memberKey -> { name, code }
  list.forEach((c) => {
    const { name, code } = getNameAndCode(c);
    const memberKey = `${code}||${name}`;
    const key = c.month || (c.created_date ? c.created_date.slice(0, 7) : "N/A");
    if (!memberData[memberKey]) { memberData[memberKey] = {}; memberMeta[memberKey] = { name, code }; }
    if (!memberData[memberKey][key]) memberData[memberKey][key] = { amount: 0, status: c.status };
    memberData[memberKey][key].amount += Number(c.amount) || 0;
    if (c.status === "approved") memberData[memberKey][key].status = "approved";
  });

  const memberKeys = Object.keys(memberData).sort((a, b) =>
    memberMeta[a].name.localeCompare(memberMeta[b].name)
  );

  const monthLabels = months.map((m) => {
    try {
      const [y, mo] = m.split("-");
      return format(new Date(Number(y), Number(mo) - 1, 1), "MMM yy");
    } catch {
      return m;
    }
  });

  const headers = ["#", "Member ID", "Member Name", ...monthLabels, "Total"];
  const tableBody = [];
  const statusMatrix = []; // [rowIdx][monthIdx]

  memberKeys.forEach((memberKey, idx) => {
    const { name, code } = memberMeta[memberKey];
    const data = memberData[memberKey];
    let total = 0;
    const textRow = [String(idx + 1), code, name];
    const statusRow = [];
    months.forEach((monthKey) => {
      const cell = data[monthKey];
      if (!cell) {
        textRow.push("\u2014");
        statusRow.push("none");
      } else if (cell.status === "rejected") {
        textRow.push("Rej.");
        statusRow.push("rejected");
      } else {
        total += cell.amount;
        // Compact notation: >=10000 -> "10K", >=1000 -> "1.5K", else full
        // Use "Rs." not \u20b9 — jsPDF helvetica cannot render the rupee sign
        const amt = cell.amount;
        let label;
        if (amt >= 10000) label = `Rs.${Math.round(amt / 1000)}K`;
        else if (amt >= 1000) label = `Rs.${(amt / 1000).toFixed(1).replace(/\.0$/, "")}K`;
        else label = `Rs.${amt.toLocaleString()}`;
        textRow.push(label);
        statusRow.push(cell.status);
      }
    });
    textRow.push(`Rs.${total.toLocaleString()}`);
    statusRow.push("total");
    tableBody.push(textRow);
    statusMatrix.push(statusRow);
  });

  return { headers, tableBody, statusMatrix, memberCount: memberKeys.length, monthCount: months.length };
}

function downloadPivotPDF({ headers, tableBody, statusMatrix, filename, reportName, periodLabel }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const generatedAt = `${formatISTDateTime(new Date())} IST`;  

  // Header band
  doc.setFillColor(...PDF_BRAND_COLOR);
  doc.rect(0, 0, pageW, 52, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("PMB GCC PORTAL", 28, 22);
  doc.text(`Generated (IST): ${generatedAt}`, pageW - 28, 36, { align: "right" });

  // ── Minimal legend strip ──────────────────────────────────────────────────
  const legends = [
    { label: "Approved", fill: [236, 253, 245], text: [5, 120, 70] },
    { label: "Pending", fill: [255, 251, 235], text: [161, 98, 7] },
    { label: "Generated", fill: [245, 247, 250], text: [60, 80, 100] },
    { label: "Rejected", fill: [255, 241, 242], text: [180, 30, 30] },
    { label: "No data", fill: [255, 255, 255], text: [200, 200, 200] },
  ];
  let lx = 28;
  const ly = 58;
  doc.setFontSize(6.5);
  legends.forEach(({ label, fill, text }) => {
    doc.setFillColor(...fill);
    doc.setDrawColor(...PDF_BORDER);
    doc.rect(lx, ly, 8, 7, "FD");
    doc.setTextColor(...text);
    doc.setFont("helvetica", "bold");
    doc.text(label, lx + 10, ly + 5.5);
    lx += 10 + doc.getTextWidth(label) + 10;
  });
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "normal");

  // Dynamic column widths — allow month cols as narrow as 28pt with compact font
  const numMonths = headers.length - 4; // exclude #, Member ID, Name, Total
  const snColW = 22;
  const idColW = 44;
  const nameColW = 110;
  const totalColW = 52;
  const available = pageW - 56 - snColW - idColW - nameColW - totalColW;
  const monthColW = numMonths > 0 ? Math.max(28, Math.min(50, available / numMonths)) : 44;

  const columnStyles = {
    0: { cellWidth: snColW, halign: "center", fontSize: 6 },         // #
    1: { cellWidth: idColW, halign: "center", fontSize: 6 },         // Member ID
    2: { cellWidth: nameColW, fontSize: 6.5 },                        // Name
    [headers.length - 1]: { cellWidth: totalColW, halign: "right", fontStyle: "bold", fontSize: 6.5 }, // Total
  };
  for (let i = 3; i < headers.length - 1; i++) {
    columnStyles[i] = { cellWidth: monthColW, halign: "center", fontSize: 5.5, cellPadding: { top: 2, bottom: 2, left: 1, right: 1 } };
  }

  autoTable(doc, {
    head: [headers],
    body: tableBody,
    startY: 76,
    margin: { left: 28, right: 28 },
    styles: {
      fontSize: 6.5,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      overflow: "ellipsize",
      lineColor: PDF_BORDER,
      lineWidth: 0.3,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: PDF_HEADER_BG,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 6.5,
      halign: "center",
      cellPadding: { top: 3, bottom: 3, left: 1, right: 1 },
    },
    columnStyles,
    tableLineColor: PDF_BORDER,
    tableLineWidth: 0.3,
    didParseCell: ({ cell, row, column, section }) => {
      if (section !== "body") return;
      const colIdx = column.index;
      const rowIdx = row.index;
      if (colIdx <= 2) return; // #, Member ID, Name — no colour styling
      // Total column
      if (colIdx === headers.length - 1) {
        cell.styles.fillColor = [220, 240, 230];
        cell.styles.textColor = [5, 90, 60];
        cell.styles.fontStyle = "bold";
        return;
      }
      // Month columns map to statusMatrix[][colIdx - 3]
      const status = statusMatrix[rowIdx]?.[colIdx - 3];
      if (status === "none") {
        cell.styles.textColor = [200, 200, 200];
      } else if (status === "approved") {
        cell.styles.fillColor = [236, 253, 245];
        cell.styles.textColor = [5, 120, 70];
      } else if (status === "pending") {
        cell.styles.fillColor = [255, 251, 235];
        cell.styles.textColor = [161, 98, 7];
      } else if (status === "rejected") {
        cell.styles.fillColor = [255, 241, 242];
        cell.styles.textColor = [180, 30, 30];
      } else if (status === "generated") {
        cell.styles.fillColor = [245, 247, 250];
        cell.styles.textColor = [60, 80, 100];
      }
    },
  });

  // Footer on every page
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    const pageH = doc.internal.pageSize.getHeight();
    doc.text(`PMB GCC PORTAL • ${reportName}`, 28, pageH - 14);
    doc.text(`Page ${i} of ${totalPages}`, pageW - 28, pageH - 14, { align: "right" });
  }

  doc.save(`${filename}.pdf`);
}

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("members");
  const [memberPeriod, setMemberPeriod] = useState("monthly");
  const [memberValue, setMemberValue] = useState(format(new Date(), "yyyy-MM"));
  const [donationPeriod, setDonationPeriod] = useState("monthly");
  const [donationValue, setDonationValue] = useState(format(new Date(), "yyyy-MM"));
  const [donationCampaign, setDonationCampaign] = useState("all");
  const [challanPeriod, setChallanPeriod] = useState("monthly");
  const [challanValue, setChallanValue] = useState(format(new Date(), "yyyy-MM"));
  const [exportScope, setExportScope] = useState("filtered");

  // Extra filters — members tab
  const [memberStatus, setMemberStatus] = useState("all");
  const [memberSort, setMemberSort] = useState("name_asc");
  const [memberSearch, setMemberSearch] = useState("");
  // Extra filters — donations tab
  const [donationType, setDonationType] = useState("all");
  const [donationSort, setDonationSort] = useState("approved_desc");
  // Extra filters — challans tab
  const [challanStatus, setChallanStatus] = useState("all");
  const [challanType, setChallanType] = useState("all");
  const [challanSort, setChallanSort] = useState("created_desc");

  // Pivot PDF year picker
  const [pivotYearDialog, setPivotYearDialog] = useState(false);
  const [pivotYear, setPivotYear] = useState(String(new Date().getFullYear()));

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => charityClient.auth.me(),
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      let allMembers = [];
      let skip = 0;

      while (true) {
        const chunk = await charityClient.members.list({
          skip,
          limit: MEMBERS_REPORT_BATCH_SIZE,
        });

        allMembers = allMembers.concat(chunk);

        if (chunk.length < MEMBERS_REPORT_BATCH_SIZE) {
          break;
        }

        skip += MEMBERS_REPORT_BATCH_SIZE;
      }

      return allMembers;
    },
  });

  const { data: memberSummary } = useQuery({
    queryKey: ["members", "summary", "reports"],
    queryFn: () => charityClient.members.summary(),
  });

  const { data: challanStats, isLoading: challanStatsLoading } = useQuery({
    queryKey: ["challans", "collection-stats"],
    queryFn: () => charityClient.challans.collectionStats(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: fundSummary, isLoading: fundSummaryLoading } = useQuery({
    queryKey: ["fund-utilizations", "summary"],
    queryFn: () => charityClient.fundUtilizations.summary(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: challans = [] } = useQuery({
    queryKey: ["challans"],
    queryFn: async () => {
      let allChallans = [];
      let skip = 0;

      while (true) {
        const chunk = await charityClient.challans.list({
          order: "-created_date",
          skip,
          limit: CHALLANS_REPORT_BATCH_SIZE,
        });

        allChallans = allChallans.concat(chunk);

        if (chunk.length < CHALLANS_REPORT_BATCH_SIZE) {
          break;
        }

        skip += CHALLANS_REPORT_BATCH_SIZE;
      }

      return allChallans;
    },
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      let allCampaigns = [];
      let skip = 0;

      while (true) {
        const chunk = await charityClient.campaigns.list({
          order: "-created_date",
          skip,
          limit: CAMPAIGNS_REPORT_BATCH_SIZE,
        });

        allCampaigns = allCampaigns.concat(chunk);

        if (chunk.length < CAMPAIGNS_REPORT_BATCH_SIZE) {
          break;
        }

        skip += CAMPAIGNS_REPORT_BATCH_SIZE;
      }

      return allCampaigns;
    },
  });

  const isAdmin = useMemo(
    () => user?.role === "admin" || user?.role === "superadmin",
    [user]
  );

  // Outstanding receivables: sum of pending + generated challan amounts
  const { pendingChallans, pendingAmount, pendingCount } = useMemo(() => {
    const pending = challans.filter(
      (c) => c.status === "pending" || c.status === "generated"
    );
    return {
      pendingChallans: pending,
      pendingAmount: pending.reduce((sum, c) => sum + (Number(c.amount) || 0), 0),
      pendingCount: pending.length,
    };
  }, [challans]);

  const campaignOptions = useMemo(
    () => campaigns.map((campaign) => ({ id: String(campaign.id), name: campaign.title || `Campaign #${campaign.id}` })),
    [campaigns]
  );

  useEffect(() => {
    const linkedTab = searchParams.get("tab");
    if (linkedTab === "members" || linkedTab === "donations" || linkedTab === "challans") {
      setActiveTab(linkedTab);
    }

    const linkedCampaign = searchParams.get("campaign");
    if (linkedCampaign) {
      setDonationCampaign(String(linkedCampaign));
      setActiveTab("donations");
    }
  }, [searchParams]);

  useEffect(() => {
    if (donationCampaign === "all") {
      return;
    }

    const exists = campaignOptions.some((campaign) => campaign.id === donationCampaign);
    if (!exists) {
      setDonationCampaign("all");
    }
  }, [campaignOptions, donationCampaign]);

  const filteredDonationChallans = useMemo(() => {
    if (donationCampaign === "all") {
      return challans;
    }

    return challans.filter((challan) => String(challan.campaign_id || "") === donationCampaign);
  }, [challans, donationCampaign]);

  const selectedCampaignOption = useMemo(
    () => campaignOptions.find((campaign) => campaign.id === donationCampaign) || null,
    [campaignOptions, donationCampaign]
  );

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear; y >= 2024; y--) {
      years.push(String(y));
    }
    return years;
  }, []);

  const handleDonationCampaignChange = (value) => {
    setDonationCampaign(value);
    const next = new URLSearchParams(searchParams);
    next.set("tab", "donations");
    if (value === "all") {
      next.delete("campaign");
    } else {
      next.set("campaign", value);
    }
    setSearchParams(next, { replace: true });
  };

  const exportCurrentReport = async () => {
    let csvData;
    let reportName;

    if (activeTab === "members") {
      csvData = exportMemberCSV(
        members,
        exportScope === "complete" ? "all" : memberPeriod,
        exportScope === "complete" ? "all-time" : memberValue
      );
      reportName = "Member Activity";
    } else if (activeTab === "donations") {
      const scopedDonations = exportScope === "complete" ? challans : filteredDonationChallans;
      csvData = exportDonationCSV(
        scopedDonations,
        campaigns,
        exportScope === "complete" ? "all" : donationPeriod,
        exportScope === "complete" ? "all-time" : donationValue,
        members
      );
      reportName = "Donation Summary";
    } else {
      csvData = exportChallanCSV(
        challans,
        exportScope === "complete" ? "all" : challanPeriod,
        exportScope === "complete" ? "all-time" : challanValue,
        members
      );
      reportName = "Challan Status";
    }

    downloadCSV(csvData);

    try {
      await charityClient.auditLogs.create({
        action_type: "report_generated",
        performed_by: user?.email,
        performed_by_name: user?.full_name,
        target_type: "Report",
        target_name: reportName,
        details: {
          tab: activeTab,
          campaign_filter: activeTab === "donations" && donationCampaign !== "all" ? donationCampaign : "all",
          export_scope: exportScope,
          rows_exported: csvData.rows.length,
          filename: csvData.filename,
        },
      });
    } catch {
      // Non-blocking: exporting should not fail due to audit logging.
    }
  };

  const buildReportData = () => {
    if (activeTab === "members") {
      const csvData = exportMemberCSV(
        members,
        exportScope === "complete" ? "all" : memberPeriod,
        exportScope === "complete" ? "all-time" : memberValue,
        { statusFilter: memberStatus, sort: memberSort, search: memberSearch }
      );
      const periodLabel = exportScope === "complete" ? "All Time" : `Period: ${memberValue}`;
      return { csvData, reportName: "Member Activity Report", periodLabel };
    } else if (activeTab === "donations") {
      const scopedDonations = exportScope === "complete" ? challans : filteredDonationChallans;
      const csvData = exportDonationCSV(
        scopedDonations,
        campaigns,
        exportScope === "complete" ? "all" : donationPeriod,
        exportScope === "complete" ? "all-time" : donationValue,
        members,
        { typeFilter: donationType, sort: donationSort }
      );
      const campaignLabel = donationCampaign !== "all"
        ? ` • ${selectedCampaignOption?.name || "Campaign"}`
        : "";
      const periodLabel = exportScope === "complete" ? `All Time${campaignLabel}` : `Period: ${donationValue}${campaignLabel}`;
      return { csvData, reportName: "Donation Summary Report", periodLabel };
    } else {
      const csvData = exportChallanCSV(
        challans,
        exportScope === "complete" ? "all" : challanPeriod,
        exportScope === "complete" ? "all-time" : challanValue,
        members,
        { statusFilter: challanStatus, typeFilter: challanType, sort: challanSort }
      );
      const periodLabel = exportScope === "complete" ? "All Time" : `Period: ${challanValue}`;
      return { csvData, reportName: "Challan Status Report", periodLabel };
    }
  };

  const exportCurrentReportCSV = async () => {
    const { csvData, reportName } = buildReportData();
    downloadCSV(csvData);
    try {
      await charityClient.auditLogs.create({
        action_type: "report_generated",
        performed_by: user?.email,
        performed_by_name: user?.full_name,
        target_type: "Report",
        target_name: reportName,
        details: {
          tab: activeTab,
          format: "csv",
          campaign_filter: activeTab === "donations" && donationCampaign !== "all" ? donationCampaign : "all",
          export_scope: exportScope,
          rows_exported: csvData.rows.length,
          filename: csvData.filename,
        },
      });
    } catch {
      // Non-blocking.
    }
  };

  const runPivotPDFExport = async (year) => {
    const isChallans = activeTab === "challans";
    const scopedChallans = isChallans
      ? challans
      : (exportScope === "complete" ? challans : filteredDonationChallans);
    const theseFilters = isChallans
      ? { statusFilter: challanStatus, typeFilter: challanType }
      : { typeFilter: donationType };
    const reportName = isChallans ? "Challan Status Report" : "Donation Summary Report";
    const periodLabel = `Year: ${year}`;
    const filename = `${isChallans ? "challan" : "donation"}-pivot-${year}`;

    const pivotData = buildChallanPivotData(
      scopedChallans,
      members,
      "yearly",
      year,
      theseFilters
    );
    downloadPivotPDF({ ...pivotData, filename, reportName, periodLabel });

    try {
      await charityClient.auditLogs.create({
        action_type: "report_generated",
        performed_by: user?.email,
        performed_by_name: user?.full_name,
        target_type: "Report",
        target_name: reportName,
        details: {
          tab: activeTab,
          format: "pdf",
          layout: "pivot",
          year,
          rows_exported: pivotData.tableBody.length,
          filename,
        },
      });
    } catch {
      // Non-blocking.
    }
  };

  const exportCurrentReportPDF = async () => {
    // Members tab: flat layout (challans/donations use the year-picker dialog)
    const { csvData, reportName, periodLabel } = buildReportData();
    downloadPDF({ ...csvData, reportName, periodLabel });
    try {
      await charityClient.auditLogs.create({
        action_type: "report_generated",
        performed_by: user?.email,
        performed_by_name: user?.full_name,
        target_type: "Report",
        target_name: reportName,
        details: {
          tab: activeTab,
          format: "pdf",
          export_scope: exportScope,
          rows_exported: csvData.rows.length,
          filename: csvData.filename,
        },
      });
    } catch {
      // Non-blocking.
    }
  };

  if (!isAdmin) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Access denied. Admin privileges required.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Reports</h1>
          <p className="text-slate-500">Member activity, donation summaries, and challan status reports</p>
          {activeTab === "donations" && selectedCampaignOption && (
            <div className="mt-2 flex items-center gap-2">
              <Badge className="bg-emerald-100 text-emerald-700 border-0">
                Campaign Filter: {selectedCampaignOption.name}
              </Badge>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto px-0 text-xs"
                onClick={() => handleDonationCampaignChange("all")}
              >
                Clear
              </Button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={exportScope} onValueChange={setExportScope}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="filtered">Export Filtered Data</SelectItem>
              <SelectItem value="complete">Export Complete Data</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportCurrentReportCSV} variant="outline" className="border-emerald-600 text-emerald-700 hover:bg-emerald-50">
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button
            onClick={() =>
              (activeTab === "challans" || activeTab === "donations")
                ? setPivotYearDialog(true)
                : exportCurrentReportPDF()
            }
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <FileDown className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      <FinancialSummaryPanel
        challanStats={challanStats}
        fundSummary={fundSummary}
        pendingAmount={pendingAmount}
        pendingCount={pendingCount}
        pendingChallans={pendingChallans}
        members={members}
        isLoading={challanStatsLoading || fundSummaryLoading}
        isAdmin={isAdmin}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="donations">Donations</TabsTrigger>
          <TabsTrigger value="challans">Challans</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <ReportFilters
            period={memberPeriod}
            onPeriodChange={setMemberPeriod}
            value={memberValue}
            onValueChange={setMemberValue}
          />
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={memberStatus} onValueChange={setMemberStatus}>
              <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={memberSort} onValueChange={setMemberSort}>
              <SelectTrigger className="w-48 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="name_asc">Name A→Z</SelectItem>
                <SelectItem value="name_desc">Name Z→A</SelectItem>
                <SelectItem value="join_desc">Join Date (Newest)</SelectItem>
                <SelectItem value="join_asc">Join Date (Oldest)</SelectItem>
                <SelectItem value="amount_desc">Amount (High first)</SelectItem>
                <SelectItem value="amount_asc">Amount (Low first)</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-slate-400" />
              <Input
                placeholder="Search members..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="pl-7 h-8 w-48 text-sm"
              />
            </div>
            {(memberStatus !== 'all' || memberSort !== 'name_asc' || memberSearch) && (
              <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-400 hover:text-slate-600 px-2" onClick={() => { setMemberStatus('all'); setMemberSort('name_asc'); setMemberSearch(''); }}>
                <X className="w-3.5 h-3.5 mr-1" /> Reset
              </Button>
            )}
          </div>
          <MemberActivityReport
            members={members}
            period={memberPeriod}
            value={memberValue}
            totals={memberSummary}
            statusFilter={memberStatus}
            sort={memberSort}
            search={memberSearch}
          />
        </TabsContent>

        <TabsContent value="donations" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <ReportFilters
              period={donationPeriod}
              onPeriodChange={setDonationPeriod}
              value={donationValue}
              onValueChange={setDonationValue}
            />
            <Select value={donationCampaign} onValueChange={handleDonationCampaignChange}>
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder="Select campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {campaignOptions.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={donationType} onValueChange={setDonationType}>
              <SelectTrigger className="w-40 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="monthly">Monthly Fees</SelectItem>
                <SelectItem value="donation">Campaign Donations</SelectItem>
              </SelectContent>
            </Select>
            <Select value={donationSort} onValueChange={setDonationSort}>
              <SelectTrigger className="w-52 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="approved_desc">Approved Date (Newest)</SelectItem>
                <SelectItem value="approved_asc">Approved Date (Oldest)</SelectItem>
                <SelectItem value="amount_desc">Amount (High first)</SelectItem>
                <SelectItem value="amount_asc">Amount (Low first)</SelectItem>
                <SelectItem value="member_asc">Member A→Z</SelectItem>
                <SelectItem value="member_desc">Member Z→A</SelectItem>
              </SelectContent>
            </Select>
            {(donationType !== 'all' || donationSort !== 'approved_desc') && (
              <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-400 hover:text-slate-600 px-2" onClick={() => { setDonationType('all'); setDonationSort('approved_desc'); }}>
                <X className="w-3.5 h-3.5 mr-1" /> Reset
              </Button>
            )}
          </div>
          <DonationSummaryReport
            challans={filteredDonationChallans}
            campaigns={campaigns}
            period={donationPeriod}
            value={donationValue}
            members={members}
            typeFilter={donationType}
            sort={donationSort}
          />
        </TabsContent>

        <TabsContent value="challans" className="space-y-4">
          <ReportFilters
            period={challanPeriod}
            onPeriodChange={setChallanPeriod}
            value={challanValue}
            onValueChange={setChallanValue}
          />
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={challanStatus} onValueChange={setChallanStatus}>
              <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="generated">Generated</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={challanType} onValueChange={setChallanType}>
              <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="donation">Campaign</SelectItem>
              </SelectContent>
            </Select>
            <Select value={challanSort} onValueChange={setChallanSort}>
              <SelectTrigger className="w-52 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="created_desc">Date (Newest first)</SelectItem>
                <SelectItem value="created_asc">Date (Oldest first)</SelectItem>
                <SelectItem value="amount_desc">Amount (High first)</SelectItem>
                <SelectItem value="amount_asc">Amount (Low first)</SelectItem>
                <SelectItem value="member_asc">Member A→Z</SelectItem>
                <SelectItem value="member_desc">Member Z→A</SelectItem>
              </SelectContent>
            </Select>
            {(challanStatus !== 'all' || challanType !== 'all' || challanSort !== 'created_desc') && (
              <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-400 hover:text-slate-600 px-2" onClick={() => { setChallanStatus('all'); setChallanType('all'); setChallanSort('created_desc'); }}>
                <X className="w-3.5 h-3.5 mr-1" /> Reset
              </Button>
            )}
          </div>
          <ChallanStatusReport
            challans={challans}
            members={members}
            period={challanPeriod}
            value={challanValue}
            statusFilter={challanStatus}
            typeFilter={challanType}
            sort={challanSort}
          />
        </TabsContent>
      </Tabs>

      {/* Year picker dialog for pivot PDF (challans & donations tabs) */}
      <Dialog open={pivotYearDialog} onOpenChange={setPivotYearDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Select Year for PDF Export</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 -mt-2">
            The PDF will show one row per member with each month as a column (max 12 columns).
          </p>
          <div className="grid grid-cols-3 gap-2 py-1">
            {availableYears.map((year) => (
              <Button
                key={year}
                variant={pivotYear === year ? "default" : "outline"}
                className={pivotYear === year ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                onClick={() => setPivotYear(year)}
              >
                {year}
              </Button>
            ))}
          </div>
          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setPivotYearDialog(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                setPivotYearDialog(false);
                runPivotPDFExport(pivotYear);
              }}
            >
              <FileDown className="w-4 h-4 mr-2" />
              Generate PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
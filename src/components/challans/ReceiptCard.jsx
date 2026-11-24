import React, { forwardRef } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { formatMonth } from "@/lib/challanStatus";
import { formatISTDate } from "@/lib/dateTime";

/*
 * The receipt as people see it, download it (PDF) and share it. Plain colours and fixed
 * sizes so the PDF looks the same on every phone. `publicView` hides private details
 * (reference, who approved) for the verification page.
 */

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const METHOD = { upi: "UPI", bank_transfer: "Bank transfer", cash: "Cash", cheque: "Cheque", other: "Other" };

export function receiptWhat(r) {
  if (!r) return "";
  if (r.type === "campaign") return `Donation${r.campaign_title ? ` · ${r.campaign_title}` : ""}`;
  const months = [...(r.months || [])].sort();
  if (months.length > 1) return `Monthly fee · ${formatMonth(months[0])} – ${formatMonth(months[months.length - 1])} (${months.length} months)`;
  return `Monthly fee · ${months.length ? formatMonth(months[0]) : ""}`;
}

export const receiptDate = (value) => (value ? formatISTDate(value, { day: "numeric", month: "short", year: "numeric" }) : "—");

const Row = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", borderBottom: "1px solid #e2e8f0" }}>
    <span style={{ color: "#64748b" }}>{label}</span>
    <span style={{ color: "#0f172a", fontWeight: 600, textAlign: "right" }}>{value}</span>
  </div>
);

const ReceiptCard = forwardRef(function ReceiptCard({ receipt: r, publicView = false }, ref) {
  if (!r) return null;
  const paid = r.received_amount ?? r.amount;
  return (
    <div ref={ref} style={{ width: 380, maxWidth: "100%", background: "#ffffff", color: "#0f172a", fontFamily: "Arial, Helvetica, sans-serif",
      border: "1px solid #cbd5e1", borderRadius: 12, overflow: "hidden", fontSize: 13 }}>
      <div style={{ background: "#0070C0", color: "#ffffff", padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        {r.logo_url && <img src={r.logo_url} alt="" crossOrigin="anonymous" style={{ width: 36, height: 36, borderRadius: 8, background: "#fff", objectFit: "contain" }} />}
        <div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{r.organisation}</div>
          <div style={{ fontSize: 11, opacity: 0.9, letterSpacing: 1 }}>{r.corrected ? "PAYMENT RECEIPT · CORRECTED" : "PAYMENT RECEIPT"}</div>
        </div>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: "#64748b" }}>Receipt no.</div>
            <div style={{ fontFamily: "monospace", fontSize: 17, fontWeight: 800 }}>{r.number}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 700, color: r.valid ? "#047857" : "#be123c" }}>
            {r.valid ? <CheckCircle2 size={16} /> : <XCircle size={16} />}{r.valid ? "Paid · verified" : "Not valid"}
          </div>
        </div>
        {r.corrected && r.valid && (
          <div style={{ marginTop: 10, background: "#fffbeb", border: "1px solid #fcd34d", color: "#92400e", borderRadius: 8,
            padding: "6px 10px", fontSize: 11 }}>
            Corrected receipt: this payment was checked again. It replaces the earlier receipt with the same number.
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <Row label="Member" value={`${r.member_name}${r.member_code ? ` (${r.member_code})` : ""}`} />
          <Row label="For" value={receiptWhat(r)} />
          <Row label="Received on" value={receiptDate(r.received_on)} />
          {!publicView && r.payment_method && <Row label="Paid by" value={METHOD[r.payment_method] || r.payment_method} />}
          {!publicView && r.transaction_ref && <Row label="Reference" value={r.transaction_ref} />}
          {!publicView && r.approved_by && <Row label="Checked by" value={`${r.approved_by} · ${receiptDate(r.approved_on)}`} />}
        </div>
        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ecfdf5",
          border: "1px solid #a7f3d0", borderRadius: 8, padding: "10px 12px" }}>
          <span style={{ fontWeight: 700 }}>Amount</span>
          <span style={{ fontSize: 20, fontWeight: 800 }}>{inr(paid)}</span>
        </div>
        {!publicView && r.verify_url && (
          <div style={{ marginTop: 10, fontSize: 10, color: "#64748b", wordBreak: "break-all" }}>
            Check this receipt is genuine: {r.verify_url}
          </div>
        )}
      </div>
    </div>
  );
});

export default ReceiptCard;

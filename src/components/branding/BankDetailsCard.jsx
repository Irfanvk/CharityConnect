import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Copy, Landmark, QrCode, ShieldAlert, ShieldCheck } from "lucide-react";
import { PAGE_PATHS } from "@/config/appPaths";
import {
  BANK_DETAILS, UPI_QR_SIZE, bankDetailsVerified, formatAccountNumber, upiQrPath,
} from "@/config/bankDetails";

// The official bank details and UPI QR. Everything shown here comes from the
// locked file src/config/bankDetails.js, never from the server or settings.

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Plain http (phone testing on the local network) has no clipboard API.
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    area.remove();
    return ok;
  }
}

export const bankDetailsText = () => [
  BANK_DETAILS.organisation,
  `Bank: ${BANK_DETAILS.bankName}`,
  `Branch: ${BANK_DETAILS.branch}`,
  `Account name: ${BANK_DETAILS.accountName}`,
  `Account number: ${BANK_DETAILS.accountNumber}`,
  `IFSC: ${BANK_DETAILS.ifsc}`,
  `UPI ID: ${BANK_DETAILS.upiId}`,
].join("\n");

function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    if (!(await copyText(value))) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={`Copy ${label}`}
      className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-md border border-emerald-300 bg-white px-2.5 text-xs font-medium text-emerald-800 active:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function Row({ label, value, copyValue, big = false }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className={`break-words font-semibold text-slate-900 dark:text-slate-50 ${big ? "text-lg tracking-wide" : "text-sm"}`}>{value}</p>
      </div>
      {copyValue && <CopyButton value={copyValue} label={label} />}
    </div>
  );
}

export function UpiQr({ className = "" }) {
  const path = useMemo(upiQrPath, []);
  const quiet = 3; // white border the scanner needs
  const side = UPI_QR_SIZE + quiet * 2;
  return (
    <svg
      viewBox={`${-quiet} ${-quiet} ${side} ${side}`}
      role="img"
      aria-label={`UPI QR code for ${BANK_DETAILS.upiId}`}
      shapeRendering="crispEdges"
      className={`rounded-lg bg-white ${className}`}
    >
      <rect x={-quiet} y={-quiet} width={side} height={side} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
  );
}

function Unverified() {
  return (
    <div role="alert" className="flex gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="font-semibold">Bank details could not be verified</p>
        <p>Do not pay using details from this screen. Update the app, or ask the committee directly.</p>
      </div>
    </div>
  );
}

// compact: the short version inside the payment form. Full: the Bank details page.
export default function BankDetailsCard({ compact = false, className = "" }) {
  const verified = useMemo(bankDetailsVerified, []);
  if (!verified) return <div className={className}><Unverified /></div>;

  if (compact) {
    const line = (label, value, copyValue, copyLabel) => (
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-emerald-900/70 dark:text-emerald-100/70">{label}</p>
          <p className="break-all font-semibold tracking-wide text-emerald-950 dark:text-emerald-50">{value}</p>
        </div>
        <CopyButton value={copyValue} label={copyLabel} />
      </div>
    );
    return (
      <section className={`rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-800 dark:bg-emerald-950 ${className}`}>
        <h3 className="mb-2 flex items-center gap-1.5 font-semibold text-emerald-950 dark:text-emerald-50">
          <Landmark className="h-4 w-4" /> Pay to this account only
        </h3>
        <div className="space-y-2">
          {line(`${BANK_DETAILS.bankName} · ${BANK_DETAILS.accountName}`, formatAccountNumber(BANK_DETAILS.accountNumber), BANK_DETAILS.accountNumber, "account number")}
          {line("IFSC code", BANK_DETAILS.ifsc, BANK_DETAILS.ifsc, "IFSC code")}
          {line("UPI ID", BANK_DETAILS.upiId, BANK_DETAILS.upiId, "UPI ID")}
        </div>
        <Link to={PAGE_PATHS.BANK_DETAILS} className="mt-3 inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-emerald-800 underline underline-offset-2 dark:text-emerald-200">
          <QrCode className="h-4 w-4" /> Show QR code and full details
        </Link>
      </section>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <section className="overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-sm dark:border-emerald-900 dark:bg-slate-900">
        <header className="bg-emerald-700 px-4 py-3 text-white">
          <p className="text-base font-bold leading-snug">{BANK_DETAILS.organisation}</p>
          <p className="text-xs uppercase tracking-wider text-emerald-100">Bank account details</p>
        </header>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          <Row label="Bank name" value={BANK_DETAILS.bankName} />
          <Row label="Branch" value={BANK_DETAILS.branch} />
          <Row label="Account name" value={BANK_DETAILS.accountName} copyValue={BANK_DETAILS.accountName} />
          <Row label="Account number" value={formatAccountNumber(BANK_DETAILS.accountNumber)} copyValue={BANK_DETAILS.accountNumber} big />
          <Row label="IFSC code" value={BANK_DETAILS.ifsc} copyValue={BANK_DETAILS.ifsc} big />
        </div>
      </section>

      <section className="rounded-xl border border-emerald-200 bg-white p-4 text-center shadow-sm dark:border-emerald-900 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Scan to pay with any UPI app</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Google Pay, PhonePe, Paytm, BHIM or your bank app</p>
        <UpiQr className="mx-auto my-3 h-auto w-full max-w-[260px] border border-slate-200" />
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">UPI ID</span>
          <span className="break-all text-sm font-semibold text-slate-900 dark:text-slate-50">{BANK_DETAILS.upiId}</span>
          <CopyButton value={BANK_DETAILS.upiId} label="UPI ID" />
        </div>
      </section>

      <div className="flex gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-50">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" />
        <p>
          These are the only official details. They are fixed inside the app and nobody can edit them.
          If anyone sends you a different account number or QR, do not pay and tell the committee.
        </p>
      </div>
    </div>
  );
}

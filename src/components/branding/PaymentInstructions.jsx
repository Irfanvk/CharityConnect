import React from "react";
import { usePublicSettings } from "@/lib/usePublicSettings";
import BankDetailsCard from "@/components/branding/BankDetailsCard";

// "How to pay" inside the payment form. The account details and QR come from the
// locked file src/config/bankDetails.js. Only the note underneath is editable by
// the superadmin, and it is shown apart from the official details.
export default function PaymentInstructions({ className = "" }) {
  const s = usePublicSettings();
  const showBank = s.bank_details_enabled !== false;
  const note = s.payment_instructions_text;
  const support = [s.support_whatsapp_number && `WhatsApp ${s.support_whatsapp_number}`, s.support_email].filter(Boolean).join(" · ");

  if (!showBank && !note && !support) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {showBank && <BankDetailsCard compact />}
      {note && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Note from the admins</p>
          <p className="whitespace-pre-line">{note}</p>
        </div>
      )}
      {support && <p className="text-xs text-slate-500 dark:text-slate-400">Need help? {support}</p>}
    </div>
  );
}

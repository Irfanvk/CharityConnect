import React from "react";
import { usePublicSettings } from "@/lib/usePublicSettings";

// Shows only the payment fields the superadmin has filled in. All values render as plain text.
export default function PaymentInstructions({ className = "" }) {
  const s = usePublicSettings();
  const rows = [
    ["UPI ID", s.payment_upi_id],
    ["Bank", s.payment_bank_name],
    ["Account name", s.payment_account_name],
    ["Account number", s.payment_account_number_masked_display],
    ["IFSC / IBAN", s.payment_ifsc_or_iban],
  ].filter(([, value]) => value);
  const qr = s.payment_upi_qr_image_url;
  const text = s.payment_instructions_text;

  if (!rows.length && !qr && !text) return null;

  return (
    <section className={`rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-50 ${className}`}>
      <h3 className="mb-2 font-semibold">How to pay</h3>
      <div className="flex gap-3">
        <dl className="min-w-0 flex-1 space-y-1">
          {rows.map(([label, value]) => (
            <div key={label} className="flex gap-2">
              <dt className="w-28 shrink-0 opacity-80">{label}</dt>
              <dd className="break-all font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        {qr && <img src={qr} alt="UPI QR code" className="h-24 w-24 rounded border bg-white object-contain" />}
      </div>
      {text && <p className="mt-2 whitespace-pre-line">{text}</p>}
      {(s.support_whatsapp_number || s.support_email) && (
        <p className="mt-2 text-xs opacity-80">
          Need help? {[s.support_whatsapp_number && `WhatsApp ${s.support_whatsapp_number}`, s.support_email].filter(Boolean).join(" · ")}
        </p>
      )}
    </section>
  );
}

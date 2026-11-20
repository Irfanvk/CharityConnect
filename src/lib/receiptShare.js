/*
 * Receipt PDF and sharing. The PDF is made on the device from the receipt card (no server
 * work). Sharing uses the phone's share sheet with the PDF when it can (WhatsApp shows up
 * there); otherwise it opens WhatsApp with the message and the receipt link.
 */
import { receiptDate, receiptWhat } from "@/components/challans/ReceiptCard";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export function receiptMessage(r) {
  return `${r.organisation}: payment receipt ${r.number}\n${receiptWhat(r)}\nAmount ${inr(r.received_amount ?? r.amount)}, received ${receiptDate(r.received_on)}.\nCheck it here: ${r.verify_url}`;
}

export async function receiptPdf(node, r) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
  const img = canvas.toDataURL("image/jpeg", 0.9); // JPEG keeps the PDF small enough for WhatsApp
  const pdf = new jsPDF({ unit: "mm", format: "a5", orientation: "portrait", compress: true });
  const pageW = pdf.internal.pageSize.getWidth();
  const w = pageW - 20;
  const h = (canvas.height / canvas.width) * w;
  pdf.addImage(img, "JPEG", 10, 10, w, h);
  const blob = pdf.output("blob");
  return new File([blob], `Receipt ${r.number}.pdf`, { type: "application/pdf" });
}

export function downloadFile(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** wa.me link; with a phone number it opens that chat (digits only, country code included). */
export function whatsappLink(text, phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** Share sheet with the PDF when supported; returns false when the caller should fall back. */
export async function shareReceipt(file, r) {
  const text = receiptMessage(r);
  try {
    if (file && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: `Receipt ${r.number}`, text });
      return true;
    }
  } catch (e) {
    if (e?.name === "AbortError") return true; // the person closed the share sheet
  }
  return false;
}

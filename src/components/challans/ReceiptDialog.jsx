import React, { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Download, Loader2, MessageCircle, Share2 } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import ReceiptCard from "@/components/challans/ReceiptCard";
import { downloadFile, receiptMessage, receiptPdf, shareReceipt, whatsappLink } from "@/lib/receiptShare";

/*
 * The receipt of an approved payment: download it as a PDF, share it (the phone's share
 * sheet with the PDF, or WhatsApp with the link), copy the link. Admins can also open a
 * WhatsApp chat with the member's number, with the message ready to send.
 * target = { challanId } | { bulkGroupId }
 */
export default function ReceiptDialog({ target, onOpenChange, isAdmin = false }) {
  const { toast } = useToast();
  const cardRef = useRef(null);
  const [working, setWorking] = useState("");
  const open = Boolean(target);

  const { data: receipt, isLoading, error } = useQuery({
    queryKey: ["receipt", target?.challanId ?? null, target?.bulkGroupId ?? null],
    queryFn: () => (target.bulkGroupId ? charityClient.receipts.forBulk(target.bulkGroupId) : charityClient.receipts.forChallan(target.challanId)),
    enabled: open,
    retry: false,
  });

  const makePdf = async () => receiptPdf(cardRef.current, receipt);
  const run = (key, fn) => async () => {
    setWorking(key);
    try { await fn(); } catch (e) {
      toast({ title: "Something went wrong", description: e?.message || "Please try again.", variant: "destructive" });
    } finally { setWorking(""); }
  };

  const download = run("pdf", async () => downloadFile(await makePdf()));
  const share = run("share", async () => {
    const shared = await shareReceipt(await makePdf().catch(() => null), receipt);
    if (!shared) window.open(whatsappLink(receiptMessage(receipt)), "_blank", "noopener,noreferrer");
  });
  const sendToMember = () => window.open(whatsappLink(receiptMessage(receipt), receipt?.member_phone), "_blank", "noopener,noreferrer");
  const copy = run("copy", async () => {
    await navigator.clipboard.writeText(receiptMessage(receipt));
    toast({ title: "Copied", description: "The receipt message and link are ready to paste." });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receipt</DialogTitle>
          <DialogDescription>Download it, or share it on WhatsApp. Anyone with the link can check it is genuine.</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <p className="flex items-center justify-center gap-2 py-10 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Loading…</p>
        ) : error ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error?.message || "The receipt is not available."}</p>
        ) : receipt ? (
          <>
            <div className="flex justify-center"><ReceiptCard ref={cardRef} receipt={receipt} /></div>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={share} disabled={!!working} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                {working === "share" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}Share
              </Button>
              <Button variant="outline" onClick={download} disabled={!!working} className="gap-2">
                {working === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Download PDF
              </Button>
              {isAdmin && receipt.member_phone && (
                <Button variant="outline" onClick={sendToMember} className="col-span-2 gap-2 border-emerald-300 text-emerald-800">
                  <MessageCircle className="h-4 w-4" />Send to member on WhatsApp
                </Button>
              )}
              <Button variant="ghost" onClick={copy} disabled={!!working} className="col-span-2 gap-2 text-slate-600">
                <Copy className="h-4 w-4" />Copy message and link
              </Button>
            </div>
            {isAdmin && receipt.member_phone && (
              <p className="text-xs text-slate-500">"Send to member" opens WhatsApp with the message and link. To attach the PDF too, download it first and add it in the chat.</p>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

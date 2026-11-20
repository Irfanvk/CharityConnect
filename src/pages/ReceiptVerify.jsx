import React from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import ReceiptCard from "@/components/challans/ReceiptCard";

/*
 * Public page behind a receipt's link (/r/<token>): anyone can check a receipt is genuine.
 * Shows only what is printed on the receipt, with the member's name shortened.
 */
export default function ReceiptVerify({ token }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["receipt-verify", token],
    queryFn: () => charityClient.receipts.verify(token),
    retry: false,
  });

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4">
        {isLoading ? (
          <p className="flex items-center gap-2 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Checking the receipt…</p>
        ) : error || !data ? (
          <div className="w-full rounded-2xl border border-rose-200 bg-white p-6 text-center">
            <XCircle className="mx-auto h-10 w-10 text-rose-600" />
            <p className="mt-2 text-lg font-bold text-slate-900">Receipt not found</p>
            <p className="text-sm text-slate-600">This link is not a genuine receipt, or it was typed wrongly.</p>
          </div>
        ) : (
          <>
            <div className={`flex w-full items-center gap-3 rounded-2xl border bg-white p-4 ${data.valid ? "border-emerald-200" : "border-rose-200"}`}>
              {data.valid ? <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-600" /> : <XCircle className="h-8 w-8 shrink-0 text-rose-600" />}
              <div>
                <p className="font-bold text-slate-900">{data.valid ? "Genuine receipt" : "This receipt is no longer valid"}</p>
                <p className="text-sm text-slate-600">
                  {data.valid ? `Issued by ${data.organisation}. The payment was checked and approved.` : "The payment was changed after the receipt was issued. Please contact the committee."}
                </p>
              </div>
            </div>
            <ReceiptCard receipt={data} publicView />
          </>
        )}
      </div>
    </div>
  );
}

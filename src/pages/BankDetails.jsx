import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Landmark, Share2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PAGE_PATHS } from "@/config/appPaths";
import { usePublicSettings } from "@/lib/usePublicSettings";
import BankDetailsCard, { bankDetailsText, copyText } from "@/components/branding/BankDetailsCard";
import { bankDetailsVerified } from "@/config/bankDetails";

// Official bank details and UPI QR, for every signed-in user.
// A superadmin can hide this page (setting "bank_details_enabled"); nobody can edit its content.
export default function BankDetails() {
  const settings = usePublicSettings();
  const [shared, setShared] = useState(false);
  const verified = bankDetailsVerified();

  const share = async () => {
    const text = bankDetailsText();
    try {
      if (navigator.share) await navigator.share({ text });
      else if (!(await copyText(text))) return;
      setShared(true);
      window.setTimeout(() => setShared(false), 2000);
    } catch {
      // The person closed the share sheet; nothing to do.
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-50">
          <Landmark className="h-6 w-6 text-emerald-700 dark:text-emerald-400" /> Bank details
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Where to send your contribution</p>
      </div>

      {settings.bank_details_enabled === false ? (
        <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Bank details are not shown in the app right now. Please ask the committee.
        </p>
      ) : (
        <>
          <BankDetailsCard />
          {verified && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button asChild className="h-11 bg-emerald-600 hover:bg-emerald-700">
                <Link to={PAGE_PATHS.CHALLANS}>
                  <Upload className="mr-2 h-4 w-4" /> I have paid, upload proof
                </Link>
              </Button>
              <Button type="button" variant="outline" className="h-11" onClick={share}>
                {shared ? <Check className="mr-2 h-4 w-4" /> : <Share2 className="mr-2 h-4 w-4" />}
                {shared ? "Done" : "Share details"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

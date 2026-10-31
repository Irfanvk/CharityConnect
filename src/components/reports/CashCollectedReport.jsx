import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { charityClient } from "@/api/charityClient";
import { currentBusinessMonth } from "@/lib/businessTime";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

const formatInr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function CashCollectedReport() {
  const [month, setMonth] = useState(currentBusinessMonth());
  const validMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(month);

  const { data, isLoading, error } = useQuery({
    queryKey: ["reports", "cash-collected", month],
    enabled: validMonth,
    queryFn: () => charityClient.challans.cashCollected(month),
  });

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Cash collected</h2>
            <p className="text-xs text-slate-500">By collecting admin, month in IST. Rejected entries are excluded.</p>
          </div>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-full sm:w-44" />
        </div>

        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : error ? (
          <p className="text-sm text-rose-600">{error.message || "Could not load the report."}</p>
        ) : !data?.collectors?.length ? (
          <p className="text-sm text-slate-500">No cash collected in this month.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
                    <th className="py-2 pr-3">Collected by</th>
                    <th className="py-2 pr-3 text-right">Entries</th>
                    <th className="py-2 pr-3 text-right">Pending verification</th>
                    <th className="py-2 text-right">Approved</th>
                  </tr>
                </thead>
                <tbody>
                  {data.collectors.map((row) => (
                    <tr key={row.collected_by_user_id} className="border-b last:border-0">
                      <td className="py-2 pr-3">{row.collected_by_name || `User #${row.collected_by_user_id}`}</td>
                      <td className="py-2 pr-3 text-right">{row.count}</td>
                      <td className="py-2 pr-3 text-right text-amber-700">{formatInr(row.pending_amount)}</td>
                      <td className="py-2 text-right text-emerald-700">{formatInr(row.approved_amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td className="py-2 pr-3">Total</td>
                    <td />
                    <td className="py-2 pr-3 text-right">{formatInr(data.total_pending_amount)}</td>
                    <td className="py-2 text-right">{formatInr(data.total_approved_amount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

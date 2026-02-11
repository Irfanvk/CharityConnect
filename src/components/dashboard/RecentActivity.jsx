import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Receipt, CheckCircle2, XCircle, Clock, Upload } from "lucide-react";

const statusConfig = {
  generated: { label: "Generated", color: "bg-slate-100 text-slate-700", icon: Receipt },
  proof_uploaded: { label: "Proof Uploaded", color: "bg-blue-100 text-blue-700", icon: Upload },
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700", icon: Clock },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-rose-100 text-rose-700", icon: XCircle },
};

export default function RecentActivity({ challans }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-slate-800">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {challans.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No recent activity</p>
        ) : (
          challans.slice(0, 5).map((challan) => {
            const status = statusConfig[challan.status];
            const StatusIcon = status?.icon || Receipt;
            return (
              <div key={challan.id} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className={`w-10 h-10 rounded-lg ${status?.color} flex items-center justify-center`}>
                  <StatusIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">
                    {challan.challan_number}
                  </p>
                  <p className="text-sm text-slate-500">
                    {challan.member_name} • {challan.type === 'monthly' ? `Monthly (${challan.month})` : challan.campaign_name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-800">₹{challan.amount}</p>
                  <p className="text-xs text-slate-500">
                    {format(new Date(challan.created_date), "MMM d")}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, Heart, Calendar } from "lucide-react";
import { format } from "@/lib/dateTime";

const statusConfig = {
  generated: { label: "Generated", color: "bg-slate-100 text-slate-700" },
  proof_uploaded: { label: "Proof Uploaded", color: "bg-blue-100 text-blue-700" },
  pending: { label: "Pending Review", color: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", color: "bg-rose-100 text-rose-700" },
};

export default function ContributionHistory({ challans }) {
  const totalContributed = challans
    .filter(c => c.status === 'approved')
    .reduce((sum, c) => sum + c.amount, 0);

  const monthlyPayments = challans.filter(c => c.type === 'monthly');
  const campaignDonations = challans.filter(c => c.type === 'donation');

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500 mb-1">Total Contributed</p>
            <p className="text-2xl font-bold text-slate-900">₹{totalContributed.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500 mb-1">Monthly Payments</p>
            <p className="text-2xl font-bold text-slate-900">{monthlyPayments.length}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-rose-50 to-pink-50">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500 mb-1">Campaign Donations</p>
            <p className="text-2xl font-bold text-slate-900">{campaignDonations.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Contribution List */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Contribution History</CardTitle>
        </CardHeader>
        <CardContent>
          {challans.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p>No contributions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {challans.map(challan => {
                const status = statusConfig[challan.status];
                return (
                  <div 
                    key={challan.id} 
                    className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                      {challan.type === 'monthly' ? (
                        <Receipt className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Heart className="w-5 h-5 text-rose-600" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-slate-900">{challan.challan_number}</p>
                        <Badge className={status?.color}>{status?.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="capitalize">
                          {challan.type === 'monthly' 
                            ? `Monthly Payment (${challan.month})` 
                            : challan.campaign_name || 'Campaign Donation'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(challan.created_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>

                    <p className="text-lg font-semibold text-slate-900">
                      ₹{challan.amount}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Receipt } from "lucide-react";
import { format } from "date-fns";

function filterByPeriod(items, period, value) {
  if (period === "all") return items;
  return items.filter((item) => {
    const dateValue = item.created_date;
    if (!dateValue) return false;
    if (period === "monthly") return dateValue.startsWith(value);
    if (period === "yearly") return dateValue.startsWith(value);
    return true;
  });
}

const normalizeId = (value) => (value === null || value === undefined ? "" : String(value));

function resolveMemberName(challan, members = []) {
  if (challan?.member_name) return challan.member_name;
  const linkedMember = members.find((member) => normalizeId(member.id) === normalizeId(challan?.member_id));
  return linkedMember?.full_name || linkedMember?.member_name || `Member #${challan?.member_id ?? "-"}`;
}

export function exportChallanCSV(challans, period, value, members = []) {
  const filtered = filterByPeriod(challans, period, value);
  const headers = [
    "Challan Number",
    "Member Name",
    "Type",
    "Amount",
    "Month",
    "Campaign",
    "Status",
    "Created Date",
    "Approved/Rejected Date",
    "Rejection Reason",
  ];
  const rows = filtered.map((c) => [
    c.challan_number || `CH-${c.id}`,
    resolveMemberName(c, members),
    c.type,
    c.amount,
    c.month || "",
    c.campaign_name || "",
    c.status,
    c.created_date ? format(new Date(c.created_date), "yyyy-MM-dd") : "",
    c.approved_at ? format(new Date(c.approved_at), "yyyy-MM-dd") : "",
    c.rejection_reason || "",
  ]);

  return { headers, rows, filename: `challan-report-${period === "all" ? "all-time" : value}` };
}

const statusConfig = {
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2, bg: "bg-emerald-50" },
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700", icon: Clock, bg: "bg-amber-50" },
  generated: { label: "Generated", color: "bg-slate-100 text-slate-700", icon: Receipt, bg: "bg-slate-50" },
  rejected: { label: "Rejected", color: "bg-rose-100 text-rose-700", icon: XCircle, bg: "bg-rose-50" },
};

export default function ChallanStatusReport({ challans, members = [], period, value }) {
  const filtered = filterByPeriod(challans, period, value);

  const counts = {
    approved: filtered.filter((c) => c.status === "approved").length,
    pending: filtered.filter((c) => c.status === "pending").length,
    generated: filtered.filter((c) => c.status === "generated").length,
    rejected: filtered.filter((c) => c.status === "rejected").length,
  };

  const needsAction = filtered
    .filter((c) => c.status === "pending")
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const recentRejections = filtered
    .filter((c) => c.status === "rejected")
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 20);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(statusConfig).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <Card key={key} className={`border-0 shadow-sm ${cfg.bg}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4" />
                  <span className="text-xs text-slate-500">{cfg.label}</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{counts[key]}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" /> Pending Approvals
              {needsAction.length > 0 && (
                <Badge className="bg-amber-100 text-amber-700 border-0 text-xs ml-auto">{needsAction.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {needsAction.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No pending approvals 🎉</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {needsAction.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{resolveMemberName(c, members)}</p>
                      <p className="text-xs text-slate-400">{(c.challan_number || `CH-${c.id}`)} · {c.created_date ? format(new Date(c.created_date), "dd MMM yyyy") : ""}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">₹{(c.amount || 0).toLocaleString()}</p>
                      <Badge className="text-xs border-0 bg-amber-100 text-amber-700">Pending</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-500" /> Recent Rejections
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentRejections.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No rejections in this period</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {recentRejections.map((c) => (
                  <div key={c.id} className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-800">{resolveMemberName(c, members)}</p>
                      <p className="text-sm font-semibold text-rose-600">₹{(c.amount || 0).toLocaleString()}</p>
                    </div>
                    <p className="text-xs text-slate-400">{(c.challan_number || `CH-${c.id}`)} · {c.created_date ? format(new Date(c.created_date), "dd MMM yyyy") : ""}</p>
                    {c.rejection_reason && <p className="text-xs text-rose-600 italic">"{c.rejection_reason}"</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base">All Challans</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">Challan</th>
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">Member</th>
                  <th className="text-left py-2 px-3 text-slate-500 font-medium hidden sm:table-cell">Type</th>
                  <th className="text-right py-2 px-3 text-slate-500 font-medium">Amount</th>
                  <th className="text-right py-2 px-3 text-slate-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.slice(0, 50).map((c) => {
                  const cfg = statusConfig[c.status] || statusConfig.generated;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono text-xs text-slate-500">{c.challan_number || `CH-${c.id}`}</td>
                      <td className="py-2 px-3 text-slate-800">{resolveMemberName(c, members)}</td>
                      <td className="py-2 px-3 hidden sm:table-cell">
                        <Badge className={`text-xs border-0 ${c.type === "monthly" ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-700"}`}>{c.type}</Badge>
                      </td>
                      <td className="py-2 px-3 text-right font-semibold">₹{(c.amount || 0).toLocaleString()}</td>
                      <td className="py-2 px-3 text-right">
                        <Badge className={`text-xs border-0 ${cfg.color}`}>{cfg.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="text-center text-slate-400 py-8">No challans in this period</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

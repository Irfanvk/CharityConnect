import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Heart, Receipt } from "lucide-react";
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

function buildMemberLookup(members = []) {
  const byId = {};
  const byEmail = {};

  members.forEach((member) => {
    const idKey = member?.id != null ? String(member.id) : null;
    const emailKey = member?.email ? String(member.email).toLowerCase() : null;

    if (idKey) {
      byId[idKey] = member;
    }

    if (emailKey) {
      byEmail[emailKey] = member;
    }
  });

  return { byId, byEmail };
}

function resolveDonationMember(challan, memberLookup) {
  const memberIdKey = challan?.member_id != null ? String(challan.member_id) : null;
  const memberEmailKey = challan?.member_email ? String(challan.member_email).toLowerCase() : null;

  const memberFromDirectory =
    (memberIdKey ? memberLookup.byId[memberIdKey] : null) ||
    (memberEmailKey ? memberLookup.byEmail[memberEmailKey] : null) ||
    null;

  const fullName =
    challan?.member_name ||
    memberFromDirectory?.full_name ||
    challan?.donor_name ||
    "Unknown Donor";

  const memberCode =
    memberFromDirectory?.member_code ||
    memberFromDirectory?.member_id ||
    (challan?.member_id != null ? String(challan.member_id) : "N/A");

  return {
    fullName,
    memberCode,
  };
}

export function exportDonationCSV(challans, campaigns, period, value, members = []) {
  void campaigns;
  const memberLookup = buildMemberLookup(members);
  const filtered = filterByPeriod(challans, period, value).filter((c) => c.status === "approved");
  const headers = ["Challan Number", "Member ID", "Member Full Name", "Type", "Campaign", "Amount", "Month", "Approved Date"];
  const rows = filtered.map((c) => {
    const resolved = resolveDonationMember(c, memberLookup);
    return [
      c.challan_number,
      resolved.memberCode,
      resolved.fullName,
      c.type,
      c.campaign_name || "",
      c.amount,
      c.month || "",
      c.approved_at ? format(new Date(c.approved_at), "yyyy-MM-dd") : "",
    ];
  });

  return { headers, rows, filename: `donation-report-${period === "all" ? "all-time" : value}` };
}

export default function DonationSummaryReport({ challans, campaigns, period, value, members = [] }) {
  void campaigns;
  const memberLookup = React.useMemo(() => buildMemberLookup(members), [members]);
  const filtered = filterByPeriod(challans, period, value);
  const approved = filtered.filter((c) => c.status === "approved");

  const totalCollected = approved.reduce((sum, c) => sum + (c.amount || 0), 0);
  const monthlyTotal = approved.filter((c) => c.type === "monthly").reduce((sum, c) => sum + (c.amount || 0), 0);
  const donationTotal = approved.filter((c) => c.type === "donation").reduce((sum, c) => sum + (c.amount || 0), 0);

  const campaignMap = {};
  approved
    .filter((c) => c.type === "donation" && c.campaign_id)
    .forEach((c) => {
      if (!campaignMap[c.campaign_id]) {
        campaignMap[c.campaign_id] = { name: c.campaign_name || "Unknown", total: 0, count: 0 };
      }
      campaignMap[c.campaign_id].total += c.amount || 0;
      campaignMap[c.campaign_id].count++;
    });

  const campaignBreakdown = Object.values(campaignMap).sort((a, b) => b.total - a.total);

  const memberMap = {};
  approved.forEach((c) => {
    const resolved = resolveDonationMember(c, memberLookup);
    const contributorKey = `${resolved.memberCode}-${resolved.fullName}`;
    if (!memberMap[contributorKey]) {
      memberMap[contributorKey] = { name: resolved.fullName, total: 0 };
    }
    memberMap[contributorKey].total += c.amount || 0;
  });

  const topContributors = Object.values(memberMap).sort((a, b) => b.total - a.total).slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-emerald-50">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-emerald-600" />
            <div>
              <p className="text-xs text-slate-500">Total Collected</p>
              <p className="text-2xl font-bold text-slate-900">₹{totalCollected.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-blue-50">
          <CardContent className="p-4 flex items-center gap-3">
            <Receipt className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-xs text-slate-500">Monthly Fees</p>
              <p className="text-2xl font-bold text-slate-900">₹{monthlyTotal.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-rose-50">
          <CardContent className="p-4 flex items-center gap-3">
            <Heart className="w-8 h-8 text-rose-600" />
            <div>
              <p className="text-xs text-slate-500">Campaign Donations</p>
              <p className="text-2xl font-bold text-slate-900">₹{donationTotal.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">By Campaign</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {campaignBreakdown.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No campaign donations in this period</p>
            ) : campaignBreakdown.map((c) => (
              <div key={c.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700 truncate max-w-[180px]">{c.name}</span>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-emerald-600">₹{c.total.toLocaleString()}</span>
                    <span className="text-xs text-slate-400 ml-2">({c.count})</span>
                  </div>
                </div>
                <Progress value={donationTotal > 0 ? (c.total / donationTotal) * 100 : 0} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Top Contributors</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topContributors.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">No contributions in this period</p>
              ) : topContributors.map((m, i) => (
                <div key={m.name} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-xs flex items-center justify-center font-semibold">{i + 1}</span>
                    <span className="text-sm text-slate-700">{m.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">₹{m.total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base">Approved Transactions</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">Challan</th>
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">Member ID</th>
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">Full Name</th>
                  <th className="text-left py-2 px-3 text-slate-500 font-medium hidden md:table-cell">Type</th>
                  <th className="text-left py-2 px-3 text-slate-500 font-medium hidden md:table-cell">Campaign/Month</th>
                  <th className="text-right py-2 px-3 text-slate-500 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {approved.slice(0, 50).map((c) => {
                  const resolved = resolveDonationMember(c, memberLookup);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono text-xs text-slate-500">{c.challan_number}</td>
                      <td className="py-2 px-3 text-slate-800">{resolved.memberCode}</td>
                      <td className="py-2 px-3 text-slate-800">{resolved.fullName}</td>
                      <td className="py-2 px-3 hidden md:table-cell">
                        <Badge className={`text-xs border-0 ${c.type === "monthly" ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-700"}`}>{c.type}</Badge>
                      </td>
                      <td className="py-2 px-3 text-slate-500 hidden md:table-cell">
                        {c.type === "monthly" ? (c.month || "—") : (c.campaign_name || "—")}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-emerald-600">₹{(c.amount || 0).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {approved.length === 0 && <p className="text-center text-slate-400 py-8">No approved transactions</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

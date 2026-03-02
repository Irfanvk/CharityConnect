import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, UserX, UserPlus } from "lucide-react";
import { format } from "date-fns";

export function filterMembersByPeriod(members, period, value) {
  if (period === "all") return members;
  return members.filter((member) => {
    if (!member.join_date) return false;
    if (period === "monthly") return member.join_date.startsWith(value);
    if (period === "yearly") return member.join_date.startsWith(value);
    return true;
  });
}

export function exportMemberCSV(members, period, value) {
  const filtered = filterMembersByPeriod(members, period, value);
  const headers = ["Member ID", "Full Name", "Email", "Phone", "City", "Status", "Monthly Amount", "Join Date"];
  const rows = filtered.map((m) => [
    m.member_id,
    m.full_name,
    m.email || "",
    m.phone || "",
    m.city || "",
    m.status,
    m.monthly_amount || 100,
    m.join_date || "",
  ]);

  return { headers, rows, filename: `member-report-${period === "all" ? "all-time" : value}` };
}

export default function MemberActivityReport({ members, period, value }) {
  const allActive = members.filter((m) => m.status === "active");
  const allInactive = members.filter((m) => m.status !== "active");
  const newMembers = filterMembersByPeriod(members, period, value);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-emerald-600" />
              <div>
                <p className="text-xs text-slate-500">Total Members</p>
                <p className="text-2xl font-bold text-slate-900">{members.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <UserCheck className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-xs text-slate-500">Active</p>
                <p className="text-2xl font-bold text-slate-900">{allActive.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-slate-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <UserX className="w-8 h-8 text-slate-500" />
              <div>
                <p className="text-xs text-slate-500">Inactive</p>
                <p className="text-2xl font-bold text-slate-900">{allInactive.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-teal-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <UserPlus className="w-8 h-8 text-teal-600" />
              <div>
                <p className="text-xs text-slate-500">New in Period</p>
                <p className="text-2xl font-bold text-slate-900">{newMembers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {period === "all"
              ? "All Members"
              : `New Members — ${period === "monthly" ? format(new Date(`${value}-01`), "MMMM yyyy") : value}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">Member ID</th>
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">Name</th>
                  <th className="text-left py-2 px-3 text-slate-500 font-medium hidden md:table-cell">Email</th>
                  <th className="text-left py-2 px-3 text-slate-500 font-medium hidden md:table-cell">City</th>
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">Status</th>
                  <th className="text-right py-2 px-3 text-slate-500 font-medium hidden sm:table-cell">Join Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {newMembers.slice(0, 50).map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-600">{m.member_id}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{m.full_name}</td>
                    <td className="py-2.5 px-3 text-slate-500 hidden md:table-cell">{m.email || "—"}</td>
                    <td className="py-2.5 px-3 text-slate-500 hidden md:table-cell">{m.city || "—"}</td>
                    <td className="py-2.5 px-3">
                      <Badge
                        className={`text-xs border-0 ${
                          m.status === "active"
                            ? "bg-emerald-100 text-emerald-700"
                            : m.status === "suspended"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {m.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-right hidden sm:table-cell">
                      {m.join_date ? format(new Date(m.join_date), "dd MMM yyyy") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {newMembers.length === 0 && (
              <p className="text-center text-slate-400 py-8">No members in this period</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import React from "react";
import { formatMemberId } from "@/lib/utils";
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

const MEMBER_SORT_FNS = {
  name_asc:    (a, b) => (a.full_name || '').localeCompare(b.full_name || ''),
  name_desc:   (a, b) => (b.full_name || '').localeCompare(a.full_name || ''),
  join_desc:   (a, b) => new Date(b.join_date || 0) - new Date(a.join_date || 0),
  join_asc:    (a, b) => new Date(a.join_date || 0) - new Date(b.join_date || 0),
  amount_desc: (a, b) => Number(b.monthly_amount || 0) - Number(a.monthly_amount || 0),
  amount_asc:  (a, b) => Number(a.monthly_amount || 0) - Number(b.monthly_amount || 0),
};

function applyMemberFilters(list, { statusFilter = 'all', sort = 'name_asc', search = '' } = {}) {
  let result = list;
  if (statusFilter !== 'all') result = result.filter((m) => m.status === statusFilter);
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter((m) =>
      (m.full_name || '').toLowerCase().includes(q) ||
      String(m.member_id || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q) ||
      (m.phone || '').includes(q)
    );
  }
  return [...result].sort(MEMBER_SORT_FNS[sort] || MEMBER_SORT_FNS.name_asc);
}

export function exportMemberCSV(members, period, value, extraFilters = {}) {
  const periodFiltered = filterMembersByPeriod(members, period, value);
  const filtered = applyMemberFilters(periodFiltered, extraFilters);
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

export default function MemberActivityReport({ members, period, value, totals, statusFilter = 'all', sort = 'name_asc', search = '' }) {
  const allActive = members.filter((m) => m.status === "active");
  const allInactive = members.filter((m) => m.status !== "active");
  const totalMembers = Number(totals?.total_members ?? members.length);
  const activeMembers = Number(totals?.active_members ?? allActive.length);
  const inactiveMembers = Math.max(0, totalMembers - activeMembers);
  const newMembers = filterMembersByPeriod(members, period, value);
  const displayMembers = applyMemberFilters(newMembers, { statusFilter, sort, search });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-emerald-600" />
              <div>
                <p className="text-xs text-slate-500">Total Members</p>
                <p className="text-2xl font-bold text-slate-900">{totalMembers}</p>
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
                <p className="text-2xl font-bold text-slate-900">{activeMembers}</p>
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
                <p className="text-2xl font-bold text-slate-900">{inactiveMembers}</p>
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
            {displayMembers.length !== newMembers.length && (
              <span className="font-normal text-slate-400 ml-2 text-sm">({displayMembers.length} of {newMembers.length})</span>
            )}
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
                {displayMembers.slice(0, 100).map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-600">{formatMemberId(m.member_id)}</td>
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
            {displayMembers.length === 0 && (
              <p className="text-center text-slate-400 py-8">
                {newMembers.length === 0 ? "No members in this period" : "No members match the current filters"}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

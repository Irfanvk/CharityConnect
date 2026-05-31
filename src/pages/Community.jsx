import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { charityClient } from "@/api/charityClient";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Wallet, Receipt } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const PIE_COLORS = ["#10b981", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];

export default function Community() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const [searchTerm, setSearchTerm] = useState("");

  const { data: members = [] } = useQuery({
    queryKey: ["community", "members", "directory", isAdmin],
    queryFn: async () => {
      try {
        if (isAdmin) {
          return await charityClient.members.list({ skip: 0, limit: 300 });
        }
        return await charityClient.members.community({ limit: 300 });
      } catch {
        return [];
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: membersSummary = null } = useQuery({
    queryKey: ["community", "members", "summary"],
    queryFn: async () => {
      try {
        return await charityClient.members.summary();
      } catch {
        return null;
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: collectionStats = null } = useQuery({
    queryKey: ["community", "collection-stats"],
    queryFn: async () => {
      try {
        return await charityClient.challans.communityStats();
      } catch {
        return null;
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: fundSummary = null } = useQuery({
    queryKey: ["community", "fund-summary"],
    queryFn: async () => {
      try {
        return await charityClient.fundUtilizations.summary();
      } catch {
        return null;
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: fundRecords = [] } = useQuery({
    queryKey: ["community", "fund-records"],
    queryFn: async () => {
      try {
        return await charityClient.fundUtilizations.list({ limit: 200 });
      } catch {
        return [];
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const totalMembers = Number(membersSummary?.total_members || members.length || 0);
  const activeMembers = Number(
    membersSummary?.active_members || members.filter((m) => m?.status === "active").length || 0
  );
  const allTimeCollection = Number(collectionStats?.all_time || fundSummary?.total_collected || 0);
  const totalUtilized = Number(fundSummary?.total_utilized || 0);
  const availableBalance = Number(fundSummary?.available_balance || 0);

  const utilizationPieData = useMemo(() => {
    const grouped = fundRecords.reduce((acc, record) => {
      const category = String(record?.category || "Other");
      acc[category] = (acc[category] || 0) + Number(record?.amount || 0);
      return acc;
    }, {});
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value: Number(value) }))
      .filter((e) => e.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [fundRecords]);

  const filteredMembers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      return (
        String(m?.full_name || "").toLowerCase().includes(q) ||
        String(m?.member_code || m?.member_id || "").toLowerCase().includes(q)
      );
    });
  }, [members, searchTerm]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Community</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          This is a private invited-members group.{" "}
          {totalMembers > 0 ? `${totalMembers} members` : "Members"}, collections, and fund usage — all in one place.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Total Members</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{totalMembers}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Active Members</p>
            <p className="text-2xl font-bold text-emerald-600">{activeMembers}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Total Collection</p>
            <p className="text-2xl font-bold text-blue-600">
              {"\u20B9"}{allTimeCollection.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Available Balance</p>
            <p className="text-2xl font-bold text-violet-600">
              {"\u20B9"}{availableBalance.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              Member Directory
              {members.length > 0 && (
                <span className="text-xs font-normal text-slate-400 ml-1">
                  ({members.length} members)
                </span>
              )}
            </CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or member ID…"
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">Loading member list…</div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-sm">
              No members match &ldquo;{searchTerm}&rdquo;
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[520px] overflow-y-auto pr-1">
              {filteredMembers.map((member, idx) => (
                <div
                  key={member.id || member.member_code || idx}
                  className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                      {member.full_name || "Member"}
                    </p>
                    {isAdmin && (
                      <p className="text-xs text-slate-400">
                        {member.member_code || member.member_id || "—"}
                      </p>
                    )}
                  </div>
                  <Badge
                    className={
                      member.status === "active"
                        ? "bg-emerald-100 text-emerald-700 border-0 shrink-0 ml-2"
                        : "bg-slate-100 text-slate-500 border-0 shrink-0 ml-2"
                    }
                  >
                    {member.status || "active"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-4 h-4 text-rose-500" />
              Where Funds Were Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            {utilizationPieData.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">No spending records yet.</p>
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={utilizationPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="48%"
                      outerRadius={88}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {utilizationPieData.map((entry, index) => (
                        <Cell
                          key={`${entry.name}-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => `\u20B9${Number(value || 0).toLocaleString()}`}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <p className="mt-2 text-xs text-slate-400">
              Total utilized: {"\u20B9"}{totalUtilized.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-500" />
              Collection Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Today", value: collectionStats?.today },
                { label: "This Week", value: collectionStats?.this_week },
                { label: "This Month", value: collectionStats?.this_month },
                { label: "This Year", value: collectionStats?.this_year },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-lg font-bold">
                    {"\u20B9"}{Number(value || 0).toLocaleString()}
                  </p>
                </div>
              ))}
              <div className="col-span-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-3">
                <p className="text-xs text-slate-500">All Time</p>
                <p className="text-xl font-bold text-emerald-600">
                  {"\u20B9"}{Number(collectionStats?.all_time || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

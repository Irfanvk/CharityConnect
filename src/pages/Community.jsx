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
  const [searchTerm, setSearchTerm] = useState("");

  const { data: members = [] } = useQuery({
    queryKey: ["community", "members", "directory"],
    queryFn: async () => {
      try {
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
    membersSummary?.active_members || members.filter((member) => member?.status === "active").length || 0
  );
  const allTimeCollection = Number(collectionStats?.all_time || fundSummary?.total_collected || 0);
  const totalUtilized = Number(fundSummary?.total_utilized || 0);
  const availableBalance = Number(fundSummary?.available_balance || 0);

  const utilizationPieData = useMemo(() => {
    const grouped = fundRecords.reduce((acc, record) => {
      const category = String(record?.category || "Other");
      const amount = Number(record?.amount || 0);
      acc[category] = (acc[category] || 0) + amount;
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value: Number(value || 0) }))
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [fundRecords]);

  const filteredMembers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) => {
      const name = String(member?.full_name || "").toLowerCase();
      const code = String(member?.member_code || member?.member_id || "").toLowerCase();
      return name.includes(query) || code.includes(query);
    });
  }, [members, searchTerm]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Community</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          Members, total collections, and spending transparency in one place.
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
            <p className="text-2xl font-bold text-blue-600">₹{allTimeCollection.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Available Balance</p>
            <p className="text-2xl font-bold text-violet-600">₹{availableBalance.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-4 h-4 text-rose-500" />
              Spent on What (Category Split)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {utilizationPieData.length === 0 ? (
              <p className="text-sm text-slate-500">No spending records available yet.</p>
            ) : (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={utilizationPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="48%"
                      outerRadius={92}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {utilizationPieData.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `₹${Number(value || 0).toLocaleString()}`} />
                    <Legend verticalAlign="bottom" height={40} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-2 text-xs text-slate-500">
              Total utilized so far: ₹{totalUtilized.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              Member Directory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by name or member ID"
                className="pl-9"
              />
            </div>

            {filteredMembers.length === 0 ? (
              <p className="text-sm text-slate-500">No members found.</p>
            ) : (
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {filteredMembers.map((member) => (
                  <div
                    key={member.id || member.member_id || member.email}
                    className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{member.full_name || "Member"}</p>
                      <p className="text-xs text-slate-500">{member.member_code || member.member_id || "—"}</p>
                    </div>
                    <Badge className={member.status === "active" ? "bg-emerald-100 text-emerald-700 border-0" : "bg-slate-100 text-slate-700 border-0"}>
                      {member.status || "active"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-500" />
            Collection Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
              <p className="text-xs text-slate-500">Today</p>
              <p className="text-lg font-bold">₹{Number(collectionStats?.today || 0).toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
              <p className="text-xs text-slate-500">This Week</p>
              <p className="text-lg font-bold">₹{Number(collectionStats?.this_week || 0).toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
              <p className="text-xs text-slate-500">This Month</p>
              <p className="text-lg font-bold">₹{Number(collectionStats?.this_month || 0).toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
              <p className="text-xs text-slate-500">This Year</p>
              <p className="text-lg font-bold">₹{Number(collectionStats?.this_year || 0).toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
              <p className="text-xs text-slate-500">All Time</p>
              <p className="text-lg font-bold text-emerald-600">₹{Number(collectionStats?.all_time || 0).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

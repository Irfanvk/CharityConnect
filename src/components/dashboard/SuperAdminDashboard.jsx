// @ts-nocheck
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { PAGE_PATHS } from "@/config/appPaths";
import { Heart, CheckCircle,
  Activity, BarChart3, Shield, ArrowRight,
  UserCheck, Target, FileText
} from "lucide-react";
import { currentBusinessMonth, formatBusinessDateTime } from "@/lib/businessTime";
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import {
  formatCampaignTargetText,
  getCampaignProgress,
} from "@/lib/campaigns";
import CollectionStats from "@/components/dashboard/CollectionStats";
import MembersByCountryCard from "@/components/dashboard/MembersByCountryCard";
import KeyNumbers from "@/components/dashboard/KeyNumbers";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function SuperAdminDashboard({ 
  members, 
  campaigns, 
  dashboardCharts,
  auditLogs = [], 
  collectionStats,
  memberSummary,
  challanSummary,
}) {
  const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const recentActivities = auditLogs.slice(0, 10);

  // Monthly fees by the month they are for: the last 12 months up to this one (advance
  // payments for future months are left out, so the line ends today).
  const thisMonth = currentBusinessMonth();
  const shortMonth = (m) => {
    const [y, mo] = String(m).split("-").map(Number);
    return new Date(y, mo - 1, 1).toLocaleString("en-IN", { month: "short", year: "2-digit" });
  };
  const monthlyDonations = (Array.isArray(dashboardCharts?.monthly_donations) ? dashboardCharts.monthly_donations : [])
    .filter((item) => item?.month && item.month <= thisMonth)
    .slice(-12)
    .map((item) => ({ month: shortMonth(item.month), amount: Number(item?.amount || 0) }));

  // Highlights show running campaigns only (the chart data lists every campaign ever made).
  const activeIds = new Set(activeCampaigns.map((c) => c.id));
  const campaignProgressRows = (Array.isArray(dashboardCharts?.campaign_progress) ? dashboardCharts.campaign_progress : [])
    .filter((row) => activeIds.has(row.campaign_id));

  // Member status from the server totals (the members list on this page is only a sample).
  const totalMembers = Number(memberSummary?.total_members ?? members.length);
  const activeMembers = Number(memberSummary?.active_members ?? members.filter(m => m.status === 'active').length);
  const memberStatusData = [
    { name: 'Active', value: activeMembers },
    { name: 'Not active', value: Math.max(totalMembers - activeMembers, 0) },
  ].filter(d => d.value > 0);

  // All-time top contributors (monthly fees and campaigns), from the server.
  const topContributors = (Array.isArray(dashboardCharts?.top_donors) ? dashboardCharts.top_donors : [])
    .slice(0, 5)
    .map((row) => ({
      name: row?.full_name || row?.name || row?.member_code || `Member #${row?.member_id || ''}`,
      code: row?.member_code || '',
      total: Number(row?.total_amount || 0),
    }));

  // Engagement, all from server totals.
  const approvedCount = Number(challanSummary?.approved_count || 0);
  const approvedTotal = Number(challanSummary?.total_collected || 0);
  const registered = Number(memberSummary?.registered_members || 0);
  const engagement = [
    { label: 'Approved payments', value: approvedCount.toLocaleString("en-IN"), tone: 'from-green-50 to-emerald-50' },
    { label: 'Total approved', value: inr(approvedTotal), tone: 'from-indigo-50 to-purple-50' },
    { label: 'Average payment', value: approvedCount ? inr(Math.round(approvedTotal / approvedCount)) : '—', tone: 'from-rose-50 to-pink-50' },
    { label: 'Members using the app', value: `${registered.toLocaleString("en-IN")} of ${totalMembers.toLocaleString("en-IN")}`, tone: 'from-blue-50 to-cyan-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Superadmin Badge */}
      <div className="flex items-center gap-2 mb-4">
        <Badge className="bg-purple-600 text-white px-3 py-1">
          <Shield className="w-3 h-3 mr-1" />
          Superadmin Dashboard
        </Badge>
        <span className="text-sm text-slate-500">Advanced analytics and system overview</span>
      </div>

      {/* Collection Overview Stats */}
      <CollectionStats collectionStats={collectionStats} />

      {/* KPI Cards: same server totals as the admin dashboard */}
      <KeyNumbers memberSummary={memberSummary} challanSummary={challanSummary} campaigns={campaigns} />

      <MembersByCountryCard />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donation Trends */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              Monthly fees by month
            </CardTitle>
            <p className="text-xs text-slate-500">Approved monthly fees, by the month they are for</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyDonations}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} width={56}
                  tickFormatter={(v) => (v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                <Tooltip
                  formatter={(v) => inr(v)}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  name="Approved (₹)"
                  dot={{ fill: '#10b981', r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Member Status Distribution */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCheck className="w-5 h-5 text-blue-600" />
              Active and not active members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={memberStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {memberStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Three Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Contributors */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="w-5 h-5 text-amber-600" />
              Top contributors (all time)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topContributors.length === 0 ? (
                <p className="text-center text-slate-500 py-4">No data yet</p>
              ) : (
                topContributors.map((contributor, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate text-sm">
                        {contributor.name}
                      </p>
                      <p className="text-xs text-slate-500">{contributor.code || 'Member'}</p>
                    </div>
                    <p className="shrink-0 font-bold text-emerald-600">{inr(contributor.total)}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Audit Logs */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-purple-600" />
              Recent Audit Logs
            </CardTitle>
            <Link to={PAGE_PATHS.AUDIT_LOGS}>
              <Button size="sm" variant="ghost">
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentActivities.length === 0 ? (
                <p className="text-center text-slate-500 py-4">No recent activity</p>
              ) : (
                recentActivities.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50">
                    <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900">
                        <span className="font-medium">{log.performed_by_name || log.performed_by}</span>
                        <span className="text-slate-600"> {String(log.action || '').replace(/_/g, ' ')}</span>
                      </p>
                      <p className="text-xs text-slate-500 truncate">{log.target_name}</p>
                      <p className="text-xs text-slate-400">
                        {formatBusinessDateTime(log.created_at, { month: "short", day: "2-digit", year: undefined, hour12: false })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Campaign Performance */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Heart className="w-5 h-5 text-rose-600" />
              Campaign Highlights
            </CardTitle>
            <Link to={PAGE_PATHS.CAMPAIGNS}>
              <Button size="sm" variant="ghost">
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(campaignProgressRows.length > 0 ? campaignProgressRows : activeCampaigns).length === 0 ? (
                <p className="text-center text-slate-500 py-4">No active campaigns</p>
              ) : (
                (campaignProgressRows.length > 0 ? campaignProgressRows : activeCampaigns).slice(0, 5).map((campaign) => {
                  const progress = campaignProgressRows.length > 0
                    ? campaign.progress_percent
                    : getCampaignProgress(campaign);
                  const collectedAmount = Number(campaign.collected_amount || 0);
                  return (
                    <div key={campaign.id || campaign.campaign_id} className="p-3 rounded-lg bg-gradient-to-r from-rose-50 to-pink-50">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-slate-900 text-sm">{campaign.title}</p>
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                          {progress == null ? 'Open' : `${Number(progress).toFixed(0)}%`}
                        </Badge>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" 
                          style={{ width: `${Math.min(progress ?? 100, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-2 text-xs text-slate-600">
                        <span>₹{collectedAmount.toLocaleString()}</span>
                        <span>of {campaignProgressRows.length > 0 ? (campaign.target_amount ? `₹${Number(campaign.target_amount).toLocaleString()}` : 'Open Goal') : formatCampaignTargetText(campaign)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Metrics */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            At a glance (all time)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {engagement.map((e) => (
              <div key={e.label} className={`min-w-0 p-4 rounded-lg bg-gradient-to-br ${e.tone}`}>
                <p className="truncate text-xl font-bold text-slate-900 sm:text-2xl">{e.value}</p>
                <p className="text-sm text-slate-600">{e.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
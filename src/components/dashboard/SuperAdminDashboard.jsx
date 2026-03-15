import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { PAGE_PATHS } from "@/config/appPaths";
import { Users, Heart, AlertCircle, CheckCircle,
  Activity, Clock, BarChart3, Shield, ArrowRight,
  UserCheck, DollarSign, Target, FileText
} from "lucide-react";
import { format, subDays, isAfter } from "date-fns";
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import {
  formatCampaignTargetText,
  getCampaignProgress,
  getCampaignTargetAmount,
  isUnlimitedTarget,
} from "@/lib/campaigns";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function SuperAdminDashboard({ 
  members, 
  challans, 
  campaigns, 
  auditLogs = [], 
  notifications = [],
  recurringDonations = []
}) {
  // Real-time metrics
  const activeMembers = members.filter(m => m.status === 'active').length;
  const totalMembers = members.length;
  const recentDonations = challans
    .filter(c => c.status === 'approved' && isAfter(new Date(c.created_date), subDays(new Date(), 7)))
    .reduce((sum, c) => sum + c.amount, 0);
  
  const pendingApprovals = challans.filter(c => 
    c.status === 'pending' || c.status === 'proof_uploaded'
  ).length;

  // Campaign metrics
  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const targetedActiveCampaigns = activeCampaigns.filter((c) => !isUnlimitedTarget(c));
  const totalCampaignTarget = targetedActiveCampaigns.reduce((sum, c) => sum + getCampaignTargetAmount(c), 0);
  const totalCampaignRaised = activeCampaigns.reduce((sum, c) => sum + (c.collected_amount || 0), 0);
  const campaignProgress = totalCampaignTarget > 0 ? (totalCampaignRaised / totalCampaignTarget * 100) : 0;

  // Member engagement
  const activeRecurring = recurringDonations.filter(rd => rd.status === 'active').length;
  const recentActivities = auditLogs.slice(0, 10);
  
  // Donation trends (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayChallans = challans.filter(c => 
      c.status === 'approved' && 
      format(new Date(c.created_date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
    return {
      date: format(date, 'MMM dd'),
      amount: dayChallans.reduce((sum, c) => sum + c.amount, 0),
      count: dayChallans.length
    };
  });

  // Member status distribution
  const memberStatusData = [
    { name: 'Active', value: members.filter(m => m.status === 'active').length },
    { name: 'Inactive', value: members.filter(m => m.status === 'inactive').length },
    { name: 'Suspended', value: members.filter(m => m.status === 'suspended').length },
  ].filter(d => d.value > 0);

  // Top contributors (last 30 days)
  const recentChallans = challans.filter(c => 
    c.status === 'approved' && 
    isAfter(new Date(c.created_date), subDays(new Date(), 30))
  );
  const contributorMap = {};
  recentChallans.forEach(c => {
    const key = c.member_email || c.created_by;
    if (!contributorMap[key]) {
      contributorMap[key] = { email: key, total: 0, count: 0 };
    }
    contributorMap[key].total += c.amount;
    contributorMap[key].count += 1;
  });
  const topContributors = Object.values(contributorMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 opacity-80" />
              <Badge className="bg-white/20 text-white">{((activeMembers/totalMembers)*100).toFixed(0)}%</Badge>
            </div>
            <p className="text-3xl font-bold mb-1">{activeMembers}</p>
            <p className="text-emerald-100 text-sm">Active Members</p>
            <p className="text-xs text-emerald-200 mt-1">of {totalMembers} total</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 opacity-80" />
              <Activity className="w-5 h-5 opacity-60" />
            </div>
            <p className="text-3xl font-bold mb-1">₹{recentDonations.toLocaleString()}</p>
            <p className="text-blue-100 text-sm">Last 7 Days</p>
            <p className="text-xs text-blue-200 mt-1">Recent donations</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 opacity-80" />
              {pendingApprovals > 0 && <AlertCircle className="w-5 h-5 animate-pulse" />}
            </div>
            <p className="text-3xl font-bold mb-1">{pendingApprovals}</p>
            <p className="text-amber-100 text-sm">Pending Approvals</p>
            <Link to={PAGE_PATHS.CHALLANS}>
              <p className="text-xs text-amber-200 mt-1 hover:underline flex items-center gap-1">
                Review now <ArrowRight className="w-3 h-3" />
              </p>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-rose-500 to-pink-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Heart className="w-8 h-8 opacity-80" />
              <Badge className="bg-white/20 text-white">{targetedActiveCampaigns.length > 0 ? `${campaignProgress.toFixed(0)}%` : 'Open'}</Badge>
            </div>
            <p className="text-3xl font-bold mb-1">{activeCampaigns.length}</p>
            <p className="text-rose-100 text-sm">Active Campaigns</p>
            <p className="text-xs text-rose-200 mt-1">₹{totalCampaignRaised.toLocaleString()} raised</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donation Trends */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              Donation Trends (7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip 
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
                  name="Amount (₹)"
                  dot={{ fill: '#10b981', r: 5 }}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Count"
                  dot={{ fill: '#3b82f6', r: 4 }}
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
              Member Status Distribution
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
              Top Contributors (30d)
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
                        {contributor.email}
                      </p>
                      <p className="text-xs text-slate-500">{contributor.count} donations</p>
                    </div>
                    <p className="font-bold text-emerald-600">₹{contributor.total.toLocaleString()}</p>
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
                        <span className="text-slate-600"> {log.action_type.replace(/_/g, ' ')}</span>
                      </p>
                      <p className="text-xs text-slate-500 truncate">{log.target_name}</p>
                      <p className="text-xs text-slate-400">
                        {format(new Date(log.created_date), 'MMM dd, HH:mm')}
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
              {activeCampaigns.length === 0 ? (
                <p className="text-center text-slate-500 py-4">No active campaigns</p>
              ) : (
                activeCampaigns.slice(0, 5).map((campaign) => {
                  const progress = getCampaignProgress(campaign);
                  return (
                    <div key={campaign.id} className="p-3 rounded-lg bg-gradient-to-r from-rose-50 to-pink-50">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-slate-900 text-sm">{campaign.title}</p>
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                          {progress === null ? 'Open' : `${progress.toFixed(0)}%`}
                        </Badge>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" 
                          style={{ width: `${Math.min(progress ?? 100, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-2 text-xs text-slate-600">
                        <span>₹{(campaign.collected_amount || 0).toLocaleString()}</span>
                        <span>of {formatCampaignTargetText(campaign)}</span>
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
            Member Engagement Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50">
              <p className="text-2xl font-bold text-slate-900">{activeRecurring}</p>
              <p className="text-sm text-slate-600">Active Recurring Donations</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50">
              <p className="text-2xl font-bold text-slate-900">
                {challans.filter(c => c.status === 'approved').length}
              </p>
              <p className="text-sm text-slate-600">Total Approved Challans</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50">
              <p className="text-2xl font-bold text-slate-900">
                {new Set(challans.filter(c => c.status === 'approved').map(c => c.member_email || c.created_by)).size}
              </p>
              <p className="text-sm text-slate-600">Unique Donors</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-rose-50 to-pink-50">
              <p className="text-2xl font-bold text-slate-900">
                ₹{(challans.filter(c => c.status === 'approved').reduce((sum, c) => sum + c.amount, 0) / 
                  challans.filter(c => c.status === 'approved').length || 1).toFixed(0)}
              </p>
              <p className="text-sm text-slate-600">Avg Donation Amount</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
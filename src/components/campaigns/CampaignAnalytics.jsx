import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { 
  TrendingUp, Users, DollarSign, Target, 
  Award, Calendar, Activity 
} from "lucide-react";
import CampaignReports from "./CampaignReports";
import {
  formatCampaignTargetText,
  getCampaignProgress,
  getCampaignTargetAmount,
  isUnlimitedTarget,
} from "@/lib/campaigns";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function CampaignAnalytics({ campaigns, challans, showReports = false }) {
  // Calculate analytics
  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const completedCampaigns = campaigns.filter(c => c.status === 'completed');
  
  const totalRaised = campaigns.reduce((sum, c) => sum + (c.collected_amount || 0), 0);
  const totalParticipants = campaigns.reduce((sum, c) => sum + (c.participants_count || 0), 0);
  const avgDonation = totalParticipants > 0 ? totalRaised / totalParticipants : 0;
  const targetedActiveCampaigns = activeCampaigns.filter((c) => !isUnlimitedTarget(c));
  const totalTarget = targetedActiveCampaigns.reduce((sum, c) => sum + getCampaignTargetAmount(c), 0);
  const overallProgress = totalTarget > 0 ? (totalRaised / totalTarget) * 100 : 0;

  // Campaign performance data
  const campaignPerformance = campaigns.map(c => ({
    name: c.title.length > 20 ? c.title.substring(0, 20) + '...' : c.title,
    collected: c.collected_amount || 0,
    target: getCampaignTargetAmount(c),
    progress: getCampaignProgress(c) ?? 0,
    participants: c.participants_count || 0
  })).slice(0, 5);

  // Status distribution
  const statusData = [
    { name: 'Active', value: campaigns.filter(c => c.status === 'active').length },
    { name: 'Completed', value: campaigns.filter(c => c.status === 'completed').length },
    { name: 'Cancelled', value: campaigns.filter(c => c.status === 'cancelled').length },
  ].filter(d => d.value > 0);

  // Top performing campaigns
  const topCampaigns = [...campaigns]
    .sort((a, b) => (b.collected_amount || 0) - (a.collected_amount || 0))
    .slice(0, 5);

  // Monthly donation trends (if challans provided)
  const monthlyTrends = challans 
    ? Object.values(
        challans
          .filter(ch => ch.type === 'donation' && ch.status === 'approved')
          .reduce((acc, ch) => {
            const month = new Date(ch.created_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            if (!acc[month]) acc[month] = { month, amount: 0, count: 0 };
            acc[month].amount += ch.amount;
            acc[month].count += 1;
            return acc;
          }, {})
      ).slice(-6)
    : [];

  const [view, setView] = useState("analytics");

  if (showReports && view === "reports") {
    return <CampaignReports campaigns={campaigns} challans={challans} />;
  }

  return (
    <div className="space-y-6">
      {showReports && (
        <Tabs value={view} onValueChange={setView}>
          <TabsList>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports">Performance Reports</TabsTrigger>
          </TabsList>
        </Tabs>
      )}
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500">Total Raised</p>
                <p className="text-xl font-bold text-slate-900">₹{totalRaised.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-600">
              <TrendingUp className="w-3 h-3" />
              <span>{completedCampaigns.length} campaigns completed</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500">Total Participants</p>
                <p className="text-xl font-bold text-slate-900">{totalParticipants}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <Activity className="w-3 h-3" />
              <span>Across {campaigns.length} campaigns</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Award className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500">Avg Donation</p>
                <p className="text-xl font-bold text-slate-900">₹{avgDonation.toFixed(0)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-amber-600">
              <Target className="w-3 h-3" />
              <span>Per participant</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-rose-50 to-pink-50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-rose-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500">Goal Progress</p>
                <p className="text-xl font-bold text-slate-900">{overallProgress.toFixed(1)}%</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-rose-600">
              <Calendar className="w-3 h-3" />
              <span>{targetedActiveCampaigns.length} targeted active campaigns</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campaign Performance Bar Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Campaign Performance</CardTitle>
            <p className="text-sm text-slate-500">Top 5 campaigns by amount raised</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={campaignPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => `₹${value.toLocaleString()}`}
                />
                <Legend />
                <Bar dataKey="collected" fill="#10b981" name="Collected" radius={[8, 8, 0, 0]} />
                <Bar dataKey="target" fill="#e2e8f0" name="Target" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution Pie Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Campaign Status Distribution</CardTitle>
            <p className="text-sm text-slate-500">Breakdown by campaign status</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends */}
      {monthlyTrends.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Monthly Donation Trends</CardTitle>
            <p className="text-sm text-slate-500">Last 6 months donation activity</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
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
                  strokeWidth={2}
                  name="Amount (₹)"
                  dot={{ fill: '#10b981', r: 4 }}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Donations"
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Performing Campaigns */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Top Performing Campaigns</CardTitle>
          <p className="text-sm text-slate-500">Ranked by total amount raised</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topCampaigns.map((campaign, index) => {
              const progress = getCampaignProgress(campaign);
              
              return (
                <div key={campaign.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-slate-900 truncate">{campaign.title}</p>
                      <Badge className={statusConfig[campaign.status]?.color || ''}>
                        {campaign.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        ₹{(campaign.collected_amount || 0).toLocaleString()} / {formatCampaignTargetText(campaign)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {campaign.participants_count || 0} donors
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {progress === null ? 'Open goal' : `${progress.toFixed(1)}% achieved`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const statusConfig = {
  active: { color: "bg-emerald-100 text-emerald-700" },
  completed: { color: "bg-blue-100 text-blue-700" },
  cancelled: { color: "bg-slate-100 text-slate-700" },
};
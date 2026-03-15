import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, FileText, Calendar, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import {
  formatCampaignTargetText,
  getCampaignAbsoluteEndLabel,
  getCampaignProgress,
} from "@/lib/campaigns";

export default function CampaignReports({ campaigns, challans }) {
  const [selectedCampaign, setSelectedCampaign] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Filter challans
  const filteredChallans = challans.filter(ch => {
    if (ch.type !== 'donation') return false;
    if (selectedCampaign !== "all" && ch.campaign_id !== selectedCampaign) return false;
    if (dateFrom && new Date(ch.created_date) < new Date(dateFrom)) return false;
    if (dateTo && new Date(ch.created_date) > new Date(dateTo)) return false;
    return true;
  });

  // Filter campaigns
  const filteredCampaigns = campaigns.filter(c => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    return true;
  });

  // Calculate metrics for selected campaign
  const getCampaignMetrics = () => {
    if (selectedCampaign === "all") {
      return filteredCampaigns.map(c => {
        const campaignDonations = filteredChallans.filter(ch => ch.campaign_id === c.id && ch.status === 'approved');
        return {
          campaign: c,
          totalRaised: campaignDonations.reduce((sum, ch) => sum + ch.amount, 0),
          donorCount: new Set(campaignDonations.map(ch => ch.member_email || ch.member_id)).size,
          avgDonation: campaignDonations.length > 0 ? campaignDonations.reduce((sum, ch) => sum + ch.amount, 0) / campaignDonations.length : 0,
          donationCount: campaignDonations.length,
          progress: getCampaignProgress(c)
        };
      });
    } else {
      const campaign = campaigns.find(c => c.id === selectedCampaign);
      const campaignDonations = filteredChallans.filter(ch => ch.campaign_id === selectedCampaign && ch.status === 'approved');
      return [{
        campaign,
        totalRaised: campaignDonations.reduce((sum, ch) => sum + ch.amount, 0),
        donorCount: new Set(campaignDonations.map(ch => ch.member_email || ch.member_id)).size,
        avgDonation: campaignDonations.length > 0 ? campaignDonations.reduce((sum, ch) => sum + ch.amount, 0) / campaignDonations.length : 0,
        donationCount: campaignDonations.length,
        progress: getCampaignProgress(campaign)
      }];
    }
  };

  const metrics = getCampaignMetrics();

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Campaign', 'Target Amount', 'Total Raised', 'Progress %', 
      'Unique Donors', 'Total Donations', 'Average Donation', 
      'Status', 'Start Date', 'End Date'
    ];
    
    const rows = metrics.map(m => [
      m.campaign?.title || 'N/A',
      formatCampaignTargetText(m.campaign),
      m.totalRaised,
      m.progress === null ? 'Open goal' : Number(m.progress).toFixed(1),
      m.donorCount,
      m.donationCount,
      m.avgDonation.toFixed(2),
      m.campaign?.status || 'N/A',
      m.campaign?.start_date ? format(new Date(m.campaign.start_date), 'yyyy-MM-dd') : '',
      getCampaignAbsoluteEndLabel(m.campaign)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-report-${selectedCampaign === 'all' ? 'all' : 'single'}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const totalRaised = metrics.reduce((sum, m) => sum + m.totalRaised, 0);
  const totalDonors = new Set(metrics.flatMap(m => 
    filteredChallans
      .filter(ch => ch.campaign_id === m.campaign?.id && ch.status === 'approved')
      .map(ch => ch.member_email || ch.member_id)
  )).size;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Campaign Performance Reports
          </CardTitle>
          <p className="text-sm text-slate-500">Generate detailed reports with custom filters</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <Label>Campaign</Label>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {campaigns.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <Button 
            onClick={exportToCSV}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export to CSV
          </Button>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Raised</p>
                <p className="text-2xl font-bold text-slate-900">₹{totalRaised.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Campaigns</p>
                <p className="text-2xl font-bold text-slate-900">{metrics.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Unique Donors</p>
                <p className="text-2xl font-bold text-slate-900">{totalDonors}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Campaign Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Campaign</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Raised</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Donors</TableHead>
                  <TableHead>Donations</TableHead>
                  <TableHead>Avg Donation</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      No data available for selected filters
                    </TableCell>
                  </TableRow>
                ) : (
                  metrics.map((m, idx) => (
                    <TableRow key={idx} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium">{m.campaign?.title || 'N/A'}</TableCell>
                      <TableCell>₹{(m.campaign?.target_amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="font-semibold text-emerald-600">₹{m.totalRaised.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full" 
                              style={{ width: `${Math.min(m.progress, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{m.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{m.donorCount}</TableCell>
                      <TableCell>{m.donationCount}</TableCell>
                      <TableCell>₹{m.avgDonation.toFixed(0)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${
                          m.campaign?.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                          m.campaign?.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {m.campaign?.status || 'N/A'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
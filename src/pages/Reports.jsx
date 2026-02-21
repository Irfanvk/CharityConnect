import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  FileText, Download, TrendingUp, DollarSign, 
  Receipt, CheckCircle, XCircle, Clock 
} from "lucide-react";
import { format } from "date-fns";

export default function Reports() {
  const [user, setUser] = useState(null);
  const [reportType, setReportType] = useState("monthly");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selectedYear, setSelectedYear] = useState(format(new Date(), "yyyy"));

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: challans = [] } = useQuery({
    queryKey: ['challans'],
    queryFn: () => base44.entities.Challan.list('-created_date'),
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => base44.entities.Campaign.list('-created_date'),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list(),
  });

  // Filter data based on report type
  const getFilteredChallans = () => {
    return challans.filter(c => {
      const challanDate = new Date(c.created_date);
      if (reportType === "monthly") {
        return format(challanDate, "yyyy-MM") === selectedMonth;
      } else {
        return format(challanDate, "yyyy") === selectedYear;
      }
    });
  };

  const filteredChallans = getFilteredChallans();

  // Calculate metrics
  const totalCollections = filteredChallans
    .filter(c => c.status === 'approved')
    .reduce((sum, c) => sum + c.amount, 0);

  const monthlyCollections = filteredChallans
    .filter(c => c.type === 'monthly' && c.status === 'approved')
    .reduce((sum, c) => sum + c.amount, 0);

  const campaignCollections = filteredChallans
    .filter(c => c.type === 'donation' && c.status === 'approved')
    .reduce((sum, c) => sum + c.amount, 0);

  const approvedChallans = filteredChallans.filter(c => c.status === 'approved').length;
  const pendingChallans = filteredChallans.filter(c => c.status === 'pending' || c.status === 'proof_uploaded').length;
  const rejectedChallans = filteredChallans.filter(c => c.status === 'rejected').length;
  const generatedChallans = filteredChallans.filter(c => c.status === 'generated').length;

  // Export to CSV
  const exportToCSV = async () => {
    const headers = [
      'Challan Number', 'Member Name', 'Type', 'Amount', 
      'Month', 'Campaign', 'Status', 'Created Date', 'Approved Date'
    ];
    
    const rows = filteredChallans.map(c => [
      c.challan_number,
      c.member_name,
      c.type,
      c.amount,
      c.month || '',
      c.campaign_name || '',
      c.status,
      format(new Date(c.created_date), 'yyyy-MM-dd'),
      c.approved_at ? format(new Date(c.approved_at), 'yyyy-MM-dd') : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${reportType}-${reportType === 'monthly' ? selectedMonth : selectedYear}.csv`;
    a.click();

    // Log audit
    await base44.entities.AuditLog.create({
      action_type: "report_generated",
      performed_by: user?.email,
      performed_by_name: user?.full_name,
      target_type: "Report",
      target_name: `${reportType === 'monthly' ? format(new Date(selectedMonth + '-01'), 'MMMM yyyy') : selectedYear} Financial Report`,
      details: { 
        report_type: reportType,
        period: reportType === 'monthly' ? selectedMonth : selectedYear,
        total_collections: totalCollections,
        total_challans: filteredChallans.length
      }
    });
  };

  // Generate months for dropdown
  const getMonthOptions = () => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      months.push(format(date, "yyyy-MM"));
    }
    return months;
  };

  // Generate years for dropdown
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => String(currentYear - i));
  };

  if (user?.role !== 'admin') {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Access denied. Admin privileges required.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financial Reports</h1>
          <p className="text-slate-500">Generate and export financial reports</p>
        </div>
        <Button 
          onClick={exportToCSV}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Download className="w-4 h-4 mr-2" />
          Export to CSV
        </Button>
      </div>

      {/* Report Type & Period Selection */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Tabs value={reportType} onValueChange={setReportType}>
          <TabsList>
            <TabsTrigger value="monthly">Monthly Report</TabsTrigger>
            <TabsTrigger value="yearly">Yearly Report</TabsTrigger>
          </TabsList>
        </Tabs>

        {reportType === "monthly" ? (
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getMonthOptions().map(month => (
                <SelectItem key={month} value={month}>
                  {format(new Date(month + '-01'), 'MMMM yyyy')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getYearOptions().map(year => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Collections</p>
                <p className="text-xl font-bold text-slate-900">₹{totalCollections.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-600">
              <TrendingUp className="w-3 h-3" />
              <span>{approvedChallans} approved</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Monthly Payments</p>
                <p className="text-xl font-bold text-slate-900">₹{monthlyCollections.toLocaleString()}</p>
              </div>
            </div>
            <div className="text-xs text-blue-600">
              Membership fees
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-rose-50 to-pink-50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Campaign Donations</p>
                <p className="text-xl font-bold text-slate-900">₹{campaignCollections.toLocaleString()}</p>
              </div>
            </div>
            <div className="text-xs text-rose-600">
              From campaigns
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Challans</p>
                <p className="text-xl font-bold text-slate-900">{filteredChallans.length}</p>
              </div>
            </div>
            <div className="text-xs text-amber-600">
              All statuses
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Challan Status Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Approved</span>
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{approvedChallans}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Pending Review</span>
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{pendingChallans}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Rejected</span>
              <XCircle className="w-5 h-5 text-rose-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{rejectedChallans}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Generated</span>
              <Receipt className="w-5 h-5 text-slate-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{generatedChallans}</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Campaign Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {campaigns.map(campaign => {
              const campaignChallans = filteredChallans.filter(
                c => c.campaign_id === campaign.id && c.status === 'approved'
              );
              const campaignTotal = campaignChallans.reduce((sum, c) => sum + c.amount, 0);
              
              if (campaignTotal === 0) return null;
              
              return (
                <div key={campaign.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                  <div>
                    <p className="font-medium text-slate-900">{campaign.title}</p>
                    <p className="text-xs text-slate-500">{campaignChallans.length} donations</p>
                  </div>
                  <p className="text-lg font-semibold text-emerald-600">
                    ₹{campaignTotal.toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
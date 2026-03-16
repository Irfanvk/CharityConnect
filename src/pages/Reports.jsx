import React, { useMemo, useState } from "react";
import { charityClient } from "@/api/charityClient";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, FileText } from "lucide-react";
import ReportFilters from "@/components/reports/ReportFilters";
import MemberActivityReport, { exportMemberCSV } from "@/components/reports/MemberActivityReport";
import DonationSummaryReport, { exportDonationCSV } from "@/components/reports/DonationSummaryReport";
import ChallanStatusReport, { exportChallanCSV } from "@/components/reports/ChallanStatusReport";

const MEMBERS_REPORT_BATCH_SIZE = 200;
const CHALLANS_REPORT_BATCH_SIZE = 200;
const CAMPAIGNS_REPORT_BATCH_SIZE = 200;

function downloadCSV({ headers, rows, filename }) {
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filename}.csv`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState("members");
  const [memberPeriod, setMemberPeriod] = useState("monthly");
  const [memberValue, setMemberValue] = useState(format(new Date(), "yyyy-MM"));
  const [donationPeriod, setDonationPeriod] = useState("monthly");
  const [donationValue, setDonationValue] = useState(format(new Date(), "yyyy-MM"));
  const [challanPeriod, setChallanPeriod] = useState("monthly");
  const [challanValue, setChallanValue] = useState(format(new Date(), "yyyy-MM"));

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => charityClient.auth.me(),
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      let allMembers = [];
      let skip = 0;

      while (true) {
        const chunk = await charityClient.members.list({
          skip,
          limit: MEMBERS_REPORT_BATCH_SIZE,
        });

        allMembers = allMembers.concat(chunk);

        if (chunk.length < MEMBERS_REPORT_BATCH_SIZE) {
          break;
        }

        skip += MEMBERS_REPORT_BATCH_SIZE;
      }

      return allMembers;
    },
  });

  const { data: memberSummary } = useQuery({
    queryKey: ["members", "summary", "reports"],
    queryFn: () => charityClient.members.summary(),
  });

  const { data: challans = [] } = useQuery({
    queryKey: ["challans"],
    queryFn: async () => {
      let allChallans = [];
      let skip = 0;

      while (true) {
        const chunk = await charityClient.challans.list({
          order: "-created_date",
          skip,
          limit: CHALLANS_REPORT_BATCH_SIZE,
        });

        allChallans = allChallans.concat(chunk);

        if (chunk.length < CHALLANS_REPORT_BATCH_SIZE) {
          break;
        }

        skip += CHALLANS_REPORT_BATCH_SIZE;
      }

      return allChallans;
    },
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      let allCampaigns = [];
      let skip = 0;

      while (true) {
        const chunk = await charityClient.campaigns.list({
          order: "-created_date",
          skip,
          limit: CAMPAIGNS_REPORT_BATCH_SIZE,
        });

        allCampaigns = allCampaigns.concat(chunk);

        if (chunk.length < CAMPAIGNS_REPORT_BATCH_SIZE) {
          break;
        }

        skip += CAMPAIGNS_REPORT_BATCH_SIZE;
      }

      return allCampaigns;
    },
  });

  const isAdmin = useMemo(
    () => user?.role === "admin" || user?.role === "superadmin",
    [user]
  );

  const exportCurrentReport = async () => {
    let csvData;
    let reportName;

    if (activeTab === "members") {
      csvData = exportMemberCSV(members, memberPeriod, memberValue);
      reportName = "Member Activity";
    } else if (activeTab === "donations") {
      csvData = exportDonationCSV(challans, campaigns, donationPeriod, donationValue);
      reportName = "Donation Summary";
    } else {
      csvData = exportChallanCSV(challans, challanPeriod, challanValue, members);
      reportName = "Challan Status";
    }

    downloadCSV(csvData);

    try {
      await charityClient.auditLogs.create({
        action_type: "report_generated",
        performed_by: user?.email,
        performed_by_name: user?.full_name,
        target_type: "Report",
        target_name: reportName,
        details: {
          tab: activeTab,
          rows_exported: csvData.rows.length,
          filename: csvData.filename,
        },
      });
    } catch {
      // Non-blocking: exporting should not fail due to audit logging.
    }
  };

  if (!isAdmin) {
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
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Reports</h1>
          <p className="text-slate-500">Member activity, donation summaries, and challan status reports</p>
        </div>
        <Button onClick={exportCurrentReport} className="bg-emerald-600 hover:bg-emerald-700">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="donations">Donations</TabsTrigger>
          <TabsTrigger value="challans">Challans</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <ReportFilters
            period={memberPeriod}
            onPeriodChange={setMemberPeriod}
            value={memberValue}
            onValueChange={setMemberValue}
          />
          <MemberActivityReport
            members={members}
            period={memberPeriod}
            value={memberValue}
            totals={memberSummary}
          />
        </TabsContent>

        <TabsContent value="donations" className="space-y-4">
          <ReportFilters
            period={donationPeriod}
            onPeriodChange={setDonationPeriod}
            value={donationValue}
            onValueChange={setDonationValue}
          />
          <DonationSummaryReport
            challans={challans}
            campaigns={campaigns}
            period={donationPeriod}
            value={donationValue}
          />
        </TabsContent>

        <TabsContent value="challans" className="space-y-4">
          <ReportFilters
            period={challanPeriod}
            onPeriodChange={setChallanPeriod}
            value={challanValue}
            onValueChange={setChallanValue}
          />
          <ChallanStatusReport challans={challans} members={members} period={challanPeriod} value={challanValue} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { format, addMonths, startOfMonth, formatDistanceToNow } from "date-fns";
import {
  TrendingUp,
  Clock,
  Receipt,
  Heart,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  BadgeCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import StatsCard from "./StatsCard";
import CollectionStats from "@/components/dashboard/CollectionStats";
import { PAGE_PATHS } from "@/config/appPaths";
import { getMemberSetup } from "@/lib/memberSetup";

// ✅ No changes needed in this file — it is a pure display component.
// It receives all data as props and makes zero API calls itself.
// The infinite loop was NOT caused by this component.

const statusConfig = {
  generated: { label: "Generated", color: "bg-slate-100 text-slate-700", icon: Receipt },
  proof_uploaded: { label: "Proof Uploaded", color: "bg-blue-100 text-blue-700", icon: AlertCircle },
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700", icon: Clock },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-rose-100 text-rose-700", icon: XCircle },
};

const getStatusForCard = (challan) => {
  if (challan.status === "pending" && challan.proof_uploaded_at) {
    return statusConfig.proof_uploaded;
  }
  return statusConfig[challan.status] || statusConfig.generated;
};

export default function MemberDashboard({ user, memberProfile, challans, campaigns, memberSetupData, onOpenSetup, showCollectionStats = false, collectionStats }) {
  const navigate = useNavigate();
  const memberIdentifiers = new Set(
    [memberProfile?.id, memberProfile?.member_id].filter(Boolean)
  );

  const myChallans = challans.filter((challan) =>
    memberProfile
      ? memberIdentifiers.has(challan.member_id)
      : challan.created_by === user?.email
  );

  const approved = myChallans.filter((challan) => challan.status === "approved");
  const pending = myChallans.filter(
    (challan) =>
      challan.status === "generated" ||
      challan.status === "pending" ||
      challan.status === "proof_uploaded"
  );
  const rejected = myChallans.filter((challan) => challan.status === "rejected");

  const totalContributed = approved.reduce(
    (sum, challan) => sum + (challan.amount || 0),
    0
  );
  const monthlyAmount = memberProfile?.monthly_amount || 0;

  const pendingMonthlyChallans = myChallans
    .filter((c) => c.type === 'monthly' && c.status === 'pending')
    .sort((a, b) => (a.month || '').localeCompare(b.month || ''));
  const totalOutstanding = pendingMonthlyChallans.reduce((sum, c) => sum + (c.amount || 0), 0);

  const upcomingMonths = [];
  const paidMonths = new Set(
    myChallans
      .filter((challan) => challan.status === "approved" && challan.type === "monthly")
      .flatMap((challan) =>
        challan.months_covered?.length ? challan.months_covered : [challan.month]
      )
      .filter(Boolean)
  );

  for (let i = 0; i < 3; i += 1) {
    const month = format(addMonths(startOfMonth(new Date()), i), "yyyy-MM");
    if (!paidMonths.has(month)) upcomingMonths.push(month);
  }

  const donatedCampaignIds = new Set(
    myChallans
      .filter((challan) => challan.type === "donation" && challan.campaign_id)
      .map((challan) => challan.campaign_id)
  );

  const myCampaigns = campaigns.filter(
    (campaign) => donatedCampaignIds.has(campaign.id) || campaign.status === "active"
  );

  const recentChallans = [...myChallans]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 5);

  const displayPhone = memberProfile?.phone || user?.phone || memberSetupData?.phone;
  const displayEmail = memberProfile?.email || user?.email || memberSetupData?.email;
  const displayCity = memberProfile?.city || memberSetupData?.city;
  const displayAddress = memberProfile?.address || memberSetupData?.address;

  const setupData = getMemberSetup(user?.id);
  const setupCompletedAt = setupData?.completedAt;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        {setupCompletedAt && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>
              Setup completed {formatDistanceToNow(new Date(setupCompletedAt), { addSuffix: true })}
            </span>
          </div>
        )}
        <Button variant="outline" size="sm" onClick={onOpenSetup} className="ml-auto">
          Open Setup Wizard
        </Button>
      </div>

      {memberProfile && (
        <Card className="border-0 shadow-sm bg-white dark:bg-slate-900">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                {memberProfile.full_name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                    {memberProfile.full_name}
                  </h2>
                  <Badge
                    className={`text-xs ${
                      memberProfile.status === "active"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {memberProfile.status}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                  {memberProfile.member_id}
                </p>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-400">
                  {displayPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5" />
                      {displayPhone}
                    </div>
                  )}
                  {displayEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5" />
                      {displayEmail}
                    </div>
                  )}
                  {displayCity && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5" />
                      {displayCity}
                    </div>
                  )}
                  {memberProfile.join_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      Joined {format(new Date(memberProfile.join_date), "MMM yyyy")}
                    </div>
                  )}
                  {displayAddress && (
                    <div className="sm:col-span-2 text-xs text-slate-500">
                      Address: {displayAddress}
                    </div>
                  )}
                </div>
              </div>
              {monthlyAmount > 0 && (
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-slate-500">Monthly Due</p>
                  <p className="text-lg font-bold text-emerald-600">₹{monthlyAmount}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Contributed"
          value={`₹${totalContributed.toLocaleString()}`}
          subtitle="Approved payments"
          icon={TrendingUp}
          color="emerald"
        />
        <StatsCard
          title="Approved"
          value={approved.length}
          subtitle="Challans approved"
          icon={CheckCircle2}
          color="blue"
        />
        <StatsCard
          title="Pending"
          value={pending.length}
          subtitle="Awaiting approval"
          icon={Clock}
          color="amber"
        />
        <StatsCard
          title="Rejected"
          value={rejected.length}
          subtitle="Need attention"
          icon={XCircle}
          color="rose"
        />
      </div>

      {showCollectionStats && (
        <CollectionStats collectionStats={collectionStats} compact />
      )}

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-500" />
              Upcoming Dues
            </CardTitle>
            {pendingMonthlyChallans.length > 0 && (
              <Badge className="bg-amber-100 text-amber-700 border-0">
                Outstanding: ₹{totalOutstanding.toLocaleString()} across {pendingMonthlyChallans.length} month{pendingMonthlyChallans.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pendingMonthlyChallans.length === 0 ? (
            <div className="flex items-center gap-2 text-emerald-600 text-sm py-3">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">All payments up to date</span>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingMonthlyChallans.map((challan) => (
                <div
                  key={challan.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {challan.month ? format(new Date(`${challan.month}-01`), 'MMMM yyyy') : '—'}
                      </p>
                      <p className="text-xs text-slate-500">{challan.challan_number || `#${challan.id}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-amber-700">₹{(challan.amount || 0).toLocaleString()}</span>
                    <Badge className="text-xs bg-amber-100 text-amber-700 border-0">Pending</Badge>
                    <button
                      onClick={() => navigate(`${PAGE_PATHS.CHALLANS}?challan=${challan.id}`)}
                      className="text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Pay Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Challans</CardTitle>
              <Link to={PAGE_PATHS.CHALLANS}>
                <Button variant="ghost" size="sm" className="text-emerald-600 text-xs">
                  View All
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentChallans.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No challans yet</p>
            ) : (
              recentChallans.map((challan) => {
                const status = getStatusForCard(challan);
                const Icon = status.icon;
                return (
                  <div
                    key={challan.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-slate-500" />
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-white">
                          {challan.type === "monthly"
                            ? `Monthly - ${challan.month || "-"}`
                            : `Donation - ${challan.campaign_name || "Campaign"}`}
                        </p>
                        <p className="text-xs text-slate-500">{challan.challan_number}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">
                        ₹{challan.amount?.toLocaleString()}
                      </p>
                      <Badge className={`text-xs ${status.color} border-0`}>
                        {status.label}
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {monthlyAmount > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Upcoming Months</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {upcomingMonths.length === 0 ? (
                  <div className="flex items-center gap-2 text-emerald-600 text-sm py-2">
                    <BadgeCheck className="w-4 h-4" /> All upcoming months are paid!
                  </div>
                ) : (
                  upcomingMonths.map((month) => (
                    <div
                      key={month}
                      className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {format(new Date(`${month}-01`), "MMMM yyyy")}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-amber-700">₹{monthlyAmount}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Active Campaigns</CardTitle>
                <Link to={PAGE_PATHS.CAMPAIGNS}>
                  <Button variant="ghost" size="sm" className="text-emerald-600 text-xs">
                    View All
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {myCampaigns.filter((c) => c.status === "active").slice(0, 3).length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-2">No active campaigns</p>
              ) : (
                myCampaigns
                  .filter((c) => c.status === "active")
                  .slice(0, 3)
                  .map((campaign) => {
                    const targetAmount = Number(campaign.target_amount) || 0;
                    const collectedAmount = Number(campaign.collected_amount) || 0;
                    const progress = targetAmount > 0 ? Math.min(100, (collectedAmount / targetAmount) * 100) : 0;
                    const participated = donatedCampaignIds.has(campaign.id);
                    return (
                      <div key={campaign.id} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Heart className="w-3.5 h-3.5 text-rose-400" />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[160px]">
                              {campaign.title}
                            </span>
                            {participated && (
                              <Badge className="text-xs bg-emerald-100 text-emerald-700 border-0">
                                Donated
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-slate-500">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                        <p className="text-xs text-slate-500">
                          ₹{collectedAmount.toLocaleString()} / ₹{targetAmount.toLocaleString()}
                        </p>
                      </div>
                    );
                  })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
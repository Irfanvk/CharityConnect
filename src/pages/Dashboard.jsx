// @ts-nocheck
import React, { useState, useEffect, useCallback } from "react";
import { charityClient } from "@/api/charityClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Users, Heart, TrendingUp, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatsCard from "@/components/dashboard/StatsCard";
import RecentActivity from "@/components/dashboard/RecentActivity";
import CampaignProgress from "@/components/dashboard/CampaignProgress";
import MemberDashboard from "@/components/dashboard/MemberDashboard";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import SuperAdminDashboard from "@/components/dashboard/SuperAdminDashboard";
import PullToRefresh from "@/components/mobile/PullToRefresh";
import { APP_IMAGES } from "@/config/appPaths";
import BulkOperationsPanel from "@/components/dashboard/BulkOperationsPanel";
import { getMemberSetup, isMemberSetupCompleted, saveMemberSetup } from "@/lib/memberSetup";

const DASHBOARD_RECENT_CHALLAN_LIMIT = 200;
const DASHBOARD_CAMPAIGN_LIMIT = 200;
const DASHBOARD_MEMBER_SAMPLE_LIMIT = 300;

export default function Dashboard() {
  // ✅ FIX 1: Use authUser directly from context — no duplicate state needed.
  // Previously, `user` was a local state copy of `authUser`, and the useEffect
  // that synced them recreated a new object every render, causing an infinite loop.
  const { user } = useAuth();

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [memberSetupData, setMemberSetupData] = useState(null);
  const [adminTab, setAdminTab] = useState("overview");
  const queryClient = useQueryClient();
  const currentMonth = format(new Date(), 'yyyy-MM');

  // ✅ FIX 2: Derive role flags directly from `user` (no stale local state).
  const isSuperAdmin = user?.is_superadmin === true || user?.role === 'superadmin';
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isMember = !!user && !isAdmin && !isSuperAdmin;

  // ✅ FIX 3: Onboarding check runs only once when user.id is first available.
  // Previously `loadUserData` called `charityClient.auth.me()` again even though
  // AuthContext had already fetched the user — a redundant network call on every render.
  useEffect(() => {
    if (!user?.id) return;
    if (user.role === 'member') {
      const completed = isMemberSetupCompleted(user.id);
      setShowOnboarding(!completed);
      setMemberSetupData(getMemberSetup(user.id));
    } else {
      setShowOnboarding(false);
      setMemberSetupData(null);
    }
  }, [user?.id, user?.role]); // ✅ primitive deps only — no object reference churn

  // ✅ FIX 4: Stable callback so it doesn't get recreated on every render.
  const handleOnboardingComplete = useCallback((setupData) => {
    if (user?.id) {
      saveMemberSetup(user.id, setupData || {});
    }
    setMemberSetupData(getMemberSetup(user?.id));
    setShowOnboarding(false);
    // ✅ No more redundant `loadUserData()` call here — user is already in context.
  }, [user?.id]);

  // ─── Queries ────────────────────────────────────────────────────────────────

  const { data: members = [] } = useQuery({
    queryKey: ['members', 'dashboard', user?.role],
    queryFn: () =>
      charityClient.members.list({ skip: 0, limit: DASHBOARD_MEMBER_SAMPLE_LIMIT }),
    enabled: isAdmin,
    // ✅ FIX 5: staleTime prevents refetching on every focus/mount.
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const { data: memberSummary } = useQuery({
    queryKey: ['members', 'summary'],
    queryFn: () => charityClient.members.summary(),
    enabled: isAdmin,
    staleTime: 2 * 60 * 1000,
  });

  const membersArray = Array.isArray(members) ? members : [];

  const { data: memberProfile } = useQuery({
    queryKey: ['members', 'me'],
    queryFn: () => charityClient.members.me(),
    enabled: !!user && !isAdmin,
    staleTime: 5 * 60 * 1000, // 5 minutes — profile rarely changes
  });

  const { data: challans } = useQuery({
    queryKey: ['challans', 'dashboard', user?.role],
    queryFn: () =>
      charityClient.challans.list({
        order: '-created_date',
        skip: 0,
        limit: DASHBOARD_RECENT_CHALLAN_LIMIT,
      }),
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const challansArray = Array.isArray(challans) ? challans : [];

  const { data: challanSummary } = useQuery({
    queryKey: ['challans', 'summary', currentMonth, user?.role],
    queryFn: () => charityClient.challans.summary({ month: currentMonth }),
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const { data: campaigns } = useQuery({
    queryKey: ['campaigns', 'dashboard'],
    queryFn: () =>
      charityClient.campaigns.list({ skip: 0, limit: DASHBOARD_CAMPAIGN_LIMIT }),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const campaignsArray = Array.isArray(campaigns) ? campaigns : [];

  const { data: dashboardCharts } = useQuery({
    queryKey: ['admin', 'dashboard', 'charts'],
    queryFn: () => charityClient.admin.dashboardCharts({ months: 12, top_limit: 10 }),
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: () => charityClient.auditLogs.list({ order: '-created_date', limit: 50 }),
    enabled: user?.is_superadmin === true,
    staleTime: 2 * 60 * 1000,
  });

  const auditLogsArray = Array.isArray(auditLogs) ? auditLogs : [];

  // Phase 1: RecurringDonations disabled
  const recurringDonationsArray = [];

  // ─── Pull-to-refresh ────────────────────────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['members'] });
    await queryClient.invalidateQueries({ queryKey: ['challans'] });
    await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    if (user?.is_superadmin) {
      await queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    }
  }, [queryClient, user?.is_superadmin]);

  // ─── Derived display values ─────────────────────────────────────────────────

  const displayName =
    user?.full_name?.trim() ||
    user?.username?.trim() ||
    user?.email?.split("@")[0] ||
    (isSuperAdmin ? "Superadmin" : isMember ? "Member" : "User");

  const activeMembers = memberSummary?.active_members ?? membersArray.filter(m => m.status === 'active').length;
  const totalMembers = memberSummary?.total_members ?? membersArray.length;
  const totalCollected = challanSummary?.total_collected ?? 0;
  const pendingApprovals = challanSummary?.pending_count ?? 0;
  const activeCampaigns = campaignsArray.filter(c => c.status === 'active').length;

  const userChallans = challansArray.filter(c => c.created_by === user?.email);
  const userPending = challanSummary?.pending_count ?? userChallans.filter(c => c.status !== 'approved' && c.status !== 'rejected').length;
  const userApproved = challanSummary?.approved_count ?? userChallans.filter(c => c.status === 'approved').length;

  // ─── Render ─────────────────────────────────────────────────────────────────

  // Superadmin dashboard
  if (isSuperAdmin) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-8">
          <OnboardingWizard
            open={showOnboarding}
            onComplete={handleOnboardingComplete}
            user={user}
            memberProfile={memberProfile}
          />

          <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-8 text-white relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-10 bg-cover bg-center"
              style={{ backgroundImage: `url('${APP_IMAGES.DASHBOARD.SUPERADMIN_WELCOME_BG}')` }}
            />
            <div className="relative">
              <h1 className="text-3xl font-bold mb-2">
                Welcome back, {displayName}! 🚀
              </h1>
              <p className="text-purple-100 text-lg">
                System-wide analytics and performance insights
              </p>
              <div className="flex items-center gap-2 mt-4 text-purple-100">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(), "EEEE, MMMM d, yyyy")}</span>
              </div>
            </div>
          </div>

          <SuperAdminDashboard
            members={membersArray}
            challans={challansArray}
            campaigns={campaignsArray}
            dashboardCharts={dashboardCharts}
            auditLogs={auditLogsArray}
            recurringDonations={recurringDonationsArray}
          />
        </div>
      </PullToRefresh>
    );
  }

  // Member dashboard
  if (isMember) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-6">
          <OnboardingWizard
            open={showOnboarding}
            onComplete={handleOnboardingComplete}
            user={user}
            memberProfile={memberProfile}
          />

          <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl p-6 text-white relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-10 bg-cover bg-center"
              style={{ backgroundImage: `url('${APP_IMAGES.DASHBOARD.MEMBER_WELCOME_BG}')` }}
            />
            <div className="relative">
              <h1 className="text-2xl font-bold mb-1">
                Welcome back, {displayName}! 👋
              </h1>
              <p className="text-emerald-100">Track your contributions and stay connected</p>
              <div className="flex items-center gap-2 mt-3 text-emerald-100 text-sm">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(), "EEEE, MMMM d, yyyy")}</span>
              </div>
            </div>
          </div>

          <MemberDashboard
            user={user}
            memberProfile={memberProfile}
            challans={challansArray}
            campaigns={campaignsArray}
            memberSetupData={memberSetupData}
            onOpenSetup={() => setShowOnboarding(true)}
          />
        </div>
      </PullToRefresh>
    );
  }

  // Admin dashboard
  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-8">
        <OnboardingWizard
          open={showOnboarding}
          onComplete={handleOnboardingComplete}
          user={user}
          memberProfile={memberProfile}
        />

        <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl p-8 text-white relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-10 bg-cover bg-center"
            style={{ backgroundImage: `url('${APP_IMAGES.DASHBOARD.MEMBER_WELCOME_BG}')` }}
          />
          <div className="relative">
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {displayName}! 👋
            </h1>
            <p className="text-emerald-100 text-lg">
              Here's an overview of your charity's performance
            </p>
            <div className="flex items-center gap-2 mt-4 text-emerald-100">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(), "EEEE, MMMM d, yyyy")}</span>
            </div>
          </div>
        </div>

        <Tabs value={adminTab} onValueChange={setAdminTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bulk-operations">Bulk Operations</TabsTrigger>
          </TabsList>
        </Tabs>

        {adminTab === "bulk-operations" ? (
          <BulkOperationsPanel />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Active Members"
                value={activeMembers}
                subtitle={`${totalMembers} total members`}
                icon={Users}
                trend={0}
                color="emerald"
              />
              <StatsCard
                title="Total Collection"
                value={`₹${totalCollected.toLocaleString()}`}
                subtitle="From approved payments"
                icon={TrendingUp}
                trend={0}
                color="blue"
              />
              <StatsCard
                title="Pending Approvals"
                value={pendingApprovals}
                subtitle="Awaiting review"
                icon={Clock}
                trend={0}
                color="amber"
              />
              <StatsCard
                title="Active Campaigns"
                value={activeCampaigns}
                subtitle={`${campaignsArray.length} total campaigns`}
                icon={Heart}
                trend={0}
                color="rose"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentActivity challans={challansArray} />
              <CampaignProgress campaigns={campaignsArray} />
            </div>
          </>
        )}
      </div>
    </PullToRefresh>
  );
}
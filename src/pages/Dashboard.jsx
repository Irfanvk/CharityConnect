// @ts-nocheck
import React, { useState, useEffect, useCallback } from "react";
import { charityClient } from "@/api/charityClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Users, Heart, TrendingUp, Calendar, Clock, Bell, BookOpen, LogOut, MapPinned, Receipt, User, Wallet } from "lucide-react";
import { format } from "@/lib/dateTime";
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
import CollectionStats from "@/components/dashboard/CollectionStats";
import { getMemberSetup, isMemberSetupCompleted, saveMemberSetup } from "@/lib/memberSetup";
import { PAGE_PATHS } from "@/config/appPaths";
import { dismissWayfinding, recordWayfindingVisit, shouldShowWayfinding, WAYFINDING_STATE_EVENT } from "@/lib/wayfinding";

const DASHBOARD_RECENT_CHALLAN_LIMIT = 200;
const DASHBOARD_CAMPAIGN_LIMIT = 200;
// ✅ FIX: Was 300, backend enforces le=200 — sending 300 caused 422 Unprocessable Entity
const DASHBOARD_MEMBER_SAMPLE_LIMIT = 200;

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [memberSetupData, setMemberSetupData] = useState(null);
  const [adminTab, setAdminTab] = useState("overview");
  const [showWayfinding, setShowWayfinding] = useState(false);
  const queryClient = useQueryClient();
  const currentMonth = format(new Date(), 'yyyy-MM');

  const isSuperAdmin = user?.is_superadmin === true || user?.role === 'superadmin';
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isMember = !!user && !isAdmin && !isSuperAdmin;
  const requestedTab = searchParams.get("tab");
  const requestedBulkGroupId = searchParams.get("bulk_group_id");
  const wayfindingUserKey = user?.id || user?.email || null;

  useEffect(() => {
    if (!isAdmin) return;
    if (requestedTab === "bulk-operations") {
      setAdminTab("bulk-operations");
    }
  }, [isAdmin, requestedTab]);

  const handleAdminTabChange = useCallback(
    (nextTab) => {
      setAdminTab(nextTab);
      const nextParams = new URLSearchParams(searchParams);
      if (nextTab === "bulk-operations") {
        nextParams.set("tab", "bulk-operations");
      } else {
        nextParams.delete("tab");
        nextParams.delete("bulk_group_id");
      }
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

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
  }, [user?.id, user?.role]);

  useEffect(() => {
    setShowWayfinding(recordWayfindingVisit(wayfindingUserKey));
  }, [wayfindingUserKey]);

  useEffect(() => {
    if (!wayfindingUserKey || typeof window === 'undefined') return undefined;

    const handleWayfindingStateChange = (event) => {
      if (event?.detail?.userKey && String(event.detail.userKey) !== String(wayfindingUserKey)) {
        return;
      }
      setShowWayfinding(shouldShowWayfinding(wayfindingUserKey));
    };

    window.addEventListener(WAYFINDING_STATE_EVENT, handleWayfindingStateChange);
    return () => window.removeEventListener(WAYFINDING_STATE_EVENT, handleWayfindingStateChange);
  }, [wayfindingUserKey]);

  const handleOnboardingComplete = useCallback((setupData) => {
    if (user?.id) {
      saveMemberSetup(user.id, setupData || {});
    }
    setMemberSetupData(getMemberSetup(user?.id));
    setShowOnboarding(false);
  }, [user?.id]);

  // ─── Queries ────────────────────────────────────────────────────────────────

  const { data: members = [] } = useQuery({
    queryKey: ['members', 'dashboard', user?.role],
    queryFn: () =>
      charityClient.members.list({ skip: 0, limit: DASHBOARD_MEMBER_SAMPLE_LIMIT }),
    enabled: isAdmin,
    staleTime: 2 * 60 * 1000,
  });

  const { data: memberSummary } = useQuery({
    queryKey: ['members', 'summary'],
    queryFn: () => charityClient.members.summary(),
    enabled: isAdmin,
    staleTime: 2 * 60 * 1000,
  });

  const { data: communityMembers = [] } = useQuery({
    queryKey: ['members', 'community-preview'],
    queryFn: async () => {
      try {
        return await charityClient.members.community({ limit: 12 });
      } catch {
        return [];
      }
    },
    enabled: isMember,
    staleTime: 5 * 60 * 1000,
  });

  const { data: communitySummary } = useQuery({
    queryKey: ['members', 'community-summary'],
    queryFn: async () => {
      try {
        return await charityClient.members.summary();
      } catch {
        return null;
      }
    },
    enabled: isMember,
    staleTime: 5 * 60 * 1000,
  });

  const membersArray = Array.isArray(members) ? members : [];

  const { data: memberProfile } = useQuery({
    queryKey: ['members', 'me'],
    queryFn: () => charityClient.members.me(),
    enabled: !!user && !isAdmin,
    staleTime: 5 * 60 * 1000,
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

  const recurringDonationsArray = [];

  const { data: collectionStats } = useQuery({
    queryKey: ['challans', 'collection-stats', user?.role],
    queryFn: () => isMember
      ? charityClient.challans.communityStats()
      : charityClient.challans.collectionStats(),
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const { data: communityFundSummary } = useQuery({
    queryKey: ['fund-utilizations', 'summary', 'member-dashboard'],
    queryFn: async () => {
      try {
        return await charityClient.fundUtilizations.summary();
      } catch {
        return null;
      }
    },
    enabled: isMember,
    staleTime: 5 * 60 * 1000,
  });

  const { data: communityFundRecords = [] } = useQuery({
    queryKey: ['fund-utilizations', 'list', 'member-dashboard'],
    queryFn: async () => {
      try {
        return await charityClient.fundUtilizations.list({ limit: 50 });
      } catch {
        return [];
      }
    },
    enabled: isMember,
    staleTime: 5 * 60 * 1000,
  });

  const { data: appSettings } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => charityClient.admin.getSettings(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // ─── Pull-to-refresh ────────────────────────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['members'] });
    await queryClient.invalidateQueries({ queryKey: ['challans'] });
    await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    await queryClient.invalidateQueries({ queryKey: ['fund-utilizations'] });
    await queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
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

  const homeMapItems = isAdmin
    ? [
        { title: 'Dashboard', description: 'Start here for the daily overview and important numbers.', path: PAGE_PATHS.DASHBOARD, icon: MapPinned, tone: 'emerald' },
        { title: 'Members', description: 'See who is inside the organisation and manage their details.', path: PAGE_PATHS.MEMBERS, icon: Users, tone: 'blue' },
        { title: 'Challans', description: 'Review payments, upload proofs, and clear pending items.', path: PAGE_PATHS.CHALLANS, icon: Receipt, tone: 'amber' },
        { title: 'Campaigns', description: 'Open, monitor, and promote active fundraising work.', path: PAGE_PATHS.CAMPAIGNS, icon: Heart, tone: 'rose' },
        { title: 'Reports', description: 'Find summaries, exports, and the financial story of the organisation.', path: PAGE_PATHS.REPORTS, icon: Wallet, tone: 'indigo' },
        { title: 'Notifications', description: 'Send and review updates so everyone in the home stays informed.', path: PAGE_PATHS.NOTIFICATIONS, icon: Bell, tone: 'slate' },
        ...(isSuperAdmin
          ? [
              { title: 'Import Data', description: 'Bring legacy records and bulk data into the system safely.', path: PAGE_PATHS.IMPORT, icon: BookOpen, tone: 'amber' },
              { title: 'Superadmin Panel', description: 'Use the highest-level controls for platform-wide oversight.', path: PAGE_PATHS.SUPERADMIN_PANEL, icon: User, tone: 'blue' },
            ]
          : []),
      ]
    : [
        { title: 'Dashboard', description: 'Start here to see your summary and recent activity.', path: PAGE_PATHS.DASHBOARD, icon: MapPinned, tone: 'emerald' },
        { title: 'Challans', description: 'This is where you pay, upload proof, and check your payment history.', path: PAGE_PATHS.CHALLANS, icon: Receipt, tone: 'amber' },
        { title: 'Campaigns', description: 'Browse causes, see progress, and contribute to active drives.', path: PAGE_PATHS.CAMPAIGNS, icon: Heart, tone: 'rose' },
        { title: 'Profile', description: 'Update your personal details and keep your information current.', path: PAGE_PATHS.PROFILE, icon: User, tone: 'blue' },
        { title: 'Notifications', description: 'Read announcements and know what needs your attention.', path: PAGE_PATHS.NOTIFICATIONS, icon: Bell, tone: 'slate' },
        { title: 'Guide', description: 'Open the user guide whenever you need help using a section.', path: PAGE_PATHS.DOCUMENTATION, icon: BookOpen, tone: 'indigo' },
      ];

  const toneClasses = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  };

  const welcomeSubtitle = isAdmin
    ? 'Use this space like a control room: check the map below, move to the right section, and keep the organisation running smoothly.'
    : 'Use this space like your home base: start here, see what needs attention, and move to the right section with confidence.';

  const HomeMapSection = () => (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <MapPinned className="h-4 w-4" />
            Home map
          </div>
          <h2 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            Know where everything lives
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {welcomeSubtitle}
          </p>
        </div>
        <div className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70">
            <p className="font-semibold text-slate-900 dark:text-white">How to enter</p>
            <p className="mt-1">Sign in, land on Dashboard, then use the cards below or the sidebar to move deeper.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70">
            <p className="font-semibold text-slate-900 dark:text-white">How to exit</p>
            <button
              type="button"
              onClick={logout}
              className="mt-1 inline-flex items-center gap-2 font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
            >
              <LogOut className="h-4 w-4" />
              Logout from here
            </button>
          </div>
          <button
            type="button"
            onClick={() => dismissWayfinding(wayfindingUserKey)}
            className="justify-self-start rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            Dismiss forever
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {homeMapItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              to={item.path}
              className="group rounded-2xl border border-slate-200 p-4 transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-slate-700 dark:hover:border-emerald-700"
            >
              <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${toneClasses[item.tone]}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">{item.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.description}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                Open this room
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

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

          {showWayfinding ? <HomeMapSection /> : null}

          <SuperAdminDashboard
            members={membersArray}
            challans={challansArray}
            campaigns={campaignsArray}
            dashboardCharts={dashboardCharts}
            auditLogs={auditLogsArray}
            recurringDonations={recurringDonationsArray}
            collectionStats={collectionStats}
          />
        </div>
      </PullToRefresh>
    );
  }

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

          {showWayfinding ? <HomeMapSection /> : null}

          <MemberDashboard
            user={user}
            memberProfile={memberProfile}
            challans={challansArray}
            campaigns={campaignsArray}
            communityMembers={communityMembers}
            communitySummary={communitySummary}
            communityFundSummary={communityFundSummary}
            communityFundRecords={communityFundRecords}
            memberSetupData={memberSetupData}
            onOpenSetup={() => setShowOnboarding(true)}
            showCollectionStats={appSettings?.member_stats_visible === true}
            collectionStats={collectionStats}
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

        {showWayfinding ? <HomeMapSection /> : null}

        <Tabs value={adminTab} onValueChange={handleAdminTabChange}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bulk-operations">Bulk Operations</TabsTrigger>
          </TabsList>
        </Tabs>

        {adminTab === "bulk-operations" ? (
          <BulkOperationsPanel initialBulkGroupId={requestedBulkGroupId} />
        ) : (
          <>
            {/* Collection Overview Stats */}
            <CollectionStats collectionStats={collectionStats} />

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
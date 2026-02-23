import React, { useState, useEffect } from "react";
import { charityClient } from "@/api/charityClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Receipt, Heart, TrendingUp, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import StatsCard from "@/components/dashboard/StatsCard";
import RecentActivity from "@/components/dashboard/RecentActivity";
import CampaignProgress from "@/components/dashboard/CampaignProgress";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import SuperAdminDashboard from "@/components/dashboard/SuperAdminDashboard";
import PullToRefresh from "@/components/mobile/PullToRefresh";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const currentUser = await charityClient.auth.me();
      setUser(currentUser);
      
      // Check if onboarding is needed
      if (currentUser.role !== 'admin' && !currentUser.onboarding_completed) {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => charityClient.entities.Member.list(),
  });

  const membersArray = Array.isArray(members) ? members : [];

  const memberProfile = membersArray.find(m => 
    m.email === user?.email || m.phone === user?.phone
  );

  const { data: challans } = useQuery({
    queryKey: ['challans'],
    queryFn: () => charityClient.entities.Challan.list('-created_date', 100),
  });

  const challansArray = Array.isArray(challans) ? challans : [];

  const { data: campaigns } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => charityClient.entities.Campaign.list(),
  });

  const campaignsArray = Array.isArray(campaigns) ? campaigns : [];

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['members'] });
    await queryClient.invalidateQueries({ queryKey: ['challans'] });
    await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    if (user?.is_superadmin) {
      await queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
      await queryClient.invalidateQueries({ queryKey: ['recurringDonations'] });
    }
  };

  const { data: auditLogs } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: () => charityClient.entities.AuditLog.list('-created_date', 50),
    enabled: user?.is_superadmin === true,
  });

  const auditLogsArray = Array.isArray(auditLogs) ? auditLogs : [];

  // Phase 1: RecurringDonations disabled - will implement in Phase 2
  const { data: recurringDonations } = useQuery({
    queryKey: ['recurringDonations'],
    queryFn: async () => [],
    enabled: false, // Disabled for Phase 1
  });

  const recurringDonationsArray = [];

  const isSuperAdmin = user?.is_superadmin === true;
  const isAdmin = user?.role === 'admin';

  // Calculate stats
  const activeMembers = membersArray.filter(m => m.status === 'active').length;
  const totalCollected = challansArray
    .filter(c => c.status === 'approved')
    .reduce((sum, c) => sum + (c.amount || 0), 0);
  const pendingApprovals = challansArray.filter(c => c.status === 'pending' || c.status === 'proof_uploaded').length;
  const activeCampaigns = campaignsArray.filter(c => c.status === 'active').length;

  // Monthly collection
  const currentMonth = new Date();
  const monthlyCollection = challansArray
    .filter(c => c.status === 'approved' && c.month === format(currentMonth, 'yyyy-MM'))
    .reduce((sum, c) => sum + (c.amount || 0), 0);

  // User-specific data for members
  const userChallans = challansArray.filter(c => c.created_by === user?.email);
  const userPending = userChallans.filter(c => c.status !== 'approved' && c.status !== 'rejected').length;
  const userApproved = userChallans.filter(c => c.status === 'approved').length;

  // Show superadmin dashboard if user is superadmin
  if (isSuperAdmin) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-8">
          <OnboardingWizard
            open={showOnboarding}
            onComplete={() => {
              setShowOnboarding(false);
              loadUserData();
            }}
            user={user}
            memberProfile={memberProfile}
          />
          
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200')] opacity-10 bg-cover bg-center" />
          <div className="relative">
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {user?.full_name || 'Superadmin'}! 🚀
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
          auditLogs={auditLogsArray}
          recurringDonations={recurringDonationsArray}
        />
        </div>
      </PullToRefresh>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-8">
      <OnboardingWizard
        open={showOnboarding}
        onComplete={() => {
          setShowOnboarding(false);
          loadUserData();
        }}
        user={user}
        memberProfile={memberProfile}
      />
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1200')] opacity-10 bg-cover bg-center" />
        <div className="relative">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {user?.full_name || 'User'}! 👋
          </h1>
          <p className="text-emerald-100 text-lg">
            {isAdmin 
              ? "Here's an overview of your charity's performance"
              : "Track your contributions and stay connected"}
          </p>
          <div className="flex items-center gap-2 mt-4 text-emerald-100">
            <Calendar className="w-4 h-4" />
            <span>{format(new Date(), "EEEE, MMMM d, yyyy")}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isAdmin ? (
          <>
            <StatsCard
              title="Active Members"
              value={activeMembers}
              subtitle={`${membersArray.length} total members`}
              icon={Users}
              color="emerald"
            />
            <StatsCard
              title="Total Collection"
              value={`₹${totalCollected.toLocaleString()}`}
              subtitle="From approved payments"
              icon={TrendingUp}
              color="blue"
            />
            <StatsCard
              title="Pending Approvals"
              value={pendingApprovals}
              subtitle="Awaiting review"
              icon={Clock}
              color="amber"
            />
            <StatsCard
              title="Active Campaigns"
              value={activeCampaigns}
              subtitle={`${campaigns.length} total campaigns`}
              icon={Heart}
              color="rose"
            />
          </>
        ) : (
          <>
            <StatsCard
              title="Total Contributed"
              value={`₹${userChallans.filter(c => c.status === 'approved').reduce((sum, c) => sum + (c.amount || 0), 0).toLocaleString()}`}
              subtitle="Your total donations"
              icon={TrendingUp}
              color="emerald"
            />
            <StatsCard
              title="Pending Challans"
              value={userPending}
              subtitle="Awaiting approval"
              icon={Clock}
              color="amber"
            />
            <StatsCard
              title="Approved Challans"
              value={userApproved}
              subtitle="Successfully completed"
              icon={Receipt}
              color="blue"
            />
            <StatsCard
              title="Active Campaigns"
              value={activeCampaigns}
              subtitle="Participate now"
              icon={Heart}
              color="rose"
            />
          </>
        )}
      </div>

      {/* Activity & Campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity challans={isAdmin ? challansArray : userChallans} />
        <CampaignProgress campaigns={campaignsArray} />
      </div>
      </div>
    </PullToRefresh>
  );
}
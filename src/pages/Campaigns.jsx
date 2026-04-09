import React, { useState, useEffect } from "react";
import { charityClient } from "@/api/charityClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Heart, Calendar, Users, Target, 
  MoreVertical, Pencil, Trash2, TrendingUp, BarChart3, ArrowLeft
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { PAGE_PATHS } from "@/config/appPaths";
import CampaignForm from "@/components/campaigns/CampaignForm";
import CampaignAnalytics from "@/components/campaigns/CampaignAnalytics";
import RecurringDonationForm from "@/components/campaigns/RecurringDonationForm";
import {
  formatCampaignTargetText,
  getCampaignProgress,
  getCampaignRelativeEndLabel,
  isUnlimitedTarget,
} from "@/lib/campaigns";

const CAMPAIGN_LIST_BATCH_SIZE = 200;
const CHALLAN_LIST_BATCH_SIZE = 200;
const DONOR_DETAIL_PAGE_THRESHOLD = 10;

const statusConfig = {
  active: { label: "Active", color: "bg-emerald-100 text-emerald-700" },
  completed: { label: "Completed", color: "bg-blue-100 text-blue-700" },
  cancelled: { label: "Cancelled", color: "bg-slate-100 text-slate-700" },
};

export default function Campaigns() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [user, setUser] = useState(null);
  const [viewMode, setViewMode] = useState("campaigns"); // "campaigns" or "analytics"
  const [recurringFormOpen, setRecurringFormOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [expandedCampaignId, setExpandedCampaignId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, title }
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    charityClient.auth.me().then(setUser).catch(() => {});
  }, []);

  // REPLACE the campaigns useQuery
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns'],  // ✅ Remove statusFilter from key
    queryFn: async () => {
      let allCampaigns = [];
      let skip = 0;

      while (true) {
        const chunk = await charityClient.campaigns.list({
          order: '-created_date',
          skip,
          limit: CAMPAIGN_LIST_BATCH_SIZE,
          // No status param here — fetch all, filter below
        });

        allCampaigns = allCampaigns.concat(chunk);
        if (chunk.length < CAMPAIGN_LIST_BATCH_SIZE) break;
        skip += CAMPAIGN_LIST_BATCH_SIZE;
      }

      return allCampaigns;
    },
  });

  // ✅ Lazy-load challans only when analytics view is opened
  const { data: challans = [] } = useQuery({
    queryKey: ['challans'],
    enabled: viewMode === "analytics", // Only fetch when analytics is open
    queryFn: async () => {
      let allChallans = [];
      let skip = 0;

      while (true) {
        const chunk = await charityClient.challans.list({
          order: '-created_date',
          skip,
          limit: CHALLAN_LIST_BATCH_SIZE,
        });

        allChallans = allChallans.concat(chunk);

        if (chunk.length < CHALLAN_LIST_BATCH_SIZE) {
          break;
        }

        skip += CHALLAN_LIST_BATCH_SIZE;
      }

      return allChallans;
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members', 'campaign-donor-directory'],
    queryFn: async () => {
      let allMembers = [];
      let skip = 0;

      while (true) {
        const chunk = await charityClient.members.list({
          skip,
          limit: CAMPAIGN_LIST_BATCH_SIZE,
        });

        allMembers = allMembers.concat(chunk);

        if (chunk.length < CAMPAIGN_LIST_BATCH_SIZE) {
          break;
        }

        skip += CAMPAIGN_LIST_BATCH_SIZE;
      }

      return allMembers;
    },
  });

  const memberMapById = members.reduce((acc, member) => {
    acc[String(member.id)] = member;
    return acc;
  }, {});

  const campaignDonationsById = challans.reduce((acc, challan) => {
    const challanType = challan?.backend_type || challan?.type;
    if (challanType !== 'campaign' || !challan?.campaign_id || challan?.status !== 'approved') {
      return acc;
    }

    const campaignId = String(challan.campaign_id);
    if (!acc[campaignId]) {
      acc[campaignId] = [];
    }

    acc[campaignId].push(challan);
    return acc;
  }, {});

  const campaignStatsById = challans.reduce((acc, challan) => {
    const challanType = challan?.backend_type || challan?.type;
    if (challanType !== 'campaign' || !challan?.campaign_id || challan?.status !== 'approved') {
      return acc;
    }

    const campaignId = challan.campaign_id;
    if (!acc[campaignId]) {
      acc[campaignId] = {
        collected_amount: 0,
        donorIds: new Set(),
      };
    }

    acc[campaignId].collected_amount += Number(challan.amount || 0);
    if (challan.member_id) {
      acc[campaignId].donorIds.add(challan.member_id);
    }

    return acc;
  }, {});

  const campaignsWithStats = campaigns.map((campaign) => {
    const stats = campaignStatsById[campaign.id];
    const computedCollected = stats?.collected_amount ?? 0;
    const computedDonors = stats?.donorIds?.size ?? (campaignDonationsById[String(campaign.id)]?.length || 0);

    return {
      ...campaign,
      collected_amount: campaign.collected_amount ?? computedCollected,
      participants_count: campaign.participants_count ?? computedDonors,
    };
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return charityClient.campaigns.create(data);
    },
    onMutate: async (newCampaignData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['campaigns'] });
      
      // Snapshot previous value
      const previousCampaigns = queryClient.getQueryData(['campaigns']);
      
      // Optimistically add new campaign with temporary ID
      const optimisticCampaign = {
        ...newCampaignData,
        id: 'temp-' + Date.now(),
        collected_amount: 0,
        participants_count: 0,
        created_date: new Date().toISOString(),
      };
      
      queryClient.setQueryData(['campaigns'], (old) => 
        [...(old || []), optimisticCampaign]
      );
      
      return { previousCampaigns };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['campaigns'], context.previousCampaigns);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return charityClient.campaigns.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setFormOpen(false);
      setEditingCampaign(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, title }) => {
      await charityClient.campaigns.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({
        title: "Campaign deleted",
        description: "Campaign was deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error?.message || "Unable to delete campaign.",
        variant: "destructive",
      });
    },
  });

  const createRecurringMutation = useMutation({
    mutationFn: (data) => charityClient.entities.RecurringDonation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringDonations'] });
      setRecurringFormOpen(false);
      setSelectedCampaign(null);
    },
  });

  const handleSubmit = async (data) => {
    if (editingCampaign) {
      await updateMutation.mutateAsync({ id: editingCampaign.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const selectedCampaignId = searchParams.get('campaign');
  const selectedCampaignDetails = selectedCampaignId
    ? campaignsWithStats.find((campaign) => String(campaign.id) === String(selectedCampaignId))
    : null;

  const closeCampaignDetails = () => {
    setSearchParams({});
  };

  const formatDonationRow = (challan) => {
    const memberId = challan?.member_id != null ? String(challan.member_id) : '';
    const member = memberMapById[memberId];
    const fullName =
      member?.full_name ||
      challan?.member_name ||
      challan?.donor_name ||
      'Unknown Donor';

    return {
      id: challan?.id,
      fullName,
      memberCode: member?.member_code || member?.member_id || challan?.member_code || 'N/A',
      amount: Number(challan?.amount || 0),
      paymentMethod: challan?.payment_method || 'N/A',
      donatedOn: challan?.created_at || challan?.created_date || null,
      month: challan?.month || 'N/A',
      notes: challan?.notes || '—',
    };
  };

  const getCampaignDonations = (campaignId) => {
    const entries = campaignDonationsById[String(campaignId)] || [];
    return entries.map(formatDonationRow);
  };

  const handleViewDonors = (campaign) => {
    const donations = getCampaignDonations(campaign.id);
    if (donations.length > DONOR_DETAIL_PAGE_THRESHOLD) {
      setExpandedCampaignId(null);
      setSearchParams({ campaign: String(campaign.id) });
      return;
    }

    setExpandedCampaignId((current) =>
      String(current) === String(campaign.id) ? null : campaign.id
    );
  };

  const openCampaignInReports = (campaign) => {
    if (!campaign?.id) {
      return;
    }

    navigate(`${PAGE_PATHS.REPORTS}?tab=donations&campaign=${encodeURIComponent(String(campaign.id))}`);
  };

  const filteredCampaigns = campaignsWithStats.filter(c => 
    statusFilter === 'all' || c.status === statusFilter
  );

  if (selectedCampaignId && viewMode === 'campaigns') {
    const detailCampaign = selectedCampaignDetails;

    if (!detailCampaign) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={closeCampaignDetails}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Campaigns
            </Button>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Campaign Not Found</h1>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="py-8 text-slate-500">The selected campaign does not exist or was removed.</CardContent>
          </Card>
        </div>
      );
    }

    const donationRows = getCampaignDonations(detailCampaign.id);
    const totalAmount = donationRows.reduce((sum, row) => sum + row.amount, 0);

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={closeCampaignDetails}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Campaigns
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{detailCampaign.title}</h1>
              <p className="text-slate-500 dark:text-slate-400">Campaign details and donor list</p>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={() => openCampaignInReports(detailCampaign)}>
            View in Reports
          </Button>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={statusConfig[detailCampaign.status]?.color || statusConfig.active.color}>
                {statusConfig[detailCampaign.status]?.label || 'Active'}
              </Badge>
              <span className="text-sm text-slate-500">
                Target: {formatCampaignTargetText(detailCampaign)}
              </span>
              <span className="text-sm text-slate-500">
                Duration: {getCampaignRelativeEndLabel(detailCampaign)}
              </span>
            </div>

            {detailCampaign.description && (
              <p className="text-sm text-slate-600 dark:text-slate-300">{detailCampaign.description}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-lg border p-3 bg-slate-50">
                <p className="text-xs text-slate-500">Donors</p>
                <p className="text-lg font-semibold text-slate-900">{donationRows.length}</p>
              </div>
              <div className="rounded-lg border p-3 bg-slate-50">
                <p className="text-xs text-slate-500">Collected</p>
                <p className="text-lg font-semibold text-emerald-700">₹{totalAmount.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border p-3 bg-slate-50">
                <p className="text-xs text-slate-500">Average Donation</p>
                <p className="text-lg font-semibold text-slate-900">
                  ₹{donationRows.length > 0 ? Math.round(totalAmount / donationRows.length).toLocaleString() : '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {donationRows.length === 0 ? (
              <div className="py-8 text-center text-slate-500">No approved donations found for this campaign.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-left px-4 py-3">Full Name</th>
                      <th className="text-left px-4 py-3">Member ID</th>
                      <th className="text-left px-4 py-3">Amount</th>
                      <th className="text-left px-4 py-3">Method</th>
                      <th className="text-left px-4 py-3">Month</th>
                      <th className="text-left px-4 py-3">Date</th>
                      <th className="text-left px-4 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donationRows.map((row) => (
                      <tr key={row.id} className="border-t">
                        <td className="px-4 py-3 font-medium text-slate-900">{row.fullName}</td>
                        <td className="px-4 py-3 text-slate-600">{row.memberCode}</td>
                        <td className="px-4 py-3 text-emerald-700 font-medium">₹{row.amount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-600">{row.paymentMethod}</td>
                        <td className="px-4 py-3 text-slate-600">{row.month}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {row.donatedOn ? new Date(row.donatedOn).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-[220px] truncate" title={row.notes}>{row.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Stats
  const activeCampaigns = campaignsWithStats.filter(c => c.status === 'active');
  const totalTarget = activeCampaigns.reduce((sum, c) => sum + (isUnlimitedTarget(c) ? 0 : (c.target_amount || 0)), 0);
  const totalCollected = activeCampaigns.reduce((sum, c) => sum + (c.collected_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Campaigns</h1>
          <p className="text-slate-500 dark:text-slate-400">Donation campaigns for special causes</p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={viewMode} onValueChange={setViewMode}>
            <TabsList>
              <TabsTrigger value="campaigns">
                <Heart className="w-4 h-4 mr-2" />
                Campaigns
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {isAdmin && viewMode === "campaigns" && (
            <Button 
              onClick={() => { setEditingCampaign(null); setFormOpen(true); }}
              className="bg-emerald-600 hover:bg-emerald-700 select-none"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Campaign
            </Button>
          )}
        </div>
      </div>

      {/* View Content */}
      {viewMode === "analytics" ? (
        <CampaignAnalytics campaigns={campaignsWithStats} challans={challans} showReports={true} />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-rose-50 to-pink-50">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
                <Heart className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{activeCampaigns.length}</p>
                <p className="text-sm text-slate-500">Active Campaigns</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">₹{totalCollected.toLocaleString()}</p>
                <p className="text-sm text-slate-500">Total Collected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">₹{totalTarget.toLocaleString()}</p>
                <p className="text-sm text-slate-500">Total Targeted</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Campaigns Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading campaigns...</div>
      ) : filteredCampaigns.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="text-center py-12">
            <Heart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No campaigns found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => {
            const progress = getCampaignProgress(campaign);
            const status = statusConfig[campaign.status];

            return (
              <Card key={campaign.id} className="border-0 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                {campaign.image_url ? (
                  <div className="h-40 bg-cover bg-center" style={{ backgroundImage: `url(${campaign.image_url})` }} />
                ) : (
                  <div className="h-40 bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center">
                    <Heart className="w-16 h-16 text-white/30" />
                  </div>
                )}
                
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <Badge className={status?.color}>{status?.label}</Badge>
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingCampaign(campaign); setFormOpen(true); }}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setDeleteTarget({ id: campaign.id, title: campaign.title })}
                            className="text-rose-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  <h3 className="font-semibold text-lg text-slate-900 mb-2">{campaign.title}</h3>
                  {campaign.description && (
                    <p className="text-sm text-slate-500 mb-4 line-clamp-2">{campaign.description}</p>
                  )}

                  {progress !== null ? (
                    <Progress value={progress} className="h-2 mb-3" />
                  ) : (
                    <div className="h-2 mb-3 rounded-full border border-dashed border-slate-200 bg-slate-50" />
                  )}
                  
                  <div className="flex items-center justify-between text-sm mb-4">
                    <span className="text-emerald-600 font-medium">
                      ₹{(campaign.collected_amount || 0).toLocaleString()}
                    </span>
                    <span className="text-slate-500">
                      of {formatCampaignTargetText(campaign)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {campaign.participants_count || 0} donors
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {getCampaignRelativeEndLabel(campaign)}
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleViewDonors(campaign)}
                    className="w-full mt-2"
                  >
                    {String(expandedCampaignId) === String(campaign.id)
                      ? "Hide Donor List"
                      : (getCampaignDonations(campaign.id).length > DONOR_DETAIL_PAGE_THRESHOLD
                        ? "View Donors in Detail Page"
                        : "View Donor List")}
                  </Button>

                  {String(expandedCampaignId) === String(campaign.id) && (
                    <div className="mt-2 rounded-lg border bg-slate-50 p-3 space-y-2">
                      {getCampaignDonations(campaign.id).length === 0 ? (
                        <p className="text-xs text-slate-500">No approved donations for this campaign yet.</p>
                      ) : (
                        <>
                          {getCampaignDonations(campaign.id).slice(0, 8).map((row) => (
                            <div key={row.id} className="flex items-center justify-between text-xs">
                              <div className="min-w-0 pr-2">
                                <p className="font-medium text-slate-800 truncate">{row.fullName}</p>
                                <p className="text-slate-500 truncate">{row.memberCode} • {row.paymentMethod}</p>
                              </div>
                              <span className="font-semibold text-emerald-700">₹{row.amount.toLocaleString()}</span>
                            </div>
                          ))}

                          <Button
                            type="button"
                            size="sm"
                            variant="link"
                            className="px-0 text-xs"
                            onClick={() => openCampaignInReports(campaign)}
                          >
                            Open filtered report for this campaign
                          </Button>

                          {getCampaignDonations(campaign.id).length > 8 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="link"
                              className="px-0 text-xs"
                              onClick={() => setSearchParams({ campaign: String(campaign.id) })}
                            >
                              View full donor details ({getCampaignDonations(campaign.id).length})
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {campaign.status === 'active' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setSelectedCampaign(campaign); setRecurringFormOpen(true); }}
                      className="w-full mt-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    >
                      <Heart className="w-3 h-3 mr-1" />
                      Set Up Recurring Donation
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600"
              onClick={() => {
                deleteMutation.mutate(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Campaign Form */}
      <CampaignForm
        open={formOpen}
        onOpenChange={setFormOpen}
        campaign={editingCampaign}
        onSubmit={handleSubmit}
      />

      {/* Recurring Donation Form */}
      <RecurringDonationForm
        open={recurringFormOpen}
        onOpenChange={setRecurringFormOpen}
        campaign={selectedCampaign}
        onSubmit={createRecurringMutation.mutateAsync}
      />
    </div>
  );
}
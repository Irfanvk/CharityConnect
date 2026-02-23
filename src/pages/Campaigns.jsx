import React, { useState, useEffect } from "react";
import { charityClient } from "@/api/charityClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Heart, Calendar, Users, Target, 
  MoreVertical, Pencil, Trash2, TrendingUp, BarChart3 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { differenceInDays } from "date-fns";
import CampaignForm from "@/components/campaigns/CampaignForm";
import CampaignAnalytics from "@/components/campaigns/CampaignAnalytics";
import RecurringDonationForm from "@/components/campaigns/RecurringDonationForm";

const statusConfig = {
  active: { label: "Active", color: "bg-emerald-100 text-emerald-700" },
  completed: { label: "Completed", color: "bg-blue-100 text-blue-700" },
  cancelled: { label: "Cancelled", color: "bg-slate-100 text-slate-700" },
};

export default function Campaigns() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [user, setUser] = useState(null);
  const [viewMode, setViewMode] = useState("campaigns"); // "campaigns" or "analytics"
  const [recurringFormOpen, setRecurringFormOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    charityClient.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => charityClient.entities.Campaign.list('-created_date'),
  });

  const { data: challans = [] } = useQuery({
    queryKey: ['challans'],
    queryFn: () => charityClient.entities.Challan.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const campaign = await charityClient.entities.Campaign.create(data);
      // Log audit
      await charityClient.entities.AuditLog.create({
        action_type: "campaign_created",
        performed_by: user?.email,
        performed_by_name: user?.full_name,
        target_type: "Campaign",
        target_id: campaign.id,
        target_name: data.title
      });
      return campaign;
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
      const campaign = await charityClient.entities.Campaign.update(id, data);
      // Log audit
      await charityClient.entities.AuditLog.create({
        action_type: "campaign_updated",
        performed_by: user?.email,
        performed_by_name: user?.full_name,
        target_type: "Campaign",
        target_id: id,
        target_name: data.title || campaign.title
      });
      return campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setFormOpen(false);
      setEditingCampaign(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, title }) => {
      await charityClient.entities.Campaign.delete(id);
      // Log audit
      await charityClient.entities.AuditLog.create({
        action_type: "campaign_deleted",
        performed_by: user?.email,
        performed_by_name: user?.full_name,
        target_type: "Campaign",
        target_id: id,
        target_name: title
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
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

  const isAdmin = user?.role === 'admin';

  const filteredCampaigns = campaigns.filter(c => 
    statusFilter === 'all' || c.status === statusFilter
  );

  // Stats
  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const totalTarget = activeCampaigns.reduce((sum, c) => sum + (c.target_amount || 0), 0);
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
        <CampaignAnalytics campaigns={campaigns} challans={challans} showReports={true} />
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
                <p className="text-sm text-slate-500">Total Target</p>
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
            const progress = campaign.target_amount > 0 
              ? Math.min((campaign.collected_amount / campaign.target_amount) * 100, 100)
              : 0;
            const daysLeft = differenceInDays(new Date(campaign.end_date), new Date());
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
                            onClick={() => deleteMutation.mutate({ id: campaign.id, title: campaign.title })}
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

                  <Progress value={progress} className="h-2 mb-3" />
                  
                  <div className="flex items-center justify-between text-sm mb-4">
                    <span className="text-emerald-600 font-medium">
                      ₹{(campaign.collected_amount || 0).toLocaleString()}
                    </span>
                    <span className="text-slate-500">
                      of ₹{campaign.target_amount.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {campaign.participants_count || 0} donors
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {daysLeft > 0 ? `${daysLeft} days left` : 'Ended'}
                    </div>
                  </div>

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
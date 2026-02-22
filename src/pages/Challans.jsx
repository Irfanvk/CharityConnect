import React, { useState, useEffect } from "react";
import { charityClient } from "@/api/charityClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, Search, MoreVertical, Upload, CheckCircle, XCircle, 
  Eye, Receipt, Clock, FileText, Image as ImageIcon 
} from "lucide-react";
import { format } from "date-fns";
import ChallanForm from "@/components/challans/ChallanForm";
import ProofUpload from "@/components/challans/ProofUpload";
import PullToRefresh from "@/components/mobile/PullToRefresh";

const statusConfig = {
  generated: { label: "Generated", color: "bg-slate-100 text-slate-700", icon: FileText },
  proof_uploaded: { label: "Proof Uploaded", color: "bg-blue-100 text-blue-700", icon: ImageIcon },
  pending: { label: "Pending Review", color: "bg-amber-100 text-amber-700", icon: Clock },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-rose-100 text-rose-700", icon: XCircle },
};

export default function Challans() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState(null);
  const [proofViewOpen, setProofViewOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [user, setUser] = useState(null);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    charityClient.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: challans = [], isLoading } = useQuery({
    queryKey: ['challans'],
    queryFn: () => charityClient.entities.Challan.list('-created_date'),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => charityClient.entities.Member.list(),
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => charityClient.entities.Campaign.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => charityClient.entities.Challan.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challans'] });
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => charityClient.entities.Challan.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['challans'] });
      
      // Snapshot previous value
      const previousChallans = queryClient.getQueryData(['challans']);
      
      // Optimistically update
      queryClient.setQueryData(['challans'], (old) =>
        old?.map((c) => (c.id === id ? { ...c, ...data } : c))
      );
      
      return { previousChallans };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['challans'], context.previousChallans);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challans'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setUploadOpen(false);
      setSelectedChallan(null);
      setRejectOpen(false);
    },
  });

  const isAdmin = user?.role === 'admin';

  const getSuggestedNumber = () => {
    const prefix = "CHN";
    const year = format(new Date(), 'yy');
    const count = challans.length + 1;
    return `${prefix}${year}-${String(count).padStart(4, '0')}`;
  };

  const handleApprove = async (challan) => {
    await updateMutation.mutateAsync({
      id: challan.id,
      data: {
        status: 'approved',
        approved_by: user?.email,
        approved_at: new Date().toISOString()
      }
    });

    // Update campaign collected amount if donation
    if (challan.type === 'donation' && challan.campaign_id) {
      const campaign = campaigns.find(c => c.id === challan.campaign_id);
      if (campaign) {
        await charityClient.entities.Campaign.update(campaign.id, {
          collected_amount: (campaign.collected_amount || 0) + challan.amount,
          participants_count: (campaign.participants_count || 0) + 1
        });
      }
    }

    // Log audit
    await charityClient.entities.AuditLog.create({
      action_type: "challan_approved",
      performed_by: user?.email,
      performed_by_name: user?.full_name,
      target_type: "Challan",
      target_id: challan.id,
      target_name: challan.challan_number,
      details: { amount: challan.amount, member: challan.member_name }
    });
  };

  const handleReject = async () => {
    await updateMutation.mutateAsync({
      id: selectedChallan.id,
      data: {
        status: 'rejected',
        rejection_reason: rejectReason,
        approved_by: user?.email,
        approved_at: new Date().toISOString()
      }
    });

    // Log audit
    await charityClient.entities.AuditLog.create({
      action_type: "challan_rejected",
      performed_by: user?.email,
      performed_by_name: user?.full_name,
      target_type: "Challan",
      target_id: selectedChallan.id,
      target_name: selectedChallan.challan_number,
      details: { 
        amount: selectedChallan.amount, 
        member: selectedChallan.member_name,
        reason: rejectReason 
      }
    });

    setRejectReason("");
  };

  // Filter challans based on user role
  let displayChallans = challans;
  if (!isAdmin) {
    displayChallans = challans.filter(c => c.created_by === user?.email);
  }

  const filteredChallans = displayChallans.filter(c => {
    const matchesSearch = 
      c.challan_number?.toLowerCase().includes(search.toLowerCase()) ||
      c.member_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['challans'] });
    await queryClient.invalidateQueries({ queryKey: ['members'] });
    await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Challans</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage payment challans and approvals</p>
        </div>
        <Button 
          onClick={() => setFormOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 select-none"
        >
          <Plus className="w-4 h-4 mr-2" />
          Generate Challan
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search challans..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="generated">Generated</TabsTrigger>
            <TabsTrigger value="proof_uploaded">Uploaded</TabsTrigger>
            {isAdmin && <TabsTrigger value="pending">Pending</TabsTrigger>}
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Challans Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Challan #</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Loading challans...
                  </TableCell>
                </TableRow>
              ) : filteredChallans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    No challans found
                  </TableCell>
                </TableRow>
              ) : (
                filteredChallans.map((challan) => {
                  const status = statusConfig[challan.status];
                  return (
                    <TableRow key={challan.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Receipt className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">{challan.challan_number}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-slate-900">{challan.member_name}</p>
                      </TableCell>
                      <TableCell>
                        {challan.type === 'monthly' ? (
                          <div className="space-y-1">
                            <Badge variant="outline" className="capitalize">
                              Monthly
                            </Badge>
                            {challan.months_count > 1 ? (
                              <p className="text-xs text-slate-500">
                                {challan.months_count} months ({format(new Date(challan.months_covered[0] + '-01'), 'MMM yy')} - {format(new Date(challan.months_covered[challan.months_covered.length - 1] + '-01'), 'MMM yy')})
                              </p>
                            ) : (
                              <p className="text-xs text-slate-500">
                                {format(new Date(challan.month + '-01'), 'MMM yyyy')}
                              </p>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="capitalize">
                            {challan.campaign_name || 'Donation'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-slate-900">₹{challan.amount}</span>
                      </TableCell>
                      <TableCell>
                        {format(new Date(challan.created_date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge className={status?.color}>
                            {status?.label}
                          </Badge>
                          {challan.status === 'rejected' && challan.rejection_reason && (
                            <p className="text-xs text-rose-600 mt-1">
                              Reason: {challan.rejection_reason}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {challan.proof_url && (
                              <DropdownMenuItem onClick={() => { setSelectedChallan(challan); setProofViewOpen(true); }}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Proof
                              </DropdownMenuItem>
                            )}
                            {challan.status === 'generated' && (
                              <DropdownMenuItem onClick={() => { setSelectedChallan(challan); setUploadOpen(true); }}>
                                <Upload className="w-4 h-4 mr-2" />
                                Upload Proof
                              </DropdownMenuItem>
                            )}
                            {isAdmin && (challan.status === 'proof_uploaded' || challan.status === 'pending') && (
                              <>
                                <DropdownMenuItem onClick={() => handleApprove(challan)} className="text-emerald-600">
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => { setSelectedChallan(challan); setRejectOpen(true); }}
                                  className="text-rose-600"
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Challan Form */}
      <ChallanForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={createMutation.mutateAsync}
        members={members}
        campaigns={campaigns}
        existingChallans={challans}
        suggestedNumber={getSuggestedNumber()}
        currentUser={user}
      />

      {/* Proof Upload */}
      <ProofUpload
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        challan={selectedChallan}
        onSubmit={(data) => updateMutation.mutateAsync({ id: selectedChallan?.id, data })}
      />

      {/* Proof View Dialog */}
      <Dialog open={proofViewOpen} onOpenChange={setProofViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Proof - {selectedChallan?.challan_number}</DialogTitle>
          </DialogHeader>
          {selectedChallan?.proof_url && (
            <img 
              src={selectedChallan.proof_url} 
              alt="Payment Proof" 
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Challan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleReject}
                className="bg-rose-600 hover:bg-rose-700"
                disabled={!rejectReason}
              >
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </PullToRefresh>
  );
}
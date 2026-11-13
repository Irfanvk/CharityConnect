import React, { useEffect, useMemo, useRef, useState } from "react";
import { charityClient } from "@/api/charityClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { AlertTriangle, CheckCircle2, ExternalLink, Layers, Loader2, Search, UserCog, XCircle } from "lucide-react";
import { format } from "@/lib/dateTime";
import { emitNotificationsChanged } from "@/lib/notificationState";
import { saveBulkGroup, updateBulkGroupStatus } from "@/lib/bulkGroupStore";
import { formatMonth } from "@/lib/challanStatus";

const MIN_REASON_LENGTH = 10;
const OWN_PAYMENT_LABEL = "Your payment — another admin will review";
const OWN_ENTRY_LABEL = "You entered this — another admin will review";
// Tab -> server status. History comes from the server, so every admin and device sees the same list.
const TAB_STATUS = { pending: "pending_approval", approved: "approved", rejected: "rejected", all: "all" };

export default function BulkOperationsPanel({ initialBulkGroupId = null }) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedBulkGroupId, setSelectedBulkGroupId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const didAutoOpenRef = useRef(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!initialBulkGroupId || didAutoOpenRef.current) return;
    setSelectedBulkGroupId(initialBulkGroupId);
    setDetailsOpen(true);
    didAutoOpenRef.current = true;
  }, [initialBulkGroupId]);

  const { data, isLoading } = useQuery({
    queryKey: ["bulk-operations", "pending", statusFilter],
    queryFn: async () => {
      const result = await charityClient.bulkOperations.listPending({
        status: TAB_STATUS[statusFilter] || "pending_approval",
        sort_by: "created_at",
        order: "desc",
        limit: 200,
      });
      // Keep the local group map current for the Challans page grouping.
      (result?.bulk_operations || []).forEach((op) => saveBulkGroup(op));
      return result;
    },
  });

  const bulkOperations = useMemo(() => data?.bulk_operations || [], [data]);

  const { data: selectedBulkDetails, isLoading: isDetailsLoading } = useQuery({
    queryKey: ["bulk-operations", "details", selectedBulkGroupId],
    queryFn: () => charityClient.bulkOperations.get(selectedBulkGroupId),
    enabled: Boolean(detailsOpen && selectedBulkGroupId),
  });

  const approveMutation = useMutation({
    mutationFn: (bulkGroupId) =>
      charityClient.bulkOperations.approve(bulkGroupId, {
        approved: true,
        admin_notes: "Approved from bulk operations dashboard",
      }),
    onSuccess: (_, bulkGroupId) => {
      updateBulkGroupStatus(bulkGroupId, "approved");
      queryClient.invalidateQueries({ queryKey: ["bulk-operations", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["challans"] });
      emitNotificationsChanged('updated');
      toast({
        title: "Bulk operation approved",
        description: "All linked challans were approved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Approval failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ bulkGroupId, reason }) =>
      charityClient.bulkOperations.reject(bulkGroupId, {
        reason,
        action: "reject", // keep the records so the member sees the reason
      }),
    onSuccess: () => {
      updateBulkGroupStatus(selectedBulkGroupId, "rejected");
      queryClient.invalidateQueries({ queryKey: ["bulk-operations", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["challans"] });
      emitNotificationsChanged('updated');
      setRejectDialogOpen(false);
      setRejectReason("");
      setSelectedBulkGroupId(null);
      toast({
        title: "Bulk operation rejected",
        description: "All linked challans in this group were rejected.",
      });
    },
    onError: (error) => {
      toast({
        title: "Rejection failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const openRejectDialog = (bulkGroupId) => {
    setSelectedBulkGroupId(bulkGroupId);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const openDetailsDialog = (bulkGroupId) => {
    setSelectedBulkGroupId(bulkGroupId);
    setDetailsOpen(true);
  };

  const handleReject = async () => {
    if (!selectedBulkGroupId || rejectReason.trim().length < MIN_REASON_LENGTH) return;
    await rejectMutation.mutateAsync({
      bulkGroupId: selectedBulkGroupId,
      reason: rejectReason.trim(),
    });
  };

  const { data: currentUser } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => charityClient.auth.me(),
  });

  // Separation of duties: an admin never reviews their own payment, nor one they entered.
  const reviewBlock = (op) => {
    if (!op || currentUser?.id == null) return null;
    const me = Number(currentUser.id);
    if (op.member_user_id != null && Number(op.member_user_id) === me) return OWN_PAYMENT_LABEL;
    if (op.created_by_user_id != null && Number(op.created_by_user_id) === me) return OWN_ENTRY_LABEL;
    return null;
  };

  const proofUrl = selectedBulkDetails?.proof_url || null;
  const proofLower = String(proofUrl || "").toLowerCase();
  const isPdfProof = proofLower.endsWith(".pdf");

  const isPending = (op) => {
    const s = String(op?.status || "").toLowerCase();
    return s === "pending_approval" || s === "pending";
  };

  const filteredOps = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bulkOperations;
    return bulkOperations.filter(
      (op) =>
        (op.member_name || "").toLowerCase().includes(q) ||
        (op.member_code || "").toLowerCase().includes(q) ||
        String(op.bulk_group_id || "").toLowerCase().includes(q) ||
        (op.member_email || "").toLowerCase().includes(q)
    );
  }, [bulkOperations, search]);

  const pendingCount = data?.pending ?? 0;
  const monthsLabel = (op) => (op?.months || []).map(formatMonth).join(", ");

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Layers className="w-5 h-5 text-indigo-600" />
              Bulk Operations
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {pendingCount} pending
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search + filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name, member ID or group ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-auto">
              <TabsList>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-500">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Loading bulk operations...
            </div>
          ) : filteredOps.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              {bulkOperations.length === 0
                ? statusFilter === "pending" ? "Nothing waiting for review." : "No bulk operations found."
                : "No operations match your search."}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOps.map((bulk) => {
                const opIsPending = isPending(bulk);
                const opStatus = String(bulk?.status || "").toLowerCase();
                const statusBadge = opIsPending
                  ? <Badge className="bg-amber-100 text-amber-700 border-0">Pending Review</Badge>
                  : opStatus === "approved"
                    ? <Badge className="bg-emerald-100 text-emerald-700 border-0">Approved</Badge>
                    : opStatus === "rejected"
                      ? <Badge className="bg-rose-100 text-rose-700 border-0">Rejected</Badge>
                      : <Badge variant="outline">{bulk.status}</Badge>;

                return (
                  <div
                    key={bulk.bulk_group_id}
                    className="rounded-lg border border-slate-200 p-4 bg-white dark:bg-slate-900"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900 dark:text-white">{bulk.member_name || "Member"}</p>
                          {bulk.member_code && <span className="text-xs text-slate-500">{bulk.member_code}</span>}
                          {statusBadge}
                        </div>
                        <p className="text-sm text-slate-600">{bulk.months_count || bulk.months?.length || 0} month(s) · ₹{Number(bulk.total_amount || 0).toLocaleString()} <span className="text-slate-400">(₹{Number(bulk.amount_per_month || 0).toLocaleString()}/month)</span></p>
                        {monthsLabel(bulk) && <p className="text-xs text-slate-500">{monthsLabel(bulk)}</p>}
                        <p className="text-xs text-slate-500">{bulk.created_at ? format(new Date(bulk.created_at), "MMM d, yyyy h:mm a") : "-"}</p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {bulk.entered_by_admin && (
                            <Badge variant="outline" className="gap-1 text-xs"><UserCog className="h-3 w-3" />Entered by {bulk.created_by_name || "an admin"}</Badge>
                          )}
                          {bulk.has_proof === false && (
                            <Badge className="gap-1 border-0 bg-amber-100 text-xs text-amber-800"><AlertTriangle className="h-3 w-3" />No proof</Badge>
                          )}
                          {bulk.challans_missing && (
                            <Badge variant="outline" className="text-xs">Months deleted (older app)</Badge>
                          )}
                        </div>
                        {opStatus === "approved" && bulk.approved_by_name && (
                          <p className="text-xs text-emerald-700">Approved by {bulk.approved_by_name}</p>
                        )}
                        {opStatus === "rejected" && bulk.rejection_reason && (
                          <p className="text-xs text-rose-700">Reason: {bulk.rejection_reason}</p>
                        )}
                        <p className="text-xs text-slate-400 font-mono">Group: {bulk.bulk_group_id}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          onClick={() => openDetailsDialog(bulk.bulk_group_id)}
                        >
                          View Details
                        </Button>
                        {opIsPending && reviewBlock(bulk) && (
                          <p className="text-xs text-slate-500 italic self-center">{reviewBlock(bulk)}</p>
                        )}
                        {opIsPending && !reviewBlock(bulk) && (
                          <>
                            <Button
                              className="bg-emerald-600 hover:bg-emerald-700"
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                              onClick={() => approveMutation.mutate(bulk.bulk_group_id)}
                            >
                              {approveMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                              )}
                              Approve All
                            </Button>
                            <Button
                              variant="destructive"
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                              onClick={() => openRejectDialog(bulk.bulk_group_id)}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject All
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Bulk Operation Details</DialogTitle>
          </DialogHeader>

          {isDetailsLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-500">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Loading bulk operation details...
            </div>
          ) : !selectedBulkDetails ? (
            <div className="text-center py-8 text-slate-500">No details available.</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-slate-500">Member</p>
                  <p className="font-medium">{selectedBulkDetails.member_name || "-"}</p>
                  <p className="text-sm text-slate-600">{[selectedBulkDetails.member_code, selectedBulkDetails.member_email].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-slate-500">Summary</p>
                  <p className="font-medium">{selectedBulkDetails.months_count || selectedBulkDetails.months?.length || 0} month(s) · ₹{Number(selectedBulkDetails.amount_per_month || 0).toLocaleString()}/month</p>
                  <p className="text-sm text-slate-600">Total ₹{Number(selectedBulkDetails.total_amount || 0).toLocaleString()}</p>
                </div>
              </div>

              {selectedBulkDetails.entered_by_admin && (
                <p className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <UserCog className="h-4 w-4 shrink-0" />
                  Entered by {selectedBulkDetails.created_by_name || "an admin"} for this member. A different admin must approve it.
                </p>
              )}
              {selectedBulkDetails.has_proof === false && (
                <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">No proof attached</p>
                    <p>Reason given: {selectedBulkDetails.notes || "none"}</p>
                  </div>
                </div>
              )}
              {String(selectedBulkDetails.status || "").toLowerCase() === "rejected" && selectedBulkDetails.rejection_reason && (
                <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">Rejected: {selectedBulkDetails.rejection_reason}</p>
              )}

              {proofUrl && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-slate-500 mb-2">Proof Preview</p>
                  {isPdfProof ? (
                    <a
                      href={proofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open PDF proof
                    </a>
                  ) : (
                    <img
                      src={proofUrl}
                      alt="Bulk proof"
                      className="max-h-64 rounded-md object-contain bg-slate-50"
                    />
                  )}
                </div>
              )}

              <div className="rounded-lg border p-3">
                <p className="text-xs text-slate-500 mb-2">Linked Challans</p>
                <div className="max-h-56 overflow-y-auto space-y-2">
                  {(selectedBulkDetails.linked_challans || []).length === 0 ? (
                    <p className="text-sm text-slate-500">The months of this payment were deleted by an older version of the app.</p>
                  ) : (
                    selectedBulkDetails.linked_challans.map((entry) => (
                      <div key={entry.challan_id} className="flex items-center justify-between p-2 rounded bg-slate-50">
                        <div>
                          <p className="text-sm font-medium">{entry.month ? formatMonth(entry.month) : "-"}</p>
                          <p className="text-xs text-slate-500">Challan #{entry.challan_id}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">₹{Number(entry.amount || 0).toLocaleString()}</p>
                          <p className="text-xs text-slate-500">{entry.status || "pending"}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                  Close
                </Button>
                {!isPending(selectedBulkDetails) ? null : reviewBlock(selectedBulkDetails) ? (
                  <p className="text-xs text-slate-500 italic self-center">{reviewBlock(selectedBulkDetails)}</p>
                ) : (
                  <>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  onClick={() => {
                    approveMutation.mutate(selectedBulkDetails.bulk_group_id || selectedBulkGroupId);
                    setDetailsOpen(false);
                  }}
                >
                  Approve All
                </Button>
                <Button
                  variant="destructive"
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  onClick={() => {
                    setDetailsOpen(false);
                    openRejectDialog(selectedBulkDetails.bulk_group_id || selectedBulkGroupId);
                  }}
                >
                  Reject All
                </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Bulk Operation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Enter rejection reason (min 10 characters)..."
              rows={4}
            />
            <p className={`text-xs ${rejectReason.trim().length < MIN_REASON_LENGTH ? "text-rose-600" : "text-slate-500"}`}>
              {rejectReason.trim().length}/{MIN_REASON_LENGTH} characters minimum
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={rejectReason.trim().length < MIN_REASON_LENGTH || rejectMutation.isPending}
                onClick={handleReject}
              >
                {rejectMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Reject All
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

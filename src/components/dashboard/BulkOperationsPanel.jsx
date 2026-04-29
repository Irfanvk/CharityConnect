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
import { CheckCircle2, ExternalLink, Layers, Loader2, Search, XCircle } from "lucide-react";
import { format } from "date-fns";
import { emitNotificationsChanged } from "@/lib/notificationState";
import { loadBulkGroups, saveBulkGroup, updateBulkGroupStatus } from "@/lib/bulkGroupStore";

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
    queryKey: ["bulk-operations", "pending"],
    queryFn: async () => {
      const result = await charityClient.bulkOperations.listPending({
        days: 365,
        sort_by: "created_at",
        order: "desc",
      });
      // Persist API results into localStorage so they survive page reloads
      // and are visible to the Challans grouping logic too.
      const ops = result?.bulk_operations || [];
      ops.forEach((op) => saveBulkGroup(op));
      return result;
    },
  });

  // Merge API results with localStorage so groups created on THIS device
  // (or in a previous session) are always visible — even if they've aged out
  // of the backend's pending-review window.
  const bulkOperations = useMemo(() => {
    const apiOps = data?.bulk_operations || [];
    const localOps = loadBulkGroups();

    const merged = new Map();
    // Local first (older / richer history), then API overwrites with fresh data
    localOps.forEach((op) => {
      if (op?.bulk_group_id) merged.set(String(op.bulk_group_id), op);
    });
    apiOps.forEach((op) => {
      if (op?.bulk_group_id) merged.set(String(op.bulk_group_id), op);
    });

    return Array.from(merged.values()).sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );
  }, [data]);

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
        action: "delete",
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
    if (!selectedBulkGroupId || !rejectReason.trim()) return;
    await rejectMutation.mutateAsync({
      bulkGroupId: selectedBulkGroupId,
      reason: rejectReason.trim(),
    });
  };

  const proofUrl = selectedBulkDetails?.proof_url || null;
  const proofLower = String(proofUrl || "").toLowerCase();
  const isPdfProof = proofLower.endsWith(".pdf");

  // Status normalisation: backend returns "pending_approval", localStorage may
  // store "approved" / "rejected" / "pending_approval".
  const isPending = (op) => {
    const s = String(op?.status || "").toLowerCase();
    return s === "pending_approval" || s === "pending";
  };

  const filteredOps = useMemo(() => {
    let ops = bulkOperations;

    if (statusFilter === "pending") {
      ops = ops.filter(isPending);
    } else if (statusFilter === "approved") {
      ops = ops.filter((op) => String(op?.status || "").toLowerCase() === "approved");
    } else if (statusFilter === "rejected") {
      ops = ops.filter((op) => String(op?.status || "").toLowerCase() === "rejected");
    }

    const q = search.trim().toLowerCase();
    if (q) {
      ops = ops.filter(
        (op) =>
          (op.member_name || "").toLowerCase().includes(q) ||
          String(op.bulk_group_id || "").toLowerCase().includes(q) ||
          (op.member_email || "").toLowerCase().includes(q)
      );
    }

    return ops;
  }, [bulkOperations, statusFilter, search]);

  const pendingCount = useMemo(
    () => bulkOperations.filter(isPending).length,
    [bulkOperations]
  );

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
                placeholder="Search by member name or group ID…"
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
                ? "No bulk operations found."
                : "No operations match your filter."}
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
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900 dark:text-white">{bulk.member_name || "Member"}</p>
                          {statusBadge}
                        </div>
                        <p className="text-sm text-slate-600">{bulk.months_count || bulk.months?.length || 0} month(s) · ₹{Number(bulk.total_amount || 0).toLocaleString()}</p>
                        <p className="text-xs text-slate-500">{bulk.created_at ? format(new Date(bulk.created_at), "MMM d, yyyy h:mm a") : "-"}</p>
                        <p className="text-xs text-slate-500 font-mono">Group: {bulk.bulk_group_id}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          onClick={() => openDetailsDialog(bulk.bulk_group_id)}
                        >
                          View Details
                        </Button>
                        {opIsPending && (
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
                  <p className="text-sm text-slate-600">{selectedBulkDetails.member_email || ""}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-slate-500">Summary</p>
                  <p className="font-medium">{selectedBulkDetails.months_count || selectedBulkDetails.months?.length || 0} month(s)</p>
                  <p className="text-sm text-slate-600">₹{Number(selectedBulkDetails.total_amount || 0).toLocaleString()}</p>
                </div>
              </div>

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
                    <p className="text-sm text-slate-500">No linked challans returned.</p>
                  ) : (
                    selectedBulkDetails.linked_challans.map((entry) => (
                      <div key={entry.challan_id} className="flex items-center justify-between p-2 rounded bg-slate-50">
                        <div>
                          <p className="text-sm font-medium">Challan #{entry.challan_id}</p>
                          <p className="text-xs text-slate-500">Month: {entry.month || "-"}</p>
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
              placeholder="Enter rejection reason..."
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={!rejectReason.trim() || rejectMutation.isPending}
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

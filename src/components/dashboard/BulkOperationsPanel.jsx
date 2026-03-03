import React, { useMemo, useState } from "react";
import { charityClient } from "@/api/charityClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle2, Layers, Loader2, XCircle } from "lucide-react";
import { format } from "date-fns";

export default function BulkOperationsPanel() {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedBulkGroupId, setSelectedBulkGroupId] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["bulk-operations", "pending"],
    queryFn: () =>
      charityClient.bulkOperations.listPending({
        days: 7,
        sort_by: "created_at",
        order: "desc",
      }),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bulk-operations", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["challans"] });
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
      queryClient.invalidateQueries({ queryKey: ["bulk-operations", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["challans"] });
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
              {data?.pending ?? bulkOperations.length} pending
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-500">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Loading bulk operations...
            </div>
          ) : bulkOperations.length === 0 ? (
            <div className="text-center py-10 text-slate-500">No pending bulk operations.</div>
          ) : (
            <div className="space-y-3">
              {bulkOperations.map((bulk) => (
                <div
                  key={bulk.bulk_group_id}
                  className="rounded-lg border border-slate-200 p-4 bg-white dark:bg-slate-900"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-900 dark:text-white">{bulk.member_name || "Member"}</p>
                      <p className="text-sm text-slate-600">{bulk.months_count || bulk.months?.length || 0} month(s) · ₹{Number(bulk.total_amount || 0).toLocaleString()}</p>
                      <p className="text-xs text-slate-500">{bulk.created_at ? format(new Date(bulk.created_at), "MMM d, yyyy h:mm a") : "-"}</p>
                      <p className="text-xs text-slate-500">Group: {bulk.bulk_group_id}</p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        onClick={() => openDetailsDialog(bulk.bulk_group_id)}
                      >
                        View Details
                      </Button>
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
                    </div>
                  </div>
                </div>
              ))}
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

              {selectedBulkDetails.proof_url && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-slate-500 mb-2">Proof Preview</p>
                  <img
                    src={selectedBulkDetails.proof_url}
                    alt="Bulk proof"
                    className="max-h-64 rounded-md object-contain bg-slate-50"
                  />
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

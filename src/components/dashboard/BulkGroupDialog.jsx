import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { charityClient } from "@/api/charityClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { AlertTriangle, ExternalLink, Loader2, UserCog } from "lucide-react";
import { emitNotificationsChanged } from "@/lib/notificationState";
import { updateBulkGroupStatus } from "@/lib/bulkGroupStore";
import { formatMonth } from "@/lib/challanStatus";

export const MIN_REASON_LENGTH = 10;
const OWN_PAYMENT_LABEL = "Your payment — another admin will review";
const OWN_ENTRY_LABEL = "You entered this — another admin will review";

export const isPendingGroup = (op) => {
  const s = String(op?.status || "").toLowerCase();
  return s === "pending_approval" || s === "pending";
};

export function BulkStatusBadge({ status }) {
  const s = String(status || "").toLowerCase();
  if (s === "pending_approval" || s === "pending") return <Badge className="bg-amber-100 text-amber-700 border-0">Pending Review</Badge>;
  if (s === "approved") return <Badge className="bg-emerald-100 text-emerald-700 border-0">Approved</Badge>;
  if (s === "rejected") return <Badge className="bg-rose-100 text-rose-700 border-0">Rejected</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

// Approve / reject a bulk group, plus the separation-of-duties rule for the signed-in admin.
export function useBulkReview() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: currentUser } = useQuery({ queryKey: ["auth", "me"], queryFn: () => charityClient.auth.me() });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["bulk-operations"] });
    queryClient.invalidateQueries({ queryKey: ["challans"] });
    emitNotificationsChanged("updated");
  };

  const approveMutation = useMutation({
    mutationFn: (bulkGroupId) =>
      charityClient.bulkOperations.approve(bulkGroupId, { approved: true, admin_notes: "Approved from bulk operations" }),
    onSuccess: (_, bulkGroupId) => {
      updateBulkGroupStatus(bulkGroupId, "approved");
      refresh();
      toast({ title: "Bulk operation approved", description: "All linked challans were approved." });
    },
    onError: (error) => toast({ title: "Approval failed", description: error?.message || "Please try again.", variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    // keep the records so the member sees the reason
    mutationFn: ({ bulkGroupId, reason }) => charityClient.bulkOperations.reject(bulkGroupId, { reason, action: "reject" }),
    onSuccess: (_, { bulkGroupId }) => {
      updateBulkGroupStatus(bulkGroupId, "rejected");
      refresh();
      toast({ title: "Bulk operation rejected", description: "All linked challans in this group were rejected." });
    },
    onError: (error) => toast({ title: "Rejection failed", description: error?.message || "Please try again.", variant: "destructive" }),
  });

  // An admin never reviews their own payment, nor one they entered.
  const reviewBlock = (op) => {
    if (!op || currentUser?.id == null) return null;
    const me = Number(currentUser.id);
    if (op.member_user_id != null && Number(op.member_user_id) === me) return OWN_PAYMENT_LABEL;
    if (op.created_by_user_id != null && Number(op.created_by_user_id) === me) return OWN_ENTRY_LABEL;
    return null;
  };

  const busy = approveMutation.isPending || rejectMutation.isPending;
  return { approveMutation, rejectMutation, reviewBlock, busy };
}

/**
 * Details of one bulk (multi-month) payment, with Approve / Reject while it is pending.
 * startWith="reject" opens straight on the rejection reason.
 */
export default function BulkGroupDialog({ bulkGroupId, open, onOpenChange, startWith = "details" }) {
  const [view, setView] = useState(startWith);
  const [reason, setReason] = useState("");
  const { approveMutation, rejectMutation, reviewBlock, busy } = useBulkReview();

  useEffect(() => {
    if (!open) return;
    setView(startWith);
    setReason("");
  }, [open, startWith, bulkGroupId]);

  const { data: details, isLoading } = useQuery({
    queryKey: ["bulk-operations", "details", bulkGroupId],
    queryFn: () => charityClient.bulkOperations.get(bulkGroupId),
    enabled: Boolean(open && bulkGroupId),
  });

  const groupId = details?.bulk_group_id || bulkGroupId;
  const proofUrl = details?.proof_url || null;
  const isPdfProof = String(proofUrl || "").toLowerCase().endsWith(".pdf");
  const blocked = reviewBlock(details);

  const reject = async () => {
    if (reason.trim().length < MIN_REASON_LENGTH) return;
    try {
      await rejectMutation.mutateAsync({ bulkGroupId: groupId, reason: reason.trim() });
      onOpenChange(false);
    } catch {
      // the error toast is shown; keep the reason so it can be sent again
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={view === "reject" ? "max-w-md" : "max-w-3xl max-h-[92vh] overflow-y-auto"}>
        <DialogHeader>
          <DialogTitle>{view === "reject" ? "Reject Bulk Operation" : "Bulk Operation Details"}</DialogTitle>
        </DialogHeader>

        {view === "reject" ? (
          <div className="space-y-4">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter rejection reason (min 10 characters)..."
              rows={4}
            />
            <p className={`text-xs ${reason.trim().length < MIN_REASON_LENGTH ? "text-rose-600" : "text-slate-500"}`}>
              {reason.trim().length}/{MIN_REASON_LENGTH} characters minimum
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => (startWith === "reject" ? onOpenChange(false) : setView("details"))}>
                {startWith === "reject" ? "Cancel" : "Back"}
              </Button>
              <Button variant="destructive" disabled={reason.trim().length < MIN_REASON_LENGTH || busy} onClick={reject}>
                {rejectMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Reject All
              </Button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-10 text-slate-500">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Loading bulk operation details...
          </div>
        ) : !details ? (
          <div className="text-center py-8 text-slate-500">No details available.</div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <BulkStatusBadge status={details.status} />
              <span className="font-mono text-xs text-slate-500">Group: {groupId}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-slate-500">Member</p>
                <p className="font-medium">{details.member_name || "-"}</p>
                <p className="text-sm text-slate-600 break-all">{[details.member_code, details.member_email].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-slate-500">Summary</p>
                <p className="font-medium">{details.months_count || details.months?.length || 0} month(s) · ₹{Number(details.amount_per_month || 0).toLocaleString()}/month</p>
                <p className="text-sm text-slate-600">Total ₹{Number(details.total_amount || 0).toLocaleString()}</p>
              </div>
            </div>

            {details.entered_by_admin && (
              <p className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <UserCog className="h-4 w-4 shrink-0" />
                Entered by {details.created_by_name || "an admin"} for this member. A different admin must approve it.
              </p>
            )}
            {details.has_proof === false && (
              <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">No proof attached</p>
                  <p>Reason given: {details.notes || "none"}</p>
                </div>
              </div>
            )}
            {String(details.status || "").toLowerCase() === "approved" && details.approved_by_name && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Approved by {details.approved_by_name}</p>
            )}
            {String(details.status || "").toLowerCase() === "rejected" && details.rejection_reason && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">Rejected: {details.rejection_reason}</p>
            )}

            {proofUrl && (
              <div className="rounded-lg border p-3">
                <p className="text-xs text-slate-500 mb-2">Proof Preview</p>
                {isPdfProof ? (
                  <a href={proofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline">
                    <ExternalLink className="w-4 h-4" />
                    Open PDF proof
                  </a>
                ) : (
                  <a href={proofUrl} target="_blank" rel="noreferrer">
                    <img src={proofUrl} alt="Bulk proof" className="max-h-64 rounded-md object-contain bg-slate-50" />
                  </a>
                )}
              </div>
            )}

            <div className="rounded-lg border p-3">
              <p className="text-xs text-slate-500 mb-2">Linked Challans</p>
              <div className="max-h-56 overflow-y-auto space-y-2">
                {(details.linked_challans || []).length === 0 ? (
                  <p className="text-sm text-slate-500">The months of this payment were deleted by an older version of the app.</p>
                ) : (
                  details.linked_challans.map((entry) => (
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

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              {!isPendingGroup(details) ? null : blocked ? (
                <p className="text-xs text-slate-500 italic self-center">{blocked}</p>
              ) : (
                <>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={busy}
                    onClick={async () => {
                      try {
                        await approveMutation.mutateAsync(groupId);
                        onOpenChange(false);
                      } catch {
                        // the error toast is shown; keep the dialog open
                      }
                    }}
                  >
                    {approveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Approve All
                  </Button>
                  <Button variant="destructive" disabled={busy} onClick={() => setView("reject")}>
                    Reject All
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

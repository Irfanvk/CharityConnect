import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { charityClient } from "@/api/charityClient";
import { queryKeys } from "@/lib/queryKeys";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Inbox } from "lucide-react";
import { format } from "date-fns";

const typeLabel = {
  monthly_amount_change: "Monthly Change",
  profile_update: "Profile Update",
  complaint: "Complaint",
  suggestion: "Suggestion",
  general: "General",
};

export default function AdminRequests() {
  const [status, setStatus] = useState("all");
  const [requestType, setRequestType] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const pageSize = 20;

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: user } = useQuery({
    queryKey: ["auth", "me", "admin-requests"],
    queryFn: () => charityClient.auth.me(),
  });

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  const { data: requestPage = { items: [], total: 0, skip: 0, limit: pageSize }, isLoading } = useQuery({
    queryKey: queryKeys.requests.all({ status, requestType, search, currentPage, pageSize }),
    queryFn: () =>
      charityClient.requests.adminList({
        ...(status !== "all" ? { status } : {}),
        ...(requestType !== "all" ? { request_type: requestType } : {}),
        skip: (currentPage - 1) * pageSize,
        limit: pageSize,
      }),
    enabled: isAdmin,
  });

  const approveMutation = useMutation({
    mutationFn: ({ requestId, notes }) => charityClient.requests.approve(requestId, notes),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast({ title: "Request approved", description: "Member has been notified." });
      setReviewOpen(false);
      setSelectedRequest(null);
      setAdminNotes("");
      setRejectionReason("");
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
    mutationFn: ({ requestId, reason, notes }) => charityClient.requests.reject(requestId, reason, notes),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast({ title: "Request rejected", description: "Member has been notified." });
      setReviewOpen(false);
      setSelectedRequest(null);
      setAdminNotes("");
      setRejectionReason("");
    },
    onError: (error) => {
      toast({
        title: "Rejection failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredItems = useMemo(() => {
    if (!search.trim()) return requestPage.items;
    const term = search.trim().toLowerCase();
    return requestPage.items.filter((request) => {
      return (
        String(request?.member_name || "").toLowerCase().includes(term) ||
        String(request?.member_code || "").toLowerCase().includes(term) ||
        String(request?.subject || "").toLowerCase().includes(term) ||
        String(request?.message || "").toLowerCase().includes(term)
      );
    });
  }, [requestPage.items, search]);

  if (!isAdmin) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-12 text-center text-slate-500">Admin access required.</CardContent>
      </Card>
    );
  }

  const totalPages = Math.max(1, Math.ceil(Number(requestPage.total || 0) / pageSize));
  const pendingCount = requestPage.items.filter((request) => request.status === "pending").length;
  const approvedCount = requestPage.items.filter((request) => request.status === "approved").length;
  const rejectedCount = requestPage.items.filter((request) => request.status === "rejected").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Member Requests</h1>
        <p className="text-slate-500">Review and action member requests.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-slate-500">Pending</p><p className="text-2xl font-bold text-amber-700">{pendingCount}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-slate-500">Approved</p><p className="text-2xl font-bold text-emerald-700">{approvedCount}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-slate-500">Rejected</p><p className="text-2xl font-bold text-rose-700">{rejectedCount}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Input placeholder="Search member/subject..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={requestType} onValueChange={setRequestType}>
          <SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="monthly_amount_change">Monthly Change</SelectItem>
            <SelectItem value="profile_update">Profile Update</SelectItem>
            <SelectItem value="complaint">Complaint</SelectItem>
            <SelectItem value="suggestion">Suggestion</SelectItem>
            <SelectItem value="general">General</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue placeholder="All status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center text-slate-500">Loading requests...</CardContent></Card>
      ) : filteredItems.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-slate-500">
            <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No requests found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((request) => (
            <Card key={request.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900">{request.member_name || "Member"}</p>
                      {request.member_code && <Badge variant="outline">{request.member_code}</Badge>}
                      <Badge variant="outline">{typeLabel[request.request_type] || request.request_type}</Badge>
                      <Badge className={request.status === "pending" ? "bg-amber-100 text-amber-700" : request.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}>{request.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-800">{request.subject || "Request"}</p>
                    <p className="text-sm text-slate-600 line-clamp-2">{request.message}</p>
                    <p className="mt-1 text-xs text-slate-500">{format(new Date(request.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedRequest(request);
                      setReviewOpen(true);
                    }}
                  >
                    {request.status === "pending" ? "Review" : "View"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>Previous</Button>
            <span className="text-xs text-slate-500">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Next</Button>
          </div>
        </div>
      )}

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Review</DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-slate-500">Member</p><p className="font-medium">{selectedRequest.member_name} ({selectedRequest.member_code})</p></div>
                <div><p className="text-slate-500">Type</p><p className="font-medium">{typeLabel[selectedRequest.request_type] || selectedRequest.request_type}</p></div>
              </div>

              {selectedRequest.request_type === "monthly_amount_change" && (
                <div className="rounded-md border p-3 text-sm space-y-1">
                  <p>Current monthly amount: Rs {Number(selectedRequest.current_amount || 0).toLocaleString()}</p>
                  <p>Requested amount: Rs {Number(selectedRequest.requested_amount || 0).toLocaleString()}</p>
                </div>
              )}

              {selectedRequest.request_type === "profile_update" && (
                <div className="rounded-md border p-3 text-sm">
                  <p className="font-medium text-slate-800 mb-2">Requested changes</p>
                  <pre className="text-xs bg-slate-50 rounded p-2 overflow-auto">{selectedRequest.requested_changes || "{}"}</pre>
                </div>
              )}

              <div className="rounded-md border p-3 text-sm">
                <p className="font-medium text-slate-800 mb-1">Member message</p>
                <p className="text-slate-700">{selectedRequest.message}</p>
              </div>

              {selectedRequest.status === "pending" ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Admin notes (optional)</label>
                    <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Rejection reason (required for reject)</label>
                    <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={3} />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="destructive"
                      className="flex-1"
                      disabled={rejectMutation.isPending || !rejectionReason.trim()}
                      onClick={() => rejectMutation.mutate({ requestId: selectedRequest.id, reason: rejectionReason, notes: adminNotes })}
                    >
                      {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject"}
                    </Button>
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      disabled={approveMutation.isPending}
                      onClick={() => approveMutation.mutate({ requestId: selectedRequest.id, notes: adminNotes })}
                    >
                      {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve"}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-600 rounded-md border p-3">
                  Status: <strong>{selectedRequest.status}</strong>
                  {selectedRequest.admin_notes ? <p className="mt-2">Admin notes: {selectedRequest.admin_notes}</p> : null}
                  {selectedRequest.rejection_reason ? <p className="mt-2">Reason: {selectedRequest.rejection_reason}</p> : null}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

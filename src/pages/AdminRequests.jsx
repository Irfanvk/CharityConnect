import React, { useState } from "react";
import { formatMemberId, sanitizeShareUrl } from "@/lib/utils";
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
import { Loader2, Inbox, KeyRound, MessageCircle, CheckCircle2, Receipt } from "lucide-react";
import { format } from "@/lib/dateTime";
import { useMemo } from "react";
import { emitNotificationsChanged } from "@/lib/notificationState";

const typeLabel = {
  monthly_amount_change: "Monthly Change",
  profile_update: "Profile Update",
  complaint: "Complaint",
  suggestion: "Suggestion",
  general: "General",
};

const getRequestLabel = (request) => {
  if (request.request_type === "profile_update") {
    try {
      const changes = typeof request.requested_changes === "string"
        ? JSON.parse(request.requested_changes)
        : request.requested_changes;
      if (changes?.username) return "Username Change";
    } catch {}
  }
  return typeLabel[request.request_type] || request.request_type;
};

export default function AdminRequests() {
  const [activeTab, setActiveTab] = useState("member"); // "member" | "password" | "challans"
  const [status, setStatus] = useState("all");
  const [requestType, setRequestType] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const pageSize = 20;

  // Bulk selection state (Member Requests tab)
  const [selectedRequestIds, setSelectedRequestIds] = useState([]);
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState("");

  // Password reset state
  const [prStatus, setPrStatus] = useState("pending");
  const [prReviewOpen, setPrReviewOpen] = useState(false);
  const [selectedPrRequest, setSelectedPrRequest] = useState(null);
  const [prAdminNotes, setPrAdminNotes] = useState("");
  const [prRejectionReason, setPrRejectionReason] = useState("");
  const [prApprovedResult, setPrApprovedResult] = useState(null); // holds approval response for WhatsApp share

  // Pending challans (individual + bulk) state
  const [challanReviewOpen, setChallanReviewOpen] = useState(false);
  const [selectedChallanItem, setSelectedChallanItem] = useState(null);
  const [challanRejectReason, setChallanRejectReason] = useState("");
  const [approvingChallanKey, setApprovingChallanKey] = useState(null);

  // Sanitise any backend-generated URL that may contain a localhost origin
  const fixWhatsAppUrl = sanitizeShareUrl;

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
    enabled: isAdmin && activeTab === "member",
  });

  // Password reset requests query
  const { data: prRequests = [], isLoading: prLoading } = useQuery({
    queryKey: ["admin", "password-reset-requests", prStatus],
    queryFn: () => charityClient.admin.listPasswordResetRequests(
      prStatus !== "all" ? { status: prStatus } : {}
    ),
    enabled: isAdmin && activeTab === "password",
  });

  // Pending challans queries (individual + bulk groups awaiting review)
  const { data: pendingChallanPage = { items: [], total: 0 }, isLoading: pendingChallansLoading } = useQuery({
    queryKey: ["admin", "pending-challans"],
    queryFn: () => charityClient.challans.listPaginated({ status: "pending", skip: 0, limit: 100 }),
    enabled: isAdmin && activeTab === "challans",
  });

  const { data: pendingBulkPage = { pending: 0, bulk_operations: [] }, isLoading: pendingBulkLoading } = useQuery({
    queryKey: ["admin", "pending-bulk"],
    queryFn: () => charityClient.bulkOperations.listPending(),
    enabled: isAdmin && activeTab === "challans",
  });

  const pendingChallanItems = useMemo(() => {
    const individual = (pendingChallanPage.items || []).map((c) => ({ ...c, is_bulk_group: false, key: `c-${c.id}` }));
    const bulk = (pendingBulkPage.bulk_operations || [])
      .filter((b) => b.status === "pending")
      .map((b) => ({ ...b, is_bulk_group: true, key: `b-${b.bulk_group_id}` }));
    return [...bulk, ...individual].sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );
  }, [pendingChallanPage.items, pendingBulkPage.bulk_operations]);

  const pendingChallanCount = Number(pendingChallanPage.total || 0) + Number(pendingBulkPage.pending || 0);

  const invalidatePendingChallans = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "pending-challans"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "pending-bulk"] });
  };

  const approveChallanMutation = useMutation({
    mutationFn: (item) =>
      item.is_bulk_group
        ? charityClient.bulkOperations.approve(item.bulk_group_id, { approved: true })
        : charityClient.challans.approve(item.id),
    onSuccess: () => {
      invalidatePendingChallans();
      emitNotificationsChanged('updated');
      toast({ title: "Challan approved." });
    },
    onError: (error) => {
      toast({ title: "Approval failed", description: error?.message || "Please try again.", variant: "destructive" });
    },
    onSettled: () => setApprovingChallanKey(null),
  });

  const rejectChallanMutation = useMutation({
    mutationFn: ({ item, reason }) =>
      item.is_bulk_group
        ? charityClient.bulkOperations.reject(item.bulk_group_id, { reason, action: "reject" })
        : charityClient.challans.reject(item.id, { rejection_reason: reason }),
    onSuccess: () => {
      invalidatePendingChallans();
      emitNotificationsChanged('updated');
      toast({ title: "Challan rejected." });
      setChallanReviewOpen(false);
      setSelectedChallanItem(null);
      setChallanRejectReason("");
    },
    onError: (error) => {
      toast({ title: "Rejection failed", description: error?.message || "Please try again.", variant: "destructive" });
    },
  });

  const handleApproveChallanItem = (item) => {
    if (approvingChallanKey) return;
    setApprovingChallanKey(item.key);
    approveChallanMutation.mutate(item);
  };

  const approveMutation = useMutation({
    mutationFn: ({ requestId, notes }) => charityClient.requests.approve(requestId, notes),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["requests"] });
      emitNotificationsChanged('updated');
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
      emitNotificationsChanged('updated');
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

  const prApproveMutation = useMutation({
    mutationFn: ({ id, notes }) => charityClient.admin.approvePasswordReset(id, notes),
    onSuccess: (data) => {
      // Show WhatsApp share dialog FIRST, then refresh list in background
      setPrApprovedResult(data);
      queryClient.invalidateQueries({ queryKey: ["admin", "password-reset-requests"] });
      emitNotificationsChanged('updated');
    },
    onError: (error) => {
      toast({ title: "Approval failed", description: error?.message || "Please try again.", variant: "destructive" });
    },
  });

  const prRejectMutation = useMutation({
    mutationFn: ({ id, reason, notes }) => charityClient.admin.rejectPasswordReset(id, reason, notes),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "password-reset-requests"] });
      emitNotificationsChanged('updated');
      toast({ title: "Reset request rejected." });
      setPrReviewOpen(false);
      setSelectedPrRequest(null);
      setPrRejectionReason("");
      setPrAdminNotes("");
    },
    onError: (error) => {
      toast({ title: "Rejection failed", description: error?.message || "Please try again.", variant: "destructive" });
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

  const selectablePendingIds = useMemo(
    () => filteredItems.filter((request) => request.status === "pending").map((request) => request.id),
    [filteredItems]
  );
  const allPendingSelected = selectablePendingIds.length > 0 && selectedRequestIds.length === selectablePendingIds.length;

  const toggleRequestSelected = (requestId) => {
    setSelectedRequestIds((prev) =>
      prev.includes(requestId) ? prev.filter((id) => id !== requestId) : [...prev, requestId]
    );
  };

  const toggleSelectAllPending = () => {
    setSelectedRequestIds(allPendingSelected ? [] : selectablePendingIds);
  };

  const clearSelection = () => setSelectedRequestIds([]);

  const bulkApproveMutation = useMutation({
    mutationFn: (ids) => Promise.all(ids.map((id) => charityClient.requests.approve(id, ""))),
    onSuccess: async (_data, ids) => {
      await queryClient.invalidateQueries({ queryKey: ["requests"] });
      emitNotificationsChanged('updated');
      toast({ title: `${ids.length} request(s) approved`, description: "Members have been notified." });
      clearSelection();
    },
    onError: (error) => {
      toast({ title: "Bulk approval failed", description: error?.message || "Please try again.", variant: "destructive" });
    },
  });

  const bulkRejectMutation = useMutation({
    mutationFn: ({ ids, reason }) => Promise.all(ids.map((id) => charityClient.requests.reject(id, reason, ""))),
    onSuccess: async (_data, { ids }) => {
      await queryClient.invalidateQueries({ queryKey: ["requests"] });
      emitNotificationsChanged('updated');
      toast({ title: `${ids.length} request(s) rejected`, description: "Members have been notified." });
      clearSelection();
      setBulkRejectOpen(false);
      setBulkRejectReason("");
    },
    onError: (error) => {
      toast({ title: "Bulk rejection failed", description: error?.message || "Please try again.", variant: "destructive" });
    },
  });

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
        <h1 className="text-2xl font-bold text-slate-900">Admin Requests</h1>
        <p className="text-slate-500">Review and action member requests and password resets.</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "member" ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          onClick={() => setActiveTab("member")}
        >
          Member Requests
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === "password" ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          onClick={() => setActiveTab("password")}
        >
          <KeyRound className="w-3.5 h-3.5" />
          Password Resets
          {prRequests.filter(r => r.status === "pending").length > 0 && (
            <span className="ml-1 inline-flex items-center justify-center rounded-full bg-amber-500 text-white text-xs w-5 h-5">
              {prRequests.filter(r => r.status === "pending").length}
            </span>
          )}
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === "challans" ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          onClick={() => setActiveTab("challans")}
        >
          <Receipt className="w-3.5 h-3.5" />
          Pending Challans
          {pendingChallanCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center rounded-full bg-amber-500 text-white text-xs w-5 h-5">
              {pendingChallanCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Member Requests tab ── */}
      {activeTab === "member" && (
        <div className="space-y-6">
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
              {selectablePendingIds.length > 0 && (
                <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={allPendingSelected} onChange={toggleSelectAllPending} />
                    Select all pending ({selectablePendingIds.length})
                  </label>
                  {selectedRequestIds.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">{selectedRequestIds.length} selected</span>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        disabled={bulkApproveMutation.isPending}
                        onClick={() => bulkApproveMutation.mutate(selectedRequestIds)}
                      >
                        {bulkApproveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve Selected"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setBulkRejectOpen(true)}
                      >
                        Reject Selected
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {filteredItems.map((request) => (
                <Card key={request.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {request.status === "pending" && (
                          <input
                            type="checkbox"
                            className="mt-1.5 shrink-0"
                            checked={selectedRequestIds.includes(request.id)}
                            onChange={() => toggleRequestSelected(request.id)}
                          />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-slate-900">{request.member_name || "Member"}</p>
                            {request.member_code && <Badge variant="outline">{formatMemberId(request.member_code)}</Badge>}
                            <Badge variant="outline">{getRequestLabel(request)}</Badge>
                            <Badge className={request.status === "pending" ? "bg-amber-100 text-amber-700" : request.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}>{request.status}</Badge>
                          </div>
                          <p className="mt-1 text-sm font-medium text-slate-800">{request.subject || "Request"}</p>
                          <p className="text-sm text-slate-600 line-clamp-2">{request.message}</p>
                          <p className="mt-1 text-xs text-slate-500">{format(new Date(request.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setSelectedRequest(request); setReviewOpen(true); }}
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
        </div>
      )}

      {/* ── Password Reset Requests tab ── */}
      {activeTab === "password" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Select value={prStatus} onValueChange={setPrStatus}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Filter status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="used">Used</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {prLoading ? (
            <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center text-slate-500">Loading...</CardContent></Card>
          ) : prRequests.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center text-slate-500">
                <KeyRound className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                No password reset requests.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {prRequests.map((req) => (
                <Card key={req.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-900">
                            {req.user_full_name || req.user_username || req.identifier}
                          </p>
                          {req.user_username && <Badge variant="outline">@{req.user_username}</Badge>}
                          <Badge className={req.status === "pending" ? "bg-amber-100 text-amber-700" : req.status === "approved" ? "bg-emerald-100 text-emerald-700" : req.status === "used" ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-700"}>
                            {req.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-500">Identifier: {req.identifier}</p>
                        {req.user_phone && <p className="text-sm text-slate-500">Phone: {req.user_phone}</p>}
                        {req.user_email && <p className="text-sm text-slate-500">Email: {req.user_email}</p>}
                        <p className="text-xs text-slate-400">{format(new Date(req.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {req.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setSelectedPrRequest(req); setPrReviewOpen(true); }}
                          >
                            Review
                          </Button>
                        )}
                        {req.status === "approved" && req.whatsapp_chat_url && (
                          <a
                            href={fixWhatsAppUrl(req.whatsapp_chat_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-1.5 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            Send Link
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Pending Challans tab (individual + bulk groups) ── */}
      {activeTab === "challans" && (
        <div className="space-y-6">
          {(pendingChallansLoading || pendingBulkLoading) ? (
            <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center text-slate-500">Loading pending challans...</CardContent></Card>
          ) : pendingChallanItems.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center text-slate-500">
                <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                No challans awaiting review.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingChallanItems.map((item) => (
                <Card key={item.key} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-900">{item.member_name || "Member"}</p>
                          {item.member_code && <Badge variant="outline">{formatMemberId(item.member_code)}</Badge>}
                          {item.is_bulk_group ? (
                            <Badge className="bg-sky-100 text-sky-700">Bulk · {item.months_count} months</Badge>
                          ) : (
                            <Badge variant="outline">{item.month || item.type}</Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm font-medium text-slate-800">
                          Rs {Number(item.total_amount ?? item.amount ?? 0).toLocaleString()}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{format(new Date(item.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          disabled={approvingChallanKey === item.key}
                          onClick={() => handleApproveChallanItem(item)}
                        >
                          {approvingChallanKey === item.key ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setSelectedChallanItem(item); setChallanReviewOpen(true); }}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Member request review dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Review</DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-slate-500">Member</p><p className="font-medium">{selectedRequest.member_name} ({formatMemberId(selectedRequest.member_code)})</p></div>
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
                  {(() => {
                    try {
                      const changes = JSON.parse(selectedRequest.requested_changes || '{}');
                      const avatarUrl = changes?.avatar_url;
                      if (Object.prototype.hasOwnProperty.call(changes || {}, 'avatar_url')) {
                        return (
                          <div className="mb-3 rounded-md bg-slate-50 p-3">
                            <p className="text-xs font-medium text-slate-600 mb-2">Profile photo request</p>
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt="Requested avatar"
                                className="w-24 h-24 rounded-full object-cover border border-slate-200"
                              />
                            ) : (
                              <p className="text-sm text-slate-600">Member requested removal of current profile photo.</p>
                            )}
                          </div>
                        );
                      }
                    } catch {
                      return null;
                    }
                    return null;
                  })()}
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
                  {selectedRequest.admin_notes && <p className="mt-2">Admin notes: {selectedRequest.admin_notes}</p>}
                  {selectedRequest.rejection_reason && <p className="mt-2">Reason: {selectedRequest.rejection_reason}</p>}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Password reset review dialog */}
      <Dialog
        open={prReviewOpen}
        onOpenChange={(open) => {
          if (!open) {
            setPrReviewOpen(false);
            setSelectedPrRequest(null);
            setPrAdminNotes("");
            setPrRejectionReason("");
            setPrApprovedResult(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Password Reset Request</DialogTitle>
          </DialogHeader>

          {/* ── Post-approval: WhatsApp share state ── */}
          {prApprovedResult ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-md bg-emerald-50 border border-emerald-200 p-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-800">Request approved!</p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Send the reset link to{" "}
                    <strong>{prApprovedResult.user_full_name || prApprovedResult.user_username || prApprovedResult.identifier}</strong>{" "}
                    via WhatsApp.
                  </p>
                </div>
              </div>

              {prApprovedResult.whatsapp_chat_url ? (
                <a
                  href={fixWhatsAppUrl(prApprovedResult.whatsapp_chat_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2.5 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Send Reset Link via WhatsApp
                </a>
              ) : (
                <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                  No phone number on file — copy the reset link manually from admin logs.
                </div>
              )}

              <p className="text-xs text-slate-400 text-center">
                Clicking the button opens WhatsApp with a pre-filled message containing the reset link.
              </p>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setPrReviewOpen(false);
                  setSelectedPrRequest(null);
                  setPrAdminNotes("");
                  setPrRejectionReason("");
                  setPrApprovedResult(null);
                }}
              >
                Done
              </Button>
            </div>
          ) : (
            /* ── Normal review state ── */
            selectedPrRequest && (
              <div className="space-y-4">
                <div className="rounded-md border p-3 text-sm space-y-1">
                  <p><span className="text-slate-500">Name:</span> {selectedPrRequest.user_full_name || "—"}</p>
                  <p><span className="text-slate-500">Username:</span> {selectedPrRequest.user_username ? `@${selectedPrRequest.user_username}` : "—"}</p>
                  <p><span className="text-slate-500">Phone:</span> {selectedPrRequest.user_phone || "—"}</p>
                  <p><span className="text-slate-500">Email:</span> {selectedPrRequest.user_email || "—"}</p>
                  <p><span className="text-slate-500">Identifier submitted:</span> {selectedPrRequest.identifier}</p>
                </div>

                {!selectedPrRequest.user_id && (
                  <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                    Warning: No matching account found for this identifier. Approval is not possible.
                  </div>
                )}

                {selectedPrRequest.user_id && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Admin notes (optional)</label>
                      <Textarea value={prAdminNotes} onChange={(e) => setPrAdminNotes(e.target.value)} rows={2} placeholder="Internal notes..." />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Rejection reason (required to reject)</label>
                      <Textarea value={prRejectionReason} onChange={(e) => setPrRejectionReason(e.target.value)} rows={2} placeholder="Reason for rejection..." />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="destructive"
                        className="flex-1"
                        disabled={prRejectMutation.isPending || !prRejectionReason.trim()}
                        onClick={() => prRejectMutation.mutate({ id: selectedPrRequest.id, reason: prRejectionReason, notes: prAdminNotes })}
                      >
                        {prRejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject"}
                      </Button>
                      <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        disabled={prApproveMutation.isPending}
                        onClick={() => prApproveMutation.mutate({ id: selectedPrRequest.id, notes: prAdminNotes })}
                      >
                        {prApproveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve & Get Link"}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-400 text-center">
                      Approving will generate a reset link. You can then send it to the member via WhatsApp.
                    </p>
                  </>
                )}
              </div>
            )
          )}
        </DialogContent>
      </Dialog>

      {/* Pending challan reject dialog */}
      <Dialog
        open={challanReviewOpen}
        onOpenChange={(open) => {
          if (!open) {
            setChallanReviewOpen(false);
            setSelectedChallanItem(null);
            setChallanRejectReason("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reject Challan</DialogTitle>
          </DialogHeader>

          {selectedChallanItem && (
            <div className="space-y-4">
              <div className="rounded-md border p-3 text-sm space-y-1">
                <p><span className="text-slate-500">Member:</span> {selectedChallanItem.member_name || "—"}</p>
                <p><span className="text-slate-500">Amount:</span> Rs {Number(selectedChallanItem.total_amount ?? selectedChallanItem.amount ?? 0).toLocaleString()}</p>
                {selectedChallanItem.is_bulk_group && (
                  <p><span className="text-slate-500">Months:</span> {(selectedChallanItem.months || []).join(", ")}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Rejection reason (required)</label>
                <Textarea value={challanRejectReason} onChange={(e) => setChallanRejectReason(e.target.value)} rows={3} />
              </div>
              <Button
                variant="destructive"
                className="w-full"
                disabled={rejectChallanMutation.isPending || !challanRejectReason.trim()}
                onClick={() => rejectChallanMutation.mutate({ item: selectedChallanItem, reason: challanRejectReason })}
              >
                {rejectChallanMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject Challan"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk reject dialog (Member Requests tab) */}
      <Dialog
        open={bulkRejectOpen}
        onOpenChange={(open) => {
          if (!open) {
            setBulkRejectOpen(false);
            setBulkRejectReason("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reject {selectedRequestIds.length} Request(s)</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-slate-600">This reason will be sent to all selected members.</p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Rejection reason (required)</label>
              <Textarea value={bulkRejectReason} onChange={(e) => setBulkRejectReason(e.target.value)} rows={3} />
            </div>
            <Button
              variant="destructive"
              className="w-full"
              disabled={bulkRejectMutation.isPending || !bulkRejectReason.trim()}
              onClick={() => bulkRejectMutation.mutate({ ids: selectedRequestIds, reason: bulkRejectReason })}
            >
              {bulkRejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject Selected"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

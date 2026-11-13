import React, { useEffect, useMemo, useRef, useState } from "react";
import { charityClient } from "@/api/charityClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle2, Layers, Loader2, Search, UserCog, XCircle } from "lucide-react";
import { format } from "@/lib/dateTime";
import { saveBulkGroup } from "@/lib/bulkGroupStore";
import { formatMonth } from "@/lib/challanStatus";
import BulkGroupDialog, { BulkStatusBadge, isPendingGroup, useBulkReview } from "@/components/dashboard/BulkGroupDialog";

// Tab -> server status. History comes from the server, so every admin and device sees the same list.
const TAB_STATUS = { pending: "pending_approval", approved: "approved", rejected: "rejected", all: "all" };

export default function BulkOperationsPanel({ initialBulkGroupId = null }) {
  const [dialog, setDialog] = useState({ open: false, id: null, startWith: "details" });
  const [statusFilter, setStatusFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const didAutoOpenRef = useRef(false);
  const { approveMutation, reviewBlock, busy } = useBulkReview();

  useEffect(() => {
    if (!initialBulkGroupId || didAutoOpenRef.current) return;
    setDialog({ open: true, id: initialBulkGroupId, startWith: "details" });
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
  const openDialog = (id, startWith = "details") => setDialog({ open: true, id, startWith });

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
                const opIsPending = isPendingGroup(bulk);
                const opStatus = String(bulk?.status || "").toLowerCase();
                const blocked = reviewBlock(bulk);

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
                          <BulkStatusBadge status={bulk.status} />
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
                        <Button variant="outline" disabled={busy} onClick={() => openDialog(bulk.bulk_group_id)}>
                          View Details
                        </Button>
                        {opIsPending && blocked && (
                          <p className="text-xs text-slate-500 italic self-center">{blocked}</p>
                        )}
                        {opIsPending && !blocked && (
                          <>
                            <Button
                              className="bg-emerald-600 hover:bg-emerald-700"
                              disabled={busy}
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
                              disabled={busy}
                              onClick={() => openDialog(bulk.bulk_group_id, "reject")}
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

      <BulkGroupDialog
        bulkGroupId={dialog.id}
        open={dialog.open}
        startWith={dialog.startWith}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
      />
    </div>
  );
}

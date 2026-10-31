import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDeepLink } from "@/lib/useDeepLink";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { emitNotificationsChanged } from "@/lib/notificationState";
import { charityClient } from "@/api/charityClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { format } from "@/lib/dateTime";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Wallet,
  TrendingDown,
  TrendingUp,
  PiggyBank,
} from "lucide-react";

const FUND_CATEGORIES = [
  "Medical",
  "Education",
  "Infrastructure",
  "Emergency Relief",
  "Community Development",
  "Administrative",
  "Other",
];

const QUERY_KEY_SUMMARY = ["fund-utilizations", "summary"];
const QUERY_KEY_LIST = ["fund-utilizations", "list"];

function SummaryCard({ icon: Icon, label, value, colorClass }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`rounded-full p-3 ${colorClass}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">
            {value != null
              ? `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "—"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

const emptyForm = {
  title: "",
  description: "",
  amount: "",
  category: "",
  recipient: "",
  date: format(new Date(), "yyyy-MM-dd"),
};

const ENTRY_DEEP_LINK_PARAMS = ["entry"];

export default function FundUtilization() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [linkParams] = useSearchParams();
  const [tab, setTab] = useState(() => (linkParams.get("tab") === "approval" ? "needs" : "all"));
  const [reasonAction, setReasonAction] = useState(null); // { type: "reject" | "revert", record }
  const [reason, setReason] = useState("");

  const { data: currentUser } = useQuery({
    queryKey: ["auth", "me", "fund-utilization"],
    queryFn: () => charityClient.auth.me(),
  });
  const isMine = (record) =>
    currentUser?.id != null && Number(record.registered_by_admin_id) === Number(currentUser.id);
  const approvedByMe = (record) =>
    currentUser?.id != null &&
    record.approved_by_admin_id != null &&
    Number(record.approved_by_admin_id) === Number(currentUser.id);
  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: QUERY_KEY_SUMMARY,
    queryFn: () => charityClient.fundUtilizations.summary(),
  });

  const { data: records = [], isLoading: listLoading } = useQuery({
    queryKey: QUERY_KEY_LIST,
    queryFn: () => charityClient.fundUtilizations.list(),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data) => charityClient.fundUtilizations.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fund-utilizations"] });
      emitNotificationsChanged('updated');
      toast({ title: "Fund utilization recorded successfully." });
      closeDialog();
    },
    onError: (err) => {
      toast({ title: "Error", description: err?.message || "Failed to create record.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => charityClient.fundUtilizations.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fund-utilizations"] });
      emitNotificationsChanged('updated');
      toast({ title: "Record updated successfully." });
      closeDialog();
    },
    onError: (err) => {
      toast({ title: "Error", description: err?.message || "Failed to update record.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => charityClient.fundUtilizations.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fund-utilizations"] });
      emitNotificationsChanged('updated');
      toast({ title: "Record deleted." });
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast({ title: "Error", description: err?.message || "Failed to delete record.", variant: "destructive" });
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const onReviewSuccess = (title) => () => {
    queryClient.invalidateQueries({ queryKey: ["fund-utilizations"] });
    emitNotificationsChanged('updated');
    toast({ title });
    setReasonAction(null);
    setReason("");
  };
  const onReviewError = (fallback) => (err) => {
    toast({ title: "Error", description: err?.message || fallback, variant: "destructive" });
  };

  const approveMutation = useMutation({
    mutationFn: (id) => charityClient.fundUtilizations.approve(id),
    onSuccess: onReviewSuccess("Fund utilization approved."),
    onError: onReviewError("Failed to approve."),
  });

  const reasonMutation = useMutation({
    mutationFn: ({ type, id, reason: text }) =>
      type === "reject"
        ? charityClient.fundUtilizations.reject(id, text)
        : charityClient.fundUtilizations.revert(id, text),
    onSuccess: (_d, vars) =>
      onReviewSuccess(vars.type === "reject" ? "Fund utilization rejected." : "Approval reverted to pending.")(),
    onError: onReviewError("Action failed."),
  });

  const MIN_REASON_LENGTH = 10;
  const reasonValid = reason.trim().length >= MIN_REASON_LENGTH;

  const statusBadge = (record) => {
    const cls =
      record.status === "approved"
        ? "bg-emerald-100 text-emerald-700"
        : record.status === "rejected"
          ? "bg-rose-100 text-rose-700"
          : "bg-amber-100 text-amber-700";
    return <Badge className={`${cls} border-0 capitalize`}>{record.status || "pending"}</Badge>;
  };

  const visibleRecords =
    tab === "needs"
      ? records.filter((r) => r.status === "pending" && !isMine(r))
      : records;
  const needsCount = records.filter((r) => r.status === "pending" && !isMine(r)).length;
  function openCreate() {
    setEditingRecord(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(record) {
    setEditingRecord(record);
    setForm({
      title: record.title || "",
      description: record.description || "",
      amount: record.amount != null ? String(record.amount) : "",
      category: record.category || "",
      recipient: record.recipient || "",
      date: record.date ? format(new Date(record.date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingRecord(null);
    setForm(emptyForm);
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (!form.title.trim()) {
      toast({ title: "Title is required.", variant: "destructive" });
      return;
    }
    const amount = parseFloat(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0) {
      toast({ title: "A valid positive amount is required.", variant: "destructive" });
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      amount,
      category: form.category.trim() || null,
      recipient: form.recipient.trim() || null,
      date: form.date ? new Date(form.date).toISOString() : null,
    };

    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  useDeepLink({ params: ENTRY_DEEP_LINK_PARAMS, ready: !listLoading });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fund Utilization</h1>
          <p className="text-sm text-muted-foreground">
            Track how collected funds have been utilized
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Record Utilization
        </Button>
      </div>

      {/* Summary Cards */}
      {summaryLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading summary…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard
            icon={TrendingUp}
            label="Total Collected"
            value={summary?.total_collected}
            colorClass="bg-green-500"
          />
          <SummaryCard
            icon={TrendingDown}
            label="Approved Total"
            value={summary?.total_utilized}
            colorClass="bg-red-500"
          />
          <SummaryCard
            icon={Wallet}
            label={`Pending Total${summary?.pending_count ? ` (${summary.pending_count})` : ""}`}
            value={summary?.pending_utilized_total}
            colorClass="bg-amber-500"
          />
          <SummaryCard
            icon={PiggyBank}
            label="Available Balance"
            value={summary?.available_balance}
            colorClass="bg-blue-500"
          />
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-full bg-purple-500 p-3">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Entries</p>
                <p className="text-2xl font-bold">{summary?.utilization_count ?? "—"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Utilization Records</CardTitle>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant={tab === "all" ? "default" : "outline"} onClick={() => setTab("all")}>
              All
            </Button>
            <Button size="sm" variant={tab === "needs" ? "default" : "outline"} onClick={() => setTab("needs")}>
              Needs your approval ({needsCount})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {listLoading ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading records…
            </div>
          ) : visibleRecords.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No fund utilization records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Registered By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRecords.map((record) => (
                    <TableRow key={record.id} data-deeplink={`entry-${record.id}`} className="transition-colors">
                      <TableCell className="font-medium">
                        <div>{record.title}</div>
                        {record.description && (
                          <div className="max-w-xs truncate text-xs text-muted-foreground">
                            {record.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold text-red-600">
                        ₹{Number(record.amount).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>
                        {record.category ? (
                          <Badge variant="secondary">{record.category}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{record.recipient || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>
                        {record.date
                          ? format(new Date(record.date), "dd MMM yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell>{record.registered_by_name || `Admin #${record.registered_by_admin_id}`}</TableCell>
                      <TableCell>
                        {statusBadge(record)}
                        {record.status === "approved" && record.approved_by_name && (
                          <div className="text-xs text-muted-foreground">by {record.approved_by_name}</div>
                        )}
                        {record.status === "rejected" && record.rejection_reason && (
                          <div className="max-w-xs text-xs text-rose-600">Reason: {record.rejection_reason}</div>
                        )}
                        {record.status === "pending" && record.reversal_reason && (
                          <div className="max-w-xs text-xs text-amber-700">
                            Reverted{record.reversed_by_name ? ` by ${record.reversed_by_name}` : ""}: {record.reversal_reason}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {record.status === "pending" && !isMine(record) && (
                            <>
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700"
                                disabled={approveMutation.isPending}
                                onClick={() => approveMutation.mutate(record.id)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => { setReasonAction({ type: "reject", record }); setReason(""); }}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {record.status === "pending" && isMine(record) && (
                            <span className="self-center text-xs italic text-muted-foreground">
                              Awaiting another admin
                            </span>
                          )}
                          {record.status === "approved" && (
                            <span title={approvedByMe(record) ? "A different admin must reverse your approval" : undefined}>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={approvedByMe(record)}
                                onClick={() => { setReasonAction({ type: "revert", record }); setReason(""); }}
                              >
                                Revert
                              </Button>
                            </span>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={record.status === "approved" || !isMine(record)}
                            onClick={() => openEdit(record)}
                            title={record.status === "approved" ? "Approved entries cannot be edited" : "Edit"}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            disabled={record.status === "approved" || !isMine(record)}
                            onClick={() => setDeleteTarget(record)}
                            title={record.status === "approved" ? "Approved entries cannot be deleted" : "Delete"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject / Revert reason dialog */}
      <Dialog open={!!reasonAction} onOpenChange={(open) => { if (!open) { setReasonAction(null); setReason(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reasonAction?.type === "reject" ? "Reject Fund Utilization" : "Revert Approval"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Enter reason (min 10 characters)..."
            />
            <p className={`text-xs ${reasonValid ? "text-muted-foreground" : "text-rose-600"}`}>
              {reason.trim().length}/{MIN_REASON_LENGTH} characters minimum
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setReasonAction(null); setReason(""); }}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={!reasonValid || reasonMutation.isPending}
                onClick={() =>
                  reasonMutation.mutate({
                    type: reasonAction.type,
                    id: reasonAction.record.id,
                    reason: reason.trim(),
                  })
                }
              >
                {reasonMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {reasonAction?.type === "reject" ? "Reject" : "Revert"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRecord ? "Edit Fund Utilization" : "Record Fund Utilization"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                value={form.title}
                onChange={handleFormChange}
                placeholder="e.g. Medical assistance for Ahmed"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="amount">Amount (₹) *</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={handleFormChange}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={form.date}
                  onChange={handleFormChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  name="category"
                  value={form.category}
                  onChange={handleFormChange}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select category</option>
                  {FUND_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="recipient">Recipient</Label>
                <Input
                  id="recipient"
                  name="recipient"
                  value={form.recipient}
                  onChange={handleFormChange}
                  placeholder="Person or organization"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleFormChange}
                placeholder="Additional details about how funds were used…"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingRecord ? "Save Changes" : "Record"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fund Utilization Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteTarget?.title}&quot; (₹
              {deleteTarget?.amount != null
                ? Number(deleteTarget.amount).toLocaleString("en-IN")
                : ""}
              ). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

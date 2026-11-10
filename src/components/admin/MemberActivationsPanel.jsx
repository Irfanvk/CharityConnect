import React, { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle, Loader2, UserCheck } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useDeepLink } from "@/lib/useDeepLink";
import { format } from "@/lib/dateTime";
import { formatMemberId } from "@/lib/utils";
import { emitNotificationsChanged } from "@/lib/notificationState";

export const ACTIVATIONS_QUERY_KEY = ["admin", "member-activations"];
const DEEP_LINK_PARAMS = ["request"];
const MIN_REASON_LENGTH = 10;

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
};

function errorText(err, fallback) {
  const detail = err?.data?.detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  return err?.message || fallback;
}

function monthLabel(value) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return value || "—";
  const [y, m] = value.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function safeDate(value) {
  try {
    return value ? format(new Date(value), "d MMM yyyy, h:mm a") : "";
  } catch {
    return "";
  }
}

// One automatic check, shown as a small coloured chip.
function Check({ tone, children }) {
  const styles = {
    good: ["bg-emerald-50 text-emerald-800 border-emerald-200", CheckCircle2],
    warn: ["bg-amber-50 text-amber-800 border-amber-200", AlertTriangle],
    bad: ["bg-rose-50 text-rose-800 border-rose-200", XCircle],
    none: ["bg-slate-50 text-slate-600 border-slate-200", MinusCircle],
  }[tone];
  const [cls, Icon] = styles;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${cls}`}>
      <Icon className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

function CheckChips({ item }) {
  const c = item.checks || {};
  const chips = [];
  if (c.name === "match") chips.push(<Check key="n" tone="good">Name matches</Check>);
  else if (c.name === "close") chips.push(<Check key="n" tone="warn">Name similar</Check>);
  else chips.push(<Check key="n" tone="bad">Name different</Check>);

  if (c.last_paid_month === "match") chips.push(<Check key="m" tone="good">Last month correct</Check>);
  else if (c.last_paid_month === "different") chips.push(<Check key="m" tone="warn">Last month different</Check>);
  else if (c.last_paid_month === "no_records") chips.push(<Check key="m" tone="none">No payments on record</Check>);
  else chips.push(<Check key="m" tone="none">Last month not given</Check>);

  if (c.already_active) chips.push(<Check key="a" tone="bad">Already active</Check>);
  if (c.other_pending > 0) {
    chips.push(<Check key="o" tone="warn">{c.other_pending} other request{c.other_pending > 1 ? "s" : ""} for this ID</Check>);
  }
  (c.conflicts || []).forEach((text, i) => chips.push(<Check key={`c${i}`} tone="bad">{text}</Check>));
  return <div className="flex flex-wrap gap-1.5">{chips}</div>;
}

// `record` undefined = there is nothing on record to compare with (WhatsApp, username).
function CompareRow({ label, entered, record, tone }) {
  const color = tone === "good" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : tone === "bad" ? "text-rose-700" : "";
  if (record === undefined) {
    return (
      <div className="px-3 py-2">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-0.5 break-words text-sm font-medium">{entered || "—"}</p>
      </div>
    );
  }
  return (
    <div className="px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <div className="mt-0.5 grid grid-cols-1 gap-0.5 text-sm sm:grid-cols-2 sm:gap-3">
        <p className={`break-words font-medium ${color}`}><span className="mr-1 text-xs font-normal text-slate-400 sm:hidden">Entered:</span>{entered || "—"}</p>
        <p className="break-words text-slate-600"><span className="mr-1 text-xs text-slate-400 sm:hidden">Record:</span>{record || "—"}</p>
      </div>
    </div>
  );
}

function toneFor(result) {
  return { match: "good", close: "warn", different: "bad" }[result];
}

export default function MemberActivationsPanel({ enabled }) {
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data = { items: [], total: 0 }, isLoading } = useQuery({
    queryKey: [...ACTIVATIONS_QUERY_KEY, statusFilter],
    queryFn: () => charityClient.memberActivations.list({ status: statusFilter, limit: 100 }),
    enabled,
  });

  const openReview = useCallback((item) => {
    setSelected(item);
    setNotes("");
    setReason("");
  }, []);

  const onDeepLink = useCallback((_param, value) => {
    const item = (data.items || []).find((i) => String(i.id) === String(value));
    if (item) openReview(item);
  }, [data.items, openReview]);

  useDeepLink({ params: DEEP_LINK_PARAMS, ready: enabled && !isLoading, onFound: onDeepLink });

  const afterAction = (title, description) => {
    queryClient.invalidateQueries({ queryKey: ACTIVATIONS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ["admin-counts"] });
    emitNotificationsChanged?.();
    setSelected(null);
    toast({ title, description });
  };

  const approveMutation = useMutation({
    mutationFn: ({ id, adminNotes }) => charityClient.memberActivations.approve(id, adminNotes),
    onSuccess: (item) => afterAction("Account activated", `${item.full_name} can now use the portal.`),
    onError: (err) => toast({ title: "Could not approve", description: errorText(err, "Please try again."), variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, rejectionReason, adminNotes }) => charityClient.memberActivations.reject(id, rejectionReason, adminNotes),
    onSuccess: (item) => afterAction("Request rejected", `${item.full_name} will see your reason when they sign in.`),
    onError: (err) => toast({ title: "Could not reject", description: errorText(err, "Please try again."), variant: "destructive" }),
  });

  const items = data.items || [];
  const busy = approveMutation.isPending || rejectMutation.isPending;
  const canApprove = selected && selected.status === "pending" && !selected.checks?.already_active && !(selected.checks?.conflicts || []).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          Existing members who activated their account from the login page. Compare their details with the record, then approve or reject.
        </p>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : items.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-slate-500">
            <UserCheck className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            {statusFilter === "pending" ? "No activation requests waiting." : "Nothing to show."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} data-deeplink={`request-${item.id}`} className="border-0 shadow-sm transition-colors">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-slate-900">{item.full_name}</p>
                    <p className="text-sm text-slate-500">
                      {formatMemberId(item.record?.member_code)}
                      {item.record?.full_name ? ` · on record: ${item.record.full_name}` : ""}
                    </p>
                    <p className="text-xs text-slate-400">{safeDate(item.created_at)}</p>
                  </div>
                  <Badge className={`${STATUS_STYLES[item.status] || ""} shrink-0 capitalize`}>{item.status}</Badge>
                </div>
                {item.status === "pending" && <CheckChips item={item} />}
                {item.status === "rejected" && item.rejection_reason && (
                  <p className="break-words text-sm text-rose-700">Reason: {item.rejection_reason}</p>
                )}
                <Button size="sm" variant={item.status === "pending" ? "default" : "outline"} onClick={() => openReview(item)}>
                  {item.status === "pending" ? "Review" : "View"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Member activation</DialogTitle>
            <DialogDescription>
              Member ID {formatMemberId(selected?.record?.member_code)} · entered as “{selected?.member_code_entered}”
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              {selected.status === "pending" && <CheckChips item={selected} />}

              <div className="rounded-lg border">
                <div className="hidden grid-cols-2 gap-3 border-b bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 sm:grid">
                  <span>They entered</span><span>On record</span>
                </div>
                <div className="divide-y">
                  <CompareRow label="Full name" entered={selected.full_name} record={selected.record?.full_name} tone={toneFor(selected.checks?.name)} />
                  <CompareRow label="Phone" entered={selected.phone} record={selected.record?.phone} />
                  <CompareRow label="Email" entered={selected.email || "Doesn't use email"} record={selected.record?.email} />
                  <CompareRow label="WhatsApp" entered={selected.whatsapp_phone || "Not given"} />
                  <CompareRow
                    label="Last month paid"
                    entered={selected.last_paid_month ? monthLabel(selected.last_paid_month) : "Not given"}
                    record={monthLabel(selected.record?.last_paid_month)}
                    tone={{ match: "good", different: "warn" }[selected.checks?.last_paid_month]}
                  />
                  <CompareRow label="Username they chose" entered={selected.username} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-slate-50 p-2"><p className="text-slate-500">Months paid</p><p className="text-base font-semibold text-slate-800">{selected.record?.months_paid ?? 0}</p></div>
                <div className="rounded-lg bg-slate-50 p-2"><p className="text-slate-500">Monthly</p><p className="text-base font-semibold text-slate-800">₹{Number(selected.record?.monthly_amount || 0).toLocaleString()}</p></div>
                <div className="rounded-lg bg-slate-50 p-2"><p className="text-slate-500">Status</p><p className="text-base font-semibold capitalize text-slate-800">{selected.record?.member_status || "—"}</p></div>
              </div>

              {selected.status === "pending" ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Admin notes (optional)</label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="e.g. Confirmed by phone" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Rejection reason (needed to reject)</label>
                    <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Shown to the person when they sign in" />
                    {reason.trim() && reason.trim().length < MIN_REASON_LENGTH && (
                      <p className="text-xs text-rose-600">At least {MIN_REASON_LENGTH} characters.</p>
                    )}
                  </div>
                  <div className="sticky bottom-0 -mx-6 -mb-6 flex gap-3 border-t bg-background px-6 py-3">
                    <Button
                      variant="destructive"
                      className="flex-1"
                      disabled={busy || reason.trim().length < MIN_REASON_LENGTH}
                      onClick={() => rejectMutation.mutate({ id: selected.id, rejectionReason: reason.trim(), adminNotes: notes })}
                    >
                      {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject"}
                    </Button>
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      disabled={busy || !canApprove}
                      onClick={() => approveMutation.mutate({ id: selected.id, adminNotes: notes })}
                    >
                      {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-1 rounded-md border p-3 text-sm text-slate-600">
                  <p>Status: <strong className="capitalize">{selected.status}</strong>
                    {selected.reviewed_by_name ? ` by ${selected.reviewed_by_name}` : ""}
                    {selected.reviewed_at ? ` · ${safeDate(selected.reviewed_at)}` : ""}
                  </p>
                  {selected.admin_notes && <p className="break-words">Notes: {selected.admin_notes}</p>}
                  {selected.rejection_reason && <p className="break-words">Reason: {selected.rejection_reason}</p>}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

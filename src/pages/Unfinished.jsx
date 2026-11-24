import React, { useMemo, useState } from "react";
import { isAdminRole } from "@/lib/roles";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, CheckCircle2, Clock, HandCoins, Loader2, Phone, Search, Trash2 } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { formatISTDate } from "@/lib/dateTime";
import { emitNotificationsChanged } from "@/lib/notificationState";
import NewPaymentWizard from "@/components/challans/NewPaymentWizard";

/*
 * Admins: payments members started but never finished (no proof uploaded).
 * Members are reminded automatically at 48 hours and 7 days; admins get one summary each
 * morning. From here an admin can remind now, record the money as received, or cancel.
 */

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const FILTERS = [["48", "Open 2+ days"], ["0", "All unfinished"]];

function age(hours) {
  if (hours == null) return "";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

const errorText = (e) => (typeof e?.data?.detail === "string" ? e.data.detail : e?.message) || "Please try again.";

export default function Unfinished() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [minHours, setMinHours] = useState("48");
  const [search, setSearch] = useState("");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [reason, setReason] = useState("");
  const [recordFor, setRecordFor] = useState(null); // full member record for the form
  const [loadingMember, setLoadingMember] = useState(null);

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => charityClient.auth.me(), staleTime: 5 * 60 * 1000 });
  const { data, isLoading } = useQuery({
    queryKey: ["challans", "unfinished", minHours],
    queryFn: () => charityClient.challans.unfinished({ min_hours: minHours }),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["challans"] });

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = data?.items || [];
    return q ? all.filter((i) => `${i.member_code} ${i.member_name} ${i.what}`.toLowerCase().includes(q)) : all;
  }, [data, search]);
  const members = new Set(items.map((i) => i.member_id)).size;
  const leftovers = items.filter((i) => i.already_paid).length;

  const remind = useMutation({
    mutationFn: (item) => charityClient.challans.remind(item.id),
    onSuccess: (_, item) => { toast({ title: "Reminder sent", description: `${item.member_name || item.member_code} was reminded about ${item.what}.` }); refresh(); },
    onError: (e) => toast({ title: "Could not send the reminder", description: errorText(e), variant: "destructive" }),
  });
  const cancel = useMutation({
    mutationFn: ({ item, why }) => charityClient.challans.delete(item.id, why),
    onSuccess: (_, { item }) => {
      toast({ title: "Payment cancelled", description: `${item.what} for ${item.member_name || item.member_code}. The member was told.` });
      setCancelTarget(null); setReason(""); refresh(); emitNotificationsChanged("updated");
    },
    onError: (e) => toast({ title: "Could not cancel", description: errorText(e), variant: "destructive" }),
  });

  const openRecord = async (item) => {
    setLoadingMember(item.id);
    try {
      setRecordFor(await charityClient.members.get(item.member_id));
    } catch (e) {
      toast({ title: "Could not open the member", description: errorText(e), variant: "destructive" });
    } finally {
      setLoadingMember(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Unfinished payments</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Payments members started but never uploaded proof for. Members are reminded automatically after 2 days and
          again after 7 days; admins get one summary each morning.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800 sm:w-80">
          {FILTERS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMinHours(value)}
              aria-pressed={minHours === value}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${minHours === value ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-300"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, member ID or month" className="pl-9" />
        </div>
      </div>

      {!isLoading && items.length > 0 && (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {items.length} payment{items.length === 1 ? "" : "s"} from {members} member{members === 1 ? "" : "s"}
          {leftovers > 0 && ` · ${leftovers} already paid another way (safe to cancel)`}
        </p>
      )}

      {isLoading ? (
        <p className="flex items-center justify-center gap-2 py-10 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Loading…</p>
      ) : items.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          <p className="font-semibold text-slate-800 dark:text-slate-100">Nothing unfinished</p>
          <p className="text-sm text-slate-500">{minHours === "48" ? "No payment has been left without proof for 2 days or more." : "Every payment members started has its proof."}</p>
        </CardContent></Card>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-bold text-slate-900 dark:text-white">{item.what}</p>
                  {item.challan_no && <p className="font-mono text-xs text-slate-500">{item.challan_no}</p>}
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-semibold">{item.member_code}</span> · {item.member_name || "Member"}
                    {item.phone && (
                      <a href={`tel:${item.phone}`} className="ml-2 inline-flex items-center gap-1 text-emerald-700 hover:underline"><Phone className="h-3.5 w-3.5" />{item.phone}</a>
                    )}
                  </p>
                </div>
                <p className="shrink-0 text-lg font-bold tabular-nums text-slate-900 dark:text-white">{inr(item.amount)}</p>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
                  <Clock className="h-3.5 w-3.5" />Open {age(item.hours_open)}{item.created_at && ` · started ${formatISTDate(item.created_at, { day: "numeric", month: "short", year: "numeric" })}`}
                </span>
                {item.reminders_sent?.includes("48h") && <span className="rounded-full bg-sky-100 px-2 py-0.5 font-medium text-sky-800">Reminded at 2 days</span>}
                {item.reminders_sent?.includes("7d") && <span className="rounded-full bg-sky-100 px-2 py-0.5 font-medium text-sky-800">Reminded at 7 days</span>}
                {item.reminded_today && <span className="rounded-full bg-sky-100 px-2 py-0.5 font-medium text-sky-800">Reminded today</span>}
                {item.already_paid && <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800">Month already paid · safe to cancel</span>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {!item.already_paid && (
                  <Button variant="outline" className="h-10 gap-1.5 bg-white" disabled={item.reminded_today || remind.isPending} onClick={() => remind.mutate(item)}>
                    <BellRing className="h-4 w-4" />Remind now
                  </Button>
                )}
                {!item.already_paid && (
                  <Button variant="outline" className="h-10 gap-1.5 bg-white" disabled={loadingMember === item.id} onClick={() => openRecord(item)}>
                    {loadingMember === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <HandCoins className="h-4 w-4" />}Record as received
                  </Button>
                )}
                {isAdminRole(user) && (
                <Button variant="ghost" className="h-10 gap-1.5 text-slate-600 hover:text-rose-600" onClick={() => { setCancelTarget(item); setReason(item.already_paid ? "This month is already paid." : ""); }}>
                  <Trash2 className="h-4 w-4" />Cancel
                </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={Boolean(cancelTarget)} onOpenChange={(open) => { if (!open) { setCancelTarget(null); setReason(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this payment?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget && `${cancelTarget.what} (${inr(cancelTarget.amount)}) for ${cancelTarget.member_name || cancelTarget.member_code}. `}
              The member gets a notification with your reason, and the month can be paid again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="cancel-reason">Reason (optional, the member sees it)</Label>
            <Textarea id="cancel-reason" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Started twice by mistake" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              disabled={cancel.isPending}
              onClick={(e) => { e.preventDefault(); cancel.mutate({ item: cancelTarget, why: reason.trim() }); }}
            >
              {cancel.isPending ? "Cancelling…" : "Yes, cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {recordFor && (
        <NewPaymentWizard
          open={Boolean(recordFor)}
          onOpenChange={(open) => { if (!open) setRecordFor(null); }}
          currentUser={user}
          presetMember={recordFor}
          onRecorded={() => { refresh(); emitNotificationsChanged("updated"); }}
        />
      )}
    </div>
  );
}

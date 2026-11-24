// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { charityClient } from "@/api/charityClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Bell, BellOff, BellRing, Loader2, Info, CheckCircle, AlertTriangle, Receipt, Heart, Clock, Users,
  Megaphone, Radio, Smartphone, X, ChevronRight, Send, Repeat2, Trash2, Wallet, UserPlus, ClipboardList,
  CheckCheck, Settings as SettingsIcon, Lock,
} from "lucide-react";
import { format } from "@/lib/dateTime";
import { useToast } from "@/components/ui/use-toast";
import {
  dismissNotificationForUser, emitNotificationsChanged, isNotificationDismissed,
} from "@/lib/notificationState";
import { useNotifications } from "@/context/NotificationContext";
import { useNavigate } from "react-router-dom";
import NotificationSettingsCard from "@/components/NotificationSettingsCard";
import { getNotificationLink } from "@/lib/notificationLinks";
import { isAdminRole, isStaffRole } from "@/lib/roles";
import { enableNotificationsFromTap, getPushEnvironment } from "@/lib/pushSetup";

/*
 * Notifications, made for busy people:
 * - notifications off on this phone? one big "Turn on" button at the top;
 * - admins: "Needs you" groups unread work (payments to check, requests, fund approvals):
 *   one tap opens the page and clears the group;
 * - inbox by day, All / Unread, "Mark all read"; × only removes it from MY inbox;
 * - send a message from a ready-made one in two taps; Sent: send again or delete for everyone.
 */

const TYPE_CONFIG = {
  info: { label: "General", color: "bg-blue-100 text-blue-700", icon: Info },
  success: { label: "Good news", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  warning: { label: "Important", color: "bg-amber-100 text-amber-700", icon: AlertTriangle },
  payment: { label: "Payment", color: "bg-purple-100 text-purple-700", icon: Receipt },
  campaign: { label: "Campaign", color: "bg-rose-100 text-rose-700", icon: Heart },
};

// Work for admins: what it is, where it opens.
const TASKS = {
  admin_payment_reviews: { one: "payment to check", many: "payments to check", icon: Wallet, link: "/Challans?status=pending", tone: "bg-purple-100 text-purple-700" },
  admin_requests: { one: "request to answer", many: "requests to answer", icon: UserPlus, link: "/AdminRequests", tone: "bg-sky-100 text-sky-700" },
  admin_fund_approvals: { one: "fund use to approve", many: "fund uses to approve", icon: ClipboardList, link: "/FundUtilization", tone: "bg-amber-100 text-amber-800" },
};

const TEMPLATES = [
  {
    key: "reminder", label: "Fee reminder", icon: Wallet, type: "payment", to: "all",
    title: "Monthly fee reminder",
    message: "Assalamu Alaikum. A gentle reminder to pay this month's fee. Open the app → My payments, pay, and upload the screenshot. JazakAllah khair.",
  },
  {
    key: "meeting", label: "Meeting", icon: Users, type: "info", to: "all",
    title: "Meeting",
    message: "Assalamu Alaikum. We meet on [day] at [time], at [place]. Please come.",
  },
  {
    key: "campaign", label: "New campaign", icon: Heart, type: "campaign", to: "all",
    title: "New campaign started",
    message: "A new campaign has started: [name]. Open Campaigns in the app to give. JazakAllah khair.",
  },
  {
    key: "thanks", label: "Thank you", icon: CheckCircle, type: "success", to: "all",
    title: "Thank you",
    message: "JazakAllah khair to everyone who paid and gave this month. May Allah accept it from all of us.",
  },
  {
    key: "important", label: "Important", icon: AlertTriangle, type: "warning", to: "all",
    title: "Important",
    message: "",
  },
  {
    key: "admins", label: "To admins", icon: Lock, type: "info", to: "admins",
    title: "For admins",
    message: "",
  },
];

const EMPTY_FORM = { title: "", message: "", type: "info", target_type: "all" };

function dayLabel(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Earlier";
  const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(new Date()) - start(d)) / 86400000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return "This week";
  return "Earlier";
}

function audienceText(label) {
  if (!label || label === "unknown" || label === "all") return "Everyone";
  if (label === "admins") return "Admins only";
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function TabButton({ active, onClick, children, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
        active ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-300"
      }`}
    >
      {children}
      {count > 0 && <span className="rounded-full bg-emerald-600 px-1.5 text-[11px] leading-5 text-white">{count}</span>}
    </button>
  );
}

export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { notifications, unreadCount, isLoading, refreshNotifications, markReadByIds, markAllRead } = useNotifications();

  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("inbox");
  const [filter, setFilter] = useState("all"); // all | unread
  const [expandedId, setExpandedId] = useState(null);
  const [dismissTick, setDismissTick] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [sending, setSending] = useState(false);
  const [batchTarget, setBatchTarget] = useState(null);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);
  const [env, setEnv] = useState(() => getPushEnvironment());
  const [turningOn, setTurningOn] = useState(false);

  useEffect(() => {
    charityClient.auth.me().then(setUser).catch(() => { });
  }, []);

  // Opened from the Admin area's "Send a message": open the composer straight away.
  useEffect(() => {
    if (isAdminRole(user) && new URLSearchParams(window.location.search).get("compose") === "1") setFormOpen(true);
  }, [user]);

  const isAdmin = isAdminRole(user);
  const isStaff = isStaffRole(user);
  const inboxKey = user?.email || (user?.id != null ? `user-${user.id}` : null);

  const { data: sentBatches = [], isLoading: isLoadingSentBatches } = useQuery({
    queryKey: ["notifications", "sent-batches"],
    queryFn: () => charityClient.notifications.listSentBatches({ minutes: 43200, limit: 30 }),
    enabled: isAdmin,
  });

  const { data: deliveryPreview, isLoading: isLoadingDeliveryPreview } = useQuery({
    queryKey: ["admin", "notification-delivery-preview", formData.target_type],
    queryFn: () => charityClient.admin.notificationDeliveryPreview(formData.target_type),
    enabled: isAdmin && formOpen,
  });

  const isRead = (n) => n?.is_read || Boolean(n?.read_by?.includes(user?.email));

  // The server sends each person only their own notifications; hide the ones removed here.
  const inbox = useMemo(
    () => notifications.filter((n) => !(inboxKey && isNotificationDismissed(inboxKey, n.id))),
    // dismissTick: re-read the removed list after a removal
    [notifications, inboxKey, dismissTick],
  );

  // Unread admin work, grouped: "4 payments to check".
  const tasks = useMemo(() => {
    if (!isStaff) return [];
    const groups = {};
    inbox.forEach((n) => {
      const t = TASKS[n.category];
      if (!t || isRead(n)) return;
      (groups[n.category] = groups[n.category] || []).push(n);
    });
    return Object.entries(groups).map(([category, items]) => ({ category, items, ...TASKS[category] }));
  }, [inbox, isStaff]);
  const taskIds = new Set(tasks.flatMap((t) => t.items.map((n) => n.id)));

  const list = inbox.filter((n) => !taskIds.has(n.id) && (filter === "all" || !isRead(n)));
  const byDay = list.reduce((acc, n) => {
    const label = dayLabel(n.created_date);
    (acc[label] = acc[label] || []).push(n);
    return acc;
  }, {});
  const dayOrder = ["Today", "Yesterday", "This week", "Earlier"].filter((d) => byDay[d]?.length);

  const markIds = (ids) => {
    if (!ids.length) return;
    markReadByIds(ids).then(() => emitNotificationsChanged("read")).catch(() => {});
  };

  const openNotification = (n) => {
    if (!isRead(n)) markIds([n.id]);
    const link = getNotificationLink(n);
    if (link) navigate(link);
    else setExpandedId((current) => (current === n.id ? null : n.id));
  };

  const openTask = (task) => {
    markIds(task.items.map((n) => n.id));
    navigate(task.link);
  };

  const removeFromMyInbox = (n) => {
    if (!inboxKey) return;
    dismissNotificationForUser(inboxKey, n.id);
    if (!isRead(n)) markIds([n.id]);
    setDismissTick((x) => x + 1);
    emitNotificationsChanged("dismissed");
  };

  const handleMarkAllAsRead = async () => {
    await markAllRead();
    emitNotificationsChanged("read");
    toast({ title: "All marked as read" });
  };

  const turnOn = async () => {
    setTurningOn(true);
    try {
      const result = await enableNotificationsFromTap();
      window.dispatchEvent(new Event("charityhub:push-permission-changed"));
      setEnv(getPushEnvironment());
      if (result.status === "subscribed") toast({ title: "Notifications are on for this phone" });
      else if (result.status === "denied") toast({ title: "Notifications are blocked", description: "Open Settings below to see how to allow them.", variant: "destructive" });
    } catch (error) {
      toast({ title: "Could not turn them on", description: error?.message, variant: "destructive" });
    } finally {
      setTurningOn(false);
    }
  };

  const openComposer = (preset) => {
    setFormData(preset ? { ...EMPTY_FORM, ...preset } : EMPTY_FORM);
    setFormOpen(true);
  };

  const blanksLeft = /\[[^\]]+\]/.test(`${formData.title} ${formData.message}`);

  const handleSend = async () => {
    if (blanksLeft) {
      toast({ title: "Fill in the [ ] parts first", description: "Replace the words in [brackets] with the real details.", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      await charityClient.notifications.send({ ...formData, title: formData.title.trim(), message: formData.message.trim() });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await refreshNotifications();
      setFormOpen(false);
      setFormData(EMPTY_FORM);
      toast({ title: "Sent", description: formData.target_type === "admins" ? "Sent to the admins." : "Sent to everyone." });
    } catch (err) {
      toast({ title: "Could not send", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleDeleteBatch = async (batch) => {
    setIsDeletingBatch(true);
    try {
      await charityClient.notifications.deleteSentBatch({
        batch_created_at: batch.batch_created_at, title: batch.title, message: batch.message, recipient_scope: "all",
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notifications", "sent-batches"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
      await refreshNotifications();
      emitNotificationsChanged("deleted");
      toast({ title: "Deleted for everyone" });
    } catch (err) {
      toast({ title: "Could not delete", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsDeletingBatch(false);
    }
  };

  const pushOff = env.state === "ready" && env.permission === "default";
  const pushBlocked = env.state === "ready" && env.permission === "denied";
  const pushNeedsInstall = env.state === "ios-install";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-slate-500">{unreadCount > 0 ? `${unreadCount} new` : "You're all caught up"}</p>
        </div>
        {isAdmin && (
          <Button onClick={() => openComposer()} className="h-11 shrink-0 gap-2 bg-emerald-600 px-4 text-base hover:bg-emerald-700">
            <Send className="h-4 w-4" />Send a message
          </Button>
        )}
      </div>

      {/* This phone: one tap */}
      {(pushOff || pushBlocked || pushNeedsInstall) && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <BellRing className="h-8 w-8 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-amber-950 dark:text-amber-100">
              {pushBlocked ? "Notifications are blocked on this phone" : "Notifications are off on this phone"}
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {pushBlocked ? "You'll miss payments to check. See how to allow them." : pushNeedsInstall ? "Add the app to your Home Screen first." : "Turn them on so you never miss anything."}
            </p>
          </div>
          {pushOff ? (
            <Button onClick={turnOn} disabled={turningOn} className="h-11 shrink-0 bg-amber-600 px-4 hover:bg-amber-700">
              {turningOn ? <Loader2 className="h-4 w-4 animate-spin" /> : "Turn on"}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setTab("settings")} className="h-11 shrink-0 bg-white">How?</Button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <TabButton active={tab === "inbox"} onClick={() => setTab("inbox")} count={unreadCount}><Bell className="h-4 w-4" />Inbox</TabButton>
        {isAdmin && <TabButton active={tab === "sent"} onClick={() => setTab("sent")}><Megaphone className="h-4 w-4" />Sent</TabButton>}
        <TabButton active={tab === "settings"} onClick={() => setTab("settings")}><SettingsIcon className="h-4 w-4" />Settings</TabButton>
      </div>

      {/* ── Inbox ── */}
      {tab === "inbox" && (
        <div className="space-y-5">
          {tasks.length > 0 && (
            <section className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Needs you</p>
              {tasks.map((task) => {
                const Icon = task.icon;
                const n = task.items.length;
                return (
                  <button key={task.category} type="button" onClick={() => openTask(task)}
                    className="flex w-full items-center gap-3 rounded-2xl border-2 border-emerald-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-400 active:scale-[0.99] dark:border-emerald-900 dark:bg-slate-900">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${task.tone}`}><Icon className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-bold text-slate-900 dark:text-white">{n} {n === 1 ? task.one : task.many}</span>
                      <span className="block truncate text-sm text-slate-500">{task.items[0]?.message}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-emerald-700">Open<ChevronRight className="h-4 w-4" /></span>
                  </button>
                );
              })}
            </section>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              {[["all", "All"], ["unread", "Unread"]].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setFilter(v)} aria-pressed={filter === v}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ${filter === v ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                  {l}
                </button>
              ))}
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" onClick={handleMarkAllAsRead} className="h-9 gap-1.5 bg-white text-sm">
                <CheckCheck className="h-4 w-4" />Mark all read
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : dayOrder.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center dark:border-slate-700">
              <BellOff className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">{filter === "unread" ? "Nothing unread." : tasks.length ? "Nothing else." : "No notifications yet."}</p>
            </div>
          ) : (
            dayOrder.map((day) => (
              <section key={day} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{day}</p>
                {byDay[day].map((n) => {
                  const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
                  const Icon = cfg.icon;
                  const read = isRead(n);
                  const link = getNotificationLink(n);
                  return (
                    <div key={n.id}
                      className={`flex items-start gap-3 rounded-2xl border p-3.5 transition ${read ? "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" : "border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20"}`}>
                      <button type="button" onClick={() => openNotification(n)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${cfg.color}`}><Icon className="h-5 w-5" /></span>
                        <span className="min-w-0 flex-1">
                          <span className={`block leading-snug ${read ? "font-medium text-slate-700 dark:text-slate-200" : "font-bold text-slate-900 dark:text-white"}`}>
                            {!read && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-500 align-middle" />}{n.title}
                          </span>
                          <span className={`mt-0.5 block whitespace-pre-line text-sm text-slate-600 dark:text-slate-300 ${expandedId === n.id ? "" : "line-clamp-2"}`}>{n.message}</span>
                          <span className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                            {format(new Date(n.created_date), "d MMM, h:mm a")}
                            {link && <span className="inline-flex items-center font-medium text-emerald-700">Open<ChevronRight className="h-3 w-3" /></span>}
                          </span>
                        </span>
                      </button>
                      <button type="button" onClick={() => removeFromMyInbox(n)} title="Remove from my inbox" aria-label="Remove from my inbox"
                        className="shrink-0 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </section>
            ))
          )}
        </div>
      )}

      {/* ── Sent (admins) ── */}
      {tab === "sent" && isAdmin && (
        <section className="space-y-3">
          <p className="text-sm text-slate-500">Messages sent in the last 30 days. Send one again, or delete it for everyone.</p>
          {isLoadingSentBatches ? (
            <div className="flex items-center gap-2 py-8 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : sentBatches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center dark:border-slate-700">
              <Megaphone className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">Nothing sent yet.</p>
              <Button onClick={() => openComposer()} className="mt-3 gap-2 bg-emerald-600 hover:bg-emerald-700"><Send className="h-4 w-4" />Send a message</Button>
            </div>
          ) : (
            sentBatches.map((batch) => (
              <div key={`${batch.batch_created_at}|${batch.title}`} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <p className="font-semibold text-slate-900 dark:text-white">{batch.title}</p>
                <p className="mt-0.5 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{batch.message}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(batch.batch_created_at), "d MMM yyyy, h:mm a")}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{batch.total_recipients} people · {audienceText(batch.audience_label)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" className="h-9 gap-1.5 bg-white"
                    onClick={() => openComposer({ title: batch.title, message: batch.message, type: batch.type || "info", target_type: batch.audience_label === "admins" ? "admins" : "all" })}>
                    <Repeat2 className="h-4 w-4" />Send again
                  </Button>
                  <Button variant="ghost" className="h-9 gap-1.5 text-slate-500 hover:text-rose-600" onClick={() => setBatchTarget(batch)}>
                    <Trash2 className="h-4 w-4" />Delete for everyone
                  </Button>
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {/* ── Settings ── */}
      {tab === "settings" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <NotificationSettingsCard />
        </section>
      )}

      {/* Delete a sent message for everyone */}
      <AlertDialog open={Boolean(batchTarget)} onOpenChange={(o) => { if (!o) setBatchTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete for everyone?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{batchTarget?.title}</strong> will be removed from everyone's inbox. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingBatch}>Keep it</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" disabled={isDeletingBatch}
              onClick={async () => { const t = batchTarget; setBatchTarget(null); await handleDeleteBatch(t); }}>
              {isDeletingBatch ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send a message: pick a ready-made one, check, send */}
      <Dialog open={formOpen} onOpenChange={(v) => !sending && setFormOpen(v)}>
        <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Send className="h-5 w-5 text-emerald-600" />Send a message</DialogTitle>
            <DialogDescription>Tap a ready-made message, change it if needed, and send.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-2">
            {TEMPLATES.map((t) => {
              const Icon = t.icon;
              const on = formData.title === t.title && formData.type === t.type && formData.target_type === t.to;
              return (
                <button key={t.key} type="button"
                  onClick={() => setFormData({ title: t.title, message: t.message, type: t.type, target_type: t.to })}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-2.5 text-xs font-semibold ${on ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"}`}>
                  <Icon className="h-5 w-5" />{t.label}
                </button>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="msg-title">Title</Label>
            <Input id="msg-title" value={formData.title} maxLength={120} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Meeting on Friday" className="h-11 text-base" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="msg-body">Message</Label>
            <Textarea id="msg-body" rows={4} value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Write a short, clear message" className="text-base" />
            {blanksLeft && <p className="text-xs font-medium text-amber-700">Replace the words in [brackets] with the real details.</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Who gets it?</Label>
            <div className="grid grid-cols-2 gap-2">
              {[["all", "Everyone", Users], ["admins", "Admins only", Lock]].map(([v, l, Icon]) => (
                <button key={v} type="button" onClick={() => setFormData({ ...formData, target_type: v })}
                  className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-semibold ${formData.target_type === v ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"}`}>
                  <Icon className="h-4 w-4" />{l}
                </button>
              ))}
            </div>
          </div>

          {isLoadingDeliveryPreview ? (
            <p className="flex items-center gap-2 text-xs text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" />Checking who will get it…</p>
          ) : deliveryPreview && (
            <div className="space-y-1 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <p className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-100">
                <Radio className="h-3.5 w-3.5 text-emerald-600" />{deliveryPreview.total_recipients} people · {deliveryPreview.push_enabled_count} get it on their phone now
              </p>
              {deliveryPreview.in_app_only_count > 0 && (
                <p className="flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5 text-amber-600" />{deliveryPreview.in_app_only_count} see it next time they open the app</p>
              )}
              {!deliveryPreview.web_push_configured && <p className="text-amber-700">Phone alerts are not set up on the server; everyone sees it in the app.</p>}
            </div>
          )}

          <Button onClick={handleSend} disabled={sending || !formData.title.trim() || !formData.message.trim()}
            className="h-12 w-full gap-2 bg-emerald-600 text-base hover:bg-emerald-700">
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            Send to {formData.target_type === "admins" ? "admins" : "everyone"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// @ts-nocheck
import React, { useState, useEffect } from "react";
import { charityClient } from "@/api/charityClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  Bell, BellOff, Plus, Trash2, Loader2,
  Info, CheckCircle, AlertTriangle, Receipt, Heart,
  CheckCircle2, Clock, Users, Megaphone,
} from "lucide-react";
import { format } from "@/lib/dateTime";
import { useToast } from "@/components/ui/use-toast";
import {
  dismissNotificationForUser,
  emitNotificationsChanged,
  isNotificationDismissed,
} from "@/lib/notificationState";
import { useNotifications } from "@/context/NotificationContext";

const TYPE_CONFIG = {
  info: { label: "General", color: "bg-blue-100 text-blue-700", icon: Info },
  success: { label: "Good News", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  warning: { label: "Important", color: "bg-amber-100 text-amber-700", icon: AlertTriangle },
  payment: { label: "Payment", color: "bg-purple-100 text-purple-700", icon: Receipt },
  campaign: { label: "Campaign", color: "bg-rose-100 text-rose-700", icon: Heart },
};

function resolveAudience(label) {
  if (!label || label === "unknown") return "All Members";
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function Notifications() {
  const [formOpen, setFormOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);      // individual notification
  const [batchTarget, setBatchTarget] = useState(null);      // sent batch
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);
  const [formData, setFormData] = useState({
    title: "", message: "", type: "info", target_type: "all",
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { notifications, unreadCount, isLoading, refreshNotifications, markReadByIds, markAllRead } =
    useNotifications();

  useEffect(() => {
    charityClient.auth.me().then(setUser).catch(() => { });
  }, []);

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  const { data: sentBatches = [], isLoading: isLoadingSentBatches } = useQuery({
    queryKey: ["notifications", "sent-batches"],
    queryFn: () => charityClient.notifications.listSentBatches({ minutes: 10080, limit: 25 }),
    enabled: isAdmin,
  });

  const userNotifications = notifications.filter((n) => {
    if (isNotificationDismissed(user?.email, n.id)) return false;
    if (!n.target_type || n.target_type === "all") return true;
    if (n.target_type === "member" && n.target_member_id === user?.email) return true;
    if (n.target_type === "admins" && isAdmin) return true;
    return false;
  });

  const isRead = (n) => n?.is_read || Boolean(n?.read_by?.includes(user?.email));

  const markAsRead = async (n) => {
    if (!isRead(n)) {
      await markReadByIds([n.id]);
      emitNotificationsChanged("read");
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllRead();
    emitNotificationsChanged("read");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await charityClient.notifications.send({ ...formData });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await refreshNotifications();
      setFormOpen(false);
      setFormData({ title: "", message: "", type: "info", target_type: "all" });
      toast({ title: "Announcement sent!" });
    } catch (err) {
      toast({ title: "Failed to send", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNotification = async (notification) => {
    try {
      if (isAdmin) {
        await charityClient.notifications.delete(notification.id);
        await queryClient.invalidateQueries({ queryKey: ["notifications"] });
        await refreshNotifications();
        emitNotificationsChanged("deleted");
        toast({ title: "Notification deleted" });
        return;
      }
      dismissNotificationForUser(user?.email, notification.id);
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await refreshNotifications();
      emitNotificationsChanged("dismissed");
      toast({ title: "Removed from your inbox" });
    } catch (err) {
      toast({
        title: err?.status === 403 ? "Not allowed" : "Could not remove",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteBatch = async (batch) => {
    setIsDeletingBatch(true);
    try {
      await charityClient.notifications.deleteSentBatch({
        batch_created_at: batch.batch_created_at,
        title: batch.title,
        message: batch.message,
        recipient_scope: "all",
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notifications", "sent-batches"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
      await refreshNotifications();
      emitNotificationsChanged("deleted");
      toast({ title: "Announcement deleted" });
    } catch (err) {
      toast({ title: "Delete failed", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsDeletingBatch(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isAdmin
              ? "Send announcements to members and review your inbox"
              : "Your latest updates and announcements"}
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setFormOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            Send Announcement
          </Button>
        )}
      </div>

      {/* ── Send History (admin only) ────────────────────────────────── */}
      {isAdmin && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Send History
              </span>
            </div>
            <span className="text-xs text-slate-400">Last 7 days</span>
          </div>

          {isLoadingSentBatches ? (
            <div className="flex items-center gap-2 py-8 text-sm text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : sentBatches.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center">
              <Megaphone className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No announcements sent this week</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sentBatches.map((batch) => (
                <div
                  key={`${batch.batch_created_at}|${batch.title}`}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-medium text-slate-900 truncate">{batch.title}</p>
                    <p className="text-sm text-slate-500 line-clamp-1">{batch.message}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400 pt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(batch.batch_created_at), "d MMM yyyy, h:mm a")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {batch.total_recipients} · {resolveAudience(batch.audience_label)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setBatchTarget(batch)}
                    className="text-slate-300 hover:text-rose-500 transition-colors p-1 mt-0.5 rounded shrink-0"
                    title="Delete this announcement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── My Inbox ─────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              My Inbox
            </span>
            {unreadCount > 0 && (
              <Badge className="bg-emerald-500 text-white text-xs h-5 px-1.5 leading-none">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Mark all as read
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : userNotifications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center">
            <BellOff className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">You're all caught up — no notifications</p>
          </div>
        ) : (
          <div className="space-y-2">
            {userNotifications.map((notification) => {
              const cfg = TYPE_CONFIG[notification.type] || TYPE_CONFIG.info;
              const isApp = String(notification.title || "").startsWith("Request Approved");
              const isUpd = String(notification.title || "").startsWith("Request Update");
              const Icon = isApp ? CheckCircle2 : isUpd ? AlertTriangle : cfg.icon;
              const iconClass = isApp
                ? "bg-emerald-100 text-emerald-700"
                : isUpd ? "bg-amber-100 text-amber-700"
                  : cfg.color;
              const read = isRead(notification);

              return (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification)}
                  className={`relative flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-all group
                    ${read
                      ? "border-slate-200 bg-white hover:bg-slate-50"
                      : "border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50"
                    }`}
                >
                  {/* Unread dot */}
                  {!read && (
                    <span className="absolute top-4 right-10 w-2 h-2 rounded-full bg-emerald-500" />
                  )}

                  <div className={`w-9 h-9 rounded-lg ${iconClass} flex items-center justify-center shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0 pr-2">
                    <p className={`font-medium leading-snug ${read ? "text-slate-700" : "text-slate-900"}`}>
                      {notification.title}
                    </p>
                    <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{notification.message}</p>
                    <p className="text-xs text-slate-400 mt-1.5">
                      {format(new Date(notification.created_date), "d MMM yyyy, h:mm a")}
                    </p>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(notification); }}
                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all p-1 rounded shrink-0 mt-0.5"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Delete Notification Confirm ─────────────────────────────── */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this notification?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.title}</strong> will be{" "}
              {isAdmin ? "permanently deleted for everyone." : "removed from your inbox."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={async () => {
                const target = deleteTarget;
                setDeleteTarget(null);
                await handleDeleteNotification(target);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Batch Confirm ────────────────────────────────────── */}
      <AlertDialog open={Boolean(batchTarget)} onOpenChange={(o) => { if (!o) setBatchTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{batchTarget?.title}</strong> will be removed from everyone's inbox.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingBatch}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              disabled={isDeletingBatch}
              onClick={async () => {
                const target = batchTarget;
                setBatchTarget(null);
                await handleDeleteBatch(target);
              }}
            >
              {isDeletingBatch ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Send Announcement Dialog ────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Announcement</DialogTitle>
            <DialogDescription>
              Delivered immediately to the audience you choose.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Challan Due Reminder"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Write a clear, short message for your audience…"
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">📋 General</SelectItem>
                    <SelectItem value="success">✅ Good News</SelectItem>
                    <SelectItem value="warning">⚠️ Important</SelectItem>
                    <SelectItem value="payment">💳 Payment</SelectItem>
                    <SelectItem value="campaign">❤️ Campaign</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Send To</Label>
                <Select value={formData.target_type} onValueChange={(v) => setFormData({ ...formData, target_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">👥 Everyone</SelectItem>
                    <SelectItem value="admins">🔒 Admins only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !formData.title.trim() || !formData.message.trim()}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Send Now
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
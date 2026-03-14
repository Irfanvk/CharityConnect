import React, { useState, useEffect } from "react";
import { charityClient } from "@/api/charityClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
  DialogDescription,
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
  Plus, Bell, Info, CheckCircle, AlertTriangle, 
  Receipt, Heart, Trash2, Loader2 
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import {
  dismissNotificationForUser,
  emitNotificationsChanged,
  isNotificationDismissed,
} from "@/lib/notificationState";

const typeConfig = {
  info: { label: "Info", color: "bg-blue-100 text-blue-700", icon: Info },
  success: { label: "Success", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  warning: { label: "Warning", color: "bg-amber-100 text-amber-700", icon: AlertTriangle },
  payment: { label: "Payment", color: "bg-purple-100 text-purple-700", icon: Receipt },
  campaign: { label: "Campaign", color: "bg-rose-100 text-rose-700", icon: Heart },
};

export default function Notifications() {
  const [formOpen, setFormOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    target_type: 'all',
  });
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    charityClient.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => charityClient.notifications.list({ order: '-created_date' }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => charityClient.notifications.send(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setFormOpen(false);
      setFormData({ title: '', message: '', type: 'info', target_type: 'all' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => charityClient.notifications.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, title, isAdmin }) => {
      await charityClient.notifications.delete(id);
      // Log audit for admin deletion action
      if (isAdmin) {
        await charityClient.auditLogs.create({
          action_type: "notification_deleted_record",
          performed_by: user?.email,
          performed_by_name: user?.full_name,
          target_type: "Notification",
          target_id: id,
          target_name: title
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  // Filter notifications for current user
  const userNotifications = notifications.filter(n => {
    if (isNotificationDismissed(user?.email, n.id)) return false;
    if (!n.target_type) return true;
    if (n.target_type === 'all') return true;
    if (n.target_type === 'member' && n.target_member_id === user?.email) return true;
    if (n.target_type === 'admins' && isAdmin) return true;
    return false;
  });

  const isRead = (notification) => {
    if (notification?.is_read) return true;
    return Boolean(notification?.read_by?.includes(user?.email));
  };

  const markAsRead = async (notification) => {
    if (!isRead(notification)) {
      await charityClient.notifications.markAsRead(notification.id);
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      emitNotificationsChanged('read');
    }
  };

  const handleDeleteNotification = async (notification) => {
    try {
      if (isAdmin) {
        await deleteMutation.mutateAsync({
          id: notification.id,
          title: notification.title,
          isAdmin,
        });
        emitNotificationsChanged('deleted');
        toast({
          title: 'Notification deleted',
          description: 'Notification has been removed.',
        });
        return;
      }

      // Members can only remove from their own list (local dismiss), not globally delete.
      dismissNotificationForUser(user?.email, notification.id);
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      emitNotificationsChanged('dismissed');
      toast({
        title: 'Notification removed',
        description: 'This notification was removed from your list.',
      });
    } catch (error) {
      const isForbidden = error?.status === 403;
      toast({
        title: isForbidden ? 'Action not allowed' : 'Could not remove notification',
        description: isForbidden
          ? 'Only admins can delete notifications for everyone.'
          : (error?.message || 'Please try again.'),
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await createMutation.mutateAsync({ ...formData });
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500">Stay updated with latest announcements</p>
        </div>
        {isAdmin && (
          <Button 
            onClick={() => setFormOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Post Notification
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading notifications...</div>
      ) : userNotifications.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="text-center py-12">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No notifications yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {userNotifications.map((notification) => {
            const type = typeConfig[notification.type] || typeConfig.info;
            const TypeIcon = type.icon;
            const read = isRead(notification);

            return (
              <Card 
                key={notification.id} 
                className={`border-0 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                  !read ? 'bg-emerald-50/50 border-l-4 border-l-emerald-500' : ''
                }`}
                onClick={() => markAsRead(notification)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg ${type.color} flex items-center justify-center flex-shrink-0`}>
                      <TypeIcon className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900">{notification.title}</h3>
                            {!read && (
                              <Badge className="bg-emerald-500 text-white text-xs">New</Badge>
                            )}
                          </div>
                          <p className="text-slate-600">{notification.message}</p>
                          <p className="text-xs text-slate-400 mt-2">
                            {format(new Date(notification.created_date), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                        
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setDeleteTarget(notification);
                          }}
                          className="text-slate-400 hover:text-rose-500"
                          title={isAdmin ? "Delete this notification record" : "Remove notification"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete/Remove Confirmation Dialog */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle>{isAdmin ? "Delete Notification Record" : "Remove Notification"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isAdmin ? (
                <>
                  Are you sure you want to delete <strong>{deleteTarget?.title}</strong>?
                </>
              ) : (
                <>
                  Remove <strong>{deleteTarget?.title}</strong> from your notification list?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600"
              onClick={async () => {
                const target = deleteTarget;
                setDeleteTarget(null);
                if (target) {
                  await handleDeleteNotification(target);
                }
              }}
            >
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Notification Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Post Notification</DialogTitle>
            <DialogDescription>
              Create and send a notification to members or admins.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Notification title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                placeholder="Write your message..."
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({...formData, type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="payment">Payment</SelectItem>
                    <SelectItem value="campaign">Campaign</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Target</Label>
                <Select
                  value={formData.target_type}
                  onValueChange={(value) => setFormData({...formData, target_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    <SelectItem value="admins">Admins Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !formData.title || !formData.message}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Post Notification
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
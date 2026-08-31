import React, { useState, useEffect, useMemo } from "react";
import { formatMemberId } from "@/lib/utils";
import { charityClient } from "@/api/charityClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { emitNotificationsChanged } from "@/lib/notificationState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Shield, UserCog, Loader2, Crown, Check, Search, Bell, Smartphone, Clock3, ChevronRight } from "lucide-react";
import { format, formatISTDateTime } from "@/lib/dateTime";

const SUPERADMIN_USERS_BATCH_LIMIT = 200;

export default function SuperadminPanel() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, userId: null, targetRole: null, userName: null });

  const queryClient = useQueryClient();
  const isSuperadmin = user?.role === 'superadmin';

  useEffect(() => {
    charityClient.auth.me().then(setUser).catch(() => { });
  }, []);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      let allUsers = [];
      let skip = 0;

      while (true) {
        const chunk = await charityClient.users.list({
          skip,
          limit: SUPERADMIN_USERS_BATCH_LIMIT,
        });

        allUsers = allUsers.concat(chunk);

        if (chunk.length === 0 || chunk.length < SUPERADMIN_USERS_BATCH_LIMIT) {
          break;
        }

        skip += SUPERADMIN_USERS_BATCH_LIMIT;
      }

      return allUsers;
    },
    enabled: isSuperadmin && activeSection === 'roles',
  });

  const { data: monitoringData, isLoading: isMonitoringLoading } = useQuery({
    queryKey: ['admin', 'user-monitoring'],
    queryFn: () => charityClient.admin.userMonitoring(),
    enabled: isSuperadmin && activeSection === 'monitoring',
  });

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return users;
    }

    return users.filter((u) => {
      const fields = [
        u.username,
        u.full_name,
        u.email,
        u.phone,
        u.member_code,
        u.member_id,
        u.role,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

      return fields.some((value) => value.includes(query));
    });
  }, [users, search]);

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }) => charityClient.users.update(userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      emitNotificationsChanged('updated');
      setConfirmDialog({ open: false, userId: null, targetRole: null, userName: null });
    },
  });

  const handlePromoteRequest = (userId, currentRole, userName) => {
    // Determine target role
    let targetRole = null;
    if (currentRole === 'member') {
      targetRole = 'admin';
    } else if (currentRole === 'admin') {
      targetRole = 'superadmin';
    }

    if (targetRole) {
      setConfirmDialog({
        open: true,
        userId,
        targetRole,
        userName,
        currentRole
      });
    }
  };

  const handleDemoteRequest = (userId, currentRole, userName) => {
    // Determine target role
    let targetRole = null;
    if (currentRole === 'admin') {
      targetRole = 'member';
    } else if (currentRole === 'superadmin') {
      targetRole = 'admin';
    }

    if (targetRole) {
      setConfirmDialog({
        open: true,
        userId,
        targetRole,
        userName,
        currentRole
      });
    }
  };

  const confirmRoleChange = () => {
    if (confirmDialog.userId && confirmDialog.targetRole) {
      updateRoleMutation.mutate({
        userId: confirmDialog.userId,
        role: confirmDialog.targetRole
      });
    }
  };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'superadmin': return 'default'; // dark
      case 'admin': return 'secondary';
      case 'member': return 'outline';
      default: return 'outline';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'superadmin': return <Crown className="w-3 h-3" />;
      case 'admin': return <Shield className="w-3 h-3" />;
      default: return null;
    }
  };

  const monitoredUsers = monitoringData?.users || [];

  const notificationStatus = (status) => {
    const labels = {
      enabled: 'Enabled',
      disabled: 'Blocked',
      permission_granted_no_subscription: 'Needs resync',
      not_requested: 'Not requested',
      unsupported: 'Unsupported',
      unknown: 'Not reported',
    };
    return labels[status] || 'Not reported';
  };

  const notificationStatusClass = (status) => {
    if (status === 'enabled') return 'bg-emerald-100 text-emerald-700';
    if (status === 'disabled') return 'bg-rose-100 text-rose-700';
    return 'bg-amber-100 text-amber-700';
  };

  const openSection = (section) => {
    setSearch("");
    setActiveSection(section);
  };

  if (!isSuperadmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="border-0 shadow-sm max-w-md">
          <CardContent className="p-8 text-center">
            <Crown className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Superadmin Access Required</h2>
            <p className="text-slate-500">Only superadmins can access this panel.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Crown className="w-8 h-8 text-slate-700" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Superadmin Panel</h1>
          <p className="text-slate-500">Manage user roles and system administration</p>
        </div>
      </div>

      {!activeSection && (
        <div className="border border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => openSection('roles')}
            className="flex w-full items-center gap-4 border-b border-slate-200 px-4 py-4 text-left transition-colors hover:bg-slate-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700"><UserCog className="w-5 h-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-slate-900">Role Management</span>
              <span className="block text-sm text-slate-500">Review users and change member, admin, and superadmin roles.</span>
            </span>
            <ChevronRight className="w-5 h-5 shrink-0 text-slate-400" />
          </button>
          <button
            type="button"
            onClick={() => openSection('monitoring')}
            className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-slate-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-sky-100 text-sky-700"><Bell className="w-5 h-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-slate-900">Activity & Notification Monitoring</span>
              <span className="block text-sm text-slate-500">See last activity, notification enrollment, and active devices.</span>
            </span>
            <ChevronRight className="w-5 h-5 shrink-0 text-slate-400" />
          </button>
        </div>
      )}

      {activeSection && (
        <Button type="button" variant="ghost" size="sm" onClick={() => setActiveSection(null)}>
          Back to administration options
        </Button>
      )}

      {activeSection === 'roles' && <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserCog className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-800">Role Management</h2>
          </div>

          <div className="mb-4 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Find user by name, email, phone, role, or member ID"
                className="pl-9"
              />
            </div>
            <p className="text-xs text-slate-500">
              Searching across complete users list: {users.length} total. Showing {filteredUsers.length} result(s).
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No users found
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Current Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        <div className="leading-tight">
                          <p>{u.full_name || u.username || 'User'}</p>
                          <p className="text-xs text-slate-500">{u.username ? `@${u.username}` : formatMemberId(u.member_code || u.member_id || u.id)}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">{u.email || '—'}</TableCell>
                      <TableCell className="text-slate-600">{u.phone || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(u.role)} className="gap-1">
                          {getRoleIcon(u.role)}
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          {/* Promote button */}
                          {u.role === 'member' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePromoteRequest(u.id, u.role, u.username || u.full_name)}
                              disabled={updateRoleMutation.isPending}
                            >
                              <Shield className="w-3 h-3 mr-1" />
                              Promote to Admin
                            </Button>
                          )}
                          {u.role === 'admin' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDemoteRequest(u.id, u.role, u.username || u.full_name)}
                                disabled={updateRoleMutation.isPending}
                              >
                                Demote to Member
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePromoteRequest(u.id, u.role, u.username || u.full_name)}
                                disabled={updateRoleMutation.isPending}
                              >
                                <Crown className="w-3 h-3 mr-1" />
                                Promote to Superadmin
                              </Button>
                            </>
                          )}
                          {u.role === 'superadmin' && u.id !== user?.id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDemoteRequest(u.id, u.role, u.username || u.full_name)}
                              disabled={updateRoleMutation.isPending}
                            >
                              Demote to Admin
                            </Button>
                          )}
                          {u.role === 'superadmin' && u.id === user?.id && (
                            <Badge variant="outline" className="gap-1">
                              <Check className="w-3 h-3" />
                              You
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>}

      {activeSection === 'monitoring' && <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-800">Activity & Notification Monitoring</h2>
            </div>
            <Badge variant="outline" className={monitoringData?.web_push_configured ? 'text-emerald-700' : 'text-rose-700'}>
              {monitoringData?.web_push_configured ? 'Web Push configured' : 'Web Push not configured'}
            </Badge>
          </div>

          {isMonitoringLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Last activity (IST)</TableHead>
                    <TableHead>Notifications</TableHead>
                    <TableHead>Devices</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monitoredUsers.map((monitoredUser) => (
                    <TableRow key={monitoredUser.user_id}>
                      <TableCell>
                        <div className="leading-tight">
                          <p className="font-medium">{monitoredUser.full_name || monitoredUser.username || 'User'}</p>
                          <p className="text-xs text-slate-500">@{monitoredUser.username} · {monitoredUser.role}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5"><Clock3 className="w-3.5 h-3.5" />{monitoredUser.last_seen_at ? formatISTDateTime(monitoredUser.last_seen_at) : 'Never'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline" className={notificationStatusClass(monitoredUser.notification_status)}>{notificationStatus(monitoredUser.notification_status)}</Badge>
                          <p className="text-xs text-slate-500">Permission: {monitoredUser.notification_permission} · {monitoredUser.device_display_mode || 'unknown mode'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        <span className="inline-flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" />{monitoredUser.push_devices?.length || 0} active</span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {monitoredUsers.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="py-8 text-center text-slate-500">No monitoring data available.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>}

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, userId: null, targetRole: null, userName: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Role Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change <strong>{confirmDialog.userName}</strong>'s role from{' '}
              <Badge variant="outline" className="mx-1">{confirmDialog.currentRole}</Badge> to{' '}
              <Badge variant="outline" className="mx-1">{confirmDialog.targetRole}</Badge>?
              <br /><br />
              {confirmDialog.targetRole === 'admin' && 'This will grant administrative privileges.'}
              {confirmDialog.targetRole === 'superadmin' && 'This will grant full superadmin privileges. Use with caution.'}
              {confirmDialog.targetRole === 'member' && 'This will remove administrative privileges.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateRoleMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRoleChange}
              disabled={updateRoleMutation.isPending}
            >
              {updateRoleMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Confirm'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

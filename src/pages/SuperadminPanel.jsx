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
import { Shield, UserCog, Loader2, Crown, Check, Search } from "lucide-react";
import { format } from "@/lib/dateTime";

const SUPERADMIN_USERS_BATCH_LIMIT = 200;

export default function SuperadminPanel() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [confirmDialog, setConfirmDialog] = useState({ open: false, userId: null, targetRole: null, userName: null });
  
  const queryClient = useQueryClient();

  useEffect(() => {
    charityClient.auth.me().then(setUser).catch(() => {});
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

  const isSuperadmin = user?.role === 'superadmin';

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

      {/* Role Management Card */}
      <Card>
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
      </Card>

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

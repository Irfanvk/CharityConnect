import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  UserPlus, Mail, Shield, Clock, CheckCircle, 
  XCircle, Loader2, Settings as SettingsIcon, Users 
} from "lucide-react";
import { format } from "date-fns";

export default function Settings() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteData, setInviteData] = useState({ phone: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: invites = [] } = useQuery({
    queryKey: ['invites'],
    queryFn: () => base44.entities.Invite.list('-created_date'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const createInviteMutation = useMutation({
    mutationFn: (data) => base44.entities.Invite.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites'] });
      setInviteOpen(false);
      setInviteData({ phone: '', email: '' });
    },
  });

  const generateInviteCode = () => {
    return 'INV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleInvite = async () => {
    setLoading(true);
    const code = generateInviteCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    await createInviteMutation.mutateAsync({
      invite_code: code,
      phone: inviteData.phone,
      email: inviteData.email,
      status: 'pending',
      invited_by: user?.email,
      expires_at: expiresAt.toISOString()
    });
    setLoading(false);
  };

  const isAdmin = user?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="border-0 shadow-sm max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Access Denied</h2>
            <p className="text-slate-500">Only administrators can access settings.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500">Manage invites and system settings</p>
      </div>

      <Tabs defaultValue="invites" className="space-y-6">
        <TabsList>
          <TabsTrigger value="invites">Invites</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        {/* Invites Tab */}
        <TabsContent value="invites" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Invite Codes</h2>
              <p className="text-sm text-slate-500">Generate codes to invite new members</p>
            </div>
            <Button 
              onClick={() => setInviteOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Generate Invite
            </Button>
          </div>

          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Invite Code</TableHead>
                    <TableHead>Phone/Email</TableHead>
                    <TableHead>Invited By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        No invites generated yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    invites.map((invite) => (
                      <TableRow key={invite.id}>
                        <TableCell>
                          <code className="px-2 py-1 bg-slate-100 rounded text-sm font-mono">
                            {invite.invite_code}
                          </code>
                        </TableCell>
                        <TableCell>
                          {invite.phone || invite.email || '-'}
                        </TableCell>
                        <TableCell>{invite.invited_by}</TableCell>
                        <TableCell>
                          <Badge className={
                            invite.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            invite.status === 'used' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-slate-100 text-slate-700'
                          }>
                            {invite.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {invite.expires_at && format(new Date(invite.expires_at), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">System Users</h2>
            <p className="text-sm text-slate-500">All registered users in the system</p>
          </div>

          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-semibold">
                              {u.full_name?.charAt(0)?.toUpperCase() || u.email?.charAt(0)?.toUpperCase()}
                            </div>
                            <span className="font-medium">{u.full_name || 'User'}</span>
                          </div>
                        </TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Badge className={u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}>
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {u.created_date && format(new Date(u.created_date), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Generate Invite Code</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <p className="text-sm text-slate-500">
              Enter phone number or email to associate with the invite code.
            </p>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={inviteData.phone}
                onChange={(e) => setInviteData({...inviteData, phone: e.target.value})}
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                value={inviteData.email}
                onChange={(e) => setInviteData({...inviteData, email: e.target.value})}
                placeholder="user@example.com"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleInvite}
                disabled={loading || (!inviteData.phone && !inviteData.email)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Generate Code
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { formatMemberId } from "@/lib/utils";
import { charityClient } from "@/api/charityClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { emitNotificationsChanged } from "@/lib/notificationState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PhoneInput from "@/components/ui/phone-input";
import { Card, CardContent } from "@/components/ui/card";
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
  UserPlus,
  Shield,
  Loader2,
  Eye,
  EyeOff,
  Settings2,
  MessageCircle,
  Share2,
  Copy,
  Check,
  AlertTriangle,
} from "lucide-react";

import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import UserProfilePopover, { AvatarCircle } from "@/components/UserProfilePopover";
import { useToast } from "@/components/ui/use-toast";

function CopyButton({ text, label }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard API may fail in non-secure contexts */ }
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`Copy ${label}`}
      className="shrink-0 inline-flex items-center justify-center rounded p-1 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function Settings() {

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteData, setInviteData] = useState({ phone: '', email: '' });
  const [shareMethod, setShareMethod] = useState('offline');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  // NEW
  const [activeTab, setActiveTab] = useState("invites");
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const queryClient = useQueryClient();

  const { toast } = useToast();

  useEffect(() => {
    charityClient.auth.me().then(setUser).catch(() => { });
  }, []);

  // App Settings API
  const { data: appSettings } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => charityClient.admin.getSettings(),
    enabled: activeTab === "preferences"
  });

  const memberStatsEnabled = appSettings?.member_stats_visible === true;

  const updateSettingsMutation = useMutation({
    mutationFn: (data) => charityClient.admin.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      emitNotificationsChanged('updated');
    },
  });

  useEffect(() => {
    charityClient.auth.me().then(setUser).catch(() => { });
  }, []);

  // INVITES API
  const { data: invites = [] } = useQuery({
    queryKey: ['invites'],
    queryFn: () => charityClient.invites.list({ order: '-created_date' }),
    enabled: activeTab === "invites"
  });

  // USERS API
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => charityClient.users.list(),
    enabled: activeTab === "users"
  });

  const createInviteMutation = useMutation({
    mutationFn: (data) => charityClient.invites.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites'] });
      emitNotificationsChanged('updated');
      setInviteOpen(false);
      setInviteData({ phone: '', email: '' });
      setShareMethod('offline');
    },
  });

  const handleInvite = async () => {
    setLoading(true);

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);

    const result = await createInviteMutation.mutateAsync({
      phone: inviteData.phone || null,
      email: inviteData.email || null,
      expiry_date: expiryDate.toISOString()
    });

    setLoading(false);

    if (shareMethod === 'whatsapp' && result?.invite_code) {
      const rawPhone = (inviteData.phone || '').replace(/\D/g, '');
      const registrationUrl = `${window.location.origin}/register?invite_code=${encodeURIComponent(result.invite_code)}`;
      const shareMessage = result.share_message || [
        'Assalamu Alaikum',
        '',
        "You've been invited to join PMB GCC PORTAL!",
        '',
        'Use this invite code to register:',
        result.invite_code,
        '',
        'Open your registration link:',
        registrationUrl,
        '',
        result.expiry_label || 'This invite expires in 7 days.',
      ].join('\n');
      const waUrl = rawPhone
        ? `https://wa.me/${rawPhone}?text=${encodeURIComponent(shareMessage)}`
        : result.whatsapp_share_url || `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const isSuperadmin = user?.role === 'superadmin';
  const isAdminOnly = user?.role === 'admin';

  const validatePasswordStrength = (value) => {
    if (!value || value.length < 8) return 'Password must be at least 8 characters long.';
    if (!/[A-Z]/.test(value)) return 'Password must include at least one uppercase letter.';
    if (!/[a-z]/.test(value)) return 'Password must include at least one lowercase letter.';
    if (!/\d/.test(value)) return 'Password must include at least one number.';
    if (!/[^A-Za-z0-9]/.test(value)) return 'Password must include at least one special character.';
    return '';
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      toast({ title: 'Current password required', description: 'Enter your current password.', variant: 'destructive' });
      return;
    }
    if (!newPassword.trim()) {
      toast({ title: 'New password required', description: 'Enter your new password.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', description: 'Confirm password must match new password.', variant: 'destructive' });
      return;
    }

    const validationError = validatePasswordStrength(newPassword);
    if (validationError) {
      toast({ title: 'Weak password', description: validationError, variant: 'destructive' });
      return;
    }

    setChangingPassword(true);
    try {
      const res = await charityClient.auth.changePassword(currentPassword.trim(), newPassword.trim());
      toast({ title: 'Password changed', description: res?.message || 'Password updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      const msg = error?.message || 'Failed to change password.';
      toast({ title: 'Password change failed', description: msg, variant: 'destructive' });
    } finally {
      setChangingPassword(false);
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="border-0 shadow-sm max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Access Denied</h2>
            <p className="text-slate-500">Only admin or superadmin users can access settings.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500">Manage invites and system settings</p>
      </div>

      {/* Tabs */}
      <Tabs
        defaultValue="invites"
        value={activeTab}
        onValueChange={(value) => setActiveTab(value)}
        className="space-y-6"
      >

        <TabsList>
          <TabsTrigger value="invites">Invites</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* INVITES TAB */}
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
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <code className="px-2 py-1 bg-slate-100 rounded text-sm font-mono inline-block">
                                {invite.invite_code}
                              </code>
                              <CopyButton text={invite.invite_code} label="Code" />
                            </div>
                            {invite.invite_code && (() => {
                              const regUrl = `${window.location.origin}/register?invite_code=${encodeURIComponent(invite.invite_code)}`;
                              return (
                                <div className="flex items-start gap-1.5">
                                  <a
                                    href={regUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-emerald-700 hover:text-emerald-800 hover:underline break-all"
                                  >
                                    {regUrl}
                                  </a>
                                  <CopyButton text={regUrl} label="Link" />
                                </div>
                              );
                            })()}
                          </div>
                        </TableCell>

                        <TableCell>
                          {invite.phone || invite.email || '-'}
                        </TableCell>

                        <TableCell>{invite.invited_by}</TableCell>

                        <TableCell>

                          <Badge className={
                            invite.status === 'pending'
                              ? 'bg-amber-100 text-amber-700'
                              : invite.status === 'used'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-700'
                          }>
                            {invite.status}
                          </Badge>

                        </TableCell>

                        <TableCell>
                          {invite.expiry_date &&
                            format(new Date(invite.expiry_date), "MMM d, yyyy")}
                        </TableCell>

                      </TableRow>
                    ))

                  )}

                </TableBody>

              </Table>

            </div>
          </Card>

        </TabsContent>

        {/* USERS TAB */}

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

                          <UserProfilePopover user={u}>
                            <div className="flex items-center gap-3">

                              <AvatarCircle avatarUrl={u.avatar_url} name={u.full_name || u.email} size="sm" />

                              <div className="leading-tight">
                                <p className="font-medium">
                                  {u.full_name || 'User'}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {u.username ? `@${u.username}` : formatMemberId(u.member_code || u.member_id || u.id)}
                                </p>
                              </div>

                            </div>
                          </UserProfilePopover>

                        </TableCell>

                        <TableCell>{u.email}</TableCell>

                        <TableCell>
                          <Badge className={
                            u.role === 'admin'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-slate-100 text-slate-700'
                          }>
                            {u.role}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          {u.created_date &&
                            format(new Date(u.created_date), "MMM d, yyyy")}
                        </TableCell>

                      </TableRow>
                    ))

                  )}

                </TableBody>

              </Table>

            </div>

          </Card>

        </TabsContent>

        {/* PREFERENCES TAB */}
        <TabsContent value="preferences" className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Dashboard Preferences</h2>
            <p className="text-sm text-slate-500">Control what members can see on their dashboard</p>
          </div>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm mt-0.5">
                    {memberStatsEnabled ? (
                      <Eye className="w-5 h-5 text-white" />
                    ) : (
                      <EyeOff className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">Show Collection Stats to Members</p>
                    <p className="text-sm text-slate-500 mt-1">
                      When enabled, members will see the collection overview (today, this week, this month, this year, all-time) on their dashboard.
                    </p>
                    <Badge className={`mt-2 text-xs border-0 ${memberStatsEnabled
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                      }`}>
                      {memberStatsEnabled ? 'Visible to members' : 'Hidden from members'}
                    </Badge>
                  </div>
                </div>
                <Switch
                  checked={memberStatsEnabled}
                  onCheckedChange={(checked) => {
                    updateSettingsMutation.mutate({ member_stats_visible: checked });
                  }}
                />
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-start gap-3">
                  <Settings2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-400">
                    This preference is saved on the server and applies to all members. Admins always see collection stats regardless of this setting.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SECURITY TAB */}
        <TabsContent value="security" className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Password & Security</h2>
            <p className="text-sm text-slate-500">Manage your account password based on your role policy.</p>
          </div>

          {isAdminOnly ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900">Superadmin approval required</p>
                    <p className="text-sm text-amber-800 mt-1">
                      Admin password changes require superadmin approval. Please submit a reset request through Forgot Password.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => {
                      window.location.href = '/forgotpassword';
                    }}
                  >
                    Request Password Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Enter current password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Enter new password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Re-enter new password"
                  />
                </div>

                <p className="text-xs text-slate-500">
                  Password must be at least 8 characters with uppercase, lowercase, number, and special character.
                </p>

                <div>
                  <Button
                    onClick={handleChangePassword}
                    disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {changingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Change Password
                  </Button>
                </div>

                {isSuperadmin && (
                  <p className="text-xs text-slate-500">
                    As superadmin, you can change your own password directly by entering your current password.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

      </Tabs>

      {/* Invite Dialog */}

      <Dialog open={inviteOpen} onOpenChange={(open) => { if (!open) { setShareMethod('offline'); setInviteData({ phone: '', email: '' }); } setInviteOpen(open); }}>

        <DialogContent className="max-w-md">

          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Generate Invite Code
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">

            {/* Sharing method toggle */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Sharing Method</Label>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShareMethod('offline')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium transition-colors ${shareMethod === 'offline'
                      ? 'bg-slate-800 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <Share2 className="w-4 h-4" />
                  Offline / Manual
                </button>
                <button
                  type="button"
                  onClick={() => setShareMethod('whatsapp')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium transition-colors border-l border-slate-200 ${shareMethod === 'whatsapp'
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </button>
              </div>
              {shareMethod === 'whatsapp' && (
                <p className="text-xs text-green-700 bg-green-50 rounded-md px-3 py-2">
                  After generating, WhatsApp will open with a pre-filled message containing the invite code and registration link.
                </p>
              )}
              {shareMethod === 'offline' && (
                <p className="text-xs text-slate-500">
                  The invite code will be generated and listed below. Share it with the recipient manually.
                </p>
              )}
            </div>

            <p className="text-sm text-slate-500">
              {shareMethod === 'whatsapp'
                ? 'Enter the phone number to send the WhatsApp invite to.'
                : 'Enter phone number or email to associate with the invite code.'}
            </p>

            <div className="space-y-2">
              <PhoneInput
                id="phone"
                label="Phone Number"
                value={inviteData.phone}
                onChange={(value) => setInviteData({ ...inviteData, phone: value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                value={inviteData.email}
                onChange={(e) =>
                  setInviteData({ ...inviteData, email: e.target.value })
                }
                placeholder="user@example.com"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">

              <Button variant="outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>

              <Button
                onClick={handleInvite}
                disabled={loading || (!inviteData.phone && !inviteData.email) || (shareMethod === 'whatsapp' && !inviteData.phone)}
                className={shareMethod === 'whatsapp' ? 'bg-green-600 hover:bg-green-700' : 'bg-emerald-600 hover:bg-emerald-700'}
              >
                {loading && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {shareMethod === 'whatsapp' ? (
                  <><MessageCircle className="w-4 h-4 mr-2" />Generate &amp; Send via WhatsApp</>
                ) : (
                  'Generate Code'
                )}
              </Button>

            </div>

          </div>

        </DialogContent>

      </Dialog>

    </div>
  );
}
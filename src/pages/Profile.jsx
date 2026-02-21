import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, Mail, Phone, MapPin, Calendar, Receipt, 
  TrendingUp, CheckCircle, Clock, Loader2, UserCircle, Trash2, AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import ContributionHistory from "@/components/profile/ContributionHistory";
import ReminderSettings from "@/components/profile/ReminderSettings";
import RecurringDonations from "@/components/profile/RecurringDonations";
import { useToast } from "@/components/ui/use-toast";
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

const statusConfig = {
  generated: { label: "Generated", color: "bg-slate-100 text-slate-700" },
  proof_uploaded: { label: "Uploaded", color: "bg-blue-100 text-blue-700" },
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", color: "bg-rose-100 text-rose-700" },
};

export default function Profile() {
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
    setFormData(currentUser);
  };

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list(),
  });

  const { data: challans = [] } = useQuery({
    queryKey: ['challans'],
    queryFn: () => base44.entities.Challan.list('-created_date'),
  });

  const { data: invites = [] } = useQuery({
    queryKey: ['invites'],
    queryFn: () => base44.entities.Invite.list(),
  });

  const { data: recurringDonations = [] } = useQuery({
    queryKey: ['recurringDonations', user?.email],
    queryFn: () => base44.entities.RecurringDonation.filter({ member_email: user?.email }),
    enabled: !!user,
  });

  // Find member profile for current user
  const memberProfile = members.find(m => 
    m.email === user?.email || m.phone === user?.phone
  );

  // User's challans
  const userChallans = challans.filter(c => c.created_by === user?.email);
  const totalContributed = userChallans
    .filter(c => c.status === 'approved')
    .reduce((sum, c) => sum + (c.amount || 0), 0);
  const pendingChallans = userChallans.filter(c => 
    c.status !== 'approved' && c.status !== 'rejected'
  ).length;

  // Find user's invite
  const userInvite = invites.find(i => 
    i.email === user?.email || i.phone === memberProfile?.phone
  );

  const handleSave = async () => {
    setLoading(true);
    try {
      await base44.auth.updateMe({
        full_name: formData.full_name,
        phone: formData.phone,
        email: formData.email,
      });

      // Update member record if exists
      if (memberProfile) {
        await base44.entities.Member.update(memberProfile.id, {
          phone: formData.phone,
          email: formData.email,
        });
      }

      await loadUser();
      setEditing(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccountDeletion = () => {
    toast({
      title: "Account Deletion Request",
      description: "Please contact your administrator to delete your account.",
    });
    setDeleteDialogOpen(false);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Profile</h1>
        <p className="text-slate-500 dark:text-slate-400">Manage your account and view history</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="border-0 shadow-sm lg:col-span-1">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
                {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
              </div>
              
              {editing ? (
                <div className="space-y-3 text-left">
                  <div>
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name || ''}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone || memberProfile?.phone || ''}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Save
                    </Button>
                    <Button variant="outline" onClick={() => setEditing(false)} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-semibold text-slate-900">{user.full_name || 'User'}</h2>
                  <Badge className="mt-2 capitalize">{user.role}</Badge>
                  
                  <div className="mt-6 space-y-3 text-left">
                    <div className="flex items-center gap-3 text-slate-600">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="text-sm">{user.email}</span>
                    </div>
                    {memberProfile && (
                      <>
                        <div className="flex items-center gap-3 text-slate-600">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <span className="text-sm">{memberProfile.phone}</span>
                        </div>
                        {memberProfile.city && (
                          <div className="flex items-center gap-3 text-slate-600">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            <span className="text-sm">{memberProfile.city}</span>
                          </div>
                        )}
                        {memberProfile.join_date && (
                          <div className="flex items-center gap-3 text-slate-600">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span className="text-sm">Joined {format(new Date(memberProfile.join_date), "MMM yyyy")}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full mt-6"
                    onClick={() => setEditing(true)}
                  >
                    Edit Profile
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="history">Contributions</TabsTrigger>
              <TabsTrigger value="recurring">Recurring</TabsTrigger>
              <TabsTrigger value="reminders">Settings</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
              {userInvite && <TabsTrigger value="invite">Invitation</TabsTrigger>}
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900">₹{totalContributed.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">Total Contributed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900">
                      {userChallans.filter(c => c.status === 'approved').length}
                    </p>
                    <p className="text-xs text-slate-500">Approved</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900">{pendingChallans}</p>
                    <p className="text-xs text-slate-500">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

              {/* Recent Payment History */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Recent Payments</CardTitle>
                </CardHeader>
                <CardContent>
                  {userChallans.length === 0 ? (
                    <p className="text-center py-8 text-slate-500">No payment history yet</p>
                  ) : (
                    <div className="space-y-3">
                      {userChallans.slice(0, 5).map((challan) => (
                        <div key={challan.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border">
                              <Receipt className="w-5 h-5 text-slate-400" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{challan.challan_number}</p>
                              <p className="text-sm text-slate-500">
                                {challan.type === 'monthly' 
                                  ? `Monthly - ${challan.month}` 
                                  : challan.campaign_name || 'Donation'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-slate-800">₹{challan.amount}</p>
                            <Badge className={statusConfig[challan.status]?.color || 'bg-slate-100'}>
                              {statusConfig[challan.status]?.label || challan.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <ContributionHistory challans={userChallans} />
            </TabsContent>

            <TabsContent value="recurring">
              <RecurringDonations recurringDonations={recurringDonations} user={user} />
            </TabsContent>

            <TabsContent value="reminders">
              <ReminderSettings user={user} />
            </TabsContent>

            <TabsContent value="account">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                    <CardTitle className="text-lg">Account Settings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                    <h3 className="font-semibold text-rose-900 dark:text-rose-200 mb-2">Delete Account</h3>
                    <p className="text-sm text-rose-700 dark:text-rose-300 mb-4">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <Button
                      variant="destructive"
                      onClick={() => setDeleteDialogOpen(true)}
                      className="select-none"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete My Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {userInvite && (
              <TabsContent value="invite">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <UserCircle className="w-5 h-5 text-slate-600" />
                      <CardTitle className="text-lg">Invitation Details</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 rounded-lg bg-slate-50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">Invite Code</span>
                        <span className="font-mono font-semibold text-slate-900">{userInvite.invite_code}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">Invited By</span>
                        <span className="font-medium text-slate-900">{userInvite.invited_by || 'Admin'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">Status</span>
                        <Badge className="bg-emerald-100 text-emerald-700">Used</Badge>
                      </div>
                      {userInvite.used_at && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-500">Joined On</span>
                          <span className="text-sm text-slate-900">
                            {format(new Date(userInvite.used_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      {/* Account Deletion Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Delete Account?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete your account and all associated data including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Profile information</li>
                <li>Payment history</li>
                <li>Recurring donations</li>
                <li>All personal data</li>
              </ul>
              <p className="mt-3 font-semibold">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="select-none">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAccountDeletion}
              className="bg-rose-600 hover:bg-rose-700 select-none"
            >
              Request Deletion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
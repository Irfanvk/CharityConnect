import React, { useState, useEffect } from "react";
import { charityClient } from "@/api/charityClient";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PhoneInput from "@/components/ui/phone-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, MapPin, Calendar, Receipt, 
  TrendingUp, CheckCircle, Clock, Loader2, UserCircle, Trash2, AlertTriangle, CreditCard, Pencil, Camera, X
} from "lucide-react";
import { format } from "date-fns";
import ContributionHistory from "@/components/profile/ContributionHistory";
import ReminderSettings from "@/components/profile/ReminderSettings";
import RecurringDonations from "@/components/profile/RecurringDonations";
import AvatarCropUpload from "@/components/profile/AvatarCropUpload";
import AvatarLightbox from "@/components/profile/AvatarLightbox";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [formData, setFormData] = useState({ full_name: '', phone: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentChangeOpen, setPaymentChangeOpen] = useState(false);
  const [newMonthlyAmount, setNewMonthlyAmount] = useState("");
  const [paymentChangeReason, setPaymentChangeReason] = useState("");
  const [submittingPaymentChange, setSubmittingPaymentChange] = useState(false);
  const [profileUpdateOpen, setProfileUpdateOpen] = useState(false);
  const [profileUpdateField, setProfileUpdateField] = useState("");
  const [profileUpdateCurrentValue, setProfileUpdateCurrentValue] = useState("");
  const [profileUpdateNewValue, setProfileUpdateNewValue] = useState("");
  const [profileUpdateReason, setProfileUpdateReason] = useState("");
  const [submittingProfileUpdate, setSubmittingProfileUpdate] = useState(false);
  const [generalRequestOpen, setGeneralRequestOpen] = useState(false);
  const [generalRequestType, setGeneralRequestType] = useState('general');
  const [generalRequestSubject, setGeneralRequestSubject] = useState('');
  const [generalRequestMessage, setGeneralRequestMessage] = useState('');
  const [submittingGeneralRequest, setSubmittingGeneralRequest] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const { toast } = useToast();
  const isMember = user?.role === 'member';

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await charityClient.auth.me();
    setUser(currentUser);
    setFormData({
      full_name: currentUser?.full_name || '',
      phone: currentUser?.phone || '',
      email: currentUser?.email || '',
    });
  };

  const handleAvatarSave = async (file) => {
    setUploadingAvatar(true);
    try {
      if (isMember) {
        const uploaded = await charityClient.files.uploadAvatar(file);
        const nextAvatarUrl = uploaded?.file_url || uploaded?.url || uploaded?.avatar_url;

        if (!nextAvatarUrl) {
          throw new Error('Avatar upload did not return a file URL');
        }

        await charityClient.requests.create({
          request_type: 'profile_update',
          subject: 'Profile photo update request',
          message: 'Please update my profile photo.',
          requested_changes: {
            avatar_url: nextAvatarUrl,
          },
        });

        toast({
          title: 'Request submitted',
          description: 'Your profile photo update request has been submitted for admin approval.',
        });
        return;
      }

      const updated = await charityClient.auth.uploadAvatar(file);
      setUser((prev) => ({ ...prev, avatar_url: updated.avatar_url }));
      toast({ title: "Profile photo updated" });
    } catch (error) {
      toast({ title: "Upload failed", description: error?.message || "Please try again.", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      if (isMember) {
        await charityClient.requests.create({
          request_type: 'profile_update',
          subject: 'Profile photo removal request',
          message: 'Please remove my current profile photo.',
          requested_changes: {
            avatar_url: null,
          },
        });

        toast({
          title: 'Request submitted',
          description: 'Your profile photo removal request has been submitted for admin approval.',
        });
        return;
      }

      await charityClient.auth.removeAvatar();
      setUser((prev) => ({ ...prev, avatar_url: null }));
      toast({ title: "Profile photo removed" });
    } catch (error) {
      toast({ title: "Remove failed", description: error?.message || "Please try again.", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => charityClient.members.list(),
  });

  const { data: challans = [] } = useQuery({
    queryKey: ['challans'],
    queryFn: () => charityClient.challans.list({ order: '-created_date' }),
  });

  const { data: invites = [] } = useQuery({
    queryKey: ['invites'],
    queryFn: () => charityClient.invites.list(),
  });

  const { data: myRequests = [] } = useQuery({
    queryKey: ['requests', 'mine', user?.email],
    queryFn: () => charityClient.requests.list({ limit: 200 }),
    enabled: Boolean(user?.email),
  });

  // Phase 1: RecurringDonations disabled - will implement in Phase 2
  const { data: recurringDonations = [] } = useQuery({
    queryKey: ['recurringDonations', user?.email],
    queryFn: async () => [],
    enabled: false, // Disabled for Phase 1
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

  const pendingMonthlyAmountRequest = myRequests.find(
    (request) => request.status === 'pending' && request.request_type === 'monthly_amount_change'
  );

  const pendingProfileFieldSet = new Set(
    myRequests
      .filter((request) => request.status === 'pending' && request.request_type === 'profile_update')
      .flatMap((request) => {
        try {
          const changes = JSON.parse(request.requested_changes || '{}');
          return changes && typeof changes === 'object' ? Object.keys(changes) : [];
        } catch {
          return [];
        }
      })
  );

  const handleSave = async () => {
    setLoading(true);
    try {
      const updatePayload = {
        full_name: formData.full_name,
        phone: formData.phone,
        email: formData.email,
      };

      let didUpdate = false;

      if (user?.id) {
        await charityClient.users.update(user.id, {
          full_name: updatePayload.full_name,
          email: updatePayload.email,
        });
        didUpdate = true;
      }

      // Update member record if exists
      if (memberProfile) {
        await charityClient.members.update(memberProfile.id, {
          full_name: updatePayload.full_name,
          phone: updatePayload.phone,
          email: updatePayload.email,
        });
        didUpdate = true;
      }

      if (!didUpdate) {
        throw new Error('No profile update endpoint is available for this user.');
      }

      await loadUser();
      setUser((prev) => ({
        ...(prev || {}),
        full_name: updatePayload.full_name,
        phone: updatePayload.phone,
        email: updatePayload.email,
      }));
      setEditing(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error?.message || "Failed to update profile.",
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

  const handleSubmitPaymentChange = async () => {
    const amount = Number(newMonthlyAmount);
    
    if (!amount || amount < 50 || amount > 10000) {
      toast({
        title: "Invalid amount",
        description: "Monthly payment must be between ₹50 and ₹10,000.",
        variant: "destructive",
      });
      return;
    }

    if (!paymentChangeReason.trim() || paymentChangeReason.trim().length < 10) {
      toast({
        title: "Reason required",
        description: "Please provide at least 10 characters explaining the change.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingPaymentChange(true);
    try {
      await charityClient.requests.create({
        request_type: 'monthly_amount_change',
        subject: 'Monthly amount change request',
        message: paymentChangeReason.trim(),
        requested_amount: amount,
      });

      toast({
        title: "Request submitted",
        description: "Your request has been submitted. The admin will review it shortly.",
      });
      
      setPaymentChangeOpen(false);
      setNewMonthlyAmount("");
      setPaymentChangeReason("");
    } catch (error) {
      toast({
        title: "Error",
        description: error?.message || "Failed to submit payment change request.",
        variant: "destructive",
      });
    } finally {
      setSubmittingPaymentChange(false);
    }
  };

  const openProfileUpdateDialog = (fieldKey, currentValue) => {
    setProfileUpdateField(fieldKey);
    setProfileUpdateCurrentValue(currentValue || '');
    setProfileUpdateNewValue('');
    setProfileUpdateReason('');
    setProfileUpdateOpen(true);
  };

  const handleSubmitProfileUpdateRequest = async () => {
    if (!profileUpdateField || !profileUpdateNewValue.trim()) {
      toast({
        title: 'New value required',
        description: 'Please provide a new value.',
        variant: 'destructive',
      });
      return;
    }

    setSubmittingProfileUpdate(true);
    try {
      await charityClient.requests.create({
        request_type: 'profile_update',
        subject: 'Profile update request',
        message: profileUpdateReason.trim() || `Please update my ${profileUpdateField}.`,
        requested_changes: {
          [profileUpdateField]: profileUpdateNewValue.trim(),
        },
      });

      toast({
        title: 'Request submitted',
        description: 'Your profile update request has been submitted for admin approval.',
      });
      setProfileUpdateOpen(false);
    } catch (error) {
      toast({
        title: 'Unable to submit request',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingProfileUpdate(false);
    }
  };

  const handleSubmitGeneralRequest = async () => {
    if (!generalRequestSubject.trim() || generalRequestSubject.trim().length > 100) {
      toast({
        title: 'Valid subject required',
        description: 'Subject is required and must be up to 100 characters.',
        variant: 'destructive',
      });
      return;
    }

    if (!generalRequestMessage.trim() || generalRequestMessage.trim().length < 20) {
      toast({
        title: 'Message too short',
        description: 'Message must be at least 20 characters.',
        variant: 'destructive',
      });
      return;
    }

    setSubmittingGeneralRequest(true);
    try {
      await charityClient.requests.create({
        request_type: generalRequestType,
        subject: generalRequestSubject.trim(),
        message: generalRequestMessage.trim(),
      });
      toast({
        title: 'Request submitted',
        description: 'Your request has been sent to admin.',
      });
      setGeneralRequestOpen(false);
      setGeneralRequestType('general');
      setGeneralRequestSubject('');
      setGeneralRequestMessage('');
    } catch (error) {
      toast({
        title: 'Unable to submit request',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingGeneralRequest(false);
    }
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
              {/* Avatar – click to enlarge; edit controls only shown when editing */}
              <div className="relative w-24 h-24 mx-auto mb-4">
                {/* Clickable avatar — opens lightbox when NOT editing */}
                <button
                  type="button"
                  className={`w-24 h-24 rounded-full overflow-hidden focus:outline-none ${user.avatar_url && !editing ? 'cursor-zoom-in' : 'cursor-default'}`}
                  onClick={() => { if (user.avatar_url && !editing) setLightboxOpen(true); }}
                  tabIndex={user.avatar_url && !editing ? 0 : -1}
                  aria-label={user.avatar_url && !editing ? 'View profile photo' : undefined}
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name || 'Avatar'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-3xl font-bold">
                      {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                </button>

                {/* Edit controls — only in edit mode */}
                {editing && (
                  <>
                    <button
                      type="button"
                      onClick={() => setCropOpen(true)}
                      disabled={uploadingAvatar || pendingProfileFieldSet.has('avatar_url')}
                      className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center transition cursor-pointer hover:bg-black/55"
                      title={pendingProfileFieldSet.has('avatar_url') ? 'A profile photo request is already pending.' : 'Change photo'}
                    >
                      {uploadingAvatar
                        ? <Loader2 className="w-6 h-6 text-white animate-spin" />
                        : <Camera className="w-6 h-6 text-white" />}
                    </button>
                    {user.avatar_url && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        disabled={uploadingAvatar || pendingProfileFieldSet.has('avatar_url')}
                        className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition"
                        title={pendingProfileFieldSet.has('avatar_url') ? 'A profile photo request is already pending.' : 'Remove photo'}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Crop-upload dialog */}
              <AvatarCropUpload
                open={cropOpen}
                onOpenChange={setCropOpen}
                onSave={handleAvatarSave}
              />

              {/* Lightbox */}
              <AvatarLightbox
                open={lightboxOpen}
                onClose={() => setLightboxOpen(false)}
                avatarUrl={user.avatar_url}
                name={user.full_name || user.email}
              />
              
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
                    <PhoneInput
                      id="phone"
                      label="Phone"
                      value={formData.phone || memberProfile?.phone || ''}
                      onChange={(value) => setFormData({ ...formData, phone: value })}
                      helperText=""
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
                  <Badge variant="secondary" className="mt-2 capitalize">{user.role}</Badge>
                  
                  <div className="mt-6 space-y-3 text-left">
                    <div className="flex items-center gap-3 text-slate-600">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="text-sm">{user.email}</span>
                    </div>
                    {memberProfile && (
                      <>
                        <div className="flex items-center justify-between gap-3 text-slate-600">
                          <div className="flex items-center gap-3 min-w-0">
                            <Phone className="w-4 h-4 text-slate-400" />
                            <span className="text-sm">{memberProfile.phone || '-'}</span>
                          </div>
                          {user?.role === 'member' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              disabled={pendingProfileFieldSet.has('phone')}
                              onClick={() => openProfileUpdateDialog('phone', memberProfile.phone || '')}
                              title={pendingProfileFieldSet.has('phone') ? 'A change request for this field is already pending.' : 'Request phone update'}
                            >
                              <Pencil className="w-3.5 h-3.5 mr-1" />
                              Edit
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-3 text-slate-600">
                          <div className="flex items-center gap-3 min-w-0">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            <span className="text-sm">{memberProfile.address || memberProfile.city || '-'}</span>
                          </div>
                          {user?.role === 'member' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              disabled={pendingProfileFieldSet.has('address')}
                              onClick={() => openProfileUpdateDialog('address', memberProfile.address || memberProfile.city || '')}
                              title={pendingProfileFieldSet.has('address') ? 'A change request for this field is already pending.' : 'Request address update'}
                            >
                              <Pencil className="w-3.5 h-3.5 mr-1" />
                              Edit
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-3 text-slate-600">
                          <div className="flex items-center gap-3 min-w-0">
                            <UserCircle className="w-4 h-4 text-slate-400" />
                            <span className="text-sm">{user.full_name || '-'}</span>
                          </div>
                          {user?.role === 'member' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              disabled={pendingProfileFieldSet.has('full_name')}
                              onClick={() => openProfileUpdateDialog('full_name', user.full_name || '')}
                              title={pendingProfileFieldSet.has('full_name') ? 'A change request for this field is already pending.' : 'Request full name update'}
                            >
                              <Pencil className="w-3.5 h-3.5 mr-1" />
                              Edit
                            </Button>
                          )}
                        </div>
                        {memberProfile.join_date && (
                          <div className="flex items-center gap-3 text-slate-600">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span className="text-sm">Joined {format(new Date(memberProfile.join_date), "MMM yyyy")}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  
                  {user?.role !== 'member' && (
                    <Button 
                      variant="outline" 
                      className="w-full mt-6"
                      onClick={() => setEditing(true)}
                    >
                      Edit Profile
                    </Button>
                  )}
                  {user?.role === 'member' && pendingProfileFieldSet.has('avatar_url') && (
                    <p className="mt-3 text-xs text-amber-600">
                      Your profile photo update request is pending admin approval.
                    </p>
                  )}
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

              {/* Monthly Payment Card */}
              {memberProfile && (
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-amber-600" />
                        <CardTitle className="text-lg">Monthly Fixed Payment</CardTitle>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPaymentChangeOpen(true)}
                        disabled={Boolean(pendingMonthlyAmountRequest)}
                        title={pendingMonthlyAmountRequest ? 'You already have a pending change request.' : 'Request monthly amount change'}
                        className="text-xs"
                      >
                        Request Change
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold text-slate-900">₹{memberProfile.monthly_amount || 100}</p>
                      <p className="text-slate-500">per month</p>
                    </div>
                    <p className="text-sm text-slate-500 mt-2">
                      This amount will be deducted monthly. Changes require admin approval.
                    </p>
                    {pendingMonthlyAmountRequest && (
                      <Badge variant="secondary" className="mt-3 bg-amber-100 text-amber-700">
                        Pending change request in review
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              )}

              {user?.role === 'member' && (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">Need help from admin?</p>
                      <p className="text-sm text-slate-500">Submit a complaint, suggestion, or general inquiry.</p>
                    </div>
                    <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setGeneralRequestOpen(true)}>
                      Submit a Request
                    </Button>
                  </CardContent>
                </Card>
              )}

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
                            <Badge variant="secondary" className={statusConfig[challan.status]?.color || 'bg-slate-100'}>
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
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">Used</Badge>
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

      <Dialog open={profileUpdateOpen} onOpenChange={setProfileUpdateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Profile Update</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-sm space-y-1">
              <p className="text-slate-500">Field</p>
              <p className="font-medium text-slate-900">{profileUpdateField || '-'}</p>
            </div>

            <div className="space-y-1">
              <Label>Current value</Label>
              <Input value={profileUpdateCurrentValue} readOnly />
            </div>

            <div className="space-y-1">
              <Label>New value *</Label>
              <Input
                value={profileUpdateNewValue}
                onChange={(e) => setProfileUpdateNewValue(e.target.value)}
                placeholder="Enter new value"
              />
            </div>

            <div className="space-y-1">
              <Label>Reason (optional)</Label>
              <Textarea
                value={profileUpdateReason}
                onChange={(e) => setProfileUpdateReason(e.target.value)}
                placeholder="Optional context for admin review"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setProfileUpdateOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                disabled={submittingProfileUpdate || !profileUpdateNewValue.trim()}
                onClick={handleSubmitProfileUpdateRequest}
              >
                {submittingProfileUpdate && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={generalRequestOpen} onOpenChange={setGeneralRequestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Request</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Request type</Label>
              <Select value={generalRequestType} onValueChange={setGeneralRequestType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select request type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="complaint">Complaint</SelectItem>
                  <SelectItem value="suggestion">Suggestion</SelectItem>
                  <SelectItem value="general">General Inquiry</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={generalRequestSubject}
                onChange={(e) => setGeneralRequestSubject(e.target.value)}
                maxLength={100}
                placeholder="Enter subject"
              />
            </div>

            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={generalRequestMessage}
                onChange={(e) => setGeneralRequestMessage(e.target.value)}
                rows={4}
                placeholder="Describe your request in detail"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setGeneralRequestOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                disabled={submittingGeneralRequest}
                onClick={handleSubmitGeneralRequest}
              >
                {submittingGeneralRequest && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Change Request Dialog */}
      <Dialog open={paymentChangeOpen} onOpenChange={setPaymentChangeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-600" />
              Request Monthly Amount Change
            </DialogTitle>
          </DialogHeader>

          {memberProfile && (
            <div className="space-y-5">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Current amount</p>
                <p className="text-2xl font-bold text-slate-900">₹{memberProfile.monthly_amount || 100}/month</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newAmount">New requested amount *</Label>
                <Input
                  id="newAmount"
                  type="number"
                  value={newMonthlyAmount}
                  onChange={(e) => setNewMonthlyAmount(e.target.value)}
                  placeholder="Enter new amount"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-slate-500">
                  Your current amount is ₹{memberProfile.monthly_amount || 100}. The new amount requires admin approval.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason / message *</Label>
                <Textarea
                  id="reason"
                  value={paymentChangeReason}
                  onChange={(e) => setPaymentChangeReason(e.target.value)}
                  placeholder="Please explain why you need this change..."
                  rows={3}
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-700">
                  Your request will be sent to the administrators for approval. You will receive a notification once it's approved or rejected.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPaymentChangeOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitPaymentChange}
                  disabled={submittingPaymentChange || !newMonthlyAmount || !paymentChangeReason}
                  className="flex-1 bg-amber-600 hover:bg-amber-700"
                >
                  {submittingPaymentChange && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Submit Request
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
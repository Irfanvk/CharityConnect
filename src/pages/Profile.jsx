import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { charityClient } from "@/api/charityClient";
import { useAuth } from "@/lib/AuthContext";
import { PAGE_PATHS } from "@/config/appPaths";
import { formatMemberId } from "@/lib/utils";
import { format } from "@/lib/dateTime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  AtSign, Camera, CheckCircle, ChevronRight, Inbox, Loader2, LogOut, Mail, MapPin,
  MessageSquare, Phone, UserCircle, X, XCircle,
} from "lucide-react";
import AvatarCropUpload from "@/components/profile/AvatarCropUpload";
import AvatarLightbox from "@/components/profile/AvatarLightbox";

const FIELD_LABELS = {
  full_name: "Full name",
  phone: "Phone",
  email: "Email",
  address: "Address",
  username: "Username",
};

const PAYMENT_STATUS = {
  approved: { label: "Paid", className: "bg-emerald-100 text-emerald-700" },
  pending: { label: "Checking", className: "bg-amber-100 text-amber-700" },
  generated: { label: "Not paid", className: "bg-slate-100 text-slate-700" },
  rejected: { label: "Rejected", className: "bg-rose-100 text-rose-700" },
};

const validateUsernameFormat = (username) => {
  if (!username) return "";
  if (username.length < 3) return "At least 3 characters";
  if (username.length > 30) return "Max 30 characters";
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) return "Letters, numbers, underscores, hyphens only";
  return "";
};

const formatRupees = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

/** One tappable row in "My details". */
function DetailRow({ icon: Icon, label, value, pending, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 disabled:cursor-not-allowed dark:hover:bg-slate-800/60 select-none"
    >
      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
      <span className="w-24 shrink-0 text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900 dark:text-slate-100">
        {value || <span className="font-normal text-slate-400">Not added</span>}
      </span>
      {pending ? (
        <Badge variant="secondary" className="shrink-0 bg-amber-100 text-amber-700">Change requested</Badge>
      ) : (
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
      )}
    </button>
  );
}

/** A plain navigation / action row used in the help section. */
function ActionRow({ icon: Icon, label, hint, to, onClick }) {
  const content = (
    <>
      <Icon className="h-4 w-4 shrink-0 text-emerald-600" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">{label}</span>
        {hint && <span className="block text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
    </>
  );
  const className = "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 select-none";
  return to
    ? <Link to={to} className={className}>{content}</Link>
    : <button type="button" onClick={onClick} className={className}>{content}</button>;
}

export default function Profile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logout } = useAuth();

  const [cropOpen, setCropOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [editField, setEditField] = useState(null); // key of FIELD_LABELS
  const [editValue, setEditValue] = useState("");
  const [editReason, setEditReason] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState("idle"); // idle | checking | available | taken
  const usernameDebounceRef = useRef(null);

  const [amountOpen, setAmountOpen] = useState(false);
  const [newAmount, setNewAmount] = useState("");
  const [amountReason, setAmountReason] = useState("");
  const [savingAmount, setSavingAmount] = useState(false);

  const [helpOpen, setHelpOpen] = useState(false);
  const [helpType, setHelpType] = useState("general");
  const [helpSubject, setHelpSubject] = useState("");
  const [helpMessage, setHelpMessage] = useState("");
  const [savingHelp, setSavingHelp] = useState(false);

  const [closeOpen, setCloseOpen] = useState(false);
  const [closeReason, setCloseReason] = useState("");
  const [savingClose, setSavingClose] = useState(false);

  // ── Data: always the signed-in user's own records ──────────────────────────
  const { data: user, refetch: refetchUser } = useQuery({
    queryKey: ["auth", "me", "profile"],
    queryFn: () => charityClient.auth.me(),
  });
  const isMember = user?.role === "member";

  // Admins may have no member record; treat 404 as "none".
  const { data: memberProfile = null } = useQuery({
    queryKey: ["members", "me"],
    queryFn: async () => {
      try {
        return await charityClient.members.me();
      } catch (error) {
        if ((error?.status ?? error?.response?.status) === 404) return null;
        throw error;
      }
    },
    enabled: Boolean(user),
    retry: false,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["challans", "member", memberProfile?.id, "profile"],
    queryFn: () => charityClient.challans.getByMember(memberProfile.id, { limit: 200 }),
    enabled: Boolean(memberProfile?.id),
  });

  const { data: myRequests = [] } = useQuery({
    queryKey: ["requests", "mine", user?.id],
    queryFn: () => charityClient.requests.list({ limit: 200 }),
    enabled: Boolean(user),
  });

  const refreshMyRequests = () => queryClient.invalidateQueries({ queryKey: ["requests", "mine"] });

  const pendingRequests = myRequests.filter((request) => request.status === "pending");
  const pendingFields = new Set(
    pendingRequests
      .filter((request) => request.request_type === "profile_update")
      .flatMap((request) => {
        try {
          const changes = JSON.parse(request.requested_changes || "{}");
          return changes && typeof changes === "object" ? Object.keys(changes) : [];
        } catch {
          return [];
        }
      })
  );
  const photoPending = pendingFields.has("avatar_url");
  const amountPending = pendingRequests.some((request) => request.request_type === "monthly_amount_change");

  const paidPayments = payments.filter((challan) => challan.status === "approved");
  const totalPaid = paidPayments.reduce((sum, challan) => sum + Number(challan.amount || 0), 0);
  const monthsPaid = paidPayments.filter((challan) => challan.type === "monthly").length;
  const recentPayments = payments.slice(0, 3);

  // ── Photo ──────────────────────────────────────────────────────────────────
  const handleAvatarSave = async (file) => {
    setUploadingAvatar(true);
    try {
      if (isMember) {
        const uploaded = await charityClient.files.uploadAvatar(file);
        const nextAvatarUrl = uploaded?.file_url || uploaded?.url || uploaded?.avatar_url;
        if (!nextAvatarUrl) throw new Error("Photo upload did not return a file URL");
        await charityClient.requests.create({
          request_type: "profile_update",
          subject: "Profile photo update request",
          message: "Please update my profile photo.",
          requested_changes: { avatar_url: nextAvatarUrl },
        });
        refreshMyRequests();
        toast({ title: "Photo sent for approval", description: "An admin will check it shortly." });
        return;
      }
      await charityClient.auth.uploadAvatar(file);
      await refetchUser();
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
          request_type: "profile_update",
          subject: "Profile photo removal request",
          message: "Please remove my current profile photo.",
          requested_changes: { avatar_url: null },
        });
        refreshMyRequests();
        toast({ title: "Removal sent for approval", description: "An admin will check it shortly." });
        return;
      }
      await charityClient.auth.removeAvatar();
      await refetchUser();
      toast({ title: "Profile photo removed" });
    } catch (error) {
      toast({ title: "Remove failed", description: error?.message || "Please try again.", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ── Edit a detail ──────────────────────────────────────────────────────────
  const currentValueOf = (field) => {
    if (field === "address") return memberProfile?.address || "";
    if (field === "phone") return user?.phone || memberProfile?.phone || "";
    return user?.[field] || "";
  };

  const openEdit = (field) => {
    setEditField(field);
    setEditValue(currentValueOf(field));
    setEditReason("");
    setUsernameStatus("idle");
    if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current);
  };

  const handleUsernameChange = (value) => {
    setEditValue(value);
    setUsernameStatus("idle");
    if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current);
    const trimmed = value.trim();
    if (validateUsernameFormat(trimmed) || trimmed.length < 3 || trimmed === user?.username) return;
    usernameDebounceRef.current = setTimeout(async () => {
      setUsernameStatus("checking");
      try {
        const result = await charityClient.auth.checkUsername(trimmed);
        setUsernameStatus(result?.available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 450);
  };

  const editTrimmed = editValue.trim();
  const editUnchanged = editTrimmed === currentValueOf(editField).trim();
  const usernameError = editField === "username" ? validateUsernameFormat(editTrimmed) : "";
  const editBlocked =
    savingEdit || !editTrimmed || editUnchanged || Boolean(usernameError) ||
    (editField === "username" && (usernameStatus === "taken" || usernameStatus === "checking"));

  const handleSaveEdit = async () => {
    if (editBlocked) return;
    setSavingEdit(true);
    try {
      if (!isMember) {
        // Admins and superadmins save directly.
        if (editField === "address") {
          if (!memberProfile) throw new Error("No member record to store an address on.");
          await charityClient.members.update(memberProfile.id, { address: editTrimmed });
          queryClient.invalidateQueries({ queryKey: ["members", "me"] });
        } else {
          await charityClient.users.update(user.id, { [editField]: editTrimmed });
          await refetchUser();
        }
        toast({ title: `${FIELD_LABELS[editField]} updated` });
      } else {
        await charityClient.requests.create({
          request_type: "profile_update",
          subject: `${FIELD_LABELS[editField]} change request`,
          message: editReason.trim() || `Please change my ${FIELD_LABELS[editField].toLowerCase()}.`,
          requested_changes: { [editField]: editTrimmed },
        });
        refreshMyRequests();
        toast({ title: "Change sent for approval", description: "You'll get a notification once an admin checks it." });
      }
      setEditField(null);
    } catch (error) {
      toast({ title: "Couldn't save", description: error?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Monthly amount ─────────────────────────────────────────────────────────
  const handleSubmitAmount = async () => {
    const amount = Number(newAmount);
    if (!amount || amount < 50 || amount > 10000) {
      toast({ title: "Invalid amount", description: "Monthly amount must be between ₹50 and ₹10,000.", variant: "destructive" });
      return;
    }
    if (amountReason.trim().length < 10) {
      toast({ title: "Reason required", description: "Please write at least 10 characters.", variant: "destructive" });
      return;
    }
    setSavingAmount(true);
    try {
      await charityClient.requests.create({
        request_type: "monthly_amount_change",
        subject: "Monthly amount change request",
        message: amountReason.trim(),
        requested_amount: amount,
      });
      refreshMyRequests();
      toast({ title: "Request sent", description: "An admin will review your new monthly amount." });
      setAmountOpen(false);
      setNewAmount("");
      setAmountReason("");
    } catch (error) {
      toast({ title: "Couldn't send request", description: error?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSavingAmount(false);
    }
  };

  // ── Help request ───────────────────────────────────────────────────────────
  const handleSubmitHelp = async () => {
    if (!helpSubject.trim()) {
      toast({ title: "Subject required", variant: "destructive" });
      return;
    }
    if (helpMessage.trim().length < 20) {
      toast({ title: "Message too short", description: "Please write at least 20 characters.", variant: "destructive" });
      return;
    }
    setSavingHelp(true);
    try {
      await charityClient.requests.create({
        request_type: helpType,
        subject: helpSubject.trim(),
        message: helpMessage.trim(),
      });
      refreshMyRequests();
      toast({ title: "Request sent", description: "An admin will get back to you." });
      setHelpOpen(false);
      setHelpType("general");
      setHelpSubject("");
      setHelpMessage("");
    } catch (error) {
      toast({ title: "Couldn't send request", description: error?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSavingHelp(false);
    }
  };

  // ── Close account (a request; nothing is deleted automatically) ────────────
  const handleCloseAccount = async () => {
    setSavingClose(true);
    try {
      await charityClient.requests.create({
        request_type: "general",
        subject: "Account closure request",
        message: closeReason.trim() || "Please close my account.",
      });
      refreshMyRequests();
      toast({ title: "Request sent", description: "An admin will contact you about closing your account." });
      setCloseOpen(false);
      setCloseReason("");
    } catch (error) {
      toast({ title: "Couldn't send request", description: error?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSavingClose(false);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const displayName = user.full_name || user.username || "Member";
  const initial = displayName.charAt(0).toUpperCase();
  const joinDate = memberProfile?.join_date ? new Date(memberProfile.join_date) : null;
  const closeAlreadyRequested = pendingRequests.some((request) => request.subject === "Account closure request");

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* ── Who I am ── */}
      <Card className="border-0 shadow-sm">
        <CardContent className="flex flex-col items-center p-6 text-center">
          <div className="relative mb-3 h-24 w-24">
            <button
              type="button"
              className={`h-24 w-24 overflow-hidden rounded-full focus:outline-none ${user.avatar_url ? "cursor-zoom-in" : "cursor-default"}`}
              onClick={() => { if (user.avatar_url) setLightboxOpen(true); }}
              tabIndex={user.avatar_url ? 0 : -1}
              aria-label={user.avatar_url ? "View profile photo" : undefined}
            >
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-3xl font-bold text-white">
                  {initial}
                </div>
              )}
            </button>
            <button
              type="button"
              onClick={() => setCropOpen(true)}
              disabled={uploadingAvatar || photoPending}
              className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50"
              aria-label="Change photo"
              title={photoPending ? "Your new photo is waiting for approval." : "Change photo"}
            >
              {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            {user.avatar_url && !photoPending && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={uploadingAvatar}
                className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-500 shadow ring-1 ring-slate-200 transition hover:text-rose-600 disabled:opacity-50"
                aria-label="Remove photo"
                title="Remove photo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{displayName}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {[
              memberProfile?.member_code && formatMemberId(memberProfile.member_code),
              joinDate && `Member since ${format(joinDate, "MMM yyyy")}`,
              !isMember && (user.role === "superadmin" ? "Superadmin" : "Admin"),
            ].filter(Boolean).join(" · ")}
          </p>
          {photoPending && (
            <p className="mt-3 rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              Your new photo is waiting for admin approval.
            </p>
          )}

          <AvatarCropUpload open={cropOpen} onOpenChange={setCropOpen} onSave={handleAvatarSave} />
          <AvatarLightbox
            open={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
            avatarUrl={user.avatar_url}
            name={displayName}
          />
        </CardContent>
      </Card>

      {/* ── My details ── */}
      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold text-slate-700 dark:text-slate-300">My details</h2>
        <Card className="overflow-hidden border-0 shadow-sm">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <DetailRow icon={UserCircle} label="Full name" value={user.full_name} pending={pendingFields.has("full_name")} onClick={() => openEdit("full_name")} />
            <DetailRow icon={Phone} label="Phone" value={user.phone || memberProfile?.phone} pending={pendingFields.has("phone")} onClick={() => openEdit("phone")} />
            <DetailRow icon={Mail} label="Email" value={user.email} pending={pendingFields.has("email")} onClick={() => openEdit("email")} />
            {memberProfile && (
              <DetailRow icon={MapPin} label="Address" value={memberProfile.address} pending={pendingFields.has("address")} onClick={() => openEdit("address")} />
            )}
            <DetailRow icon={AtSign} label="Username" value={user.username} pending={pendingFields.has("username")} onClick={() => openEdit("username")} />
          </div>
        </Card>
        {isMember && (
          <p className="mt-2 px-1 text-xs text-slate-500 dark:text-slate-400">
            Tap a detail to change it. An admin checks changes before they appear.
          </p>
        )}
      </section>

      {/* ── My contribution ── */}
      {memberProfile && (
        <section>
          <h2 className="mb-2 px-1 text-sm font-semibold text-slate-700 dark:text-slate-300">My contribution</h2>
          <Card className="border-0 shadow-sm">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Monthly amount</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatRupees(memberProfile.monthly_amount)}
                    <span className="ml-1 text-sm font-normal text-slate-500">/ month</span>
                  </p>
                </div>
                {amountPending ? (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700">Change requested</Badge>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setAmountOpen(true)}>Change</Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/30">
                  <p className="text-lg font-bold text-emerald-800 dark:text-emerald-200">{formatRupees(totalPaid)}</p>
                  <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">Total paid</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{monthsPaid}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{monthsPaid === 1 ? "Month paid" : "Months paid"}</p>
                </div>
              </div>

              {recentPayments.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Recent payments</p>
                  {recentPayments.map((challan) => {
                    const status = PAYMENT_STATUS[challan.status] || { label: challan.status, className: "bg-slate-100 text-slate-700" };
                    return (
                      <div key={challan.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate text-slate-700 dark:text-slate-300">
                          {challan.type === "monthly" ? challan.month : challan.campaign_name || "Donation"}
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="font-medium text-slate-900 dark:text-slate-100">{formatRupees(challan.amount)}</span>
                          <Badge variant="secondary" className={status.className}>{status.label}</Badge>
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">No payments yet.</p>
              )}

              <Link
                to={PAGE_PATHS.CHALLANS}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:border-slate-700 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
              >
                View all payments
                <ChevronRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── Help ── */}
      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold text-slate-700 dark:text-slate-300">Help</h2>
        <Card className="overflow-hidden border-0 shadow-sm">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {isMember && (
              <ActionRow icon={MessageSquare} label="Ask the admins" hint="Questions, suggestions or complaints" onClick={() => setHelpOpen(true)} />
            )}
            <ActionRow
              icon={Inbox}
              label="My requests"
              hint={pendingRequests.length ? `${pendingRequests.length} waiting for an admin` : "See the status of your requests"}
              to={PAGE_PATHS.REQUESTS}
            />
          </div>
        </Card>
      </section>

      <Button variant="outline" className="w-full" onClick={() => logout()}>
        <LogOut className="mr-2 h-4 w-4" />
        Log out
      </Button>

      {isMember && (
        <div className="pb-2 text-center">
          <button
            type="button"
            onClick={() => setCloseOpen(true)}
            disabled={closeAlreadyRequested}
            className="text-xs text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline disabled:no-underline dark:hover:text-slate-300"
          >
            {closeAlreadyRequested ? "Account closure requested" : "Close my account"}
          </button>
        </div>
      )}

      {/* ── Edit a detail ── */}
      <Dialog open={Boolean(editField)} onOpenChange={(open) => { if (!open) setEditField(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editField ? `Change ${FIELD_LABELS[editField].toLowerCase()}` : ""}</DialogTitle>
            {isMember && <DialogDescription>An admin will check this before it appears on your profile.</DialogDescription>}
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="profile-edit-value">{editField ? FIELD_LABELS[editField] : ""}</Label>
              <Input
                id="profile-edit-value"
                value={editValue}
                onChange={(e) => (editField === "username" ? handleUsernameChange(e.target.value) : setEditValue(e.target.value))}
                type={editField === "email" ? "email" : editField === "phone" ? "tel" : "text"}
                autoComplete="off"
                autoFocus
              />
              {usernameError && <p className="text-xs text-rose-600">{usernameError}</p>}
              {!usernameError && usernameStatus === "checking" && (
                <p className="flex items-center gap-1 text-xs text-slate-500"><Loader2 className="h-3 w-3 animate-spin" /> Checking…</p>
              )}
              {!usernameError && usernameStatus === "available" && (
                <p className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle className="h-3 w-3" /> Available</p>
              )}
              {!usernameError && usernameStatus === "taken" && (
                <p className="flex items-center gap-1 text-xs text-rose-600"><XCircle className="h-3 w-3" /> Already taken</p>
              )}
            </div>
            {isMember && (
              <div className="space-y-1.5">
                <Label htmlFor="profile-edit-reason">Note for the admin (optional)</Label>
                <Textarea id="profile-edit-reason" value={editReason} onChange={(e) => setEditReason(e.target.value)} rows={2} />
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setEditField(null)}>Cancel</Button>
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={editBlocked} onClick={handleSaveEdit}>
                {savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isMember ? "Send for approval" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Change monthly amount ── */}
      <Dialog open={amountOpen} onOpenChange={setAmountOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change monthly amount</DialogTitle>
            <DialogDescription>
              Now {formatRupees(memberProfile?.monthly_amount)} a month. An admin will review the new amount.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="profile-new-amount">New amount (₹)</Label>
              <Input id="profile-new-amount" type="number" inputMode="numeric" min="50" max="10000" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-amount-reason">Reason</Label>
              <Textarea id="profile-amount-reason" value={amountReason} onChange={(e) => setAmountReason(e.target.value)} rows={3} placeholder="Why would you like to change it?" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setAmountOpen(false)}>Cancel</Button>
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={savingAmount || !newAmount || !amountReason.trim()} onClick={handleSubmitAmount}>
                {savingAmount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Ask the admins ── */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ask the admins</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={helpType} onValueChange={setHelpType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Question</SelectItem>
                  <SelectItem value="suggestion">Suggestion</SelectItem>
                  <SelectItem value="complaint">Complaint</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-help-subject">Subject</Label>
              <Input id="profile-help-subject" value={helpSubject} onChange={(e) => setHelpSubject(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-help-message">Message</Label>
              <Textarea id="profile-help-message" value={helpMessage} onChange={(e) => setHelpMessage(e.target.value)} rows={4} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setHelpOpen(false)}>Cancel</Button>
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={savingHelp} onClick={handleSubmitHelp}>
                {savingHelp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Close account ── */}
      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Close your account?</DialogTitle>
            <DialogDescription>
              This sends a request to the admins. Nothing is deleted until an admin contacts you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="profile-close-reason">Reason (optional)</Label>
              <Textarea id="profile-close-reason" value={closeReason} onChange={(e) => setCloseReason(e.target.value)} rows={3} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setCloseOpen(false)}>Keep account</Button>
              <Button variant="destructive" className="flex-1" disabled={savingClose} onClick={handleCloseAccount}>
                {savingClose && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

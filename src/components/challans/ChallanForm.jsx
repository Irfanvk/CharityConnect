import React, { useEffect, useState, useRef, useMemo } from "react";
import { formatMemberId } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "@/components/ui/dialog";
import { format, parseISO } from "@/lib/dateTime";
import { addBusinessMonths, currentBusinessMonth } from "@/lib/businessTime";
import { usePublicSettings } from "@/lib/usePublicSettings";
import PaymentInstructions from "@/components/branding/PaymentInstructions";
import { Loader2, CheckSquare, Square, Upload, FileText, Image as ImageIcon, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const PLATFORM_START_MONTH = "2024-08";

// Build a list of yyyy-MM strings from startYearMonth up to the current business
// month (inclusive), excluding any month already in paidSet. Pure string math so
// the result never depends on the viewer's timezone.
function buildLocalMonths(startYearMonth, includeUpcoming, upcomingCount, paidSet, currentMonth = currentBusinessMonth()) {
  let cursor = /^\d{4}-\d{2}$/.test(startYearMonth || "") ? startYearMonth : PLATFORM_START_MONTH;
  if (cursor < PLATFORM_START_MONTH) cursor = PLATFORM_START_MONTH;
  if (cursor > currentMonth) cursor = currentMonth;

  const months = [];
  while (cursor <= currentMonth) {
    if (!paidSet.has(cursor)) months.push(cursor);
    cursor = addBusinessMonths(cursor, 1);
  }

  if (includeUpcoming) {
    let fut = addBusinessMonths(currentMonth, 1);
    for (let i = 0; i < upcomingCount; i++) {
      if (!paidSet.has(fut)) months.push(fut);
      fut = addBusinessMonths(fut, 1);
    }
  }
  return months;
}

// Generate month options for the "Start from" picker: Aug 2024 → current business month
function buildStartMonthOptions(currentMonth = currentBusinessMonth()) {
  const options = [];
  let cur = PLATFORM_START_MONTH;
  while (cur <= currentMonth) {
    options.push(cur);
    cur = addBusinessMonths(cur, 1);
  }
  return options.reverse(); // newest first
}

const PROOF_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];

// Checks a chosen proof file; returns an error sentence, or "" when it is fine.
function proofFileProblem(file, maxUploadMb) {
  if (!PROOF_TYPES.includes(file.type)) return "Please choose a JPG, PNG or PDF file.";
  if (file.size > maxUploadMb * 1024 * 1024) return `This file is too large. The limit is ${maxUploadMb}MB.`;
  return "";
}

// File picker for a payment proof, or the chosen file with a remove button.
function ProofPicker({ file, onPick, onClear, prompt, maxUploadMb, error }) {
  return (
    <>
      {!file ? (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white px-4 py-6 text-center hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors">
          <Upload className="w-8 h-8 text-slate-400 mb-2" />
          <span className="text-sm text-slate-700 font-medium">{prompt}</span>
          <span className="text-xs text-slate-400 mt-1">JPG, PNG, PDF up to {maxUploadMb}MB</span>
          <input
            type="file"
            accept={PROOF_TYPES.join(",")}
            onChange={(e) => { onPick(e.target.files?.[0] || null); e.target.value = ""; }}
            className="hidden"
          />
        </label>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
          <div className="flex items-center gap-3 min-w-0">
            {file.type === "application/pdf" ? (
              <FileText className="w-4 h-4 text-rose-500 shrink-0" />
            ) : (
              <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
              <p className="text-xs text-slate-500">{Math.max(1, Math.round(file.size / 1024))} KB</p>
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Remove file" onClick={onClear}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
      {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
    </>
  );
}

export default function ChallanForm({
  open,
  onOpenChange,
  onSubmit,
  members,
  campaigns,
  existingChallans,
  suggestedNumber,
  currentUser,
}) {
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "superadmin";
  const normalizeId = (v) => (v === null || v === undefined ? "" : String(v));
  const areSameId = (a, b) => normalizeId(a) === normalizeId(b);

  const myMember = members.find((m) => m.email === currentUser?.email)
    || (members.length === 1 ? members[0] : null);
  const defaultMemberId = !isAdmin && myMember ? normalizeId(myMember.id) : "";

  const publicSettings = usePublicSettings();
  const maxUploadMb = publicSettings.proof_max_upload_mb;
  const upcomingLimit = publicSettings.upcoming_months_payable;
  const maxMonthsPerPayment = publicSettings.max_months_per_payment;

  const [formData, setFormData] = useState({
    member_id: defaultMemberId,
    type: "monthly",
    amount: 100,
    campaign_id: "",
    notes: "",
  });
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [includeUpcomingMonths, setIncludeUpcomingMonths] = useState(false);
  const [fromMonth, setFromMonth] = useState(""); // user-chosen start month
  const [proofMode, setProofMode] = useState("individual");
  const [sharedProofFile, setSharedProofFile] = useState(null);
  // Single payment (one month or a donation): proof now, or "upload later".
  const [proofFile, setProofFile] = useState(null);
  const [proofLater, setProofLater] = useState(false);
  const [proofError, setProofError] = useState("");
  const [loading, setLoading] = useState(false);

  // Admin member search combobox
  const [memberSearch, setMemberSearch] = useState("");
  const [memberOptions, setMemberOptions] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // When form opens / member changes, reset month selections
  useEffect(() => {
    if (!open) return;
    setSelectedMonths([]);
    setFromMonth("");
    setIncludeUpcomingMonths(false);
    setProofMode("individual");
    setSharedProofFile(null);
    setProofFile(null);
    setProofLater(false);
    setProofError("");
  }, [open, formData.member_id]);

  // Re-seed member_id when myMember resolves asynchronously
  useEffect(() => {
    if (!isAdmin && myMember && !formData.member_id) {
      setFormData((prev) => ({ ...prev, member_id: normalizeId(myMember.id) }));
    }
  }, [myMember?.id]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Admin member search
  useEffect(() => {
    if (!memberSearch) { setMemberOptions([]); return; }
    const t = setTimeout(async () => {
      try {
        setLoadingMembers(true);
        const res = await charityClient.members.list({ search: memberSearch });
        setMemberOptions(res || []);
      } catch { /* noop */ } finally { setLoadingMembers(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [memberSearch]);

  // Paid months set (local, for fallback)
  const paidSet = useMemo(() => {
    const s = new Set();
    existingChallans
      .filter((c) => areSameId(c.member_id, formData.member_id) && c.type === "monthly" && c.status !== "rejected")
      .forEach((c) => c.month && s.add(c.month));
    return s;
  }, [existingChallans, formData.member_id]);

  // Payable months from backend
  const effectiveFromMonth = fromMonth || null;
  const { data: payableMonthsData, isFetching: fetchingMonths } = useQuery({
    queryKey: ["challans", "payable-months", formData.member_id, includeUpcomingMonths, effectiveFromMonth],
    enabled: Boolean(formData.member_id) && formData.type === "monthly",
    queryFn: () =>
      charityClient.challans.payableMonths({
        ...(isAdmin ? { member_id: Number(formData.member_id) } : {}),
        include_upcoming: includeUpcomingMonths,
        ...(effectiveFromMonth ? { from_month: effectiveFromMonth } : {}),
      }),
    keepPreviousData: true,
  });

  // Selectable months: prefer backend data, fall back to local calculation
  const selectableMonths = useMemo(() => {
    const backendMonths = Array.isArray(payableMonthsData?.all_months)
      ? payableMonthsData.all_months
      : [];

    // When user explicitly chooses a start month, ensure that month range is always
    // available even if backend returns a narrower set.
    const serverMonth = payableMonthsData?.current_month || currentBusinessMonth();
    if (fromMonth) {
      const localMonths = buildLocalMonths(fromMonth, includeUpcomingMonths, upcomingLimit, paidSet, serverMonth);
      return Array.from(new Set([...backendMonths, ...localMonths])).sort();
    }

    if (backendMonths.length > 0) {
      return backendMonths;
    }

    // Local fallback (when backend returns empty due to join_date/new-member edge cases)
    const start = addBusinessMonths(serverMonth, -12);
    return buildLocalMonths(start, includeUpcomingMonths, upcomingLimit, paidSet, serverMonth);
  }, [payableMonthsData, fromMonth, includeUpcomingMonths, paidSet, upcomingLimit]);

  // Keep selection valid when selectable months change
  useEffect(() => {
    setSelectedMonths((prev) => prev.filter((m) => selectableMonths.includes(m)));
  }, [selectableMonths.join("|")]);

  useEffect(() => {
    if (selectedMonths.length <= 1) {
      setProofMode("individual");
      setSharedProofFile(null);
    }
  }, [selectedMonths.length]);

  const toggleMonth = (month) => {
    setSelectedMonths((prev) => {
      if (prev.includes(month)) return prev.filter((m) => m !== month);
      if (prev.length >= maxMonthsPerPayment) return prev;
      return [...prev, month].sort();
    });
  };

  const selectAll = () => setSelectedMonths(selectableMonths.slice(0, maxMonthsPerPayment));
  const clearAll = () => setSelectedMonths([]);
  const usesSharedBulkProof = formData.type === "monthly" && selectedMonths.length > 1 && proofMode === "shared";

  // One month or a donation: a single challan that can carry its proof right away.
  const isSinglePayment =
    (formData.type === "monthly" && selectedMonths.length === 1) || formData.type === "donation";
  const sendsProofNow = isSinglePayment && !proofLater && Boolean(proofFile);

  const pickProof = (setFile) => (file) => {
    if (!file) { setFile(null); return; }
    const problem = proofFileProblem(file, maxUploadMb);
    setProofError(problem);
    setFile(problem ? null : file);
  };

  const getMonthTag = (month) => {
    if (payableMonthsData?.upcoming_months?.includes(month))
      return { label: "Upcoming", cls: "bg-indigo-100 text-indigo-700" };
    if (month === payableMonthsData?.current_month)
      return { label: "Current", cls: "bg-emerald-100 text-emerald-700" };
    return { label: "Pending", cls: "bg-amber-100 text-amber-700" };
  };

  const activeMember = members.find((m) => areSameId(m.id, formData.member_id)) || myMember;
  // Never guess: the server always uses the member's own fee for their payments.
  const monthlyAmount = Number(activeMember?.monthly_amount) || 0;
  const feeMissing = formData.type === "monthly" && Boolean(activeMember) && monthlyAmount <= 0;
  const activeCampaigns = campaigns.filter((c) => c.status === "active");
  const startMonthOptions = useMemo(
    () => buildStartMonthOptions(payableMonthsData?.current_month || currentBusinessMonth()),
    [payableMonthsData?.current_month]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const campaign = campaigns.find((c) => areSameId(c.id, formData.campaign_id));
    const monthsToPay = selectedMonths.length > 0 ? selectedMonths : [];
    const totalAmount =
      formData.type === "monthly" ? monthlyAmount * monthsToPay.length : Number(formData.amount);
    try {
      await onSubmit({
        ...formData,
        member_id: formData.member_id !== "" ? parseInt(formData.member_id, 10) : null,
        campaign_id:
          formData.campaign_id !== "" && formData.campaign_id !== "__no_campaign"
            ? parseInt(formData.campaign_id, 10)
            : null,
        challan_number: suggestedNumber,
        member_name: activeMember?.full_name,
        campaign_name: campaign?.title,
        amount: totalAmount,
        member_monthly_amount: monthlyAmount,
        selected_months: formData.type === "monthly" ? monthsToPay : [],
        months_covered: formData.type === "monthly" ? monthsToPay : undefined,
        months_count: formData.type === "monthly" ? monthsToPay.length : 1,
        month: formData.type === "monthly" ? monthsToPay[0] : undefined,
        proof_mode: formData.type === "monthly" && monthsToPay.length > 1 ? proofMode : "individual",
        shared_proof_file: usesSharedBulkProof ? sharedProofFile : null,
        proof_file: sendsProofNow ? proofFile : null,
      });
      setSelectedMonths([]);
      setSharedProofFile(null);
      setProofMode("individual");
      setProofFile(null);
      setProofLater(false);
      setProofError("");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    !loading &&
    !feeMissing &&
    formData.member_id &&
    (isAdmin || myMember) &&
    (formData.type === "donation"
      ? Boolean(formData.campaign_id)
      : selectedMonths.length > 0 && (!usesSharedBulkProof || Boolean(sharedProofFile))) &&
    // a single payment needs its proof, or an explicit "upload later"
    (!isSinglePayment || proofLater || Boolean(proofFile));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Generate Challan</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <PaymentInstructions />
          {/* Challan number */}
          <div className="space-y-1.5">
            <Label>Challan Number</Label>
            <Input value={suggestedNumber} disabled className="bg-slate-50" />
          </div>

          {/* Member */}
          {isAdmin ? (
            <div className="space-y-1.5 relative" ref={dropdownRef}>
              <Label>Member *</Label>
              <Input
                placeholder="Search member by name or ID…"
                value={memberSearch}
                onChange={(e) => { setMemberSearch(e.target.value); setShowDropdown(true); }}
              />
              {showDropdown && (
                <div className="absolute z-50 w-full bg-white border rounded-md shadow max-h-56 overflow-y-auto">
                  {loadingMembers ? (
                    <div className="p-2 text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" />Searching…</div>
                  ) : memberOptions.length === 0 ? (
                    <div className="p-2 text-sm text-slate-500">No members found</div>
                  ) : memberOptions.map((m) => (
                    <div
                      key={m.id}
                      className="p-2 hover:bg-slate-100 cursor-pointer text-sm"
                      onClick={() => {
                        setFormData({ ...formData, member_id: String(m.id) });
                        setMemberSearch(`${m.full_name} (${formatMemberId(m.member_id)})`);;
                        setShowDropdown(false);
                      }}
                    >
                      {m.full_name} · <span className="text-slate-500">{formatMemberId(m.member_id)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : myMember ? (
            <div className="p-3 bg-slate-50 rounded-lg border">
              <p className="text-xs text-slate-500 mb-1">Member</p>
              <p className="font-medium text-slate-900">{myMember.full_name}</p>
              <p className="text-xs text-slate-500">{myMember.member_id}</p>
            </div>
          ) : (
            <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
              <p className="text-sm text-rose-600">Member record not found. Please contact admin.</p>
            </div>
          )}

          {/* Payment type */}
          <div className="space-y-1.5">
            <Label>Payment Type</Label>
            <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v, campaign_id: "" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly Membership</SelectItem>
                <SelectItem value="donation">Campaign Donation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ── Monthly payment ── */}
          {formData.type === "monthly" && formData.member_id && (
            <div className="space-y-4">

              {/* Start from picker */}
              <div className="space-y-1.5">
                <Label>Start From Month</Label>
                <Select value={fromMonth || "__auto"} onValueChange={(v) => setFromMonth(v === "__auto" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Auto (use membership start)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__auto">Auto (membership start date)</SelectItem>
                    {startMonthOptions.map((m) => (
                      <SelectItem key={m} value={m}>{format(parseISO(m + "-01"), "MMMM yyyy")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Change this if you want to pay from an earlier or specific month (e.g. January 2026).
                </p>
              </div>

              {/* Include upcoming toggle */}
              <div className="flex items-center justify-between rounded-lg border p-3 bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-900">Include upcoming months</p>
                  <p className="text-xs text-slate-500">Add the next 3 months (pay in advance)</p>
                </div>
                <Checkbox
                  checked={includeUpcomingMonths}
                  onCheckedChange={(c) => setIncludeUpcomingMonths(Boolean(c))}
                />
              </div>

              {/* Month grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    Select Months to Pay *{" "}
                    {fetchingMonths && <Loader2 className="w-3 h-3 inline animate-spin ml-1 text-slate-400" />}
                  </Label>
                  {selectableMonths.length > 0 && (
                    <div className="flex gap-2 text-xs">
                      <button type="button" onClick={selectAll} className="text-emerald-600 hover:underline font-medium">All</button>
                      <span className="text-slate-300">|</span>
                      <button type="button" onClick={clearAll} className="text-slate-500 hover:underline">Clear</button>
                    </div>
                  )}
                </div>

                <div className="border rounded-lg max-h-56 overflow-y-auto bg-slate-50 divide-y divide-slate-100">
                  {selectableMonths.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-sm text-slate-500">All months are paid ✓</p>
                      <p className="text-xs text-slate-400 mt-1">Try changing "Start From Month" to an earlier date.</p>
                    </div>
                  ) : (
                    selectableMonths.map((month) => {
                      const tag = getMonthTag(month);
                      const checked = selectedMonths.includes(month);
                      return (
                        <div
                          key={month}
                          onClick={() => toggleMonth(month)}
                          className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-white ${checked ? "bg-emerald-50/60" : ""}`}
                        >
                          {checked
                            ? <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                            : <Square className="w-4 h-4 text-slate-300 shrink-0" />
                          }
                          <span className={`flex-1 text-sm font-medium ${checked ? "text-slate-900" : "text-slate-700"}`}>
                            {format(parseISO(month + "-01"), "MMMM yyyy")}
                          </span>
                          <Badge className={`${tag.cls} text-[10px] px-1.5 py-0`}>{tag.label}</Badge>
                        </div>
                      );
                    })
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {selectedMonths.length === 0
                    ? "Tap to select months. You can pick multiple."
                    : `${selectedMonths.length} month${selectedMonths.length > 1 ? "s" : ""} selected`}
                </p>
              </div>

              {selectedMonths.length > 1 && (
                <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Payment Proof For Selected Months</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Choose whether each month will have its own proof later, or one proof will cover all selected months as a bulk challan.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setProofMode("individual");
                        setSharedProofFile(null);
                      }}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition ${proofMode === "individual" ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
                    >
                      <p className="text-sm font-medium text-slate-900">Individual proof for each month</p>
                      <p className="text-xs text-slate-500 mt-1">Creates separate challans. Proof can be uploaded one by one later.</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setProofMode("shared")}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition ${proofMode === "shared" ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
                    >
                      <p className="text-sm font-medium text-slate-900">One proof for all selected months</p>
                      <p className="text-xs text-slate-500 mt-1">Uploads one shared proof and creates a bulk challan group for admin review.</p>
                    </button>
                  </div>

                  {proofMode === "shared" && (
                    <div className="space-y-2">
                      <Label>Shared proof file *</Label>

                      <ProofPicker
                        file={sharedProofFile}
                        onPick={pickProof(setSharedProofFile)}
                        onClear={() => setSharedProofFile(null)}
                        prompt="Upload one proof for all selected months"
                        maxUploadMb={maxUploadMb}
                        error={proofError}
                      />

                      <p className="text-xs text-slate-500">
                        This proof will be attached to the bulk challan group covering all {selectedMonths.length} selected months.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {feeMissing && (
                <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  {isAdmin
                    ? "This member has no monthly amount set. Set it on the member first."
                    : "Your monthly amount is not set yet. Please ask the admins to set it."}
                </p>
              )}

              {/* Summary */}
              {selectedMonths.length > 0 && !feeMissing && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 space-y-1 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Monthly amount</span><span>₹{monthlyAmount}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Months</span><span>× {selectedMonths.length}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-emerald-800 pt-1 border-t border-emerald-200">
                    <span>Total</span><span>₹{(monthlyAmount * selectedMonths.length).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Campaign donation ── */}
          {formData.type === "donation" && (
            <>
              <div className="space-y-1.5">
                <Label>Campaign *</Label>
                <Select
                  value={formData.campaign_id}
                  onValueChange={(v) => {
                    const c = campaigns.find((c) => areSameId(c.id, v));
                    setFormData({ ...formData, campaign_id: v, amount: c?.min_amount || 100 });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select campaign" /></SelectTrigger>
                  <SelectContent>
                    {activeCampaigns.length === 0 ? (
                      <SelectItem value="__no_campaign" disabled>No active campaigns</SelectItem>
                    ) : activeCampaigns.map((c) => (
                      <SelectItem key={c.id} value={normalizeId(c.id)}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Donation Amount (₹)</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  min={campaigns.find((c) => areSameId(c.id, formData.campaign_id))?.min_amount || 1}
                />
              </div>
            </>
          )}

          {/* ── Proof for a single payment: now, or "upload later" ── */}
          {isSinglePayment && formData.member_id && !feeMissing && (formData.type === "monthly" || formData.campaign_id) && (
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              {!proofLater ? (
                <>
                  <div className="flex items-baseline justify-between gap-3">
                    <Label>Payment proof</Label>
                    <button
                      type="button"
                      onClick={() => { setProofLater(true); setProofFile(null); setProofError(""); }}
                      className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2"
                    >
                      Upload later
                    </button>
                  </div>
                  <ProofPicker
                    file={proofFile}
                    onPick={pickProof(setProofFile)}
                    onClear={() => setProofFile(null)}
                    prompt="Add the payment screenshot or receipt"
                    maxUploadMb={maxUploadMb}
                    error={proofError}
                  />
                </>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs text-slate-600">
                    Only the challan will be generated. Upload the proof from the challan list after paying.
                  </p>
                  <button
                    type="button"
                    onClick={() => setProofLater(false)}
                    className="shrink-0 text-xs font-medium text-emerald-700 hover:underline"
                  >
                    Add proof now
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes (Optional)</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes…"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!canSubmit} className="bg-emerald-600 hover:bg-emerald-700">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {sendsProofNow ? "Generate & Submit Proof" : "Generate Challan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
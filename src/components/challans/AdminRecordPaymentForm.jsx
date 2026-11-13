import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { charityClient } from "@/api/charityClient";
import { usePublicSettings } from "@/lib/usePublicSettings";
import { currentBusinessDate, currentBusinessMonth, formatBusinessDate } from "@/lib/businessTime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, X } from "lucide-react";
import { formatMonth } from "@/lib/challanStatus";

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "upi", label: "UPI" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];
const REFERENCE_METHODS = ["bank_transfer", "upi", "cheque"];
const NOTES_METHODS = ["cash", "other"];

const formatInr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export const isOwnMemberRecord = (member, user) =>
  !!member && !!user && (
    (member.user_id != null && Number(member.user_id) === Number(user.id)) ||
    (member.user_id == null && !!member.email && member.email === user.email)
  );

export default function AdminRecordPaymentForm({
  open,
  onOpenChange,
  members = [],
  currentUser,
  presetMember = null,
  onRecorded,
}) {
  const { toast } = useToast();
  const settings = usePublicSettings();
  const maxMonths = Number(settings.max_months_per_payment) || 12;
  const maxUploadMb = Number(settings.proof_max_upload_mb) || 5;

  const [search, setSearch] = useState("");
  const [member, setMember] = useState(null);
  const [kind, setKind] = useState("monthly");
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [amountPerMonth, setAmountPerMonth] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [receivedOn, setReceivedOn] = useState(currentBusinessDate());
  const [collectedBy, setCollectedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [proof, setProof] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const today = currentBusinessDate();

  useEffect(() => {
    if (!open) return;
    setMember(presetMember && !isOwnMemberRecord(presetMember, currentUser) ? presetMember : null);
    setSearch("");
    setSearchTerm("");
    setKind("monthly");
    setSelectedMonths([]);
    setCampaignId("");
    setAmount("");
    setMethod("cash");
    setReference("");
    setReceivedOn(currentBusinessDate());
    setCollectedBy(currentUser?.id ? String(currentUser.id) : "");
    setNotes("");
    setProof(null);
    setConfirming(false);
  }, [open, presetMember, currentUser]);

  useEffect(() => {
    setAmountPerMonth(member?.monthly_amount ? String(member.monthly_amount) : "");
    setSelectedMonths([]);
  }, [member]);

  // Search on the server, so every member can be found (not just the ones loaded on the page).
  const [searchTerm, setSearchTerm] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  const { data: found = [], isFetching: searching } = useQuery({
    queryKey: ["members", "record-search", searchTerm],
    enabled: open && searchTerm.length > 0,
    queryFn: () => charityClient.members.list({ search: searchTerm, limit: 20 }),
  });

  const candidates = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return [];
    const local = members.filter((m) =>
      [m.full_name, m.member_code, m.member_id, m.phone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
    const byId = new Map([...found, ...local].map((m) => [String(m.id), m]));
    return [...byId.values()].filter((m) => !isOwnMemberRecord(m, currentUser)).slice(0, 8);
  }, [searchTerm, found, members, currentUser]);

  const { data: payable, isFetching: loadingMonths } = useQuery({
    queryKey: ["challans", "payable-months", "admin-record", member?.id],
    enabled: open && !!member && kind === "monthly",
    queryFn: () => charityClient.challans.payableMonths({ member_id: Number(member.id), include_upcoming: true }),
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    enabled: open && kind === "campaign",
    queryFn: () => charityClient.campaigns.list(),
  });

  const { data: collectors = [] } = useQuery({
    queryKey: ["users", "collectors"],
    enabled: open && method === "cash",
    queryFn: async () => {
      const users = await charityClient.users.list({ is_active: true, limit: 200 });
      return users.filter((u) => ["admin", "superadmin"].includes(String(u.role).toLowerCase()));
    },
  });

  const months = payable?.all_months || [];
  const currentMonth = payable?.current_month || currentBusinessMonth();
  const total = kind === "monthly"
    ? selectedMonths.length * Number(amountPerMonth || 0)
    : Number(amount || 0);
  const standardAmount = Number(member?.monthly_amount || 0);
  const amountDiffers = kind === "monthly" && Number(amountPerMonth) !== standardAmount;
  const notesRequired = NOTES_METHODS.includes(method) || amountDiffers;
  const activeCampaigns = campaigns.filter((c) => String(c.status).toLowerCase() === "active");

  const toggleMonth = (m) => {
    setSelectedMonths((prev) => {
      if (prev.includes(m)) return prev.filter((x) => x !== m);
      if (prev.length >= maxMonths) {
        toast({ title: `You can record at most ${maxMonths} months at once.`, variant: "destructive" });
        return prev;
      }
      return [...prev, m].sort();
    });
  };

  const pickProof = (file) => {
    if (file && file.size > maxUploadMb * 1024 * 1024) {
      toast({ title: `Proof must be ${maxUploadMb} MB or smaller.`, variant: "destructive" });
      return;
    }
    setProof(file || null);
  };

  const validationError = () => {
    if (!member) return "Select a member.";
    if (kind === "monthly" && selectedMonths.length === 0) return "Select at least one month.";
    if (kind === "campaign" && !campaignId) return "Select a campaign.";
    if (total <= 0) return "Enter a valid amount.";
    if (REFERENCE_METHODS.includes(method) && !reference.trim()) return "Transaction reference is required.";
    if (notesRequired && !notes.trim()) return "Notes are required for this entry.";
    if (!receivedOn || receivedOn > today) return "Received on cannot be a future date.";
    return null;
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        member_id: member.id,
        type: kind,
        payment_method: method,
        received_on: receivedOn,
        transaction_ref: REFERENCE_METHODS.includes(method) ? reference.trim() : undefined,
        collected_by_user_id: method === "cash" ? collectedBy : undefined,
        entry_notes: notes.trim() || undefined,
        ...(kind === "monthly"
          ? { months: selectedMonths, amount_per_month: amountPerMonth }
          : { campaign_id: campaignId, amount }),
      };
      const created = await charityClient.challans.adminRecord(payload, proof);
      toast({ title: "Payment recorded", description: "Another admin must verify this payment." });
      onOpenChange(false);
      onRecorded?.(created);
    } catch (error) {
      toast({
        title: error?.status === 409 ? "Duplicate transaction reference" : "Could not record payment",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
      setConfirming(false);
    } finally {
      setSubmitting(false);
    }
  };

  const onReview = () => {
    const error = validationError();
    if (error) {
      toast({ title: error, variant: "destructive" });
      return;
    }
    setConfirming(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Money already received</DialogTitle>
          <DialogDescription>
            Enter a payment received from a member. It stays pending until a different admin verifies it.
          </DialogDescription>
        </DialogHeader>

        {confirming ? (
          <div className="space-y-4">
            <div className="rounded-lg border p-3 space-y-1 text-sm">
              <p><span className="text-slate-500">Member:</span> {member.full_name}</p>
              <p>
                <span className="text-slate-500">For:</span>{" "}
                {kind === "monthly"
                  ? selectedMonths.map(formatMonth).join(", ")
                  : activeCampaigns.find((c) => String(c.id) === String(campaignId))?.title}
              </p>
              <p><span className="text-slate-500">Total:</span> <strong>{formatInr(total)}</strong></p>
              <p>
                <span className="text-slate-500">Method:</span> {METHODS.find((m) => m.value === method)?.label}
                {reference ? ` · Ref ${reference}` : ""}
              </p>
              <p><span className="text-slate-500">Received on:</span> {formatBusinessDate(receivedOn)} (IST)</p>
              {proof && <p><span className="text-slate-500">Proof:</span> {proof.name}</p>}
            </div>
            <p className="text-sm font-medium text-amber-700">Another admin must verify this payment.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setConfirming(false)} disabled={submitting}>Back</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={submit} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirm &amp; record
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Member</Label>
              {member ? (
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-sm">
                    {member.full_name} <span className="text-slate-500">({member.member_code || member.member_id})</span>
                  </span>
                  {!presetMember && (
                    <Button variant="ghost" size="icon" onClick={() => setMember(null)} aria-label="Change member">
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <Input
                    placeholder="Search by name, member code or phone"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {searching && candidates.length === 0 && (
                    <p className="text-xs text-slate-500"><Loader2 className="w-3 h-3 inline animate-spin mr-1" />Searching…</p>
                  )}
                  {!searching && searchTerm && candidates.length === 0 && (
                    <p className="text-xs text-slate-500">No members found.</p>
                  )}
                  {candidates.length > 0 && (
                    <div className="rounded-md border divide-y max-h-48 overflow-y-auto">
                      {candidates.map((m) => (
                        <button
                          type="button"
                          key={m.id}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                          onClick={() => setMember(m)}
                        >
                          {m.full_name} <span className="text-slate-500">· {m.member_code || m.member_id}{m.phone ? ` · ${m.phone}` : ""}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label>Payment type</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly contribution</SelectItem>
                  <SelectItem value="campaign">Campaign donation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {kind === "monthly" ? (
              <div className="space-y-2">
                <Label>Months (max {maxMonths})</Label>
                {!member ? (
                  <p className="text-xs text-slate-500">Select a member to see payable months.</p>
                ) : loadingMonths ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : months.length === 0 ? (
                  <p className="text-xs text-slate-500">No payable months for this member.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {months.map((m) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => toggleMonth(m)}
                        className={`px-2.5 py-1 rounded-full border text-xs ${
                          selectedMonths.includes(m)
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white dark:bg-slate-900"
                        }`}
                      >
                        {formatMonth(m)}{m === currentMonth ? " •" : ""}
                      </button>
                    ))}
                  </div>
                )}
                <Label htmlFor="rec-amount-pm">Amount per month (₹)</Label>
                <Input
                  id="rec-amount-pm"
                  type="number"
                  min="1"
                  inputMode="decimal"
                  value={amountPerMonth}
                  onChange={(e) => setAmountPerMonth(e.target.value)}
                />
                {amountDiffers && member && (
                  <p className="text-xs text-amber-700">Differs from the standard {formatInr(standardAmount)} — notes are required.</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Campaign</Label>
                <Select value={campaignId} onValueChange={setCampaignId}>
                  <SelectTrigger><SelectValue placeholder="Select campaign" /></SelectTrigger>
                  <SelectContent>
                    {activeCampaigns.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Label htmlFor="rec-amount">Amount (₹)</Label>
                <Input id="rec-amount" type="number" min="1" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
            )}

            <div className="flex items-center justify-between rounded-md bg-slate-50 dark:bg-slate-800 px-3 py-2">
              <span className="text-sm text-slate-600 dark:text-slate-300">Total</span>
              <Badge variant="secondary" className="text-sm">{formatInr(total)}</Badge>
            </div>

            <div className="space-y-2">
              <Label>Payment method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {REFERENCE_METHODS.includes(method) && (
              <div className="space-y-2">
                <Label htmlFor="rec-ref">Transaction reference</Label>
                <Input id="rec-ref" value={reference} maxLength={100} onChange={(e) => setReference(e.target.value)} />
              </div>
            )}

            {method === "cash" && (
              <div className="space-y-2">
                <Label>Collected by</Label>
                <Select value={collectedBy} onValueChange={setCollectedBy}>
                  <SelectTrigger><SelectValue placeholder="Select collector" /></SelectTrigger>
                  <SelectContent>
                    {collectors.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.full_name || u.username}{u.id === currentUser?.id ? " (me)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="rec-received">Received on (IST)</Label>
              <Input id="rec-received" type="date" max={today} value={receivedOn} onChange={(e) => setReceivedOn(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rec-notes">Notes{notesRequired ? " (required)" : " (optional)"}</Label>
              <Textarea id="rec-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rec-proof">Proof (optional, max {maxUploadMb} MB)</Label>
              <Input id="rec-proof" type="file" accept="image/*,application/pdf" onChange={(e) => pickProof(e.target.files?.[0])} />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={onReview}>Review</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

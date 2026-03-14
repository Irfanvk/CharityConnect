import React, { useState, useEffect, useCallback } from "react";
import { charityClient } from "@/api/charityClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  MoreVertical,
  Upload,
  CheckCircle,
  XCircle,
  Eye,
  Receipt,
  Clock,
  FileText,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import ChallanForm from "@/components/challans/ChallanForm";
import ProofUpload from "@/components/challans/ProofUpload";
import PullToRefresh from "@/components/mobile/PullToRefresh";
import { useToast } from "@/components/ui/use-toast";

// ─────────────────────────────────────────────────────────────────────────────
// Constants & pure helpers
// ─────────────────────────────────────────────────────────────────────────────

// Backend status values: generated | pending | approved | rejected
const statusConfig = {
  generated: {
    label: "Generated",
    color: "bg-slate-100 text-slate-700",
    icon: FileText,
  },
  pending: {
    label: "Pending Review",
    color: "bg-amber-100 text-amber-700",
    icon: Clock,
  },
  approved: {
    label: "Approved",
    color: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle,
  },
  rejected: {
    label: "Rejected",
    color: "bg-rose-100 text-rose-700",
    icon: XCircle,
  },
};

/**
 * Maps backend challan → display status.
 * When status is "pending" AND proof has been uploaded, we show a distinct
 * "Proof Uploaded" badge so admins can act on it quickly.
 */
const getDisplayStatus = (challan) => {
  if (challan.status === "pending" && challan.proof_uploaded_at) {
    return {
      label: "Proof Uploaded",
      color: "bg-blue-100 text-blue-700",
      icon: ImageIcon,
    };
  }
  return statusConfig[challan.status] ?? statusConfig.generated;
};

const normalizeId = (value) =>
  value === null || value === undefined ? "" : String(value);

const parseAmount = (amount) => {
  if (typeof amount === "number") return amount;
  if (typeof amount === "string") return Number(amount) || 0;
  if (amount && typeof amount === "object") {
    return Number(amount.parsedValue ?? amount.value ?? amount.source) || 0;
  }
  return 0;
};

// ─────────────────────────────────────────────────────────────────────────────
// useDebounce
// Delays updating the query key until the user stops typing (400 ms).
// If you already have this hook at @/hooks/useDebounce, remove this block
// and import from there instead.
// ─────────────────────────────────────────────────────────────────────────────
function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ─────────────────────────────────────────────────────────────────────────────
// Challans page
// ─────────────────────────────────────────────────────────────────────────────
export default function Challans() {
  // ── UI state ──────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState(null);
  const [proofViewOpen, setProofViewOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  // Tracks which challan is mid-approve to show inline spinner & block double-tap
  const [approvingId, setApprovingId] = useState(null);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    charityClient.auth.me().then(setUser).catch(() => {});
  }, []);

  // FIX: isAdmin moved here — BEFORE createMutation — so the mutation closure
  // captures the correct value. In the original it was defined ~40 lines later,
  // meaning isAdmin was always undefined inside the mutation.
  const isAdmin = user?.role === "admin";

  // ── Debounced search ──────────────────────────────────────────────────────
  // Only included in the query key (and sent to the API) after the user
  // stops typing for 400 ms, preventing one request per keystroke.
  const debouncedSearch = useDebounce(search, 400);

  // ── Supporting data ───────────────────────────────────────────────────────
  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: () => charityClient.members.list(),
    enabled: !!user,
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => charityClient.campaigns.list(),
    enabled: !!user,
  });

  // The member record linked to the logged-in user.
  // Used to scope the challans API call for non-admin users.
  const myMember = members.find((m) => m.email === user?.email);

  // ── Server-side filter param builder ─────────────────────────────────────
  /**
   * Returns the query-string params object passed to charityClient.challans.list().
   *
   * Required backend support (see bottom of file for Django / Prisma examples):
   *   order      → ORDER BY created_date DESC
   *   status     → WHERE status = ?
   *   has_proof  → WHERE proof_uploaded_at IS NOT NULL  (when true)
   *   search     → ILIKE on challan_number + member_name
   *   member_id  → WHERE member_id = ?
   *   created_by → WHERE created_by = ?  (email fallback)
   */
  const buildQueryParams = useCallback(() => {
    const params = { order: "-created_date" };

    // Status
    if (statusFilter !== "all") {
      if (statusFilter === "proof_uploaded") {
        // "Proof Uploaded" is a frontend-only display concept.
        // Backend equivalent: status=pending AND proof_uploaded_at IS NOT NULL
        params.status = "pending";
        params.has_proof = true;
      } else {
        params.status = statusFilter;
      }
    }

    // Search (sent only after debounce)
    if (debouncedSearch.trim()) {
      params.search = debouncedSearch.trim();
    }

    // Non-admin scoping — tell the server to filter by member instead of
    // returning all challans and filtering client-side
    if (!isAdmin) {
      if (myMember?.id) {
        params.member_id = myMember.id;
      } else if (user?.email) {
        // Fallback while the members query is still loading
        params.created_by = user.email;
      }
    }

    return params;
  }, [statusFilter, debouncedSearch, isAdmin, myMember?.id, user?.email]);

  // ── Main challans query ───────────────────────────────────────────────────
  const { data: challans = [], isLoading } = useQuery({
    queryKey: ["challans", statusFilter, debouncedSearch, myMember?.id],
    queryFn: () => charityClient.challans.list(buildQueryParams()),
    // Wait until we know the user's role so we don't fire an unscoped request
    // that gets immediately replaced once isAdmin resolves.
    enabled: user !== null,
  });

  // ── Display normalisation ─────────────────────────────────────────────────
  // Server now handles status & search filtering.
  // This pass only fills in display-level fallbacks.
  const normalisedChallans = challans.map((challan) => {
    const linkedMember = members.find(
      (m) => normalizeId(m.id) === normalizeId(challan.member_id)
    );
    return {
      ...challan,
      challan_number: challan.challan_number || `CH-${challan.id}`,
      member_name:
        challan.member_name ||
        linkedMember?.full_name ||
        `Member #${challan.member_id}`,
      amount: parseAmount(challan.amount),
    };
  });

  // ── Shared invalidation helpers ───────────────────────────────────────────
  const invalidateAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["challans"] }),
      queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
    ]);
  }, [queryClient]);

  const refreshChallanData = useCallback(async () => {
    await invalidateAll();
    setUploadOpen(false);
    setSelectedChallan(null);
    setRejectOpen(false);
  }, [invalidateAll]);

  // ── Create mutation ───────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const payload = data || {};
      const months =
        payload?.selected_months || payload?.months_covered || [];
      const isBulkMonthly =
        payload?.type === "monthly" &&
        Array.isArray(months) &&
        months.length > 1;

      if (isBulkMonthly) {
        const amountPerMonth =
          Number(payload?.member_monthly_amount || 0) ||
          Number(payload?.amount || 0) / months.length;

        const result = await charityClient.challans.bulkCreate({
          months,
          amount_per_month: amountPerMonth,
          // isAdmin is now correctly in scope here
          member_id: isAdmin ? payload?.member_id : undefined,
          notes: payload?.notes,
        });

        toast({
          title: "Bulk challans created",
          description: `${months.length} challans created successfully.`,
        });

        return result;
      }

      return charityClient.challans.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challans"] });
      setFormOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Unable to create challan",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // ── Approve ───────────────────────────────────────────────────────────────
  // FIX: try/catch added — original silently dropped errors.
  // FIX: approvingId guard prevents double-firing on rapid taps.
  const handleApprove = async (challan) => {
    if (approvingId) return;
    setApprovingId(challan.id);
    try {
      await charityClient.challans.approve(challan.id, {
        approved_by_admin_id: user?.id,
      });

      // ⚠️  Race-condition risk: two admins approving simultaneously can
      //     produce an incorrect collected_amount. Move this increment to a
      //     server-side post-approve trigger when possible.
      if (challan.type === "donation" && challan.campaign_id) {
        const campaign = campaigns.find((c) => c.id === challan.campaign_id);
        if (campaign) {
          await charityClient.campaigns.update(campaign.id, {
            collected_amount:
              (campaign.collected_amount || 0) + challan.amount,
            participants_count: (campaign.participants_count || 0) + 1,
          });
        }
      }

      await charityClient.auditLogs.create({
        action_type: "challan_approved",
        performed_by: user?.email,
        performed_by_name: user?.full_name,
        target_type: "Challan",
        target_id: challan.id,
        target_name: challan.challan_number,
        details: { amount: challan.amount, member: challan.member_name },
      });

      await refreshChallanData();
      toast({ title: "Challan approved successfully." });
    } catch (error) {
      toast({
        title: "Approval failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setApprovingId(null);
    }
  };

  // ── Reject ────────────────────────────────────────────────────────────────
  // FIX: try/catch added — original silently dropped errors.
  const handleReject = async () => {
    if (!selectedChallan) return;
    try {
      await charityClient.challans.reject(selectedChallan.id, {
        rejection_reason: rejectReason,
        approved_by_admin_id: user?.id,
      });

      await charityClient.auditLogs.create({
        action_type: "challan_rejected",
        performed_by: user?.email,
        performed_by_name: user?.full_name,
        target_type: "Challan",
        target_id: selectedChallan.id,
        target_name: selectedChallan.challan_number,
        details: {
          amount: selectedChallan.amount,
          member: selectedChallan.member_name,
          reason: rejectReason,
        },
      });

      await refreshChallanData();
      setRejectReason("");
      toast({ title: "Challan rejected." });
    } catch (error) {
      toast({
        title: "Rejection failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  // ── Misc helpers ──────────────────────────────────────────────────────────
  const getSuggestedNumber = () => {
    const prefix = "CHN";
    const year = format(new Date(), "yy");
    const count = challans.length + 1;
    return `${prefix}${year}-${String(count).padStart(4, "0")}`;
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["challans"] });
    await queryClient.invalidateQueries({ queryKey: ["members"] });
    await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Challans
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Manage payment challans and approvals
            </p>
          </div>
          <Button
            onClick={() => setFormOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 select-none"
          >
            <Plus className="w-4 h-4 mr-2" />
            Generate Challan
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search challans..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="generated">Generated</TabsTrigger>
              <TabsTrigger value="proof_uploaded">Uploaded</TabsTrigger>
              {isAdmin && <TabsTrigger value="pending">Pending</TabsTrigger>}
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Challans Table */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Challan #</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-slate-500"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading challans...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : normalisedChallans.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-slate-500"
                    >
                      No challans found
                    </TableCell>
                  </TableRow>
                ) : (
                  normalisedChallans.map((challan) => {
                    const status = getDisplayStatus(challan);
                    const isApprovingThis = approvingId === challan.id;
                    return (
                      <TableRow
                        key={challan.id}
                        className="hover:bg-slate-50/50"
                      >
                        {/* Challan # */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-slate-400" />
                            <span className="font-medium">
                              {challan.challan_number}
                            </span>
                          </div>
                        </TableCell>

                        {/* Member */}
                        <TableCell>
                          <p className="font-medium text-slate-900">
                            {challan.member_name}
                          </p>
                        </TableCell>

                        {/* Type */}
                        <TableCell>
                          {challan.type === "monthly" ? (
                            <div className="space-y-1">
                              <Badge variant="outline" className="capitalize">
                                Monthly
                              </Badge>
                              {challan.months_count > 1 ? (
                                <p className="text-xs text-slate-500">
                                  {challan.months_count} months (
                                  {format(
                                    new Date(
                                      challan.months_covered[0] + "-01"
                                    ),
                                    "MMM yy"
                                  )}{" "}
                                  -{" "}
                                  {format(
                                    new Date(
                                      challan.months_covered[
                                        challan.months_covered.length - 1
                                      ] + "-01"
                                    ),
                                    "MMM yy"
                                  )}
                                  )
                                </p>
                              ) : (
                                <p className="text-xs text-slate-500">
                                  {format(
                                    new Date(challan.month + "-01"),
                                    "MMM yyyy"
                                  )}
                                </p>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="capitalize">
                              {challan.campaign_name || "Donation"}
                            </Badge>
                          )}
                        </TableCell>

                        {/* Amount */}
                        <TableCell>
                          <span className="font-semibold text-slate-900">
                            ₹{challan.amount.toLocaleString("en-IN")}
                          </span>
                        </TableCell>

                        {/* Date */}
                        <TableCell>
                          {format(
                            new Date(challan.created_date),
                            "MMM d, yyyy"
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <div className="space-y-1">
                            <Badge className={status?.color}>
                              {isApprovingThis ? (
                                <span className="flex items-center gap-1">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Approving…
                                </span>
                              ) : (
                                status?.label
                              )}
                            </Badge>
                            {challan.status === "rejected" &&
                              challan.rejection_reason && (
                                <p className="text-xs text-rose-600 mt-1">
                                  Reason: {challan.rejection_reason}
                                </p>
                              )}
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">

                              {/* View Proof */}
                              {challan.proof_url && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedChallan(challan);
                                    setProofViewOpen(true);
                                  }}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Proof
                                </DropdownMenuItem>
                              )}

                              {/* Upload / Re-upload Proof */}
                              {(challan.status === "generated" ||
                                challan.status === "rejected") &&
                                (isAdmin ||
                                  (myMember &&
                                    normalizeId(challan.member_id) ===
                                      normalizeId(myMember.id))) && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedChallan(challan);
                                      setUploadOpen(true);
                                    }}
                                  >
                                    <Upload className="w-4 h-4 mr-2" />
                                    {challan.status === "rejected"
                                      ? "Re-upload Proof"
                                      : "Upload Proof"}
                                  </DropdownMenuItem>
                                )}

                              {/* Admin: Approve / Reject */}
                              {isAdmin &&
                                (challan.status === "proof_uploaded" ||
                                  challan.status === "pending") && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => handleApprove(challan)}
                                      className="text-emerald-600"
                                      disabled={!!approvingId}
                                    >
                                      {isApprovingThis ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      ) : (
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                      )}
                                      Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedChallan(challan);
                                        setRejectOpen(true);
                                      }}
                                      className="text-rose-600"
                                      disabled={!!approvingId}
                                    >
                                      <XCircle className="w-4 h-4 mr-2" />
                                      Reject
                                    </DropdownMenuItem>
                                  </>
                                )}

                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Challan Form */}
        <ChallanForm
          open={formOpen}
          onOpenChange={setFormOpen}
          onSubmit={createMutation.mutateAsync}
          members={members}
          campaigns={campaigns}
          existingChallans={challans}
          suggestedNumber={getSuggestedNumber()}
          currentUser={user}
        />

        {/* Proof Upload */}
        <ProofUpload
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          challan={selectedChallan}
          onSubmit={refreshChallanData}
        />

        {/* Proof View Dialog */}
        <Dialog open={proofViewOpen} onOpenChange={setProofViewOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                Payment Proof – {selectedChallan?.challan_number}
              </DialogTitle>
            </DialogHeader>
            {selectedChallan?.proof_url && (
              <img
                src={selectedChallan.proof_url}
                alt="Payment Proof"
                className="w-full rounded-lg"
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Reject Challan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Enter rejection reason..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setRejectOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReject}
                  className="bg-rose-600 hover:bg-rose-700"
                  disabled={!rejectReason}
                >
                  Reject
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </PullToRefresh>
  );
}


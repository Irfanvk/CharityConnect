import React, { useState, useEffect, useCallback, useMemo } from "react";
import { formatMemberId } from "@/lib/utils";
import { charityClient } from "@/api/charityClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { emitNotificationsChanged } from "@/lib/notificationState";
import { useNavigate } from "react-router-dom";
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
  Undo2,
  Pencil,
  Trash2,
  Layers,
} from "lucide-react";
import { format } from "@/lib/dateTime";
import ChallanForm from "@/components/challans/ChallanForm";
import ProofUpload from "@/components/challans/ProofUpload";
import PullToRefresh from "@/components/mobile/PullToRefresh";
import UserProfilePopover from "@/components/UserProfilePopover";
import { useToast } from "@/components/ui/use-toast";
import { PAGE_PATHS } from "@/config/appPaths";
import { saveBulkGroup, loadBulkGroups, updateBulkGroupStatus } from "@/lib/bulkGroupStore";

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

const CHALLAN_FETCH_BATCH_SIZE = 200;
const PLATFORM_START_MONTH = "2024-08";

const parseAmount = (amount) => {
  if (typeof amount === "number") return amount;
  if (typeof amount === "string") return Number(amount) || 0;
  if (amount && typeof amount === "object") {
    return Number(amount.parsedValue ?? amount.value ?? amount.source) || 0;
  }
  return 0;
};

const isChallanVisibleFromPlatformStart = (challan) => {
  const challanType = String(challan?.type || challan?.backend_type || "").toLowerCase();
  if (challanType !== "monthly") {
    return true;
  }
  const month = String(challan?.month || "").trim();
  if (!month) {
    return true;
  }
  return month >= PLATFORM_START_MONTH;
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
  const [entryFilter, setEntryFilter] = useState("all");
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState(null);
  const [bulkProofByGroup, setBulkProofByGroup] = useState({});
  const [editOpen, setEditOpen] = useState(false);
  const [editChallan, setEditChallan] = useState(null);
  const [editData, setEditData] = useState({ month: "", amount: "" });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [proofViewOpen, setProofViewOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  // Tracks which challan is mid-approve to show inline spinner & block double-tap
  const [approvingId, setApprovingId] = useState(null);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    charityClient.auth.me().then(setUser).catch(() => { });
  }, []);

  // FIX: isAdmin moved here — BEFORE createMutation — so the mutation closure
  // captures the correct value. In the original it was defined ~40 lines later,
  // meaning isAdmin was always undefined inside the mutation.
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  // ── Debounced search ──────────────────────────────────────────────────────
  // Only included in the query key (and sent to the API) after the user
  // stops typing for 400 ms, preventing one request per keystroke.
  const debouncedSearch = useDebounce(search, 400);

  // ── Supporting data ───────────────────────────────────────────────────────
  // Admins can list all members; regular members cannot — they get 403 or []
  // from the members list endpoint. Fetch own profile via /members/me instead.
  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: () => charityClient.members.list(),
    enabled: !!user && isAdmin,
  });

  const { data: myMemberFromApi } = useQuery({
    queryKey: ["members", "me"],
    queryFn: () => charityClient.members.me(),
    enabled: !!user && !isAdmin,
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => charityClient.campaigns.list(),
    enabled: !!user,
  });

  // The member record linked to the logged-in user.
  // Used to scope the challans API call for non-admin users.
  const myMember = isAdmin
    ? members.find((m) => m.email === user?.email)
    : myMemberFromApi ?? null;

  // Members array passed to ChallanForm:
  // - Admins: full list (for member picker)
  // - Members: single-item array so ChallanForm can resolve the name
  const membersForForm = isAdmin ? members : (myMember ? [myMember] : []);

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
    const params = {
      order: "-created_date",
    };

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

  // ── Bulk operations query (admin) ─────────────────────────────────────────
  // Fetches all pending bulk groups from the admin endpoint to supplement the
  // localStorage cache. This catches groups created on another device / session.
  const { data: adminBulkOps = [] } = useQuery({
    queryKey: ["bulk-operations", "pending", "for-grouping"],
    queryFn: async () => {
      const result = await charityClient.bulkOperations.listPending({
        days: 365,
        sort_by: 'created_at',
        order: 'desc',
      });
      const ops = result?.bulk_operations || [];
      // Persist to localStorage so they survive beyond the pending window.
      ops.forEach((op) => saveBulkGroup(op));
      return ops;
    },
    enabled: isAdmin === true,
    staleTime: 2 * 60 * 1000,
  });

  // ── Main challans query ───────────────────────────────────────────────────
  const { data: challanItems = [], isLoading } = useQuery({
    queryKey: [
      "challans",
      statusFilter,
      debouncedSearch,
      myMember?.id,
    ],
    queryFn: async () => {
      const baseQuery = buildQueryParams();
      const allItems = [];
      let skip = 0;
      let total = Infinity;

      while (allItems.length < total) {
        const page = await charityClient.challans.listPaginated({
          ...baseQuery,
          skip,
          limit: CHALLAN_FETCH_BATCH_SIZE,
        });

        const pageItems = Array.isArray(page?.items) ? page.items : [];
        allItems.push(...pageItems);

        const parsedTotal = Number(page?.total ?? pageItems.length);
        total = Number.isFinite(parsedTotal) ? parsedTotal : allItems.length;

        if (pageItems.length < CHALLAN_FETCH_BATCH_SIZE) {
          break;
        }

        skip += CHALLAN_FETCH_BATCH_SIZE;
      }

      return allItems;
    },
    // Wait until we know the user's role so we don't fire an unscoped request
    // that gets immediately replaced once isAdmin resolves.
    enabled: user !== null,
  });

  // ── Display normalisation ─────────────────────────────────────────────────
  // Server now handles status & search filtering.
  // This pass only fills in display-level fallbacks.
  const normalisedSourceChallans = challanItems
    .filter(isChallanVisibleFromPlatformStart)
    .map((challan) => {
    const linkedMember = members.find(
      (m) => normalizeId(m.id) === normalizeId(challan.member_id)
    );
    return {
      ...challan,
      challan_number: challan.challan_number || `CH-${challan.id}`,
      member_name:
        challan.member_name ||
        linkedMember?.full_name ||
        `Member ${formatMemberId(challan.member_id)}`,
      amount: parseAmount(challan.amount),
    };
  });

  const groupedChallans = useMemo(() => {
    // ── Build challan-ID → bulk-group map ────────────────────────────────────
    // The backend /challans/ list does NOT include bulk_group_id on rows.
    // We cross-reference using:
    //   1. localStorage (populated at bulk-create time, any status)
    //   2. Admin bulk-pending-review API (to catch groups from other devices)
    const localGroups = loadBulkGroups();
    // Merge: admin ops may have fresher data; localStorage has history.
    const allGroupMeta = new Map();
    localGroups.forEach((g) => {
      if (g?.bulk_group_id) allGroupMeta.set(String(g.bulk_group_id), g);
    });
    adminBulkOps.forEach((g) => {
      if (g?.bulk_group_id) allGroupMeta.set(String(g.bulk_group_id), g);
    });

    // challan numeric ID → bulk group metadata
    const challanIdToGroup = new Map();
    allGroupMeta.forEach((meta) => {
      (meta.challan_ids || []).forEach((rawId) => {
        const id = Number(rawId);
        if (Number.isFinite(id)) challanIdToGroup.set(id, meta);
      });
    });

    // ── Separate singles from bulk-group members ──────────────────────────────
    const bulkGroupRows = new Map(); // groupId → row[]
    const singles = [];

    normalisedSourceChallans.forEach((challan) => {
      // Use ID cross-reference (primary) or inline bulk_group_id if backend ever adds it.
      const meta =
        challanIdToGroup.get(Number(challan.id)) ||
        (challan.bulk_group_id
          ? allGroupMeta.get(String(challan.bulk_group_id))
          : null);

      if (!meta) {
        singles.push(challan);
        return;
      }

      const groupId = String(meta.bulk_group_id);
      if (!bulkGroupRows.has(groupId)) bulkGroupRows.set(groupId, []);
      bulkGroupRows.get(groupId).push(challan);
    });

    const grouped = Array.from(bulkGroupRows.entries()).map(([groupId, rows]) => {
      const meta = allGroupMeta.get(groupId) || {};
      const first = rows[0] || {};
      const createdAt = rows
        .map((entry) => new Date(entry.created_date).getTime())
        .filter((ts) => Number.isFinite(ts));

      const uniqueMonths = Array.from(
        new Set(
          rows
            .flatMap((entry) => {
              if (Array.isArray(entry.months_covered) && entry.months_covered.length > 0) {
                return entry.months_covered;
              }
              if (entry.month) return [entry.month];
              return [];
            })
            .filter(Boolean)
        )
      ).sort();

      const statuses = rows.map((entry) => entry.status);
      let status = first.status || "generated";
      if (statuses.length > 0) {
        if (statuses.every((s) => s === "approved")) {
          status = "approved";
        } else if (statuses.some((s) => s === "rejected")) {
          status = "rejected";
        } else if (statuses.some((s) => s === "pending" || s === "proof_uploaded")) {
          status = "pending";
        } else if (statuses.every((s) => s === "generated")) {
          status = "generated";
        }
      }

      const proofUrl =
        meta.proof_url ||
        first.proof_url ||
        null;

      return {
        ...first,
        id: `bulk:${groupId}`,
        is_bulk_group: true,
        bulk_group_id: groupId,
        challan_ids: rows.map((entry) => entry.id),
        challan_number: /^BCH-/i.test(groupId) ? groupId : `BULK-${groupId.slice(0, 8).toUpperCase()}`,
        member_name:
          meta.member_name || first.member_name || `Member ${formatMemberId(first.member_id)}`,
        amount: rows.reduce((sum, entry) => sum + parseAmount(entry.amount), 0),
        months_covered: uniqueMonths,
        months_count: uniqueMonths.length,
        month: uniqueMonths[0] || first.month || "",
        proof_url: proofUrl,
        proof_uploaded_at: meta.created_at || first.proof_uploaded_at || null,
        created_date:
          createdAt.length > 0
            ? new Date(Math.max(...createdAt)).toISOString()
            : meta.created_at || first.created_date,
        status,
        rejection_reason:
          rows.find((entry) => entry.rejection_reason)?.rejection_reason ||
          first.rejection_reason ||
          "",
        _group_rows: rows,
      };
    });

    const merged = [...singles, ...grouped];
    merged.sort((a, b) => {
      const bTime = new Date(b.created_date).getTime() || 0;
      const aTime = new Date(a.created_date).getTime() || 0;
      return bTime - aTime;
    });
    return merged;
  }, [normalisedSourceChallans, adminBulkOps]);

  const filteredGroupedChallans = useMemo(() => {
    if (entryFilter === "bulk") {
      return groupedChallans.filter((entry) => entry.is_bulk_group);
    }
    if (entryFilter === "individual") {
      return groupedChallans.filter((entry) => !entry.is_bulk_group);
    }
    return groupedChallans;
  }, [groupedChallans, entryFilter]);

  const normalisedChallans = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredGroupedChallans.slice(start, end);
  }, [filteredGroupedChallans, currentPage, pageSize]);

  const totalItems = filteredGroupedChallans.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, debouncedSearch, pageSize, entryFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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

        const proofMode = payload?.proof_mode || "individual";

        if (proofMode === "shared") {
          const sharedProofFile = payload?.shared_proof_file || null;
          if (!sharedProofFile) {
            throw new Error("Please upload one payment proof for all selected months.");
          }

          const uploadedProof = await charityClient.files.upload(sharedProofFile);
          const proofFileId =
            uploadedProof?.file_url ||
            uploadedProof?.proof_file_id ||
            uploadedProof?.filename ||
            null;

          if (!proofFileId) {
            throw new Error("Shared proof upload failed. Please try again.");
          }

          const result = await charityClient.challans.bulkCreate({
            months,
            amount_per_month: amountPerMonth,
            proof_file_id: proofFileId,
            member_id: isAdmin ? payload?.member_id : undefined,
            notes: payload?.notes,
          });

          toast({
            title: "Bulk challan created",
            description: `One shared proof was attached for ${months.length} months.`,
          });

          // Persist bulk group info so the Challans list can group these rows.
          // The backend /challans/ list endpoint does not return bulk_group_id
          // on individual challan rows, so we store the mapping client-side.
          saveBulkGroup({
            ...result,
            member_id: isAdmin ? payload?.member_id : undefined,
          });

          return result;
        }

        const basePayload = {
          ...payload,
          type: "monthly",
          amount: amountPerMonth,
        };

        delete basePayload.selected_months;
        delete basePayload.months_covered;
        delete basePayload.months_count;
        delete basePayload.shared_proof_file;
        delete basePayload.proof_mode;

        const created = await Promise.all(
          months.map((month) =>
            charityClient.challans.create({
              ...basePayload,
              month,
            })
          )
        );

        toast({
          title: "Monthly challans created",
          description:
            `${months.length} challans created. Upload proof on each challan if required.`,
        });

        return {
          created_challans: created.length,
          mode: "individual",
        };
      }

      return charityClient.challans.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challans"] });
      emitNotificationsChanged('updated');
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

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => charityClient.challans.update(id, payload),
    onSuccess: async () => {
      await refreshChallanData();
      setEditOpen(false);
      setEditChallan(null);
      toast({ title: "Challan updated successfully." });
    },
    onError: (error) => {
      toast({
        title: "Unable to update challan",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (challan) => charityClient.challans.delete(challan.id),
    onSuccess: async () => {
      await refreshChallanData();
      setDeleteTarget(null);
      toast({ title: "Challan deleted successfully." });
    },
    onError: (error) => {
      toast({
        title: "Unable to delete challan",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const openEditDialog = (challan) => {
    setEditChallan(challan);
    setEditData({
      month: challan?.month || "",
      amount: String(challan?.amount ?? ""),
    });
    setEditOpen(true);
  };

  const submitEdit = () => {
    if (!editChallan) return;

    const payload = {};

    if (isAdmin) {
      payload.amount = Number(editData.amount);
      if (editChallan.type === "monthly") {
        payload.month = editData.month;
      }
    }

    if (Object.keys(payload).length === 0) return;

    updateMutation.mutate({ id: editChallan.id, payload });
  };

  // ── Approve ───────────────────────────────────────────────────────────────
  // FIX: try/catch added — original silently dropped errors.
  // FIX: approvingId guard prevents double-firing on rapid taps.
  const handleApprove = async (challan) => {
    if (approvingId) return;
    setApprovingId(challan.id);
    try {
      if (challan.is_bulk_group && challan.bulk_group_id) {
        await charityClient.bulkOperations.approve(challan.bulk_group_id, {
          approved: true,
          admin_notes: "Approved from challans list",
        });
        updateBulkGroupStatus(challan.bulk_group_id, 'approved');

        await refreshChallanData();
        emitNotificationsChanged('updated');
        toast({ title: "Bulk challan approved successfully." });
        return;
      }

      await charityClient.challans.approve(challan.id, {
        approved_by_admin_id: user?.id,
      });

      await refreshChallanData();
      emitNotificationsChanged('updated');
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
      if (selectedChallan.is_bulk_group && selectedChallan.bulk_group_id) {
        await charityClient.bulkOperations.reject(selectedChallan.bulk_group_id, {
          reason: rejectReason,
          action: "reject",
        });
        updateBulkGroupStatus(selectedChallan.bulk_group_id, 'rejected');

        await refreshChallanData();
        setRejectReason("");
        emitNotificationsChanged('updated');
        toast({ title: "Bulk challan rejected." });
        return;
      }

      await charityClient.challans.reject(selectedChallan.id, {
        rejection_reason: rejectReason,
      });

      await refreshChallanData();
      setRejectReason("");
      emitNotificationsChanged('updated');
      toast({ title: "Challan rejected." });
    } catch (error) {
      toast({
        title: "Rejection failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  // ── Revert to Pending ─────────────────────────────────────────────────────
  const handleRevert = async (challan) => {
    try {
      await charityClient.challans.revert(challan.id, {});

      await refreshChallanData();
      toast({ title: "Challan reverted to pending." });
    } catch (error) {
      toast({
        title: "Revert failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  // ── Misc helpers ──────────────────────────────────────────────────────────
  const getSuggestedNumber = () => {
    const prefix = "CHN";
    const year = format(new Date(), "yy");
    const count = normalisedSourceChallans.length + 1;
    return `${prefix}${year}-${String(count).padStart(4, "0")}`;
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["challans"] });
    await queryClient.invalidateQueries({ queryKey: ["members"] });
    await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
  };

  const openBulkOperationDashboard = useCallback(
    (challan) => {
      if (!challan?.bulk_group_id) return;
      const params = new URLSearchParams({
        tab: "bulk-operations",
        bulk_group_id: String(challan.bulk_group_id),
      });
      navigate(`${PAGE_PATHS.DASHBOARD}?${params.toString()}`);
    },
    [navigate]
  );

  const getEffectiveProofUrl = useCallback(
    (challan) => {
      if (!challan) return null;
      if (challan.proof_url) return challan.proof_url;
      if (!challan.bulk_group_id) return null;
      return bulkProofByGroup[challan.bulk_group_id] || null;
    },
    [bulkProofByGroup]
  );

  const openProofViewer = useCallback(
    async (challan) => {
      if (!challan) return;

      let proofUrl = getEffectiveProofUrl(challan);
      if (!proofUrl && challan.bulk_group_id) {
        try {
          const details = await charityClient.bulkOperations.get(challan.bulk_group_id);
          const fetchedUrl = details?.proof_url || null;
          if (fetchedUrl) {
            setBulkProofByGroup((prev) => ({
              ...prev,
              [challan.bulk_group_id]: fetchedUrl,
            }));
            proofUrl = fetchedUrl;
          }
        } catch {
          // Ignore fetch failure and fallback to existing challan proof fields.
        }
      }

      if (!proofUrl) {
        toast({
          title: "Proof not found",
          description: "No proof is available for this challan yet.",
          variant: "destructive",
        });
        return;
      }

      setSelectedChallan({
        ...challan,
        proof_url: proofUrl,
      });
      setProofViewOpen(true);
    },
    [getEffectiveProofUrl, toast]
  );

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
        <div className="flex flex-col gap-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search challans..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList className="flex w-max sm:w-full">
                <TabsTrigger value="all" className="flex-1 text-xs sm:text-sm whitespace-nowrap">All</TabsTrigger>
                <TabsTrigger value="generated" className="flex-1 text-xs sm:text-sm whitespace-nowrap">Generated</TabsTrigger>
                <TabsTrigger value="proof_uploaded" className="flex-1 text-xs sm:text-sm whitespace-nowrap">Uploaded</TabsTrigger>
                {isAdmin && <TabsTrigger value="pending" className="flex-1 text-xs sm:text-sm whitespace-nowrap">Pending</TabsTrigger>}
                <TabsTrigger value="approved" className="flex-1 text-xs sm:text-sm whitespace-nowrap">Approved</TabsTrigger>
                <TabsTrigger value="rejected" className="flex-1 text-xs sm:text-sm whitespace-nowrap">Rejected</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <Tabs value={entryFilter} onValueChange={setEntryFilter}>
              <TabsList className="flex w-max sm:w-auto">
                <TabsTrigger value="all" className="text-xs sm:text-sm whitespace-nowrap">All Entries</TabsTrigger>
                <TabsTrigger value="bulk" className="text-xs sm:text-sm whitespace-nowrap">Bulk / Multi Challans</TabsTrigger>
                <TabsTrigger value="individual" className="text-xs sm:text-sm whitespace-nowrap">Individual Challans</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
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
                    const isOwner =
                      myMember &&
                      normalizeId(challan.member_id) === normalizeId(myMember.id);
                    const canMutateBeforeApproval =
                      !challan.is_bulk_group && challan.status !== "approved" && (isAdmin || isOwner);
                    const linkedMember = members.find(
                      (m) => normalizeId(m.id) === normalizeId(challan.member_id)
                    );
                    const popoverMember = linkedMember || {
                      full_name: challan.member_name,
                      member_id: challan.member_id,
                      phone: challan.member_phone || challan.phone,
                      address: challan.member_address || challan.address,
                      avatar_url: challan.member_avatar_url,
                    };
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
                              {challan.is_bulk_group ? `Bulk ${challan.bulk_group_id}` : challan.challan_number}
                            </span>
                          </div>
                        </TableCell>

                        {/* Member */}
                        <TableCell>
                          <UserProfilePopover user={popoverMember}>
                            <div className="leading-tight">
                              <p className="font-medium text-slate-900">
                                {challan.member_name}
                              </p>
                              {challan.member_id && (
                                <p className="text-xs text-slate-500">
                                  {formatMemberId(challan.member_id)}
                                </p>
                              )}
                            </div>
                          </UserProfilePopover>
                        </TableCell>

                        {/* Type */}
                        <TableCell>
                          {challan.type === "monthly" ? (
                            <div className="space-y-1">
                              <Badge variant="outline" className="capitalize">
                                {challan.is_bulk_group ? "Bulk Monthly" : "Monthly"}
                              </Badge>
                              {challan.months_count > 1 && Array.isArray(challan.months_covered) && challan.months_covered.length > 0 ? (
                                <p className="text-xs text-slate-500">
                                  {challan.months_count} months (
                                  {format(
                                    new Date(challan.months_covered[0] + "-01"),
                                    "MMM yy"
                                  )}{" "}
                                  -{" "}
                                  {format(
                                    new Date(challan.months_covered[challan.months_covered.length - 1] + "-01"),
                                    "MMM yy"
                                  )}
                                  )
                                </p>
                              ) : challan.month ? (
                                <p className="text-xs text-slate-500">
                                  {format(new Date(challan.month + "-01"), "MMM yyyy")}
                                </p>
                              ) : null}
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
                          {challan.created_date || challan.approved_at || challan.proof_uploaded_at
                            ? format(
                              new Date(challan.created_date || challan.approved_at || challan.proof_uploaded_at),
                              "MMM d, yyyy"
                            )
                            : "N/A"}
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
                              {(getEffectiveProofUrl(challan) || challan.bulk_group_id) && (
                                <DropdownMenuItem
                                  onClick={() => openProofViewer(challan)}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  {challan.proof_url ? "View Proof" : "View Bulk Proof"}
                                </DropdownMenuItem>
                              )}

                              {isAdmin && challan.bulk_group_id && (
                                <DropdownMenuItem
                                  onClick={() => openBulkOperationDashboard(challan)}
                                >
                                  <Layers className="w-4 h-4 mr-2" />
                                  Open Bulk Operation
                                </DropdownMenuItem>
                              )}

                              {/* Upload / Re-upload Proof */}
                              {!challan.is_bulk_group && (challan.status === "generated" ||
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

                              {/* Edit/Delete before approval (owner + admins) */}
                              {canMutateBeforeApproval && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => openEditDialog(challan)}
                                  >
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Edit Challan
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setDeleteTarget(challan)}
                                    className="text-rose-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Challan
                                  </DropdownMenuItem>
                                </>
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

                              {/* Admin: Revert / Reject approved challan */}
                              {isAdmin && !challan.is_bulk_group && challan.status === "approved" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleRevert(challan)}
                                    className="text-amber-600"
                                  >
                                    <Undo2 className="w-4 h-4 mr-2" />
                                    Revert to Pending
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedChallan(challan);
                                      setRejectOpen(true);
                                    }}
                                    className="text-rose-600"
                                  >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Reject
                                  </DropdownMenuItem>
                                </>
                              )}

                              {/* Admin: Revert rejected challan */}
                              {isAdmin && !challan.is_bulk_group && challan.status === "rejected" && (
                                <DropdownMenuItem
                                  onClick={() => handleRevert(challan)}
                                  className="text-amber-600"
                                >
                                  <Undo2 className="w-4 h-4 mr-2" />
                                  Revert to Pending
                                </DropdownMenuItem>
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

        {!isLoading && totalItems > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-slate-500">
              Showing {totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1}
              -{Math.min(safeCurrentPage * pageSize, totalItems)} of {totalItems} challans
            </p>

            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-500" htmlFor="challans-page-size">
                Rows:
              </label>
              <select
                id="challans-page-size"
                className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>

              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
              >
                Previous
              </Button>

              <span className="text-sm text-slate-600 min-w-[92px] text-center">
                Page {safeCurrentPage} of {totalPages}
              </span>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={safeCurrentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Challan Form */}
        <ChallanForm
          open={formOpen}
          onOpenChange={setFormOpen}
          onSubmit={createMutation.mutateAsync}
          members={membersForForm}
          campaigns={campaigns}
          existingChallans={normalisedSourceChallans}
          suggestedNumber={getSuggestedNumber()}
          currentUser={user}
        />

        {/* Edit Challan */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Challan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {editChallan?.type === "monthly" && isAdmin && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Month</label>
                  <Input
                    type="month"
                    value={editData.month}
                    onChange={(e) =>
                      setEditData((prev) => ({ ...prev, month: e.target.value }))
                    }
                  />
                </div>
              )}
              {isAdmin && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Amount (INR)</label>
                  <Input
                    type="number"
                    min={1}
                    value={editData.amount}
                    onChange={(e) =>
                      setEditData((prev) => ({ ...prev, amount: e.target.value }))
                    }
                  />
                </div>
              )}
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitEdit}
                  disabled={
                    updateMutation.isPending ||
                    (isAdmin && !editData.amount) ||
                    (isAdmin && editChallan?.type === "monthly" && !editData.month)
                  }
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Challan Confirmation */}
        <AlertDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Challan</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete challan {deleteTarget?.challan_number}. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600"
                disabled={deleteMutation.isPending}
                onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
              >
                {deleteMutation.isPending ? "Deleting..." : "Yes, Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
        <Dialog
          open={rejectOpen}
          onOpenChange={(open) => {
            if (!open) setRejectReason("");
            setRejectOpen(open);
          }}
        >
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
                  onClick={() => {
                    setRejectReason("");
                    setRejectOpen(false);
                  }}
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


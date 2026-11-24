import React, { useState, useEffect, useCallback, useMemo } from "react";
import { isAdminRole, isStaffRole } from "@/lib/roles";
import DoneBy, { doneByText } from "@/components/common/DoneBy";
import { formatMemberId } from "@/lib/utils";
import { charityClient } from "@/api/charityClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { emitNotificationsChanged } from "@/lib/notificationState";
import { useSearchParams } from "react-router-dom";
import { useDeepLink } from "@/lib/useDeepLink";
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
  History,
} from "lucide-react";
import { format } from "@/lib/dateTime";
import { formatBusinessDate } from "@/lib/businessTime";
import ChallanForm from "@/components/challans/ChallanForm";
import BulkGroupDialog from "@/components/dashboard/BulkGroupDialog";
import MemberChallansView from "@/components/challans/MemberChallansView";
import NewPaymentWizard from "@/components/challans/NewPaymentWizard";
import ProofUpload from "@/components/challans/ProofUpload";
import PayTogetherDialog from "@/components/challans/PayTogetherDialog";
import ApprovePaymentDialog, { toApprovalPayment } from "@/components/challans/ApprovePaymentDialog";
import ReceiptDialog from "@/components/challans/ReceiptDialog";
import MoveBackDialog from "@/components/challans/MoveBackDialog";
import PaymentHistoryDialog from "@/components/challans/PaymentHistoryDialog";
import MadeTogetherDialog, { madeTogetherKey } from "@/components/challans/MadeTogetherDialog";
import { useT } from "@/lib/appLanguage";
import PaymentStartedDialog from "@/components/challans/PaymentStartedDialog";
import { formatMonth } from "@/lib/challanStatus";
import PullToRefresh from "@/components/mobile/PullToRefresh";
import { isNotPaidYet } from "@/lib/challanStatus";
import UserProfilePopover from "@/components/UserProfilePopover";
import { useToast } from "@/components/ui/use-toast";
import { saveBulkGroup, loadBulkGroups, updateBulkGroupStatus } from "@/lib/bulkGroupStore";

// "Sep 2026" or "Sep 2026 – Nov 2026" for a list of yyyy-MM months.
function monthRange(months = []) {
  const list = [...months].filter(Boolean).sort();
  if (!list.length) return "";
  return list.length === 1 ? formatMonth(list[0]) : `${formatMonth(list[0])} – ${formatMonth(list[list.length - 1])}`;
}

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
  if (isNotPaidYet(challan)) {
    return { label: "Not paid yet", color: "bg-slate-100 text-slate-700", icon: FileText };
  }
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
const MIN_REASON_LENGTH = 10;
const OWN_PAYMENT_LABEL = "Your payment — another admin will review";
const OWN_APPROVAL_TOOLTIP = "A different admin must reverse your approval";
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
const CHALLAN_DEEP_LINK_PARAMS = ["challan", "bulk"];

export default function Challans() {
  // ── UI state ──────────────────────────────────────────────────────────────
  const [linkParams, setLinkParams] = useSearchParams();
  const { t: tr } = useT();
  // Shown after a payment is saved: its real number, amount and "Upload proof now".
  const [startedInfo, setStartedInfo] = useState(null);
  // Several open months paid with one proof.
  const [together, setTogether] = useState(null); // { candidates, initialIds }
  const [approvalPayment, setApprovalPayment] = useState(null); // the bank check screen
  const [receiptFor, setReceiptFor] = useState(null); // { challanId } or { bulkGroupId }
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(() => (linkParams.get("status") === "pending" ? "pending" : "all"));
  const [entryFilter, setEntryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  // The member the challan form opens with (an admin's own payment from "New payment").
  const [formPreset, setFormPreset] = useState(null);
  // Admins: one "New payment" button, then a choice between the two kinds.
  const [newPaymentOpen, setNewPaymentOpen] = useState(false);
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
  const [revertTarget, setRevertTarget] = useState(null);
  const [revertReason, setRevertReason] = useState("");
  const [historyFor, setHistoryFor] = useState(null); // { id } or { bulkGroupId }
  const [madeTogetherAction, setMadeTogetherAction] = useState(null); // { kind: "join"|"cancel", rows }
  // Tracks which challan is mid-approve to show inline spinner & block double-tap
  const [approvingId, setApprovingId] = useState(null);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    charityClient.auth.me().then(setUser).catch(() => { });
  }, []);

  // FIX: isAdmin moved here — BEFORE createMutation — so the mutation closure
  // captures the correct value. In the original it was defined ~40 lines later,
  // meaning isAdmin was always undefined inside the mutation.
  // isAdmin = may see and help with everyone's payments (admins and executives);
  // canDecide = may approve, reject, revert or edit amounts (admins only).
  const isAdmin = isStaffRole(user);
  const canDecide = isAdminRole(user);

  // ── Debounced search ──────────────────────────────────────────────────────
  // Only included in the query key (and sent to the API) after the user
  // stops typing for 400 ms, preventing one request per keystroke.
  const debouncedSearch = useDebounce(search, 400);

  // ── Supporting data ───────────────────────────────────────────────────────
  // Admins can list all members; regular members cannot — they get 403 or []
  // from the members list endpoint. Fetch own profile via /members/me instead.
  // The server returns 20 members unless asked for more; the page needs all of them
  // to show names and fees for any member.
  const { data: members = [] } = useQuery({
    queryKey: ["members", "all"],
    queryFn: () => charityClient.members.list({ limit: 500 }),
    enabled: !!user && isAdmin,
  });

  // Everyone's own member record (admins have one too).
  const { data: myMemberFromApi } = useQuery({
    queryKey: ["members", "me"],
    queryFn: () => charityClient.members.me(),
    enabled: !!user,
    retry: false,
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => charityClient.campaigns.list(),
    enabled: !!user,
  });

  // The member record linked to the logged-in user.
  // Used to scope the challans API call for non-admin users.
  const myMember = myMemberFromApi
    // Fallback only by the login's own account (never by a blank email: an admin without an
    // email or member record would otherwise "be" the first member without an email).
    ?? (isAdmin && user?.id != null ? members.find((m) => m.user_id != null && String(m.user_id) === String(user.id)) : null)
    ?? null;

  // Members array passed to ChallanForm:
  // - Admins: full list (for member picker)
  // - Members: single-item array so ChallanForm can resolve the name
  const membersForForm = isAdmin ? members : (myMember ? [myMember] : []);

  // Separation of duties: an admin never reviews their own payments.
  const isOwnRecord = useCallback(
    (item) => {
      if (!isAdmin || !user || !item) return false;
      if (item.member_user_id != null) {
        return Number(item.member_user_id) === Number(user.id);
      }
      return !!myMember && normalizeId(item.member_id) === normalizeId(myMember.id);
    },
    [isAdmin, user, myMember]
  );
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
        `Member ${formatMemberId(challan.member_code || linkedMember?.member_code || "")}`,
      // The member ID people know (MEM-0042); member_id is only the database number.
      member_code: challan.member_code || linkedMember?.member_code || null,
      amount: parseAmount(challan.amount),
    };
  });

  const groupedChallans = useMemo(() => {
    // ── Build challan-ID → bulk-group map ────────────────────────────────────
    // Each row from /challans/ carries bulk_group_id, which is enough to group
    // on any device. The saved group details (localStorage, admin review list)
    // only add extras such as the shared proof link.
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
      const serverGroupId = challan.bulk_group_id ? String(challan.bulk_group_id) : null;
      const meta = serverGroupId
        ? allGroupMeta.get(serverGroupId) || { bulk_group_id: serverGroupId }
        : challanIdToGroup.get(Number(challan.id));

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
        challan_number: first.challan_no || (/^BCH-/i.test(groupId) ? groupId : `BULK-${groupId.slice(0, 8).toUpperCase()}`),
        member_name:
          meta.member_name || first.member_name || `Member ${formatMemberId(first.member_code || "")}`,
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

  // "Not paid yet" months one admin made for one member at the same moment (e.g. 36 separate
  // challans by mistake): offered as "Join into one payment" / "Cancel all" (undo).
  const madeTogether = useMemo(() => {
    const map = new Map();
    normalisedSourceChallans.forEach((c) => {
      const key = madeTogetherKey(c);
      if (key) map.set(key, [...(map.get(key) || []), c]);
    });
    return map;
  }, [normalisedSourceChallans]);

  const filteredGroupedChallans = useMemo(() => {
    let entries = groupedChallans;
    // Own payments are reviewed by another admin, so keep them out of the review queue.
    if (isAdmin && statusFilter === "pending") {
      entries = entries.filter((entry) => !isOwnRecord(entry));
    }
    if (sourceFilter === "admin") {
      entries = entries.filter((entry) => entry.entry_source === "admin");
    } else if (sourceFilter === "member") {
      entries = entries.filter((entry) => entry.entry_source !== "admin");
    }
    if (entryFilter === "bulk") {
      return entries.filter((entry) => entry.is_bulk_group);
    }
    if (entryFilter === "individual") {
      return entries.filter((entry) => !entry.is_bulk_group);
    }
    return entries;
  }, [groupedChallans, entryFilter, sourceFilter, isAdmin, statusFilter, isOwnRecord]);

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
  }, [statusFilter, debouncedSearch, pageSize, entryFilter, sourceFilter]);

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

          setStartedInfo({
            numbers: [result?.challan_no || result?.bulk_group_id],
            what: `${monthRange(months)} · ${months.length} months`,
            amount: result?.total_amount ?? amountPerMonth * months.length,
            sent: true,
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

        const together = proofMode === "shared_later";
        const created = await charityClient.challans.createMonths({
          months,
          member_id: isAdmin ? payload?.member_id : undefined,
          payment_method: payload?.payment_method,
          notes: payload?.notes,
          sameNumber: together,
        });
        const ids = created?.challan_ids || [];
        setStartedInfo({
          numbers: created?.challan_numbers || [],
          what: `${monthRange(months)} · ${months.length} months`,
          amount: created?.total_amount ?? amountPerMonth * months.length,
          sent: false,
          note: together
            ? "One payment for all these months. Upload one proof for all of them."
            : "Each month has its own number. Upload the proof on each month in the list.",
          uploadLabel: "Upload one proof now",
          upload: together && ids.length > 1
            ? { kind: "together", candidates: ids.map((id, i) => ({ id, month: months[i], amount: amountPerMonth })) }
            : null,
        });

        return {
          created_challans: created?.created_count ?? months.length,
          mode: "individual",
        };
      }

      // Single payment: create the challan, then attach the proof if one was chosen.
      const { proof_file: proofFile, shared_proof_file: _shared, ...createData } = payload;
      const created = await charityClient.challans.create(createData);
      const campaignTitle = payload?.campaign_name;
      const startedWhat = payload?.type === "monthly"
        ? `Monthly fee · ${formatMonth(payload?.month)}`
        : `Donation${campaignTitle ? ` · ${campaignTitle}` : ""}`;
      if (!proofFile) {
        setStartedInfo({
          numbers: [created?.challan_number],
          what: startedWhat,
          amount: created?.amount ?? payload?.amount,
          sent: false,
          upload: { kind: "single", challan: created },
        });
        return created;
      }
      try {
        const submitted = await charityClient.challans.uploadProof(created.id, proofFile);
        setStartedInfo({ numbers: [created?.challan_number], what: startedWhat, amount: created?.amount ?? payload?.amount, sent: true });
        return submitted;
      } catch (error) {
        // The challan exists; only the proof failed, so it can be uploaded from the list.
        toast({
          title: "Challan generated, proof not uploaded",
          description: `${error?.message || "The upload failed."} Use Upload Proof on the challan to try again.`,
          variant: "destructive",
        });
        return created;
      }
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

    if (canDecide) {
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
  // Approving opens the bank check screen (date, reference, amount received).
  const handleApprove = (challan) => {
    if (approvingId) return;
    setApprovalPayment(toApprovalPayment(challan));
  };

  // ── Reject ────────────────────────────────────────────────────────────────
  // FIX: try/catch added — original silently dropped errors.
  const handleReject = async () => {
    if (!selectedChallan) return;
    const reason = rejectReason.trim();
    if (reason.length < MIN_REASON_LENGTH) return;
    try {
      if (selectedChallan.is_bulk_group && selectedChallan.bulk_group_id) {
        await charityClient.bulkOperations.reject(selectedChallan.bulk_group_id, {
          reason,
          action: "reject",
        });
        updateBulkGroupStatus(selectedChallan.bulk_group_id, 'rejected');

        await refreshChallanData();
        setRejectReason("");
        setRejectOpen(false);
        emitNotificationsChanged('updated');
        toast({ title: "Bulk challan rejected." });
        return;
      }

      await charityClient.challans.reject(selectedChallan.id, {
        rejection_reason: reason,
      });

      await refreshChallanData();
      setRejectReason("");
      setRejectOpen(false);
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
  const handleRevert = async (picked) => {
    if (!revertTarget) return;
    const reason = String(picked ?? revertReason).trim();
    if (reason.length < MIN_REASON_LENGTH) return;
    try {
      if (revertTarget.is_bulk_group && revertTarget.bulk_group_id) {
        await charityClient.bulkOperations.revert(revertTarget.bulk_group_id, { reason });
        updateBulkGroupStatus(revertTarget.bulk_group_id, 'pending_approval');
      } else {
        await charityClient.challans.revert(revertTarget.id, { reason });
      }

      await refreshChallanData();
      setRevertTarget(null);
      setRevertReason("");
      emitNotificationsChanged('updated');
      toast({ title: "Moved back for checking", description: "Another admin must approve it again." });
    } catch (error) {
      toast({
        title: "Could not move it back",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  // ── Misc helpers ──────────────────────────────────────────────────────────

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["challans"] });
    await queryClient.invalidateQueries({ queryKey: ["members"] });
    await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
  };

  // Bulk payment details open here, so the admin stays on the Challans list.
  const [bulkDialogId, setBulkDialogId] = useState(null);
  const openBulkOperation = useCallback((challan) => {
    if (challan?.bulk_group_id) setBulkDialogId(String(challan.bulk_group_id));
  }, []);

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

      let proofUrl = null;
      try {
        const link = await charityClient.files.proofLink(
          challan.bulk_group_id ? { bulkGroupId: challan.bulk_group_id } : { challanId: challan.id },
        );
        proofUrl = link?.url || null;
      } catch {
        proofUrl = getEffectiveProofUrl(challan);
      }
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
  useDeepLink({
    params: CHALLAN_DEEP_LINK_PARAMS,
    ready: !isLoading,
    onFound: (param, value) => {
      if (param !== "challan") return;
      const match = challanItems.find((item) => String(item.id) === value);
      if (match) setSelectedChallan(match);
    },
  });

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6">

        {isAdmin && (
          <BulkGroupDialog
            bulkGroupId={bulkDialogId}
            open={Boolean(bulkDialogId)}
            onOpenChange={(open) => { if (!open) setBulkDialogId(null); }}
          />
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isAdmin ? "Challans" : tr("My payments")}
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              {canDecide ? "Manage payment challans and approvals" : isAdmin ? "Follow up members' payments: create payments, upload proof, record cash" : tr("What you owe, and what you have paid")}
            </p>
          </div>
          {/* Members have "Pay now" in the summary box below. */}
          {isAdmin && (
            <Button
              onClick={() => setNewPaymentOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 select-none"
            >
              <Plus className="w-4 h-4 mr-2" />
              New payment
            </Button>
          )}
        </div>

        {isAdmin && (
          <NewPaymentWizard
            open={newPaymentOpen}
            onOpenChange={setNewPaymentOpen}
            currentUser={user}
            ownMember={myMember}
            onOwnSubmit={createMutation.mutateAsync}
            onPayLater={() => { setFormPreset(null); setFormOpen(true); }}
            onRecorded={() => {
              refreshChallanData();
              emitNotificationsChanged("updated");
            }}
          />
        )}

        {!isAdmin ? (
          <MemberChallansView
            entries={groupedChallans}
            isLoading={isLoading}
            myMember={myMember}
            onPay={() => setFormOpen(true)}
            onUpload={(challan) => { setSelectedChallan(challan); setUploadOpen(true); }}
            onViewProof={openProofViewer}
            onDelete={setDeleteTarget}
            getProofUrl={getEffectiveProofUrl}
            onPayTogether={(candidates, initialIds) => setTogether({ candidates, initialIds })}
            onReceipt={(c) => setReceiptFor(c.is_bulk_group && c.bulk_group_id ? { bulkGroupId: c.bulk_group_id } : { challanId: c.id })}
          />
        ) : (
        <>
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
          {isAdmin && (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <Tabs value={sourceFilter} onValueChange={setSourceFilter}>
                <TabsList className="flex w-max sm:w-auto">
                  <TabsTrigger value="all" className="text-xs sm:text-sm whitespace-nowrap">All Sources</TabsTrigger>
                  <TabsTrigger value="member" className="text-xs sm:text-sm whitespace-nowrap">Member</TabsTrigger>
                  <TabsTrigger value="admin" className="text-xs sm:text-sm whitespace-nowrap">Admin-entered</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}
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
                    const isOwnPayment = isOwnRecord(challan);
                    const approvedByMe =
                      challan.status === "approved" &&
                      challan.approved_by_admin_id != null &&
                      Number(challan.approved_by_admin_id) === Number(user?.id);
                    const isAdminEntered = challan.entry_source === "admin";
                    const verifyBlockedReason =
                      isAdminEntered && Number(challan.created_by_user_id) === Number(user?.id)
                        ? "You entered this payment — another admin must verify it"
                        : isAdminEntered &&
                            String(challan.payment_method || "").toLowerCase() === "cash" &&
                            Number(challan.collected_by_user_id) === Number(user?.id)
                          ? "You collected this cash — another admin must verify it"
                          : null;
                    const canMutateBeforeApproval =
                      !challan.is_bulk_group && challan.status !== "approved" && (canDecide || isOwner) && !isOwnPayment;
                    // An executive may remove a payment they made for a member by mistake (not yet approved).
                    const canDeleteOwnEntry = !canDecide && isAdmin && !isOwner && !challan.is_bulk_group &&
                      challan.status !== "approved" && Number(challan.created_by_user_id) === Number(user?.id);
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
                        data-deeplink={challan.is_bulk_group ? `bulk-${challan.bulk_group_id}` : `challan-${challan.id}`}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        {/* Challan # */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-slate-400" />
                            <span className="font-medium">
                              {challan.is_bulk_group ? `${challan.challan_no ? `${challan.challan_no} · ` : ""}Bulk ${challan.bulk_group_id}` : challan.challan_number}
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
                              {challan.member_code && (
                                <p className="text-xs text-slate-500">
                                  {formatMemberId(challan.member_code)}
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
                            ? formatBusinessDate(
                              challan.created_date || challan.approved_at || challan.proof_uploaded_at,
                              { month: "short", day: "numeric", year: "numeric" }
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
                            {challan.status === "approved" && (
                              <DoneBy verb="Approved" by={challan.approved_by_name} at={challan.approved_at} />
                            )}
                            {challan.status === "rejected" && (
                              <DoneBy verb="Rejected" by={challan.rejected_by_name} at={challan.rejected_at} />
                            )}
                            {challan.proof_uploaded_by_name && (
                              <DoneBy verb="Proof uploaded" by={challan.proof_uploaded_by_name} at={challan.proof_uploaded_at} />
                            )}
                            {challan.reversed_by_name && (
                              <p className="text-xs text-amber-700">
                                {doneByText("Reversed", challan.reversed_by_name, challan.reversed_at)}
                                {isAdmin && challan.reversal_reason ? `: ${challan.reversal_reason}` : ""}
                              </p>
                            )}
                            {challan.reversed_at && (
                              <button
                                type="button"
                                className="text-xs font-medium text-sky-700 underline underline-offset-2"
                                onClick={() => setHistoryFor(challan.is_bulk_group && challan.bulk_group_id
                                  ? { bulkGroupId: challan.bulk_group_id } : { id: challan.id })}
                              >
                                See history
                              </button>
                            )}
                            {isOwnPayment && (
                              <p className="text-xs text-slate-500 italic">{OWN_PAYMENT_LABEL}</p>
                            )}
                            {isAdminEntered && (
                              <div className="mt-1 space-y-0.5">
                                <Badge variant="outline" className="text-[11px]">
                                  {doneByText("Entered", challan.created_by_name || "admin", challan.created_at)}
                                </Badge>
                                <p className="text-xs text-slate-500">
                                  {String(challan.payment_method || "").replace("_", " ")}
                                  {challan.transaction_ref ? ` · Ref ${challan.transaction_ref}` : ""}
                                  {challan.collected_by_name ? ` · Collected by ${challan.collected_by_name}` : ""}
                                  {challan.received_on ? ` · Received ${formatBusinessDate(challan.received_on)}` : ""}
                                </p>
                              </div>
                            )}
                            {challan.entry_notes && (
                              <p className="mt-1 max-w-xs rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900 break-words" title={challan.entry_notes}>
                                <span className="font-semibold">Note:</span> {challan.entry_notes}
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

                              {challan.status === "approved" && (
                                <DropdownMenuItem
                                  onClick={() => setReceiptFor(challan.bulk_group_id ? { bulkGroupId: challan.bulk_group_id } : { challanId: challan.id })}
                                >
                                  <Receipt className="w-4 h-4 mr-2" />
                                  Receipt (download / WhatsApp)
                                </DropdownMenuItem>
                              )}

                              {isAdmin && challan.bulk_group_id && (
                                <DropdownMenuItem
                                  onClick={() => openBulkOperation(challan)}
                                >
                                  <Layers className="w-4 h-4 mr-2" />
                                  Bulk payment details
                                </DropdownMenuItem>
                              )}

                              {/* Upload / Re-upload Proof */}
                              {!challan.is_bulk_group && (challan.status === "generated" ||
                                challan.status === "rejected" || isNotPaidYet(challan)) &&
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

                              {canDeleteOwnEntry && (
                                <DropdownMenuItem onClick={() => setDeleteTarget(challan)} className="text-rose-600">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete (entered by mistake)
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
                              {canDecide && !isOwnPayment &&
                                (challan.status === "proof_uploaded" ||
                                  challan.status === "pending") && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => handleApprove(challan)}
                                      className="text-emerald-600"
                                      disabled={!!approvingId || !!verifyBlockedReason}
                                      title={verifyBlockedReason || undefined}
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
                              {canDecide && !isOwnPayment && !challan.is_bulk_group && challan.status === "approved" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setRevertTarget(challan);
                                      setRevertReason("");
                                    }}
                                    className="text-amber-600"
                                    disabled={approvedByMe}
                                    title={approvedByMe ? OWN_APPROVAL_TOOLTIP : undefined}
                                  >
                                    <Undo2 className="w-4 h-4 mr-2" />
                                    Move back for checking
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedChallan(challan);
                                      setRejectOpen(true);
                                    }}
                                    className="text-rose-600"
                                    disabled={approvedByMe}
                                    title={approvedByMe ? OWN_APPROVAL_TOOLTIP : undefined}
                                  >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Reject
                                  </DropdownMenuItem>
                                </>
                              )}

                              {/* Admin: move back an approved bulk payment (several months, one proof) as a whole */}
                              {canDecide && !isOwnPayment && challan.is_bulk_group && challan.bulk_group_id && challan.status === "approved" && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setRevertTarget(challan);
                                    setRevertReason("");
                                  }}
                                  className="text-amber-600"
                                  disabled={approvedByMe}
                                  title={approvedByMe ? OWN_APPROVAL_TOOLTIP : undefined}
                                >
                                  <Undo2 className="w-4 h-4 mr-2" />
                                  Move back for checking (all months)
                                </DropdownMenuItem>
                              )}

                              {/* Admin: Revert rejected challan */}
                              {canDecide && !isOwnPayment && !challan.is_bulk_group && challan.status === "rejected" && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setRevertTarget(challan);
                                    setRevertReason("");
                                  }}
                                  className="text-amber-600"
                                >
                                  <Undo2 className="w-4 h-4 mr-2" />
                                  Send back for checking
                                </DropdownMenuItem>
                              )}

                              {(() => {
                                const batch = Number(challan.created_by_user_id) === Number(user?.id)
                                  ? madeTogether.get(madeTogetherKey(challan)) || [] : [];
                                if (!canDecide || batch.length < 2) return null;
                                const joined = new Set(batch.map((r) => r.challan_no || r.id)).size === 1;
                                return (
                                  <>
                                    {!joined && (
                                      <DropdownMenuItem onClick={() => setMadeTogetherAction({ kind: "join", rows: batch })} className="text-emerald-700">
                                        <Layers className="w-4 h-4 mr-2" />
                                        Join the {batch.length} months made together into one payment
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => setMadeTogetherAction({ kind: "cancel", rows: batch })} className="text-rose-600">
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Cancel all {batch.length} made together
                                    </DropdownMenuItem>
                                  </>
                                );
                              })()}

                              {(challan.id || challan.bulk_group_id) && (
                                <DropdownMenuItem
                                  onClick={() => setHistoryFor(challan.is_bulk_group && challan.bulk_group_id
                                    ? { bulkGroupId: challan.bulk_group_id } : { id: challan.id })}
                                >
                                  <History className="w-4 h-4 mr-2" />
                                  History
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
        </>
        )}

        {/* Challan Form */}
        <ChallanForm
          open={formOpen}
          onOpenChange={(v) => { setFormOpen(v); if (!v) setFormPreset(null); }}
          presetMember={formPreset}
          onSubmit={createMutation.mutateAsync}
          members={membersForForm}
          campaigns={campaigns}
          existingChallans={normalisedSourceChallans}
          currentUser={user}
          onOpenStarted={() => {
            setFormOpen(false);
            setLinkParams((prev) => { const next = new URLSearchParams(prev); next.set("unfinished", "1"); return next; });
          }}
        />

        <PaymentStartedDialog
          info={startedInfo}
          onOpenChange={(open) => { if (!open) setStartedInfo(null); }}
          onUploadNow={startedInfo?.upload ? () => {
            const up = startedInfo.upload;
            setStartedInfo(null);
            if (up.kind === "single") { setSelectedChallan(up.challan); setUploadOpen(true); }
            else setTogether({ candidates: up.candidates, initialIds: up.candidates.map((c) => c.id) });
          } : undefined}
        />

        <ApprovePaymentDialog
          payment={approvalPayment}
          onOpenChange={(open) => { if (!open) setApprovalPayment(null); }}
          onApproved={async (_, payment) => {
            if (payment.kind === "bulk" && payment.bulkGroupId) updateBulkGroupStatus(payment.bulkGroupId, "approved");
            await refreshChallanData();
            emitNotificationsChanged("updated");
          }}
        />

        <ReceiptDialog target={receiptFor} onOpenChange={(open) => { if (!open) setReceiptFor(null); }} isAdmin={isAdmin} />

        <PayTogetherDialog
          open={Boolean(together)}
          onOpenChange={(open) => { if (!open) setTogether(null); }}
          candidates={together?.candidates || []}
          initialIds={together?.initialIds || []}
          onDone={() => { invalidateAll(); emitNotificationsChanged("updated"); }}
        />

        {/* Edit Challan */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Challan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {editChallan?.type === "monthly" && canDecide && (
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
              {canDecide && (
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
                    (canDecide && !editData.amount) ||
                    (canDecide && editChallan?.type === "monthly" && !editData.month)
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
                placeholder="Enter rejection reason (min 10 characters)..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
              <p className={`text-xs ${rejectReason.trim().length < MIN_REASON_LENGTH ? "text-rose-600" : "text-slate-500"}`}>
                {rejectReason.trim().length}/{MIN_REASON_LENGTH} characters minimum
              </p>
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
                  disabled={rejectReason.trim().length < MIN_REASON_LENGTH}
                >
                  Reject
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Move back for checking */}
        <MoveBackDialog
          open={!!revertTarget}
          onOpenChange={(open) => {
            if (!open) {
              setRevertTarget(null);
              setRevertReason("");
            }
          }}
          minLength={MIN_REASON_LENGTH}
          wasApproved={revertTarget?.status === "approved"}
          label={revertTarget ? [revertTarget.challan_no || revertTarget.challan_number, revertTarget.member_name].filter(Boolean).join(" · ") : ""}
          onConfirm={handleRevert}
        />
        <PaymentHistoryDialog target={historyFor} onOpenChange={(open) => { if (!open) setHistoryFor(null); }} />
        <MadeTogetherDialog
          action={madeTogetherAction}
          onOpenChange={(open) => { if (!open) setMadeTogetherAction(null); }}
          onDone={() => { refreshChallanData(); emitNotificationsChanged("updated"); }}
        />

      </div>
    </PullToRefresh>
  );
}


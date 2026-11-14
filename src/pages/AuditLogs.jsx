import React, { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { charityClient } from "@/api/charityClient";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { ChevronDown, ChevronRight, Download, Loader2, Search, Shield, X } from "lucide-react";
import { format } from "@/lib/dateTime";

/*
 * Who did what, newest first. Filters, paging and names come from the server
 * (GET /audit-logs/feed and /audit-logs/filters), so nothing is cut off at the first 1000.
 */

// action -> [filter label, phrase used in the sentence]
const ACTIONS = {
  app_settings_update: ["Settings changed", "changed the app settings"],
  app_settings_reset: ["Settings reset", "reset the app settings"],
  bulk_create: ["Bulk payment entered", "entered a bulk payment"],
  bulk_approve: ["Bulk payment approved", "approved a bulk payment"],
  bulk_reject: ["Bulk payment rejected", "rejected a bulk payment"],
  bulk_revert: ["Bulk payment reverted", "reverted a bulk payment"],
  campaign_create: ["Campaign created", "created a campaign"],
  campaign_update: ["Campaign updated", "updated a campaign"],
  campaign_delete: ["Campaign deleted", "deleted a campaign"],
  campaign_donation_create: ["Donation recorded", "recorded a donation"],
  campaign_payments_import: ["Campaign payments imported", "imported campaign payments"],
  challan_create: ["Payment created", "created a payment"],
  multi_challan_create: ["Payments for several months", "created payments for several months"],
  challan_admin_record: ["Money received recorded", "recorded money received"],
  challan_update: ["Payment updated", "updated a payment"],
  challan_approve: ["Payment approved", "approved a payment"],
  challan_reject: ["Payment rejected", "rejected a payment"],
  challan_revert: ["Payment reverted", "reverted a payment"],
  challan_delete: ["Payment deleted", "deleted a payment"],
  challan_history_import: ["Payment history imported", "imported payment history"],
  fund_utilization_create: ["Fund use added", "added a fund use"],
  fund_utilization_update: ["Fund use updated", "updated a fund use"],
  fund_utilization_approve: ["Fund use approved", "approved a fund use"],
  fund_utilization_reject: ["Fund use rejected", "rejected a fund use"],
  fund_utilization_revert: ["Fund use reverted", "reverted a fund use"],
  fund_utilization_delete: ["Fund use deleted", "deleted a fund use"],
  invite_create: ["Invite created", "created an invite"],
  invite_update: ["Invite updated", "updated an invite"],
  invite_delete: ["Invite deleted", "deleted an invite"],
  member_create: ["Member added", "added a member"],
  member_update: ["Member updated", "updated a member"],
  member_delete: ["Member deleted", "deleted a member"],
  member_location_update: ["Location updated", "updated where they live"],
  member_status_changed: ["Member status changed", "changed a member's status"],
  members_import: ["Members imported", "imported members"],
  member_activation_approved: ["Activation approved", "approved an account activation"],
  member_activation_rejected: ["Activation rejected", "rejected an account activation"],
  notification_create: ["Announcement sent", "sent an announcement"],
  notification_update: ["Notification updated", "updated a notification"],
  notification_delete: ["Notification deleted", "deleted a notification"],
  notification_delete_batch: ["Announcement deleted", "deleted an announcement"],
  notification_test_push: ["Test push sent", "sent a test push"],
  password_reset_approve: ["Password reset approved", "approved a password reset"],
  password_reset_reject: ["Password reset rejected", "rejected a password reset"],
  password_reset_complete: ["Password reset completed", "completed a password reset"],
  request_approved: ["Request approved", "approved a request"],
  request_rejected: ["Request rejected", "rejected a request"],
  request_deleted: ["Request deleted", "deleted a request"],
  report_generated: ["Report generated", "generated a report"],
  system_wipe: ["System wiped", "wiped the system data"],
  user_update: ["User updated", "updated a user account"],
  edit: ["Edited", "edited"],
  delete: ["Deleted", "deleted"],
  // older spellings
  member_created: ["Member added", "added a member"],
  member_updated: ["Member updated", "updated a member"],
  member_deleted: ["Member deleted", "deleted a member"],
  campaign_created: ["Campaign created", "created a campaign"],
  campaign_updated: ["Campaign updated", "updated a campaign"],
  campaign_deleted: ["Campaign deleted", "deleted a campaign"],
  challan_approved: ["Payment approved", "approved a payment"],
  challan_rejected: ["Payment rejected", "rejected a payment"],
  challan_reverted: ["Payment reverted", "reverted a payment"],
};

const humanize = (value = "") =>
  String(value || "").replace(/_/g, " ").replace(/\s+/g, " ").trim().replace(/^\w/, (c) => c.toUpperCase());

const actionLabel = (action) => ACTIONS[action]?.[0] || humanize(action) || "Action";
const actionPhrase = (action) => ACTIONS[action]?.[1] || humanize(action).toLowerCase();

const tone = (action = "") => {
  if (/(delete|wipe|reject)/.test(action)) return "bg-rose-50 text-rose-700 ring-rose-200";
  if (/(approve|complete)/.test(action)) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (/(revert|reset)/.test(action)) return "bg-amber-50 text-amber-700 ring-amber-200";
  if (/(create|import|record|add)/.test(action)) return "bg-sky-50 text-sky-700 ring-sky-200";
  return "bg-slate-50 text-slate-700 ring-slate-200";
};

const ROLE_STYLE = {
  superadmin: "bg-purple-100 text-purple-700",
  admin: "bg-blue-100 text-blue-700",
  member: "bg-slate-100 text-slate-600",
};

const AREA_LABEL = {
  members: "Members", payments: "Payments", bulk: "Bulk payments", requests: "Requests", campaigns: "Campaigns",
  funds: "Fund use", notifications: "Notifications", reports: "Reports", settings: "Settings", other: "Other",
};

const FIELD_LABEL = {
  monthly_amount: "Monthly amount", full_name: "Full name", member_code: "Member ID", join_date: "Join date",
  whatsapp_phone: "WhatsApp", is_active: "Active", rejection_reason: "Rejection reason", admin_notes: "Admin notes",
  requested_amount: "Requested amount", amount_per_month: "Amount per month", total_amount: "Total",
  months_list: "Months", payment_method: "Payment method", reversal_reason: "Reason", member_id: "Member",
  request_type: "Request type", target_type: "Sent to", avatar_url: "Photo",
};

const DATE_PRESETS = [
  ["all", "All time"], ["today", "Today"], ["7d", "Last 7 days"], ["30d", "Last 30 days"], ["month", "This month"],
  ["custom", "Custom dates"],
];

const DAY_MS = 24 * 60 * 60 * 1000;
const istDay = (date) => format(date, "yyyy-MM-dd");

function presetRange(preset, from, to) {
  const now = new Date();
  switch (preset) {
    case "today": return [istDay(now), istDay(now)];
    case "7d": return [istDay(new Date(now - 6 * DAY_MS)), istDay(now)];
    case "30d": return [istDay(new Date(now - 29 * DAY_MS)), istDay(now)];
    case "month": return [`${format(now, "yyyy-MM")}-01`, istDay(now)];
    case "custom": return [from || "", to || ""];
    default: return ["", ""];
  }
}

function formatValue(field, value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map((v) => formatValue(field, v)).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  const text = String(value);
  if (/^\d{4}-\d{2}$/.test(text)) return format(new Date(`${text}-01T12:00:00Z`), "MMM yyyy");
  return text.length > 160 ? `${text.slice(0, 160)}…` : text;
}

function dayHeading(day) {
  const today = istDay(new Date());
  const yesterday = istDay(new Date(Date.now() - DAY_MS));
  if (day === today) return "Today";
  if (day === yesterday) return "Yesterday";
  return format(new Date(`${day}T12:00:00Z`), "EEEE, d MMM yyyy");
}

function Changes({ entry }) {
  const changes = entry.changes || [];
  if (!changes.length) {
    const values = { ...(entry.old_values || {}), ...(entry.new_values || {}) };
    const keys = Object.keys(values);
    if (!keys.length) return <p className="text-xs text-slate-500">No further details were recorded.</p>;
    return (
      <dl className="grid gap-1 text-xs">
        {keys.map((key) => (
          <div key={key} className="flex flex-wrap gap-x-2">
            <dt className="font-medium text-slate-600">{FIELD_LABEL[key] || humanize(key)}</dt>
            <dd className="text-slate-700 break-words">{formatValue(key, values[key])}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <dl className="grid gap-1.5 text-xs">
      {changes.map(({ field, before, after }) => (
        <div key={field} className="flex flex-wrap items-baseline gap-x-2">
          <dt className="font-medium text-slate-600">{FIELD_LABEL[field] || humanize(field)}</dt>
          <dd className="flex flex-wrap items-baseline gap-1 text-slate-700 break-words">
            {before !== null && before !== undefined && (
              <span className="rounded bg-rose-50 px-1 text-rose-700 line-through decoration-rose-300">{formatValue(field, before)}</span>
            )}
            {before !== null && before !== undefined && after !== null && after !== undefined && <span className="text-slate-400">→</span>}
            {after !== null && after !== undefined && (
              <span className="rounded bg-emerald-50 px-1 text-emerald-700">{formatValue(field, after)}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Entry({ entry }) {
  const [open, setOpen] = useState(false);
  const role = entry.performed_by_role;
  const count = (entry.changes || []).length;
  return (
    <li className="rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-3 text-left hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg"
      >
        <span className="w-12 shrink-0 pt-0.5 text-xs tabular-nums text-slate-500">{format(new Date(entry.created_at), "h:mm a")}</span>
        <span className="min-w-0 flex-1 text-sm leading-snug text-slate-800">
          <span className="font-semibold text-slate-900">{entry.performed_by_name || "System"}</span>
          {role && <span className={`ml-1.5 rounded px-1.5 py-0.5 text-[11px] font-medium align-middle ${ROLE_STYLE[role] || ROLE_STYLE.member}`}>{role}</span>}
          {" "}{actionPhrase(entry.action)}
          {entry.target_name && <> · <span className="font-medium text-slate-900">{entry.target_name}</span></>}
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${tone(entry.action)}`}>{actionLabel(entry.action)}</span>
            <span className="text-[11px] text-slate-500">{AREA_LABEL[entry.area] || "Other"}</span>
            {count > 0 && <span className="text-[11px] text-slate-500">· {count} {count === 1 ? "change" : "changes"}</span>}
          </span>
        </span>
        {open ? <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
      </button>
      {open && (
        <div className="border-t border-slate-100 px-3 py-2.5 sm:pl-[4.75rem]">
          <Changes entry={entry} />
          <p className="mt-2 text-[11px] text-slate-400">
            {format(new Date(entry.created_at), "d MMM yyyy, h:mm:ss a")} IST · {entry.entity_type} #{entry.entity_id}
          </p>
        </div>
      )}
    </li>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
      <p className="text-lg font-bold tabular-nums text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

export default function AuditLogs() {
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [who, setWho] = useState("all"); // all | role:<role> | user:<id>
  const [area, setArea] = useState("all");
  const [action, setAction] = useState("all");
  const [datePreset, setDatePreset] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const [startDate, endDate] = presetRange(datePreset, fromDate, toDate);
  const query = useMemo(() => ({
    ...(who.startsWith("role:") ? { role: who.slice(5) } : {}),
    ...(who.startsWith("user:") ? { user_id: who.slice(5) } : {}),
    ...(area !== "all" ? { area } : {}),
    ...(action !== "all" ? { action } : {}),
    ...(startDate ? { start_date: startDate } : {}),
    ...(endDate ? { end_date: endDate } : {}),
    ...(search ? { search } : {}),
  }), [who, area, action, startDate, endDate, search]);

  const { data: options } = useQuery({
    queryKey: ["auditLogs", "filters"],
    queryFn: () => charityClient.auditLogs.filters(),
    staleTime: 5 * 60 * 1000,
  });

  const feed = useInfiniteQuery({
    queryKey: ["auditLogs", "feed", query],
    queryFn: ({ pageParam }) => charityClient.auditLogs.feed({ ...query, skip: pageParam, limit: 50 }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last?.has_more ? last.skip + last.items.length : undefined),
  });

  const pages = feed.data?.pages || [];
  const entries = pages.flatMap((p) => p.items || []);
  const first = pages[0];
  const total = Number(first?.total || 0);

  const grouped = useMemo(() => {
    const out = [];
    for (const entry of entries) {
      const day = istDay(new Date(entry.created_at));
      if (!out.length || out[out.length - 1].day !== day) out.push({ day, items: [] });
      out[out.length - 1].items.push(entry);
    }
    return out;
  }, [entries]);

  const actionOptions = useMemo(
    () => [...new Set([...(options?.actions || []).map((a) => a.action)])]
      .sort((a, b) => actionLabel(a).localeCompare(actionLabel(b))),
    [options]
  );
  const actors = options?.actors || [];

  const activeCount = [who !== "all", area !== "all", action !== "all", datePreset !== "all", Boolean(search)].filter(Boolean).length;
  const clearAll = () => {
    setWho("all"); setArea("all"); setAction("all"); setDatePreset("all"); setFromDate(""); setToDate("");
    setSearchInput(""); setSearch("");
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const text = await charityClient.auditLogs.exportCsv(query);
      const blob = new Blob([`﻿${text}`], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit-logs-${istDay(new Date())}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({ title: "Export failed", description: error?.message || "Please try again.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
            <p className="text-sm text-slate-500">Who changed what, and when. Tap an entry to see the changes.</p>
          </div>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={exporting || total === 0} className="gap-2">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export CSV
        </Button>
      </div>

      <Card className="border-0 bg-slate-50 shadow-sm">
        <CardContent className="space-y-3 p-3 sm:p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search names, actions or details…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="bg-white pl-10"
              aria-label="Search audit logs"
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Who</Label>
              <Select value={who} onValueChange={setWho}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  <SelectGroup>
                    <SelectLabel>By role</SelectLabel>
                    <SelectItem value="role:superadmin">All superadmins</SelectItem>
                    <SelectItem value="role:admin">All admins</SelectItem>
                    <SelectItem value="role:member">Members</SelectItem>
                    <SelectItem value="role:system">System (automatic)</SelectItem>
                  </SelectGroup>
                  {actors.length > 0 && (
                    <>
                      <SelectSeparator />
                      <SelectGroup>
                        <SelectLabel>People</SelectLabel>
                        {actors.map((a) => (
                          <SelectItem key={a.user_id} value={`user:${a.user_id}`}>
                            {a.name}{a.role ? ` · ${a.role}` : ""}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Area</Label>
              <Select value={area} onValueChange={setArea}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All areas</SelectItem>
                  {(options?.areas || []).map((a) => (
                    <SelectItem key={a.area} value={a.area}>{a.label} ({a.count})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Action</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {actionOptions.map((a) => (
                    <SelectItem key={a} value={a}>{actionLabel(a)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">When</Label>
              <Select value={datePreset} onValueChange={setDatePreset}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DATE_PRESETS.map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {datePreset === "custom" && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Input type="date" aria-label="From date" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} className="w-40 bg-white" />
              <span className="text-slate-500">to</span>
              <Input type="date" aria-label="To date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} className="w-40 bg-white" />
              <span className="text-xs text-slate-500">India time</span>
            </div>
          )}
          {activeCount > 0 && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">{activeCount} {activeCount === 1 ? "filter" : "filters"} on</span>
              <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 gap-1 px-2 text-xs">
                <X className="h-3.5 w-3.5" />Clear all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {first && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label={activeCount ? "Matching entries" : "All entries"} value={total} />
          <Stat label="By admins" value={first.counts?.admin ?? 0} />
          <Stat label="By superadmins" value={first.counts?.superadmin ?? 0} />
          <Stat label="People" value={first.counts?.actors ?? 0} />
        </div>
      )}

      {feed.isLoading ? (
        <p className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading audit logs…</p>
      ) : feed.isError ? (
        <Card className="border-0 shadow-sm"><CardContent className="py-10 text-center text-sm text-rose-600">
          Could not load the audit logs. {feed.error?.message}
        </CardContent></Card>
      ) : entries.length === 0 ? (
        <Card className="border-0 shadow-sm"><CardContent className="py-10 text-center text-sm text-slate-500">
          {activeCount ? "No entries match these filters." : "Nothing has been recorded yet."}
        </CardContent></Card>
      ) : (
        <div className="space-y-5">
          {grouped.map(({ day, items }) => (
            <section key={day}>
              <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-500 backdrop-blur">
                {dayHeading(day)} <span className="font-normal normal-case text-slate-400">· {items.length}</span>
              </h2>
              <ul className="space-y-2">
                {items.map((entry) => <Entry key={entry.id} entry={entry} />)}
              </ul>
            </section>
          ))}
          <div className="flex flex-col items-center gap-1 pb-4">
            <p className="text-xs text-slate-500">Showing {entries.length} of {total}</p>
            {feed.hasNextPage && (
              <Button variant="outline" onClick={() => feed.fetchNextPage()} disabled={feed.isFetchingNextPage}>
                {feed.isFetchingNextPage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Load more
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

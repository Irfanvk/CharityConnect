import React, { useMemo, useState } from "react";
import { charityClient } from "@/api/charityClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";


import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Shield, Calendar, User, Activity } from "lucide-react";
import { format } from "@/lib/dateTime";

const actionConfig = {
  app_settings_update: { label: "App Settings Updated", color: "bg-indigo-100 text-indigo-700", icon: "⚙" },
  campaign_create: { label: "Campaign Created", color: "bg-emerald-100 text-emerald-700", icon: "+" },
  member_created: { label: "Member Created", color: "bg-emerald-100 text-emerald-700", icon: "+" },
  member_create: { label: "Member Created", color: "bg-emerald-100 text-emerald-700", icon: "+" },
  member_updated: { label: "Member Updated", color: "bg-blue-100 text-blue-700", icon: "✎" },
  member_update: { label: "Member Updated", color: "bg-blue-100 text-blue-700", icon: "✎" },
  member_deleted: { label: "Member Deleted", color: "bg-rose-100 text-rose-700", icon: "✕" },
  member_delete: { label: "Member Deleted", color: "bg-rose-100 text-rose-700", icon: "✕" },
  member_status_changed: { label: "Status Changed", color: "bg-amber-100 text-amber-700", icon: "⟳" },
  members_import: { label: "Members Imported", color: "bg-sky-100 text-sky-700", icon: "⇪" },
  challan_history_import: { label: "Challan History Imported", color: "bg-sky-100 text-sky-700", icon: "⇪" },
  campaign_payments_import: { label: "Campaign Payments Imported", color: "bg-sky-100 text-sky-700", icon: "⇪" },
  campaign_created: { label: "Campaign Created", color: "bg-emerald-100 text-emerald-700", icon: "+" },
  campaign_updated: { label: "Campaign Updated", color: "bg-blue-100 text-blue-700", icon: "✎" },
  campaign_update: { label: "Campaign Updated", color: "bg-blue-100 text-blue-700", icon: "✎" },
  campaign_deleted: { label: "Campaign Deleted", color: "bg-rose-100 text-rose-700", icon: "✕" },
  campaign_delete: { label: "Campaign Deleted", color: "bg-rose-100 text-rose-700", icon: "✕" },
  challan_create: { label: "Challan Created", color: "bg-emerald-100 text-emerald-700", icon: "+" },
  challan_update: { label: "Challan Updated", color: "bg-blue-100 text-blue-700", icon: "✎" },
  challan_approve: { label: "Challan Approved", color: "bg-green-100 text-green-700", icon: "✓" },
  challan_approved: { label: "Challan Approved", color: "bg-green-100 text-green-700", icon: "✓" },
  challan_reject: { label: "Challan Rejected", color: "bg-red-100 text-red-700", icon: "✕" },
  challan_rejected: { label: "Challan Rejected", color: "bg-red-100 text-red-700", icon: "✕" },
  challan_revert: { label: "Challan Reverted", color: "bg-amber-100 text-amber-700", icon: "⟲" },
  challan_reverted: { label: "Challan Reverted", color: "bg-amber-100 text-amber-700", icon: "⟲" },
  fund_utilization_create: { label: "Fund Utilization Created", color: "bg-emerald-100 text-emerald-700", icon: "+" },
  fund_utilization_update: { label: "Fund Utilization Updated", color: "bg-blue-100 text-blue-700", icon: "✎" },
  fund_utilization_delete: { label: "Fund Utilization Deleted", color: "bg-rose-100 text-rose-700", icon: "✕" },
  invite_create: { label: "Invite Created", color: "bg-emerald-100 text-emerald-700", icon: "+" },
  invite_update: { label: "Invite Updated", color: "bg-blue-100 text-blue-700", icon: "✎" },
  invite_delete: { label: "Invite Deleted", color: "bg-rose-100 text-rose-700", icon: "✕" },
  notification_create: { label: "Notification Created", color: "bg-indigo-100 text-indigo-700", icon: "🔔" },
  notification_update: { label: "Notification Updated", color: "bg-blue-100 text-blue-700", icon: "✎" },
  notification_delete: { label: "Notification Deleted", color: "bg-rose-100 text-rose-700", icon: "✕" },
  notification_delete_batch: { label: "Notification Batch Deleted", color: "bg-slate-100 text-slate-700", icon: "🔔" },
  report_generated: { label: "Report Generated", color: "bg-purple-100 text-purple-700", icon: "📊" },
  request_approved: { label: "Request Approved", color: "bg-green-100 text-green-700", icon: "✓" },
  request_rejected: { label: "Request Rejected", color: "bg-red-100 text-red-700", icon: "✕" },
  system_wipe: { label: "System Wiped", color: "bg-rose-100 text-rose-700", icon: "⚠" },
  user_update: { label: "User Updated", color: "bg-blue-100 text-blue-700", icon: "✎" },
};

const roleBadgeClass = {
  admin: "bg-blue-100 text-blue-700",
  superadmin: "bg-purple-100 text-purple-700",
  member: "bg-slate-100 text-slate-700",
};

const formatActionLabel = (actionType = "") => {
  if (actionConfig[actionType]?.label) {
    return actionConfig[actionType].label;
  }

  return String(actionType || "Unknown Action")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatDetailLabel = (key = "") =>
  String(key || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatDetailValue = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map(formatDetailValue).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export default function AuditLogs() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: () => charityClient.auditLogs.list({ order: '-created_date', limit: 1000 }),
  });

  const availableActions = useMemo(
    () => [...new Set(logs.map((log) => log.action_type).filter(Boolean))].sort((left, right) => {
      return formatActionLabel(left).localeCompare(formatActionLabel(right));
    }),
    [logs]
  );

  const filteredLogs = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    return logs.filter((log) => {
      const performedByName = String(log.performed_by_name || '').toLowerCase();
      const targetName = String(log.target_name || '').toLowerCase();
      const performedBy = String(log.performed_by || '').toLowerCase();
      const actionLabel = formatActionLabel(log.action_type).toLowerCase();
      const entityType = String(log.entity_type || '').toLowerCase();
      const detailsText = JSON.stringify(log.details || {}).toLowerCase();
      const previousDetailsText = JSON.stringify(log.previous_details || {}).toLowerCase();

      const matchesSearch = !searchText ||
        performedByName.includes(searchText) ||
        targetName.includes(searchText) ||
        performedBy.includes(searchText) ||
        actionLabel.includes(searchText) ||
        entityType.includes(searchText) ||
        detailsText.includes(searchText) ||
        previousDetailsText.includes(searchText);

      const matchesAction = actionFilter === "all" || log.action_type === actionFilter;

      return matchesSearch && matchesAction;
    });
  }, [actionFilter, logs, search]);

  const groupedLogs = useMemo(() => filteredLogs.reduce((groups, log) => {
    const rawDate = log.created_date || log.created_at;
    const date = rawDate ? format(new Date(rawDate), 'yyyy-MM-dd') : 'Unknown';
    if (!groups[date]) groups[date] = [];
    groups[date].push(log);
    return groups;
  }, {}), [filteredLogs]);

  const uniqueActorCount = useMemo(
    () => new Set(logs.map((log) => log.user_id || log.performed_by || log.performed_by_name).filter(Boolean)).size,
    [logs]
  );

  const adminActionCount = useMemo(
    () => logs.filter((log) => log.performed_by_role === 'admin').length,
    [logs]
  );

  const superadminActionCount = useMemo(
    () => logs.filter((log) => log.performed_by_role === 'superadmin').length,
    [logs]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
          <p className="text-slate-500">Track admin and superadmin actions across their platform workflows</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{logs.length}</p>
                <p className="text-sm text-slate-500">Total Actions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <User className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{uniqueActorCount}</p>
                <p className="text-sm text-slate-500">Unique Actors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{adminActionCount}</p>
                <p className="text-sm text-slate-500">Admin Actions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{superadminActionCount}</p>
                <p className="text-sm text-slate-500">Superadmin Actions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by admin or target..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {availableActions.map((action) => (
                  <SelectItem key={action} value={action}>{formatActionLabel(action)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs */}
      <Card className="border-0 shadow-sm">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Loading audit logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No audit logs found</div>
          ) : (
            <div className="divide-y">
              {Object.keys(groupedLogs).sort().reverse().map(date => (
                <div key={date} className="p-4">
                  <div className="flex items-center gap-2 mb-3 text-sm font-medium text-slate-600">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                  </div>
                  <div className="space-y-3">
                    {groupedLogs[date].map((log) => (
                      <div key={log.id} className="flex items-start gap-4 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white border flex items-center justify-center text-lg">
                          {actionConfig[log.action_type]?.icon || "•"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-1">
                            <div>
                              <Badge className={actionConfig[log.action_type]?.color || "bg-slate-100"}>
                                {formatActionLabel(log.action_type)}
                              </Badge>
                              <p className="text-sm text-slate-900 mt-1">
                                <span className="font-medium">{log.performed_by_name || log.performed_by}</span>
                                {log.performed_by_role && (
                                  <Badge variant="outline" className={`ml-2 border-0 ${roleBadgeClass[log.performed_by_role] || 'bg-slate-100 text-slate-700'}`}>
                                    {log.performed_by_role}
                                  </Badge>
                                )}
                                {log.target_name && (
                                  <>
                                    <span className="text-slate-500"> • </span>
                                    <span className="text-slate-700">{log.target_name}</span>
                                  </>
                                )}
                              </p>
                            </div>
                            <span className="text-xs text-slate-500 whitespace-nowrap">
                              {format(new Date(log.created_date), 'h:mm a')}
                            </span>
                          </div>
                          {((log.previous_details && Object.keys(log.previous_details).length > 0) || (log.details && Object.keys(log.details).length > 0)) && (
                            <div className="text-xs text-slate-500 mt-2 p-2 bg-white rounded border space-y-2">
                              {log.previous_details && Object.keys(log.previous_details).length > 0 && (
                                <div>
                                  <p className="font-medium text-slate-600 mb-1">Before</p>
                                  <div className="space-y-1">
                                    {Object.entries(log.previous_details).slice(0, 6).map(([key, value]) => (
                                      <div key={`${log.id}-before-${key}`} className="flex flex-wrap gap-1">
                                        <span className="font-medium text-slate-600">{formatDetailLabel(key)}:</span>
                                        <span>{formatDetailValue(value)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {log.details && Object.keys(log.details).length > 0 && (
                                <div>
                                  <p className="font-medium text-slate-600 mb-1">After</p>
                                  <div className="space-y-1">
                                    {Object.entries(log.details).slice(0, 6).map(([key, value]) => (
                                      <div key={`${log.id}-after-${key}`} className="flex flex-wrap gap-1">
                                        <span className="font-medium text-slate-600">{formatDetailLabel(key)}:</span>
                                        <span>{formatDetailValue(value)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
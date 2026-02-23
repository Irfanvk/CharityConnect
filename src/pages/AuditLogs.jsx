import React, { useState } from "react";
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
import { format } from "date-fns";

const actionConfig = {
  member_created: { label: "Member Created", color: "bg-emerald-100 text-emerald-700", icon: "+" },
  member_updated: { label: "Member Updated", color: "bg-blue-100 text-blue-700", icon: "✎" },
  member_deleted: { label: "Member Deleted", color: "bg-rose-100 text-rose-700", icon: "✕" },
  member_status_changed: { label: "Status Changed", color: "bg-amber-100 text-amber-700", icon: "⟳" },
  campaign_created: { label: "Campaign Created", color: "bg-emerald-100 text-emerald-700", icon: "+" },
  campaign_updated: { label: "Campaign Updated", color: "bg-blue-100 text-blue-700", icon: "✎" },
  campaign_deleted: { label: "Campaign Deleted", color: "bg-rose-100 text-rose-700", icon: "✕" },
  challan_approved: { label: "Challan Approved", color: "bg-green-100 text-green-700", icon: "✓" },
  challan_rejected: { label: "Challan Rejected", color: "bg-red-100 text-red-700", icon: "✕" },
  report_generated: { label: "Report Generated", color: "bg-purple-100 text-purple-700", icon: "📊" },
  notification_deleted: { label: "Notification Deleted", color: "bg-slate-100 text-slate-700", icon: "🔔" },
};

export default function AuditLogs() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: () => charityClient.entities.AuditLog.list('-created_date', 500),
  });

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.performed_by_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.target_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.performed_by?.toLowerCase().includes(search.toLowerCase());
    
    const matchesAction = actionFilter === "all" || log.action_type === actionFilter;
    
    return matchesSearch && matchesAction;
  });

  // Group logs by date
  const groupedLogs = filteredLogs.reduce((groups, log) => {
    const date = format(new Date(log.created_date), 'yyyy-MM-dd');
    if (!groups[date]) groups[date] = [];
    groups[date].push(log);
    return groups;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
          <p className="text-slate-500">Track all administrative actions and changes</p>
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
                <p className="text-2xl font-bold text-slate-900">
                  {[...new Set(logs.map(l => l.performed_by))].length}
                </p>
                <p className="text-sm text-slate-500">Unique Admins</p>
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
                <SelectItem value="member_created">Member Created</SelectItem>
                <SelectItem value="member_updated">Member Updated</SelectItem>
                <SelectItem value="member_deleted">Member Deleted</SelectItem>
                <SelectItem value="member_status_changed">Status Changed</SelectItem>
                <SelectItem value="campaign_created">Campaign Created</SelectItem>
                <SelectItem value="campaign_updated">Campaign Updated</SelectItem>
                <SelectItem value="challan_approved">Challan Approved</SelectItem>
                <SelectItem value="challan_rejected">Challan Rejected</SelectItem>
                <SelectItem value="report_generated">Report Generated</SelectItem>
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
                                {actionConfig[log.action_type]?.label || log.action_type}
                              </Badge>
                              <p className="text-sm text-slate-900 mt-1">
                                <span className="font-medium">{log.performed_by_name || log.performed_by}</span>
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
                          {log.details && Object.keys(log.details).length > 0 && (
                            <div className="text-xs text-slate-500 mt-2 p-2 bg-white rounded border">
                              {log.details.old_status && log.details.new_status && (
                                <span>Status: {log.details.old_status} → {log.details.new_status}</span>
                              )}
                              {log.details.report_type && (
                                <span>Report Type: {log.details.report_type}</span>
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
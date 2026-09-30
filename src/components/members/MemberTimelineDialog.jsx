import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { charityClient } from "@/api/charityClient";
import { formatMemberId } from "@/lib/utils";
import { format } from "@/lib/dateTime";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AvatarCircle } from "@/components/UserProfilePopover";
import { Receipt, Inbox, Activity } from "lucide-react";

const challanStatusClass = {
  approved: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-rose-100 text-rose-700",
  generated: "bg-slate-100 text-slate-700",
};

const requestStatusClass = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

/** Combines a single member's challans, requests, and audit history for admin review. */
export default function MemberTimelineDialog({ member, open, onOpenChange }) {
  const [activeTab, setActiveTab] = useState("payments");

  const { data: challans = [], isLoading: challansLoading } = useQuery({
    queryKey: ["admin", "member-timeline", "challans", member?.id],
    queryFn: () => charityClient.challans.getByMember(member.id),
    enabled: open && Boolean(member?.id),
  });

  const { data: requestPage = { items: [] }, isLoading: requestsLoading } = useQuery({
    queryKey: ["admin", "member-timeline", "requests", member?.id],
    queryFn: () => charityClient.requests.adminList({ member_id: member.id, limit: 100 }),
    enabled: open && Boolean(member?.id),
  });

  const { data: auditLogs = [], isLoading: auditLoading } = useQuery({
    queryKey: ["admin", "member-timeline", "audit", member?.user_id],
    queryFn: () => charityClient.auditLogs.list({ user_id: member.user_id, limit: 100 }),
    enabled: open && Boolean(member?.user_id),
  });

  if (!member) return null;

  const tabs = [
    { key: "payments", label: "Payments", icon: Receipt, count: challans.length },
    { key: "requests", label: "Requests", icon: Inbox, count: requestPage.items.length },
    { key: "activity", label: "Activity", icon: Activity, count: auditLogs.length },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <AvatarCircle avatarUrl={member.avatar_url} name={member.full_name} size="sm" />
            <div>
              <p>{member.full_name}</p>
              <p className="text-xs font-normal text-slate-500">
                {formatMemberId(member.member_id)}{member.username ? ` · @${member.username}` : ""}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 border-b border-slate-200">
          {tabs.map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === key ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
              onClick={() => setActiveTab(key)}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {count > 0 && <span className="text-xs text-slate-400">({count})</span>}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 -mx-1 px-1">
          {activeTab === "payments" && (
            challansLoading ? (
              <p className="py-8 text-center text-sm text-slate-500">Loading payments...</p>
            ) : challans.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No challans recorded for this member.</p>
            ) : (
              <div className="space-y-2 py-2">
                {challans.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800">
                        Rs {Number(c.amount || 0).toLocaleString()} · {c.type === "donation" ? "Campaign" : c.month || "Payment"}
                      </p>
                      <p className="text-xs text-slate-500">{format(new Date(c.created_date), "MMM d, yyyy 'at' h:mm a")}</p>
                      {c.rejection_reason && <p className="text-xs text-rose-600 mt-0.5">Reason: {c.rejection_reason}</p>}
                    </div>
                    <Badge className={challanStatusClass[c.status] || "bg-slate-100 text-slate-700"}>{c.status}</Badge>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === "requests" && (
            requestsLoading ? (
              <p className="py-8 text-center text-sm text-slate-500">Loading requests...</p>
            ) : requestPage.items.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No requests submitted by this member.</p>
            ) : (
              <div className="space-y-2 py-2">
                {requestPage.items.map((r) => (
                  <div key={r.id} className="rounded-md border border-slate-200 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-800">{r.subject || r.request_type}</p>
                      <Badge className={requestStatusClass[r.status] || "bg-slate-100 text-slate-700"}>{r.status}</Badge>
                    </div>
                    <p className="text-slate-600 mt-1 line-clamp-2">{r.message}</p>
                    <p className="text-xs text-slate-500 mt-1">{format(new Date(r.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === "activity" && (
            auditLoading ? (
              <p className="py-8 text-center text-sm text-slate-500">Loading activity...</p>
            ) : auditLogs.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No account activity recorded.</p>
            ) : (
              <div className="space-y-2 py-2">
                {auditLogs.map((log) => (
                  <div key={log.id} className="rounded-md border border-slate-200 p-3 text-sm">
                    <p className="font-medium text-slate-800">{String(log.action || "").replace(/_/g, " ")}</p>
                    <p className="text-xs text-slate-500 mt-1">{format(new Date(log.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

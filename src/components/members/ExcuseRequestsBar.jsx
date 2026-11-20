import React from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarOff } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { formatMonth } from "@/lib/challanStatus";

/* Admins, on the Members page: members waiting for an answer about excused months. */
export default function ExcuseRequestsBar({ onReview }) {
  const { data } = useQuery({
    queryKey: ["excuse-requests"],
    queryFn: () => charityClient.members.excuseRequests(),
    staleTime: 60 * 1000,
  });
  const byMember = new Map();
  for (const r of data || []) {
    const entry = byMember.get(r.member_id) || { id: r.member_id, member_code: r.member_code, full_name: r.member_name, items: [] };
    entry.items.push(r);
    byMember.set(r.member_id, entry);
  }
  if (byMember.size === 0) return null;
  return (
    <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="flex items-center gap-1.5 font-semibold"><CalendarOff className="h-4 w-4" />Excused months asked for ({byMember.size} member{byMember.size > 1 ? "s" : ""})</p>
      {[...byMember.values()].map((m) => (
        <div key={m.id} className="flex flex-col gap-2 rounded-lg bg-white p-2 sm:flex-row sm:items-center sm:justify-between">
          <span>
            <span className="font-semibold">{m.full_name || m.member_code}</span> <span className="text-xs text-slate-500">{m.member_code}</span>
            <span className="block text-slate-700">{m.items.map((i) => formatMonth(i.month)).join(", ")} · {m.items[0].reason}</span>
          </span>
          <Button size="sm" variant="outline" className="shrink-0 bg-white" onClick={() => onReview({ id: m.id, member_code: m.member_code, full_name: m.full_name })}>Review</Button>
        </div>
      ))}
    </div>
  );
}

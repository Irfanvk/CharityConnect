import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarCheck, Clock, Heart, Users } from "lucide-react";
import { PAGE_PATHS } from "@/config/appPaths";
import { currentBusinessMonth } from "@/lib/businessTime";
import { isUnlimitedTarget, getCampaignTargetAmount } from "@/lib/campaigns";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

function monthName(month) {
  const [y, m] = String(month || "").split("-").map(Number);
  if (!y || !m) return "this month";
  return new Date(y, m - 1, 1).toLocaleString("en-IN", { month: "long" });
}

const TONES = {
  emerald: "from-emerald-500 to-teal-600 shadow-emerald-500/20",
  blue: "from-blue-500 to-indigo-600 shadow-blue-500/20",
  amber: "from-amber-500 to-orange-600 shadow-amber-500/20",
  rose: "from-rose-500 to-pink-600 shadow-rose-500/20",
};

function KeyCard({ to, tone, icon: Icon, badge, value, label, hint, action, alert }) {
  return (
    <Link
      to={to}
      className={`group relative block overflow-hidden rounded-2xl bg-gradient-to-br ${TONES[tone]} p-5 text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80`}
    >
      <div className="mb-3 flex items-center justify-between">
        <Icon className="h-7 w-7 opacity-85" />
        {badge != null && (
          <span className={`rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold ${alert ? "animate-pulse" : ""}`}>{badge}</span>
        )}
      </div>
      <p className="truncate text-3xl font-bold leading-tight">{value}</p>
      <p className="mt-1 text-sm font-medium text-white/90">{label}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-white/75">{hint}</p>}
      <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-white/90 group-hover:underline">
        {action} <ArrowRight className="h-3 w-3" />
      </p>
    </Link>
  );
}

/* The four numbers an admin checks first. Every number comes from the server totals (not the
   last few payments the page happened to load), and each card opens the page that acts on it. */
export default function KeyNumbers({ memberSummary, challanSummary, campaigns = [] }) {
  const total = Number(memberSummary?.total_members || 0);
  const active = Number(memberSummary?.active_members || 0);
  const activePct = total > 0 ? Math.round((active / total) * 100) : null;

  const month = currentBusinessMonth();
  const monthly = Number(challanSummary?.monthly_collection || 0);
  const pending = Number(challanSummary?.pending_count || 0);

  const running = campaigns.filter((c) => c.status === "active");
  const raised = running.reduce((s, c) => s + Number(c.collected_amount || 0), 0);
  const targeted = running.filter((c) => !isUnlimitedTarget(c));
  const target = targeted.reduce((s, c) => s + getCampaignTargetAmount(c), 0);
  const campaignPct = target > 0 ? Math.round((raised / target) * 100) : null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KeyCard
        to={PAGE_PATHS.MEMBERS}
        tone="emerald"
        icon={Users}
        badge={activePct != null ? `${activePct}% active` : null}
        value={active.toLocaleString("en-IN")}
        label="Active members"
        hint={`of ${total.toLocaleString("en-IN")} members in total`}
        action="Open members"
      />
      <KeyCard
        to={PAGE_PATHS.REPORTS}
        tone="blue"
        icon={CalendarCheck}
        badge={monthName(month)}
        value={inr(monthly)}
        label={`Monthly fees for ${monthName(month)}`}
        hint="Approved so far"
        action="See who has paid"
      />
      <KeyCard
        to={PAGE_PATHS.ADMIN_REQUESTS}
        tone="amber"
        icon={Clock}
        badge={pending > 0 ? "Action needed" : "All clear"}
        alert={pending > 0}
        value={pending.toLocaleString("en-IN")}
        label="Waiting for approval"
        hint={pending > 0 ? "Proof handed in, not checked yet" : "Nothing to check right now"}
        action={pending > 0 ? "Review now" : "Open requests"}
      />
      <KeyCard
        to={PAGE_PATHS.CAMPAIGNS}
        tone="rose"
        icon={Heart}
        badge={campaignPct != null ? `${campaignPct}% of goal` : running.length ? "Open goal" : null}
        value={running.length.toLocaleString("en-IN")}
        label={running.length === 1 ? "Running campaign" : "Running campaigns"}
        hint={`${inr(raised)} raised`}
        action="Open campaigns"
      />
    </div>
  );
}

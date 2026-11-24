import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck, ChevronRight, ClipboardList, FileText, Hourglass, Image as ImageIcon, Inbox, Loader2,
  Megaphone, ScrollText, Send, Shield, ShieldCheck, Upload, UserCog, UserPlus, Users, Wallet,
} from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { useAuth } from "@/lib/AuthContext";
import { isAdminRole, isStaffRole, isSuperadminRole } from "@/lib/roles";
import { PAGE_PATHS } from "@/config/appPaths";

/*
 * Admin area: every admin task in one place, as big tiles grouped by purpose. Tiles with work
 * waiting show a count. At the bottom: "Who is who", the committee with the codes the app
 * shows for them (A12 = admin, E7 = executive), for staff only.
 */

const ROLE_STYLE = {
  superadmin: { label: "Superadmin", cls: "bg-violet-100 text-violet-800", icon: ShieldCheck },
  admin: { label: "Admin", cls: "bg-emerald-100 text-emerald-800", icon: BadgeCheck },
  executive: { label: "Executive", cls: "bg-sky-100 text-sky-800", icon: UserCog },
};

function Tile({ to, icon: Icon, title, sub, count, tone = "bg-slate-100 text-slate-700" }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-400 hover:shadow active:scale-[0.99] dark:border-slate-700 dark:bg-slate-900"
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-slate-900 dark:text-white">{title}</span>
        {sub && <span className="block truncate text-sm text-slate-500">{sub}</span>}
      </span>
      {count > 0 && <span className="shrink-0 rounded-full bg-rose-600 px-2 py-0.5 text-sm font-bold text-white">{count}</span>}
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
    </Link>
  );
}

function Group({ title, children }) {
  const items = React.Children.toArray(children).filter(Boolean);
  if (!items.length) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{items}</div>
    </section>
  );
}

const quiet = (fn) => async () => { try { return await fn(); } catch { return null; } };

export default function AdminArea() {
  const { user } = useAuth();
  const isAdmin = isAdminRole(user);
  const isSuper = isSuperadminRole(user);
  const isStaff = isStaffRole(user);

  const { data: counts } = useQuery({
    queryKey: ["admin-area", "counts", isAdmin],
    enabled: isStaff,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const [requests, resets, unfinished, movedBack, funds] = await Promise.all([
        isAdmin ? quiet(() => charityClient.requests.adminList({ status: "pending", skip: 0, limit: 1 }))() : null,
        isAdmin ? quiet(() => charityClient.admin.listPasswordResetRequests({ status: "pending" }))() : null,
        quiet(() => charityClient.challans.unfinished({ min_hours: 48 }))(),
        quiet(() => charityClient.challans.movedBack())(),
        isAdmin ? quiet(() => charityClient.fundUtilizations.summary())() : null,
      ]);
      return {
        requests: Number(requests?.total || 0) + (Array.isArray(resets) ? resets.length : 0),
        unfinished: Number(unfinished?.count || 0),
        movedBack: Number(movedBack?.count || 0),
        funds: Number(funds?.pending_count || 0),
      };
    },
  });

  const { data: staff, isLoading: loadingStaff } = useQuery({
    queryKey: ["admin", "staff-directory"],
    enabled: isStaff,
    staleTime: 5 * 60 * 1000,
    queryFn: () => charityClient.admin.staffDirectory(),
  });
  const people = staff?.items || [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white"><Shield className="h-6 w-6 text-emerald-600" />Admin area</h1>
        <p className="text-sm text-slate-500">Everything for running the committee, in one place. A red number means work is waiting.</p>
      </div>

      <Group title="Daily work">
        {isAdmin && (
          <Tile to={PAGE_PATHS.ADMIN_REQUESTS} icon={Inbox} tone="bg-sky-100 text-sky-700" title="Requests"
            sub="Profile changes, password resets" count={counts?.requests} />
        )}
        <Tile to={PAGE_PATHS.UNFINISHED} icon={Hourglass} tone="bg-amber-100 text-amber-800" title="Unfinished payments"
          sub={counts?.movedBack ? `${counts.movedBack} moved back, waiting` : "Started without proof · moved back"}
          count={(counts?.unfinished || 0) + (counts?.movedBack || 0)} />
        {isAdmin && (
          <Tile to={PAGE_PATHS.FUND_UTILIZATION} icon={Wallet} tone="bg-rose-100 text-rose-700" title="Fund utilization"
            sub="How the money is used" count={counts?.funds} />
        )}
      </Group>

      <Group title="Records">
        <Tile to={PAGE_PATHS.REPORTS} icon={FileText} tone="bg-emerald-100 text-emerald-700" title="Reports" sub="Money summary, payments, downloads" />
        {isAdmin && <Tile to={PAGE_PATHS.AUDIT_LOGS} icon={ScrollText} title="Audit logs" sub="Who changed what, and when" />}
      </Group>

      {isAdmin && (
        <Group title="Members & access">
          <Tile to={`${PAGE_PATHS.SETTINGS}?tab=invites`} icon={UserPlus} tone="bg-emerald-100 text-emerald-700" title="Invites" sub="Invite a new member" />
          <Tile to={`${PAGE_PATHS.SETTINGS}?tab=users`} icon={Users} title="Users" sub="Every login in the app" />
        </Group>
      )}

      {isAdmin && (
        <Group title="Communication & system">
          <Tile to={`${PAGE_PATHS.NOTIFICATIONS}?compose=1`} icon={Send} tone="bg-emerald-100 text-emerald-700" title="Send a message" sub="To everyone or to admins" />
          <Tile to={PAGE_PATHS.BANNERS} icon={ImageIcon} title="Banners" sub="Pictures for occasions" />
          {isSuper && <Tile to={PAGE_PATHS.IMPORT} icon={Upload} title="Import data" sub="Bring records into the app" />}
          {isSuper && <Tile to={PAGE_PATHS.SUPERADMIN_PANEL} icon={Shield} tone="bg-violet-100 text-violet-800" title="Superadmin panel" sub="Roles, settings, monitoring" />}
        </Group>
      )}

      {/* Who is who */}
      <section className="space-y-2">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white"><ClipboardList className="h-5 w-5 text-slate-500" />Who is who</h2>
          <p className="text-sm text-slate-500">
            The app shows staff by code, e.g. "approved by admin (A12)". A = admin or superadmin, E = executive; the number is their member ID.
            Only staff see this list; members see "the committee".
          </p>
        </div>
        {loadingStaff ? (
          <p className="flex items-center gap-2 py-4 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading…</p>
        ) : (
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-700 dark:bg-slate-900">
            {people.map((p) => {
              const style = ROLE_STYLE[p.role] || ROLE_STYLE.admin;
              const Icon = style.icon;
              return (
                <div key={p.user_id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-14 shrink-0 rounded-lg bg-slate-900 py-1 text-center font-mono text-sm font-bold text-white dark:bg-white dark:text-slate-900">{p.code}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-slate-900 dark:text-white">{p.name}{p.is_you && <span className="ml-1.5 text-xs font-normal text-slate-500">(you)</span>}</span>
                  </span>
                  <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${style.cls}`}><Icon className="h-3.5 w-3.5" />{style.label}</span>
                </div>
              );
            })}
            {people.length === 0 && <p className="px-4 py-4 text-sm text-slate-500">No staff found.</p>}
          </div>
        )}
        <p className="flex items-center gap-1.5 text-xs text-slate-400"><Megaphone className="h-3.5 w-3.5" />Codes change only when someone's role or member ID changes.</p>
      </section>
    </div>
  );
}

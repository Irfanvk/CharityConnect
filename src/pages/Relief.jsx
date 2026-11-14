import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, HandHeart, Search } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMemberId } from "@/lib/utils";
import { useReliefText } from "@/lib/reliefI18n";
import { LanguageSwitch, LoadState } from "@/components/reports/simple/ReportsShared";
import { EligibilityChecks, ReliefRules, ReliefStatus } from "@/components/relief/ReliefParts";
import NewClaimForm from "@/components/relief/NewClaimForm";
import ClaimDetail from "@/components/relief/ClaimDetail";

/*
 * Relief fund. Members: the rules, their own rule checks, and claims made for them.
 * Admins: claims to approve, all claims, a new claim, and the rules.
 * Address: ?tab=to_decide|all|new|rules and ?claim=<id> for one claim.
 */

function ClaimRow({ R, claim, onOpen }) {
  return (
    <li>
      <button type="button" onClick={() => onOpen?.(claim.id)} disabled={!onOpen} className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-slate-50 disabled:hover:bg-transparent">
        <span className="min-w-0">
          <span className="block truncate text-base font-bold text-slate-900">{claim.member_name}</span>
          <span className="block text-sm text-slate-600">
            {formatMemberId(claim.member_code)} · {R.t(`reason_${claim.reason}`)}{claim.illness_type ? ` (${R.t(`illness_${claim.illness_type}`)})` : ""}
          </span>
          <span className="block text-xs text-slate-500">
            {R.date(claim.created_at)}
            {claim.status === "pending" && ` · ${R.t("approvalsProgress", { n: claim.approvals_count, total: claim.approvals_needed })}`}
            {claim.status === "paid" && claim.paid_on && ` · ${R.t("paidOn")}: ${R.date(claim.paid_on)}`}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-right">
            <span className="block text-lg font-bold tabular-nums text-slate-900">{R.money(claim.amount)}</span>
            <ReliefStatus R={R} status={claim.status} />
          </span>
          {onOpen && <ChevronRight className="h-5 w-5 text-slate-400" />}
        </span>
      </button>
    </li>
  );
}

function MemberView({ R }) {
  const query = useQuery({ queryKey: ["relief", "me"], queryFn: () => charityClient.relief.me() });
  const data = query.data;
  return (
    <LoadState L={R} query={query}>
      {data && (
        <div className="space-y-5">
          {data.claims.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900">{R.t("claimsForMe")}</h2>
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {data.claims.map((c) => <ClaimRow key={c.id} R={R} claim={c} />)}
              </ul>
            </section>
          )}
          {data.eligibility && (
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900">{R.t("amEligible")}</h2>
              <EligibilityChecks R={R} eligibility={data.eligibility} />
            </section>
          )}
          <ReliefRules R={R} scheme={data.scheme} />
        </div>
      )}
    </LoadState>
  );
}

function AdminView({ R, user }) {
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const claimId = params.get("claim") ? Number(params.get("claim")) : null;
  const tab = params.get("tab") || "to_decide";
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setSearch(text.trim()), 350);
    return () => clearTimeout(id);
  }, [text]);

  const go = (next) => { setParams(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const list = useQuery({
    queryKey: ["relief", "claims", tab, search],
    queryFn: () => charityClient.relief.list({ ...(tab === "to_decide" ? { status: "to_decide" } : {}), ...(search ? { search } : {}) }),
    enabled: tab === "to_decide" || tab === "all" || tab === "rules" || tab === "new",
  });
  const detail = useQuery({
    queryKey: ["relief", "claim", claimId],
    queryFn: () => charityClient.relief.get(claimId),
    enabled: Boolean(claimId),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["relief"] });

  if (claimId) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => go({ tab })} className="h-11 gap-1.5 bg-white"><ArrowLeft className="h-5 w-5" />{R.t("backToList")}</Button>
        <LoadState L={R} query={detail}>
          {detail.data && (
            <ClaimDetail R={R} claim={detail.data} viewerId={user?.id} onChanged={(out) => { queryClient.setQueryData(["relief", "claim", claimId], out); refresh(); }} />
          )}
        </LoadState>
      </div>
    );
  }

  const counts = list.data?.counts;
  const tabs = [
    ["to_decide", `${R.t("toApprove")}${counts ? ` (${counts.to_decide})` : ""}`],
    ["all", R.t("allClaims")],
    ["new", `+ ${R.t("newClaim")}`],
    ["rules", R.t("rulesTab")],
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {tabs.map(([key, label]) => (
          <button key={key} type="button" onClick={() => go({ tab: key })} className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold ${tab === key ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-800"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "new" && list.data && (
        <NewClaimForm R={R} scheme={list.data.scheme} onCreated={(c) => { refresh(); go({ tab: "all", claim: String(c.id) }); }} />
      )}
      {tab === "rules" && list.data && <ReliefRules R={R} scheme={list.data.scheme} />}

      {(tab === "to_decide" || tab === "all") && (
        <>
          {tab === "all" && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={R.t("search")} className="h-11 bg-white pl-9" />
            </div>
          )}
          <LoadState L={R} query={list}>
            {list.data && (
              <>
                {tab === "all" && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {["pending", "approved", "paid", "rejected"].map((s) => (
                      <div key={s} className="rounded-xl border border-slate-200 bg-white p-3">
                        <ReliefStatus R={R} status={s} />
                        <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{list.data.counts[s]}</p>
                      </div>
                    ))}
                    <div className="col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 sm:col-span-4">
                      <p className="text-sm font-semibold text-emerald-800">{R.t("paidTotal")}</p>
                      <p className="text-2xl font-bold text-emerald-900">{R.money(list.data.paid_total)}</p>
                    </div>
                  </div>
                )}
                {list.data.items.length === 0 ? (
                  <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500">{R.t("noClaims")}</p>
                ) : (
                  <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    {list.data.items.map((c) => <ClaimRow key={c.id} R={R} claim={c} onOpen={(id) => go({ tab, claim: String(id) })} />)}
                  </ul>
                )}
              </>
            )}
          </LoadState>
        </>
      )}
    </div>
  );
}

export default function Relief() {
  const R = useReliefText();
  const { data: user, isLoading } = useQuery({ queryKey: ["me"], queryFn: () => charityClient.auth.me() });
  if (isLoading) return null;
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  return (
    <div className="mx-auto max-w-4xl space-y-5" lang={R.locale}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <HandHeart className="h-7 w-7 text-emerald-600" />{R.t("reliefFund")}
        </h1>
        <LanguageSwitch L={R} />
      </div>
      {isAdmin ? <AdminView R={R} user={user} /> : <MemberView R={R} />}
    </div>
  );
}

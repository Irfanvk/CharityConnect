import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, ClipboardList, FileText, HandCoins, UserRound, Wallet } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useReportsLanguage } from "@/lib/reportsI18n";
import { BigButton, LanguageSwitch } from "@/components/reports/simple/ReportsShared";
import MemberStatementView from "@/components/reports/simple/MemberStatementView";
import PaymentsReportView from "@/components/reports/simple/PaymentsReportView";
import DuesReportView from "@/components/reports/simple/DuesReportView";
import MoneySummaryView from "@/components/reports/simple/MoneySummaryView";

/*
 * Reports for admins: four big buttons, each opening one plain report.
 * The view lives in the address (?view=member&member=12) so Back and shared links work.
 * Older links (?tab=donations&campaign=5) open All payments for that campaign.
 */

const VIEWS = {
  member: { icon: UserRound, tone: "emerald", title: "memberCard", sub: "memberCardSub" },
  payments: { icon: ClipboardList, tone: "sky", title: "paymentsCard", sub: "paymentsCardSub" },
  dues: { icon: HandCoins, tone: "rose", title: "duesCard", sub: "duesCardSub" },
  summary: { icon: Wallet, tone: "violet", title: "summaryCard", sub: "summaryCardSub" },
};

export default function Reports() {
  const L = useReportsLanguage();
  const [params, setParams] = useSearchParams();
  const { data: user, isLoading } = useQuery({ queryKey: ["me"], queryFn: () => charityClient.auth.me() });

  const legacyCampaign = params.get("campaign");
  const view = VIEWS[params.get("view")] ? params.get("view") : legacyCampaign ? "payments" : null;
  const memberId = params.get("member") ? Number(params.get("member")) : null;

  const go = (next, extra = {}) => {
    const p = new URLSearchParams();
    if (next) p.set("view", next);
    Object.entries(extra).forEach(([k, v]) => { if (v !== null && v !== undefined) p.set(k, String(v)); });
    setParams(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openMember = (id) => go("member", { member: id });

  if (isLoading) return null;
  if (user?.role !== "admin" && user?.role !== "superadmin") {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <FileText className="mx-auto mb-4 h-12 w-12 text-slate-300" />
          <p className="text-slate-500">Access denied. Admin privileges required.</p>
        </CardContent>
      </Card>
    );
  }

  const current = view ? VIEWS[view] : null;

  return (
    <div className="mx-auto max-w-5xl space-y-5" lang={L.locale}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {view && (
            <Button variant="outline" onClick={() => (view === "member" && memberId ? go("member") : go(null))} className="h-11 gap-1.5 bg-white">
              <ArrowLeft className="h-5 w-5" />{L.t("back")}
            </Button>
          )}
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 truncate text-2xl font-bold text-slate-900">
              {current ? <><current.icon className="h-7 w-7 shrink-0 text-emerald-600" />{L.t(current.title)}</> : L.t("reports")}
            </h1>
            {!view && <p className="text-slate-600">{L.t("chooseReport")}</p>}
          </div>
        </div>
        <LanguageSwitch L={L} />
      </div>

      {!view && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Object.entries(VIEWS).map(([key, v]) => (
            <BigButton key={key} icon={v.icon} tone={v.tone} title={L.t(v.title)} sub={L.t(v.sub)} onClick={() => go(key)} />
          ))}
        </div>
      )}

      {view === "member" && (
        <MemberStatementView L={L} memberId={memberId} onPickMember={(id) => (id ? openMember(id) : go("member"))} />
      )}
      {view === "payments" && <PaymentsReportView L={L} onOpenMember={openMember} initialCampaign={legacyCampaign} />}
      {view === "dues" && <DuesReportView L={L} onOpenMember={openMember} />}
      {view === "summary" && <MoneySummaryView L={L} onOpenDues={() => go("dues")} />}
    </div>
  );
}

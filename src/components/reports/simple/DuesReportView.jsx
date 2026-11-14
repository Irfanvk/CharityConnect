import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, MessageCircle, Search } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMemberId } from "@/lib/utils";
import { LIVING_COUNTRIES } from "@/lib/countries";
import { downloadCsv, downloadExcel, downloadPdf, openWhatsAppText, printDocument } from "@/lib/reportFiles";
import { ExportButtons, LoadState, Tile } from "./ReportsShared";

function Field({ label, children }) {
  return <div className="space-y-1"><Label className="text-sm text-slate-600">{label}</Label>{children}</div>;
}

export default function DuesReportView({ L, onOpenMember }) {
  const [status, setStatus] = useState("active");
  const [country, setCountry] = useState("all");
  const [minMonths, setMinMonths] = useState("1");
  const [sort, setSort] = useState("amount_desc");
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setSearch(text.trim()), 350);
    return () => clearTimeout(id);
  }, [text]);

  const params = {
    status, sort, min_months: Number(minMonths),
    ...(country !== "all" ? { country } : {}),
    ...(search ? { search } : {}),
  };
  const query = useQuery({
    queryKey: ["reports", "dues", params],
    queryFn: () => charityClient.reports.dues(params),
  });
  const data = query.data;
  const rows = data?.members || [];

  const statusLabel = { active: L.t("activeMembers"), inactive: L.t("inactiveMembers"), all: L.t("allMembers") }[status];
  const filterLine = [
    statusLabel,
    country !== "all" ? `${L.t("livesIn")}: ${country === "none" ? L.t("notEntered") : LIVING_COUNTRIES.find((c) => c.iso === country)?.name}` : null,
    `${L.t("notPaidAtLeast")}: ${L.t("monthCount", { n: minMonths })}`,
    search ? `${L.t("search")}: ${search}` : null,
  ].filter(Boolean).join(" · ");

  const columns = [
    { key: "name", label: L.t("member"), width: 26 },
    { key: "code", label: L.t("memberId"), width: 12 },
    { key: "phone", label: L.t("phone"), width: 16 },
    { key: "months", label: L.t("monthsNotPaid"), width: 10, type: "number" },
    { key: "amount", label: L.t("amountDue"), width: 14, type: "money" },
    { key: "upto", label: L.t("paidUpTo"), width: 14 },
    { key: "list", label: L.t("month"), width: 48 },
  ];
  const tableRows = () => rows.map((r) => ({
    _state: "not_paid",
    name: r.name,
    code: formatMemberId(r.member_code),
    phone: r.phone || "",
    months: r.months_due,
    amount: r.amount_due,
    upto: r.paid_up_to ? L.month(r.paid_up_to) : r.last_paid_month ? `${L.t("lastMonthPaid")}: ${L.month(r.last_paid_month)}` : L.t("nothingPaidYet"),
    list: r.due_months.map(L.month).join(", "),
  }));
  const fileName = `${L.t("duesTitle")}-${data?.current_month || ""}`;
  const doc = () => ({
    org: data.organisation,
    title: L.t("duesTitle"),
    subtitle: filterLine,
    madeOn: `${L.t("madeOn")}: ${L.date(new Date().toISOString())}`,
    tiles: [
      { state: "not_paid", label: L.t("membersWhoOwe"), value: String(data.members_with_dues) },
      { state: "not_paid", label: L.t("totalDue"), value: L.money(data.total_amount_due), sub: L.t("monthCount", { n: data.total_months_due }) },
    ],
    sections: [{
      columns: [
        { key: "name", label: L.t("member"), width: "26%" },
        { key: "code", label: L.t("memberId"), width: "12%" },
        { key: "phone", label: L.t("phone"), width: "18%" },
        { key: "months", label: L.t("monthsNotPaid"), align: "right", width: "10%" },
        { key: "amount", label: L.t("amountDue"), align: "right", width: "14%" },
        { key: "upto", label: L.t("paidUpTo"), width: "20%" },
      ],
      rows: tableRows().map((r) => ({ cells: { ...r, months: String(r.months), amount: L.money(r.amount) } })),
      empty: L.t("nothingFound"),
    }],
  });

  const remind = (r) => openWhatsAppText(L.t("reminderText", {
    name: r.name,
    org: data.organisation,
    months: L.monthList(r.due_months),
    amount: L.money(r.amount_due),
  }), r.whatsapp_phone || r.phone);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative sm:col-span-2 lg:col-span-1 lg:self-end">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={L.t("searchMember")} aria-label={L.t("search")} className="h-11 bg-white pl-9" />
        </div>
        <Field label={L.t("member")}>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-11 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{L.t("activeMembers")}</SelectItem>
              <SelectItem value="inactive">{L.t("inactiveMembers")}</SelectItem>
              <SelectItem value="all">{L.t("allMembers")}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label={L.t("notPaidAtLeast")}>
          <Select value={minMonths} onValueChange={setMinMonths}>
            <SelectTrigger className="h-11 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["1", "2", "3", "6", "12"].map((n) => <SelectItem key={n} value={n}>{L.t("monthCount", { n })}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label={L.t("livesIn")}>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="h-11 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{L.t("allCountries")}</SelectItem>
              {LIVING_COUNTRIES.map((c) => <SelectItem key={c.iso} value={c.iso}>{c.name}</SelectItem>)}
              <SelectItem value="none">{L.t("notEntered")}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label={L.t("sortBy")}>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-11 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="amount_desc">{L.t("mostOwedFirst")}</SelectItem>
              <SelectItem value="months_desc">{L.t("mostMonthsFirst")}</SelectItem>
              <SelectItem value="name">{L.t("nameAZ")}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <LoadState L={L} query={query}>
        {data && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Tile state="not_paid" label={L.t("membersWhoOwe")} value={data.members_with_dues} />
              <Tile state="not_paid" label={L.t("totalDue")} value={L.money(data.total_amount_due)} sub={L.t("monthCount", { n: data.total_months_due })} />
            </div>
            <ExportButtons
              L={L}
              audit={{ report: "dues", filters: params, rows_exported: rows.length }}
              disabled={!rows.length}
              onPdf={() => downloadPdf(doc(), fileName)}
              onPrint={async () => printDocument(doc())}
              onExcel={() => downloadExcel({
                filename: fileName,
                sheetName: L.t("duesTitle"),
                titleLines: [data.organisation, L.t("duesTitle"), filterLine, `${L.t("madeOn")}: ${L.date(new Date().toISOString())}`],
                columns,
                rows: tableRows(),
                stateKey: "amount",
                totals: { name: L.t("total"), months: data.total_months_due, amount: data.total_amount_due },
              })}
              onCsv={async () => downloadCsv({ filename: fileName, columns, rows: tableRows() })}
            />
            {rows.length === 0 ? (
              <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center text-lg font-semibold text-emerald-800">✓ {L.t("nothingFound")}</p>
            ) : (
              <ul className="space-y-2">
                {rows.map((r) => (
                  <li key={r.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <button type="button" onClick={() => onOpenMember(r.id)} className="min-w-0 text-left">
                        <p className="truncate text-base font-bold text-slate-900">{r.name}</p>
                        <p className="text-sm text-slate-500">{formatMemberId(r.member_code)}{r.phone ? ` · ${r.phone}` : ""}</p>
                      </button>
                      <div className="text-right">
                        <p className="text-xl font-bold tabular-nums text-rose-700">{L.money(r.amount_due)}</p>
                        <p className="text-sm font-medium text-rose-700">✕ {L.t("monthCount", { n: r.months_due })}</p>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {r.paid_up_to || !r.last_paid_month ? L.t("paidUpTo") : L.t("lastMonthPaid")}:{" "}
                      <b>{r.paid_up_to ? L.month(r.paid_up_to) : r.last_paid_month ? L.month(r.last_paid_month) : L.t("nothingPaidYet")}</b>
                      {" · "}{L.t("monthsNotPaid")}: {L.monthList(r.due_months)}
                      {r.monthly_amount <= 0 && <span className="ml-1 font-semibold text-amber-700">({L.t("feeNotSet")})</span>}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="h-9 gap-1.5 border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50" onClick={() => remind(r)} disabled={!r.phone && !r.whatsapp_phone} title={!r.phone && !r.whatsapp_phone ? L.t("noPhone") : undefined}>
                        <MessageCircle className="h-4 w-4" />{L.t("remind")}
                      </Button>
                      <Button size="sm" variant="outline" className="h-9 gap-1 bg-white" onClick={() => onOpenMember(r.id)}>
                        {L.t("openStatement")}<ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </LoadState>
    </div>
  );
}

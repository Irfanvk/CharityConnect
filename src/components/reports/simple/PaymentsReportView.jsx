import React, { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { CalendarRange, Loader2, Search, X } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { format } from "@/lib/dateTime";
import { formatMemberId } from "@/lib/utils";
import { LIVING_COUNTRIES } from "@/lib/countries";
import { STATE_STYLE } from "@/lib/reportsI18n";
import { downloadCsv, downloadExcel, downloadPdf, printDocument } from "@/lib/reportFiles";
import { ExportButtons, LoadState, StateBadge, fetchAllPages } from "./ReportsShared";

const METHODS = ["cash", "upi", "bank_transfer", "cheque"];
const PAGE = 50;
const MAX_PDF_ROWS = 600;

function shiftMonth(month, n) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function rangeFor(when, from, to) {
  const now = format(new Date(), "yyyy-MM");
  const year = now.slice(0, 4);
  switch (when) {
    case "this_month": return [now, now];
    case "last_month": return [shiftMonth(now, -1), shiftMonth(now, -1)];
    case "this_year": return [`${year}-01`, `${year}-12`];
    case "last_year": return [`${Number(year) - 1}-01`, `${Number(year) - 1}-12`];
    case "custom": return [from || "", to || ""];
    default: return ["", ""];
  }
}

function Field({ label, children, className = "" }) {
  return <div className={`space-y-1 ${className}`}><Label className="text-sm text-slate-600">{label}</Label>{children}</div>;
}

function YearChartDialog({ L, open, onOpenChange }) {
  const { toast } = useToast();
  const thisYear = Number(format(new Date(), "yyyy"));
  const years = [];
  for (let y = thisYear; y >= 2024; y--) years.push(String(y));
  const [year, setYear] = useState(String(thisYear));
  const [busy, setBusy] = useState(null);

  const run = (kind) => async () => {
    setBusy(kind);
    try {
      const grid = await charityClient.reports.yearGrid({ year });
      const name = `${L.t("yearGridTitle")}-${year}`;
      const legend = [
        { state: "paid", label: L.t("paid") }, { state: "waiting", label: L.t("waiting") },
        { state: "not_paid", label: L.t("notPaid") }, { state: "before_join", label: L.t("beforeJoin") },
      ];
      if (kind === "excel") {
        await downloadExcel({
          filename: name,
          sheetName: `${L.t("yearGridTitle")} ${year}`,
          titleLines: [grid.organisation, `${L.t("yearGridTitle")} ${year}`, `${L.t("madeOn")}: ${L.date(new Date().toISOString())}`],
          columns: [
            { key: "name", label: L.t("member"), width: 26 },
            { key: "code", label: L.t("memberId"), width: 12 },
            ...grid.months.map((m) => ({ key: m, label: L.monthOnly(m), width: 7 })),
            { key: "paid", label: L.t("paid"), width: 8, type: "number" },
            { key: "due", label: L.t("notPaid"), width: 10, type: "number" },
          ],
          rows: grid.rows.map((r) => ({
            name: r.name,
            code: formatMemberId(r.member_code),
            ...Object.fromEntries(grid.months.map((m, i) => [m, STATE_STYLE[r.months[i]]?.icon || ""])),
            _cellStates: Object.fromEntries(grid.months.map((m, i) => [m, r.months[i]])),
            paid: r.paid,
            due: r.due,
          })),
        });
      } else {
        await downloadPdf({
          org: grid.organisation,
          title: `${L.t("yearGridTitle")} ${year}`,
          madeOn: `${L.t("madeOn")}: ${L.date(new Date().toISOString())}`,
          landscape: true,
          legend,
          sections: [{
            columns: [
              { key: "name", label: L.t("member"), width: "27%" },
              ...grid.months.map((m) => ({ key: m, label: L.monthOnly(m), align: "center" })),
              { key: "due", label: L.t("notPaid"), align: "right" },
            ],
            rows: grid.rows.map((r) => ({
              cells: {
                name: `${r.name} (${formatMemberId(r.member_code)})`,
                ...Object.fromEntries(grid.months.map((m, i) => [m, STATE_STYLE[r.months[i]]?.icon || ""])),
                due: String(r.due),
              },
              cellStates: Object.fromEntries(grid.months.map((m, i) => [m, r.months[i]])),
            })),
          }],
        }, name);
      }
      onOpenChange(false);
    } catch (error) {
      toast({ title: L.t("fileFailed"), description: error?.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{L.t("yearChartPdf")}</DialogTitle></DialogHeader>
        <p className="-mt-2 text-sm text-slate-600">{L.t("chooseYear")}</p>
        <div className="grid grid-cols-3 gap-2">
          {years.map((y) => (
            <Button key={y} variant={year === y ? "default" : "outline"} className={year === y ? "bg-emerald-600 hover:bg-emerald-700" : ""} onClick={() => setYear(y)}>{y}</Button>
          ))}
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={run("excel")} disabled={Boolean(busy)}>
            {busy === "excel" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{L.t("excel")}
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={run("pdf")} disabled={Boolean(busy)}>
            {busy === "pdf" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{L.t("downloadPdf")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PaymentsReportView({ L, onOpenMember, initialCampaign = null }) {
  const [when, setWhen] = useState(initialCampaign ? "all" : "this_year");
  const [fromMonth, setFromMonth] = useState("");
  const [toMonth, setToMonth] = useState("");
  const [type, setType] = useState(initialCampaign ? "campaign" : "all");
  const [state, setState] = useState("all");
  const [campaign, setCampaign] = useState(initialCampaign ? String(initialCampaign) : "all");
  const [country, setCountry] = useState("all");
  const [method, setMethod] = useState("all");
  const [sort, setSort] = useState("month_desc");
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [gridOpen, setGridOpen] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setSearch(text.trim()), 350);
    return () => clearTimeout(id);
  }, [text]);

  const [monthFrom, monthTo] = rangeFor(when, fromMonth, toMonth);
  const params = useMemo(() => ({
    sort,
    ...(type !== "all" ? { type } : {}),
    ...(state !== "all" ? { state } : {}),
    ...(campaign !== "all" ? { campaign_id: campaign } : {}),
    ...(country !== "all" ? { country } : {}),
    ...(method !== "all" ? { method } : {}),
    ...(monthFrom ? { month_from: monthFrom } : {}),
    ...(monthTo ? { month_to: monthTo } : {}),
    ...(search ? { search } : {}),
  }), [sort, type, state, campaign, country, method, monthFrom, monthTo, search]);

  const { data: campaigns = [] } = useQuery({
    queryKey: ["reports", "campaign-options"],
    queryFn: () => charityClient.campaigns.list({ limit: 200 }),
    staleTime: 5 * 60 * 1000,
  });

  const feed = useInfiniteQuery({
    queryKey: ["reports", "payments", params],
    queryFn: ({ pageParam }) => charityClient.reports.payments({ ...params, skip: pageParam, limit: PAGE }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last?.has_more ? last.skip + last.items.length : undefined),
  });
  const pages = feed.data?.pages || [];
  const first = pages[0];
  const items = pages.flatMap((p) => p.items || []);
  const totals = first?.totals;

  const whenLabel = {
    this_month: L.t("thisMonth"), last_month: L.t("lastMonth"), this_year: L.t("thisYear"),
    last_year: L.t("lastYear"), all: L.t("allTime"),
    custom: `${fromMonth ? L.month(fromMonth) : "…"} – ${toMonth ? L.month(toMonth) : "…"}`,
  }[when];
  const filterLine = [
    `${L.t("when")}: ${whenLabel}${when !== "all" && when !== "custom" && monthFrom ? ` (${L.month(monthFrom)}${monthTo !== monthFrom ? ` – ${L.month(monthTo)}` : ""})` : ""}`,
    type !== "all" ? (type === "monthly" ? L.t("monthlyFeeType") : L.t("donation")) : null,
    state !== "all" ? L.stateLabel(state) : null,
    campaign !== "all" ? campaigns.find((c) => String(c.id) === campaign)?.title : null,
    country !== "all" ? `${L.t("livesIn")}: ${country === "none" ? L.t("notEntered") : LIVING_COUNTRIES.find((c) => c.iso === country)?.name}` : null,
    method !== "all" ? L.method(method) : null,
    search ? `${L.t("search")}: ${search}` : null,
  ].filter(Boolean).join(" · ");

  const activeFilters = [type !== "all", state !== "all", campaign !== "all", country !== "all", method !== "all", Boolean(search), when !== "this_year"].filter(Boolean).length;
  const clearAll = () => {
    setWhen("this_year"); setFromMonth(""); setToMonth(""); setType("all"); setState("all");
    setCampaign("all"); setCountry("all"); setMethod("all"); setText(""); setSearch("");
  };

  // PDFs are pictures of each page; beyond a few hundred rows they get slow and huge.
  const checkPdfSize = () => {
    if ((first?.total || 0) > MAX_PDF_ROWS) throw new Error(L.t("tooManyForPdf", { n: first.total }));
  };
  const forWhat = (p) => (p.type === "monthly" ? L.month(p.month) : p.campaign || L.t("donation"));
  const loadAll = async () => fetchAllPages((page) => charityClient.reports.payments({ ...params, ...page }));
  const columns = [
    { key: "member", label: L.t("member"), width: 24 },
    { key: "code", label: L.t("memberId"), width: 12 },
    { key: "type", label: L.t("type"), width: 14 },
    { key: "for", label: L.t("paidFor"), width: 18 },
    { key: "amount", label: L.t("amount"), width: 12, type: "money" },
    { key: "status", label: L.t("status"), width: 16 },
    { key: "date", label: L.t("date"), width: 14 },
    { key: "method", label: L.t("paidBy"), width: 14 },
    { key: "phone", label: L.t("phone"), width: 16 },
    { key: "reference", label: L.t("reference"), width: 16 },
    { key: "note", label: L.t("note"), width: 24 },
  ];
  const toRows = (list) => list.map((p) => ({
    _state: p.state,
    member: p.member_name,
    code: formatMemberId(p.member_code),
    type: p.type === "monthly" ? L.t("monthlyFeeType") : L.t("donation"),
    for: forWhat(p),
    amount: p.amount,
    status: L.stateLabel(p.state),
    date: p.paid_on ? L.date(p.paid_on) : L.date(p.created_on),
    method: p.method ? L.method(p.method) : "",
    phone: p.phone || "",
    reference: p.reference || "",
    note: p.note || "",
  }));
  const fileName = `${L.t("paymentsTitle")}-${monthFrom || "all"}${monthTo && monthTo !== monthFrom ? `-${monthTo}` : ""}`;
  const tilesFor = (t) => [
    { state: "paid", label: L.t("paid"), value: L.money(t.paid.amount), sub: String(t.paid.count) },
    { state: "waiting", label: L.t("waitingShort"), value: L.money(t.waiting.amount), sub: String(t.waiting.count) },
    { state: "not_paid", label: L.t("notPaid"), value: L.money(t.not_paid.amount), sub: String(t.not_paid.count) },
    { state: "rejected", label: L.t("rejected"), value: L.money(t.rejected.amount), sub: String(t.rejected.count) },
  ];
  const buildDoc = (all) => ({
    org: all.organisation,
    title: L.t("paymentsTitle"),
    subtitle: filterLine,
    madeOn: `${L.t("madeOn")}: ${L.date(new Date().toISOString())}`,
    tiles: tilesFor(all.totals),
    sections: [{
      columns: [
        { key: "member", label: L.t("member"), width: "24%" },
        { key: "code", label: L.t("memberId"), width: "11%" },
        { key: "for", label: L.t("paidFor"), width: "17%" },
        { key: "amount", label: L.t("amount"), align: "right", width: "12%" },
        { key: "status", label: L.t("status"), width: "18%" },
        { key: "date", label: L.t("date"), width: "18%" },
      ],
      rows: toRows(all.items).map((r) => ({ state: r._state, cells: { ...r, amount: L.money(r.amount) } })),
      empty: L.t("nothingFound"),
    }],
  });

  return (
    <div className="space-y-4">
      {/* Filters first, then the numbers, then download */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={L.t("searchMember")} aria-label={L.t("search")} className="h-11 bg-white pl-9" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={L.t("when")}>
            <Select value={when} onValueChange={setWhen}>
              <SelectTrigger className="h-11 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="this_month">{L.t("thisMonth")}</SelectItem>
                <SelectItem value="last_month">{L.t("lastMonth")}</SelectItem>
                <SelectItem value="this_year">{L.t("thisYear")}</SelectItem>
                <SelectItem value="last_year">{L.t("lastYear")}</SelectItem>
                <SelectItem value="all">{L.t("allTime")}</SelectItem>
                <SelectItem value="custom">{L.t("chooseMonths")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={L.t("status")}>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger className="h-11 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{L.t("all")}</SelectItem>
                <SelectItem value="paid">✓ {L.t("paid")}</SelectItem>
                <SelectItem value="waiting">⏳ {L.t("waiting")}</SelectItem>
                <SelectItem value="not_paid">✕ {L.t("notPaid")}</SelectItem>
                <SelectItem value="rejected">✕ {L.t("rejected")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={L.t("type")}>
            <Select value={type} onValueChange={(v) => { setType(v); if (v === "monthly") setCampaign("all"); }}>
              <SelectTrigger className="h-11 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{L.t("allTypes")}</SelectItem>
                <SelectItem value="monthly">{L.t("monthlyFeeType")}</SelectItem>
                <SelectItem value="campaign">{L.t("donation")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={L.t("campaign")}>
            <Select value={campaign} onValueChange={(v) => { setCampaign(v); if (v !== "all") setType("campaign"); }}>
              <SelectTrigger className="h-11 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{L.t("allCampaigns")}</SelectItem>
                {campaigns.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}
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
          <Field label={L.t("paidBy")}>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="h-11 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{L.t("allMethods")}</SelectItem>
                {METHODS.map((m) => <SelectItem key={m} value={m}>{L.method(m)}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label={L.t("sortBy")}>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="h-11 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="month_desc">{L.t("newestFirst")}</SelectItem>
                <SelectItem value="month_asc">{L.t("oldestFirst")}</SelectItem>
                <SelectItem value="amount_desc">{L.t("biggestFirst")}</SelectItem>
                <SelectItem value="member">{L.t("nameAZ")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {activeFilters > 0 && (
            <div className="flex items-end">
              <Button variant="ghost" onClick={clearAll} className="h-11 gap-1 text-slate-600"><X className="h-4 w-4" />{L.t("clear")}</Button>
            </div>
          )}
        </div>
        {when === "custom" && (
          <div className="flex flex-wrap items-end gap-3">
            <Field label={L.t("from")}><Input type="month" value={fromMonth} max={toMonth || undefined} onChange={(e) => setFromMonth(e.target.value)} className="h-11 w-44 bg-white" /></Field>
            <Field label={L.t("to")}><Input type="month" value={toMonth} min={fromMonth || undefined} onChange={(e) => setToMonth(e.target.value)} className="h-11 w-44 bg-white" /></Field>
          </div>
        )}
        <p className="text-xs text-slate-500">{L.t("filtersUsed")}: {filterLine}</p>
      </div>

      <LoadState L={L} query={feed}>
        {first && (
          <>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {tilesFor(totals).map((tile) => {
                const key = { [L.t("paid")]: "paid", [L.t("waitingShort")]: "waiting", [L.t("notPaid")]: "not_paid", [L.t("rejected")]: "rejected" }[tile.label];
                const s = STATE_STYLE[tile.state];
                const on = state === key;
                return (
                  <button
                    key={tile.state}
                    type="button"
                    onClick={() => setState(on ? "all" : key)}
                    className={`rounded-xl border p-3 text-left transition ${on ? "ring-2 ring-offset-1" : "hover:shadow-sm"}`}
                    style={{ background: s.bg, borderColor: s.border, color: s.fg, "--tw-ring-color": s.fg }}
                    aria-pressed={on}
                  >
                    <p className="text-sm font-semibold">{s.icon} {tile.label}</p>
                    <p className="text-xl font-bold tabular-nums">{tile.value}</p>
                    <p className="text-xs opacity-80">{L.t("count")}: {tile.sub}</p>
                  </button>
                );
              })}
            </div>

            <ExportButtons
              L={L}
              audit={{ report: "payments", filters: params, rows_exported: first.total }}
              disabled={!first.total}
              onExcel={async () => {
                const all = await loadAll();
                const rows = toRows(all.items);
                const paidRows = all.items.filter((p) => p.state === "paid");
                await downloadExcel({
                  filename: fileName,
                  sheetName: L.t("paymentsTitle"),
                  titleLines: [all.organisation, L.t("paymentsTitle"), `${L.t("filtersUsed")}: ${filterLine}`, `${L.t("madeOn")}: ${L.date(new Date().toISOString())}`,
                    tilesFor(all.totals).map((t) => `${t.label}: ${t.value} (${t.sub})`).join(" · ")],
                  columns,
                  rows,
                  totals: { member: `${L.t("paid")} (${L.t("total")})`, amount: paidRows.reduce((a, p) => a + p.amount, 0) },
                });
              }}
              onCsv={async () => { const all = await loadAll(); downloadCsv({ filename: fileName, columns, rows: toRows(all.items) }); }}
              onPdf={async () => { checkPdfSize(); const all = await loadAll(); await downloadPdf(buildDoc(all), fileName); }}
              onPrint={async () => { checkPdfSize(); const all = await loadAll(); printDocument(buildDoc(all)); }}
              extra={(
                <Button type="button" variant="outline" className="h-11 gap-2 bg-white" onClick={() => setGridOpen(true)}>
                  <CalendarRange className="h-5 w-5" />{L.t("yearChartPdf")}
                </Button>
              )}
            />

            {items.length === 0 ? (
              <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500">{L.t("nothingFound")}</p>
            ) : (
              <>
                <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  {items.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                      <button type="button" onClick={() => onOpenMember(p.member_id)} className="min-w-0 text-left">
                        <p className="truncate font-semibold text-slate-900">{p.member_name}</p>
                        <p className="text-xs text-slate-500">
                          {formatMemberId(p.member_code)} · {p.type === "monthly" ? L.t("monthlyFeeType") : L.t("donation")}: <b>{forWhat(p)}</b>
                          {p.paid_on && <> · {L.date(p.paid_on)}</>}
                          {p.method && <> · {L.method(p.method)}</>}
                        </p>
                      </button>
                      <span className="flex items-center gap-2">
                        <span className="tabular-nums font-bold text-slate-800">{L.money(p.amount)}</span>
                        <StateBadge state={p.state} label={L.stateLabel(p.state)} />
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col items-center gap-1">
                  <p className="text-sm text-slate-500">{L.t("showing", { n: items.length, total: first.total })}</p>
                  {feed.hasNextPage && (
                    <Button variant="outline" onClick={() => feed.fetchNextPage()} disabled={feed.isFetchingNextPage} className="h-11">
                      {feed.isFetchingNextPage && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{L.t("loadMore")}
                    </Button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </LoadState>

      <YearChartDialog L={L} open={gridOpen} onOpenChange={setGridOpen} />
    </div>
  );
}

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertCircle, UserRound } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { formatMemberId } from "@/lib/utils";
import { STATE_STYLE } from "@/lib/reportsI18n";
import { downloadExcel, downloadPdf, printDocument, shareOnWhatsApp } from "@/lib/reportFiles";
import { ExportButtons, LoadState, MemberPicker, StateBadge, Tile } from "./ReportsShared";

/** "Paid up to Oct 2026", or "Last month paid: Oct 2026" when earlier months are missing. */
function paidLine(L, totals, long = false) {
  const fmt = long ? L.longMonth : L.month;
  if (totals.paid_up_to) return [L.t("paidUpTo"), fmt(totals.paid_up_to)];
  if (totals.last_paid_month) return [L.t("lastMonthPaid"), fmt(totals.last_paid_month)];
  return [L.t("paidUpTo"), L.t("nothingPaidYet")];
}

const sum = (rows, state) => {
  const picked = rows.filter((r) => r.state === state);
  return { n: picked.length, amount: picked.reduce((a, r) => a + Number(r.amount || 0), 0) };
};

function rowState(row, currentMonth) {
  if (row.ahead && row.state === "paid") return "paid";
  if (row.state === "not_paid" && row.month > currentMonth) return "future";
  return row.state;
}

/** Everything the screen and the files need, for the chosen year (or all years). */
function useStatementView(data, year) {
  return useMemo(() => {
    if (!data) return null;
    const rows = year === "all" ? data.months : data.months.filter((r) => r.month.startsWith(year));
    return {
      rows,
      paid: sum(rows, "paid"),
      waiting: sum(rows, "waiting"),
      due: sum(rows.filter((r) => r.month <= data.current_month), "not_paid"),
      years: [...new Set(data.months.map((r) => r.month.slice(0, 4)))].sort().reverse(),
    };
  }, [data, year]);
}

function buildDoc(L, data, view, year) {
  const m = data.member;
  const period = year === "all" ? `${L.month(data.from_month)} – ${L.month(data.to_month)}` : year;
  return {
    org: data.organisation,
    title: L.t("statementTitle"),
    subtitle: `${m.name} · ${formatMemberId(m.member_code)}`,
    madeOn: `${L.t("madeOn")}: ${L.date(data.generated_on)}`,
    info: [
      [L.t("member"), m.name],
      [L.t("memberId"), formatMemberId(m.member_code)],
      [L.t("phone"), m.phone || "—"],
      [L.t("livesIn"), [m.city, m.country_name].filter(Boolean).join(", ") || "—"],
      [L.t("monthlyFee"), m.monthly_amount > 0 ? L.money(m.monthly_amount) : L.t("feeNotSet")],
      [L.t("joined"), L.date(m.join_date)],
      [L.t("period"), period],
      paidLine(L, data.totals),
    ],
    tiles: [
      { state: "paid", label: L.t("paid"), value: L.money(view.paid.amount), sub: L.t("monthCount", { n: view.paid.n }) },
      { state: "waiting", label: L.t("waitingShort"), value: L.money(view.waiting.amount), sub: L.t("monthCount", { n: view.waiting.n }) },
      { state: "not_paid", label: L.t("amountDue"), value: L.money(view.due.amount), sub: L.t("monthCount", { n: view.due.n }) },
    ],
    sections: [
      {
        heading: L.t("month"),
        columns: [
          { key: "month", label: L.t("month"), width: "18%" },
          { key: "status", label: L.t("status"), width: "24%" },
          { key: "amount", label: L.t("amount"), align: "right", width: "16%" },
          { key: "date", label: L.t("date"), width: "18%" },
          { key: "method", label: L.t("paidBy"), width: "24%" },
        ],
        rows: view.rows.map((r) => {
          const state = rowState(r, data.current_month);
          return {
            state,
            cells: {
              month: L.month(r.month),
              status: r.ahead ? L.t("paidAhead") : L.stateLabel(state),
              amount: L.money(r.amount),
              date: r.paid_on ? L.date(r.paid_on) : r.handed_in_on ? L.date(r.handed_in_on) : "",
              method: r.method ? L.method(r.method) : r.note || "",
            },
          };
        }),
      },
      ...(data.donations.length ? [{
        heading: L.t("donations"),
        columns: [
          { key: "date", label: L.t("date"), width: "16%" },
          { key: "campaign", label: L.t("campaign"), width: "50%" },
          { key: "status", label: L.t("status"), width: "18%" },
          { key: "amount", label: L.t("amount"), align: "right", width: "16%" },
        ],
        rows: data.donations.map((d) => ({
          state: d.state,
          cells: { date: L.date(d.date), campaign: d.campaign, status: L.stateLabel(d.state), amount: L.money(d.amount) },
        })),
      }] : []),
    ],
    legend: [
      { state: "paid", label: L.t("paid") },
      { state: "waiting", label: L.t("waiting") },
      { state: "not_paid", label: L.t("notPaid") },
    ],
  };
}

function MonthBox({ L, row, currentMonth }) {
  const state = rowState(row, currentMonth);
  const s = STATE_STYLE[state];
  return (
    <div
      className="flex min-h-[4.5rem] flex-col items-center justify-center rounded-xl border p-1.5 text-center"
      style={{ background: s.bg, borderColor: s.border, color: s.fg }}
      title={`${L.longMonth(row.month)} · ${L.stateLabel(state)} · ${L.money(row.amount)}`}
    >
      <span className="text-xs font-semibold">{L.monthOnly(row.month)}</span>
      <span aria-hidden className="text-xl leading-6">{s.icon || "·"}</span>
      <span className="text-[11px] tabular-nums">{state === "future" ? "" : L.money(row.amount)}</span>
    </div>
  );
}

export default function MemberStatementView({ L, memberId, onPickMember }) {
  const [year, setYear] = useState("all");
  const query = useQuery({
    queryKey: ["reports", "statement", memberId],
    queryFn: () => charityClient.reports.memberStatement(memberId),
    enabled: Boolean(memberId),
  });
  const data = query.data;
  const view = useStatementView(data, year);

  if (!memberId) {
    return (
      <div className="mx-auto max-w-xl space-y-3">
        <p className="flex items-center gap-2 text-lg font-semibold text-slate-800"><UserRound className="h-6 w-6 text-emerald-600" />{L.t("memberCard")}</p>
        <MemberPicker L={L} onPick={(m) => { setYear("all"); onPickMember(m.id); }} autoFocus />
      </div>
    );
  }

  const fileName = data ? `${L.t("statementTitle")}-${data.member.member_code}-${data.member.name}` : "statement";
  const doc = data && view ? buildDoc(L, data, view, year) : null;
  const m = data?.member;

  const excel = () => downloadExcel({
    filename: fileName,
    sheetName: L.t("statementTitle"),
    titleLines: [
      data.organisation,
      `${L.t("statementTitle")}: ${m.name} (${formatMemberId(m.member_code)})`,
      `${L.t("phone")}: ${m.phone || "—"} · ${L.t("monthlyFee")}: ${m.monthly_amount > 0 ? L.money(m.monthly_amount) : L.t("feeNotSet")} · ${L.t("joined")}: ${L.date(m.join_date)}`,
      `${L.t("period")}: ${year === "all" ? `${L.month(data.from_month)} – ${L.month(data.to_month)}` : year} · ${L.t("madeOn")}: ${L.date(data.generated_on)}`,
      `${L.t("paid")}: ${L.money(view.paid.amount)} (${view.paid.n}) · ${L.t("waitingShort")}: ${L.money(view.waiting.amount)} (${view.waiting.n}) · ${L.t("amountDue")}: ${L.money(view.due.amount)} (${view.due.n})`,
    ],
    columns: [
      { key: "month", label: L.t("month"), width: 14 },
      { key: "status", label: L.t("status"), width: 22 },
      { key: "amount", label: L.t("amount"), width: 14, type: "money" },
      { key: "date", label: L.t("date"), width: 16 },
      { key: "method", label: L.t("paidBy"), width: 18 },
      { key: "note", label: L.t("note"), width: 30 },
    ],
    rows: view.rows.map((r) => {
      const state = rowState(r, data.current_month);
      return {
        _state: state,
        month: L.month(r.month),
        status: r.ahead ? L.t("paidAhead") : L.stateLabel(state),
        amount: r.amount,
        date: r.paid_on ? L.date(r.paid_on) : r.handed_in_on ? L.date(r.handed_in_on) : "",
        method: r.method ? L.method(r.method) : "",
        note: r.note || "",
      };
    }),
    totals: { month: L.t("amountDue"), amount: view.due.amount },
    extraSheets: data.donations.length ? [{
      sheetName: L.t("donation"),
      titleLines: [data.organisation, `${L.t("donations")}: ${m.name}`],
      columns: [
        { key: "date", label: L.t("date"), width: 16 },
        { key: "campaign", label: L.t("campaign"), width: 30 },
        { key: "status", label: L.t("status"), width: 16 },
        { key: "amount", label: L.t("amount"), width: 14, type: "money" },
      ],
      rows: data.donations.map((d) => ({ _state: d.state, date: L.date(d.date), campaign: d.campaign, status: L.stateLabel(d.state), amount: d.amount })),
      totals: { campaign: L.t("total"), amount: data.donations_total },
    }] : [],
  });

  const shareText = data && L.t("shareText", {
    org: data.organisation,
    title: L.t("statementTitle"),
    name: m.name,
    code: formatMemberId(m.member_code),
    paidUpTo: paidLine(L, data.totals)[1],
    months: data.totals.months_due ? L.monthList(data.totals.due_months) : "0",
    amount: L.money(data.totals.amount_due),
  });

  return (
    <LoadState L={L} query={query}>
      {data && view && (
        <div className="space-y-4">
          {/* Who */}
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700">
                {m.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xl font-bold text-slate-900">{m.name}</p>
                <p className="text-sm text-slate-600">{formatMemberId(m.member_code)}{m.phone ? ` · ${m.phone}` : ""}</p>
                <p className="text-sm text-slate-600">
                  {L.t("monthlyFee")}: <b>{m.monthly_amount > 0 ? L.money(m.monthly_amount) : L.t("feeNotSet")}</b>
                  {" · "}{L.t("joined")}: {L.date(m.join_date)}
                  {(m.city || m.country_name) && <> · {[m.city, m.country_name].filter(Boolean).join(", ")}</>}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => onPickMember(null)} className="bg-white">{L.t("changeMember")}</Button>
          </div>

          {/* The answer in one line */}
          {data.totals.months_due === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
              <CheckCircle2 className="h-8 w-8 shrink-0" />
              <p className="text-lg font-semibold">{paidLine(L, data.totals, true).join(": ")}</p>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
              <AlertCircle className="h-8 w-8 shrink-0" />
              <div>
                <p className="text-lg font-semibold">{L.t("amountDue")}: {L.money(data.totals.amount_due)}</p>
                <p className="text-sm">
                  {L.t("monthsNotPaid")}: {L.monthList(data.totals.due_months)}
                  {data.totals.this_month_due && ` (${L.t("includesThisMonth")})`}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Tile state="paid" label={L.t("paid")} value={L.money(view.paid.amount)} sub={L.t("monthCount", { n: view.paid.n })} />
            <Tile state="waiting" label={L.t("waitingShort")} value={L.money(view.waiting.amount)} sub={L.t("monthCount", { n: view.waiting.n })} />
            <Tile state="not_paid" label={L.t("amountDue")} value={L.money(view.due.amount)} sub={L.t("monthCount", { n: view.due.n })} />
          </div>
          <p className="text-sm text-slate-600">
            {paidLine(L, data.totals)[0]}: <b>{paidLine(L, data.totals)[1]}</b>
            {data.totals.last_payment_on && <> · {L.t("lastPayment")}: <b>{L.date(data.totals.last_payment_on)}</b></>}
          </p>

          <ExportButtons
            L={L}
            audit={{ report: "member_statement", member_id: m.id, member_code: m.member_code, year }}
            onPdf={() => downloadPdf(doc, fileName)}
            onWhatsApp={() => shareOnWhatsApp({ doc, filename: fileName, text: shareText, phone: m.whatsapp_phone || m.phone })}
            onPrint={async () => printDocument(doc)}
            onExcel={excel}
          />

          {/* Years */}
          {view.years.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {["all", ...view.years].map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setYear(y)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${year === y ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                >
                  {y === "all" ? L.t("allYears") : y}
                </button>
              ))}
            </div>
          )}

          {/* Month boxes, one row of 12 per year (6 on phones) */}
          {view.years.filter((y) => year === "all" || y === year).map((y) => {
            const rows = view.rows.filter((r) => r.month.startsWith(y));
            if (!rows.length) return null;
            return (
              <section key={y} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="mb-2 text-base font-bold text-slate-800">{y}</p>
                <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-12">
                  {rows.map((r) => <MonthBox key={r.month} L={L} row={r} currentMonth={data.current_month} />)}
                </div>
              </section>
            );
          })}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span>{L.t("legend")}:</span>
            <StateBadge state="paid" label={L.t("paid")} />
            <StateBadge state="waiting" label={L.t("waiting")} />
            <StateBadge state="not_paid" label={L.t("notPaid")} />
          </div>

          {/* Details list */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <ul className="divide-y divide-slate-100">
              {[...view.rows].reverse().map((r) => {
                const state = rowState(r, data.current_month);
                return (
                  <li key={r.month} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{L.longMonth(r.month)}</p>
                      <p className="text-xs text-slate-500">
                        {r.paid_on && <>{L.date(r.paid_on)}{r.method ? ` · ${L.method(r.method)}` : ""}</>}
                        {r.handed_in_on && <>{L.t("waitingNote")} · {L.date(r.handed_in_on)}</>}
                        {r.note && <span className="text-rose-700"> {r.note}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums font-semibold text-slate-800">{state === "future" ? "" : L.money(r.amount)}</span>
                      <StateBadge state={state} label={r.ahead ? L.t("paidAhead") : L.stateLabel(state)} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Donations */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-base font-bold text-slate-800">{L.t("donations")}</p>
            {data.donations.length === 0 ? (
              <p className="text-sm text-slate-500">{L.t("noDonations")}</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.donations.map((d, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 py-2">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-800">{d.campaign}</span>
                      <span className="text-xs text-slate-500">{L.date(d.date)}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="tabular-nums font-semibold">{L.money(d.amount)}</span>
                      <StateBadge state={d.state} label={L.stateLabel(d.state)} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </LoadState>
  );
}

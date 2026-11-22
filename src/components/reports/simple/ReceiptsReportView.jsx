import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2, Receipt, Search } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import ReceiptDialog from "@/components/challans/ReceiptDialog";
import { receiptDate, receiptWhat } from "@/components/challans/ReceiptCard";

/*
 * Reports -> Receipts: every approved payment's receipt, newest first. Search (number,
 * member, reference, month), dates received, type, how it was paid and the checking admin's
 * code. Open any receipt to download or share it; download the list as Excel.
 */

const PAGE = 50;
const METHOD = { upi: "UPI", bank_transfer: "Bank transfer", cash: "Cash", cheque: "Cheque", other: "Other" };
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function ReceiptsReportView() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [kind, setKind] = useState("all");
  const [method, setMethod] = useState("all");
  const [checkedBy, setCheckedBy] = useState("all");
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { const t = setTimeout(() => setTerm(search.trim()), 350); return () => clearTimeout(t); }, [search]);
  useEffect(() => setShown(PAGE), [term, from, to, kind, method, checkedBy]);

  const filters = {
    ...(term ? { search: term } : {}),
    ...(from ? { date_from: from } : {}),
    ...(to ? { date_to: to } : {}),
    ...(kind !== "all" ? { kind } : {}),
    ...(method !== "all" ? { method } : {}),
    ...(checkedBy !== "all" ? { checked_by: checkedBy } : {}),
  };
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["receipts", "list", filters, shown],
    queryFn: () => charityClient.receipts.list({ ...filters, limit: shown }),
    keepPreviousData: true,
  });
  const items = data?.items || [];

  const exportExcel = async () => {
    setExporting(true);
    try {
      const all = [];
      for (let skip = 0; skip < (data?.total || 0); skip += 500) {
        const page = await charityClient.receipts.list({ ...filters, skip, limit: 500 });
        all.push(...(page?.items || []));
      }
      const { default: ExcelJS } = await import("exceljs");
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Receipts");
      ws.columns = [
        { header: "Receipt no.", key: "number", width: 16 }, { header: "Date received", key: "date", width: 14 },
        { header: "Member ID", key: "code", width: 12 }, { header: "Member", key: "name", width: 26 },
        { header: "For", key: "what", width: 40 }, { header: "Amount (₹)", key: "amount", width: 12 },
        { header: "Paid by", key: "method", width: 14 }, { header: "Reference", key: "ref", width: 20 },
        { header: "Checked by", key: "by", width: 11 },
      ];
      ws.getRow(1).font = { bold: true };
      all.forEach((r) => ws.addRow({
        number: r.number, date: r.date || "", code: r.member_code || "", name: r.member_name || "",
        what: receiptWhat(r), amount: Number(r.received_amount ?? r.amount ?? 0),
        method: METHOD[r.payment_method] || r.payment_method || "", ref: r.transaction_ref || "", by: r.checked_by ? `admin (${r.checked_by})` : "",
      }));
      ws.getColumn("amount").numFmt = "#,##0.00";
      ws.addRow({});
      ws.addRow({ what: "Total", amount: data?.total_amount || 0 }).font = { bold: true };
      const buf = await wb.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `Receipts${from || to ? ` ${from || "start"} to ${to || "today"}` : ""}.xlsx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      toast({ title: "Could not make the Excel file", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9"
            placeholder="Search receipt no., member, reference or month" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="space-y-1"><Label htmlFor="rc-from" className="text-xs">Received from</Label>
            <Input id="rc-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="rc-to" className="text-xs">to</Label>
            <Input id="rc-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Type</Label>
            <Select value={kind} onValueChange={setKind}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="monthly">Monthly fee</SelectItem><SelectItem value="campaign">Donations</SelectItem></SelectContent>
            </Select></div>
          <div className="space-y-1"><Label className="text-xs">Paid by</Label>
            <Select value={method} onValueChange={setMethod}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Any</SelectItem>{Object.entries(METHOD).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="space-y-1"><Label className="text-xs">Checked by</Label>
            <Select value={checkedBy} onValueChange={setCheckedBy}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Any admin</SelectItem>{(data?.checked_by_codes || []).map((c) => <SelectItem key={c} value={c}>admin ({c})</SelectItem>)}</SelectContent>
            </Select></div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          {isLoading ? "Loading…" : `${data?.total || 0} receipt${data?.total === 1 ? "" : "s"} · ${inr(data?.total_amount)}`}
          {isFetching && !isLoading && <Loader2 className="ml-2 inline h-4 w-4 animate-spin" />}
        </p>
        <Button variant="outline" onClick={exportExcel} disabled={exporting || !data?.total} className="h-10 gap-2 bg-white">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Download Excel
        </Button>
      </div>

      {!isLoading && items.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">No receipts match.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((r) => (
            <li key={`${r.kind}-${r.challan_id || r.bulk_group_id}`}>
              <button type="button" onClick={() => setOpen(r.bulk_group_id ? { bulkGroupId: r.bulk_group_id } : { challanId: r.challan_id })}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm hover:border-emerald-300">
                <Receipt className="h-5 w-5 shrink-0 text-emerald-600" />
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-xs text-slate-500">{r.number} · {receiptDate(r.date)}{r.checked_by ? ` · checked by admin (${r.checked_by})` : ""}</span>
                  <span className="block truncate font-semibold text-slate-900">{r.member_code} · {r.member_name}</span>
                  <span className="block truncate text-sm text-slate-600">
                    {receiptWhat(r)}{r.payment_method ? ` · ${METHOD[r.payment_method] || r.payment_method}` : ""}{r.transaction_ref ? ` · ${r.transaction_ref}` : ""}
                  </span>
                </span>
                <span className="shrink-0 font-bold tabular-nums text-slate-900">{inr(r.received_amount ?? r.amount)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {items.length < (data?.total || 0) && (
        <div className="text-center"><Button variant="outline" onClick={() => setShown((n) => n + PAGE)} className="h-11">Show more ({data.total - items.length})</Button></div>
      )}

      <ReceiptDialog target={open} onOpenChange={(v) => { if (!v) setOpen(null); }} isAdmin />
    </div>
  );
}

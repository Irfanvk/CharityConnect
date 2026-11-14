import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileDown, FileSpreadsheet, Loader2, MessageCircle, Printer, Search, X } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { formatMemberId } from "@/lib/utils";
import { REPORT_LANGUAGES, STATE_STYLE } from "@/lib/reportsI18n";

/** English / മലയാളം / ಕನ್ನಡ */
export function LanguageSwitch({ L }) {
  return (
    <div role="radiogroup" aria-label={L.t("language")} className="inline-flex rounded-full border border-slate-200 bg-white p-0.5 shadow-sm">
      {REPORT_LANGUAGES.map((lang) => {
        const on = L.lang === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => L.setLang(lang.code)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${on ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {lang.label}
          </button>
        );
      })}
    </div>
  );
}

/** A large picture button on the Reports home. */
export function BigButton({ icon: Icon, title, sub, tone, onClick }) {
  const tones = {
    emerald: "from-emerald-50 to-white border-emerald-200 text-emerald-700",
    sky: "from-sky-50 to-white border-sky-200 text-sky-700",
    rose: "from-rose-50 to-white border-rose-200 text-rose-700",
    violet: "from-violet-50 to-white border-violet-200 text-violet-700",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-4 rounded-2xl border bg-gradient-to-br p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${tones[tone]}`}
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
        <Icon className="h-8 w-8" />
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-bold text-slate-900">{title}</span>
        <span className="block text-sm text-slate-600">{sub}</span>
      </span>
    </button>
  );
}

/** ✓ Paid / ⏳ Waiting / ✕ Not paid */
export function StateBadge({ state, label, className = "" }) {
  const s = STATE_STYLE[state] || STATE_STYLE.future;
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold ${className}`}
      style={{ background: s.bg, color: s.fg, borderColor: s.border }}
    >
      {s.icon && <span aria-hidden>{s.icon}</span>}
      {label}
    </span>
  );
}

/** A number tile coloured like its state. */
export function Tile({ state, label, value, sub }) {
  const s = STATE_STYLE[state] || { bg: "#ffffff", fg: "#0f172a", border: "#e2e8f0", icon: "" };
  return (
    <div className="rounded-xl border p-3" style={{ background: s.bg, borderColor: s.border, color: s.fg }}>
      <p className="text-sm font-semibold">{s.icon && <span aria-hidden className="mr-1">{s.icon}</span>}{label}</p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs opacity-80">{sub}</p>}
    </div>
  );
}

/**
 * PDF / WhatsApp / Print / Excel buttons. Each action is async; the button shows a spinner and
 * errors become a toast in the chosen language.
 */
export function ExportButtons({ L, onPdf, onWhatsApp, onPrint, onExcel, onCsv, extra = null, disabled = false, audit = null }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(null);
  const run = (name, fn) => async () => {
    setBusy(name);
    try {
      const result = await fn();
      if (result === "fallback") toast({ title: L.t("whatsappFallback") });
      if (audit && result !== "cancelled") {
        // Recorded in Audit Logs as "Report generated"; never blocks the download.
        charityClient.auditLogs.create({
          action: "report_generated",
          entity_type: "Report",
          entity_id: audit.member_id || 0,
          details: { ...audit, format: name, language: L.lang },
        }).catch(() => {});
      }
    } catch (error) {
      toast({ title: L.t("fileFailed"), description: error?.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };
  const btn = (name, fn, Icon, label, cls) => fn && (
    <Button key={name} type="button" variant="outline" onClick={run(name, fn)} disabled={disabled || Boolean(busy)} className={`h-11 gap-2 bg-white ${cls}`}>
      {busy === name ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
      {label}
    </Button>
  );
  return (
    <div className="flex flex-wrap gap-2">
      {btn("pdf", onPdf, FileDown, L.t("downloadPdf"), "border-rose-200 text-rose-700 hover:bg-rose-50")}
      {btn("wa", onWhatsApp, MessageCircle, L.t("shareWhatsapp"), "border-emerald-300 text-emerald-700 hover:bg-emerald-50")}
      {btn("print", onPrint, Printer, L.t("print"), "border-slate-300 text-slate-700")}
      {btn("excel", onExcel, FileSpreadsheet, L.t("excel"), "border-green-300 text-green-800 hover:bg-green-50")}
      {btn("csv", onCsv, FileSpreadsheet, L.t("csv"), "border-slate-300 text-slate-600")}
      {extra}
      {busy && <span className="self-center text-sm text-slate-500">{L.t("makingFile")}</span>}
    </div>
  );
}

/** Search box that lists matching members; calls onPick(member). */
export function MemberPicker({ L, onPick, autoFocus = false }) {
  const [text, setText] = useState("");
  const [term, setTerm] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setTerm(text.trim()), 300);
    return () => clearTimeout(id);
  }, [text]);
  const { data = [], isFetching } = useQuery({
    queryKey: ["reports", "member-picker", term],
    queryFn: () => charityClient.members.list({ search: term, limit: 8, status: undefined }),
    enabled: term.length >= 1,
    staleTime: 30 * 1000,
  });
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <Input
          value={text}
          autoFocus={autoFocus}
          onChange={(e) => setText(e.target.value)}
          placeholder={L.t("searchMember")}
          aria-label={L.t("searchMember")}
          className="h-12 bg-white pl-11 pr-10 text-base"
        />
        {text && (
          <button type="button" onClick={() => setText("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600" aria-label={L.t("clear")}>
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {term && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {isFetching && !data.length ? (
            <p className="flex items-center gap-2 p-3 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />{L.t("loading")}</p>
          ) : data.length === 0 ? (
            <p className="p-3 text-sm text-slate-500">{L.t("noMemberFound")}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => onPick(m)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-base font-bold text-emerald-700">
                      {String(m.full_name || m.username || "?").charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-900">{m.full_name || m.username}</span>
                      <span className="block truncate text-sm text-slate-500">
                        {formatMemberId(m.member_code)}{m.phone ? ` · ${m.phone}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function LoadState({ L, query, children }) {
  if (query.isLoading) {
    return <p className="flex items-center justify-center gap-2 py-12 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />{L.t("loading")}</p>;
  }
  if (query.isError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
        <p className="font-medium">{L.t("loadError")}</p>
        {query.error?.message && <p className="text-sm opacity-80">{query.error.message}</p>}
        <Button size="sm" variant="outline" className="mt-2 bg-white" onClick={() => query.refetch()}>{L.t("tryAgain")}</Button>
      </div>
    );
  }
  return children;
}

/** Fetches every page of a paged endpoint (for exports). */
export async function fetchAllPages(fetchPage, pageSize = 500, max = 20000) {
  const items = [];
  let first = null;
  for (let skip = 0; skip < max; skip += pageSize) {
    const page = await fetchPage({ skip, limit: pageSize });
    if (!first) first = page;
    items.push(...(page.items || []));
    if (!page.has_more) break;
  }
  return { ...first, items };
}

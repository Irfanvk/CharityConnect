import { STATE_STYLE } from "@/lib/reportsI18n";

/*
 * Files for the Reports page: PDF, print, Excel and WhatsApp sharing.
 *
 * A report is described once as a "document" (title, info lines, number tiles, tables) and
 * then drawn as HTML pages. PDFs are pictures of those pages (html2canvas + jsPDF), so
 * Malayalam and Kannada letters come out exactly as the phone draws them; jsPDF's own text
 * drawing cannot join those letters correctly.
 *
 * document = {
 *   org, title, subtitle, madeOn,
 *   info: [[label, value], ...],
 *   tiles: [{ label, value, sub, state }],
 *   sections: [{ heading, columns: [{ key, label, align, width }], rows: [{ cells: {key: text}, state, stateKey }] }],
 *   legend: [{ state, label }],
 *   landscape: bool,
 * }
 */

const PAGE = { portrait: [794, 1123], landscape: [1123, 794] };
const ROW_H = 28; // every table row is drawn exactly this tall (see tableHtml)
const FONT = `"Noto Sans", "Noto Sans Malayalam", "Noto Sans Kannada", "Nirmala UI", "Segoe UI", Roboto, Arial, sans-serif`;

const esc = (value) =>
  String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/*
 * Status colours fill the whole table cell. html2canvas draws text inside rounded "pill"
 * labels lower than the pill itself, so pills looked cut in half in the PDF.
 */
function stateTd(state, text, align = "left") {
  const s = STATE_STYLE[state];
  return `<td style="text-align:${align};padding:0 8px;height:${ROW_H}px;line-height:18px;vertical-align:middle;background:${s.bg};color:${s.fg};font-weight:700;border-bottom:2px solid #fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:0">${s.icon ? `${s.icon}&nbsp;` : ""}${esc(text)}</td>`;
}

function legendHtml(items) {
  if (!items?.length) return "";
  const cells = items.map((l) => {
    const s = STATE_STYLE[l.state];
    return `<td style="padding:0 10px;height:24px;line-height:18px;vertical-align:middle;background:${s.bg};color:${s.fg};font-weight:700;white-space:nowrap;border:2px solid #fff">${s.icon ? `${s.icon}&nbsp;` : ""}${esc(l.label)}</td>`;
  }).join("");
  return `<table style="border-collapse:collapse;font-size:10.5px;margin-top:8px"><tr>${cells}</tr></table>`;
}

function headerHtml(doc, pageNo, pageCount) {
  if (pageNo > 1) {
    return `<div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:10px">
      <span>${esc(doc.org)} · ${esc(doc.title)}${doc.subtitle ? ` · ${esc(doc.subtitle)}` : ""}</span><span>${pageNo} / ${pageCount}</span></div>`;
  }
  const info = (doc.info || []).filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `<div><span style="color:#64748b">${esc(k)}:</span> <b>${esc(v)}</b></div>`).join("");
  const tiles = (doc.tiles || []).map((tile) => {
    const s = STATE_STYLE[tile.state] || { bg: "#f8fafc", fg: "#0f172a", border: "#e2e8f0", icon: "" };
    return `<div style="flex:1;min-width:0;border:1px solid ${s.border};background:${s.bg};border-radius:10px;padding:8px 10px">
      <div style="font-size:11px;color:${s.fg};font-weight:600">${s.icon ? `${s.icon} ` : ""}${esc(tile.label)}</div>
      <div style="font-size:19px;font-weight:700;color:${s.fg};margin-top:2px">${esc(tile.value)}</div>
      ${tile.sub ? `<div style="font-size:10.5px;color:${s.fg};opacity:.85">${esc(tile.sub)}</div>` : ""}</div>`;
  }).join("");
  return `<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #059669;padding-bottom:8px;margin-bottom:10px">
      <div><div style="font-size:13px;color:#047857;font-weight:700">${esc(doc.org)}</div>
      <div style="font-size:20px;font-weight:800;color:#0f172a;margin-top:2px">${esc(doc.title)}</div>
      ${doc.subtitle ? `<div style="font-size:12px;color:#475569;margin-top:2px">${esc(doc.subtitle)}</div>` : ""}</div>
      <div style="text-align:right;font-size:10.5px;color:#64748b">${esc(doc.madeOn || "")}<br/>${pageNo} / ${pageCount}</div></div>
    ${info ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 16px;font-size:12px;margin-bottom:10px">${info}</div>` : ""}
    ${tiles ? `<div style="display:flex;gap:8px;margin-bottom:12px">${tiles}</div>` : ""}`;
}

function tableHtml(section, rows, showHeading) {
  const cols = section.columns;
  const head = cols.map((c) => `<th style="text-align:${c.align || "left"};padding:5px 6px;background:#ecfdf5;color:#065f46;font-size:11px;border-bottom:1px solid #a7f3d0;${c.width ? `width:${c.width};` : ""}">${esc(c.label)}</th>`).join("");
  const body = rows.map((row, i) => `<tr style="height:${ROW_H}px;background:${i % 2 ? "#f8fafc" : "#fff"}">${cols.map((c) => {
    const text = row.cells[c.key];
    const cellState = row.cellStates?.[c.key];
    if (cellState && STATE_STYLE[cellState]) {
      const s = STATE_STYLE[cellState];
      return `<td style="text-align:center;padding:0 2px;border:1px solid #fff;background:${s.bg};color:${s.fg};font-weight:700;height:${ROW_H}px;line-height:18px">${esc(text)}</td>`;
    }
    if (row.state && STATE_STYLE[row.state] && c.key === (row.stateKey || "status")) return stateTd(row.state, text, c.align);
    const content = esc(text);
    return `<td style="text-align:${c.align || "left"};padding:0 6px;border-bottom:1px solid #f1f5f9;height:${ROW_H}px;line-height:18px;vertical-align:middle;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:0">${content}</td>`;
  }).join("")}</tr>`).join("");
  return `${showHeading && section.heading ? `<div style="font-size:13px;font-weight:700;color:#0f172a;margin:6px 0 4px">${esc(section.heading)}</div>` : ""}
    <table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:11.5px;margin-bottom:8px">${head ? `<thead><tr>${head}</tr></thead>` : ""}<tbody>${body}</tbody></table>`;
}

/** Splits the document into pages; returns HTML strings, one per page. */
export function documentPages(doc) {
  const [, height] = doc.landscape ? PAGE.landscape : PAGE.portrait;
  const usable = height - 72 - 30; // page padding, plus room for the colour key
  // Generous estimates of the first page's heading, info lines and tiles, so tables never run off the page.
  const firstHeader = 130 + ((doc.info || []).length ? Math.ceil(doc.info.length / 2) * 20 + 14 : 0) + ((doc.tiles || []).length ? 96 : 0)
    + (doc.subtitle && doc.subtitle.length > 90 ? 16 : 0);
  const pages = [];
  let current = [];
  let budget = usable - firstHeader;
  const flush = () => { pages.push(current); current = []; budget = usable - 40; };

  for (const section of doc.sections || []) {
    let rows = section.rows.length ? section.rows : [{ cells: { [section.columns[0].key]: section.empty || "—" } }];
    let first = true;
    while (rows.length) {
      const overhead = (first && section.heading ? 30 : 0) + ROW_H + 14;
      const fit = Math.floor((budget - overhead) / ROW_H);
      if (fit < 2) { flush(); continue; }
      current.push({ section, rows: rows.slice(0, fit), showHeading: first });
      budget -= overhead + Math.min(fit, rows.length) * ROW_H;
      rows = rows.slice(fit);
      first = false;
      if (rows.length) flush();
    }
  }
  if (current.length || !pages.length) pages.push(current);

  const legend = legendHtml(doc.legend);
  return pages.map((segments, i) => {
    const [w, h] = doc.landscape ? PAGE.landscape : PAGE.portrait;
    return `<div style="width:${w}px;height:${h}px;box-sizing:border-box;padding:36px 40px;background:#fff;color:#0f172a;font-family:${FONT};position:relative;overflow:hidden">
      ${headerHtml(doc, i + 1, pages.length)}
      ${segments.map((s) => tableHtml(s.section, s.rows, s.showHeading)).join("")}
      ${i === pages.length - 1 ? legend : ""}
    </div>`;
  });
}

async function renderPagesToPdf(doc) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  const pages = documentPages(doc);
  const holder = document.createElement("div");
  holder.style.cssText = "position:fixed;left:-20000px;top:0;z-index:-1;";
  document.body.appendChild(holder);
  const orientation = doc.landscape ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "pt", format: "a4", compress: true });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  try {
    if (document.fonts?.ready) await document.fonts.ready;
    for (let i = 0; i < pages.length; i++) {
      holder.innerHTML = pages[i];
      const canvas = await html2canvas(holder.firstElementChild, { scale: 2, backgroundColor: "#ffffff", logging: false });
      if (i > 0) pdf.addPage("a4", orientation);
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pw, ph);
    }
  } finally {
    holder.remove();
  }
  return pdf.output("blob");
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const safeFileName = (text) =>
  String(text || "report").replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, "-").slice(0, 80);

export async function downloadPdf(doc, filename) {
  const blob = await renderPagesToPdf(doc);
  saveBlob(blob, `${safeFileName(filename)}.pdf`);
  return blob;
}

/** Opens the print dialog with the same pages. */
export function printDocument(doc) {
  const pages = documentPages(doc);
  const win = window.open("", "_blank");
  if (!win) throw new Error("Please allow pop-ups to print.");
  const [w, h] = doc.landscape ? PAGE.landscape : PAGE.portrait;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(doc.title)}</title>
    <style>@page{size:A4 ${doc.landscape ? "landscape" : "portrait"};margin:0}body{margin:0;background:#e2e8f0}
    .p{width:${w}px;height:${h}px;margin:12px auto;box-shadow:0 1px 4px rgba(0,0,0,.15);page-break-after:always;break-after:page}
    @media print{body{background:#fff}.p{margin:0;box-shadow:none}}</style></head>
    <body>${pages.map((p) => `<div class="p">${p}</div>`).join("")}
    <script>window.onload=function(){setTimeout(function(){window.focus();window.print();},300)}<\/script></body></html>`);
  win.document.close();
}

/**
 * Sends the PDF with WhatsApp where the phone allows sharing files; otherwise downloads the PDF
 * and opens WhatsApp with the short text. Returns "shared" | "fallback" | "cancelled".
 */
export async function shareOnWhatsApp({ doc, filename, text, phone }) {
  const blob = await renderPagesToPdf(doc);
  const name = `${safeFileName(filename)}.pdf`;
  const file = typeof File !== "undefined" ? new File([blob], name, { type: "application/pdf" }) : null;
  if (file && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text, title: doc.title });
      return "shared";
    } catch (error) {
      if (error?.name === "AbortError") return "cancelled";
    }
  }
  saveBlob(blob, name);
  openWhatsAppText(text, phone);
  return "fallback";
}

/** wa.me link with the text; to the member's number when known. */
export function openWhatsAppText(text, phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener");
}

/**
 * A formatted Excel file: title lines, a coloured header row, money as ₹ numbers,
 * a coloured status column, frozen header, filter buttons and a totals row.
 * columns: [{ key, label, width, type: "money" | "text" | "number" }]
 * rows: [{ key: value, ..., _state }]
 */
export async function downloadExcel({ filename, sheetName, titleLines = [], columns, rows, totals, stateKey = "status", extraSheets = [] }) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "CharityHub";
  wb.created = new Date();

  const addSheet = (name, lines, cols, data, totalRow) => {
    const ws = wb.addWorksheet(String(name).slice(0, 31) || "Report");
    lines.forEach((line, i) => {
      const row = ws.addRow([line]);
      row.font = i === 0 ? { bold: true, size: 14, color: { argb: "FF047857" } } : { size: 11, color: { argb: "FF475569" } };
      ws.mergeCells(row.number, 1, row.number, Math.max(cols.length, 1));
    });
    if (lines.length) ws.addRow([]);
    const header = ws.addRow(cols.map((c) => c.label));
    header.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF059669" } };
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = { bottom: { style: "thin", color: { argb: "FF047857" } } };
    });
    header.height = 22;
    const headerRow = header.number;
    data.forEach((item) => {
      const row = ws.addRow(cols.map((c) => {
        const v = item[c.key];
        if (c.type === "money" || c.type === "number") return v === "" || v === null || v === undefined ? null : Number(v);
        return v ?? "";
      }));
      cols.forEach((c, i) => {
        const cell = row.getCell(i + 1);
        if (c.type === "money") cell.numFmt = "₹#,##0.00";
        if (c.key === stateKey && item._state && STATE_STYLE[item._state]) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: STATE_STYLE[item._state].excel } };
          cell.font = { bold: true, color: { argb: `FF${STATE_STYLE[item._state].fg.slice(1)}` } };
        }
        if (item._cellStates?.[c.key] && STATE_STYLE[item._cellStates[c.key]]) {
          const s = STATE_STYLE[item._cellStates[c.key]];
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: s.excel } };
          cell.font = { color: { argb: `FF${s.fg.slice(1)}` }, bold: true };
          cell.alignment = { horizontal: "center" };
        }
      });
    });
    if (totalRow) {
      const row = ws.addRow(cols.map((c) => totalRow[c.key] ?? ""));
      row.font = { bold: true };
      row.eachCell((cell, i) => {
        cell.border = { top: { style: "thin", color: { argb: "FF94A3B8" } } };
        if (cols[i - 1]?.type === "money") cell.numFmt = "₹#,##0.00";
      });
    }
    cols.forEach((c, i) => { ws.getColumn(i + 1).width = c.width || Math.max(10, String(c.label).length + 4); });
    ws.views = [{ state: "frozen", ySplit: headerRow }];
    if (data.length) ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow + data.length, column: cols.length } };
    ws.pageSetup = { orientation: cols.length > 8 ? "landscape" : "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
  };

  addSheet(sheetName, titleLines, columns, rows, totals);
  extraSheets.forEach((s) => addSheet(s.sheetName, s.titleLines || [], s.columns, s.rows, s.totals));
  const buffer = await wb.xlsx.writeBuffer();
  saveBlob(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${safeFileName(filename)}.xlsx`);
}

/** Plain CSV (opens in any spreadsheet; UTF-8 with BOM so Malayalam/Kannada show correctly). */
export function downloadCsv({ filename, columns, rows }) {
  const line = (values) => values.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",");
  const text = [line(columns.map((c) => c.label)), ...rows.map((r) => line(columns.map((c) => r[c.key])))].join("\r\n");
  saveBlob(new Blob([`﻿${text}`], { type: "text/csv;charset=utf-8" }), `${safeFileName(filename)}.csv`);
}

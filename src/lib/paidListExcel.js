/*
 * "Traditional" yearly paid list in Excel, as the committee keeps it by hand
 * (Membership Collection Report): blue band with the committee name and a yellow rounded
 * "Membership Collection Report - 2025/2026" box (a picture, as Excel shapes cannot be made
 * here), yellow header, rows alternating light gold / white, ✓ for paid months.
 *
 * Columns: SI. NO. (member's number) | NAME & ADDRESS | Monthly Donation | AUG … JULY |
 * Total Received Month | Total Amount Received | Pending Months | Pending Amount |
 * one column per campaign given to that year | Total Campaigns | Grand Total.
 * The last row "Received Amount (Net Total)" sums every money column.
 * Paid months hold "P" in Wingdings 2 (shows as ✓) so =COUNTIF(…,"P") works as in their sheet;
 * W (waiting for approval) and "-" (before joining) are in Calibri.
 */

const BLUE = "FF0070C0";
const YELLOW = "FFFFFF00";
const GOLD = "FFFFF2CC";        // theme accent 4, 80% lighter (odd rows)
const WHITE = "FFFFFFFF";       // even rows
const GREEN_LIGHT = "FFE2EFDA"; // totals columns / month header
const GREEN_MID = "FFC6E0B4";   // net total row
const ROSE = "FFFCE4D6";        // pending columns
const MONTHS = ["AUG", "SEP", "OCT", "NOV", "DEC", "JAN", "FEB", "MAR", "APR", "MAY", "JUNE", "JULY"];

const fill = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const thin = { style: "thin" };
const box = { top: thin, left: thin, bottom: thin, right: thin };
const calibri = (size, bold = true) => ({ name: "Calibri", size, bold, color: { argb: "FF000000" } });

function colName(n) {
  let s = "";
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  return s;
}

/** The yellow rounded title box as a PNG (2x for sharp printing). */
async function titleBoxPng(text, width, height) {
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  const r = height / 2.6;
  ctx.beginPath();
  ctx.moveTo(r, 1);
  ctx.arcTo(width - 1, 1, width - 1, height - 1, r);
  ctx.arcTo(width - 1, height - 1, 1, height - 1, r);
  ctx.arcTo(1, height - 1, 1, 1, r);
  ctx.arcTo(1, 1, width - 1, 1, r);
  ctx.closePath();
  ctx.fillStyle = "#FFFF00";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#D6C700";
  ctx.stroke();
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let size = Math.round(height * 0.46);
  const fontFor = (px) => `bold ${px}px "Bahnschrift SemiBold Condensed", "Bahnschrift", "Arial Narrow", Impact, sans-serif`;
  ctx.font = fontFor(size);
  while (ctx.measureText(text).width > width * 0.9 && size > 12) { size -= 1; ctx.font = fontFor(size); }
  ctx.fillText(text, width / 2, height / 2 + 1);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  return new Uint8Array(await blob.arrayBuffer());
}

export async function downloadPaidListExcel(data) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "POYYATHABAIL JAMA'ATH GCC COMMITTEE";
  const ws = wb.addWorksheet(`Collection ${data.label}`.slice(0, 31), { views: [{ showGridLines: true }] });

  const campaigns = data.campaigns || [];
  // A SI | B name | C monthly | D..O months | P months paid | Q amount | R pending months | S pending amount
  const PEND_M = 18;
  const PEND_A = 19;
  const firstCamp = 20;
  const lastCamp = firstCamp + campaigns.length - 1;
  const totalCampCol = campaigns.length ? lastCamp + 1 : null;
  const grandCol = campaigns.length ? lastCamp + 2 : null;
  const lastCol = grandCol || PEND_A;

  const widths = [10.86, 53.43, 13.43, ...Array(11).fill(7.86), 7.43, 9.86, 15.43, 9.86, 13.43];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  campaigns.forEach((_, i) => { ws.getColumn(firstCamp + i).width = 14; });
  if (totalCampCol) { ws.getColumn(totalCampCol).width = 14; ws.getColumn(grandCol).width = 15.43; }

  // ── Blue band, rows 1-12, with the committee name ──
  const bandHeights = { 1: 18.75, 2: 18.75, 3: 36, 4: 36, 5: 36, 6: 18.75 };
  for (let r = 1; r <= 12; r++) {
    ws.getRow(r).height = bandHeights[r] || 15;
    for (let c = 1; c <= lastCol; c++) ws.getCell(r, c).fill = fill(BLUE);
  }
  ws.mergeCells(2, 2, 4, 15);
  Object.assign(ws.getCell(2, 2), {
    value: "POYYATHABAIL  JAMA'ATH\nGCC COMMITTEE ",
    font: { name: "Arial Black", size: 28, bold: true, color: { argb: "FFFFFFFF" } },
    alignment: { horizontal: "center", vertical: "bottom", wrapText: true },
    fill: fill(BLUE),
  });
  // Yellow rounded box over rows 5-11, columns B-O
  const boxWidth = 1150;
  const boxHeight = 115;
  const png = await titleBoxPng(`Membership Collection Report - ${data.label.replace("-", "/")}`, boxWidth, boxHeight);
  const imageId = wb.addImage({ buffer: png, extension: "png" });
  ws.addImage(imageId, { tl: { col: 1.15, row: 4.55 }, ext: { width: boxWidth, height: boxHeight }, editAs: "oneCell" });

  // ── Header rows 13-14 ──
  const h1 = 13;
  const h2 = 14;
  ws.getRow(h1).height = 40.5;
  ws.getRow(h2).height = campaigns.length ? 48 : 24.75;
  const head = (col, text, size, color = YELLOW) => {
    ws.mergeCells(h1, col, h2, col);
    Object.assign(ws.getCell(h1, col), {
      value: text, font: calibri(size), fill: fill(color), border: box,
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
    });
  };
  head(1, "SI. NO.", 18);
  head(2, "NAME & ADDRESS", 18);
  head(3, "Monthly\nDonation", 16);
  ws.mergeCells(h1, 4, h1, 15);
  Object.assign(ws.getCell(h1, 4), {
    value: `Monthly Payments - ${data.label}`, font: calibri(18), fill: fill(YELLOW), border: box,
    alignment: { horizontal: "center", vertical: "middle" },
  });
  MONTHS.forEach((m, i) => Object.assign(ws.getCell(h2, 4 + i), {
    value: m, font: calibri(14), fill: fill(GREEN_LIGHT), border: box, alignment: { horizontal: "center", vertical: "middle" },
  }));
  head(16, "Total\nReceived\nMonth", 12);
  head(17, "Total\nAmount\nReceived", 16);
  head(PEND_M, "Pending\nMonths", 12);
  head(PEND_A, "Pending\nAmount", 16);
  if (campaigns.length) {
    if (campaigns.length > 1) ws.mergeCells(h1, firstCamp, h1, lastCamp);
    Object.assign(ws.getCell(h1, firstCamp), {
      value: `Campaigns - ${data.label}`, font: calibri(campaigns.length > 1 ? 18 : 12), fill: fill(YELLOW), border: box,
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
    });
    campaigns.forEach((cmp, i) => Object.assign(ws.getCell(h2, firstCamp + i), {
      value: cmp.title, font: calibri(11), fill: fill(GREEN_LIGHT), border: box,
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
    }));
    head(totalCampCol, "Total\nCampaigns", 14);
    head(grandCol, "Grand\nTotal", 16);
  }

  // ── One row per member, alternating light gold / white ──
  const first = 15;
  data.rows.forEach((r, idx) => {
    const n = first + idx;
    const band = idx % 2 === 0 ? GOLD : WHITE;
    ws.getRow(n).height = 18.75;
    const set = (col, value, { font = calibri(14), color = band, align, numFmt } = {}) => {
      const c = ws.getCell(n, col);
      c.value = value;
      c.font = font;
      c.fill = fill(color);
      c.border = box;
      c.alignment = { horizontal: align, vertical: "middle" };
      if (numFmt) c.numFmt = numFmt;
    };
    set(1, r.member_number ?? r.member_code, { align: "center" });
    set(2, `${r.name}${r.status && r.status !== "active" ? " (inactive)" : ""}`, { font: calibri(14, false) });
    set(3, r.monthly_amount || 0, { numFmt: "0.00" });
    r.months.forEach((mark, i) => {
      const font = mark === "P" ? { name: "Wingdings 2", size: 14, bold: true, charset: 2, color: { argb: "FF000000" } } : calibri(14);
      set(4 + i, mark || null, { align: "center", font });
    });
    set(16, { formula: `COUNTIF(D${n}:O${n},"P")` }, { align: "center", color: GREEN_LIGHT });
    // The fee changed during this year: months x fee would be wrong, so write the real sums.
    set(17, r.fee_varies ? r.received_amount : { formula: `SUM(P${n}*C${n})` }, { color: GREEN_LIGHT, numFmt: "0.00" });
    set(PEND_M, r.pending_months || 0, { align: "center", color: ROSE });
    set(PEND_A, r.fee_varies ? r.pending_amount : { formula: `SUM(${colName(PEND_M)}${n}*C${n})` }, { color: ROSE, numFmt: "0.00" });
    if (campaigns.length) {
      campaigns.forEach((cmp, i) => {
        const amount = r.campaigns?.[String(cmp.id)];
        set(firstCamp + i, amount ? Number(amount) : null, { numFmt: "0.00" });
      });
      set(totalCampCol, { formula: `SUM(${colName(firstCamp)}${n}:${colName(lastCamp)}${n})` }, { color: GREEN_LIGHT, numFmt: "0.00" });
      set(grandCol, { formula: `SUM(Q${n}+${colName(totalCampCol)}${n})` }, { color: GREEN_LIGHT, numFmt: "0.00" });
    }
  });

  // ── Received Amount (Net Total) ──
  const last = first + data.rows.length - 1;
  const tot = last + 1;
  ws.getRow(tot).height = 23.25;
  ws.getCell(tot, 1).border = box;
  ws.mergeCells(tot, 2, tot, 3);
  Object.assign(ws.getCell(tot, 2), { fill: fill(GREEN_MID), border: box });
  ws.mergeCells(tot, 4, tot, 16);
  Object.assign(ws.getCell(tot, 4), {
    value: "Received Amount (Net Total)", font: { name: "Calibri", size: 14, bold: true },
    fill: fill(GREEN_MID), alignment: { horizontal: "right", vertical: "middle" }, border: box,
  });
  const sumCell = (col, numFmt = "0.00", color = GREEN_MID) => Object.assign(ws.getCell(tot, col), {
    value: { formula: `SUM(${colName(col)}${first}:${colName(col)}${last})` },
    font: calibri(16), fill: fill(color), border: box, numFmt, alignment: { horizontal: numFmt === "0" ? "center" : undefined, vertical: "middle" },
  });
  sumCell(17);
  sumCell(PEND_M, "0", ROSE);
  sumCell(PEND_A, "0.00", ROSE);
  if (campaigns.length) {
    campaigns.forEach((_, i) => sumCell(firstCamp + i));
    sumCell(totalCampCol);
    sumCell(grandCol);
  }

  ws.pageSetup = {
    orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9,
    horizontalCentered: true, margins: { left: 0.2, right: 0.2, top: 0.3, bottom: 0.3, header: 0, footer: 0 },
    printArea: `A1:${colName(lastCol)}${tot}`, printTitlesRow: "13:14",
  };

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Membership Collection Report ${data.label}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

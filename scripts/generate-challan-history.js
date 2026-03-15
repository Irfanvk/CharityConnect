/**
 * Generates challan_history_monthly.csv from member_import.csv.
 * - All active members get rows from their join month through the current month.
 * - Honorary / zero-amount members (monthly_amount = 0) are skipped.
 * - Member #150 (monthly_amount = 50000) is flagged as REVIEW and skipped.
 * - All generated rows default to status: approved.
 *   BEFORE IMPORTING: change rows to "pending" for months the member has NOT yet paid.
 *
 * Usage: node scripts/generate-challan-history.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ─────────────────────────────────────────────────────────────────
const MEMBER_CSV  = join(__dirname, '../public/files/member_import.csv');
const OUTPUT_CSV  = join(__dirname, '../public/files/challan_history_monthly.csv');
const ORG_START   = '2024-08';   // organisation started August 2024
const END_MONTH   = '2026-02';   // last fully-completed month (adjust as needed)
const DEFAULT_STATUS       = 'approved';
const DEFAULT_PAYMENT_METHOD = 'cash';
const DEFAULT_NOTES         = 'Imported from 2024-2025 records';
// ────────────────────────────────────────────────────────────────────────────

/** Parse YYYY-MM into {year, month} */
function parseYM(ym) {
  const [y, m] = ym.split('-').map(Number);
  return { year: y, month: m };
}

/** All YYYY-MM strings from startYM inclusive to endYM inclusive */
function monthRange(startYM, endYM) {
  const months = [];
  let { year: y, month: m } = parseYM(startYM);
  const { year: ey, month: em } = parseYM(endYM);
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

/** Determine starting month for a member given join_year from CSV */
function memberStartMonth(joinYear) {
  const jy = parseInt(joinYear, 10);
  if (!jy || isNaN(jy)) return ORG_START;
  // If join year is 2024 → org start (Aug 2024); 2025 or later → Jan of that year
  if (jy <= 2024) return ORG_START;
  return `${jy}-01`;
}

// ── Read member CSV ─────────────────────────────────────────────────────────
const lines = readFileSync(MEMBER_CSV, 'utf8').split('\n').filter(Boolean);
const header = lines[0].split(','); // si_no,full_name,username,monthly_amount,status,join_year,notes
const members = lines.slice(1).map(line => {
  // Handle quoted fields (e.g., notes with commas)
  const cols = [];
  let cur = '', inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { cols.push(cur); cur = ''; }
    else cur += ch;
  }
  cols.push(cur);
  return {
    si_no:          cols[0]?.trim(),
    full_name:      cols[1]?.trim(),
    username:       cols[2]?.trim(),
    monthly_amount: parseFloat(cols[3]) || 0,
    status:         cols[4]?.trim(),
    join_year:      cols[5]?.trim(),
    notes:          cols[6]?.trim() || '',
  };
});

// ── Generate rows ────────────────────────────────────────────────────────────
const outRows = ['challan_id,username,si_no,type,month,amount,status,payment_method,notes'];
let rowId = 1;
const skipped = [];

for (const m of members) {
  // Skip zero-amount (honorary) members
  if (m.monthly_amount === 0) {
    skipped.push(`SI ${m.si_no} (${m.username}) — honorary / 0 amount`);
    continue;
  }
  // Skip flagged review members (extreme amounts)
  if (m.monthly_amount >= 10000) {
    skipped.push(`SI ${m.si_no} (${m.username}) — REVIEW: monthly_amount=${m.monthly_amount} — not imported automatically`);
    continue;
  }

  const start  = memberStartMonth(m.join_year);
  const months = monthRange(start, END_MONTH);

  for (const mon of months) {
    outRows.push(
      [rowId, m.username, m.si_no, 'monthly', mon, m.monthly_amount, DEFAULT_STATUS, DEFAULT_PAYMENT_METHOD, DEFAULT_NOTES].join(',')
    );
    rowId++;
  }
}

writeFileSync(OUTPUT_CSV, outRows.join('\n') + '\n', 'utf8');

console.log(`\n✅  Generated: ${OUTPUT_CSV}`);
console.log(`   Rows written : ${rowId - 1}`);
console.log(`   Members processed : ${members.length - skipped.length} / ${members.length}`);
if (skipped.length) {
  console.log(`\n⚠️  Skipped (${skipped.length}):`);
  skipped.forEach(s => console.log(`   • ${s}`));
}
console.log(`\n📌  Next steps:
   1. Review this file.
   2. Change status from "approved" → "pending" for any months the member has NOT actually paid yet.
   3. Import via Members page → "Import Challan History".`);

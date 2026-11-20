"""Read the committee's year sheets (SI, name, monthly donation, AUG..JULY with P) into JSON.

Usage: python -I cash-sheet-to-json.py <sheet.xlsx> <out.json>
Each sheet must be named like 2024-2025; rows start under the AUG..JULY header.
"""
import json
import re
import sys

import openpyxl

src, out = sys.argv[1], sys.argv[2]
wb = openpyxl.load_workbook(src, data_only=True)
members, odd = {}, []
for ws in wb.worksheets:
    m = re.match(r"^\s*(\d{4})\s*-\s*(\d{4})\s*$", ws.title)
    if not m:
        print("  Skipped sheet (name is not a year like 2024-2025):", ws.title)
        continue
    y = int(m.group(1))
    months = [f"{y}-{mo:02d}" for mo in range(8, 13)] + [f"{y + 1}-{mo:02d}" for mo in range(1, 8)]
    header = None
    for r in range(1, 40):
        if str(ws.cell(r, 4).value or "").strip().upper() == "AUG":
            header = r
            break
    if header is None:
        raise SystemExit(f"  Sheet {ws.title}: could not find the AUG..JULY header row.")
    count = 0
    for row in ws.iter_rows(min_row=header + 1, values_only=True):
        si, name, fee = row[0], row[1], row[2]
        if not isinstance(si, (int, float)) or not name:
            continue
        si = int(si)
        rec = members.setdefault(si, {"si": si, "name": str(name).strip(), "fees": {}, "paid": []})
        rec["fees"][ws.title] = float(fee or 0)
        for i, month in enumerate(months):
            v = row[3 + i]
            s = str(v).strip().upper() if v is not None else ""
            if s == "P":
                rec["paid"].append(month)
            elif s:
                odd.append(f"{ws.title} SI {si} {month}: '{v}'")
        count += 1
    print(f"  Sheet {ws.title}: {count} members")
with open(out, "w", encoding="utf-8") as f:
    json.dump({"members": list(members.values()), "odd": odd}, f, ensure_ascii=False)
print(f"  Paid months marked: {sum(len(m['paid']) for m in members.values())}; unusual cells: {len(odd)}")

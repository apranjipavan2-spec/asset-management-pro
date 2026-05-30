"""
Patch the user-edited "Assets Merged - Master + Assigned.xlsx":
  1. Add `Asset Name (from Assignment)` column (joined by Asset Code).
  2. Fill the 8 rows where `Asset Code (from Assignment)` is populated but
     `Assigned to` is blank, by extracting the person name from
     `Current Location (from Assignment)`.
  3. Preserve every other sheet in the workbook as-is.

Run:
    python scripts/patch_merged_file.py
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd


BASE = Path(r"C:\Kalike\Asset\Asset New data\Mapping Final")
MERGED_FILE = BASE / "Assets Merged - Master + Assigned.xlsx"
ASSIGN_FILE = BASE / "Assets Assigned.xlsx"

# 8 rows to fix. Key = exact Asset Code (from Assignment) string as it appears
# in the merged file. Value = the cleaned Assigned-to name.
ASSIGNED_TO_FIXES = {
    "Kalike/Titan/TNKSP/HP Laptop/2024-25/03":   "Ashish",
    "Kalike/Titan/TNKSP/HP Laptop/2024-25/02":   "Joseph Johnson",
    "Kalike/Titan KGBVS/HP Laptop/2024-25/01":   "Rajavel",
    "Kalike/Titan KGBVS/HP Laptop/2024-25/03":   "Joseph Johnson",
    "Kalike/Titan KGBVS/HP Laptop/2024-25/02":   "Rishikesh",
    "Kalike/TEDT/ECE/HP Laptop/2025-26/07":      "Baedae",
    "Kalike/TEDT/ECE/HP Laptop/2025-26/05":      "Adele",
    "KALIKE/SDTT/HP Lasertank/2022-23/04":       "Yadgir Account Team",
}


def main() -> None:
    # Read every sheet so we can write them all back.
    xl = pd.ExcelFile(MERGED_FILE)
    sheets = {name: pd.read_excel(xl, name) for name in xl.sheet_names}

    merged = sheets["Merged"]

    # ---- 1. Add "Asset Name (from Assignment)" ----
    assign = pd.read_excel(ASSIGN_FILE)
    code_to_name: dict[str, str] = {}
    for _, r in assign.iterrows():
        code = r.get("Asset Code")
        name = r.get("Asset Name")
        if pd.isna(code) or pd.isna(name):
            continue
        code_to_name[str(code)] = str(name)

    def lookup_names(joined_codes) -> str:
        if joined_codes is None or (isinstance(joined_codes, float) and pd.isna(joined_codes)):
            return ""
        parts = [p.strip() for p in str(joined_codes).split("|")]
        names = []
        for p in parts:
            if not p:
                continue
            names.append(code_to_name.get(p, ""))
        return " | ".join(names) if any(names) else ""

    merged["Asset Name (from Assignment)"] = merged["Asset Code (from Assignment)"].map(lookup_names)

    # Place the new column right after "Description"
    cols = list(merged.columns)
    cols.remove("Asset Name (from Assignment)")
    insert_at = cols.index("Description") + 1
    cols.insert(insert_at, "Asset Name (from Assignment)")
    merged = merged[cols]

    # ---- 2. Fix 8 missing "Assigned to" entries ----
    fixed_count = 0
    for i, row in merged.iterrows():
        code = row.get("Asset Code (from Assignment)")
        if pd.isna(code):
            continue
        if pd.notna(row.get("Assigned to")) and str(row.get("Assigned to")).strip():
            continue
        # Match against the fix map (allow pipe-joined codes too)
        for raw_code, name in ASSIGNED_TO_FIXES.items():
            if raw_code in str(code):
                merged.at[i, "Assigned to"] = name
                fixed_count += 1
                break

    sheets["Merged"] = merged

    # ---- 3. Write everything back ----
    with pd.ExcelWriter(MERGED_FILE, engine="openpyxl") as writer:
        for name, df in sheets.items():
            df.to_excel(writer, sheet_name=name, index=False)

    # Report
    has_name = merged["Asset Name (from Assignment)"].astype(bool).sum()
    print(f"Added 'Asset Name (from Assignment)' — filled in {has_name} rows")
    print(f"Filled missing 'Assigned to' in {fixed_count} of {len(ASSIGNED_TO_FIXES)} target rows")
    print()
    print("Final column order:")
    for i, c in enumerate(merged.columns, 1):
        print(f"  {i:>2}. {c}")


if __name__ == "__main__":
    main()

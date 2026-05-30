"""
Disambiguate duplicate Standardized Asset IDs in the merged workbook.

The upstream standardizer collapsed physically distinct units onto the
same Standardized ID — most often when district info (BLR vs YDR, etc.)
got dropped during canonicalization. This script restores uniqueness so
the operational register can hold one row per physical unit.

Rules (applied to duplicates only — singletons untouched):
  1. If a duplicate group spans >1 district, append /<DistrictCode> to
     each row's Standardized ID  (e.g. ".../2012-13/01" → ".../2012-13/01/BLR")
  2. If after rule 1 there are still collisions (e.g. two rows in the
     same district), append a numeric suffix /v2, /v3, ...

After running, every Standardized ID is unique → import_merged_assets.cjs
will insert all rows (no skips). The Parent Asset ID (Finance) column is
untouched, so the FK link to asset_far is preserved.

Run:
    python scripts/dedupe_standardized_ids.py
"""

from __future__ import annotations

import re
from pathlib import Path
from collections import defaultdict

import pandas as pd

MERGED = Path(r"C:\Kalike\Asset\Asset New data\Mapping Final\Assets Merged - Master + Assigned.xlsx")

DISTRICT_CODES = {
    "Bangalore": "BLR",
    "Yadgir":    "YDR",
    "Hyderabad": "HYD",
    "Mumbai":    "MUM",
    "Chennai":   "CHE",
    "Delhi":     "DEL",
    "Pune":      "PUN",
}


def district_code(name) -> str:
    if name is None or (isinstance(name, float) and pd.isna(name)):
        return ""
    s = str(name).strip()
    if not s:
        return ""
    if s in DISTRICT_CODES:
        return DISTRICT_CODES[s]
    return re.sub(r"\W+", "", s.upper())[:3]


def main() -> None:
    xl = pd.ExcelFile(MERGED)
    sheets = {name: pd.read_excel(xl, name) for name in xl.sheet_names}
    merged = sheets["Merged"]

    counts = merged["Standardized Asset ID"].value_counts()
    dup_ids = set(counts[counts > 1].index)
    print(f"Duplicate StdId groups before: {len(dup_ids)}  ({int(counts[counts > 1].sum())} rows)")

    # Rule 1: append district code per row when ID is a duplicate.
    def with_district(row):
        std = row["Standardized Asset ID"]
        if pd.isna(std) or std not in dup_ids:
            return std
        code = district_code(row.get("District"))
        return f"{std}/{code}" if code else std

    merged["Standardized Asset ID"] = merged.apply(with_district, axis=1)

    # Rule 2: numeric suffix for any remaining collisions.
    seen = defaultdict(int)
    out = []
    for v in merged["Standardized Asset ID"]:
        if pd.isna(v):
            out.append(v); continue
        seen[v] += 1
        out.append(v if seen[v] == 1 else f"{v}/v{seen[v]}")
    merged["Standardized Asset ID"] = out

    after = merged["Standardized Asset ID"].value_counts()
    remaining = after[after > 1]
    print(f"Duplicate StdId groups after : {len(remaining)}  ({int(remaining.sum())} rows)")

    sheets["Merged"] = merged
    with pd.ExcelWriter(MERGED, engine="openpyxl") as writer:
        for name, df in sheets.items():
            df.to_excel(writer, sheet_name=name, index=False)

    # Report a few examples for sanity
    print()
    print("Sample disambiguated rows:")
    sample = merged[merged["Standardized Asset ID"].str.contains(r"/[A-Z]{3}$|/v\d+$", regex=True, na=False)].head(8)
    for _, r in sample.iterrows():
        print(f"  {r['Standardized Asset ID']}  | district={r.get('District')}  | parent={r.get('Parent Asset ID (Finance)')}")


if __name__ == "__main__":
    main()

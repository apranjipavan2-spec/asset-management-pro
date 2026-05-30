"""
Add Finance parent-asset linkage to the merged workbook.

Maps each row in "Assets Merged - Master + Assigned.xlsx" (Merged sheet) to
its corresponding parent row in "Asset Finance.with_calc.xlsx" using the
existing structural matcher (year + unit + name overlap, with range expansion).

Adds these columns to the Merged sheet:
  - Parent Asset ID (Finance)        Matched parent AID from the Finance file
  - Parent Match Type                EXACT_NORM | STRUCTURAL | NONE
  - Donor Name (Finance)             For audit / grant attribution
  - Refined Acquisition Date (Finance)
  - Net Block FY 25-26 (Finance)     Current book value
  - Asset Status (Finance)           Finance-side status (active/disposed etc.)

Other sheets in the workbook are preserved as-is.

Run:
    python scripts/add_finance_parent_id.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

# Reuse the structural matcher built earlier — same year/unit/name logic.
SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))
from match_assets_similarity import parse_id, score_pair, classify  # noqa: E402


BASE = Path(r"C:\Kalike\Asset\Asset New data")
FINANCE_FILE = BASE / "Asset for Finance" / "Asset Finance.with_calc.xlsx"
MERGED_FILE  = BASE / "Mapping Final" / "Assets Merged - Master + Assigned.xlsx"

# Finance columns we want to surface alongside the parent ID
FINANCE_FIELDS = {
    "Donor Name":             "Donor Name (Finance)",
    "Refined Aquis Date":     "Refined Acquisition Date (Finance)",
    "Net Block (A-B).1":      "Net Block FY 25-26 (Finance)",  # the second Net Block col is FY 25-26
    "Status":                 "Asset Status (Finance)",
}


def main() -> None:
    # Finance has a 2-row merged header; data starts at row index 2
    fin = pd.read_excel(FINANCE_FILE, header=2)
    fin = fin[fin["Asset Identification Number"].notna()].reset_index(drop=True)

    # Parse all Finance AIDs once
    fin_parsed = []
    for i, raw in enumerate(fin["Asset Identification Number"]):
        fin_parsed.append((i, str(raw), parse_id(raw)))

    # Exact normalized -> finance-row index, for the fast path
    norm_to_fin_idx: dict[str, int] = {}
    for i, raw, p in fin_parsed:
        norm_to_fin_idx.setdefault(p["normalized"], i)

    # Cache per-unique merged-AID lookup
    merged_aid_cache: dict[str, tuple[int, str]] = {}  # AID -> (fin_idx, match_type)

    def find_match(merged_aid: str) -> tuple[int, str]:
        if merged_aid in merged_aid_cache:
            return merged_aid_cache[merged_aid]
        pm = parse_id(merged_aid)
        # 1. Exact normalized
        if pm["normalized"] in norm_to_fin_idx:
            out = (norm_to_fin_idx[pm["normalized"]], "EXACT_NORM")
            merged_aid_cache[merged_aid] = out
            return out
        # 2. Structural fallback
        best_idx, best_score, best_flags = -1, -2.0, {}
        for i, _, fp in fin_parsed:
            score, flags = score_pair(pm, fp)
            if score > best_score:
                best_score, best_idx, best_flags = score, i, flags
        tier = classify(best_score, best_flags)
        if tier in ("EXACT", "STRONG"):
            out = (best_idx, "STRUCTURAL")
        elif tier == "WEAK":
            out = (best_idx, "WEAK")
        else:
            out = (-1, "NONE")
        merged_aid_cache[merged_aid] = out
        return out

    # Load merged workbook (all sheets so we can write them back)
    xl = pd.ExcelFile(MERGED_FILE)
    sheets = {name: pd.read_excel(xl, name) for name in xl.sheet_names}
    merged = sheets["Merged"]

    # Compute new column values
    parent_ids = []
    match_types = []
    finance_cols_data = {alias: [] for alias in FINANCE_FIELDS.values()}

    for _, row in merged.iterrows():
        aid = row.get("Asset Identification Number")
        if pd.isna(aid):
            parent_ids.append("")
            match_types.append("")
            for alias in finance_cols_data:
                finance_cols_data[alias].append("")
            continue
        fin_idx, mtype = find_match(str(aid))
        if fin_idx >= 0:
            parent_ids.append(str(fin.iloc[fin_idx]["Asset Identification Number"]))
            match_types.append(mtype)
            for src, alias in FINANCE_FIELDS.items():
                val = fin.iloc[fin_idx].get(src, "")
                finance_cols_data[alias].append(val if pd.notna(val) else "")
        else:
            parent_ids.append("")
            match_types.append("NONE")
            for alias in finance_cols_data:
                finance_cols_data[alias].append("")

    # Insert new columns immediately after "Asset Identification Number"
    insert_at = list(merged.columns).index("Asset Identification Number") + 1
    new_cols = {
        "Parent Asset ID (Finance)": parent_ids,
        "Parent Match Type":         match_types,
        **finance_cols_data,
    }
    for offset, (name, vals) in enumerate(new_cols.items()):
        merged.insert(insert_at + offset, name, vals)

    sheets["Merged"] = merged

    # Write everything back
    with pd.ExcelWriter(MERGED_FILE, engine="openpyxl") as writer:
        for name, df in sheets.items():
            df.to_excel(writer, sheet_name=name, index=False)

    # Report
    n_total       = len(merged)
    n_with_parent = (merged["Parent Match Type"].isin(["EXACT_NORM", "STRUCTURAL"])).sum()
    n_exact       = (merged["Parent Match Type"] == "EXACT_NORM").sum()
    n_struct      = (merged["Parent Match Type"] == "STRUCTURAL").sum()
    n_weak        = (merged["Parent Match Type"] == "WEAK").sum()
    n_none        = (merged["Parent Match Type"] == "NONE").sum()
    print(f"Merged rows                          : {n_total}")
    print(f"Rows with Finance parent ID assigned : {n_with_parent}")
    print(f"    EXACT_NORM (normalized equal)    : {n_exact}")
    print(f"    STRUCTURAL (year+unit+name)      : {n_struct}")
    print(f"    WEAK (review)                    : {n_weak}")
    print(f"    NONE                             : {n_none}")
    print()
    print("Final column order:")
    for i, c in enumerate(merged.columns, 1):
        print(f"  {i:>2}. {c}")


if __name__ == "__main__":
    main()

"""
Structural similarity match between:
  - "Asset Identification Number" in Final All Assets Master Refined.xlsx
  - "Asset Code"                   in Assets Assigned.xlsx

Matching rules (per user spec):
  - Ignore commas, periods, and extra/double spaces
  - Numbers (unit IDs), years, and the asset name/program tokens MUST match
  - Master ranges like "01 TO 06" are expanded to {01,02,03,04,05,06} for
    unit-number comparison
  - "18-19" and "2018-19" are treated as the same year

Confidence tiers:
  EXACT      year + unit + name all align (≥95 text score)
  STRONG     year + unit + name align (≥80 text score) — minor typos OK
  WEAK       year + unit overlap but name differs (60–79)
  UNMATCHED  year or unit missing/wrong, OR text < 60

Output:
  - Console: counts + full unmatched list
  - Excel  : "Assets Match Report.xlsx" with sheets:
        Matched, Unmatched, Similarity Suggestions, Summary

Run:
    pip install pandas openpyxl rapidfuzz
    python scripts/match_assets_similarity.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import pandas as pd
from rapidfuzz import fuzz


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

BASE = Path(r"C:\Kalike\Asset\Asset New data\Mapping Final")
MASTER_FILE  = BASE / "Final All Assets Master Refined.xlsx"
ASSIGN_FILE  = BASE / "Assets Assigned.xlsx"
OUTPUT_FILE  = BASE / "Assets Match Report.xlsx"
MERGED_FILE  = BASE / "Assets Merged - Master + Assigned.xlsx"

STRONG_TEXT_SCORE  = 80   # name/program tokens must reach this for STRONG
EXACT_TEXT_SCORE   = 95   # ...this for EXACT
WEAK_TEXT_SCORE    = 60   # below this with structure-ok we still call WEAK


# ---------------------------------------------------------------------------
# Normalization & parsing
# ---------------------------------------------------------------------------

# Common typos for organization name
ORG_TYPOS = ["KALIEK", "KLAIKE", "KAILIKE", "KALEKE"]

# Known year-string typos in the source data.
# Add new entries here if more are discovered.
YEAR_FIXES = {
    "2020-01": "2020-21",
}

def base_normalize(s) -> str:
    """Drop commas, periods, multiple spaces; uppercase; fix KALIKE typos.

    This is the form we compare on. We keep numbers, year-ranges, slashes
    and dashes intact — those are load-bearing for the match.
    """
    if s is None or (isinstance(s, float) and pd.isna(s)):
        return ""
    text = str(s).upper()
    for typo in ORG_TYPOS:
        text = text.replace(typo, "KALIKE")
    for bad, good in YEAR_FIXES.items():
        text = text.replace(bad, good)
    text = text.replace(",", " ").replace(".", " ")
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\s*/\s*", "/", text)
    return text.strip()


YEAR_RE_FULL  = re.compile(r"\b(20\d{2})-(\d{2})\b")           # 2018-19
YEAR_RE_SHORT = re.compile(r"\b([0-2]\d)-([0-2]\d)\b")         # 18-19
RANGE_RE      = re.compile(r"\b(\d{1,3})\s*(?:TO|-|&)\s*(\d{1,3})\b")
SINGLE_NUM_RE = re.compile(r"\b\d{1,3}\b")


def parse_id(raw: str) -> dict:
    """Extract structural fields: years (canonical), units (set), text tokens."""
    s = base_normalize(raw)
    if not s:
        return {"years": set(), "units": set(), "text": "", "tokens": set(), "normalized": ""}

    years: set[str] = set()
    for m in YEAR_RE_FULL.finditer(s):
        years.add(f"{m.group(1)}-{m.group(2)}")
    # 18-19 -> 2018-19 (only if it looks like a fiscal year, not a unit range)
    for m in YEAR_RE_SHORT.finditer(s):
        a, b = int(m.group(1)), int(m.group(2))
        # adjacent years (12-13, 18-19, 24-25) OR year-rollover 99-00
        if (b - a == 1 and 10 <= a <= 30) or (a == 99 and b == 0):
            years.add(f"20{m.group(1)}-{m.group(2)}")

    # Remove all year patterns before scanning for unit numbers
    s_for_units = YEAR_RE_FULL.sub(" ", s)
    s_for_units = YEAR_RE_SHORT.sub(
        lambda m: " "
        if (int(m.group(2)) - int(m.group(1)) == 1 and 10 <= int(m.group(1)) <= 30)
        or (int(m.group(1)) == 99 and int(m.group(2)) == 0)
        else m.group(0),
        s_for_units,
    )

    units: set[int] = set()
    # Ranges first ("01 TO 06", "08-09", "06&07")
    def _range_sub(m):
        a, b = int(m.group(1)), int(m.group(2))
        if a <= b and (b - a) < 100:
            for n in range(a, b + 1):
                units.add(n)
            return " "
        return m.group(0)
    s_after_ranges = RANGE_RE.sub(_range_sub, s_for_units)
    # Then remaining single numbers
    for m in SINGLE_NUM_RE.finditer(s_after_ranges):
        n = int(m.group(0))
        if 0 <= n <= 500:
            units.add(n)

    # Text portion: drop year ranges, all numbers, "TO" connector, slashes
    text = YEAR_RE_FULL.sub(" ", s)
    text = YEAR_RE_SHORT.sub(
        lambda m: " "
        if (int(m.group(2)) - int(m.group(1)) == 1 and 10 <= int(m.group(1)) <= 30)
        or (int(m.group(1)) == 99 and int(m.group(2)) == 0)
        else m.group(0),
        text,
    )
    text = RANGE_RE.sub(" ", text)
    text = SINGLE_NUM_RE.sub(" ", text)
    text = re.sub(r"\bTO\b", " ", text)
    text = text.replace("/", " ").replace("-", " ").replace("&", " ")
    text = re.sub(r"\s+", " ", text).strip()
    tokens = set(t for t in text.split() if len(t) > 1)

    return {
        "years": years,
        "units": units,
        "text": text,
        "tokens": tokens,
        "normalized": s,
    }


# ---------------------------------------------------------------------------
# Matching
# ---------------------------------------------------------------------------

def score_pair(a: dict, m: dict) -> tuple[float, dict]:
    """Return (text_score, flags). text_score is 0-100 OR -1 if structural
    requirement (year or unit) fails.
    """
    flags = {"year_ok": True, "unit_ok": True, "text_score": 0.0}

    if a["years"] and m["years"]:
        if not (a["years"] & m["years"]):
            flags["year_ok"] = False
            return -1.0, flags

    if a["units"] and m["units"]:
        if not (a["units"] & m["units"]):
            flags["unit_ok"] = False
            return -1.0, flags

    # Text similarity on the de-numbered portion
    if not a["text"] and not m["text"]:
        text_score = 100.0
    else:
        text_score = float(fuzz.token_set_ratio(a["text"], m["text"]))
    flags["text_score"] = text_score
    return text_score, flags


def classify(text_score: float, flags: dict) -> str:
    if text_score < 0:
        return "UNMATCHED"
    if text_score >= EXACT_TEXT_SCORE:
        return "EXACT"
    if text_score >= STRONG_TEXT_SCORE:
        return "STRONG"
    if text_score >= WEAK_TEXT_SCORE:
        return "WEAK"
    return "UNMATCHED"


# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    if not MASTER_FILE.exists():
        sys.exit(f"Master file not found: {MASTER_FILE}")
    if not ASSIGN_FILE.exists():
        sys.exit(f"Assignment file not found: {ASSIGN_FILE}")

    master = pd.read_excel(MASTER_FILE)
    assign = pd.read_excel(ASSIGN_FILE)

    print(f"Master rows:     {len(master)}")
    print(f"Assignment rows: {len(assign)}")

    if "Asset Identification Number" not in master.columns:
        sys.exit("Master file is missing 'Asset Identification Number' column.")
    if "Asset Code" not in assign.columns:
        sys.exit("Assignment file is missing 'Asset Code' column.")

    # Parse each unique master AID once. Also remember every master row index
    # that has that AID, since master expands ranges into multiple rows.
    master_aids_seen: dict[str, dict] = {}                # AID -> parsed
    aid_to_row_indices: dict[str, list[int]] = {}         # AID -> [row indices]
    for i, raw in enumerate(master["Asset Identification Number"]):
        if pd.isna(raw):
            continue
        key = str(raw)
        if key not in master_aids_seen:
            master_aids_seen[key] = parse_id(raw)
        aid_to_row_indices.setdefault(key, []).append(i)

    # For the merged sheet: collect assignments per master row index.
    master_row_assignments: dict[int, list[dict]] = {i: [] for i in range(len(master))}
    aid_consumed: dict[str, int] = {}  # AID -> how many of its master rows are already filled

    matched_rows: list[dict] = []
    unmatched_rows: list[dict] = []
    suggestion_rows: list[dict] = []

    for _, row in assign.iterrows():
        raw_code = row.get("Asset Code")
        parsed_a = parse_id(raw_code)

        if not parsed_a["normalized"]:
            unmatched_rows.append({
                **row.to_dict(),
                "Best Master AID Suggestion": "",
                "Text Similarity": 0,
                "Year OK": "",
                "Unit OK": "",
                "Tier": "UNMATCHED",
                "Bucket": "EMPTY CODE",
                "Reason": "Empty Asset Code",
            })
            continue

        # Score against every master AID, keep best
        best_aid = ""
        best_score = -2.0
        best_flags = {}
        for aid, parsed_m in master_aids_seen.items():
            score, flags = score_pair(parsed_a, parsed_m)
            if score > best_score:
                best_score = score
                best_aid = aid
                best_flags = flags

        tier = classify(best_score, best_flags)

        common = {
            **row.to_dict(),
            "Best Master AID Suggestion": best_aid,
            "Text Similarity": round(best_score, 1) if best_score >= 0 else 0,
            "Year OK": "YES" if best_flags.get("year_ok") else "NO",
            "Unit OK": "YES" if best_flags.get("unit_ok") else "NO",
            "Tier": tier,
        }

        if tier in ("EXACT", "STRONG"):
            matched_rows.append({
                **common,
                "Matched Master AID": best_aid,
                "Match Type": tier,
            })
            # Attach this assignment to one of the master rows that share this AID.
            # If master has e.g. "01 TO 06" expanded to 6 rows, distribute multiple
            # assignments across them in order; overflow stacks on the last row.
            row_indices = aid_to_row_indices.get(best_aid, [])
            if row_indices:
                consumed = aid_consumed.get(best_aid, 0)
                target_idx = row_indices[consumed] if consumed < len(row_indices) else row_indices[-1]
                master_row_assignments[target_idx].append({
                    "assignment": row.to_dict(),
                    "tier": tier,
                    "overflow": consumed >= len(row_indices),
                })
                aid_consumed[best_aid] = consumed + 1
        elif tier == "WEAK":
            suggestion_rows.append({
                **common,
                "Reason": "Year+unit align but name differs — needs human review",
            })
        else:
            # UNMATCHED: best could be a near-miss; surface why
            reasons = []
            if not best_flags.get("year_ok", True):
                reasons.append("year mismatch")
            if not best_flags.get("unit_ok", True):
                reasons.append("unit-number mismatch")
            if not reasons and best_score >= 0:
                reasons.append(f"name too different ({best_score:.0f}%)")
            if not reasons:
                reasons.append("no structural match")

            # Bucket the unmatched row: empty/placeholder vs. likely-missing-from-master
            bucket = "OTHER"
            if not parsed_a["normalized"]:
                bucket = "EMPTY CODE"
            elif "REQUEST TO ASSIGNE" in parsed_a["normalized"] or "WITH IT YADGIR REQUEST" in parsed_a["normalized"]:
                bucket = "PLACEHOLDER CODE"
            elif parsed_a["years"] and parsed_a["units"] and parsed_a["tokens"]:
                # Looks like a real asset reference — just not in master
                bucket = "MISSING FROM MASTER"
            unmatched_rows.append({
                **common,
                "Bucket": bucket,
                "Reason": "; ".join(reasons),
            })

    matched_df    = pd.DataFrame(matched_rows)
    unmatched_df  = pd.DataFrame(unmatched_rows)
    suggestion_df = pd.DataFrame(suggestion_rows)

    bucket_counts = (unmatched_df["Bucket"].value_counts().to_dict()
                     if "Bucket" in unmatched_df.columns else {})
    summary = pd.DataFrame([
        {"Metric": "Master rows",                                  "Value": len(master)},
        {"Metric": "Assignment rows",                              "Value": len(assign)},
        {"Metric": "Matched (EXACT or STRONG)",                    "Value": len(matched_df)},
        {"Metric": "    EXACT  (text >=95, year+unit match)",      "Value": int((matched_df['Match Type']=='EXACT').sum()) if not matched_df.empty else 0},
        {"Metric": "    STRONG (text >=80, year+unit match)",      "Value": int((matched_df['Match Type']=='STRONG').sum()) if not matched_df.empty else 0},
        {"Metric": "WEAK suggestions (year+unit OK, name 60-79)",  "Value": len(suggestion_df)},
        {"Metric": "UNMATCHED total",                              "Value": len(unmatched_df)},
        {"Metric": "    Missing from master (real codes, not in master)", "Value": bucket_counts.get("MISSING FROM MASTER", 0)},
        {"Metric": "    Empty Asset Code (blank in source)",       "Value": bucket_counts.get("EMPTY CODE", 0)},
        {"Metric": "    Placeholder text ('Request to assign')",   "Value": bucket_counts.get("PLACEHOLDER CODE", 0)},
        {"Metric": "    Other",                                    "Value": bucket_counts.get("OTHER", 0)},
        {"Metric": "Year typos auto-corrected",                    "Value": ", ".join(f"{k} -> {v}" for k, v in YEAR_FIXES.items())},
        {"Metric": "Algorithm",                                    "Value": "structural (year+unit) + rapidfuzz token_set_ratio on name"},
    ])

    # Carve out the "missing from master" subset for finance
    if not unmatched_df.empty and "Bucket" in unmatched_df.columns:
        missing_df = unmatched_df[unmatched_df["Bucket"] == "MISSING FROM MASTER"].copy()
    else:
        missing_df = pd.DataFrame()

    with pd.ExcelWriter(OUTPUT_FILE, engine="openpyxl") as writer:
        matched_df.to_excel(writer,    sheet_name="Matched",                       index=False)
        unmatched_df.to_excel(writer,  sheet_name="Unmatched",                     index=False)
        suggestion_df.to_excel(writer, sheet_name="Similarity Suggestions",        index=False)
        missing_df.to_excel(writer,    sheet_name="Missing from Master - Add",     index=False)
        summary.to_excel(writer,       sheet_name="Summary",                       index=False)

    # ----- Build the merged master+assignment workbook -----
    # Every master row gets ALL its original columns + new assignment columns.
    # When multiple assignments hit the same master row, fields are joined with " | ".

    def _join(items, key):
        vals = [a["assignment"].get(key, "") for a in items]
        vals = ["" if (v is None or (isinstance(v, float) and pd.isna(v))) else str(v) for v in vals]
        return " | ".join(vals)

    new_cols = [
        "Match Status",
        "Match Type",
        "Multiple Assignments?",
        "Assigned to",
        "Current Location (from Assignment)",
        "Status (from Assignment)",
        "Original Location (from Assignment)",
        "Location of asset (from Assignment)",
        "Asset Name (from Assignment)",
        "Asset Code (from Assignment)",
        "Assignment SL No",
    ]

    merged_rows = []
    for i, row in master.iterrows():
        out = row.to_dict()
        items = master_row_assignments.get(i, [])
        if not items:
            out["Match Status"]                       = "UNASSIGNED"
            out["Match Type"]                         = ""
            out["Multiple Assignments?"]              = ""
            out["Assigned to"]                        = ""
            out["Current Location (from Assignment)"] = ""
            out["Status (from Assignment)"]           = ""
            out["Original Location (from Assignment)"]= ""
            out["Location of asset (from Assignment)"]= ""
            out["Asset Name (from Assignment)"]       = ""
            out["Asset Code (from Assignment)"]       = ""
            out["Assignment SL No"]                   = ""
        else:
            tiers = " | ".join(a["tier"] + (" (overflow)" if a["overflow"] else "") for a in items)
            out["Match Status"]                       = "ASSIGNED"
            out["Match Type"]                         = tiers
            out["Multiple Assignments?"]              = f"YES ({len(items)})" if len(items) > 1 else "NO"
            out["Assigned to"]                        = _join(items, "Assigned to")
            out["Current Location (from Assignment)"] = _join(items, "Location current")
            out["Status (from Assignment)"]           = _join(items, "Status")
            out["Original Location (from Assignment)"]= _join(items, "Location ")
            out["Location of asset (from Assignment)"]= _join(items, "Location of asset")
            out["Asset Name (from Assignment)"]       = _join(items, "Asset Name")
            out["Asset Code (from Assignment)"]       = _join(items, "Asset Code")
            out["Assignment SL No"]                   = _join(items, "SL No")
        merged_rows.append(out)

    master_cols = [c for c in master.columns if c != "__norm_aid"]
    merged_df = pd.DataFrame(merged_rows, columns=master_cols + new_cols)

    with pd.ExcelWriter(MERGED_FILE, engine="openpyxl") as writer:
        merged_df.to_excel(writer,     sheet_name="Merged",                        index=False)
        unmatched_df.to_excel(writer,  sheet_name="Unmatched Assignments",         index=False)
        missing_df.to_excel(writer,    sheet_name="Missing from Master - Add",     index=False)
        suggestion_df.to_excel(writer, sheet_name="Similarity Suggestions",        index=False)
        summary.to_excel(writer,       sheet_name="Summary",                       index=False)

    assigned_master_rows = sum(1 for items in master_row_assignments.values() if items)

    # ----- Console report -----
    print()
    print("=" * 72)
    print("SUMMARY")
    print("=" * 72)
    for _, r in summary.iterrows():
        print(f"  {r['Metric']:<55} {r['Value']}")
    print()
    print(f"Wrote report: {OUTPUT_FILE}")
    print(f"Wrote merged: {MERGED_FILE}")
    print(f"  Master rows with at least one assignment matched: {assigned_master_rows}")
    print(f"  Master rows still unassigned:                     {len(master) - assigned_master_rows}")
    print()
    print("=" * 72)
    print(f"UNMATCHED ASSET CODES ({len(unmatched_df)})")
    print("=" * 72)
    if unmatched_df.empty:
        print("  (none)")
    else:
        for _, r in unmatched_df.iterrows():
            code = r.get("Asset Code", "")
            assigned = r.get("Assigned to", "")
            best = r.get("Best Master AID Suggestion", "")
            score = r.get("Text Similarity", 0)
            reason = r.get("Reason", "")
            print(f"  [text {score:>5}%] {code}")
            print(f"             assigned to: {assigned}")
            if best:
                print(f"             best guess : {best}")
            print(f"             reason     : {reason}")
            print()


if __name__ == "__main__":
    main()

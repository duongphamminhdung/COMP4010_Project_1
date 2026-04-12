"""Utility helpers for loading and comparing Palmer Penguins groups."""

from __future__ import annotations

import math
from functools import lru_cache
from typing import Any, Optional

import pandas as pd

DATASET_URL = (
    "https://raw.githubusercontent.com/allisonhorst/"
    "palmerpenguins/master/inst/extdata/penguins.csv"
)

NUMERIC_FEATURES = [
    "body_mass_g",
    "flipper_length_mm",
    "bill_length_mm",
    "bill_depth_mm",
]

# Penguin stand-in: normalize each mean to Palmer-style bounds, map to SVG multipliers (see build_stand_in_scales).
_STAND_IN_PALMER: dict[str, tuple[float, float]] = {
    "body_mass_g": (2700, 6300),
    "flipper_length_mm": (172, 231),
    "bill_length_mm": (32, 60),
    "bill_depth_mm": (13, 22),
}
_STAND_IN_VISUAL_LOW = 0.78
_STAND_IN_VISUAL_HIGH = 1.22


def _stand_in_metric_scale(
    value: Any, lo: float, hi: float, gamma: float = 1.0
) -> float:
    """Map one KPI mean to a visual scale factor in [_STAND_IN_VISUAL_LOW, _STAND_IN_VISUAL_HIGH]."""
    if value is None:
        return 1.0
    try:
        v = float(value)
    except (TypeError, ValueError):
        return 1.0
    if math.isnan(v):
        return 1.0
    span = hi - lo
    if span <= 0:
        return 1.0
    t = (v - lo) / span
    clamped = max(0.0, min(1.0, t))
    curved = clamped if gamma == 1.0 else math.pow(clamped, gamma)
    return _STAND_IN_VISUAL_LOW + curved * (_STAND_IN_VISUAL_HIGH - _STAND_IN_VISUAL_LOW)


def build_stand_in_scales(group: dict) -> dict[str, float]:
    """Scale factors for the Penguin stand-in SVG (matches former frontend logic)."""
    b = _STAND_IN_PALMER
    return {
        "body_mass_g": _stand_in_metric_scale(
            group.get("body_mass_g"),
            b["body_mass_g"][0],
            b["body_mass_g"][1],
            1.08,
        ),
        "flipper_length_mm": _stand_in_metric_scale(
            group.get("flipper_length_mm"),
            b["flipper_length_mm"][0],
            b["flipper_length_mm"][1],
            1.0,
        ),
        "bill_length_mm": _stand_in_metric_scale(
            group.get("bill_length_mm"),
            b["bill_length_mm"][0],
            b["bill_length_mm"][1],
            1.16,
        ),
        "bill_depth_mm": _stand_in_metric_scale(
            group.get("bill_depth_mm"),
            b["bill_depth_mm"][0],
            b["bill_depth_mm"][1],
            1.12,
        ),
    }


FEATURE_LABELS: dict[str, str] = {
    "body_mass_g": "Body Mass",
    "flipper_length_mm": "Flipper Length",
    "bill_length_mm": "Bill Length",
    "bill_depth_mm": "Bill Depth",
}

FEATURE_LABELS_LONG: dict[str, str] = {
    "body_mass_g": "Body Mass (g)",
    "flipper_length_mm": "Flipper Length (mm)",
    "bill_length_mm": "Bill Length (mm)",
    "bill_depth_mm": "Bill Depth (mm)",
}

_STAND_IN_METRIC_WORD = {
    "body_mass_g": "weight",
    "flipper_length_mm": "flipper length",
    "bill_length_mm": "bill length",
    "bill_depth_mm": "bill depth",
}

# Second sentence: how that KPI maps into the stand-in SVG (see PenguinComparisonViz PenguinFigure).
_STAND_IN_ANIMATION_NOTE: dict[str, str] = {
    "body_mass_g": (
        "Mass scales **body**, **belly**, and **head** in the SVG, so the heavier-average bird reads **stockier** and the other **slimmer**."
    ),
    "flipper_length_mm": (
        "That value scales **flipper height**, so the longer-average side gets **taller wing ovals**."
    ),
    "bill_length_mm": (
        "That value stretches the beak forward in the SVG, so the higher-average bill **sticks out farther**."
    ),
    "bill_depth_mm": (
        "That value thickens the beak triangle, so the deeper-average side looks **chunkier** in profile."
    ),
}


def build_stand_in_annotation(
    group_a: dict, group_b: dict, label_a: str, label_b: str
) -> str:
    """Highlight the trait whose stand-in scales differ most, then tie it to the SVG animation."""
    scales_a = build_stand_in_scales(group_a)
    scales_b = build_stand_in_scales(group_b)

    best_key: Optional[str] = None
    best_gap = -1.0
    for key in NUMERIC_FEATURES:
        va, vb = group_a.get(key), group_b.get(key)
        if va is None or vb is None:
            continue
        try:
            sa = float(scales_a[key])
            sb = float(scales_b[key])
        except (TypeError, ValueError, KeyError):
            continue
        if math.isnan(sa) or math.isnan(sb):
            continue
        gap = abs(sa - sb)
        if gap > best_gap:
            best_gap = gap
            best_key = key

    if best_key is None:
        return "Need numbers for both groups to explain the cartoons."

    if best_gap < 1e-9:
        return (
            "Every stand-in scale matches for these averages, so the two animated figures use the **same** "
            "silhouette—nothing in the drawing separates them."
        )

    va, vb = group_a.get(best_key), group_b.get(best_key)
    try:
        an, bn = float(va), float(vb)
    except (TypeError, ValueError):
        return "Need numbers for both groups to explain the cartoons."
    if math.isnan(an) or math.isnan(bn):
        return "Need numbers for both groups to explain the cartoons."

    metric = _STAND_IN_METRIC_WORD[best_key]
    hi_lab, lo_lab = (label_a, label_b) if an >= bn else (label_b, label_a)
    hi_v, lo_v = (an, bn) if an >= bn else (bn, an)
    m_hi = _format_mean(best_key, hi_v)
    m_lo = _format_mean(best_key, lo_v)

    lead = (
        f"The clearest split in the **stand-in** drawing is **{metric}**: **{hi_lab}** averages **{m_hi}** vs "
        f"**{lo_lab}**’s **{m_lo}**."
    )
    tail = _STAND_IN_ANIMATION_NOTE[best_key]
    return f"{lead} {tail}"


def _format_mean(key: str, val: float) -> str:
    if val is None or (isinstance(val, float) and math.isnan(val)):
        return "—"
    u = "g" if key == "body_mass_g" else "mm"
    decimals = 0 if key == "body_mass_g" else 1
    return f"{float(val):.{decimals}f} {u}"


def _percent_gap_between_means(
    group_a: dict, group_b: dict, key: str
) -> Optional[dict[str, Any]]:
    a, b = group_a.get(key), group_b.get(key)
    if a is None or b is None:
        return None
    an, bn = float(a), float(b)
    if math.isnan(an) or math.isnan(bn):
        return None
    if abs(an - bn) < 1e-9:
        return {"pct": 0.0, "higher_is_b": False, "tie": True}
    lo, hi = min(an, bn), max(an, bn)
    if lo == 0:
        return None
    pct = (hi - lo) / lo * 100
    return {"pct": pct, "higher_is_b": bn > an, "tie": False}


def build_radar_annotation(
    group_a: dict, group_b: dict, label_a: str, label_b: str
) -> str:
    """Two–three sentences: how to read + who leads where (with numbers)."""
    rows: list[str] = []
    for key in NUMERIC_FEATURES:
        label = FEATURE_LABELS[key]
        a, b = group_a.get(key), group_b.get(key)
        if a is None or b is None:
            continue
        an, bn = float(a), float(b)
        if math.isnan(an) or math.isnan(bn):
            continue
        if abs(an - bn) < 1e-6:
            rows.append(f"{label}: tie (~{_format_mean(key, an)})")
        elif an > bn:
            rows.append(
                f"{label}: **{label_a}** ({_format_mean(key, an)} vs {_format_mean(key, bn)})"
            )
        else:
            rows.append(
                f"{label}: **{label_b}** ({_format_mean(key, bn)} vs {_format_mean(key, an)})"
            )
    if not rows:
        return "Some numbers are missing, so we can’t summarize this chart."
    detail = "; ".join(rows)
    return (
        "Each corner is one measure; distance from the center shows which group’s **average** is higher "
        f"(typical penguin, not one individual). **Snapshot:** {detail}."
    )


def build_difference_annotation(
    group_a: dict, group_b: dict, label_a: str, label_b: str
) -> str:
    """Friendly summary of percent gaps between group averages—no stats jargon."""
    rows: list[dict] = []
    for key in NUMERIC_FEATURES:
        fl = FEATURE_LABELS[key]
        gap = _percent_gap_between_means(group_a, group_b, key)
        if gap is None:
            rows.append(
                {
                    "feature": fl,
                    "key": key,
                    "value": 0.0,
                    "label_text": "N/A",
                    "has_pct": False,
                    "tie": None,
                    "higher_is_b": None,
                }
            )
            continue
        pct = gap["pct"]
        tie = gap["tie"]
        rows.append(
            {
                "feature": fl,
                "key": key,
                "value": pct,
                "label_text": "0%" if tie else f"{pct:.1f}%",
                "has_pct": True,
                "tie": tie,
                "higher_is_b": gap["higher_is_b"],
            }
        )

    valid = [r for r in rows if r["has_pct"]]
    if not valid:
        return "We need numbers for both groups before this chart can tell a story."

    ranked = sorted(valid, key=lambda r: r["value"], reverse=True)
    non_tie = [r for r in ranked if not r["tie"] and r["value"] > 0]
    top = non_tie[0] if non_tie else ranked[0]

    b_leads = sum(1 for r in valid if not r["tie"] and r["higher_is_b"])
    a_leads = sum(1 for r in valid if not r["tie"] and not r["higher_is_b"])
    tie_n = sum(1 for r in valid if r["tie"])

    top_key = top["key"]
    ma, mb = group_a.get(top_key), group_b.get(top_key)
    top_who = label_b if top["higher_is_b"] else label_a
    if ma is not None and mb is not None:
        an, bn = float(ma), float(mb)
        lo = min(an, bn)
        hi = max(an, bn)
    else:
        lo = hi = None

    s = (
        "Each bar = **percent gap** between the two groups’ **averages** "
        "(how much bigger the larger average is than the smaller one). "
    )
    if not top["tie"] and lo is not None and hi is not None and not math.isnan(lo):
        s += (
            f"**Biggest gap:** {top['feature']} (**{top['label_text']}**; "
            f"roughly {_format_mean(top_key, lo)} vs {_format_mean(top_key, hi)}), "
            f"higher side **{top_who}**. "
        )
    elif not top["tie"]:
        s += f"**Biggest gap:** {top['feature']} (~{top['label_text']}). "
    else:
        s += "All four averages match here (0% bars). "

    n_traits = len(valid)
    s += (
        f"**Scorecard:** **{label_b}** {b_leads}/{n_traits} traits higher, "
        f"**{label_a}** {a_leads}/{n_traits}."
    )
    if tie_n:
        tie_w = "ties" if tie_n > 1 else "tie"
        s += f" ({tie_n} {tie_w}.)"

    return s


def build_boxplot_annotations(
    df_a: pd.DataFrame, df_b: pd.DataFrame, label_a: str, label_b: str
) -> dict[str, str]:
    """One short note per feature: explain median + counts without statistics class wording."""
    out: dict[str, str] = {}
    for key in NUMERIC_FEATURES:
        title = FEATURE_LABELS_LONG[key]
        if df_a.empty or df_b.empty:
            out[key] = (
                "There aren’t enough penguins in one or both groups to compare this measurement fairly."
            )
            continue
        s_a = df_a[key].dropna()
        s_b = df_b[key].dropna()
        if s_a.empty or s_b.empty:
            out[key] = (
                "There aren’t enough penguins in one or both groups to compare this measurement fairly."
            )
            continue
        ma = float(s_a.median())
        mb = float(s_b.median())
        n_a, n_b = int(s_a.shape[0]), int(s_b.shape[0])
        decimals = 0 if key == "body_mass_g" else 1
        unit = "g" if key == "body_mass_g" else "mm"
        if abs(ma - mb) < 1e-9:
            out[key] = (
                f"**{title}:** Middle line = **median** (middle of the pack). "
                f"Both near {_format_mean(key, ma)}—**{label_a}** ({n_a} penguins), **{label_b}** ({n_b})."
            )
            continue
        higher = label_a if ma > mb else label_b
        lower = label_b if ma > mb else label_a
        diff = abs(ma - mb)
        out[key] = (
            f"**{title}:** Medians {_format_mean(key, ma)} (**{label_a}**, n={n_a}) vs "
            f"{_format_mean(key, mb)} (**{label_b}**, n={n_b}). **{higher}** higher by **{diff:.{decimals}f} {unit}** than **{lower}**."
        )
    return out


@lru_cache(maxsize=1)
def load_clean_data() -> pd.DataFrame:
    """Load the dataset from URL and drop rows with missing required values."""
    df = pd.read_csv(DATASET_URL)
    required_columns = ["species", "island", *NUMERIC_FEATURES]
    return df.dropna(subset=required_columns).copy()


def normalize_sex_param(value: str) -> str:
    """Return 'male' or 'female'; raises ValueError if invalid."""
    s = (value or "").strip().lower()
    if s not in ("male", "female"):
        raise ValueError("sex must be 'male' or 'female'")
    return s


def _sex_label(sex_norm: str) -> str:
    return "Male" if sex_norm == "male" else "Female"


def _group_kpis(df_group: pd.DataFrame, sex_norm: str) -> dict:
    """Compute KPI means and sample count for one group (already filtered by sex)."""
    if df_group.empty:
        return {
            "body_mass_g": None,
            "flipper_length_mm": None,
            "bill_length_mm": None,
            "bill_depth_mm": None,
            "count": 0,
            "sex": sex_norm,
        }

    return {
        "body_mass_g": float(df_group["body_mass_g"].mean()),
        "flipper_length_mm": float(df_group["flipper_length_mm"].mean()),
        "bill_length_mm": float(df_group["bill_length_mm"].mean()),
        "bill_depth_mm": float(df_group["bill_depth_mm"].mean()),
        "count": int(df_group.shape[0]),
        "sex": sex_norm,
    }


def _raw_records(df_group: pd.DataFrame) -> list[dict]:
    """Return raw numeric rows for chart distributions on frontend."""
    if df_group.empty:
        return []
    return df_group[NUMERIC_FEATURES].to_dict(orient="records")


def build_comparison(
    species_a: str,
    island_a: str,
    sex_a: str,
    species_b: str,
    island_b: str,
    sex_b: str,
) -> dict:
    """Build full comparison payload for the /compare endpoint (species + island + sex)."""
    sex_an = normalize_sex_param(sex_a)
    sex_bn = normalize_sex_param(sex_b)
    df = load_clean_data()

    df_a = df[
        (df["species"] == species_a)
        & (df["island"] == island_a)
        & (df["sex"].str.lower() == sex_an)
    ]
    df_b = df[
        (df["species"] == species_b)
        & (df["island"] == island_b)
        & (df["sex"].str.lower() == sex_bn)
    ]

    group_a = _group_kpis(df_a, sex_an)
    group_b = _group_kpis(df_b, sex_bn)

    difference = {}
    for feature in NUMERIC_FEATURES:
        a_val = group_a[feature]
        b_val = group_b[feature]
        difference[feature] = None if (a_val is None or b_val is None) else float(b_val - a_val)

    difference["count"] = int(group_b["count"] - group_a["count"])

    label_a = f"{species_a} from {island_a} ({_sex_label(sex_an)})"
    label_b = f"{species_b} from {island_b} ({_sex_label(sex_bn)})"

    scales_a = build_stand_in_scales(group_a)
    scales_b = build_stand_in_scales(group_b)

    annotations = {
        "radar": build_radar_annotation(group_a, group_b, label_a, label_b),
        "difference": build_difference_annotation(group_a, group_b, label_a, label_b),
        "boxplot": build_boxplot_annotations(df_a, df_b, label_a, label_b),
        "standIn": build_stand_in_annotation(group_a, group_b, label_a, label_b),
    }

    return {
        "groupA": group_a,
        "groupB": group_b,
        "difference": difference,
        "rawA": _raw_records(df_a),
        "rawB": _raw_records(df_b),
        "annotations": annotations,
        "standInScales": {
            "groupA": scales_a,
            "groupB": scales_b,
        },
    }

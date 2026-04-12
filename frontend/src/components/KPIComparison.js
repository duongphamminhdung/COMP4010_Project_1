import React from "react";

const KPI_LABELS = {
  body_mass_g: "Body Mass",
  flipper_length_mm: "Flipper Length",
  bill_length_mm: "Bill Length",
  bill_depth_mm: "Bill Depth",
  count: "Count",
};

const KPI_KEYS = [
  "body_mass_g",
  "flipper_length_mm",
  "bill_length_mm",
  "bill_depth_mm",
  "count",
];

const UNIT = {
  body_mass_g: "g",
  flipper_length_mm: "mm",
  bill_length_mm: "mm",
  bill_depth_mm: "mm",
  count: "",
};

function formatKpiNumber(key, value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  return Number(value);
}

function displayValue(key, value) {
  if (value == null || Number.isNaN(Number(value))) return "N/A";
  const n = Number(value);
  const s = n.toFixed(1);
  const u = UNIT[key];
  return u ? `${s} ${u}` : s;
}

function computeDiff(key, aVal, bVal) {
  const a = formatKpiNumber(key, aVal);
  const b = formatKpiNumber(key, bVal);
  if (a === null || b === null) return null;
  return b - a;
}

function KPIComparison({ groupA, groupB, labelA, labelB, singleGroup = false }) {
  if (singleGroup) {
    return (
      <div>
        <h3 className="page3-section-title">KPIs for {labelA}</h3>
        <div className="page3-kpi-grid">
          {KPI_KEYS.map((key) => (
            <div key={key} className="page3-card">
              <strong>
                {KPI_LABELS[key]}
                {UNIT[key] ? ` (${UNIT[key]})` : ""}
              </strong>
              <div style={{ marginTop: 8 }} className="page3-kpi-single-value">
                {displayValue(key, groupA?.[key])}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="page3-section-title">KPI Comparison</h3>
      <div className="page3-kpi-grid">
        {KPI_KEYS.map((key) => {
          const diff = computeDiff(key, groupA?.[key], groupB?.[key]);
          const u = UNIT[key];
          const unitSuffix = u ? ` ${u}` : "";

          let centerClass = "page3-kpi-diff page3-kpi-diff-zero";
          let arrow = "→";
          if (diff != null) {
            if (diff > 0) {
              centerClass = "page3-kpi-diff page3-kpi-diff-pos";
              arrow = "↑";
            } else if (diff < 0) {
              centerClass = "page3-kpi-diff page3-kpi-diff-neg";
              arrow = "↓";
            }
          }

          const diffStr =
            diff == null
              ? "—"
              : `${diff > 0 ? "+" : ""}${diff.toFixed(1)}${unitSuffix}`;

          return (
            <div key={key} className="page3-card page3-kpi-card">
              <strong>
                {KPI_LABELS[key]}
                {u ? ` (${u})` : ""}
              </strong>
              <div className="page3-kpi-row">
                <div className="page3-kpi-side page3-kpi-side-a" title={labelA}>
                  <span className="page3-kpi-side-label">{labelA}</span>
                  <span className="page3-kpi-val-a">{displayValue(key, groupA?.[key])}</span>
                </div>
                <div className="page3-kpi-center">
                  <div className={centerClass}>
                    <span className="page3-kpi-arrow" aria-hidden>
                      {arrow}
                    </span>{" "}
                    <span className="page3-kpi-diff-val">{diffStr}</span>
                  </div>
                </div>
                <div className="page3-kpi-side page3-kpi-side-b" title={labelB}>
                  <span className="page3-kpi-side-label">{labelB}</span>
                  <span className="page3-kpi-val-b">{displayValue(key, groupB?.[key])}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default KPIComparison;

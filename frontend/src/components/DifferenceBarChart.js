import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  ReferenceLine,
} from "recharts";

const FEATURE_META = [
  { key: "body_mass_g", label: "Body Mass" },
  { key: "flipper_length_mm", label: "Flipper Length" },
  { key: "bill_length_mm", label: "Bill Length" },
  { key: "bill_depth_mm", label: "Bill Depth" },
];

/** Group A vs B — saturated enough to read clearly on light backgrounds. */
const COLOR_GROUP_A = "#1a78c9";
const COLOR_GROUP_B = "#bf4f7c";

/**
 * Symmetric gap: how much % larger the bigger mean is than the smaller,
 * relative to the smaller — answers "which is bigger, by what %?".
 */
function percentGapBetweenMeans(groupA, groupB, key) {
  const a = groupA?.[key];
  const b = groupB?.[key];
  if (a == null || b == null || Number.isNaN(Number(a)) || Number.isNaN(Number(b))) {
    return null;
  }
  const an = Number(a);
  const bn = Number(b);
  if (an === bn) {
    return { pct: 0, higherIsB: false, tie: true };
  }
  const lo = Math.min(an, bn);
  const hi = Math.max(an, bn);
  if (lo === 0) return null;
  const pct = ((hi - lo) / lo) * 100;
  return { pct, higherIsB: bn > an, tie: false };
}

function DifferenceBarChart({ groupA, groupB, labelA, labelB, annotation = "" }) {
  const data = useMemo(() => {
    return FEATURE_META.map(({ key, label }) => {
      const gap = percentGapBetweenMeans(groupA, groupB, key);
      if (gap == null) {
        return {
          feature: label,
          value: 0,
          labelText: "N/A",
          hasPct: false,
          higherIsB: null,
          tie: null,
        };
      }
      const { pct, higherIsB, tie } = gap;
      return {
        feature: label,
        value: pct,
        labelText: tie ? "0%" : `${pct.toFixed(1)}%`,
        hasPct: true,
        higherIsB,
        tie,
      };
    });
  }, [groupA, groupB]);

  return (
    <div>
      <h3 className="page3-section-title">Which species has the bigger feature?</h3>
      <div className="page3-diff-legend" role="group" aria-label="Group colors">
        <div className="page3-diff-legend-item">
          <span
            className="page3-diff-legend-swatch page3-diff-legend-swatch-group-a"
            aria-hidden
          />
          <span>{labelA}</span>
        </div>
        <div className="page3-diff-legend-item">
          <span
            className="page3-diff-legend-swatch page3-diff-legend-swatch-group-b"
            aria-hidden
          />
          <span>{labelB}</span>
        </div>
      </div>
      <div className="page3-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 16, right: 64, left: 20, bottom: 16 }}
          >
            <XAxis
              type="number"
              tick={{ fill: "#355e7a", fontSize: 11 }}
              axisLine={{ stroke: "#a9d6e5" }}
              tickLine={{ stroke: "#a9d6e5" }}
              tickFormatter={(v) => `${v}%`}
              domain={[0, "auto"]}
            />
            <YAxis
              type="category"
              dataKey="feature"
              width={118}
              tick={{ fill: "#0b2545", fontSize: 11 }}
              axisLine={{ stroke: "#a9d6e5" }}
              tickLine={{ stroke: "#a9d6e5" }}
            />
            <Tooltip
              cursor={false}
              formatter={(val, _name, props) => {
                const row = props?.payload;
                if (!row?.hasPct) return ["N/A", "Gap between means"];
                const pct = Number(val).toFixed(1);
                if (row.tie) {
                  return [`${pct}%`, "Same mean for both groups"];
                }
                const larger = row.higherIsB ? labelB : labelA;
                return [
                  `${pct}% above the smaller mean`,
                  `Larger mean: ${larger}`,
                ];
              }}
              labelFormatter={(name) => name}
              contentStyle={{
                backgroundColor: "#1b4965",
                border: "1px solid #a9d6e5",
                borderRadius: "8px",
                color: "#f4faff",
              }}
              labelStyle={{
                color: "#f4faff",
                fontWeight: 600,
                fontSize: 13,
                marginBottom: 6,
              }}
              itemStyle={{
                color: "#dbeafe",
                fontSize: 12,
                paddingTop: 2,
                paddingBottom: 2,
              }}
              wrapperStyle={{ outline: "none" }}
            />
            <Bar dataKey="value" radius={[0, 3, 3, 0]} isAnimationActive={false}>
              <LabelList
                dataKey="labelText"
                position="right"
                fill="#f4faff"
                fontSize={11}
                offset={6}
                style={{ fontWeight: 600 }}
              />
              {data.map((entry) => {
                if (!entry.hasPct) return <Cell key={entry.feature} fill="#94a3b8" />;
                if (entry.tie) return <Cell key={entry.feature} fill="#a9d6e5" />;
                return (
                  <Cell
                    key={entry.feature}
                    fill={entry.higherIsB ? COLOR_GROUP_B : COLOR_GROUP_A}
                  />
                );
              })}
            </Bar>
            <ReferenceLine x={0} stroke="#a9d6e5" strokeWidth={1} strokeDasharray="4 4" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <aside className="page3-viz-callout" role="note" aria-label="Interpretation of this chart">
        <span className="page3-viz-callout__tag">What this shows</span>
        <p className="page3-viz-callout__p">
          {annotation.split("**").map((chunk, i) =>
            i % 2 === 1 ? (
              <strong key={i}>{chunk}</strong>
            ) : (
              <span key={i}>{chunk}</span>
            )
          )}
        </p>
      </aside>
    </div>
  );
}

export default DifferenceBarChart;

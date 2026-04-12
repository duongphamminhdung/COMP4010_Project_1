import React, { useMemo } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

const FEATURES = [
  { key: "body_mass_g", label: "Body Mass", unit: "g" },
  { key: "flipper_length_mm", label: "Flipper Length", unit: "mm" },
  { key: "bill_length_mm", label: "Bill Length", unit: "mm" },
  { key: "bill_depth_mm", label: "Bill Depth", unit: "mm" },
];

function RadarTooltip({ active, payload, label, labelA, labelB }) {
  if (!active || !payload || !payload.length) return null;
  const entry = payload[0]?.payload;
  if (!entry) return null;
  const feat = FEATURES.find((f) => f.label === entry.feature);
  const unit = feat?.unit ?? "";
  return (
    <div
      style={{
        background: "#1b4965",
        border: "1px solid #a9d6e5",
        borderRadius: 8,
        padding: "10px 14px",
        color: "#f4faff",
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{entry.feature}</div>
      <div style={{ color: "#a9d6e5" }}>
        <span style={{ color: "#4da8da", fontWeight: 600 }}>{labelA}:</span>{" "}
        {entry.rawA != null ? `${entry.rawA.toFixed(1)} ${unit}` : "N/A"}
      </div>
      <div style={{ color: "#a9d6e5" }}>
        <span style={{ color: "#c9799a", fontWeight: 600 }}>{labelB}:</span>{" "}
        {entry.rawB != null ? `${entry.rawB.toFixed(1)} ${unit}` : "N/A"}
      </div>
    </div>
  );
}

function RadarChartComponent({ groupA, groupB, labelA, labelB, annotation = "" }) {
  const radarData = useMemo(() => {
    return FEATURES.map(({ key, label }) => {
      const aValue = groupA?.[key] ?? 0;
      const bValue = groupB?.[key] ?? 0;
      const maxValue = Math.max(aValue, bValue, 1);

      return {
        feature: label,
        groupA: parseFloat((aValue / maxValue).toFixed(3)),
        groupB: parseFloat((bValue / maxValue).toFixed(3)),
        rawA: aValue,
        rawB: bValue,
      };
    });
  }, [groupA, groupB]);

  return (
    <div>
      <h3 className="page3-section-title">Radar Chart — Shape of Each Group</h3>
      <div className="page3-chart" style={{ height: 420 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
            <PolarGrid stroke="rgba(169, 214, 229, 0.8)" />
            <PolarAngleAxis
              dataKey="feature"
              stroke="#0b2545"
              tick={{ fill: "#0b2545", fontSize: 13, fontWeight: 600 }}
            />
            <PolarRadiusAxis domain={[0, 1]} stroke="#a9d6e5" tick={false} axisLine={false} />
            <Tooltip content={<RadarTooltip labelA={labelA} labelB={labelB} />} />
            <Radar name={labelA} dataKey="groupA" stroke="#2e86bb" fill="#4da8da" fillOpacity={0.32} strokeWidth={2} />
            <Radar name={labelB} dataKey="groupB" stroke="#a85478" fill="#c9799a" fillOpacity={0.32} strokeWidth={2} />
            <Legend
              wrapperStyle={{ color: "#0b2545", fontSize: 13, paddingTop: 8 }}
              iconType="circle"
              iconSize={10}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <aside className="page3-viz-callout" role="note" aria-label="Group mean comparison">
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

export default RadarChartComponent;

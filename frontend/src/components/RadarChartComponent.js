import React, { useMemo } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";

const FEATURES = [
  { key: "body_mass_g", label: "Body Mass" },
  { key: "flipper_length_mm", label: "Flipper Length" },
  { key: "bill_length_mm", label: "Bill Length" },
  { key: "bill_depth_mm", label: "Bill Depth" },
];

function RadarChartComponent({ groupA, groupB, labelA, labelB, annotation = "" }) {
  const radarData = useMemo(() => {
    return FEATURES.map(({ key, label }) => {
      const aValue = groupA?.[key] ?? 0;
      const bValue = groupB?.[key] ?? 0;
      const maxValue = Math.max(aValue, bValue, 1);

      return {
        feature: label,
        groupA: aValue / maxValue,
        groupB: bValue / maxValue,
      };
    });
  }, [groupA, groupB]);

  return (
    <div>
      <h3 className="page3-section-title">Radar Chart</h3>
      <div className="page3-chart">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid stroke="#a9d6e5" />
            <PolarAngleAxis dataKey="feature" stroke="#0b2545" tick={{ fill: "#0b2545", fontSize: 11 }} />
            <PolarRadiusAxis domain={[0, 1]} stroke="#a9d6e5" tick={false} />
            <Radar name={labelA} dataKey="groupA" stroke="#4a9bc4" fill="#6eb8e5" fillOpacity={0.28} />
            <Radar name={labelB} dataKey="groupB" stroke="#c48aa8" fill="#dbaac2" fillOpacity={0.28} />
            <Legend wrapperStyle={{ color: "#0b2545", fontSize: 12 }} />
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

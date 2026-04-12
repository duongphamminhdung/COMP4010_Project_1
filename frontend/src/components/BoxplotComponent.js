import React, { useMemo, useState } from "react";
import Plot from "react-plotly.js";

const FEATURE_OPTIONS = [
  { key: "body_mass_g", label: "Body Mass (g)" },
  { key: "flipper_length_mm", label: "Flipper Length (mm)" },
  { key: "bill_length_mm", label: "Bill Length (mm)" },
  { key: "bill_depth_mm", label: "Bill Depth (mm)" },
];

// Antarctic Ice — match Page 3 light theme
const PLOTLY_PAPER = "#f4faff";
const PLOTLY_PLOT = "#ffffff";
const PLOTLY_TEXT = "#0b2545";
const PLOTLY_MUTED = "#355e7a";
const PLOTLY_GRID = "rgba(169, 214, 229, 0.85)";

const COLOR_A = "#6eb8e5";
const COLOR_B = "#dbaac2";
const COLOR_A_LINE = "#4a9bc4";
const COLOR_B_LINE = "#b87a98";

/** Two-line x tick: species on first line, "from Island" on second — keeps labels under boxes without rotation. */
function categoryLabelForAxis(fullLabel) {
  if (typeof fullLabel !== "string") return fullLabel;
  const m = fullLabel.match(/^(.+?)\s+from\s+(.+)$/i);
  if (m) return `${m[1]}<br>from ${m[2]}`;
  return fullLabel;
}

function boxHoverTemplate() {
  return (
    "max: %{max}<br>" +
    "upper fence: %{upperfence}<br>" +
    "q3: %{q3}<br>" +
    "median: %{median}<br>" +
    "q1: %{q1}<br>" +
    "lower fence: %{lowerfence}<br>" +
    "min: %{min}<extra></extra>"
  );
}

function BoxplotComponent({
  rawA = [],
  rawB = [],
  labelA = "Group 1",
  labelB = "Group 2",
  boxplotAnnotations = {},
}) {
  const [feature, setFeature] = useState("body_mass_g");

  const featureLabel = useMemo(
    () => FEATURE_OPTIONS.find((o) => o.key === feature)?.label ?? feature,
    [feature]
  );

  const { valuesA, valuesB } = useMemo(() => {
    return {
      valuesA: rawA.map((row) => row[feature]).filter((v) => typeof v === "number"),
      valuesB: rawB.map((row) => row[feature]).filter((v) => typeof v === "number"),
    };
  }, [rawA, rawB, feature]);

  const catA = useMemo(() => categoryLabelForAxis(labelA), [labelA]);
  const catB = useMemo(() => categoryLabelForAxis(labelB), [labelB]);

  // X categories use <br> for axis only; trace `name` stays one-line for the legend.
  const xA = useMemo(() => valuesA.map(() => catA), [valuesA, catA]);
  const xB = useMemo(() => valuesB.map(() => catB), [valuesB, catB]);

  const boxAnnotation =
    boxplotAnnotations[feature] ??
    "There aren’t enough penguins in one or both groups to compare this measurement.";

  return (
    <div>
      <h3 className="page3-section-title">Boxplot Distribution</h3>
      <label htmlFor="boxplot-feature-select" className="page3-label">
        Feature:
      </label>
      <select
        id="boxplot-feature-select"
        value={feature}
        onChange={(e) => setFeature(e.target.value)}
        className="page3-select"
        style={{ maxWidth: 280, marginBottom: 12 }}
      >
        {FEATURE_OPTIONS.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>

      <div className="page3-boxplot-figure">
      <Plot
        data={[
          {
            y: valuesA,
            x: xA,
            type: "box",
            name: labelA,
            fillcolor: COLOR_A,
            line: { color: COLOR_A_LINE, width: 2.5 },
            marker: { color: COLOR_A, line: { color: COLOR_A_LINE, width: 1 } },
            boxpoints: "suspectedoutliers",
            boxwidth: 0.42,
            /* One hover target per box — avoids Plotly splitting median vs whiskers to opposite sides. */
            hoveron: "boxes",
            hovertemplate: boxHoverTemplate(),
          },
          {
            y: valuesB,
            x: xB,
            type: "box",
            name: labelB,
            fillcolor: COLOR_B,
            line: { color: COLOR_B_LINE, width: 2.5 },
            marker: { color: COLOR_B, line: { color: COLOR_B_LINE, width: 1 } },
            boxpoints: "suspectedoutliers",
            boxwidth: 0.42,
            hoveron: "boxes",
            hovertemplate: boxHoverTemplate(),
          },
        ]}
        config={{
          displayModeBar: false,
          responsive: true,
        }}
        layout={{
          title: {
            text: "Distribution Comparison",
            font: { color: PLOTLY_TEXT, size: 16 },
            x: 0.5,
            xanchor: "center",
          },
          autosize: true,
          margin: { l: 88, r: 230, t: 52, b: 88 },
          paper_bgcolor: PLOTLY_PAPER,
          plot_bgcolor: PLOTLY_PLOT,
          font: { color: PLOTLY_TEXT },
          /* Keep box hovers on one side; legend is vertical in the right margin. */
          hoverlabel: {
            align: "right",
            bgcolor: "#1b4965",
            bordercolor: "#a9d6e5",
            font: { color: "#ffffff", size: 12 },
            /* Hide “(Group name, …)” prefix on box split hovers; legend still uses trace `name`. */
            namelength: 0,
          },
          hovermode: "closest",
          xaxis: {
            type: "category",
            categoryorder: "array",
            categoryarray: [catA, catB],
            tickfont: { color: PLOTLY_TEXT, size: 12 },
            automargin: true,
            showline: true,
            linecolor: "#a9d6e5",
            mirror: false,
            tickangle: 0,
          },
          yaxis: {
            title: {
              text: featureLabel,
              font: { color: PLOTLY_MUTED, size: 13 },
              standoff: 14,
            },
            tickfont: { color: PLOTLY_TEXT, size: 12 },
            gridcolor: PLOTLY_GRID,
            zerolinecolor: "rgba(169, 214, 229, 0.6)",
            automargin: true,
          },
          /* x > 1 + xanchor left: legend sits in the right margin, not over the boxes. */
          legend: {
            orientation: "v",
            xref: "paper",
            yref: "paper",
            x: 1.01,
            xanchor: "left",
            y: 0.5,
            yanchor: "middle",
            bgcolor: "#ffffff",
            bordercolor: "#a9d6e5",
            borderwidth: 1,
            font: { color: PLOTLY_TEXT, size: 10 },
            itemwidth: 22,
            traceorder: "normal",
            itemsizing: "constant",
          },
        }}
        style={{ width: "100%", height: "100%" }}
        useResizeHandler
      />
      </div>
      <aside className="page3-viz-callout" role="note" aria-label="Interpretation of this boxplot">
        <span className="page3-viz-callout__tag">What this shows</span>
        <p className="page3-viz-callout__p">
          {boxAnnotation.split("**").map((chunk, i) =>
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

export default BoxplotComponent;

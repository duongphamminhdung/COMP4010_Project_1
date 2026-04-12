import React, { useMemo } from "react";

const FEATURE_LABELS = {
  body_mass_g: "body mass (weight)",
  flipper_length_mm: "flipper length (wing size)",
  bill_length_mm: "bill length (how far the beak sticks out)",
  bill_depth_mm: "bill depth (how tall the beak is)",
};

function InsightPanel({ difference, labelA, labelB }) {
  const insightText = useMemo(() => {
    if (labelA === labelB) {
      return "You picked the same group twice, so there is nothing to compare. Change one menu above if you want two different groups side by side.";
    }

    const keys = Object.keys(FEATURE_LABELS);
    const validEntries = keys
      .map((key) => ({ key, value: difference?.[key] }))
      .filter((item) => typeof item.value === "number");

    if (!validEntries.length) {
      return "We do not have enough numbers for these selections to summarize a trend.";
    }

    const biggest = validEntries.reduce((max, item) => {
      if (!max || Math.abs(item.value) > Math.abs(max.value)) {
        return item;
      }
      return max;
    }, null);

    const higherAvg = biggest.value > 0 ? labelB : labelA;
    const lowerAvg = biggest.value > 0 ? labelA : labelB;
    const secondarySimilar = validEntries
      .filter((item) => item.key !== biggest.key)
      .every((item) => Math.abs(item.value) < Math.abs(biggest.value) * 0.25);

    const similarSuffix = secondarySimilar
      ? " The other measurements are much closer between the two groups."
      : "";

    return `The clearest difference is in ${FEATURE_LABELS[biggest.key]}: ${higherAvg} has the higher average on this trait than ${lowerAvg} (we compare typical penguins for each group, not individuals).${similarSuffix}`;
  }, [difference, labelA, labelB]);

  return (
    <div className="page3-insight">
      <h3 className="page3-section-title">💡 Insight</h3>
      <p>{insightText}</p>
    </div>
  );
}

export default InsightPanel;

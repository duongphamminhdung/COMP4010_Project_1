import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import KPIComparison from "../components/KPIComparison";
import RadarChartComponent from "../components/RadarChartComponent";
import BoxplotComponent from "../components/BoxplotComponent";
import DifferenceBarChart from "../components/DifferenceBarChart";
import InsightPanel from "../components/InsightPanel";
import {
  PenguinComparisonViz,
  SelectorCardPenguin,
  groupHasPenguinPreviewData,
} from "../components/PenguinComparisonViz";
import "./Page3.css";

const SPECIES_OPTIONS = ["Adelie", "Chinstrap", "Gentoo"];
const ISLAND_OPTIONS = ["Biscoe", "Dream", "Torgersen"];
const GENDER_OPTIONS = ["Male", "Female"];

/** Message when a species+island+gender has no rows in the dataset (no plots shown). */
function missingPenguinDataMessage(labelA, labelB, countA, countB, sameSelection) {
  const aOk = (countA ?? 0) > 0;
  const bOk = (countB ?? 0) > 0;
  if (aOk && bOk) return null;
  if (sameSelection || labelA === labelB) {
    return `There are no penguins in the dataset for ${labelA}. Try another species, island, or gender.`;
  }
  if (!aOk && !bOk) {
    return `There are no penguins in the dataset for ${labelA} or ${labelB}. Try another species, island, or gender.`;
  }
  if (!aOk) {
    return `There are no penguins in the dataset for ${labelA}. Try another species, island, or gender.`;
  }
  return `There are no penguins in the dataset for ${labelB}. Try another species, island, or gender.`;
}

function GroupSelector({
  title,
  value,
  onChange,
  accentColor,
  titleClass,
  groupKpi,
  penguinMirror,
  penguinGradId,
  penguinStrokeColor,
  showPenguin,
  standInScales,
  cardTone = "a",
}) {
  const cardClass =
    cardTone === "b" ? "page3-group-card page3-group-card--b" : "page3-group-card";
  return (
    <div className={cardClass} style={{ "--selector-accent": accentColor }}>
      <h3 className={titleClass} style={{ color: accentColor }}>
        {title}
      </h3>
      <div className="page3-group-fields">
        <div className="page3-btn-field" role="group" aria-label="Species">
          <span className="page3-field-label">Species</span>
          <div className="page3-btn-group">
            {SPECIES_OPTIONS.map((species) => {
              const selected = value.species === species;
              return (
                <button
                  key={species}
                  type="button"
                  className={`page3-option-btn${selected ? " page3-option-btn--selected" : ""}`}
                  aria-pressed={selected}
                  onClick={() => onChange({ ...value, species })}
                >
                  {species}
                </button>
              );
            })}
          </div>
        </div>
        <div className="page3-btn-field" role="group" aria-label="Island">
          <span className="page3-field-label">Island</span>
          <div className="page3-btn-group">
            {ISLAND_OPTIONS.map((island) => {
              const selected = value.island === island;
              return (
                <button
                  key={island}
                  type="button"
                  className={`page3-option-btn${selected ? " page3-option-btn--selected" : ""}`}
                  aria-pressed={selected}
                  onClick={() => onChange({ ...value, island })}
                >
                  {island}
                </button>
              );
            })}
          </div>
        </div>
        <div className="page3-btn-field" role="group" aria-label="Gender">
          <span className="page3-field-label">Gender</span>
          <div className="page3-btn-group">
            {GENDER_OPTIONS.map((g) => {
              const selected = value.gender === g;
              return (
                <button
                  key={g}
                  type="button"
                  className={`page3-option-btn${selected ? " page3-option-btn--selected" : ""}`}
                  aria-pressed={selected}
                  onClick={() => onChange({ ...value, gender: g })}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {showPenguin && groupHasPenguinPreviewData(groupKpi) && (
        <SelectorCardPenguin
          group={groupKpi}
          standInScales={standInScales}
          sex={groupKpi?.sex || value.gender.toLowerCase()}
          accent={accentColor}
          strokeColor={penguinStrokeColor}
          mirror={penguinMirror}
          gradId={penguinGradId}
        />
      )}
    </div>
  );
}

function Page3() {
  const [groupA, setGroupA] = useState({ species: "Adelie", island: "Biscoe", gender: "Male" });
  const [groupB, setGroupB] = useState({ species: "Gentoo", island: "Biscoe", gender: "Female" });
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchComparison = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await axios.get("http://127.0.0.1:5000/compare", {
          params: {
            speciesA: groupA.species,
            islandA: groupA.island,
            sexA: groupA.gender.toLowerCase(),
            speciesB: groupB.species,
            islandB: groupB.island,
            sexB: groupB.gender.toLowerCase(),
          },
        });
        setComparison(response.data);
      } catch (fetchError) {
        const serverMsg = fetchError.response?.data?.error;
        setError(
          serverMsg ||
            "Failed to fetch comparison data. Make sure Flask backend is running on port 5000."
        );
        setComparison(null);
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [groupA, groupB]);

  const emptyData = useMemo(
    () => ({
      groupA: {},
      groupB: {},
      difference: {},
      rawA: [],
      rawB: [],
      annotations: { radar: "", difference: "", boxplot: {}, standIn: "" },
      standInScales: null,
    }),
    []
  );

  const data = comparison || emptyData;
  const labelA = `${groupA.species} from ${groupA.island} (${groupA.gender})`;
  const labelB = `${groupB.species} from ${groupB.island} (${groupB.gender})`;
  const sameSelection =
    groupA.species === groupB.species &&
    groupA.island === groupB.island &&
    groupA.gender === groupB.gender;

  const comparisonLoaded = comparison != null;
  const countA = data.groupA?.count;
  const countB = data.groupB?.count;
  const bothGroupsHaveData =
    comparisonLoaded && (countA ?? 0) > 0 && (countB ?? 0) > 0;

  const showCardPenguins =
    !loading &&
    !error &&
    bothGroupsHaveData &&
    data.standInScales &&
    groupHasPenguinPreviewData(data.groupA) &&
    groupHasPenguinPreviewData(data.groupB);

  const showNoDataMessage =
    !loading && !error && comparisonLoaded && !bothGroupsHaveData;

  return (
    <div className="page3">
      <h2 className="page3-title">PENGUIN FIGHT! 🐧</h2>
      <p className="page3-subtitle">Compare two penguin groups by species, island, and gender.</p>

      <div className="page3-selectors">
        <GroupSelector
          title={labelA}
          value={groupA}
          onChange={setGroupA}
          accentColor="#1a78c9"
          titleClass="page3-group-title a"
          groupKpi={data.groupA}
          penguinMirror={false}
          penguinGradId="page3-card-belly-a"
          penguinStrokeColor="rgba(11, 37, 69, 0.28)"
          showPenguin={showCardPenguins}
          standInScales={data.standInScales?.groupA}
        />
        <GroupSelector
          title={labelB}
          value={groupB}
          onChange={setGroupB}
          accentColor="#bf4f7c"
          titleClass="page3-group-title b"
          cardTone="b"
          groupKpi={data.groupB}
          penguinMirror
          penguinGradId="page3-card-belly-b"
          penguinStrokeColor="rgba(85, 28, 55, 0.48)"
          showPenguin={showCardPenguins}
          standInScales={data.standInScales?.groupB}
        />
      </div>

      {loading && <p className="page3-message">Loading comparison...</p>}
      {error && <p className="page3-error">{error}</p>}

      {showNoDataMessage && (
        <p className="page3-no-data" role="status">
          {missingPenguinDataMessage(labelA, labelB, countA, countB, sameSelection)}
        </p>
      )}

      {!loading && !error && bothGroupsHaveData && sameSelection && (
        <>
          <KPIComparison
            groupA={data.groupA}
            groupB={data.groupB}
            labelA={labelA}
            labelB={labelB}
            singleGroup
          />
          <div className="page3-prompt-compare">
            To unlock the metric penguins, radar chart, boxplot, difference chart, and insights, choose{" "}
            <strong>two different</strong> combinations of species, island, and gender above, then the full
            comparison will load.
          </div>
        </>
      )}

      {!loading && !error && bothGroupsHaveData && !sameSelection && (
        <>
          <KPIComparison groupA={data.groupA} groupB={data.groupB} labelA={labelA} labelB={labelB} />
          <RadarChartComponent
            groupA={data.groupA}
            groupB={data.groupB}
            labelA={labelA}
            labelB={labelB}
            annotation={data.annotations?.radar ?? ""}
          />
          <BoxplotComponent
            rawA={data.rawA}
            rawB={data.rawB}
            labelA={labelA}
            labelB={labelB}
            boxplotAnnotations={data.annotations?.boxplot ?? {}}
          />
          <DifferenceBarChart
            groupA={data.groupA}
            groupB={data.groupB}
            labelA={labelA}
            labelB={labelB}
            annotation={data.annotations?.difference ?? ""}
          />
          <InsightPanel difference={data.difference} labelA={labelA} labelB={labelB} />
          <PenguinComparisonViz
            groupA={data.groupA}
            groupB={data.groupB}
            labelA={labelA}
            labelB={labelB}
            vizId="page-end"
            standInScales={data.standInScales}
            annotation={data.annotations?.standIn ?? ""}
          />
        </>
      )}
    </div>
  );
}

export default Page3;

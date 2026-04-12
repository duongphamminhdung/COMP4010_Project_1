import React, { useMemo } from "react";
import "./PenguinComparisonViz.css";

const PENGUIN_STAND_IN_KEYS = [
  "body_mass_g",
  "flipper_length_mm",
  "bill_length_mm",
  "bill_depth_mm",
];

const DEFAULT_STAND_IN_SCALES = {
  body_mass_g: 1,
  flipper_length_mm: 1,
  bill_length_mm: 1,
  bill_depth_mm: 1,
};

/** Apply API `standInScales.groupA` / `groupB` objects (computed in Python). */
export function coalesceStandInScales(fromApi) {
  const out = { ...DEFAULT_STAND_IN_SCALES };
  if (!fromApi || typeof fromApi !== "object") return out;
  for (const k of Object.keys(DEFAULT_STAND_IN_SCALES)) {
    const x = Number(fromApi[k]);
    if (Number.isFinite(x)) out[k] = x;
  }
  return out;
}

function PenguinFigure({ scales, accent, strokeColor, gradId, sex = "male" }) {
  const sm = scales.body_mass_g;
  const sf = scales.flipper_length_mm;
  const sbl = scales.bill_length_mm;
  const sbd = scales.bill_depth_mm;

  /* Bases chosen so sm ≈ VISUAL_HIGH matches ~old 40×1.12 body width (keeps chart size stable). */
  const flipperRy = 34.5 * sf;
  const billW = 25.5 * sbl;
  const billH = 11.8 * sbd;
  const bodyRx = 36.5 * sm;
  const bodyRy = 49.5 * sm;
  const headR = 27.5 * sm;

  const hx = 100;
  const hy = 72;
  const bodyCy = 142;
  const billAttachX = hx + headR * 0.78;
  const billPath = `M ${billAttachX} ${hy - billH / 2} L ${billAttachX + billW} ${hy} L ${billAttachX} ${hy + billH / 2} Z`;

  const sexNorm = typeof sex === "string" ? sex.toLowerCase() : "male";
  const bowY = hy - headR - 5 * sm;
  /* Upper chest: just below the neckline, on the body ellipse (not on the head). */
  const bodyTopY = bodyCy - bodyRy;
  const bowtieY = bodyTopY + 15 * sm;

  return (
    <svg
      className="penguin-figure"
      viewBox="0 0 220 260"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
      </defs>

      <g className="penguin-figure__bob">
        <ellipse
          cx={68}
          cy={128}
          rx={13}
          ry={flipperRy}
          transform="rotate(-28 68 128)"
          fill={accent}
          stroke={strokeColor}
          strokeWidth="1.5"
        />

        <ellipse
          cx={100}
          cy={142}
          rx={bodyRx}
          ry={bodyRy}
          fill={accent}
          stroke={strokeColor}
          strokeWidth="2"
        />
        <ellipse
          cx={100}
          cy={152}
          rx={bodyRx * 0.55}
          ry={bodyRy * 0.45}
          fill={`url(#${gradId})`}
          opacity={0.95}
        />

        <ellipse
          cx={132}
          cy={128}
          rx={13}
          ry={flipperRy}
          transform="rotate(28 132 128)"
          fill={accent}
          stroke={strokeColor}
          strokeWidth="1.5"
        />

        <circle cx={hx} cy={hy} r={headR} fill={accent} stroke={strokeColor} strokeWidth="2" />

        {sexNorm === "female" && (
          <g className="penguin-figure__bow" aria-hidden>
            <ellipse
              cx={hx - 9 * sm}
              cy={bowY}
              rx={8.5 * sm}
              ry={6.5 * sm}
              fill="#fbcfe8"
              stroke="#db2777"
              strokeWidth={1.2}
            />
            <ellipse
              cx={hx + 9 * sm}
              cy={bowY}
              rx={8.5 * sm}
              ry={6.5 * sm}
              fill="#fbcfe8"
              stroke="#db2777"
              strokeWidth={1.2}
            />
            <circle cx={hx} cy={bowY + 0.5 * sm} r={4.2 * sm} fill="#ec4899" stroke="#9d174d" strokeWidth={1} />
          </g>
        )}

        {sexNorm === "male" && (
          <g className="penguin-figure__bowtie" aria-hidden>
            <ellipse
              cx={hx - 8.5 * sm}
              cy={bowtieY}
              rx={7.5 * sm}
              ry={5.2 * sm}
              fill="#0f172a"
              stroke="#1e293b"
              strokeWidth={0.85}
            />
            <ellipse
              cx={hx + 8.5 * sm}
              cy={bowtieY}
              rx={7.5 * sm}
              ry={5.2 * sm}
              fill="#0f172a"
              stroke="#1e293b"
              strokeWidth={0.85}
            />
            <ellipse
              cx={hx}
              cy={bowtieY}
              rx={3 * sm}
              ry={2.6 * sm}
              fill="#1e293b"
              stroke="#334155"
              strokeWidth={0.55}
            />
          </g>
        )}

        <circle cx={88} cy={68} r={5} fill="#0f172a" />
        <circle cx={112} cy={68} r={5} fill="#0f172a" />
        <circle cx={89} cy={67} r={1.8} fill="#fff" />
        <circle cx={113} cy={67} r={1.8} fill="#fff" />

        <path d={billPath} fill="#f59e0b" stroke="#b45309" strokeWidth="1.2" strokeLinejoin="round" />

        <ellipse cx={88} cy={208} rx={14} ry={6} fill="#f59e0b" opacity={0.92} />
        <ellipse cx={112} cy={208} rx={14} ry={6} fill="#f59e0b" opacity={0.92} />
      </g>
    </svg>
  );
}

export function groupHasPenguinPreviewData(group) {
  return PENGUIN_STAND_IN_KEYS.every((key) => {
    const v = group?.[key];
    return v != null && Number.isFinite(Number(v));
  });
}

/** Compact animated stand-in for a selector card (no copy, no legend). */
export function SelectorCardPenguin({
  group,
  standInScales,
  sex = "male",
  accent,
  strokeColor,
  mirror,
  gradId,
}) {
  const scales = useMemo(() => coalesceStandInScales(standInScales), [standInScales]);
  if (!groupHasPenguinPreviewData(group)) return null;
  const figure = (
    <PenguinFigure scales={scales} accent={accent} strokeColor={strokeColor} gradId={gradId} sex={sex} />
  );
  return (
    <div className="penguin-card-preview">
      {mirror ? <div className="penguin-card-preview__mirror">{figure}</div> : figure}
    </div>
  );
}

function hasBothGroupsForStandIn(groupA, groupB) {
  return PENGUIN_STAND_IN_KEYS.every((key) => {
    const va = groupA?.[key];
    const vb = groupB?.[key];
    return va != null && vb != null && Number.isFinite(va) && Number.isFinite(vb);
  });
}

/** Full-width stand-in: title, two figures side by side, optional annotation. */
export function PenguinComparisonViz({
  groupA,
  groupB,
  labelA,
  labelB,
  vizId = "standalone",
  standInScales,
  annotation = "",
}) {
  const scalesA = useMemo(() => coalesceStandInScales(standInScales?.groupA), [standInScales]);
  const scalesB = useMemo(() => coalesceStandInScales(standInScales?.groupB), [standInScales]);

  const gradA = `penguin-belly-${vizId}-a`;
  const gradB = `penguin-belly-${vizId}-b`;

  const hasData = useMemo(() => hasBothGroupsForStandIn(groupA, groupB), [groupA, groupB]);

  if (!hasData) {
    return (
      <div className="penguin-viz">
        <h3 className="page3-section-title">Penguin stand-in</h3>
        <p className="penguin-viz__empty">
          Not enough numeric data to build the two animated penguins for this pair of groups.
        </p>
      </div>
    );
  }

  return (
    <div className="penguin-viz">
      <h3 className="page3-section-title">Penguin stand-in</h3>
      <div className="penguin-viz__stage">
        <div className="penguin-viz__column">
          <PenguinFigure
            scales={scalesA}
            accent="#6eb8e5"
            strokeColor="rgba(30, 85, 120, 0.42)"
            gradId={gradA}
            sex={groupA?.sex}
          />
          <span className="penguin-viz__caption penguin-viz__caption--a">{labelA}</span>
        </div>
        <div className="penguin-viz__column">
          <div className="penguin-viz__mirror">
            <PenguinFigure
              scales={scalesB}
              accent="#dbaac2"
              strokeColor="rgba(115, 65, 88, 0.42)"
              gradId={gradB}
              sex={groupB?.sex}
            />
          </div>
          <span className="penguin-viz__caption penguin-viz__caption--b">{labelB}</span>
        </div>
      </div>
      {annotation ? (
        <aside className="page3-viz-callout" role="note" aria-label="Stand-in annotation">
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
      ) : null}
    </div>
  );
}

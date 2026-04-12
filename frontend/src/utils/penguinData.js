/**
 * penguinData.js — Pure frontend replacement for the Flask backend.
 * Loads penguins_clean.csv (already in public/), filters, computes KPIs,
 * builds annotations, and returns the exact same payload shape as the
 * Python build_comparison() function.
 */

const NUMERIC_FEATURES = [
  'body_mass_g',
  'flipper_length_mm',
  'bill_length_mm',
  'bill_depth_mm',
];

const FEATURE_LABELS = {
  body_mass_g:       'Body Mass',
  flipper_length_mm: 'Flipper Length',
  bill_length_mm:    'Bill Length',
  bill_depth_mm:     'Bill Depth',
};

const FEATURE_LABELS_LONG = {
  body_mass_g:       'Body Mass (g)',
  flipper_length_mm: 'Flipper Length (mm)',
  bill_length_mm:    'Bill Length (mm)',
  bill_depth_mm:     'Bill Depth (mm)',
};

const STAND_IN_PALMER = {
  body_mass_g:       [2700, 6300],
  flipper_length_mm: [172, 231],
  bill_length_mm:    [32, 60],
  bill_depth_mm:     [13, 22],
};

// ── CSV loader (cached) ────────────────────────────────────────────────────
let _csvCache = null;

function parseCsv(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = line.split(',');
    const row = {};
    headers.forEach((h, i) => {
      const v = (vals[i] || '').trim();
      row[h] = v;
    });
    return row;
  });
}

async function loadData() {
  if (_csvCache) return _csvCache;
  const url = process.env.PUBLIC_URL + '/penguins_clean.csv';
  const res = await fetch(url);
  const text = await res.text();
  const rows = parseCsv(text);
  // Keep only rows with all required numeric columns
  _csvCache = rows.filter(r =>
    NUMERIC_FEATURES.every(f => r[f] !== '' && !isNaN(parseFloat(r[f])))
  ).map(r => ({
    species:          r.species,
    island:           r.island,
    sex:              r.sex.toLowerCase(),
    body_mass_g:      parseFloat(r.body_mass_g),
    flipper_length_mm:parseFloat(r.flipper_length_mm),
    bill_length_mm:   parseFloat(r.bill_length_mm),
    bill_depth_mm:    parseFloat(r.bill_depth_mm),
  }));
  return _csvCache;
}

// ── Stats helpers ──────────────────────────────────────────────────────────
function mean(arr) {
  if (!arr.length) return null;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function groupKpis(rows, sex) {
  if (!rows.length) {
    return { body_mass_g: null, flipper_length_mm: null, bill_length_mm: null, bill_depth_mm: null, count: 0, sex };
  }
  const out = { count: rows.length, sex };
  NUMERIC_FEATURES.forEach(f => {
    out[f] = mean(rows.map(r => r[f]));
  });
  return out;
}

function rawRecords(rows) {
  return rows.map(r => {
    const o = {};
    NUMERIC_FEATURES.forEach(f => { o[f] = r[f]; });
    return o;
  });
}

// ── Stand-in scales ────────────────────────────────────────────────────────
const GAMMAS = { body_mass_g: 1.08, flipper_length_mm: 1.0, bill_length_mm: 1.16, bill_depth_mm: 1.12 };

function standInMetricScale(value, lo, hi, gamma = 1.0) {
  if (value == null || isNaN(value)) return 1.0;
  const span = hi - lo;
  if (span <= 0) return 1.0;
  const t = Math.max(0, Math.min(1, (value - lo) / span));
  const curved = gamma === 1.0 ? t : Math.pow(t, gamma);
  return 0.78 + curved * (1.22 - 0.78);
}

function buildStandInScales(group) {
  const out = {};
  NUMERIC_FEATURES.forEach(f => {
    const [lo, hi] = STAND_IN_PALMER[f];
    out[f] = standInMetricScale(group[f], lo, hi, GAMMAS[f]);
  });
  return out;
}

// ── Annotation builders ────────────────────────────────────────────────────
function fmtMean(key, v) {
  if (v == null) return '?';
  if (key === 'body_mass_g') return `${Math.round(v)} g`;
  return `${v.toFixed(1)} mm`;
}

function buildRadarAnnotation(groupA, groupB, labelA, labelB) {
  const valid = NUMERIC_FEATURES.filter(f => groupA[f] != null && groupB[f] != null);
  if (!valid.length) return '';
  let bestKey = null, bestGap = -1;
  valid.forEach(f => {
    const [lo, hi] = STAND_IN_PALMER[f];
    const span = hi - lo;
    if (span <= 0) return;
    const na = (groupA[f] - lo) / span;
    const nb = (groupB[f] - lo) / span;
    const gap = Math.abs(na - nb);
    if (gap > bestGap) { bestGap = gap; bestKey = f; }
  });
  if (!bestKey) return '';
  const higher = groupB[bestKey] > groupA[bestKey] ? labelB : labelA;
  return `**Biggest gap:** ${FEATURE_LABELS[bestKey]} — higher side **${higher}** (${fmtMean(bestKey, groupA[bestKey])} vs ${fmtMean(bestKey, groupB[bestKey])}).`;
}

function buildDifferenceAnnotation(groupA, groupB, labelA, labelB) {
  const valid = NUMERIC_FEATURES
    .filter(f => groupA[f] != null && groupB[f] != null)
    .map(f => {
      const pct = groupA[f] !== 0 ? Math.abs(groupB[f] - groupA[f]) / groupA[f] * 100 : 0;
      return { key: f, pct, higherIsB: groupB[f] > groupA[f], feature: FEATURE_LABELS[f] };
    });
  if (!valid.length) return 'Need numbers for both groups.';
  const top = [...valid].sort((a, b) => b.pct - a.pct)[0];
  const bLeads = valid.filter(r => r.higherIsB).length;
  const aLeads = valid.filter(r => !r.higherIsB).length;
  const topWho = top.higherIsB ? labelB : labelA;
  let s = `Each bar = **percent gap** between the two groups' **averages**. `;
  s += `**Biggest gap:** ${top.feature} (~${top.pct.toFixed(1)}%), higher side **${topWho}**. `;
  s += `**Scorecard:** **${labelB}** ${bLeads}/${valid.length} traits higher, **${labelA}** ${aLeads}/${valid.length}.`;
  return s;
}

function buildBoxplotAnnotations(rowsA, rowsB, labelA, labelB) {
  const out = {};
  NUMERIC_FEATURES.forEach(f => {
    const title = FEATURE_LABELS_LONG[f];
    const valsA = rowsA.map(r => r[f]).filter(v => v != null);
    const valsB = rowsB.map(r => r[f]).filter(v => v != null);
    if (!valsA.length || !valsB.length) {
      out[f] = 'Not enough data to compare this measurement.';
      return;
    }
    const ma = median(valsA), mb = median(valsB);
    const nA = valsA.length, nB = valsB.length;
    if (Math.abs(ma - mb) < 1e-9) {
      out[f] = `**${title}:** Both groups near ${fmtMean(f, ma)} — **${labelA}** (${nA}), **${labelB}** (${nB}).`;
      return;
    }
    const higher = ma > mb ? labelA : labelB;
    const lower  = ma > mb ? labelB : labelA;
    const diff = Math.abs(ma - mb);
    const decimals = f === 'body_mass_g' ? 0 : 1;
    const unit = f === 'body_mass_g' ? 'g' : 'mm';
    out[f] = `**${title}:** Medians ${fmtMean(f, ma)} (**${labelA}**, n=${nA}) vs ${fmtMean(f, mb)} (**${labelB}**, n=${nB}). **${higher}** higher by **${diff.toFixed(decimals)} ${unit}** than **${lower}**.`;
  });
  return out;
}

function buildStandInAnnotation(groupA, groupB, labelA, labelB) {
  const scalesA = buildStandInScales(groupA);
  const scalesB = buildStandInScales(groupB);
  let bestKey = null, bestGap = -1;
  NUMERIC_FEATURES.forEach(f => {
    if (groupA[f] == null || groupB[f] == null) return;
    const gap = Math.abs(scalesA[f] - scalesB[f]);
    if (gap > bestGap) { bestGap = gap; bestKey = f; }
  });
  if (!bestKey) return 'Need numbers for both groups to explain the cartoons.';
  const higher = groupB[bestKey] > groupA[bestKey] ? labelB : labelA;
  return `**Most visible difference:** ${FEATURE_LABELS[bestKey]} — **${higher}** group is notably ${bestKey === 'body_mass_g' ? 'heavier' : 'longer'} on average.`;
}

// ── Main export ────────────────────────────────────────────────────────────
export async function buildComparison(
  speciesA, islandA, sexA,
  speciesB, islandB, sexB
) {
  const df = await loadData();

  const sA = sexA.toLowerCase();
  const sB = sexB.toLowerCase();

  const rowsA = df.filter(r =>
    r.species === speciesA && r.island === islandA && r.sex === sA
  );
  const rowsB = df.filter(r =>
    r.species === speciesB && r.island === islandB && r.sex === sB
  );

  const groupA = groupKpis(rowsA, sA);
  const groupB = groupKpis(rowsB, sB);

  const difference = { count: groupB.count - groupA.count };
  NUMERIC_FEATURES.forEach(f => {
    difference[f] = (groupA[f] == null || groupB[f] == null)
      ? null
      : groupB[f] - groupA[f];
  });

  const labelA = `${speciesA} from ${islandA} (${sexA})`;
  const labelB = `${speciesB} from ${islandB} (${sexB})`;

  const rawA = rawRecords(rowsA);
  const rawB = rawRecords(rowsB);

  const scalesA = buildStandInScales(groupA);
  const scalesB = buildStandInScales(groupB);

  return {
    groupA,
    groupB,
    difference,
    rawA,
    rawB,
    annotations: {
      radar:      buildRadarAnnotation(groupA, groupB, labelA, labelB),
      difference: buildDifferenceAnnotation(groupA, groupB, labelA, labelB),
      boxplot:    buildBoxplotAnnotations(rawA, rawB, labelA, labelB),
      standIn:    buildStandInAnnotation(groupA, groupB, labelA, labelB),
    },
    standInScales: {
      groupA: scalesA,
      groupB: scalesB,
    },
  };
}

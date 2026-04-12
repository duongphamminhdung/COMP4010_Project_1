// Page 2 - Phuc (converted from demo_test.html to React)
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Plotly from 'plotly.js/dist/plotly-cartesian.min';
import './Page2.css';

// ===================== CONFIG =====================
const COLORS = {
  Adelie:    '#4DA8DA',
  Chinstrap: '#e07b39',
  Gentoo:    '#38a169',
  gray:      '#C8D8E4',
  teal:      '#4DA8DA',
  ocean:     '#1B4965',
};

const FEAT_LABEL = {
  bill_length_mm:    'Bill Length (mm)',
  bill_depth_mm:     'Bill Depth (mm)',
  flipper_length_mm: 'Flipper Length (mm)',
  body_mass_g:       'Body Mass (g)',
};

const FEAT_SHORT = {
  bill_length_mm:    'bill length',
  bill_depth_mm:     'bill depth',
  flipper_length_mm: 'flipper length',
  body_mass_g:       'body mass',
};

const BASE_LAYOUT = {
  paper_bgcolor: '#fff',
  plot_bgcolor:  '#fff',
  font: { family: '-apple-system,Segoe UI,Roboto,sans-serif', color: '#1B2B3A' },
};

const SPECIES_LIST = ['Adelie', 'Chinstrap', 'Gentoo'];

const ISLAND_SPECIES = {
  ALL:       new Set(['Adelie', 'Chinstrap', 'Gentoo']),
  Biscoe:    new Set(['Adelie', 'Gentoo']),
  Dream:     new Set(['Adelie', 'Chinstrap']),
  Torgersen: new Set(['Adelie']),
};

const MISSIONS = {
  giants: {
    island: 'Biscoe', selX: 'flipper_length_mm', selY: 'body_mass_g',
    species: ['Adelie', 'Chinstrap', 'Gentoo'], sex: ['male', 'female'],
    title: 'The Island of Giants',
    insight: '<b>Look at the blue cluster (Gentoo).</b> On Biscoe Island, they have evolved massive bodies and long flippers\u2014almost like underwater wings\u2014to dive deeper and stay warmer than the smaller Adelies.',
  },
  mystery: {
    island: 'Dream', selX: 'bill_length_mm', selY: 'bill_depth_mm',
    species: ['Adelie', 'Chinstrap', 'Gentoo'], sex: ['male', 'female'],
    title: 'The Bill Shape Mystery',
    insight: '<b>Compare the red (Adelie) and teal (Chinstrap) clusters.</b> Even though they weigh about the same, Chinstraps have much longer, thinner bills, while Adelies have shorter, deeper bills. They evolved different \u2018tools\u2019 to hunt different prey in the same waters!',
  },
  gender: {
    island: 'ALL', selX: 'flipper_length_mm', selY: 'body_mass_g',
    species: ['Adelie', 'Chinstrap', 'Gentoo'], sex: ['male', 'female'],
    title: 'The Gender Gap',
    insight: '<b>Nature\u2019s consistent rule:</b> Across every species and island, males (circles) are consistently larger than females (diamonds). This is a biological fingerprint called \u2018Sexual Dimorphism\u2019 visible in every cluster.',
  },
};

const ZONES = [
  { feat: 'bill_length_mm',    left: '76%', top: '25%', label: 'BL', tooltip: 'Bill Length (mm)' },
  { feat: 'bill_depth_mm',     left: '68%', top: '31%', label: 'BD', tooltip: 'Bill Depth (mm)' },
  { feat: 'flipper_length_mm', left: '30%', top: '48%', label: 'FL', tooltip: 'Flipper Length (mm)' },
  { feat: 'body_mass_g',       left: '55%', top: '64%', label: 'BM', tooltip: 'Body Mass (grams)' },
];

// ===================== HELPERS =====================
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(',');
  const numeric = new Set(['bill_length_mm', 'bill_depth_mm', 'flipper_length_mm', 'body_mass_g', 'year']);
  return lines.map(line => {
    const cells = [];
    let current = '', inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { cells.push(current); current = ''; }
      else { current += ch; }
    }
    cells.push(current);
    const row = {};
    headers.forEach((h, i) => {
      const v = cells[i];
      row[h] = numeric.has(h) ? parseFloat(v) : v;
    });
    return row;
  });
}

function mean(arr) {
  const valid = arr.filter(v => v != null && !isNaN(v));
  if (!valid.length) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function fmt(feat, val) {
  if (val == null || isNaN(val)) return '\u2014';
  if (feat === 'body_mass_g') return Math.round(val).toLocaleString() + ' g';
  return val.toFixed(1) + ' mm';
}

// ===================== K-MEANS ALGORITHM =====================
// Colorblind-safe palette (Wong 2011) — distinct from species colors
const KMEANS_COLORS  = ['#0072B2', '#E69F00', '#CC79A7', '#56B4E9', '#D55E00'];

const KMeans = (() => {
  function standardize(pts) {
    const n = pts.length, d = pts[0].length;
    const means = new Array(d).fill(0), stds = new Array(d).fill(0);
    for (const p of pts) p.forEach((v, i) => { means[i] += v; });
    means.forEach((s, i) => { means[i] = s / n; });
    for (const p of pts) p.forEach((v, i) => { stds[i] += (v - means[i]) ** 2; });
    stds.forEach((s, i) => { stds[i] = Math.sqrt(s / n) || 1; });
    return pts.map(p => p.map((v, i) => (v - means[i]) / stds[i]));
  }
  function distSq(a, b) {
    return a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0);
  }
  function initPlusPlus(pts, k) {
    const centers = [pts[Math.floor(Math.random() * pts.length)]];
    for (let c = 1; c < k; c++) {
      const dists = pts.map(p => Math.min(...centers.map(ct => distSq(p, ct))));
      const total = dists.reduce((a, b) => a + b, 0);
      let rand = Math.random() * total;
      let chosen = pts[pts.length - 1];
      for (let i = 0; i < pts.length; i++) {
        rand -= dists[i];
        if (rand <= 0) { chosen = pts[i]; break; }
      }
      centers.push(chosen);
    }
    return centers;
  }
  function assign(pts, centers) {
    return pts.map(p => {
      let minD = Infinity, minIdx = 0;
      centers.forEach((c, i) => { const d = distSq(p, c); if (d < minD) { minD = d; minIdx = i; } });
      return minIdx;
    });
  }
  function recompute(pts, labels, k) {
    const d = pts[0].length;
    const sums = Array.from({ length: k }, () => new Array(d).fill(0));
    const counts = new Array(k).fill(0);
    pts.forEach((p, i) => { const c = labels[i]; p.forEach((v, j) => { sums[c][j] += v; }); counts[c]++; });
    return sums.map((s, c) =>
      counts[c] > 0 ? s.map(v => v / counts[c]) : pts[Math.floor(Math.random() * pts.length)]
    );
  }
  function inertia(pts, labels, centers) {
    return pts.reduce((sum, p, i) => sum + distSq(p, centers[labels[i]]), 0);
  }
  function fit(rawPts, k, maxIter = 300, nInit = 5) {
    if (rawPts.length < k) return { labels: rawPts.map(() => 0), inertia: 0 };
    const pts = standardize(rawPts);
    let bestLabels = null, bestInertia = Infinity;
    for (let run = 0; run < nInit; run++) {
      let centers = initPlusPlus(pts, k);
      let labels  = assign(pts, centers);
      for (let iter = 0; iter < maxIter; iter++) {
        const newCenters = recompute(pts, labels, k);
        const newLabels  = assign(pts, newCenters);
        const converged  = newLabels.every((l, i) => l === labels[i]);
        centers = newCenters; labels = newLabels;
        if (converged) break;
      }
      const iner = inertia(pts, labels, centers);
      if (iner < bestInertia) { bestInertia = iner; bestLabels = labels; }
    }
    return { labels: bestLabels, inertia: bestInertia };
  }
  return { fit };
})();

// ===================== COMPONENT =====================
const Page2 = ({ island, onBack, onGoToComparison }) => {
  // Data state
  const [allData, setAllData] = useState([]);
  const [maxSpeciesCount, setMaxSpeciesCount] = useState(0);
  const [featRange, setFeatRange] = useState({});

  // Interaction state
  const [selX, setSelX] = useState(null);
  const [selY, setSelY] = useState(null);
  const orderRef = useRef([]);
  const [species, setSpecies] = useState(new Set(SPECIES_LIST));
  const [sex, setSex] = useState(new Set(['male', 'female']));
  const [islandFilter, setIslandFilter] = useState(island || 'ALL');
  const [mission, setMission] = useState(null);
  const [kmeansOn, setKmeansOn] = useState(false);

  // Refs to track current selX/selY for synchronous access in click handler
  const selXRef = useRef(null);
  const selYRef = useRef(null);

  // Refs for Plotly DOM elements
  const scatterRef = useRef(null);
  const barRef = useRef(null);
  const boxRef = useRef(null);
  const resizeTimer = useRef(null);

  // Load CSV data
  useEffect(() => {
    fetch(process.env.PUBLIC_URL + '/penguins_clean.csv')
      .then(res => res.text())
      .then(text => {
        const data = parseCSV(text);
        setAllData(data);
        // Pre-compute constants
        setMaxSpeciesCount(
          Math.ceil(Math.max(...SPECIES_LIST.map(sp => data.filter(r => r.species === sp).length)) * 1.15)
        );
        const ranges = {};
        Object.keys(FEAT_LABEL).forEach(f => {
          const vals = data.map(r => r[f]).filter(v => !isNaN(v));
          const lo = Math.min(...vals);
          const hi = Math.max(...vals);
          const pad = (hi - lo) * 0.06;
          ranges[f] = [lo - pad, hi + pad];
        });
        setFeatRange(ranges);
      })
      .catch(err => console.error('Failed to load CSV:', err));
  }, []);

  // Set island filter from prop
  useEffect(() => {
    if (island) {
      setIslandFilter(island);
    }
  }, [island]);

  // Filtered data
  const filtered = useMemo(() => {
    return allData.filter(r =>
      species.has(r.species) &&
      sex.has(r.sex) &&
      (islandFilter === 'ALL' || r.island === islandFilter)
    );
  }, [allData, species, sex, islandFilter]);

  // Feature selection (FIFO when both slots filled)
  const handleZoneClick = useCallback((feat) => {
    setMission(null);
    const curX = selXRef.current;
    const curY = selYRef.current;
    const ord = orderRef.current;

    if (curX === feat) {
      // Deselect X
      selXRef.current = null;
      orderRef.current = ord.filter(s => s !== 'X');
      setSelX(null);
    } else if (curY === feat) {
      // Deselect Y
      selYRef.current = null;
      orderRef.current = ord.filter(s => s !== 'Y');
      setSelY(null);
    } else if (curX == null) {
      // Assign to X
      selXRef.current = feat;
      orderRef.current = [...ord, 'X'];
      setSelX(feat);
    } else if (curY == null) {
      // Assign to Y
      selYRef.current = feat;
      orderRef.current = [...ord, 'Y'];
      setSelY(feat);
    } else {
      // Both filled — FIFO replace oldest
      const oldest = ord[0];
      const newOrd = [...ord.slice(1)];
      if (oldest === 'X') {
        selXRef.current = feat;
        newOrd.push('X');
        setSelX(feat);
      } else {
        selYRef.current = feat;
        newOrd.push('Y');
        setSelY(feat);
      }
      orderRef.current = newOrd;
    }
  }, []);

  const handleReset = useCallback(() => {
    setMission(null);
    selXRef.current = null;
    selYRef.current = null;
    orderRef.current = [];
    setSelX(null);
    setSelY(null);
  }, []);

  const handleMission = useCallback((type) => {
    const m = MISSIONS[type];
    if (!m) return;
    setMission(type);
    selXRef.current = m.selX;
    selYRef.current = m.selY;
    orderRef.current = ['X', 'Y'];
    setSelX(m.selX);
    setSelY(m.selY);
    setSpecies(new Set(m.species));
    setSex(new Set(m.sex));
    setIslandFilter(m.island);
  }, []);

  const toggleSpecies = useCallback((sp) => {
    setMission(null);
    setSpecies(prev => {
      const next = new Set(prev);
      if (next.has(sp)) {
        if (next.size === 1) return prev;
        next.delete(sp);
      } else {
        next.add(sp);
      }
      return next;
    });
  }, []);

  const toggleSex = useCallback((s) => {
    setMission(null);
    setSex(prev => {
      const next = new Set(prev);
      if (next.has(s)) {
        if (next.size === 1) return prev;
        next.delete(s);
      } else {
        next.add(s);
      }
      return next;
    });
  }, []);

  const handleIslandChange = useCallback((val) => {
    setMission(null);
    setIslandFilter(val);
    // Auto-deselect species not present on the chosen island
    const valid = ISLAND_SPECIES[val] || ISLAND_SPECIES.ALL;
    setSpecies(prev => {
      const next = new Set([...prev].filter(sp => valid.has(sp)));
      // If nothing remains, select all valid species on this island
      return next.size > 0 ? next : new Set(valid);
    });
  }, []);

  // K-Means overlay builder (must be above scatter useEffect)
  const kmeansResult = useMemo(() => {
    if (species.size < 2) return { info: 'Select \u2265 2 species to enable K-Means.', overlay: null };
    if (!kmeansOn) return { info: '', overlay: null };
    if (!selX || !selY) return { info: '', overlay: null };
    const k = species.size;
    if (filtered.length < k) return { info: `Need \u2265 ${k} points to cluster (${filtered.length} shown).`, overlay: null };

    const pts = filtered.map(r => [r[selX], r[selY]]);
    const result = KMeans.fit(pts, k);
    const labels = result.labels;

    const shapes = [];
    const centroidX = [], centroidY = [];
    const centroidTx = [], centroidHv = [];

    for (let c = 0; c < k; c++) {
      const sub = filtered.filter((_, i) => labels[i] === c);
      const xs = sub.map(r => r[selX]);
      const ys = sub.map(r => r[selY]);
      const n = sub.length;
      const cx = xs.reduce((a, b) => a + b, 0) / n;
      const cy = ys.reduce((a, b) => a + b, 0) / n;
      const sx = n > 1 ? Math.sqrt(xs.reduce((s, v) => s + (v - cx) ** 2, 0) / (n - 1)) : 0;
      const sy = n > 1 ? Math.sqrt(ys.reduce((s, v) => s + (v - cy) ** 2, 0) / (n - 1)) : 0;

      centroidX.push(cx); centroidY.push(cy);
      centroidTx.push('C' + (c + 1));
      centroidHv.push(
        '<b>Cluster ' + (c + 1) + ' \u2014 Centroid</b><br>' +
        FEAT_LABEL[selX] + ': ' + cx.toFixed(2) + '<br>' +
        FEAT_LABEL[selY] + ': ' + cy.toFixed(2) + '<br>' +
        'n = ' + n + ' penguins'
      );

      if (sx > 0 && sy > 0) {
        shapes.push({
          type: 'circle', xref: 'x', yref: 'y',
          x0: cx - 2 * sx, y0: cy - 2 * sy,
          x1: cx + 2 * sx, y1: cy + 2 * sy,
          line: { color: KMEANS_COLORS[c], width: 2, dash: 'dot' },
          fillcolor: KMEANS_COLORS[c], opacity: 0.08,
        });
      }
    }

    const centroidTrace = {
      type: 'scatter', mode: 'markers+text',
      name: 'K-Means (K=' + k + ')',
      x: centroidX, y: centroidY,
      text: centroidTx, textposition: 'top center',
      textfont: { color: '#1B2B3A', size: 11 },
      hovertext: centroidHv, hoverinfo: 'text',
      marker: {
        symbol: 'star', size: 16,
        color: KMEANS_COLORS.slice(0, k),
        line: { width: 1.5, color: '#fff' },
      },
    };

    return {
      info: 'K\u00a0=\u00a0' + k + ' | Inertia: ' + result.inertia.toFixed(2) + ' | n\u00a0=\u00a0' + filtered.length,
      overlay: { centroidTrace, shapes },
    };
  }, [kmeansOn, species, selX, selY, filtered]);

  // ===================== RENDER PLOTS =====================
  // Scatter plot
  useEffect(() => {
    if (!scatterRef.current || !allData.length) return;
    const el = scatterRef.current;

    if (!selX || !selY) {
      Plotly.purge(el);
      return;
    }
    if (!filtered.length) {
      Plotly.purge(el);
      return;
    }

    const traces = [];
    SPECIES_LIST.forEach(sp => {
      if (!species.has(sp)) return;
      const rows = filtered.filter(r => r.species === sp);
      if (!rows.length) return;
      traces.push({
        type: 'scatter', mode: 'markers', name: sp,
        x: rows.map(r => r[selX]),
        y: rows.map(r => r[selY]),
        marker: {
          color: COLORS[sp], size: 10, opacity: 0.85,
          symbol: rows.map(r => r.sex === 'male' ? 'circle' : 'diamond'),
          line: { color: '#fff', width: 1 },
        },
        customdata: rows.map(r => [r.sex, r.island, r.bill_length_mm, r.bill_depth_mm, r.flipper_length_mm, r.body_mass_g]),
        hovertemplate:
          '<b>' + sp + '</b><br>Sex: %{customdata[0]}<br>Island: %{customdata[1]}<br>' +
          'Bill L: %{customdata[2]} mm<br>Bill D: %{customdata[3]} mm<br>' +
          'Flipper: %{customdata[4]} mm<br>Mass: %{customdata[5]:,} g<extra></extra>',
      });
    });

    const yTickFormat = selY === 'body_mass_g' ? ',' : '';
    const layout = {
      ...BASE_LAYOUT,
      margin: { l: 60, r: 20, t: 10, b: 50 },
      xaxis: {
        title: { text: '<b>' + FEAT_LABEL[selX] + '</b>', font: { size: 15, color: '#1B4965' } },
        gridcolor: '#E8E8E8', zerolinecolor: '#E8E8E8',
      },
      yaxis: {
        title: { text: '<b>' + FEAT_LABEL[selY] + '</b>', font: { size: 15, color: '#1B4965' } },
        gridcolor: '#E8E8E8', zerolinecolor: '#E8E8E8', tickformat: yTickFormat,
      },
      legend: { orientation: 'h', y: -0.12 },
      transition: { duration: 400, easing: 'cubic-in-out' },
    };

    // Overlay K-Means centroids and ellipses on top of species points
    if (kmeansResult.overlay) {
      traces.push(kmeansResult.overlay.centroidTrace);
      layout.shapes = kmeansResult.overlay.shapes;
    }

    Plotly.react(el, traces, layout, { displayModeBar: false, responsive: true });
  }, [allData, filtered, selX, selY, species, kmeansResult]);

  // Bar plot
  useEffect(() => {
    if (!barRef.current || !allData.length) return;
    const counts = { Adelie: 0, Chinstrap: 0, Gentoo: 0 };
    filtered.forEach(r => { counts[r.species]++; });
    const entries = Object.entries(counts)
      .filter(([sp]) => species.has(sp))
      .sort((a, b) => a[1] - b[1]);

    const trace = {
      type: 'bar', orientation: 'h',
      x: entries.map(e => e[1]), y: entries.map(e => e[0]),
      marker: { color: entries.map(e => COLORS[e[0]]) },
      text: entries.map(e => e[1]), textposition: 'outside',
      textfont: { weight: 'bold' },
      hovertemplate: '<b>%{y}</b><br>%{x} penguins<extra></extra>',
    };

    Plotly.react(barRef.current, [trace], {
      ...BASE_LAYOUT,
      margin: { l: 80, r: 40, t: 10, b: 50 },
      xaxis: {
        gridcolor: '#E8E8E8',
        title: { text: '<b>Count</b>', font: { size: 15, color: '#1B4965' }, standoff: 15 },
        range: [0, maxSpeciesCount], fixedrange: true, tickfont: { weight: 'bold' },
      },
      yaxis: { automargin: true, fixedrange: true, tickfont: { weight: 'bold' } },
      showlegend: false,
      transition: { duration: 300, easing: 'cubic-in-out' },
    }, { displayModeBar: false, responsive: true });
  }, [allData, filtered, species, maxSpeciesCount]);

  // Box plot
  useEffect(() => {
    if (!boxRef.current || !allData.length) return;
    const yFeat = selY || 'body_mass_g';
    const traces = [];
    SPECIES_LIST.forEach(sp => {
      if (!species.has(sp)) return;
      const rows = filtered.filter(r => r.species === sp);
      if (!rows.length) return;
      traces.push({
        type: 'box', name: sp,
        y: rows.map(r => r[yFeat]),
        marker: { color: COLORS[sp] },
        boxpoints: 'outliers',
        line: { color: COLORS[sp] },
        fillcolor: COLORS[sp] + '55',
      });
    });

    const yTickFormat = yFeat === 'body_mass_g' ? ',' : '';
    Plotly.react(boxRef.current, traces, {
      ...BASE_LAYOUT,
      margin: { l: 80, r: 20, t: 10, b: 50 },
      yaxis: {
        gridcolor: '#E8E8E8',
        title: { text: '<b>' + FEAT_LABEL[yFeat] + '</b>', font: { size: 15, color: '#1B4965' }, standoff: 15 },
        tickformat: yTickFormat,
        range: featRange[yFeat] || undefined, fixedrange: true, tickfont: { weight: 'bold' },
      },
      xaxis: {
        gridcolor: '#E8E8E8',
        title: { text: '<b>Species</b>', font: { size: 15, color: '#1B4965' }, standoff: 15 },
        fixedrange: true, tickfont: { weight: 'bold' },
      },
      showlegend: false,
      transition: { duration: 300, easing: 'cubic-in-out' },
    }, { displayModeBar: false, responsive: true });
  }, [allData, filtered, selY, species, featRange]);

  // Resize observer
  useEffect(() => {
    const stageEl = document.querySelector('.page2-container .stage');
    if (!stageEl) return;
    const observer = new ResizeObserver(() => {
      clearTimeout(resizeTimer.current);
      resizeTimer.current = setTimeout(() => {
        [scatterRef, barRef, boxRef].forEach(ref => {
          if (ref.current && ref.current.style.display !== 'none' && ref.current._fullLayout) {
            Plotly.Plots.resize(ref.current);
          }
        });
      }, 150);
    });
    observer.observe(stageEl);
    return () => observer.disconnect();
  }, []);

  // ===================== COMPUTED VALUES =====================
  // Scatter title
  const scatterTitle = useMemo(() => {
    if (!selX || !selY) return 'Select measurements to explore';
    if (!filtered.length) return 'No data';
    const byMean = {};
    SPECIES_LIST.forEach(sp => {
      const rows = filtered.filter(r => r.species === sp);
      if (rows.length) byMean[sp] = mean(rows.map(r => r[selY]));
    });
    const sps = Object.keys(byMean);
    if (sps.length >= 2) {
      const sorted = [...sps].sort((a, b) => byMean[b] - byMean[a]);
      return sorted[0].toUpperCase() + ' HAVE THE HIGHEST ' + FEAT_SHORT[selY].toUpperCase();
    }
    return FEAT_LABEL[selX] + ' vs ' + FEAT_LABEL[selY];
  }, [selX, selY, filtered]);

  // Bar title
  const barTitle = useMemo(() => {
    const counts = { Adelie: 0, Chinstrap: 0, Gentoo: 0 };
    filtered.forEach(r => { counts[r.species]++; });
    const entries = Object.entries(counts).filter(([sp]) => species.has(sp));
    const top = [...entries].sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] > 0) {
      const nonZero = entries.filter(e => e[1] > 0);
      if (nonZero.length === 1) return 'ONLY ' + top[0].toUpperCase() + ' IN THIS VIEW';
      const totalRest = entries.reduce((s, e) => s + e[1], 0) - top[1];
      if (top[1] > totalRest) return top[0].toUpperCase() + ' DOMINATE';
      return 'MIXED COMMUNITY';
    }
    return 'Species distribution';
  }, [filtered, species]);

  // Box title
  const boxTitle = useMemo(() => {
    const yFeat = selY || 'body_mass_g';
    const medians = {};
    SPECIES_LIST.forEach(sp => {
      if (!species.has(sp)) return;
      const vals = [...filtered.filter(r => r.species === sp).map(r => r[yFeat])].sort((a, b) => a - b);
      if (vals.length) medians[sp] = vals[Math.floor(vals.length / 2)];
    });
    const spList = Object.keys(medians);
    if (spList.length >= 2) {
      const sorted = [...spList].sort((a, b) => medians[b] - medians[a]);
      return sorted[0].toUpperCase() + ' SKEW HEAVIER IN ' + FEAT_SHORT[yFeat].toUpperCase();
    }
    return FEAT_LABEL[yFeat] + ' by species';
  }, [filtered, selY, species]);

  // Stats
  const stats = useMemo(() => {
    const result = {};
    Object.keys(FEAT_LABEL).forEach(f => {
      result[f] = fmt(f, mean(filtered.map(r => r[f])));
    });
    return result;
  }, [filtered]);

  // Insight text
  const insightContent = useMemo(() => {
    if (!filtered.length) return 'No data with the current filters. Try broadening your selection.';
    if (mission && MISSIONS[mission]) {
      return { heading: 'Discovery: ' + MISSIONS[mission].title, html: MISSIONS[mission].insight };
    }
    if (!selX && !selY) {
      return { heading: 'Finding', html: 'Select body measurements on the penguin diagram to discover biological insights.' };
    }
    const islandTxt = islandFilter === 'ALL' ? 'across all islands' : 'on ' + islandFilter + ' Island';
    const parts = ['<b>' + filtered.length + '</b> penguins shown ' + islandTxt + '.'];
    if (selY) {
      const byMean = {};
      SPECIES_LIST.forEach(sp => {
        const rows = filtered.filter(r => r.species === sp);
        if (rows.length) byMean[sp] = mean(rows.map(r => r[selY]));
      });
      const sps = [...Object.keys(byMean)].sort((a, b) => byMean[b] - byMean[a]);
      if (sps.length >= 2) {
        parts.push(sps[0] + ' have the highest average ' + FEAT_SHORT[selY] +
          ' (' + fmt(selY, byMean[sps[0]]) + '), while ' +
          sps[sps.length - 1] + ' have the lowest (' + fmt(selY, byMean[sps[sps.length - 1]]) + ').');
      }
    } else {
      parts.push('Select a body measurement on the penguin diagram to see species relationships.');
    }
    if (sex.size === 2) {
      const mMass = mean(filtered.filter(r => r.sex === 'male').map(r => r.body_mass_g));
      const fMass = mean(filtered.filter(r => r.sex === 'female').map(r => r.body_mass_g));
      if (mMass && fMass) {
        const diff = ((mMass - fMass) / fMass * 100).toFixed(0);
        parts.push('Males average ' + diff + '% heavier than females in this view.');
      }
    }
    return { heading: 'Finding', html: parts.join(' ') };
  }, [filtered, mission, selX, selY, islandFilter, sex]);

  // Narrative text
  const narrativeContent = useMemo(() => {
    if (!selX || !selY) return { story: 'Select body measurements on the penguin diagram to begin your exploration.', details: [] };
    if (!filtered.length) return { story: 'No data to analyze. Try broadening your filters.', details: [] };

    let story = '';
    const axes = [selX, selY];

    if (mission && MISSIONS[mission]) {
      story = MISSIONS[mission].insight;
    } else if (axes.includes('body_mass_g') && axes.includes('flipper_length_mm')) {
      story = '<b>The Physics of Diving.</b> Penguins are \u2018underwater flyers.\u2019 This view shows the critical ratio between engine power (body mass) and wing surface (flipper length).';
    } else if (axes.includes('bill_length_mm') && axes.includes('bill_depth_mm')) {
      story = '<b>Dietary Niche Partitioning.</b> Deep, short bills (Adelie) are perfect for crushing krill, while long, slender bills (Chinstrap) are better for snatching slippery fish.';
    } else if (axes.includes('bill_length_mm') && axes.includes('body_mass_g')) {
      story = '<b>Resource Acquisition.</b> This comparison reveals if larger penguins necessarily have longer reaches.';
    } else if (axes.includes('flipper_length_mm') && axes.includes('bill_depth_mm')) {
      story = '<b>The Specialist\u2019s Blueprint.</b> This view contrasts locomotion (flippers) with feeding (bills).';
    } else {
      story = '<b>Biological Fingerprints.</b> These dimensions allow researchers to identify species even from a distance.';
    }

    const details = [];
    const heaviest = [...filtered].sort((a, b) => b.body_mass_g - a.body_mass_g)[0];
    if (heaviest) {
      details.push('The heaviest penguin in view is a <span class="highlight">' + heaviest.species + '</span> at <span class="highlight">' + fmt('body_mass_g', heaviest.body_mass_g) + '</span>.');
    }
    if (islandFilter !== 'ALL') {
      const naturalSpecies = new Set(allData.filter(r => r.island === islandFilter).map(r => r.species));
      if (naturalSpecies.size === 1) {
        details.push('<b>Island Fact:</b> ' + islandFilter + ' is naturally a single-species colony for ' + [...naturalSpecies][0] + 's.');
      } else {
        details.push('<b>Island Fact:</b> ' + islandFilter + ' is a diverse hub shared by <span class="highlight">' + naturalSpecies.size + '</span> different species.');
      }
    }
    const xVals = filtered.map(r => r[selX]).filter(v => !isNaN(v));
    if (xVals.length) {
      const range = (Math.max(...xVals) - Math.min(...xVals)).toFixed(1);
      details.push('The <span class="highlight">' + FEAT_SHORT[selX] + '</span> varies by <span class="highlight">' + range + 'mm</span> across this selection.');
    }
    return { story, details };
  }, [selX, selY, filtered, mission, islandFilter, allData]);

  // Island label for header
  const islandLabel = islandFilter === 'ALL' ? 'ALL ISLANDS' : islandFilter.toUpperCase() + ' ISLAND';

  return (
    <div className="page2-container">
      {/* HEADER */}
      <header className="p2-header" role="banner">
        <div className="header-left">
          <button className="back-btn" onClick={onBack} aria-label="Go back to island selection">
            <span aria-hidden="true">&larr;</span>
          </button>
          <img src={process.env.PUBLIC_URL + '/vinuni_logo.png'} alt="VinUni Logo" className="logo" />
          <div className="course-info">
            <div className="course-name">Data Visualization</div>
            <div className="course-code">COMP4010</div>
          </div>
        </div>
        <div className="header-center">
          <h1 className="title">Palmer Penguins &middot; Island Detail Explorer</h1>
          <div className="island-label" role="status" aria-live="polite">{islandLabel}</div>
        </div>
        <div className="header-right">
          <button
            className="fight-btn"
            onClick={() => onGoToComparison && onGoToComparison()}
            aria-label="Go to Penguin Fight comparison page"
          >
            🐧 Penguin Fight!
          </button>
        </div>
      </header>

      {/* MAIN */}
      <main className="p2-main">
        {/* SIDEBAR */}
        <aside className="sidebar" aria-label="Filters and axis selection">
          {/* Discovery Missions */}
          <section className="card mission-card">
            <h2>Discovery Missions</h2>
            <div className="mission-grid">
              {Object.entries(MISSIONS).map(([key, m]) => (
                <button
                  key={key}
                  className={'mission-btn' + (mission === key ? ' active' : '')}
                  onClick={() => handleMission(key)}
                >
                  <span className="icon">
                    {key === 'giants' ? '\uD83C\uDFD4\uFE0F' : key === 'mystery' ? '\uD83D\uDD0D' : '\u2696\uFE0F'}
                  </span>
                  <div>
                    <span className="m-title">{m.title}</span>
                    <span className="m-desc">
                      {key === 'giants' ? 'Find the heaviest penguins on Biscoe.' :
                       key === 'mystery' ? 'Compare survival tools on Dream island.' :
                       'See size differences between sexes.'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Penguin axis selector */}
          <section className="card">
            <h2>Select body measurements</h2>
            <div className="penguin-wrap">
              <img src={process.env.PUBLIC_URL + '/penguin_all.png'} alt="Penguin body diagram showing bill length, bill depth, flipper length, and body mass measurement zones" />
              {ZONES.map(z => (
                <button
                  key={z.feat}
                  className={'zone' + (selX === z.feat ? ' x-selected' : '') + (selY === z.feat ? ' y-selected' : '')}
                  style={{ left: z.left, top: z.top }}
                  onClick={() => handleZoneClick(z.feat)}
                  aria-label={z.tooltip}
                >
                  <span aria-hidden="true">{z.label}</span>
                  <span className="zone-tooltip" aria-hidden="true">{z.tooltip}</span>
                </button>
              ))}
            </div>
            <div className="readout" aria-live="polite">
              <div className="row">
                <span className="badge x" aria-hidden="true">X</span>
                <span>{selX ? FEAT_LABEL[selX] : '\u2014 pick a body part \u2014'}</span>
              </div>
              <div className="row">
                <span className="badge y" aria-hidden="true">Y</span>
                <span>{selY ? FEAT_LABEL[selY] : '\u2014 pick a second part \u2014'}</span>
              </div>
              <div className={'fifo-hint' + (selX && selY ? ' visible' : '')}>
                Click a third dot to replace the oldest axis selection
              </div>
              <button className="reset-btn" onClick={handleReset} aria-label="Reset axis selections">Reset</button>
            </div>
          </section>

          {/* Filters */}
          <section className="card">
            <h2>Filters</h2>
            {/* Species */}
            <div className="filter-row" role="group" aria-label="Species filter">
              {SPECIES_LIST.map(sp => {
                const available = (ISLAND_SPECIES[islandFilter] || ISLAND_SPECIES.ALL).has(sp);
                return (
                  <button
                    key={sp}
                    className={'chip species-' + sp.toLowerCase() + (species.has(sp) ? ' active' : '') + (!available ? ' unavailable' : '')}
                    onClick={() => available && toggleSpecies(sp)}
                    aria-pressed={species.has(sp)}
                    aria-disabled={!available}
                    title={!available ? `${sp} not found on ${islandFilter} Island` : undefined}
                  >
                    <span className="dot" style={{ background: COLORS[sp] }} aria-hidden="true" />
                    {sp}
                  </button>
                );
              })}
            </div>
            {/* Sex */}
            <div className="filter-row" role="group" aria-label="Sex filter">
              {['male', 'female'].map(s => (
                <button
                  key={s}
                  className={'chip sex-chip' + (sex.has(s) ? ' active' : '')}
                  onClick={() => toggleSex(s)}
                  aria-pressed={sex.has(s)}
                >
                  <span aria-hidden="true">{s === 'male' ? '\u25CF' : '\u25C6'}</span> {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            {/* Island */}
            <div className="filter-row" role="group" aria-label="Island filter">
              {['ALL', 'Biscoe', 'Dream', 'Torgersen'].map(isl => (
                <button
                  key={isl}
                  className={'chip island-chip' + (islandFilter === isl ? ' active' : '')}
                  onClick={() => handleIslandChange(isl)}
                >
                  {isl === 'ALL' ? 'All Islands' : isl}
                </button>
              ))}
            </div>
          </section>

          {/* Summary stats */}
          <section className="card">
            <h2>Summary stats</h2>
            <div className="stats-count" role="status" aria-live="polite">
              Showing <b>{filtered.length}</b> penguins
            </div>
            <div className="stats-grid">
              {Object.keys(FEAT_LABEL).map(f => (
                <div
                  key={f}
                  className={'stat' + (selX === f ? ' x-feat' : '') + (selY === f ? ' y-feat' : '')}
                >
                  <div className="v">{stats[f] || '\u2014'}</div>
                  <div className="l">{FEAT_LABEL[f].replace('(mm)', '(mm)').replace('(g)', '(g)')}</div>
                </div>
              ))}
            </div>
          </section>

          {/* K-Means controls */}
          <section className="card">
            <h2>K-Means</h2>
            <div className="kmeans-header">
              <span className="kmeans-label">Cluster overlay</span>
              <button
                className={'kmeans-toggle' + (kmeansOn ? ' kmeans-on' : '')}
                onClick={() => setKmeansOn(prev => !prev)}
                disabled={species.size < 2}
                aria-pressed={kmeansOn}
                aria-label="Toggle K-Means cluster overlay"
              >
                {kmeansOn ? 'ON' : 'OFF'}
              </button>
            </div>
            {kmeansResult.info && (
              <p className="kmeans-info" dangerouslySetInnerHTML={{ __html: kmeansResult.info }} />
            )}
          </section>
        </aside>

        {/* STAGE */}
        <section className="stage" aria-label="Charts">
          {/* Scatter */}
          <div className="card scatter-card">
            <div className="scatter-layout">
              <aside className="narrative-panel" aria-live="polite">
                <h3>Field Journal</h3>
                <div className="story-text" dangerouslySetInnerHTML={{ __html: narrativeContent.story }} />
                {narrativeContent.details.length > 0 && (
                  <ul>
                    {narrativeContent.details.map((d, i) => (
                      <li key={i} dangerouslySetInnerHTML={{ __html: d }} />
                    ))}
                  </ul>
                )}
              </aside>
              <div className="plot-area">
                <h2 className="scatter-title" aria-live="polite">{scatterTitle}</h2>
                <div ref={scatterRef} className="plot" role="img" aria-label={'Scatter plot: ' + scatterTitle} style={{ display: selX && selY && filtered.length ? 'block' : 'none' }} />
                {(!selX || !selY || !filtered.length) && (
                  <div className="placeholder">
                    <div className="big" aria-hidden="true">
                      {!filtered.length && selX && selY ? '\u2205' : '\uD83D\uDC27'}
                    </div>
                    {!selX && !selY && (
                      <>
                        <div style={{ fontWeight: 700, fontSize: 16, color: '#1B4965' }}>
                          Welcome to the Palmer Penguins &middot; Island Detail Explorer!
                        </div>
                        <div>Click on the penguin diagram to choose measurements to explore</div>
                      </>
                    )}
                    {selX && !selY && <div>Now pick a second body part for the Y axis</div>}
                    {!filtered.length && selX && selY && <div>No data &mdash; broaden your filters</div>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Insight */}
          <section className="card insight-card">
            <h2>{typeof insightContent === 'string' ? 'Finding' : insightContent.heading}</h2>
            <div
              className="insight"
              aria-live="polite"
              dangerouslySetInnerHTML={{ __html: typeof insightContent === 'string' ? insightContent : insightContent.html }}
            />
          </section>

          {/* Secondary charts row */}
          <div className="charts-row">
            <div className="card bar-card">
              <h2 className="bar-title" aria-live="polite">{barTitle}</h2>
              <div ref={barRef} className="plot" role="img" aria-label={'Bar chart: ' + barTitle} />
            </div>
            <div className="card box-card">
              <h2 className="box-title" aria-live="polite">{boxTitle}</h2>
              <div ref={boxRef} className="plot" role="img" aria-label={'Box plot: ' + boxTitle} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Page2;

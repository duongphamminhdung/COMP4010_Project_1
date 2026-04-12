// 3D Earth Map Component - Dũng
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './EarthMap.css';

// ── Animation phases ────────────────────────────────────────────────────────
const PHASE_ROTATING = 'rotating';
const PHASE_ZOOMING  = 'zooming';
const PHASE_STOPPED  = 'stopped';

const ROTATE_DURATION = 1.0;  // seconds
const ZOOM_DURATION   = 2.0;  // seconds

// After 1s of spin at 0.6 rev/s the earth rotation ≈ 3.77 rad.
// TARGET_EARTH_ROT places the island cluster centre (lon≈-65°) in front of camera.
const TARGET_EARTH_ROT = 5.83;

const START_CAM  = new THREE.Vector3(0, 0, 5);
// Along centroid direction (0, -0.91, 0.41), pulled out with generous margin
const TARGET_CAM = new THREE.Vector3(-0.01, -1.95, 0.89);

const START_LOOK  = new THREE.Vector3(0, 0, 0);
// Centroid of the 3 island world positions after earth rotation
const TARGET_LOOK = new THREE.Vector3(-0.01, -1.36, 0.62);

// ── Island data ──────────────────────────────────────────────────────────────
// Coordinates are exaggerated from real Palmer Archipelago positions
// so the 3D islands form a clear, non-overlapping triangle when zoomed in.
const ISLANDS = [
  {
    name: 'Biscoe',
    lat: -62.0, lon: -56.0,    // upper-right of triangle
    species: 'Adélie & Gentoo',
    population: '168 penguins',
    color: '#A5D8FF',
    fact: 'Largest island in the study',
  },
  {
    name: 'Dream',
    lat: -62.0, lon: -74.0,    // upper-left of triangle
    species: 'Adélie & Chinstrap',
    population: '124 penguins',
    color: '#FFD43B',
    fact: 'Home to two species',
  },
  {
    name: 'Torgersen',
    lat: -72.0, lon: -65.0,    // bottom-center of triangle
    species: 'Adélie only',
    population: '52 penguins',
    color: '#FFFFFF',
    fact: 'Smallest, Adélie exclusive',
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const latLonToVec3 = (lat, lon, r) => {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(r * Math.sin(phi) * Math.cos(theta)),
     (r * Math.cos(phi)),
     (r * Math.sin(phi) * Math.sin(theta))
  );
};

const easeInOutCubic = t =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// ── Earth texture – icy polar aesthetic ─────────────────────────────────────
const createEarthTexture = () => {
  const W = 2048, H = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // ── Ocean: deep cold blue ──
  const ocean = ctx.createLinearGradient(0, 0, 0, H);
  ocean.addColorStop(0,    '#b8d9f5');  // lighter near north pole
  ocean.addColorStop(0.15, '#5b9bd5');
  ocean.addColorStop(0.5,  '#1a5fa8');  // mid-ocean deep blue
  ocean.addColorStop(0.85, '#5b9bd5');
  ocean.addColorStop(1,    '#cce8fb');  // lighter near south pole
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, W, H);

  // ── Subtle ocean shimmer ──
  for (let i = 0; i < 2500; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`;
    ctx.fillRect(Math.random() * W, Math.random() * H, 3, 1);
  }

  // ── Helper to draw a landmass blob ──
  const drawLand = (cx, cy, rx, ry, rotation = 0, color1, color2) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry));
    g.addColorStop(0,   color1);
    g.addColorStop(0.6, color1);
    g.addColorStop(1,   color2);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Land color scheme: muted sage-green interiors, darker coasts
  const LAND_MID  = '#7aaa6d';
  const LAND_EDGE = '#4a7c42';
  const LAND_DRY  = '#b5a96a';
  const LAND_DRY2 = '#8a7d45';

  // ── North America ──
  drawLand(340, 230, 190, 155, -0.2, LAND_MID, LAND_EDGE);
  drawLand(290, 180, 100,  80,  0.1, LAND_MID, LAND_EDGE);
  // Central America isthmus
  drawLand(390, 370,  40,  80,  0.3, LAND_EDGE, '#2d5a26');

  // ── South America ──
  drawLand(445, 570, 110, 180,  0.15, LAND_MID, LAND_EDGE);
  drawLand(420, 700,  60, 110, -0.1, LAND_EDGE, '#2d5a26');

  // ── Europe ──
  drawLand(1020, 210,  90,  75, 0.1, LAND_MID, LAND_EDGE);
  // Scandinavian peninsula
  drawLand(1040, 155,  35,  80, 0.0, LAND_MID, LAND_EDGE);
  // Iberian
  drawLand(975, 270,  45,  50, 0.0, LAND_DRY, LAND_DRY2);

  // ── Africa ──
  drawLand(1060, 490, 160, 240,  0.0, LAND_DRY,  LAND_DRY2);
  drawLand(1060, 380,  80, 100, -0.1, LAND_DRY,  LAND_DRY2);

  // ── Asia (large complex shape) ──
  drawLand(1350, 230, 340, 185, 0.0, LAND_MID,  LAND_EDGE);
  drawLand(1250, 195, 160, 110, 0.1, LAND_MID,  LAND_EDGE);
  // Arabian Peninsula
  drawLand(1170, 370,  70,  90, 0.2, LAND_DRY,  LAND_DRY2);
  // Indian subcontinent
  drawLand(1230, 460,  75, 115, 0.0, LAND_DRY,  LAND_DRY2);
  // Southeast Asia peninsula
  drawLand(1380, 430,  55,  90, 0.1, LAND_MID,  LAND_EDGE);

  // ── Australia ──
  drawLand(1620, 600, 140, 115, 0.1, LAND_DRY,  LAND_DRY2);

  // ── Greenland ──
  drawLand(490, 140,  80, 100, -0.1, '#d8eef8', '#b5d5ed');

  // ── Antarctica (bright white ice sheet) ──
  const antarcticGrad = ctx.createLinearGradient(0, 870, 0, H);
  antarcticGrad.addColorStop(0, 'rgba(255,255,255,0)');
  antarcticGrad.addColorStop(0.3, '#dceef8');
  antarcticGrad.addColorStop(1,   '#ffffff');
  ctx.fillStyle = antarcticGrad;
  ctx.fillRect(0, 880, W, H - 880);

  // Full white band along bottom
  ctx.fillStyle = '#f0f8ff';
  ctx.fillRect(0, 940, W, H - 940);

  // Antarctic peninsula reaching up toward South America
  drawLand(460, 895, 28, 65, -0.2, '#e8f4fc', '#c8e0f0');

  // ── Arctic ice cap (north pole) ──
  const arcticGrad = ctx.createLinearGradient(0, 0, 0, 120);
  arcticGrad.addColorStop(0,   '#ffffff');
  arcticGrad.addColorStop(0.7, '#d0e8f8');
  arcticGrad.addColorStop(1,   'rgba(208,232,248,0)');
  ctx.fillStyle = arcticGrad;
  ctx.fillRect(0, 0, W, 110);

  // ── Palmer Archipelago region – the 3 study islands ──
  // Coordinates match the exaggerated ISLANDS array above.
  // equirectangular: x = (lon+180)/360 * W,  y = (90-lat)/180 * H

  // Biscoe Island (lon=-56, lat=-62) – upper right
  const biscoeX = Math.round(((-56 + 180) / 360) * W);
  const biscoeY = Math.round(((90 - (-62)) / 180) * H);
  ctx.fillStyle = '#b0d4f0';
  ctx.beginPath();
  ctx.ellipse(biscoeX, biscoeY, 14, 9, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#A5D8FF';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // Biscoe label
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#0d2a4a';
  ctx.lineWidth = 3;
  ctx.strokeText('Biscoe', biscoeX, biscoeY - 16);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Biscoe', biscoeX, biscoeY - 16);

  // Dream Island (lon=-74, lat=-62) – upper left
  const dreamX = Math.round(((-74 + 180) / 360) * W);
  const dreamY = Math.round(((90 - (-62)) / 180) * H);
  ctx.fillStyle = '#f5e070';
  ctx.beginPath();
  ctx.ellipse(dreamX, dreamY, 11, 7, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#FFD43B';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // Dream label
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#0d2a4a';
  ctx.lineWidth = 3;
  ctx.strokeText('Dream', dreamX, dreamY - 14);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Dream', dreamX, dreamY - 14);

  // Torgersen Island (lon=-65, lat=-72) – bottom center
  const torgX = Math.round(((-65 + 180) / 360) * W);
  const torgY = Math.round(((90 - (-72)) / 180) * H);
  ctx.fillStyle = '#f0f8ff';
  ctx.beginPath();
  ctx.ellipse(torgX, torgY, 8, 6, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#cce4f7';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // Torgersen label
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#0d2a4a';
  ctx.lineWidth = 3;
  ctx.strokeText('Torgersen', torgX, torgY - 12);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Torgersen', torgX, torgY - 12);

  // ── Subtle latitude grid lines ──
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let lat = -80; lat <= 80; lat += 20) {
    const y = ((90 - lat) / 180) * H;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  for (let lon = -180; lon <= 180; lon += 30) {
    const x = ((lon + 180) / 360) * W;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }

  return new THREE.CanvasTexture(canvas);
};

// ── Component ────────────────────────────────────────────────────────────────
const EarthMap = ({ onIslandClick }) => {
  const containerRef     = useRef(null);
  const earthRef         = useRef(null);
  const cameraRef        = useRef(null);
  const markersRef       = useRef([]);
  const phaseRef         = useRef(PHASE_ROTATING);
  const phaseTimeRef     = useRef(0);
  const startEarthRotRef = useRef(0);
  const clockRef         = useRef(new THREE.Clock());
  const raycasterRef     = useRef(new THREE.Raycaster());
  const mouseRef         = useRef(new THREE.Vector2(-9999, -9999));
  const hoveredNameRef   = useRef(null);
  const focusedIndexRef  = useRef(-1);

  const [isLoaded, setIsLoaded]           = useState(false);
  const [hoveredIsland, setHoveredIsland] = useState(null);
  const [focusedIsland, setFocusedIsland] = useState(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1628);  // deep navy

    // Camera – wider FOV to frame all 3 islands
    const camera = new THREE.PerspectiveCamera(
      58, container.clientWidth / container.clientHeight, 0.1, 1000
    );
    camera.position.copy(START_CAM);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setClearColor(0x0a1628, 1);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Lights – cooler, icier tones
    scene.add(new THREE.AmbientLight(0xc8dff5, 1.0));  // cool blue ambient
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(5, 3, 5);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xa0c8e8, 0.5);  // cool blue fill
    fill.position.set(-5, -2, 3);
    scene.add(fill);
    // Soft back light for polar glow
    const backLight = new THREE.DirectionalLight(0xddeeff, 0.3);
    backLight.position.set(0, -5, -3);
    scene.add(backLight);

    // Earth sphere
    const earthGeo = new THREE.SphereGeometry(1.5, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
      map: createEarthTexture(),
      bumpScale: 0.03,
      specular: new THREE.Color(0x4488bb),  // icy blue specular highlight
      shininess: 18,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earth);
    earthRef.current = earth;

    // Atmosphere glow – icy blue
    const atmoMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }`,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float i = pow(0.75 - dot(vNormal, vec3(0,0,1.0)), 2.5);
          gl_FragColor = vec4(0.6, 0.82, 1.0, 1.0) * i;
        }`,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.62, 64, 64), atmoMat));

    // Stars – sparse, small, icy white
    const sv = [];
    for (let i = 0; i < 8000; i++) {
      sv.push((Math.random() - 0.5) * 2000, (Math.random() - 0.5) * 2000, (Math.random() - 0.5) * 2000);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sv, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xe8f4ff, size: 0.015 })));

    // ── Build 3D island meshes ─────────────────────────────────────────────
    markersRef.current = [];

    // Island sizes (radius of the landmass mesh)
    const islandScales = [0.06, 0.048, 0.035]; // Biscoe (big), Dream (mid), Torgersen (small)

    // Helper: create an irregular island shape from a cylinder with randomized vertices
    const createIslandGeo = (baseRadius, heightScale, seed) => {
      const segments = 12;
      const geo = new THREE.CylinderGeometry(
        baseRadius * 0.7,  // top radius (smaller = tapered peak)
        baseRadius,         // bottom radius
        baseRadius * heightScale,  // height
        segments, 3, false
      );
      const pos = geo.attributes.position;
      const rng = (n) => Math.sin(seed * 1234.5 + n * 567.8) * 0.5 + 0.5; // deterministic pseudo-random
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        // Only distort the outer ring, not the center
        const dist = Math.sqrt(x * x + z * z);
        if (dist > baseRadius * 0.15) {
          const noise = 0.7 + rng(i) * 0.6; // 0.7–1.3 range
          pos.setX(i, x * noise);
          pos.setZ(i, z * noise);
        }
        // Slight vertical noise for rocky terrain
        if (y > 0) {
          pos.setY(i, y * (0.8 + rng(i + 100) * 0.5));
        }
      }
      geo.computeVertexNormals();
      return geo;
    };

    ISLANDS.forEach((island, i) => {
      const surfacePos = latLonToVec3(island.lat, island.lon, 1.50);
      const normal     = surfacePos.clone().normalize();
      const markerColor = island.color === '#FFFFFF' ? 0xddeeff : new THREE.Color(island.color).getHex();
      const scale = islandScales[i];

      // ── Island landmass mesh ──
      const islandGeo = createIslandGeo(scale, 0.6, i);
      const islandMat = new THREE.MeshPhongMaterial({
        color: 0xe8f0f6,       // snowy white-gray terrain
        emissive: markerColor,
        emissiveIntensity: 0.15,
        flatShading: true,
        shininess: 8,
      });
      const islandMesh = new THREE.Mesh(islandGeo, islandMat);
      // Position on sphere surface
      islandMesh.position.copy(surfacePos);
      // Orient so cylinder's Y-axis aligns with the surface normal
      islandMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      islandMesh.userData = island;
      earth.add(islandMesh);
      markersRef.current.push(islandMesh);

      // ── Colored shore ring – flat disc at the base showing island color ──
      const shoreGeo = new THREE.RingGeometry(scale * 0.85, scale * 1.35, 24);
      const shoreMat = new THREE.MeshBasicMaterial({
        color: markerColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.55,
      });
      const shore = new THREE.Mesh(shoreGeo, shoreMat);
      shore.position.copy(surfacePos.clone().add(normal.clone().multiplyScalar(0.003)));
      shore.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      earth.add(shore);

      // ── Animated pulse ring (will be animated in the loop) ──
      const pulseGeo = new THREE.RingGeometry(scale * 1.0, scale * 1.15, 32);
      const pulseMat = new THREE.MeshBasicMaterial({
        color: markerColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      });
      const pulse = new THREE.Mesh(pulseGeo, pulseMat);
      pulse.position.copy(surfacePos.clone().add(normal.clone().multiplyScalar(0.005)));
      pulse.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      earth.add(pulse);
      // Stash for animation
      islandMesh.userData._pulse = pulse;
      islandMesh.userData._pulseMat = pulseMat;
      islandMesh.userData._baseScale = scale;
      islandMesh.userData._normal = normal;
      islandMesh.userData._surfacePos = surfacePos;
    });

    // Disable user controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = controls.enablePan = controls.enableRotate = false;

    // ── Animation loop ─────────────────────────────────────────────────────
    setIsLoaded(true);
    clockRef.current.start();
    phaseRef.current     = PHASE_ROTATING;
    phaseTimeRef.current = 0;

    const lookPos = new THREE.Vector3();
    let animId;

    let elapsed = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();
      const phase = phaseRef.current;
      elapsed += delta;

      if (phase === PHASE_ROTATING) {
        earth.rotation.y += 0.6 * Math.PI * 2 * delta;
        phaseTimeRef.current += delta;
        if (phaseTimeRef.current >= ROTATE_DURATION) {
          phaseRef.current       = PHASE_ZOOMING;
          phaseTimeRef.current   = 0;
          startEarthRotRef.current = earth.rotation.y;
        }

      } else if (phase === PHASE_ZOOMING) {
        phaseTimeRef.current += delta;
        const t = Math.min(phaseTimeRef.current / ZOOM_DURATION, 1);
        const e = easeInOutCubic(t);

        camera.position.lerpVectors(START_CAM, TARGET_CAM, e);
        lookPos.lerpVectors(START_LOOK, TARGET_LOOK, e);
        camera.lookAt(lookPos);

        earth.rotation.y = THREE.MathUtils.lerp(
          startEarthRotRef.current, TARGET_EARTH_ROT, e
        );

        if (t >= 1) {
          phaseRef.current = PHASE_STOPPED;
          camera.position.copy(TARGET_CAM);
          camera.lookAt(TARGET_LOOK);
          earth.rotation.y = TARGET_EARTH_ROT;
        }
      }

      // ── Animate pulse rings (all phases – they look alive while spinning too) ──
      markersRef.current.forEach((mesh, idx) => {
        const ud = mesh.userData;
        if (!ud._pulse) return;
        // Pulsating scale: 1.0 → 2.5 → 1.0 over ~2s, staggered per island
        const wave = Math.sin(elapsed * 2.5 + idx * 2.1) * 0.5 + 0.5; // 0→1
        const pulseScale = 1.0 + wave * 1.8;
        ud._pulse.scale.set(pulseScale, pulseScale, 1);
        ud._pulseMat.opacity = 0.55 * (1 - wave); // fades as it expands

        // Gentle bob on the island mesh itself (tiny up-down along normal)
        const bob = Math.sin(elapsed * 1.5 + idx * 1.3) * 0.004;
        mesh.position.copy(
          ud._surfacePos.clone().add(ud._normal.clone().multiplyScalar(bob))
        );
      });

      // ── Hover raycasting (STOPPED phase only) ──
      if (phase === PHASE_STOPPED) {
        raycasterRef.current.setFromCamera(mouseRef.current, camera);
        const hits = raycasterRef.current.intersectObjects(markersRef.current);
        const name = hits.length > 0 ? hits[0].object.userData.name : null;
        if (name !== hoveredNameRef.current) {
          hoveredNameRef.current = name;
          // Emissive boost on hover
          markersRef.current.forEach(m => {
            const hovered = (hoveredNameRef.current === m.userData.name);
            if (m.material && m.material.emissiveIntensity !== undefined) {
              m.material.emissiveIntensity = hovered ? 0.5 : 0.15;
            }
          });
          setHoveredIsland(hits.length > 0 ? hits[0].object.userData : null);
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // Mouse
    const onMouse = e => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    };
    container.addEventListener('mousemove', onMouse);

    // Click – navigate to Page2 when clicking an island
    const onClick = () => {
      if (phaseRef.current !== PHASE_STOPPED) return;
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const hits = raycasterRef.current.intersectObjects(markersRef.current);
      if (hits.length > 0 && onIslandClick) {
        onIslandClick(hits[0].object.userData.name);
      }
    };
    container.addEventListener('click', onClick);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('mousemove', onMouse);
      container.removeEventListener('click', onClick);
      container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  // Keyboard handler for 3D canvas
  const handleKeyDown = (e) => {
    if (phaseRef.current !== PHASE_STOPPED) return;
    const idx = focusedIndexRef.current;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (idx + 1) % ISLANDS.length;
      focusedIndexRef.current = next;
      setFocusedIsland(ISLANDS[next]);
      setHoveredIsland(ISLANDS[next]);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = (idx - 1 + ISLANDS.length) % ISLANDS.length;
      focusedIndexRef.current = next;
      setFocusedIsland(ISLANDS[next]);
      setHoveredIsland(ISLANDS[next]);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (idx >= 0 && idx < ISLANDS.length && onIslandClick) {
        onIslandClick(ISLANDS[idx].name);
      }
    }
  };

  const displayIsland = hoveredIsland || focusedIsland;

  return (
    <div className="earth-map-container">
      <div className="earth-map-wrapper">
        <div
          ref={containerRef}
          className={`earth-3d-container${displayIsland ? ' clickable' : ''}`}
          role="application"
          aria-label="Interactive 3D globe showing Palmer Archipelago islands. Use arrow keys to cycle between islands and Enter to select."
          tabIndex={0}
          onKeyDown={handleKeyDown}
        />

        {/* Screen-reader-only island buttons as fallback navigation */}
        <div className="sr-only" role="navigation" aria-label="Island navigation">
          {ISLANDS.map((island) => (
            <button
              key={island.name}
              onClick={() => onIslandClick && onIslandClick(island.name)}
              aria-label={`Explore ${island.name} Island – ${island.species}, ${island.population}`}
            >
              {island.name} Island
            </button>
          ))}
        </div>

        {!isLoaded && (
          <div className="loading-indicator" role="status" aria-live="polite">
            <div className="spinner" aria-hidden="true" />
            <p>Loading 3D Earth...</p>
          </div>
        )}
        {displayIsland && (
          <div
            className="island-tooltip"
            role="status"
            aria-live="polite"
            style={{ borderColor: displayIsland.color === '#FFFFFF' ? '#A5D8FF' : displayIsland.color }}
          >
            <h3 style={{ color: displayIsland.color === '#FFFFFF' ? '#A5D8FF' : displayIsland.color }}>
              {displayIsland.name} Island
            </h3>
            <p>{displayIsland.species}</p>
            <p className="tooltip-population">{displayIsland.population}</p>
            <p className="tooltip-fact">{displayIsland.fact}</p>
          </div>
        )}
        <p className="earth-hint" aria-hidden="true">Click an island to explore</p>
      </div>
    </div>
  );
};

export default EarthMap;

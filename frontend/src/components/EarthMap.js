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
// TARGET_EARTH_ROT = 5.83 places the island cluster (lon≈-64°) at world x≈0
// so it sits dead-centre in front of the camera.
const TARGET_EARTH_ROT = 5.83;

// Island cluster world position after rotation ≈ (0, -1.39, 0.65).
// Camera placed along that direction, further out, for a centred zoom.
const START_CAM  = new THREE.Vector3(0, 0, 5);
const TARGET_CAM = new THREE.Vector3(0, -1.85, 0.95);

const START_LOOK  = new THREE.Vector3(0, 0, 0);
const TARGET_LOOK = new THREE.Vector3(0, -1.39, 0.65);

// ── Island data ──────────────────────────────────────────────────────────────
// Positions exaggerated for visual separation at close zoom
const ISLANDS = [
  {
    name: 'Biscoe',
    lat: -66.0, lon: -62.0,
    species: 'Adélie Penguin',
    population: '15,000+',
    color: '#FF6B35',
    fact: 'Most numerous species',
  },
  {
    name: 'Dream',
    lat: -63.5, lon: -66.0,
    species: 'Chinstrap Penguin',
    population: '8,000+',
    color: '#4ECDC4',
    fact: 'Named for chin stripe',
  },
  {
    name: 'Torgersen',
    lat: -66.5, lon: -66.5,
    species: 'Gentoo Penguin',
    population: '5,000+',
    color: '#FFD43B',
    fact: 'Fastest swimming penguin',
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

// Draw rounded rectangle helper (compatible with older browsers)
const roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

// Creates a THREE.Sprite card for an island label
const createIslandSprite = (island) => {
  const W = 256, H = 160;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Card background
  ctx.fillStyle = 'rgba(5, 14, 30, 0.92)';
  roundRect(ctx, 2, 2, W - 4, H - 4, 14);
  ctx.fill();

  // Colored border
  ctx.strokeStyle = island.color;
  ctx.lineWidth = 4;
  roundRect(ctx, 2, 2, W - 4, H - 4, 14);
  ctx.stroke();

  // Top accent bar
  ctx.fillStyle = island.color;
  roundRect(ctx, 2, 2, W - 4, 28, 10);
  ctx.fill();

  // Island name on bar
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(island.name + ' Island', W / 2, 21);

  // Penguin emoji large
  ctx.font = '36px Arial';
  ctx.fillText('🐧', 42, 82);

  // Species
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(island.species, 80, 68);

  // Population
  ctx.fillStyle = island.color;
  ctx.font = 'bold 15px Arial';
  ctx.fillText(island.population + ' penguins', 80, 90);

  // Fact
  ctx.fillStyle = '#A5D8FF';
  ctx.font = '12px Arial';
  ctx.fillText(island.fact, 80, 112);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.72, 0.45, 1);
  return sprite;
};

// ── Earth texture ────────────────────────────────────────────────────────────
const createEarthTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 2048; canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  const ocean = ctx.createLinearGradient(0, 0, 0, 1024);
  ocean.addColorStop(0,   '#1565c0');
  ocean.addColorStop(0.5, '#0d47a1');
  ocean.addColorStop(1,   '#062e5a');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, 2048, 1024);

  const continents = [
    { x: 380,  y: 270, w: 420, h: 310 },
    { x: 540,  y: 580, w: 210, h: 320 },
    { x: 980,  y: 220, w: 260, h: 210 },
    { x: 1040, y: 480, w: 260, h: 380 },
    { x: 1280, y: 270, w: 520, h: 360 },
    { x: 1620, y: 680, w: 210, h: 160 },
    { x: 1024, y: 920, w: 1800, h: 140 },
  ];

  continents.forEach(c => {
    const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(c.w, c.h));
    g.addColorStop(0,   '#4caf50');
    g.addColorStop(0.5, '#2d6a4f');
    g.addColorStop(1,   '#1a4036');
    ctx.beginPath();
    ctx.ellipse(cx, cy, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  });

  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.07})`;
    ctx.fillRect(Math.random() * 2048, Math.random() * 1024, 2, 2);
  }

  return new THREE.CanvasTexture(canvas);
};

// ── Component ────────────────────────────────────────────────────────────────
const EarthMap = () => {
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

  const [isLoaded, setIsLoaded]           = useState(false);
  const [hoveredIsland, setHoveredIsland] = useState(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    // Camera - adjusted FOV for better island visibility
    const camera = new THREE.PerspectiveCamera(
      50, container.clientWidth / container.clientHeight, 0.1, 1000
    );
    camera.position.copy(START_CAM);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setClearColor(0x2a2a2a, 1);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0x667788, 0.9));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(5, 3, 5);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x8899aa, 0.4);
    fill.position.set(-5, -3, 5);
    scene.add(fill);

    // Earth sphere
    const earthGeo = new THREE.SphereGeometry(1.5, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
      map: createEarthTexture(),
      bumpScale: 0.04,
      specular: new THREE.Color(0x222222),
      shininess: 5,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earth);
    earthRef.current = earth;

    // Atmosphere glow
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
          float i = pow(0.7 - dot(vNormal, vec3(0,0,1.0)), 2.0);
          gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * i;
        }`,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.62, 64, 64), atmoMat));

    // Stars
    const sv = [];
    for (let i = 0; i < 10000; i++) {
      sv.push((Math.random()-.5)*2000, (Math.random()-.5)*2000, (Math.random()-.5)*2000);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sv, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.02 })));

    // Island markers + labels (attached to earth so they rotate with it)
    markersRef.current = [];
    const labelOffsets = [
      new THREE.Vector3( 0.38,  0.15, 0),   // Biscoe  – upper right
      new THREE.Vector3(-0.38,  0.15, 0),   // Dream   – upper left
      new THREE.Vector3( 0.00, -0.38, 0),   // Torgersen – below
    ];
    
    const markerSize = 0.02;

    ISLANDS.forEach((island, i) => {
      const localPos = latLonToVec3(island.lat, island.lon, 1.53);

      // Island marker – small dot
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(markerSize, 16, 16),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(island.color) })
      );
      marker.position.copy(localPos);
      marker.userData = island;
      earth.add(marker);
      markersRef.current.push(marker);

      // Sprite card label – offset outward from surface
      const sprite = createIslandSprite(island);
      const outward  = localPos.clone().normalize().multiplyScalar(1.85);
      const sideward = labelOffsets[i];
      sprite.position.copy(outward).add(sideward);
      sprite.visible = false;
      earth.add(sprite);

      // Store reference so we can show it on STOPPED
      marker.userData.sprite = sprite;
    });

    // Disable user controls entirely
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = controls.enablePan = controls.enableRotate = false;

    // ── Animation loop ─────────────────────────────────────────────────────
    setIsLoaded(true);
    clockRef.current.start();
    phaseRef.current     = PHASE_ROTATING;
    phaseTimeRef.current = 0;

    const lookPos = new THREE.Vector3();
    let animId;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();
      const phase = phaseRef.current;

      // ── Phase logic ──
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

        // Smoothly bring earth to target rotation so islands face camera
        earth.rotation.y = THREE.MathUtils.lerp(
          startEarthRotRef.current, TARGET_EARTH_ROT, e
        );

        if (t >= 1) {
          phaseRef.current = PHASE_STOPPED;
          camera.position.copy(TARGET_CAM);
          camera.lookAt(TARGET_LOOK);
          earth.rotation.y = TARGET_EARTH_ROT;
          // Reveal only hovered island label on hover (all phases)
          // Sprites start hidden
          earth.children.forEach(child => {
            if (child instanceof THREE.Sprite) {
              const name = child.userData?.name || '';
              child.visible = (hoveredNameRef.current === name);
            }
          });
        }

      }
      // PHASE_STOPPED → nothing moves

      // ── Hover raycasting (only in STOPPED phase for usability) ──
      if (phase === PHASE_STOPPED) {
        raycasterRef.current.setFromCamera(mouseRef.current, camera);
        const hits = raycasterRef.current.intersectObjects(markersRef.current);
        const name = hits.length > 0 ? hits[0].object.userData.name : null;
        if (name !== hoveredNameRef.current) {
          hoveredNameRef.current = name;
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

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('mousemove', onMouse);
      container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return (
    <div className="earth-map-container">
      <div className="earth-map-wrapper">
        <div ref={containerRef} className="earth-3d-container" />
        {!isLoaded && (
          <div className="loading-indicator">
            <div className="spinner" />
            <p>Loading 3D Earth...</p>
          </div>
        )}
        {hoveredIsland && (
          <div className="island-tooltip" style={{ borderColor: hoveredIsland.color }}>
            <h3 style={{ color: hoveredIsland.color }}>🐧 {hoveredIsland.name} Island</h3>
            <p>{hoveredIsland.species}</p>
            <p className="tooltip-population">{hoveredIsland.population} penguins</p>
            <p className="tooltip-fact">{hoveredIsland.fact}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EarthMap;

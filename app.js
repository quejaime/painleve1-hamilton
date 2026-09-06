/**
 * WEB VIEWER HAMILTON — COMPARATEUR 3D PAINLEVÉ I (1 ≤ t ≤ 15)
 * Surface Hamiltonienne G(x,y,t) = y^2/2 - x/3*(x^2 - 3t) = 0 (Rouge)
 * vs Surface Séparatrice Dynamique Réelle Non-Autonome (Bleue)
 *
 * Repère SO(3) canonique rigide : X = x, Y = t (vertical), Z = -y (profondeur)
 * Chiralité et orientation strictement identiques aux mathématiques et à PyVista.
 */

let scene, camera, renderer, controls;
let realMesh, theoMesh, cupMesh, extMesh, centerLineMesh, saddleLineMesh;
let originAxesGroup, boxDomainGroup, floorGridGroup;
let boundaryGroupTop, boundaryGroupBot;

let currentRenderMode = "both"; // "both" (Mixte) par défaut comme demandé
let boxRadius = 0.045; // Épaisseur affinée élégante
let boundaryRadius = 0.04; // Taille minimale par défaut (0.04) comme demandé
let boundaryColorMode = "black"; // "noir technique" (#000) par défaut comme demandé

// Matériaux des nappes
let matRealSmooth, matRealBack, matRealFront, matRealWire;
let matTheoSmooth, matTheoBack, matTheoFront, matTheoWire;
let matCupSmooth, matCupBack, matCupFront, matCupWire;
let matExtSmooth, matExtWire;
let matCenter, matSaddle;
let matBoundaryReal, matBoundaryTheo, matBoundaryHamilton;
const matBoxBlack = new THREE.MeshBasicMaterial({ color: 0x050505 });
const matTickBlack = new THREE.MeshBasicMaterial({ color: 0x050505 });

// Bounding Box du domaine d'étude
const BOX_BOUNDS = {
  minX: -8.0, maxX: 11.0,
  minY: 1.0,  maxY: 15.0, // t vertical
  minZ: -13.0, maxZ: 24.0 // Z = -y (vitesse y in [-24, 13])
};
const BOX_CENTER = new THREE.Vector3(
  (BOX_BOUNDS.minX + BOX_BOUNDS.maxX) / 2, // 1.5
  (BOX_BOUNDS.minY + BOX_BOUNDS.maxY) / 2, // 8.0
  (BOX_BOUNDS.minZ + BOX_BOUNDS.maxZ) / 2  // 5.5
);

// ============================================================
// GESTIONNAIRE DE RENDU LATEX (KaTeX auto-render)
// ============================================================
window.renderLatex = function (element) {
  const target = element || document.getElementById("ui-panel") || document.body;
  if (typeof renderMathInElement === 'function') {
    renderMathInElement(target, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true }
      ],
      throwOnError: false
    });
  }
};

// Fallback typographique au cas où KaTeX CDN serait inaccessible
setTimeout(() => {
  if (typeof renderMathInElement !== 'function') {
    const mathMap = [
      [/G\(x,y,t\)\s*=\s*\\frac\{y\^2\}\{2\}\s*-\s*\\frac\{x\}\{3\}\(x\^2\s*-\s*3t\)\s*=\s*0/g, '<em>G</em>(<em>x</em>,<em>y</em>,<em>t</em>) = <em>y</em><sup>2</sup>/2 − <em>x</em>(<em>x</em><sup>2</sup>−3<em>t</em>)/3 = 0'],
      [/\\frac\{\\mathrm\{d\}G\}\{\\mathrm\{d\}t\}\s*=\s*x\s*<\s*0/g, 'd<em>G</em>/d<em>t</em> = <em>x</em> < 0'],
      [/\\sqrt\{3t\}/g, '√(3<em>t</em>)'],
      [/\\sqrt\{t\}/g, '√<em>t</em>'],
      [/t_\{?\\max\}?/g, '<em>t</em><sub>max</sub>'],
      [/t_\{?\\min\}?/g, '<em>t</em><sub>min</sub>'],
      [/\\le/g, '≤'],
      [/\\ge/g, '≥'],
      [/\$([^$]+)\$/g, '<em>$1</em>']
    ];
    const panel = document.getElementById("ui-panel");
    if (panel) {
      let html = panel.innerHTML;
      mathMap.forEach(([rx, rep]) => {
        html = html.replace(rx, rep);
      });
      panel.innerHTML = html;
    }
  }
}, 1000);

function init() {
  if (window.renderLatex) window.renderLatex();

  const container = document.getElementById("canvas-container");

  // 1. Scène (Fond blanc pur spécial publication LaTeX)
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  // 2. Caméra Perspective
  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 1000);
  camera.position.set(-42, 38, 62);

  // 3. Renderer WebGL avec ombrage doux et antialiasing
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  // 4. Contrôles OrbitControls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.copy(BOX_CENTER);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.maxDistance = 250;
  controls.minDistance = 5;
  controls.update();

  // 5. Éclairage
  setupLighting();

  // 6. Matériaux & Objets
  initMaterials();
  buildSceneObjects();

  // 7. Interface UI
  setupUI();

  // 8. Masquer le loader
  const overlay = document.getElementById("loading-overlay");
  if (overlay) {
    overlay.style.opacity = "0";
    setTimeout(() => overlay.remove(), 400);
  }

  // 9. Boucle d'animation
  window.addEventListener("resize", onWindowResize);
  animate();
}

function setupLighting() {
  const ambLight = new THREE.AmbientLight(0xffffff, 0.72);
  scene.add(ambLight);

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.85);
  dirLight1.position.set(45, 60, 45);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0xf1f5f9, 0.55);
  dirLight2.position.set(-45, -20, -45);
  scene.add(dirLight2);

  const dirLight3 = new THREE.DirectionalLight(0xffffff, 0.40);
  dirLight3.position.set(0, 40, -50);
  scene.add(dirLight3);
}

function initMaterials() {
  // 1. Surface Réelle Non-Autonome (Bleu Royal) — Rendu 2 passes (BackSide / FrontSide)
  matRealBack = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8,
    roughness: 0.40,
    metalness: 0.05,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.65,
    depthWrite: false
  });

  matRealFront = new THREE.MeshStandardMaterial({
    color: 0x2563eb,
    roughness: 0.35,
    metalness: 0.10,
    side: THREE.FrontSide,
    transparent: true,
    opacity: 0.85,
    depthWrite: false
  });
  matRealSmooth = matRealFront;

  matRealWire = new THREE.MeshBasicMaterial({
    color: 0x1d4ed8,
    wireframe: true,
    transparent: true,
    opacity: 0.35
  });

  // 2. Goutte Gelée Théorique (Rouge Rubis) — Rendu 2 passes
  matTheoBack = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    roughness: 0.40,
    metalness: 0.05,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.55,
    depthWrite: false
  });

  matTheoFront = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.35,
    metalness: 0.10,
    side: THREE.FrontSide,
    transparent: true,
    opacity: 0.70,
    depthWrite: false
  });
  matTheoSmooth = matTheoFront;

  matTheoWire = new THREE.MeshBasicMaterial({
    color: 0x991b1b,
    wireframe: true,
    transparent: true,
    opacity: 0.40
  });

  // 3. Tasse de Hubbard G <= 0, x <= 0 (Ambre / Or Lumineux) — Rendu 2 passes
  matCupBack = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    roughness: 0.40,
    metalness: 0.05,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.65,
    depthWrite: false
  });

  matCupFront = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.35,
    metalness: 0.10,
    side: THREE.FrontSide,
    transparent: true,
    opacity: 0.85,
    depthWrite: false
  });
  matCupSmooth = matCupFront;

  matCupWire = new THREE.MeshBasicMaterial({
    color: 0xd97706,
    wireframe: true,
    transparent: true,
    opacity: 0.55
  });

  // 4. Branche Extérieure x >= sqrt(3t) (Ambre Cuivré)
  matExtSmooth = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.40,
    metalness: 0.05,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.50,
    depthWrite: false
  });

  matExtWire = new THREE.MeshBasicMaterial({
    color: 0xd97706,
    wireframe: true,
    transparent: true,
    opacity: 0.55
  });

  // 5. Ligne des centres (-sqrt(t), 0, t) : Rouge rubis vif
  matCenter = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.30,
    metalness: 0.15
  });

  // 6. Ligne des selles (sqrt(t), 0, t) : Noir technique pur (#050505)
  matSaddle = new THREE.MeshStandardMaterial({
    color: 0x050505,
    roughness: 0.35,
    metalness: 0.10
  });

  // Matériaux des contours de section
  updateBoundaryMaterials();
}

function updateBoundaryMaterials() {
  let colorReal, colorTheo, colorHamilton;

  if (boundaryColorMode === "black") {
    colorReal = 0x050505;     // Noir pur
    colorTheo = 0x050505;     // Noir pur
    colorHamilton = 0x050505; // Noir pur
  } else if (boundaryColorMode === "surface") {
    colorReal = 0x1d4ed8;     // Bleu royal dense
    colorTheo = 0x991b1b;     // Rouge carmin dense
    colorHamilton = 0xd97706; // Ambre / Or dense
  } else if (boundaryColorMode === "contrast1") {
    colorReal = 0x050505;     // Réel en noir
    colorTheo = 0xdc2626;     // Goutte en rouge rubis
    colorHamilton = 0xd97706; // Tasse en ambre/or
  } else if (boundaryColorMode === "contrast2") {
    colorReal = 0x2563eb;     // Réel en bleu éclatant
    colorTheo = 0x050505;     // Goutte en noir
    colorHamilton = 0x050505; // Tasse en noir
  }

  if (matBoundaryReal) {
    matBoundaryReal.color.setHex(colorReal);
  } else {
    matBoundaryReal = new THREE.MeshStandardMaterial({
      color: colorReal,
      roughness: 0.25,
      metalness: 0.15
    });
  }

  if (matBoundaryTheo) {
    matBoundaryTheo.color.setHex(colorTheo);
  } else {
    matBoundaryTheo = new THREE.MeshStandardMaterial({
      color: colorTheo,
      roughness: 0.25,
      metalness: 0.15
    });
  }

  if (matBoundaryHamilton) {
    matBoundaryHamilton.color.setHex(colorHamilton);
  } else {
    matBoundaryHamilton = new THREE.MeshStandardMaterial({
      color: colorHamilton,
      roughness: 0.25,
      metalness: 0.15
    });
  }
}

function createMeshGroup(data, smoothMat, wireMat) {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(data.vertices, 3));
  geom.setIndex(data.indices);
  geom.computeVertexNormals();

  const group = new THREE.Group();
  const smoothMesh = new THREE.Mesh(geom, smoothMat);
  smoothMesh.name = "smooth";
  group.add(smoothMesh);

  const wireMesh = new THREE.Mesh(geom, wireMat);
  wireMesh.name = "wire";
  wireMesh.visible = false;
  group.add(wireMesh);

  return group;
}

/**
 * Création d'un maillage transparent à deux passes (Face arrière puis Face avant).
 * Élimine à 100% les artefacts d'auto-occlusion Z-buffer et d'inversion de profondeur de Three.js.
 */
function createTwoPassMeshGroup(data, matBack, matFront, wireMat, orderBack = 1, orderFront = 4) {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(data.vertices, 3));
  geom.setIndex(data.indices);
  geom.computeVertexNormals();

  const group = new THREE.Group();

  // 1. Face Arrière (dessinée en premier)
  const meshBack = new THREE.Mesh(geom, matBack);
  meshBack.name = "smooth";
  meshBack.renderOrder = orderBack;
  group.add(meshBack);

  // 2. Face Avant (dessinée après les objets intérieurs)
  const meshFront = new THREE.Mesh(geom, matFront);
  meshFront.name = "smooth";
  meshFront.renderOrder = orderFront;
  group.add(meshFront);

  // 3. Filaire
  const wireMesh = new THREE.Mesh(geom, wireMat);
  wireMesh.name = "wire";
  wireMesh.visible = false;
  group.add(wireMesh);

  return group;
}

/**
 * Création d'étiquettes de texte haute fidélité (Canvas 512x128) avec contour blanc anti-collision
 */
function createTextSprite(text, color = "#050505", fontSize = 38, scale = 4.05, withHalo = true) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.font = `bold ${fontSize * 2}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (withHalo) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.96)";
    ctx.lineWidth = 13;
    ctx.lineJoin = "round";
    ctx.strokeText(text, 256, 64);
  }

  ctx.fillStyle = color;
  ctx.fillText(text, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(scale, scale * 0.25, 1);
  return sprite;
}

function createCylinderEdge(p1, p2, radius, material) {
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const len = dir.length();
  const geom = new THREE.CylinderGeometry(radius, radius, len, 16);
  const mesh = new THREE.Mesh(geom, material);
  mesh.position.copy(p1).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return mesh;
}

function createArrow3D(origin, direction, totalLength, radius, material, coneLen = 1.35, coneRadius = null) {
  const group = new THREE.Group();
  const dir = direction.clone().normalize();
  const cRadius = coneRadius || (radius * 3.1);
  const cylLen = Math.max(0.1, totalLength - coneLen);

  const pStart = origin.clone();
  const pEnd = origin.clone().addScaledVector(dir, cylLen);
  const cyl = createCylinderEdge(pStart, pEnd, radius, material);
  group.add(cyl);

  const coneGeom = new THREE.ConeGeometry(cRadius, coneLen, 24);
  const coneMesh = new THREE.Mesh(coneGeom, material);
  coneMesh.position.copy(origin).addScaledVector(dir, cylLen + coneLen * 0.5);
  coneMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  group.add(coneMesh);

  return group;
}

function extractPolylinePoints(vertices, startIdx, count, step = 1) {
  const pts = [];
  for (let i = 0; i < count; i += step) {
    const idx = (startIdx + i) * 3;
    pts.push(new THREE.Vector3(vertices[idx], vertices[idx + 1], vertices[idx + 2]));
  }
  return pts;
}

function createSmoothTube(points, radius, material, tubularSegments = 160, closed = false) {
  if (!points || points.length < 2) return null;
  const curve = new THREE.CatmullRomCurve3(points, closed, "centripetal");
  const geom = new THREE.TubeGeometry(curve, tubularSegments, radius, 12, closed);
  return new THREE.Mesh(geom, material);
}

function buildSceneObjects() {
  const data = window.HAMILTON_DATA;
  if (!data) return;

  // 1. Surface Réelle (Bleue) : BackSide en order 1, FrontSide en order 7
  realMesh = createTwoPassMeshGroup(data.real, matRealBack, matRealFront, matRealWire, 1, 7);
  scene.add(realMesh);

  // 2. Goutte Gelée Théorique (Rouge Rubis) : BackSide en order 2, FrontSide en order 6
  if (data.theo) {
    theoMesh = new THREE.Group();
    const theoMain = createTwoPassMeshGroup(data.theo.main, matTheoBack, matTheoFront, matTheoWire, 2, 6);
    const theoBot = createTwoPassMeshGroup(data.theo.bot, matTheoBack, matTheoFront, matTheoWire, 2, 6);
    theoMesh.add(theoMain);
    theoMesh.add(theoBot);
    scene.add(theoMesh);
  }

  // 3. Surface Hamiltonienne G(x,y,t)=0 (Ambre / Or)
  // A. Tasse de Hubbard (x <= 0) : BackSide en order 3, FrontSide en order 5
  cupMesh = createTwoPassMeshGroup(data.hamilton.cup, matCupBack, matCupFront, matCupWire, 3, 5);
  scene.add(cupMesh);

  // B. Branche Extérieure (x >= sqrt(3t)) : order 4
  extMesh = createMeshGroup(data.hamilton.exterior, matExtSmooth, matExtWire);
  extMesh.renderOrder = 4;
  if (extMesh.children) {
    extMesh.children.forEach(c => { c.renderOrder = 4; });
  }
  scene.add(extMesh);

  // 4. Ligne des centres (-sqrt(t), 0, t) rouge (0 <= t <= 19.50)
  buildCenterCurve();

  // 5. Ligne des Selles (sqrt(t), 0, t) noire (0 <= t <= 19.50)
  buildSaddleCurve();

  // 6. Contours de section t_min et t_max
  buildBoundaryCurves();

  // 7. Repère Cartésien issu de (0, 0, 0)
  buildOriginAxes();

  // 8. Boîte 3D cylindrique noire + Graduations denses +50%
  buildDomainBox();

  // 9. Grille perspective au sol (t = 1)
  buildFloorGrid();

  // 10. Appliquer le mode de rendu par défaut ("both" = Mixte)
  updateRenderMode(currentRenderMode);
}

/**
 * Ligne des centres (-sqrt(t), 0, t) tracée en rouge vif pour 0 <= t <= 1.30 * t_max (19.50).
 * Exactement même épaisseur (boundaryRadius) et même étendue que la ligne des selles (sqrt(t), 0, t).
 */
function buildCenterCurve() {
  if (centerLineMesh) scene.remove(centerLineMesh);

  const tMax = (BOX_BOUNDS && BOX_BOUNDS.maxY) ? BOX_BOUNDS.maxY : 15.0;
  const tEnd = tMax * 1.30; // 19.50
  const maxU = Math.sqrt(tEnd);
  const numPts = 200;
  const pts = [];

  for (let i = 0; i <= numPts; i++) {
    const u = (i / numPts) * maxU;
    const t = u * u;
    // Repère Three.js : X = x = -u = -sqrt(t), Y = t, Z = -y = 0
    pts.push(new THREE.Vector3(-u, t, 0));
  }

  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const tubeGeom = new THREE.TubeGeometry(curve, 240, boundaryRadius, 14, false);

  const group = new THREE.Group();
  const tubeMesh = new THREE.Mesh(tubeGeom, matCenter);
  tubeMesh.name = "center-tube";
  group.add(tubeMesh);

  const tipGeom = new THREE.SphereGeometry(boundaryRadius * 1.15, 14, 14);
  const tipMesh = new THREE.Mesh(tipGeom, matCenter);
  tipMesh.position.set(-maxU, tEnd, 0);
  group.add(tipMesh);

  centerLineMesh = group;
  scene.add(centerLineMesh);

  const toggleCenter = document.getElementById("toggle-center");
  if (toggleCenter) centerLineMesh.visible = toggleCenter.checked;
}

/**
 * Ligne des selles (sqrt(t), 0, t) tracée en noir pur pour 0 <= t <= 1.30 * t_max (19.50).
 * Même épaisseur (boundaryRadius) que les bords de surface.
 */
function buildSaddleCurve() {
  if (saddleLineMesh) scene.remove(saddleLineMesh);

  const tMax = (BOX_BOUNDS && BOX_BOUNDS.maxY) ? BOX_BOUNDS.maxY : 15.0;
  const tEnd = tMax * 1.30; // 19.50
  const maxU = Math.sqrt(tEnd);
  const numPts = 200;
  const pts = [];

  for (let i = 0; i <= numPts; i++) {
    const u = (i / numPts) * maxU;
    const t = u * u;
    pts.push(new THREE.Vector3(u, t, 0));
  }

  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const tubeGeom = new THREE.TubeGeometry(curve, 240, boundaryRadius, 14, false);

  const group = new THREE.Group();
  const tubeMesh = new THREE.Mesh(tubeGeom, matSaddle);
  tubeMesh.name = "saddle-tube";
  group.add(tubeMesh);

  const tipGeom = new THREE.SphereGeometry(boundaryRadius * 1.15, 14, 14);
  const tipMesh = new THREE.Mesh(tipGeom, matSaddle);
  tipMesh.position.set(maxU, tEnd, 0);
  group.add(tipMesh);

  saddleLineMesh = group;
  scene.add(saddleLineMesh);

  const toggleSaddle = document.getElementById("toggle-saddle");
  if (toggleSaddle) saddleLineMesh.visible = toggleSaddle.checked;
}

/**
 * Contours de section dans le plan t = t_max = 15 et dans le plan t = t_min = 1
 */
function buildBoundaryCurves() {
  const data = window.HAMILTON_DATA;
  if (!data) return;

  updateBoundaryMaterials();

  if (boundaryGroupTop) scene.remove(boundaryGroupTop);
  if (boundaryGroupBot) scene.remove(boundaryGroupBot);

  boundaryGroupTop = new THREE.Group();
  boundaryGroupBot = new THREE.Group();

  const nThetaCup = data.metadata.n_theta_cup || 200;
  const nFramesCup = data.metadata.n_frames_cup || 80;
  const nFramesReal = data.metadata.n_frames_real || 56;
  const nFramesExt = data.metadata.n_frames_ext || 160;
  const nPtsExt = data.metadata.n_pts_ext || 241;

  // ============================================================
  // A. PLAN SOMMET (t = t_max = 15)
  // ============================================================
  // 1. Courbe Réelle au sommet
  const topRealPts = extractPolylinePoints(
    data.real.vertices,
    (nFramesReal - 1) * 500,
    500,
    3
  );
  const meshTopReal = createSmoothTube(topRealPts, boundaryRadius, matBoundaryReal, 200, false);
  if (meshTopReal) {
    meshTopReal.name = "boundary-real";
    boundaryGroupTop.add(meshTopReal);
  }

  // 2. Courbe Goutte Gelée au sommet (Main + Bot)
  if (data.theo) {
    const nFramesTheo = data.metadata.n_frames_theo || 60;
    const topTheoMainPts = extractPolylinePoints(
      data.theo.main.vertices,
      (nFramesTheo - 1) * 250,
      250,
      2
    );
    const meshTopTheoMain = createSmoothTube(topTheoMainPts, boundaryRadius, matBoundaryTheo, 160, false);
    if (meshTopTheoMain) {
      meshTopTheoMain.name = "boundary-theo";
      boundaryGroupTop.add(meshTopTheoMain);
    }

    const topTheoBotPts = extractPolylinePoints(
      data.theo.bot.vertices,
      (nFramesTheo - 1) * 120,
      120,
      2
    );
    const meshTopTheoBot = createSmoothTube(topTheoBotPts, boundaryRadius, matBoundaryTheo, 90, false);
    if (meshTopTheoBot) {
      meshTopTheoBot.name = "boundary-theo";
      boundaryGroupTop.add(meshTopTheoBot);
    }

    if (topTheoMainPts.length > 0) {
      const sGeom = new THREE.SphereGeometry(boundaryRadius * 1.3, 12, 12);
      const s1 = new THREE.Mesh(sGeom, matBoundaryTheo);
      s1.name = "boundary-theo";
      s1.position.copy(topTheoMainPts[0]);
      boundaryGroupTop.add(s1);
    }
  }

  // 3. Courbe Tasse Hamilton au sommet (boucle fermée dans le plan t = 15)
  const topCupPts = extractPolylinePoints(
    data.hamilton.cup.vertices,
    (nFramesCup - 1) * nThetaCup,
    nThetaCup,
    1
  );
  const meshTopCup = createSmoothTube(topCupPts, boundaryRadius, matBoundaryHamilton, 180, true);
  if (meshTopCup) {
    meshTopCup.name = "boundary-cup";
    boundaryGroupTop.add(meshTopCup);
  }

  // 4. Courbe Branche Extérieure au sommet (ligne solide ouverte dans le plan t = 15)
  const topExtPts = extractPolylinePoints(
    data.hamilton.exterior.vertices,
    (nFramesExt - 1) * nPtsExt,
    nPtsExt,
    1
  );
  const meshTopExt = createSmoothTube(topExtPts, boundaryRadius, matBoundaryHamilton, 200, false);
  if (meshTopExt) {
    meshTopExt.name = "boundary-ext";
    boundaryGroupTop.add(meshTopExt);
  }

  scene.add(boundaryGroupTop);

  // ============================================================
  // B. PLAN BASE (t = t_min = 1)
  // ============================================================
  // 1. Courbe Réelle à la base
  const botRealPts = extractPolylinePoints(data.real.vertices, 0, 500, 3);
  const meshBotReal = createSmoothTube(botRealPts, boundaryRadius, matBoundaryReal, 200, false);
  if (meshBotReal) {
    meshBotReal.name = "boundary-real";
    boundaryGroupBot.add(meshBotReal);
  }

  // 2. Courbe Goutte Gelée à la base (Main + Bot)
  if (data.theo) {
    const botTheoMainPts = extractPolylinePoints(data.theo.main.vertices, 0, 250, 2);
    const meshBotTheoMain = createSmoothTube(botTheoMainPts, boundaryRadius, matBoundaryTheo, 160, false);
    if (meshBotTheoMain) {
      meshBotTheoMain.name = "boundary-theo";
      boundaryGroupBot.add(meshBotTheoMain);
    }

    const botTheoBotPts = extractPolylinePoints(data.theo.bot.vertices, 0, 120, 2);
    const meshBotTheoBot = createSmoothTube(botTheoBotPts, boundaryRadius, matBoundaryTheo, 90, false);
    if (meshBotTheoBot) {
      meshBotTheoBot.name = "boundary-theo";
      boundaryGroupBot.add(meshBotTheoBot);
    }

    if (botTheoMainPts.length > 0) {
      const sGeom = new THREE.SphereGeometry(boundaryRadius * 1.3, 12, 12);
      const s2 = new THREE.Mesh(sGeom, matBoundaryTheo);
      s2.name = "boundary-theo";
      s2.position.copy(botTheoMainPts[0]);
      boundaryGroupBot.add(s2);
    }
  }

  // 3. Courbe Tasse Hamilton à la base (boucle fermée dans le plan t = 1)
  const botCupPts = extractPolylinePoints(data.hamilton.cup.vertices, 0, nThetaCup, 1);
  const meshBotCup = createSmoothTube(botCupPts, boundaryRadius, matBoundaryHamilton, 180, true);
  if (meshBotCup) {
    meshBotCup.name = "boundary-cup";
    boundaryGroupBot.add(meshBotCup);
  }

  // 4. Courbe Branche Extérieure à la base (ligne solide ouverte dans le plan t = 1)
  const botExtPts = extractPolylinePoints(
    data.hamilton.exterior.vertices,
    0,
    nPtsExt,
    1
  );
  const meshBotExt = createSmoothTube(botExtPts, boundaryRadius, matBoundaryHamilton, 200, false);
  if (meshBotExt) {
    meshBotExt.name = "boundary-ext";
    boundaryGroupBot.add(meshBotExt);
  }

  scene.add(boundaryGroupBot);

  updateLayerVisibility();
}

/**
 * Axes (x, y, t) issus de l'origine (0, 0, 0)
 * Même épaisseur fine et couleur noire que la boîte, flèches en cône 3D,
 * axe X calibré à 19.80, axe T à 19.50, axe Y à 16.90.
 */
function buildOriginAxes() {
  originAxesGroup = new THREE.Group();
  const origin = new THREE.Vector3(0, 0, 0);

  // Sphère à l'origine (0, 0, 0)
  const sphereGeom = new THREE.SphereGeometry(boxRadius * 2.0, 16, 16);
  const sphere = new THREE.Mesh(sphereGeom, matBoxBlack);
  sphere.position.copy(origin);
  originAxesGroup.add(sphere);

  const labelO = createTextSprite("(0,0,0)", "#050505", 28, 4.2, true);
  labelO.position.set(0, -1.0, 0);
  originAxesGroup.add(labelO);

  // 1. Axe +X (Position x) : calibré à 19.80 (dépasse de 6 unités les graduations y)
  const lenX = 19.80;
  const arrowX = createArrow3D(origin, new THREE.Vector3(1, 0, 0), lenX, boxRadius, matBoxBlack, 1.35, boxRadius * 3.1);
  originAxesGroup.add(arrowX);

  const labelX = createTextSprite("+x (position)", "#050505", 30, 6.2, true);
  labelX.position.set(lenX + 3.2, 0, 0);
  originAxesGroup.add(labelX);

  // Axe négatif -X (pointillés)
  const lenNegX = 10.40;
  const negXGeom = new THREE.BufferGeometry().setFromPoints([origin, new THREE.Vector3(-lenNegX, 0, 0)]);
  const negXLine = new THREE.Line(negXGeom, new THREE.LineDashedMaterial({ color: 0x050505, dashSize: 0.6, gapSize: 0.35, opacity: 0.55, transparent: true }));
  negXLine.computeLineDistances();
  originAxesGroup.add(negXLine);

  // 2. Axe +T (Temps vertical t) : sort de 30% -> 19.50
  const lenT = 19.50;
  const arrowT = createArrow3D(origin, new THREE.Vector3(0, 1, 0), lenT, boxRadius, matBoxBlack, 1.3, boxRadius * 3.0);
  originAxesGroup.add(arrowT);

  const labelT = createTextSprite("+t (temps)", "#050505", 30, 5.8, true);
  labelT.position.set(0, lenT + 2.0, 0);
  originAxesGroup.add(labelT);

  // 3. Axe +Y (Vitesse y, orienté vers -Z dans Three.js) : sort de 30% -> 16.90
  const lenY = 16.90;
  const arrowY = createArrow3D(origin, new THREE.Vector3(0, 0, -1), lenY, boxRadius, matBoxBlack, 1.3, boxRadius * 3.0);
  originAxesGroup.add(arrowY);

  const labelY = createTextSprite("+y (vitesse)", "#050505", 30, 5.8, true);
  labelY.position.set(0, 0, -(lenY + 3.0));
  originAxesGroup.add(labelY);

  // Axe négatif -Y (vers Z = +31.20)
  const lenNegY = 31.20;
  const negYGeom = new THREE.BufferGeometry().setFromPoints([origin, new THREE.Vector3(0, 0, lenNegY)]);
  const negYLine = new THREE.Line(negYGeom, new THREE.LineDashedMaterial({ color: 0x050505, dashSize: 0.6, gapSize: 0.35, opacity: 0.55, transparent: true }));
  negYLine.computeLineDistances();
  originAxesGroup.add(negYLine);

  scene.add(originAxesGroup);
}

/**
 * Boîte 3D cylindrique noire avec graduations denses et bien visibles (+50% taille)
 */
function buildDomainBox() {
  if (boxDomainGroup) scene.remove(boxDomainGroup);
  boxDomainGroup = new THREE.Group();

  const { minX, maxX, minY, maxY, minZ, maxZ } = BOX_BOUNDS;

  const corners = [
    new THREE.Vector3(minX, minY, minZ), // 0: bas arrière gauche
    new THREE.Vector3(maxX, minY, minZ), // 1: bas arrière droite
    new THREE.Vector3(minX, maxY, minZ), // 2: haut arrière gauche
    new THREE.Vector3(maxX, maxY, minZ), // 3: haut arrière droite
    new THREE.Vector3(minX, minY, maxZ), // 4: bas avant gauche
    new THREE.Vector3(maxX, minY, maxZ), // 5: bas avant droite
    new THREE.Vector3(minX, maxY, maxZ), // 6: haut avant gauche
    new THREE.Vector3(maxX, maxY, maxZ)  // 7: haut avant droite
  ];

  const sphereGeom = new THREE.SphereGeometry(boxRadius * 1.30, 16, 16);
  corners.forEach(pt => {
    const s = new THREE.Mesh(sphereGeom, matBoxBlack);
    s.position.copy(pt);
    boxDomainGroup.add(s);
  });

  const edgePairs = [
    [0, 1], [2, 3], [4, 5], [6, 7], // X
    [0, 2], [1, 3], [4, 6], [5, 7], // Y (t)
    [0, 4], [1, 5], [2, 6], [3, 7]  // Z (-y)
  ];

  edgePairs.forEach(([i, j]) => {
    const cylinder = createCylinderEdge(corners[i], corners[j], boxRadius, matBoxBlack);
    boxDomainGroup.add(cylinder);
  });

  // --- GRADUATIONS AXE X (Position, arête basse avant : Y=minY, Z=maxZ) ---
  const xMajorTicks = [-6, -4, -2, 0, 2, 4, 6, 8, 10];
  xMajorTicks.forEach(val => {
    if (val >= minX && val <= maxX) {
      const p1 = new THREE.Vector3(val, minY, maxZ);
      const p2 = new THREE.Vector3(val, minY, maxZ + 1.10);
      const tick = createCylinderEdge(p1, p2, boxRadius * 1.05, matTickBlack);
      boxDomainGroup.add(tick);

      const txt = createTextSprite(`x=${val}`, "#050505", 39, 4.05, true);
      txt.position.set(val, minY - 0.70, maxZ + 2.25);
      boxDomainGroup.add(txt);
    }
  });

  const xMinorTicks = [-7, -5, -3, -1, 1, 3, 5, 7, 9];
  xMinorTicks.forEach(val => {
    if (val >= minX && val <= maxX) {
      const p1 = new THREE.Vector3(val, minY, maxZ);
      const p2 = new THREE.Vector3(val, minY, maxZ + 0.58);
      const tick = createCylinderEdge(p1, p2, boxRadius * 0.75, matTickBlack);
      boxDomainGroup.add(tick);
    }
  });

  // --- GRADUATIONS AXE T (Temps vertical, arête avant gauche : X=minX, Z=maxZ) ---
  const tMajorTicks = [1, 3, 5, 7, 9, 11, 13, 15];
  tMajorTicks.forEach(val => {
    if (val >= minY && val <= maxY) {
      const p1 = new THREE.Vector3(minX, val, maxZ);
      const p2 = new THREE.Vector3(minX - 1.10, val, maxZ);
      const tick = createCylinderEdge(p1, p2, boxRadius * 1.05, matTickBlack);
      boxDomainGroup.add(tick);

      const txt = createTextSprite(`t=${val}`, "#050505", 39, 4.05, true);
      txt.position.set(minX - 2.85, val, maxZ + 0.30);
      boxDomainGroup.add(txt);
    }
  });

  const tMinorTicks = [2, 4, 6, 8, 10, 12, 14];
  tMinorTicks.forEach(val => {
    if (val >= minY && val <= maxY) {
      const p1 = new THREE.Vector3(minX, val, maxZ);
      const p2 = new THREE.Vector3(minX - 0.58, val, maxZ);
      const tick = createCylinderEdge(p1, p2, boxRadius * 0.75, matTickBlack);
      boxDomainGroup.add(tick);
    }
  });

  // --- GRADUATIONS AXE Y (Vitesse, arête basse droite : X=maxX, Y=minY) ---
  const yMajorTicks = [-20, -15, -10, -5, 0, 5, 10];
  yMajorTicks.forEach(yVal => {
    const zVal = -yVal;
    if (zVal >= minZ && zVal <= maxZ) {
      const p1 = new THREE.Vector3(maxX, minY, zVal);
      const p2 = new THREE.Vector3(maxX + 1.10, minY, zVal);
      const tick = createCylinderEdge(p1, p2, boxRadius * 1.05, matTickBlack);
      boxDomainGroup.add(tick);

      const txt = createTextSprite(`y=${yVal}`, "#050505", 39, 4.05, true);
      txt.position.set(maxX + 2.85, minY + 0.10, zVal);
      boxDomainGroup.add(txt);
    }
  });

  const yMinorTicks = [-22.5, -17.5, -12.5, -7.5, -2.5, 2.5, 7.5, 12.5];
  yMinorTicks.forEach(yVal => {
    const zVal = -yVal;
    if (zVal >= minZ && zVal <= maxZ) {
      const p1 = new THREE.Vector3(maxX, minY, zVal);
      const p2 = new THREE.Vector3(maxX + 0.58, minY, zVal);
      const tick = createCylinderEdge(p1, p2, boxRadius * 0.75, matTickBlack);
      boxDomainGroup.add(tick);
    }
  });

  scene.add(boxDomainGroup);
}

/**
 * Grille perspective au sol (t = 1)
 */
function buildFloorGrid() {
  if (floorGridGroup) scene.remove(floorGridGroup);
  floorGridGroup = new THREE.Group();

  const { minX, maxX, minY, minZ, maxZ } = BOX_BOUNDS;
  const gridMat = new THREE.LineDashedMaterial({
    color: 0x94a3b8,
    dashSize: 0.7,
    gapSize: 0.4,
    transparent: true,
    opacity: 0.40
  });

  [-6, -4, -2, 0, 2, 4, 6, 8, 10].forEach(xVal => {
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(xVal, minY, minZ),
      new THREE.Vector3(xVal, minY, maxZ)
    ]);
    const line = new THREE.Line(geom, gridMat);
    line.computeLineDistances();
    floorGridGroup.add(line);
  });

  [-20, -15, -10, -5, 0, 5, 10].forEach(yVal => {
    const zVal = -yVal;
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(minX, minY, zVal),
      new THREE.Vector3(maxX, minY, zVal)
    ]);
    const line = new THREE.Line(geom, gridMat);
    line.computeLineDistances();
    floorGridGroup.add(line);
  });

  scene.add(floorGridGroup);
}

function updateRenderMode(mode) {
  currentRenderMode = mode;
  function applyMode(obj) {
    if (!obj) return;
    if (obj.name === "smooth") obj.visible = (mode === "smooth" || mode === "both");
    if (obj.name === "wire") obj.visible = (mode === "wireframe" || mode === "both");
    if (obj.children) obj.children.forEach(applyMode);
  }
  applyMode(realMesh);
  applyMode(theoMesh);
  applyMode(cupMesh);
  applyMode(extMesh);
}

function updateLayerVisibility() {
  const showReal = document.getElementById("toggle-real").checked;
  const showTheo = document.getElementById("toggle-theo") ? document.getElementById("toggle-theo").checked : true;
  const showCup = document.getElementById("toggle-hamilton-cup").checked;
  const showExt = document.getElementById("toggle-hamilton-ext").checked;
  const showCenter = document.getElementById("toggle-center").checked;
  const showSaddle = document.getElementById("toggle-saddle").checked;

  const toggleTop = document.getElementById("toggle-boundary-top");
  const toggleBot = document.getElementById("toggle-boundary-bot");
  const showTop = toggleTop ? toggleTop.checked : true;
  const showBot = toggleBot ? toggleBot.checked : true;

  if (realMesh) realMesh.visible = showReal;
  if (theoMesh) theoMesh.visible = showTheo;
  if (cupMesh) cupMesh.visible = showCup;
  if (extMesh) extMesh.visible = showExt;
  if (centerLineMesh) centerLineMesh.visible = showCenter;
  if (saddleLineMesh) saddleLineMesh.visible = showSaddle;

  if (boundaryGroupTop) {
    boundaryGroupTop.visible = showTop;
    const topReal = boundaryGroupTop.getObjectByName("boundary-real");
    const topCup = boundaryGroupTop.getObjectByName("boundary-cup");
    const topExt = boundaryGroupTop.getObjectByName("boundary-ext");
    if (topReal) topReal.visible = showReal;
    if (topCup) topCup.visible = showCup;
    if (topExt) topExt.visible = showExt;
    boundaryGroupTop.traverse(child => {
      if (child.name === "boundary-theo") child.visible = showTheo;
    });
  }

  if (boundaryGroupBot) {
    boundaryGroupBot.visible = showBot;
    const botReal = boundaryGroupBot.getObjectByName("boundary-real");
    const botCup = boundaryGroupBot.getObjectByName("boundary-cup");
    const botExt = boundaryGroupBot.getObjectByName("boundary-ext");
    if (botReal) botReal.visible = showReal;
    if (botCup) botCup.visible = showCup;
    if (botExt) botExt.visible = showExt;
    boundaryGroupBot.traverse(child => {
      if (child.name === "boundary-theo") child.visible = showTheo;
    });
  }
}

function setupUI() {
  // 1. Couches 3D
  ["toggle-real", "toggle-theo", "toggle-hamilton-cup", "toggle-hamilton-ext", "toggle-center", "toggle-saddle"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", updateLayerVisibility);
  });

  // 2. Contours
  ["toggle-boundary-top", "toggle-boundary-bot"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", updateLayerVisibility);
  });

  // 3. Style des contours
  const colorSelect = document.getElementById("boundary-color-mode");
  if (colorSelect) {
    colorSelect.addEventListener("change", e => {
      boundaryColorMode = e.target.value;
      updateBoundaryMaterials();
    });
  }

  // 4. Curseur épaisseur des contours
  const thickSlider = document.getElementById("boundary-thickness");
  const valThick = document.getElementById("val-boundary-thickness");
  if (thickSlider && valThick) {
    thickSlider.addEventListener("input", e => {
      boundaryRadius = parseFloat(e.target.value);
      valThick.textContent = boundaryRadius.toFixed(2);
      buildBoundaryCurves();
      buildSaddleCurve();
      buildCenterCurve();
    });
  }

  // 5. Toggles Repères et Boîte
  const toggleAxes = document.getElementById("toggle-origin-axes");
  if (toggleAxes) {
    toggleAxes.addEventListener("change", () => {
      if (originAxesGroup) originAxesGroup.visible = toggleAxes.checked;
    });
  }

  const toggleBox = document.getElementById("toggle-box");
  if (toggleBox) {
    toggleBox.addEventListener("change", () => {
      if (boxDomainGroup) boxDomainGroup.visible = toggleBox.checked;
    });
  }

  const toggleFloor = document.getElementById("toggle-floor-grid");
  if (toggleFloor) {
    toggleFloor.addEventListener("change", () => {
      if (floorGridGroup) floorGridGroup.visible = toggleFloor.checked;
    });
  }

  // 6. Opacités
  const opReal = document.getElementById("opacity-real");
  const valReal = document.getElementById("val-opacity-real");
  if (opReal && valReal) {
    opReal.addEventListener("input", e => {
      const v = parseFloat(e.target.value);
      matRealFront.opacity = v;
      matRealBack.opacity = v * 0.75;
      valReal.textContent = `${Math.round(v * 100)}%`;
    });
  }

  const opTheo = document.getElementById("opacity-theo");
  const valTheo = document.getElementById("val-opacity-theo");
  if (opTheo && valTheo) {
    opTheo.addEventListener("input", e => {
      const v = parseFloat(e.target.value);
      matTheoFront.opacity = v;
      matTheoBack.opacity = v * 0.75;
      valTheo.textContent = `${Math.round(v * 100)}%`;
    });
  }

  const opHam = document.getElementById("opacity-hamilton");
  const valHam = document.getElementById("val-opacity-hamilton");
  if (opHam && valHam) {
    opHam.addEventListener("input", e => {
      const v = parseFloat(e.target.value);
      matCupFront.opacity = v;
      matCupBack.opacity = v * 0.75;
      matExtSmooth.opacity = v * 0.70;
      valHam.textContent = `${Math.round(v * 100)}%`;
    });
  }

  // 7. Mode de rendu (Lisse / Filaire / Mixte)
  document.querySelectorAll("[data-render]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-render]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      updateRenderMode(btn.getAttribute("data-render"));
    });
  });

  // 8. Fond blanc pur
  const toggleBg = document.getElementById("toggle-white-bg");
  if (toggleBg) {
    toggleBg.addEventListener("change", () => {
      scene.background.setHex(toggleBg.checked ? 0xffffff : 0x0f172a);
    });
  }

  // 9. Masquer / Afficher UI (Raccourci H)
  const uiPanel = document.getElementById("ui-panel");
  const btnHide = document.getElementById("btn-hide-ui");
  const btnShow = document.getElementById("btn-show-ui");

  function setUIVisible(visible) {
    if (visible) {
      uiPanel.classList.remove("hidden");
      btnShow.classList.remove("visible");
    } else {
      uiPanel.classList.add("hidden");
      btnShow.classList.add("visible");
    }
  }

  if (btnHide) btnHide.addEventListener("click", () => setUIVisible(false));
  if (btnShow) btnShow.addEventListener("click", () => setUIVisible(true));

  window.addEventListener("keydown", e => {
    if (e.key === "h" || e.key === "H") {
      const isHidden = uiPanel.classList.contains("hidden");
      setUIVisible(isHidden);
    }
  });

  // 10. Capture HD (2x)
  const btnExport = document.getElementById("btn-export-hd");
  if (btnExport) {
    btnExport.addEventListener("click", () => {
      const prevRatio = renderer.getPixelRatio();
      renderer.setPixelRatio(2);
      renderer.render(scene, camera);
      const dataURL = renderer.domElement.toDataURL("image/png");
      const a = document.createElement("a");
      a.download = "Painleve1_Hamilton_Separatrix_3D.png";
      a.href = dataURL;
      a.click();
      renderer.setPixelRatio(prevRatio);
    });
  }

  // 11. Presets Caméra centrés sur BOX_CENTER
  document.querySelectorAll("[data-cam]").forEach(btn => {
    btn.addEventListener("click", () => {
      const camType = btn.getAttribute("data-cam");
      controls.target.copy(BOX_CENTER);
      const dist = 60;

      if (camType === "perspective") {
        camera.up.set(0, 1, 0);
        camera.position.set(-42, 38, 62);
      } else if (camType === "diag") {
        camera.up.set(0, 1, 0);
        camera.position.set(36, 32, 58);
      } else if (camType === "top") {
        camera.up.set(0, 0, -1);
        camera.position.set(BOX_CENTER.x, BOX_CENTER.y + dist, BOX_CENTER.z);
      } else if (camType === "front") {
        camera.up.set(0, 1, 0);
        camera.position.set(BOX_CENTER.x, BOX_CENTER.y, BOX_CENTER.z + dist);
      } else if (camType === "side") {
        camera.up.set(0, 1, 0);
        camera.position.set(BOX_CENTER.x - dist, BOX_CENTER.y, BOX_CENTER.z);
      }
      camera.lookAt(BOX_CENTER);
      controls.update();
    });
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener("DOMContentLoaded", init);

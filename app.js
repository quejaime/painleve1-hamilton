/**
 * WEB VIEWER HAMILTON UNIFIÉ — COMPARATEUR 3D PAINLEVÉ I (-3.5 ≤ t ≤ 15.0)
 * Surface Hamiltonienne G(x,y,t) = y^2/2 - x/3*(x^2 - 3t) = 0 (Rouge)
 * vs Surface Séparatrice Dynamique Réelle Non-Autonome (Bleue)
 *
 * Repère SO(3) canonique rigide : X = x, Y = t (vertical), Z = -y (profondeur)
 * Maillage 100% homogène : pas Delta t = 0.10 uniforme, plancher net à y = -30.0 (Z = 30.0)
 * Chiralité et orientation strictement conformes aux équations mathématiques.
 */

let scene, camera, renderer, controls;
let realMesh, theoMesh, cupMesh, extMesh, centerLineMesh, saddleLineMesh;
let originAxesGroup, boxDomainGroup, floorGridGroup, zeroGridGroup;
let boundaryGroupTop, boundaryGroupBot, boundaryGroupZero;

let currentRenderMode = "both"; // "both" (Mixte) par défaut
let boxRadius = 0.045;          // Épaisseur affinée élégante
let boundaryRadius = 0.04;      // Taille minimale par défaut (0.04)
let boundaryColorMode = "black";// "noir technique" (#000) par défaut

// Matériaux des nappes
let matRealSmooth, matRealBack, matRealFront, matRealWire;
let matTheoSmooth, matTheoBack, matTheoFront, matTheoWire;
let matCupSmooth, matCupBack, matCupFront, matCupWire;
let matExtSmooth, matExtWire;
let matCenter, matSaddle;
let matBoundaryReal, matBoundaryTheo, matBoundaryHamilton;
const matBoxBlack = new THREE.MeshBasicMaterial({ color: 0x050505 });
const matTickBlack = new THREE.MeshBasicMaterial({ color: 0x050505 });

// Bounding Box du domaine d'étude (-3.5 <= t <= 15.0, x in [-8, 12.5], y in [-30, 13])
const BOX_BOUNDS = {
  minX: -8.0, maxX: 12.5,
  minY: -3.5, maxY: 15.0, // t vertical étendu
  minZ: -13.0, maxZ: 30.0 // Z = -y (vitesse y in [-30, 13])
};
const BOX_CENTER = new THREE.Vector3(
  (BOX_BOUNDS.minX + BOX_BOUNDS.maxX) / 2, // 2.25
  (BOX_BOUNDS.minY + BOX_BOUNDS.maxY) / 2, // 5.75
  (BOX_BOUNDS.minZ + BOX_BOUNDS.maxZ) / 2  // 8.50
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
  camera.position.set(-42, 34, 64);

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
  dirLight1.position.set(45, 65, 45);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0xf1f5f9, 0.55);
  dirLight2.position.set(-45, -20, -45);
  scene.add(dirLight2);

  const dirLight3 = new THREE.DirectionalLight(0xffffff, 0.40);
  dirLight3.position.set(0, 45, -50);
  scene.add(dirLight3);
}

function initMaterials() {
  // 1. Surface Réelle Non-Autonome (Bleu Royal) — Rendu 2 passes
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
 */
function createTwoPassMeshGroup(data, matBack, matFront, wireMat, orderBack = 1, orderFront = 4) {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(data.vertices, 3));
  geom.setIndex(data.indices);
  geom.computeVertexNormals();

  const group = new THREE.Group();

  // 1. Face Arrière
  const meshBack = new THREE.Mesh(geom, matBack);
  meshBack.name = "smooth";
  meshBack.renderOrder = orderBack;
  group.add(meshBack);

  // 2. Face Avant
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
 * Création d'étiquettes de texte haute fidélité (Canvas 512x128)
 * Fond 100% transparent avec depthWrite: false pour préserver intégralement les surfaces 3D
 */
function createTextSprite(text, color = "#050505", fontSize = 38, scale = 4.05, withHalo = true) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.font = `bold ${fontSize * 2}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (withHalo) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
    ctx.lineWidth = 5;
    ctx.lineJoin = "round";
    ctx.strokeText(text, 256, 64);
  }

  ctx.fillStyle = color;
  ctx.fillText(text, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false, // CRITIQUE : n'écrit pas dans le Z-buffer, ne masque JAMAIS les surfaces en arrière-plan
    depthTest: true,   // Respecte l'occlusion normale si un objet opaque est devant
    alphaTest: 0.02    // Découpe matérielle GPU immédiate : les pixels vides du canvas (alpha < 0.02) sont jetés
  });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.renderOrder = 999; // Toujours rendu après les surfaces transparentes pour un fondu parfait
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
    if (idx + 2 < vertices.length) {
      pts.push(new THREE.Vector3(vertices[idx], vertices[idx + 1], vertices[idx + 2]));
    }
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

  // 1. Surface Réelle (Bleue) sur t in [-3.5, 15.0]
  realMesh = createTwoPassMeshGroup(data.real, matRealBack, matRealFront, matRealWire, 1, 7);
  scene.add(realMesh);

  // 2. Goutte Gelée Théorique (Rouge Rubis) sur t in [0.0, 15.0]
  if (data.theo) {
    theoMesh = new THREE.Group();
    const theoMain = createTwoPassMeshGroup(data.theo.main, matTheoBack, matTheoFront, matTheoWire, 2, 6);
    const theoBot = createTwoPassMeshGroup(data.theo.bot, matTheoBack, matTheoFront, matTheoWire, 2, 6);
    theoMesh.add(theoMain);
    theoMesh.add(theoBot);
    scene.add(theoMesh);
  }

  // 3. Surface Hamiltonienne G(x,y,t)=0 sur t in [0.0, 15.0]
  cupMesh = createTwoPassMeshGroup(data.hamilton.cup, matCupBack, matCupFront, matCupWire, 3, 5);
  scene.add(cupMesh);

  if (data.hamilton.exterior) {
    extMesh = createTwoPassMeshGroup(data.hamilton.exterior, matExtSmooth, matExtSmooth, matExtWire, 0, 0);
    scene.add(extMesh);
  }

  // 4. Ligne des centres (-sqrt(t), 0, t)
  buildCenterCurve();

  // 5. Ligne des selles (+sqrt(t), 0, t)
  buildSaddleCurve();

  // 6. Contours de section remarquables
  buildBoundaryCurves();

  // 7. Axes issus de (0,0,0)
  buildOriginAxes();

  // 8. Boîte 3D cylindrique noire + Graduations sur [-3.5, 15.0]
  buildDomainBox();

  // 9. Grille perspective au sol (t = -3.5)
  buildFloorGrid();

  // 10. Grille de flottaison / plan critique (t = 0.0)
  buildZeroGrid();

  // 11. Appliquer le mode de rendu par défaut ("both" = Mixte)
  updateRenderMode(currentRenderMode);
}

/**
 * Ligne des centres (-sqrt(t), 0, t) pour 0.0 <= t <= 26.0.
 */
function buildCenterCurve() {
  if (centerLineMesh) scene.remove(centerLineMesh);

  const tMax = (BOX_BOUNDS && BOX_BOUNDS.maxY) ? BOX_BOUNDS.maxY : 15.0;
  const tEnd = tMax; // Clamping au plafond net de la boîte (t = 15.0)
  const maxU = Math.sqrt(tEnd);
  const numPts = 240;
  const pts = [];

  for (let i = 0; i <= numPts; i++) {
    const u = (i / numPts) * maxU;
    const t = u * u;
    pts.push(new THREE.Vector3(-u, t, 0));
  }

  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const tubeGeom = new THREE.TubeGeometry(curve, 260, boundaryRadius, 14, false);

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
 * Ligne des selles (sqrt(t), 0, t) pour 0.0 <= t <= 15.0.
 */
function buildSaddleCurve() {
  if (saddleLineMesh) scene.remove(saddleLineMesh);

  const tMax = (BOX_BOUNDS && BOX_BOUNDS.maxY) ? BOX_BOUNDS.maxY : 15.0;
  const tEnd = tMax; // Clamping au plafond net de la boîte (t = 15.0)
  const maxU = Math.sqrt(tEnd);
  const numPts = 240;
  const pts = [];

  for (let i = 0; i <= numPts; i++) {
    const u = (i / numPts) * maxU;
    const t = u * u;
    pts.push(new THREE.Vector3(u, t, 0));
  }

  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const tubeGeom = new THREE.TubeGeometry(curve, 260, boundaryRadius, 14, false);

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
 * Contours de section : sommet t = 15.0, base t = -3.5, et plancher de bifurcation t = 0.0
 */
function buildBoundaryCurves() {
  const data = window.HAMILTON_DATA;
  if (!data) return;

  updateBoundaryMaterials();

  if (boundaryGroupTop) scene.remove(boundaryGroupTop);
  if (boundaryGroupBot) scene.remove(boundaryGroupBot);
  if (boundaryGroupZero) scene.remove(boundaryGroupZero);

  boundaryGroupTop = new THREE.Group();
  boundaryGroupBot = new THREE.Group();
  boundaryGroupZero = new THREE.Group();

  const nThetaCup = data.metadata.n_theta_cup || 200;
  const nFramesCup = data.metadata.n_frames_cup || 100;
  const nFramesReal = data.metadata.n_frames_real || 95;
  const nFramesExt = data.metadata.n_frames_ext || 160;
  const nPtsExt = data.metadata.n_pts_ext || 241;

  // ============================================================
  // A. PLAN SOMMET (t = t_max = 20)
  // ============================================================
  const topRealPts = extractPolylinePoints(data.real.vertices, (nFramesReal - 1) * 500, 500, 3);
  const meshTopReal = createSmoothTube(topRealPts, boundaryRadius, matBoundaryReal, 200, false);
  if (meshTopReal) {
    meshTopReal.name = "boundary-real";
    boundaryGroupTop.add(meshTopReal);
  }

  if (data.theo) {
    const nFramesTheo = data.metadata.n_frames_theo || 70;
    const nUMain = data.metadata.n_u_main_theo || 250;
    const nUBot = data.metadata.n_u_bot_theo || 120;

    const topTheoMainPts = extractPolylinePoints(data.theo.main.vertices, (nFramesTheo - 1) * nUMain, nUMain, 2);
    const meshTopTheoMain = createSmoothTube(topTheoMainPts, boundaryRadius, matBoundaryTheo, 160, false);
    if (meshTopTheoMain) {
      meshTopTheoMain.name = "boundary-theo";
      boundaryGroupTop.add(meshTopTheoMain);
    }

    const topTheoBotPts = extractPolylinePoints(data.theo.bot.vertices, (nFramesTheo - 1) * nUBot, nUBot, 2);
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

  const topCupPts = extractPolylinePoints(data.hamilton.cup.vertices, (nFramesCup - 1) * nThetaCup, nThetaCup, 1);
  const meshTopCup = createSmoothTube(topCupPts, boundaryRadius, matBoundaryHamilton, 180, true);
  if (meshTopCup) {
    meshTopCup.name = "boundary-cup";
    boundaryGroupTop.add(meshTopCup);
  }

  const topExtPts = extractPolylinePoints(data.hamilton.exterior.vertices, (nFramesExt - 1) * nPtsExt, nPtsExt, 1);
  const meshTopExt = createSmoothTube(topExtPts, boundaryRadius, matBoundaryHamilton, 200, false);
  if (meshTopExt) {
    meshTopExt.name = "boundary-ext";
    boundaryGroupTop.add(meshTopExt);
  }

  scene.add(boundaryGroupTop);

  // ============================================================
  // B. PLAN BASE (t = t_min = -3.5)
  // ============================================================
  // Seule la nappe réelle s'étend jusqu'à t = -3.5 !
  const botRealPts = extractPolylinePoints(data.real.vertices, 0, 500, 3);
  const meshBotReal = createSmoothTube(botRealPts, boundaryRadius, matBoundaryReal, 200, false);
  if (meshBotReal) {
    meshBotReal.name = "boundary-real";
    boundaryGroupBot.add(meshBotReal);
  }

  scene.add(boundaryGroupBot);

  // ============================================================
  // C. PLAN CRITIQUE (t = 0.0) : Coupe de passage
  // ============================================================
  // Recherche adaptative de la tranche la plus proche de t = 0.0
  let zeroFrameIdx = 0;
  let minDiffZero = 1e9;
  for (let f = 0; f < nFramesReal; f++) {
    const tVal = data.real.vertices[f * 500 * 3 + 1];
    if (Math.abs(tVal) < minDiffZero) {
      minDiffZero = Math.abs(tVal);
      zeroFrameIdx = f;
    }
  }
  const zeroRealPts = extractPolylinePoints(data.real.vertices, zeroFrameIdx * 500, 500, 3);
  const meshZeroReal = createSmoothTube(zeroRealPts, boundaryRadius * 0.9, matBoundaryReal, 200, false);
  if (meshZeroReal) {
    meshZeroReal.name = "boundary-zero";
    boundaryGroupZero.add(meshZeroReal);
  }
  scene.add(boundaryGroupZero);

  updateLayerVisibility();
}

/**
 * Axes (x, y, t) issus de l'origine (0, 0, 0)
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
  labelO.position.set(0, 0.4, -0.6);
  originAxesGroup.add(labelO);

  // 1. Axe +X : longueur 20.0
  const lenX = 20.0;
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

  // 2. Axe +T (Temps vertical vers le haut) : longueur 19.5 (t_max = 15.0 + 30%)
  const lenT = 19.5;
  const arrowT = createArrow3D(origin, new THREE.Vector3(0, 1, 0), lenT, boxRadius, matBoxBlack, 1.3, boxRadius * 3.0);
  originAxesGroup.add(arrowT);

  const labelT = createTextSprite("+t (temps)", "#050505", 30, 5.8, true);
  labelT.position.set(0, lenT + 2.0, 0);
  originAxesGroup.add(labelT);

  // Axe négatif -T (vers le bas jusqu'à t = -4.8)
  const lenNegT = 4.8;
  const negTGeom = new THREE.BufferGeometry().setFromPoints([origin, new THREE.Vector3(0, -lenNegT, 0)]);
  const negTLine = new THREE.Line(negTGeom, new THREE.LineDashedMaterial({ color: 0x050505, dashSize: 0.4, gapSize: 0.25, opacity: 0.60, transparent: true }));
  negTLine.computeLineDistances();
  originAxesGroup.add(negTLine);

  // 3. Axe +Y (Vitesse y vers -Z) : longueur 17.0
  const lenY = 17.0;
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
 * Boîte 3D cylindrique noire graduée sur [-3.5, 15.0]
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
  const xMajorTicks = [-6, -4, -2, 0, 2, 4, 6, 8, 10, 12];
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

  const xMinorTicks = [-7, -5, -3, -1, 1, 3, 5, 7, 9, 11];
  xMinorTicks.forEach(val => {
    if (val >= minX && val <= maxX) {
      const p1 = new THREE.Vector3(val, minY, maxZ);
      const p2 = new THREE.Vector3(val, minY, maxZ + 0.58);
      const tick = createCylinderEdge(p1, p2, boxRadius * 0.75, matTickBlack);
      boxDomainGroup.add(tick);
    }
  });

  // --- GRADUATIONS AXE T (Temps vertical, arête avant gauche : X=minX, Z=maxZ) ---
  const tMajorTicks = [-3, -2, -1, 0, 2, 4, 6, 8, 10, 12, 14];
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

  const tMinorTicks = [-3.5, -2.5, -1.5, -0.5, 1, 3, 5, 7, 9, 11, 13, 15];
  tMinorTicks.forEach(val => {
    if (val >= minY && val <= maxY) {
      const p1 = new THREE.Vector3(minX, val, maxZ);
      const p2 = new THREE.Vector3(minX - 0.58, val, maxZ);
      const tick = createCylinderEdge(p1, p2, boxRadius * 0.75, matTickBlack);
      boxDomainGroup.add(tick);
    }
  });

  // --- GRADUATIONS AXE Y (Vitesse, arête basse droite : X=maxX, Y=minY) ---
  const yMajorTicks = [-30, -25, -20, -15, -10, -5, 0, 5, 10];
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

  const yMinorTicks = [-28, -22, -18, -12, -8, -2, 3, 8, 13];
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
 * Grille perspective au sol (t = -3.5)
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

  [-30, -25, -20, -15, -10, -5, 0, 5, 10].forEach(yVal => {
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

/**
 * NOUVEAU : Grille du plan critique t = 0.0 (Bifurcation / Flottaison)
 */
function buildZeroGrid() {
  if (zeroGridGroup) scene.remove(zeroGridGroup);
  zeroGridGroup = new THREE.Group();

  const { minX, maxX, minZ, maxZ } = BOX_BOUNDS;
  const gridMat = new THREE.LineDashedMaterial({
    color: 0x0284c7, // Cyan dense
    dashSize: 0.8,
    gapSize: 0.5,
    transparent: true,
    opacity: 0.45
  });

  [-6, -4, -2, 0, 2, 4, 6, 8, 10].forEach(xVal => {
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(xVal, 0.0, minZ),
      new THREE.Vector3(xVal, 0.0, maxZ)
    ]);
    const line = new THREE.Line(geom, gridMat);
    line.computeLineDistances();
    zeroGridGroup.add(line);
  });

  [-20, -15, -10, -5, 0, 5, 10].forEach(yVal => {
    const zVal = -yVal;
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(minX, 0.0, zVal),
      new THREE.Vector3(maxX, 0.0, zVal)
    ]);
    const line = new THREE.Line(geom, gridMat);
    line.computeLineDistances();
    zeroGridGroup.add(line);
  });

  scene.add(zeroGridGroup);
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
  const toggleZeroBoundary = document.getElementById("toggle-boundary-zero");
  const showTop = toggleTop ? toggleTop.checked : true;
  const showBot = toggleBot ? toggleBot.checked : true;
  const showZeroBoundary = toggleZeroBoundary ? toggleZeroBoundary.checked : true;

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
    if (botReal) botReal.visible = showReal;
  }

  if (boundaryGroupZero) {
    boundaryGroupZero.visible = showZeroBoundary;
  }
}

function setupUI() {
  // 1. Couches 3D
  ["toggle-real", "toggle-theo", "toggle-hamilton-cup", "toggle-hamilton-ext", "toggle-center", "toggle-saddle"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", updateLayerVisibility);
  });

  // 2. Contours
  ["toggle-boundary-top", "toggle-boundary-bot", "toggle-boundary-zero"].forEach(id => {
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

  const toggleZero = document.getElementById("toggle-zero-grid");
  if (toggleZero) {
    toggleZero.addEventListener("change", () => {
      if (zeroGridGroup) zeroGridGroup.visible = toggleZero.checked;
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
      a.download = "Painleve1_Separatrice_Extended_Minus35_15_3D.png";
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
      const dist = 65;

      if (camType === "perspective") {
        camera.up.set(0, 1, 0);
        camera.position.set(-46, 42, 68);
      } else if (camType === "diag") {
        camera.up.set(0, 1, 0);
        camera.position.set(40, 36, 65);
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

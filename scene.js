/* ProStudio — scroll-driven 3D studio
 * A procedural film set: cinema camera on a tripod filming a DNA set,
 * softbox lights, crew cases, and an editing desk whose monitor shows a
 * live feed from the cinema camera inside an editing UI.
 */
(function () {
  "use strict";

  const body = document.body;
  const loader = document.getElementById("loader");
  const loaderBar = document.getElementById("loaderBar");
  const finishLoading = () => {
    if (loaderBar) loaderBar.style.width = "100%";
    setTimeout(() => loader && loader.classList.add("done"), 350);
  };
  if (loaderBar) loaderBar.style.width = "35%";

  const canvas = document.getElementById("scene3d");
  const stage = document.getElementById("stage");
  if (!canvas || !stage) return finishLoading();

  let renderer;
  try {
    if (typeof THREE === "undefined") throw new Error("three missing");
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  } catch (e) {
    body.classList.add("no-webgl");
    setupPanelsOnly();
    return finishLoading();
  }

  const isMobile = matchMedia("(max-width: 760px)").matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 1.75));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const BG = 0x120d08;
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.FogExp2(BG, 0.075);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 60);

  /* ---------- Environment (soft studio reflections) ---------- */
  (function buildEnv() {
    const env = new THREE.Scene();
    const room = new THREE.Mesh(
      new THREE.BoxGeometry(10, 6, 10),
      new THREE.MeshBasicMaterial({ color: 0x140f0a, side: THREE.BackSide })
    );
    env.add(room);
    const panel = (c, x, y, z, w, h, ry) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
      m.position.set(x, y, z);
      m.rotation.y = ry || 0;
      env.add(m);
    };
    panel(0xffffff, 0, 2.8, 0, 4, 1.2); // top
    env.children[env.children.length - 1].rotation.x = Math.PI / 2;
    panel(0xffb27a, -4.9, 1, 0, 3, 2, Math.PI / 2);
    panel(0xffd2a0, 4.9, 1, 0, 3, 2, -Math.PI / 2);
    panel(0xffe6cc, 0, 1, -4.9, 4, 1.5, 0);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(env, 0.04).texture;
  })();

  /* ---------- Materials ---------- */
  const M = {
    body: new THREE.MeshStandardMaterial({ color: 0x1b1e24, metalness: 0.75, roughness: 0.38 }),
    black: new THREE.MeshStandardMaterial({ color: 0x0b0c0f, metalness: 0.45, roughness: 0.55 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x101113, metalness: 0, roughness: 0.92 }),
    alu: new THREE.MeshStandardMaterial({ color: 0x8a919c, metalness: 0.9, roughness: 0.28 }),
    teal: new THREE.MeshStandardMaterial({ color: 0xf16619, metalness: 0.6, roughness: 0.3 }),
    red: new THREE.MeshStandardMaterial({ color: 0xc81e3a, metalness: 0.4, roughness: 0.4 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x24160a, metalness: 0.1, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 2.5, emissive: 0x1c0d03 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x6e4b2c, metalness: 0.2, roughness: 0.6 }),
    fabric: new THREE.MeshStandardMaterial({ color: 0x0f1012, roughness: 1 }),
    case: new THREE.MeshStandardMaterial({ color: 0x23272e, metalness: 0.35, roughness: 0.6 }),
    glow: (c, i) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i || 2, toneMapped: false }),
  };

  /* ---------- Helpers ---------- */
  const UP = new THREE.Vector3(0, 1, 0);
  function add(parent, mesh, x, y, z) {
    mesh.position.set(x || 0, y || 0, z || 0);
    parent.add(mesh);
    return mesh;
  }
  function box(parent, w, h, d, mat, x, y, z) {
    return add(parent, new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), x, y, z);
  }
  function cyl(parent, rt, rb, h, mat, x, y, z, seg) {
    return add(parent, new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 32), mat), x, y, z);
  }
  // cylinder oriented along Z (lens axis)
  function cylZ(parent, r, h, mat, z, seg) {
    const m = cyl(parent, r, r, h, mat, 0, 0, z, seg);
    m.rotation.x = Math.PI / 2;
    return m;
  }
  function between(parent, a, b, r, mat) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), mat);
    m.position.copy(a).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(UP, dir.normalize());
    parent.add(m);
    return m;
  }
  function canvasTex(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 4;
    return { c, ctx: c.getContext("2d"), t };
  }

  /* ---------- Floor, wall, neon sign ---------- */
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x17110b, metalness: 0.35, roughness: 0.42 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const grid = new THREE.GridHelper(40, 80, 0xf16619, 0xf16619);
  grid.material.transparent = true;
  grid.material.opacity = 0.06;
  grid.position.y = 0.002;
  scene.add(grid);

  const wall = new THREE.Mesh(new THREE.PlaneGeometry(16, 6), new THREE.MeshStandardMaterial({ color: 0x1c140c, roughness: 0.9 }));
  wall.position.set(0.5, 3, -4.2);
  wall.receiveShadow = true;
  scene.add(wall);

  // Neon sign
  (function sign() {
    const s = canvasTex(1024, 256);
    const g = s.ctx;
    g.clearRect(0, 0, 1024, 256);
    g.font = "900 118px Cairo, Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.shadowColor = "#F16619";
    g.shadowBlur = 30;
    g.fillStyle = "#ffe3cf";
    g.fillText("PRO", 335, 130);
    g.shadowColor = "#778A3F";
    g.fillStyle = "#f1f5dc";
    g.fillText("STUDIO", 700, 130);
    // red medical cross
    g.shadowColor = "#ff2d55";
    g.fillStyle = "#ffd6df";
    g.fillRect(70, 105, 110, 40);
    g.fillRect(105, 70, 40, 110);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: s.t, transparent: true, toneMapped: false, depthWrite: false }));
    m.position.set(0.3, 3.2, -4.15);
    scene.add(m);
    const l = new THREE.PointLight(0xf58a4b, 1.2, 5, 2);
    l.position.set(0.3, 3.1, -3.6);
    scene.add(l);
    // vertical LED strips
    [-4.5].forEach((x) => {
      const strip = box(scene, 0.05, 3.6, 0.05, M.glow(0x778a3f, 1.6), x, 1.9, -4.1);
      strip.castShadow = false;
    });
  })();

  /* ---------- DNA set (what the camera films) ---------- */
  const DNA_POS = new THREE.Vector3(0, 0, -2);
  const dnaGroup = new THREE.Group();
  dnaGroup.position.copy(DNA_POS);
  scene.add(dnaGroup);
  cyl(dnaGroup, 0.42, 0.48, 0.5, M.black, 0, 0.25, 0, 48);
  const topRing = add(dnaGroup, new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.012, 8, 64), M.glow(0xf16619, 2.2)), 0, 0.505, 0);
  topRing.rotation.x = Math.PI / 2;
  cyl(dnaGroup, 0.39, 0.39, 0.012, new THREE.MeshStandardMaterial({ color: 0x2a1c10, metalness: 0.8, roughness: 0.2 }), 0, 0.5, 0, 48);
  const helix = new THREE.Group();
  dnaGroup.add(helix);
  {
    const N = 34;
    const sphereG = new THREE.SphereGeometry(0.045, 20, 14);
    const mA = new THREE.MeshPhysicalMaterial({ color: 0xf16619, emissive: 0x6b2a08, metalness: 0.2, roughness: 0.15, clearcoat: 1 });
    const mB = new THREE.MeshPhysicalMaterial({ color: 0x778a3f, emissive: 0x2f3a14, metalness: 0.2, roughness: 0.15, clearcoat: 1 });
    const rungMats = [M.glow(0xf43f5e, 1.2), M.glow(0xffd2a0, 1.1), M.glow(0x9bb052, 1.2), M.glow(0x9bb052, 1.1)];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const y = 0.72 + t * 1.45;
      const a = t * Math.PI * 4.2;
      const r = 0.24;
      const p1 = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
      const p2 = new THREE.Vector3(-Math.cos(a) * r, y, -Math.sin(a) * r);
      add(helix, new THREE.Mesh(sphereG, mA), p1.x, p1.y, p1.z);
      add(helix, new THREE.Mesh(sphereG, mB), p2.x, p2.y, p2.z);
      if (i % 2 === 0) between(helix, p1, p2, 0.012, rungMats[(i / 2) % 4]);
    }
  }
  const holoRings = [];
  [0.9, 1.45, 2.0].forEach((y, i) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.46 + i * 0.04, 0.006, 8, 96),
      new THREE.MeshBasicMaterial({ color: 0xffa86b, transparent: true, opacity: 0.5, toneMapped: false })
    );
    ring.position.y = y;
    ring.rotation.x = Math.PI / 2;
    dnaGroup.add(ring);
    holoRings.push(ring);
  });
  const dnaLight = new THREE.PointLight(0xf58a4b, 1.6, 4, 2);
  dnaLight.position.set(0, 1.5, 0.4);
  dnaGroup.add(dnaLight);

  // Floating ECG line above the set
  const ecgPoints = 160;
  const ecgGeo = new THREE.BufferGeometry();
  ecgGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(ecgPoints * 3), 3));
  const ecgLine = new THREE.Line(ecgGeo, new THREE.LineBasicMaterial({ color: 0xffa86b, transparent: true, opacity: 0.9, toneMapped: false }));
  ecgLine.position.set(0, 2.55, -2.3);
  scene.add(ecgLine);
  function ecgShape(x) {
    const p = ((x % 1) + 1) % 1;
    if (p < 0.38) return 0;
    if (p < 0.42) return Math.sin((p - 0.38) / 0.04 * Math.PI) * 0.04;
    if (p < 0.45) return 0;
    if (p < 0.47) return -0.05;
    if (p < 0.5) return 0.32;
    if (p < 0.53) return -0.12;
    if (p < 0.6) return 0;
    if (p < 0.68) return Math.sin((p - 0.6) / 0.08 * Math.PI) * 0.07;
    return 0;
  }

  /* ---------- Cinema camera ---------- */
  const CAM_POS = new THREE.Vector3(-1.6, 1.36, 0.6);
  const rig = new THREE.Group(); // pans/tilts
  rig.position.copy(CAM_POS);
  scene.add(rig);
  const cine = new THREE.Group();
  rig.add(cine);
  {
    // body
    box(cine, 0.16, 0.17, 0.27, M.body, 0, 0, 0);
    box(cine, 0.165, 0.12, 0.2, M.black, 0, -0.005, -0.01); // side plates
    // fan grill (operator side)
    for (let i = 0; i < 7; i++) box(cine, 0.004, 0.08, 0.006, M.black, 0.084, 0, -0.08 + i * 0.016);
    // buttons
    [[0.03, 0.03], [0.05, 0.03], [0.07, 0.03]].forEach(([z, y]) => cyl(cine, 0.007, 0.007, 0.006, M.alu, -0.084, y, z, 12).rotation.z = Math.PI / 2);
    // top plate + handle
    box(cine, 0.12, 0.012, 0.22, M.black, 0, 0.091, 0);
    box(cine, 0.02, 0.05, 0.02, M.black, 0, 0.12, 0.08);
    box(cine, 0.02, 0.05, 0.02, M.black, 0, 0.12, -0.06);
    box(cine, 0.03, 0.025, 0.2, M.rubber, 0, 0.155, 0.01);
    // shotgun mic
    const micG = new THREE.Group();
    micG.position.set(0.04, 0.2, 0.06);
    cine.add(micG);
    cylZ(micG, 0.013, 0.2, M.alu, 0.03);
    cylZ(micG, 0.02, 0.09, M.fabric, 0.1);
    // mount / PL
    cylZ(cine, 0.062, 0.03, M.alu, 0.15);
    // lens
    const lens = new THREE.Group();
    lens.position.z = 0.165;
    cine.add(lens);
    cylZ(lens, 0.05, 0.2, M.black, 0.1);
    for (let i = 0; i < 3; i++) {
      // focus/iris/zoom rings with gears
      cylZ(lens, 0.056, 0.03, M.rubber, 0.04 + i * 0.055, 40);
      cylZ(lens, 0.054, 0.004, M.teal, 0.058 + i * 0.055, 40);
    }
    cylZ(lens, 0.062, 0.05, M.black, 0.215);
    const front = cylZ(lens, 0.05, 0.004, M.glass, 0.241, 48);
    front.material = M.glass;
    // matte box
    const mb = new THREE.Group();
    mb.position.z = 0.29;
    lens.add(mb);
    box(mb, 0.22, 0.008, 0.09, M.black, 0, 0.075, 0);
    box(mb, 0.22, 0.008, 0.09, M.black, 0, -0.075, 0);
    box(mb, 0.008, 0.15, 0.09, M.black, 0.11, 0, 0);
    box(mb, 0.008, 0.15, 0.09, M.black, -0.11, 0, 0);
    box(mb, 0.2, 0.02, 0.008, M.black, 0, 0.07, -0.04);
    // rails
    [-0.035, 0.035].forEach((x) => {
      const r = cylZ(cine, 0.008, 0.55, M.alu, 0.09);
      r.position.set(x, -0.105, 0.09);
    });
    box(cine, 0.12, 0.03, 0.06, M.black, 0, -0.105, 0.25); // rail bridge
    // follow focus wheel
    const ff = cyl(cine, 0.028, 0.028, 0.012, M.black, -0.07, -0.06, 0.24, 24);
    ff.rotation.z = Math.PI / 2;
    // battery (V-mount) with LEDs
    box(cine, 0.13, 0.13, 0.05, M.case, 0, -0.01, -0.165);
    for (let i = 0; i < 4; i++) box(cine, 0.012, 0.006, 0.004, M.glow(0x9bb052, 2.5), -0.03 + i * 0.02, 0.04, -0.192);
    // tally / REC light
    const tally = add(cine, new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 10), M.glow(0xff2d55, 4)), 0.05, 0.075, 0.137);
    cine.userData.tally = tally;
    // tripod head
    box(cine, 0.11, 0.05, 0.1, M.black, 0, -0.145, 0);
    cyl(cine, 0.06, 0.07, 0.06, M.black, 0, -0.2, 0, 24);
    // pan bar
    between(cine, new THREE.Vector3(-0.04, -0.15, -0.04), new THREE.Vector3(-0.2, -0.28, -0.42), 0.011, M.alu);
    add(cine, new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.1, 16), M.rubber), -0.2, -0.28, -0.42).rotation.x = 1.1;
  }
  // side monitor (live feed) — arm + screen facing operator
  const sideMon = new THREE.Group();
  sideMon.position.set(-0.13, 0.12, -0.02);
  sideMon.rotation.set(-0.1, Math.PI - 0.5, 0);
  cine.add(sideMon);
  between(cine, new THREE.Vector3(-0.07, 0.09, 0.0), new THREE.Vector3(-0.12, 0.11, -0.02), 0.006, M.alu);
  box(sideMon, 0.17, 0.105, 0.018, M.black, 0, 0, -0.01);
  box(sideMon, 0.17, 0.03, 0.04, M.black, 0, 0.065, 0.005); // sun hood top

  // Tripod
  const tripod = new THREE.Group();
  tripod.position.set(CAM_POS.x, 0, CAM_POS.z);
  scene.add(tripod);
  {
    const top = new THREE.Vector3(0, CAM_POS.y - 0.23, 0);
    cyl(tripod, 0.05, 0.05, 0.05, M.black, 0, top.y, 0);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.3;
      const foot = new THREE.Vector3(Math.cos(a) * 0.55, 0.02, Math.sin(a) * 0.55);
      const mid = new THREE.Vector3().lerpVectors(top, foot, 0.55);
      between(tripod, top, mid, 0.017, M.black);
      between(tripod, mid, foot, 0.012, M.alu);
      add(tripod, new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), M.rubber), foot.x, 0.02, foot.z);
      between(tripod, new THREE.Vector3(0, 0.25, 0), new THREE.Vector3(Math.cos(a) * 0.4, 0.06, Math.sin(a) * 0.4), 0.006, M.alu);
    }
    cyl(tripod, 0.015, 0.015, top.y - 0.25, M.alu, 0, 0.25 + (top.y - 0.25) / 2, 0, 12);
  }

  /* ---------- Softbox lights ---------- */
  const softLights = [];
  function softbox(x, z, h, tint) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    scene.add(g);
    // stand
    cyl(g, 0.014, 0.018, h, M.black, 0, h / 2, 0, 12);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      between(g, new THREE.Vector3(0, 0.35, 0), new THREE.Vector3(Math.cos(a) * 0.38, 0.01, Math.sin(a) * 0.38), 0.01, M.black);
    }
    // head aimed at DNA
    const head = new THREE.Group();
    head.position.set(0, h, 0);
    g.add(head);
    const target = new THREE.Vector3(DNA_POS.x, 1.35, DNA_POS.z);
    head.lookAt(target);
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.08, 0.42, 4, 1, true), new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.85, side: THREE.DoubleSide }));
    shell.rotation.x = Math.PI / 2;
    shell.rotation.y = Math.PI / 4;
    shell.position.z = 0.15;
    head.add(shell);
    const diff = new THREE.Mesh(new THREE.PlaneGeometry(0.59, 0.59), new THREE.MeshBasicMaterial({ color: tint, toneMapped: false, side: THREE.DoubleSide }));
    diff.position.z = 0.36;
    head.add(diff);
    box(head, 0.12, 0.12, 0.12, M.black, 0, 0, -0.1);
    const spot = new THREE.SpotLight(tint, 2.4, 9, 0.75, 0.6, 1.4);
    spot.position.copy(g.position).add(new THREE.Vector3(0, h, 0));
    spot.target.position.copy(target);
    scene.add(spot, spot.target);
    softLights.push(spot);
    return { g, spot, diff };
  }
  const keyLight = softbox(-2.4, -1.3, 1.95, 0xfff1de);
  keyLight.spot.castShadow = true;
  keyLight.spot.shadow.mapSize.set(isMobile ? 512 : 1024, isMobile ? 512 : 1024);
  keyLight.spot.shadow.bias = -0.0008;
  softbox(1.45, -0.9, 1.75, 0xfff0dc);

  // LED panel on C-stand (rim light)
  {
    const g = new THREE.Group();
    g.position.set(-0.6, 0, -3.1);
    scene.add(g);
    cyl(g, 0.012, 0.016, 1.6, M.alu, 0, 0.8, 0, 10);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      between(g, new THREE.Vector3(0, 0.3, 0), new THREE.Vector3(Math.cos(a) * 0.32, 0.01, Math.sin(a) * 0.32), 0.009, M.alu);
    }
    const p = new THREE.Group();
    p.position.y = 1.65;
    p.lookAt(new THREE.Vector3(0.6, 1.3, 1.1));
    g.add(p);
    box(p, 0.36, 0.24, 0.04, M.black, 0, 0, 0);
    add(p, new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.2), new THREE.MeshBasicMaterial({ color: 0xffe0bd, toneMapped: false })), 0, 0, 0.021);
    const rim = new THREE.SpotLight(0xa3b05f, 1.8, 6, 0.8, 0.7, 1.5);
    rim.position.set(-0.6, 1.65, -3.1);
    rim.target.position.set(0, 1.3, -2);
    scene.add(rim, rim.target);
  }

  // Crew flight cases
  function flightCase(x, y, z, w, h, d, ry) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry;
    scene.add(g);
    box(g, w, h, d, M.case, 0, h / 2, 0);
    // edges
    [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => box(g, 0.025, h + 0.004, 0.025, M.alu, (sx * w) / 2, h / 2, (sz * d) / 2)));
    box(g, w + 0.01, 0.02, d + 0.01, M.alu, 0, h * 0.62, 0);
    [-w / 4, w / 4].forEach((lx) => box(g, 0.05, 0.03, 0.012, M.teal, lx, h * 0.62, d / 2 + 0.01));
    box(g, 0.16, 0.018, 0.03, M.black, 0, h + 0.01, 0);
    return g;
  }
  flightCase(-2.9, 0, 0.9, 0.7, 0.38, 0.45, 0.35);
  flightCase(-2.9, 0.38, 0.9, 0.55, 0.26, 0.36, 0.5);
  flightCase(-0.6, 0, 2.0, 0.5, 0.3, 0.32, -0.4);

  /* ---------- Editing desk ---------- */
  const DESK = new THREE.Vector3(3.0, 0, 0.8);
  const desk = new THREE.Group();
  desk.position.copy(DESK);
  scene.add(desk);
  box(desk, 1.7, 0.05, 0.8, M.wood, 0, 0.75, 0);
  box(desk, 1.7, 0.012, 0.8, M.glow(0xf16619, 0.6), 0, 0.72, 0).scale.set(0.98, 1, 0.96); // underglow
  box(desk, 0.05, 0.72, 0.72, M.black, -0.8, 0.36, 0);
  box(desk, 0.05, 0.72, 0.72, M.black, 0.8, 0.36, 0);
  box(desk, 1.55, 0.3, 0.02, M.black, 0, 0.5, -0.36);

  // Main monitor (ultrawide)
  const SW = 0.96, SH = 0.42;
  const mon = new THREE.Group();
  mon.position.set(0, 1.2, -0.24);
  desk.add(mon);
  box(mon, SW + 0.03, SH + 0.03, 0.03, M.black, 0, 0, -0.016);
  box(desk, 0.06, 0.34, 0.03, M.alu, 0, 0.95, -0.28);
  box(desk, 0.3, 0.012, 0.2, M.alu, 0, 0.782, -0.24);
  const ui = canvasTex(1152, 504);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshBasicMaterial({ map: ui.t, toneMapped: false }));
  screen.position.z = 0.001;
  mon.add(screen);
  const monGlow = new THREE.PointLight(0xffd2a0, 0.9, 2.2, 2);
  monGlow.position.set(0, 1.15, 0.2);
  desk.add(monGlow);

  // Second monitor (scopes), angled
  const mon2 = new THREE.Group();
  mon2.position.set(0.72, 1.12, -0.12);
  mon2.rotation.y = -0.55;
  desk.add(mon2);
  box(mon2, 0.5, 0.3, 0.025, M.black, 0, 0, -0.014);
  box(desk, 0.04, 0.3, 0.03, M.alu, 0.74, 0.93, -0.16);
  const sc = canvasTex(512, 300);
  const screen2 = new THREE.Mesh(new THREE.PlaneGeometry(0.47, 0.275), new THREE.MeshBasicMaterial({ map: sc.t, toneMapped: false }));
  screen2.position.z = 0.001;
  mon2.add(screen2);

  // Keyboard with glowing keys (instanced)
  box(desk, 0.46, 0.018, 0.15, M.black, -0.05, 0.785, 0.12);
  {
    const keyG = new THREE.BoxGeometry(0.022, 0.01, 0.022);
    const keys = new THREE.InstancedMesh(keyG, new THREE.MeshStandardMaterial({ color: 0x1c1f26, emissive: 0x5a2408, metalness: 0.3, roughness: 0.5 }), 17 * 5);
    const mtx = new THREE.Matrix4();
    let k = 0;
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 17; c++) {
        mtx.makeTranslation(-0.05 - 0.2 + c * 0.025, 0.8, 0.07 + r * 0.025);
        keys.setMatrixAt(k++, mtx);
      }
    desk.add(keys);
  }
  // mouse
  const mouse = add(desk, new THREE.Mesh(new THREE.SphereGeometry(0.035, 20, 12), M.black), 0.32, 0.79, 0.14);
  mouse.scale.set(0.8, 0.35, 1.2);
  box(desk, 0.003, 0.004, 0.02, M.glow(0xf16619, 3), 0.32, 0.803, 0.12);
  // jog-wheel edit controller
  box(desk, 0.24, 0.03, 0.15, M.case, -0.55, 0.79, 0.12);
  cyl(desk, 0.05, 0.05, 0.02, M.alu, -0.55, 0.815, 0.13, 40);
  cyl(desk, 0.01, 0.01, 0.022, M.glow(0xf43f5e, 2), -0.52, 0.818, 0.11, 12);
  for (let i = 0; i < 6; i++) box(desk, 0.018, 0.008, 0.018, M.glow(i < 2 ? 0x9bb052 : 0x778a3f, 1.5), -0.65 + (i % 3) * 0.025, 0.81, 0.07 + Math.floor(i / 3) * 0.025);
  // speakers
  [-0.62, 0.42].forEach((x) => {
    box(desk, 0.13, 0.22, 0.16, M.black, x === 0.42 ? 0.48 : x, 0.885, -0.25);
  });
  [[-0.62, 0.92], [-0.62, 0.83]].forEach(([x, y], i) => {
    const c = cyl(desk, i ? 0.045 : 0.025, i ? 0.045 : 0.025, 0.01, M.alu, x, y, -0.165, 24);
    c.rotation.x = Math.PI / 2;
  });
  // headphones on stand
  cyl(desk, 0.008, 0.008, 0.28, M.alu, -0.78, 0.92, 0.05, 10);
  {
    const hp = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 8, 24, Math.PI), M.black);
    hp.position.set(-0.78, 1.0, 0.05);
    hp.rotation.y = Math.PI / 2;
    desk.add(hp);
    [-0.07, 0.07].forEach((z) => {
      const cup = cyl(desk, 0.035, 0.035, 0.025, M.black, -0.78, 1.0, 0.05 + z, 20);
      cup.rotation.x = Math.PI / 2;
    });
  }
  // PC tower with RGB fans
  const tower = new THREE.Group();
  tower.position.set(1.05, 0, -0.05);
  desk.add(tower);
  box(tower, 0.24, 0.5, 0.46, M.black, 0, 0.25, 0);
  const sideGlass = add(tower, new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.44), new THREE.MeshPhysicalMaterial({ color: 0x1f150c, transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0 })), -0.121, 0.25, 0);
  sideGlass.rotation.y = -Math.PI / 2;
  const fans = [];
  [0.36, 0.14].forEach((y, i) => {
    const f = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 8, 32), M.glow(i ? 0x778a3f : 0xf16619, 3));
    f.position.set(0, y, 0.232);
    tower.add(f);
    fans.push(f);
  });
  box(tower, 0.005, 0.4, 0.005, M.glow(0x9bb052, 2.5), -0.11, 0.25, 0.2);
  // chair
  {
    const ch = new THREE.Group();
    ch.position.set(DESK.x - 0.1, 0, DESK.z + 0.75);
    ch.rotation.y = 0.25;
    scene.add(ch);
    box(ch, 0.5, 0.08, 0.48, M.fabric, 0, 0.5, 0);
    box(ch, 0.48, 0.62, 0.07, M.fabric, 0, 0.86, 0.24).rotation.x = -0.12;
    box(ch, 0.36, 0.06, 0.02, M.teal, 0, 1.08, 0.28);
    cyl(ch, 0.025, 0.025, 0.38, M.alu, 0, 0.27, 0, 12);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      between(ch, new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(Math.cos(a) * 0.3, 0.04, Math.sin(a) * 0.3), 0.014, M.black);
    }
  }

  /* ---------- Live feed from the cinema camera ---------- */
  const feedRT = new THREE.WebGLRenderTarget(isMobile ? 320 : 512, isMobile ? 180 : 288);
  feedRT.texture.encoding = THREE.sRGBEncoding;
  const feedCam = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 30);
  const feedMat = new THREE.MeshBasicMaterial({ map: feedRT.texture, toneMapped: false });
  add(sideMon, new THREE.Mesh(new THREE.PlaneGeometry(0.155, 0.087), feedMat), 0, 0, 0.0);
  // viewer region in editing UI (canvas px → plane coords)
  const UIW = 1152, UIH = 504;
  const VX = 330, VY = 40, VW = 448, VH = 252;
  const viewer = new THREE.Mesh(new THREE.PlaneGeometry((VW / UIW) * SW, (VH / UIH) * SH), feedMat);
  viewer.position.set(((VX + VW / 2) / UIW - 0.5) * SW, (0.5 - (VY + VH / 2) / UIH) * SH, 0.002);
  mon.add(viewer);

  /* ---------- Dust particles ---------- */
  const dustN = isMobile ? 260 : 520;
  const dustPos = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 9;
    dustPos[i * 3 + 1] = Math.random() * 3.6;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 8 - 0.5;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dot = canvasTex(64, 64);
  {
    const gr = dot.ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    dot.ctx.fillStyle = gr;
    dot.ctx.fillRect(0, 0, 64, 64);
  }
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.03, map: dot.t, color: 0xffe2c4, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust);

  /* ---------- Ambient light ---------- */
  scene.add(new THREE.HemisphereLight(0xffcf9e, 0x0f0a06, 0.35));
  const camFill = new THREE.PointLight(0xffeedd, 0.9, 3, 2);
  camFill.position.set(-0.7, 1.9, -0.1);
  scene.add(camFill);
  const camRim = new THREE.PointLight(0xf58a4b, 0.8, 2.5, 2);
  camRim.position.set(-2.4, 1.7, 0.9);
  scene.add(camRim);
  const deskKey = new THREE.SpotLight(0xffffff, 0.9, 6, 0.6, 0.8, 1.5);
  deskKey.position.set(DESK.x - 0.6, 3, DESK.z + 1.6);
  deskKey.target.position.copy(DESK).add(new THREE.Vector3(0, 0.9, -0.2));
  scene.add(deskKey, deskKey.target);

  scene.traverse((o) => {
    if (o.isMesh && o !== floor && o !== wall) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  screen.castShadow = screen2.castShadow = viewer.castShadow = false;

  // Aim cinema camera at the DNA
  const aimTarget = new THREE.Vector3(DNA_POS.x, 1.38, DNA_POS.z);
  rig.lookAt(aimTarget);

  /* ---------- Editing UI drawing ---------- */
  const clips = [
    // track, start, len, color, label
    [0, 0.08, 0.16, "#6E4B2C", "Motion: Heart"],
    [0, 0.55, 0.2, "#6E4B2C", "Logo Reveal"],
    [1, 0.0, 0.22, "#778A3F", "Intro_4K"],
    [1, 0.22, 0.3, "#F16619", "Dr_Interview_A"],
    [1, 0.52, 0.18, "#778A3F", "B-Roll_Clinic"],
    [1, 0.7, 0.3, "#F16619", "Dr_Interview_B"],
    [2, 0.05, 0.9, "#f59e0b", "كابشن عربي"],
  ];
  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function tc(sec) {
    const f = Math.floor((sec % 1) * 25);
    const s = Math.floor(sec) % 60;
    const m = Math.floor(sec / 60) % 60;
    const p = (n) => String(n).padStart(2, "0");
    return `00:${p(m)}:${p(s)}:${p(f)}`;
  }
  function drawUI(t) {
    const g = ui.ctx;
    g.fillStyle = "#120d09";
    g.fillRect(0, 0, UIW, UIH);
    // top bar
    g.fillStyle = "#1c150f";
    g.fillRect(0, 0, UIW, 26);
    g.font = "600 13px Arial, sans-serif";
    g.textBaseline = "middle";
    g.fillStyle = "#a8957f";
    ["File", "Edit", "Clip", "Sequence", "Color", "Audio", "Graphics", "Export"].forEach((s, i) => g.fillText(s, 14 + i * 66, 13));
    g.fillStyle = "#ffa86b";
    g.fillText("ProStudio — Medical_Promo.prproj", 620, 13);
    for (let i = 0; i < 3; i++) {
      g.fillStyle = ["#ff5f57", "#febc2e", "#28c840"][i];
      g.beginPath();
      g.arc(UIW - 60 + i * 18, 13, 5, 0, 7);
      g.fill();
    }
    // media bin
    g.fillStyle = "#18120c";
    g.fillRect(6, 34, 312, 266);
    g.fillStyle = "#e8dccb";
    g.font = "700 13px Arial";
    g.fillText("Media Bin", 16, 48);
    const thumbs = [["#778A3F", "Surgery_A"], ["#F16619", "Interview"], ["#6E4B2C", "Heart_3D"], ["#b8501a", "Clinic_Tour"], ["#f59e0b", "Logo"], ["#778A3F", "Dental_BR"]];
    thumbs.forEach(([c, n], i) => {
      const x = 16 + (i % 3) * 100, y = 64 + Math.floor(i / 3) * 110;
      const gr = g.createLinearGradient(x, y, x + 90, y + 60);
      gr.addColorStop(0, c);
      gr.addColorStop(1, "#140e09");
      g.fillStyle = gr;
      roundRect(g, x, y, 90, 60, 6);
      g.fill();
      g.fillStyle = "#bca993";
      g.font = "12px Arial";
      g.fillText(n + ".mp4", x, y + 76);
      if ((Math.floor(t * 0.8) % 6) === i) {
        g.strokeStyle = "#ffa86b";
        g.lineWidth = 2;
        roundRect(g, x - 2, y - 2, 94, 64, 7);
        g.stroke();
      }
    });
    // viewer frame
    g.fillStyle = "#000";
    g.fillRect(VX - 4, VY - 4, VW + 8, VH + 8);
    g.fillStyle = "#e8dccb";
    g.font = "600 13px monospace";
    g.fillText(tc(t), VX, VY + VH + 20);
    g.fillStyle = "#8a7864";
    g.fillText("3840 × 2160  ·  25 fps", VX + 250, VY + VH + 20);
    // transport icons
    g.fillStyle = "#f3e9dc";
    g.beginPath();
    const cx = VX + VW / 2;
    g.moveTo(cx - 6, VY + VH + 12);
    g.lineTo(cx + 8, VY + VH + 20);
    g.lineTo(cx - 6, VY + VH + 28);
    g.fill();
    // color panel
    const px = 800;
    g.fillStyle = "#18120c";
    g.fillRect(px, 34, UIW - px - 6, 266);
    g.fillStyle = "#e8dccb";
    g.font = "700 13px Arial";
    g.fillText("Lumetri Color", px + 12, 48);
    ["Shadows", "Midtones", "Highlights"].forEach((n, i) => {
      const wx = px + 62 + i * 112, wy = 130, r = 44;
      const grd = g.createConicGradient ? g.createConicGradient(0, wx, wy) : null;
      if (grd) {
        ["#f43f5e", "#f59e0b", "#84cc16", "#F16619", "#9bb052", "#a855f7", "#f43f5e"].forEach((c, k) => grd.addColorStop(k / 6, c));
        g.fillStyle = grd;
      } else g.fillStyle = "#3a2a1a";
      g.globalAlpha = 0.55;
      g.beginPath();
      g.arc(wx, wy, r, 0, 7);
      g.fill();
      g.globalAlpha = 1;
      g.strokeStyle = "#120d09";
      g.lineWidth = 3;
      g.beginPath();
      g.arc(wx, wy, r * 0.35, 0, 7);
      g.stroke();
      const a = t * 0.6 + i * 2;
      g.fillStyle = "#fff";
      g.beginPath();
      g.arc(wx + Math.cos(a) * 14, wy + Math.sin(a) * 14, 4, 0, 7);
      g.fill();
      g.fillStyle = "#bca993";
      g.font = "12px Arial";
      g.fillText(n, wx - 26, wy + r + 18);
    });
    // audio meters
    for (let i = 0; i < 2; i++) {
      const lvl = 0.55 + 0.35 * Math.abs(Math.sin(t * 7 + i * 1.3)) * Math.abs(Math.sin(t * 2.3 + i));
      g.fillStyle = "#2a1f15";
      g.fillRect(px + 40 + i * 22, 210, 14, 80);
      const gr = g.createLinearGradient(0, 290, 0, 210);
      gr.addColorStop(0, "#778A3F");
      gr.addColorStop(0.7, "#eab308");
      gr.addColorStop(1, "#ef4444");
      g.fillStyle = gr;
      g.fillRect(px + 40 + i * 22, 290 - 80 * lvl, 14, 80 * lvl);
    }
    g.fillStyle = "#bca993";
    g.fillText("-14 LUFS", px + 100, 250);
    g.fillText("Denoise ✓   EQ ✓", px + 100, 272);
    // timeline
    const ty = 312, tl = 70, tw = UIW - tl - 10;
    g.fillStyle = "#18120c";
    g.fillRect(6, ty, UIW - 12, UIH - ty - 6);
    g.fillStyle = "#241a12";
    g.fillRect(tl, ty + 4, tw, 20);
    g.fillStyle = "#8a7864";
    g.font = "11px monospace";
    for (let i = 0; i <= 20; i++) {
      const x = tl + (i / 20) * tw;
      g.fillRect(x, ty + 16, 1, 8);
      if (i % 4 === 0) g.fillText("00:0" + Math.floor(i / 4) + ":00", x + 3, ty + 12);
    }
    const rows = ["V3", "V2", "V1", "A1", "A2"];
    rows.forEach((n, r) => {
      const y = ty + 30 + r * 32;
      g.fillStyle = "#1f1710";
      g.fillRect(tl, y, tw, 28);
      g.fillStyle = "#bca993";
      g.font = "700 12px Arial";
      g.fillText(n, 24, y + 14);
    });
    clips.forEach(([tr, s, l, c, label]) => {
      const row = tr === 2 ? 0 : tr === 0 ? 1 : 2;
      const y = ty + 30 + row * 32;
      const x = tl + s * tw, w = l * tw - 3;
      g.fillStyle = c;
      g.globalAlpha = 0.85;
      roundRect(g, x, y + 2, w, 24, 4);
      g.fill();
      g.globalAlpha = 1;
      g.fillStyle = "#fff";
      g.font = "600 12px Arial";
      g.save();
      g.beginPath();
      g.rect(x, y, w, 28);
      g.clip();
      g.fillText(label, x + 8, y + 15);
      g.restore();
    });
    // audio waveforms
    [3, 4].forEach((r, k) => {
      const y = ty + 30 + r * 32 + 14;
      g.fillStyle = k ? "#9bb052" : "#778A3F";
      g.globalAlpha = 0.75;
      for (let x = 0; x < tw; x += 3) {
        const v = (Math.abs(Math.sin(x * 0.05 + k) * Math.sin(x * 0.013 + 2 * k)) * 0.8 + 0.15) * 11;
        g.fillRect(tl + x, y - v, 2, v * 2);
      }
      g.globalAlpha = 1;
    });
    // playhead
    const ph = tl + ((t * 0.06) % 1) * tw;
    g.fillStyle = "#ff2d55";
    g.fillRect(ph, ty + 4, 2, UIH - ty - 14);
    g.beginPath();
    g.moveTo(ph - 7, ty + 4);
    g.lineTo(ph + 9, ty + 4);
    g.lineTo(ph + 1, ty + 14);
    g.fill();
    ui.t.needsUpdate = true;
  }

  function drawScopes(t) {
    const g = sc.ctx, W = 512, H = 300;
    g.fillStyle = "#0f0b07";
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#bca993";
    g.font = "600 13px Arial";
    g.fillText("RGB Parade", 12, 20);
    g.fillText("Vectorscope", 352, 20);
    ["241,102,25", "155,176,82", "200,140,90"].forEach((c, k) => {
      const x0 = 12 + k * 108;
      g.strokeStyle = "rgba(255,255,255,.08)";
      g.strokeRect(x0, 30, 100, 250);
      for (let i = 0; i < 260; i++) {
        const x = x0 + Math.random() * 100;
        const base = 150 + Math.sin(x * 0.07 + t + k) * 50;
        const y = base + (Math.random() - 0.5) * 70;
        g.fillStyle = `rgba(${c},.55)`;
        g.fillRect(x, y, 2, 2);
      }
    });
    const cx = 420, cy = 150;
    g.strokeStyle = "rgba(255,255,255,.18)";
    g.beginPath();
    g.arc(cx, cy, 78, 0, 7);
    g.stroke();
    g.beginPath();
    g.moveTo(cx - 78, cy);
    g.lineTo(cx + 78, cy);
    g.moveTo(cx, cy - 78);
    g.lineTo(cx, cy + 78);
    g.stroke();
    for (let i = 0; i < 300; i++) {
      const a = Math.random() * 6.28, r = Math.random() * 30;
      g.fillStyle = "rgba(255,168,107,.55)";
      g.fillRect(cx + Math.cos(a) * r + Math.sin(t) * 10 - 12, cy + Math.sin(a) * r * 0.7 - 8, 2, 2);
    }
    g.fillStyle = "#ffa86b";
    g.fillText("Skin Tone Line ✓", 352, 280);
    sc.t.needsUpdate = true;
  }

  /* ---------- Camera path (scroll keyframes) ---------- */
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const KEYS = [
    // [position, look-at]
    [V(-0.62, 1.52, -0.55), V(-1.6, 1.36, 0.6)], // 0: lens close-up
    [V(-2.75, 1.72, 0.05), V(-1.6, 1.36, 0.55)], // 1: camera side + live monitor
    [V(-0.9, 2.15, 3.7), V(-0.6, 1.15, -1.2)], // 2: wide set — lights + crew
    [V(2.35, 1.5, 2.55), V(3.0, 1.12, 0.55)], // 3: editing desk
    [V(2.98, 1.22, 1.5), V(2.98, 1.2, 0.55)], // 4: into the screen
    [V(1.3, 3.1, 7.4), V(1.75, 1.35, -0.6)], // 5: final wide
  ];
  const posCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => k[0]), false, "centripetal");
  const tgtCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => k[1]), false, "centripetal");
  const SEG = KEYS.length - 1;
  const ease = (x) => x * x * x * (x * (x * 6 - 15) + 10); // smootherstep → dwell at each keyframe
  function pathAt(p) {
    const f = p * SEG;
    const i = Math.min(SEG - 1, Math.floor(f));
    const u = (i + ease(Math.min(1, f - i))) / SEG;
    return u;
  }

  /* ---------- Panels / HUD ---------- */
  const panels = document.querySelectorAll(".panel");
  const dots = document.querySelectorAll(".progress i");
  const hudTc = document.getElementById("hudTc");
  const hudScene = document.getElementById("hudScene");
  const hint = document.getElementById("scrollHint");
  let activePanel = 0;
  function panelFor(p) {
    if (p < 0.1) return 0;
    if (p < 0.3) return 1;
    if (p < 0.5) return 2;
    if (p < 0.86) return 3;
    return 4;
  }
  function setPanel(i) {
    if (i === activePanel) return;
    activePanel = i;
    panels.forEach((el, k) => el.classList.toggle("active", k === i));
    dots.forEach((el, k) => el.classList.toggle("on", k === i));
    if (hudScene) hudScene.textContent = "SCENE 0" + (i + 1);
  }

  /* ---------- Resize / input ---------- */
  let W = 1, H = 1, portrait = false;
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width);
    H = Math.max(1, r.height);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    portrait = camera.aspect < 1;
    camera.fov = portrait ? 56 : 42;
    // shift framing away from the text panel (right on desktop, bottom on mobile)
    if (portrait) camera.setViewOffset(W, H, 0, H * 0.17, W, H);
    else camera.setViewOffset(W, H, W * 0.16, 0, W, H);
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize);
  resize();

  const mouseN = { x: 0, y: 0 }, mouseS = { x: 0, y: 0 };
  addEventListener("pointermove", (e) => {
    mouseN.x = (e.clientX / innerWidth) * 2 - 1;
    mouseN.y = (e.clientY / innerHeight) * 2 - 1;
  });

  function scrollProgress() {
    const r = stage.getBoundingClientRect();
    const total = r.height - innerHeight;
    return Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
  }

  let visible = true;
  new IntersectionObserver((e) => (visible = e[0].isIntersecting), { threshold: 0 }).observe(stage);

  /* ---------- Loop ---------- */
  const clock = new THREE.Clock();
  let prog = scrollProgress();
  let first = true;
  let uiAcc = 0;
  const tmpP = new THREE.Vector3(), tmpT = new THREE.Vector3(), lensWorld = new THREE.Vector3();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const target = scrollProgress();
    if (hint) hint.classList.toggle("hide", target > 0.02);
    setPanel(panelFor(target));
    if (!visible && !first) return;

    prog += (target - prog) * (reduce ? 1 : Math.min(1, dt * 3.2));
    const u = pathAt(prog);
    posCurve.getPoint(u, tmpP);
    tgtCurve.getPoint(u, tmpT);
    if (portrait) {
      // pull back so objects fit a narrow screen
      const k = Math.min(1.9, Math.max(1, 0.95 / camera.aspect));
      tmpP.sub(tmpT).multiplyScalar(k).add(tmpT);
    }
    mouseS.x += (mouseN.x - mouseS.x) * 0.05;
    mouseS.y += (mouseN.y - mouseS.y) * 0.05;
    camera.position.copy(tmpP);
    camera.position.x += mouseS.x * 0.12;
    camera.position.y -= mouseS.y * 0.07;
    camera.position.y += Math.sin(t * 0.7) * 0.01; // handheld breathing
    camera.lookAt(tmpT);

    // animate set
    helix.rotation.y = t * 0.45;
    holoRings.forEach((r, i) => {
      r.rotation.z = t * (0.3 + i * 0.15) * (i % 2 ? -1 : 1);
      r.material.opacity = 0.3 + 0.25 * Math.sin(t * 2 + i);
    });
    dnaLight.intensity = 1.4 + Math.sin(t * 2.2) * 0.3;
    const pos = ecgGeo.attributes.position.array;
    for (let i = 0; i < ecgPoints; i++) {
      const x = i / (ecgPoints - 1);
      pos[i * 3] = (x - 0.5) * 3.2;
      pos[i * 3 + 1] = ecgShape(x * 2 - t * 0.5);
      pos[i * 3 + 2] = 0;
    }
    ecgGeo.attributes.position.needsUpdate = true;
    cine.userData.tally.visible = Math.sin(t * 6) > -0.3;
    fans.forEach((f, i) => (f.rotation.z = t * (3 + i)));
    const dp = dustGeo.attributes.position.array;
    for (let i = 0; i < dustN; i++) {
      dp[i * 3 + 1] += Math.sin(t * 0.3 + i) * 0.0006 + 0.0007;
      if (dp[i * 3 + 1] > 3.6) dp[i * 3 + 1] = 0;
    }
    dustGeo.attributes.position.needsUpdate = true;
    // gentle operator pan on the cinema camera
    rig.lookAt(aimTarget.x + Math.sin(t * 0.35) * 0.25, aimTarget.y + Math.sin(t * 0.5) * 0.06, aimTarget.z);

    // UI at ~30fps
    uiAcc += dt;
    if (uiAcc > 1 / 30 || first) {
      uiAcc = 0;
      drawUI(t);
      if (Math.floor(t * 10) % 2 === 0) drawScopes(t);
      if (hudTc) hudTc.textContent = tc(t);
    }

    // live feed: render from the cinema lens
    cine.localToWorld(lensWorld.set(0, 0, 0.5));
    feedCam.position.copy(lensWorld);
    const look = new THREE.Vector3(0, 0, 3);
    cine.localToWorld(look);
    feedCam.lookAt(look);
    dust.visible = false;
    renderer.setRenderTarget(feedRT);
    renderer.render(scene, feedCam);
    renderer.setRenderTarget(null);
    dust.visible = true;

    renderer.render(scene, camera);
    if (first) {
      first = false;
      finishLoading();
    }
  }
  if (loaderBar) loaderBar.style.width = "75%";
  frame();

  function setupPanelsOnly() {
    const panels = document.querySelectorAll(".panel");
    const dots = document.querySelectorAll(".progress i");
    const update = () => {
      const r = stage.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
      const i = p < 0.1 ? 0 : p < 0.3 ? 1 : p < 0.5 ? 2 : p < 0.86 ? 3 : 4;
      panels.forEach((el, k) => el.classList.toggle("active", k === i));
      dots.forEach((el, k) => el.classList.toggle("on", k === i));
    };
    addEventListener("scroll", update, { passive: true });
    update();
  }
})();

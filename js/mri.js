// MRIClear's shared physics and parts: proton constants, tissue relaxation times,
// the spin-echo signal, a small FFT, the brain phantom, the magnet's fringe field,
// and 3D builders for the scanner (magnet, gradient coils, RF coils, table, patient).
// World units: 1 unit = 25 cm. The bore runs along X; its centre (the isocentre) is at (0, YC, 0).
import { THREE, M, latheX, beam, torus, tube, box, sphere, clamp } from './kit.js';

export const U = 0.25;            // metres per world unit
export const YC = 4.5;            // height of the bore's axis (about 1.1 m)
export const BORE_R = 1.42;       // 71 cm bore
export const TAU = Math.PI * 2;

// ---------------------------------------------------------------- constants
// CODATA 2018: proton gyromagnetic ratio γ = 2.6752218744e8 rad s⁻¹ T⁻¹ (γ/2π = 42.577 MHz/T).
// Other nuclei (γ/2π, MHz/T): Harris et al., "NMR nomenclature", Pure Appl. Chem. 73, 1795 (2001).
export const NUCLEI = {
  H1: { name: 'Hydrogen-1', label: '¹H', f: 42.577, note: 'about 63% of the atoms in your body' },
  Na23: { name: 'Sodium-23', label: '²³Na', f: 11.262, note: 'in body fluids, a few thousand times fewer nuclei than ¹H' },
  P31: { name: 'Phosphorus-31', label: '³¹P', f: 17.235, note: 'in the ATP that powers your cells' },
  C13: { name: 'Carbon-13', label: '¹³C', f: 10.708, note: 'only 1.1% of carbon atoms' },
};
export const HBAR = 1.054571817e-34, KB = 1.380649e-23, MU0 = 4e-7 * Math.PI;
export const BODY_T = 310;                                   // body temperature, K
export const EARTH = 50e-6;                                  // Earth's field, about 25–65 µT; 50 µT typical
export const GAMMA_H = 2.6752218744e8;                       // rad/s/T
// Fraction of extra spins pointing along the field (high-temperature limit): Δn/n = γħB / 2kT.
export const excess = (B, gamma = GAMMA_H, T = BODY_T) => (gamma * HBAR * B) / (2 * KB * T);
// Water holds 2 × 55.5 mol/L of hydrogen nuclei: 6.69 × 10²⁸ per m³, or 6.69 × 10²² per mL.
export const PROTONS_PER_ML = 2 * 55.5 * 6.02214076e23 / 1000;
// Net magnetisation of water (Curie law): M0 = N γ² ħ² B / 4kT, in A/m.
export const M0 = (B) => (PROTONS_PER_ML * 1e6 * GAMMA_H ** 2 * HBAR ** 2 * B) / (4 * KB * BODY_T);

// ---------------------------------------------------------------- tissues
// Relaxation times at 1.5 T, ms. Representative values from the table "Common relaxation time
// constants in human tissues" (Wikipedia, Relaxation (NMR)); fat 240–250/60–80, CSF 4200–4500/2100–2300.
// Measured values differ between studies: Stanisz et al., Magn. Reson. Med. 54, 507 (2005) found white
// matter 884/72 ms and grey matter 1124/95 ms at 1.5 T. Relative proton density (PD, water = 1):
// white matter 0.69 and grey matter 0.80 water content (Neeb et al., NeuroImage 31, 1156, 2006);
// fat about 0.9 is a common textbook figure.
export const TISSUES = {
  fat: { name: 'Fat', T1: 250, T2: 70, PD: 0.9, color: '#ffcf6b' },
  wm: { name: 'White matter', T1: 780, T2: 90, PD: 0.69, color: '#8ef0ff' },
  gm: { name: 'Grey matter', T1: 920, T2: 100, PD: 0.8, color: '#c49bff' },
  csf: { name: 'Fluid (CSF)', T1: 4200, T2: 2100, PD: 1.0, color: '#5ce1a9' },
};
// Spin-echo signal: S = PD · (1 − e^(−TR/T1)) · e^(−TE/T2).
export const signal = (t, TR, TE) => t.PD * (1 - Math.exp(-TR / t.T1)) * Math.exp(-TE / t.T2);
// Grey level for each tissue, scaled so the brightest tissue is white (as a scanner's window does).
export function greys(TR, TE) {
  const v = {}; let max = 0;
  for (const k in TISSUES) { v[k] = signal(TISSUES[k], TR, TE); max = Math.max(max, v[k]); }
  for (const k in v) v[k] /= max || 1;
  v.bone = 0.02; v.air = 0;         // cortical bone and air give almost no signal
  return v;
}

// ---------------------------------------------------------------- brain phantom
// An axial slice through the head, drawn from ellipses: scalp fat, skull, CSF, grey-matter
// cortex, white matter, and the two lateral ventricles. g is a 2D context; val(tissue) → 0..1.
export function drawBrain(g, x0, y0, w, h, val, smoothEdges = true) {
  const cx = x0 + w / 2, cy = y0 + h / 2, s = Math.min(w, h) / 2;
  const grey = (k) => { const v = Math.round(clamp(val[k] ?? 0, 0, 1) * 255); return `rgb(${v},${v},${v})`; };
  const ell = (rx, ry, k, dx = 0, dy = 0, rot = 0) => { g.fillStyle = grey(k); g.beginPath(); g.ellipse(cx + dx * s, cy + dy * s, rx * s, ry * s, rot, 0, TAU); g.fill(); };
  g.save(); g.imageSmoothingEnabled = smoothEdges;
  g.fillStyle = grey('air'); g.fillRect(x0, y0, w, h);
  ell(0.80, 0.95, 'fat');                     // scalp fat
  ell(0.74, 0.89, 'bone');                    // skull
  ell(0.69, 0.84, 'csf');                     // fluid around the brain
  ell(0.655, 0.80, 'gm');                     // cortex
  // Sulci: little fingers of CSF dipping into the cortex.
  g.strokeStyle = grey('csf'); g.lineWidth = s * 0.035; g.lineCap = 'round';
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * TAU + 0.12, r0 = 0.66, r1 = 0.55;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * r0 * s * 0.99, cy + Math.sin(a) * r0 * s * 1.21); g.lineTo(cx + Math.cos(a) * r1 * s, cy + Math.sin(a) * r1 * s * 1.2); g.stroke();
  }
  ell(0.53, 0.66, 'wm');                      // white matter
  // Deep grey matter (thalamus, basal ganglia) and the midline fissure.
  ell(0.11, 0.14, 'gm', -0.17, 0.08); ell(0.11, 0.14, 'gm', 0.17, 0.08);
  g.fillStyle = grey('csf'); g.fillRect(cx - s * 0.018, cy - s * 0.84, s * 0.036, s * 0.3); g.fillRect(cx - s * 0.018, cy + s * 0.58, s * 0.036, s * 0.26);
  // Lateral ventricles: two curved CSF lakes.
  ell(0.07, 0.25, 'csf', -0.1, -0.08, 0.18); ell(0.07, 0.25, 'csf', 0.1, -0.08, -0.18);
  ell(0.05, 0.08, 'csf', -0.13, 0.24, -0.4); ell(0.05, 0.08, 'csf', 0.13, 0.24, 0.4);
  g.restore();
}

// ---------------------------------------------------------------- FFT
// In-place radix-2 FFT on re/im arrays of length n (a power of two). inv = true for the inverse.
export function fft(re, im, inv = false) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const a = ((inv ? 2 : -2) * Math.PI) / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const p = i + k, q = p + len / 2;
        const tr = re[q] * cr - im[q] * ci, ti = re[q] * ci + im[q] * cr;
        re[q] = re[p] - tr; im[q] = im[p] - ti; re[p] += tr; im[p] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
  if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}
// 2D FFT of an n×n image stored row by row.
export function fft2(re, im, n, inv = false) {
  const r = new Float64Array(n), i2 = new Float64Array(n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) { r[x] = re[y * n + x]; i2[x] = im[y * n + x]; }
    fft(r, i2, inv);
    for (let x = 0; x < n; x++) { re[y * n + x] = r[x]; im[y * n + x] = i2[x]; }
  }
  for (let x = 0; x < n; x++) {
    for (let y = 0; y < n; y++) { r[y] = re[y * n + x]; i2[y] = im[y * n + x]; }
    fft(r, i2, inv);
    for (let y = 0; y < n; y++) { re[y * n + x] = r[y]; im[y * n + x] = i2[y]; }
  }
}

// ---------------------------------------------------------------- fringe field
// On-axis field of a finite solenoid (radius a, length L, centred at 0), per unit of μ0·n·I.
const sol = (z, a, L) => 0.5 * ((z + L / 2) / Math.hypot(z + L / 2, a) - (z - L / 2) / Math.hypot(z - L / 2, a));
// A simple model magnet: the main winding (radius 0.55 m, 1.3 m long) and, when actively shielded,
// an outer winding (0.9 m, 1.5 m long) carrying the opposite current, sized so the two dipole moments
// cancel (n·L·a² equal). Normalised so B(0) = B0. Distances in metres from the isocentre along the bore.
const A1 = 0.55, L1 = 1.3, A2 = 0.9, L2 = 1.5;
const K2 = (L1 * A1 * A1) / (L2 * A2 * A2);
const rawB = (z, shielded) => sol(z, A1, L1) - (shielded ? K2 * sol(z, A2, L2) : 0);
export function fieldAt(z, B0, shielded = true) { return (B0 * rawB(z, shielded)) / rawB(0, shielded); }
export const gradAt = (z, B0, shielded = true, h = 0.005) => (fieldAt(z - h, B0, shielded) - fieldAt(z + h, B0, shielded)) / (2 * h);
// Where the field falls to a level (e.g. 0.5 mT, the "5-gauss line"), searching outwards.
export function reachOf(level, B0, shielded = true) {
  let z = 0.5; while (z < 30 && Math.abs(fieldAt(z, B0, shielded)) > level) z += 0.01;
  return z;
}
// Pull on a soft-steel object along the axis: F = V·M·dB/dz, where the steel's magnetisation M grows
// with the field (limited by its shape, demagnetising factor N) until it saturates at Ms. Schenck,
// J. Magn. Reson. Imaging 12, 2 (2000). Weakly magnetic metals feel F = χ·V·B·(dB/dz)/μ0 instead.
export function pull(obj, z, B0, shielded) {
  const B = Math.abs(fieldAt(z, B0, shielded)), G = gradAt(z, B0, shielded);
  const V = obj.kg / obj.rho;
  if (obj.chi != null) return (obj.chi * V * B * G) / MU0;
  const Mag = Math.min(obj.Ms / MU0, B / (MU0 * obj.N));
  return V * Mag * G;
}

// ---------------------------------------------------------------- 3D helpers
// A material that fades to a see-through ghost for "X-ray" views.
export function xmat(color, kind = 'plastic', o = {}) {
  const m = (kind === 'metal' ? M.metal(color, { roughness: 0.35, ...o }) : M.plastic(color, o));
  m.transparent = true; m.side = THREE.DoubleSide;
  m.setXray = (on, ghost = 0.1) => { m.opacity = on ? ghost : 1; m.depthWrite = !on; };
  return m;
}
// A hollow cylinder along X from x0 to x1, inner radius r0, outer r1.
export function shell(x0, x1, r0, r1, mat, seg = 72) {
  return latheX([[x0, r0], [x1, r0], [x1, r1], [x0, r1], [x0, r0]], mat, { seg });
}
// A birdcage RF coil along X: straight copper rungs joined by two end rings.
export function birdcage(r, x0, x1, rungs, mat, rr = 0.035) {
  const g = new THREE.Group();
  for (let i = 0; i < rungs; i++) {
    const a = (i / rungs) * TAU;
    g.add(beam([x0, Math.sin(a) * r, Math.cos(a) * r], [x1, Math.sin(a) * r, Math.cos(a) * r], rr, mat, 8));
  }
  for (const x of [x0, x1]) { const t = torus(r, rr * 1.8, mat, 64); t.rotation.y = Math.PI / 2; t.position.x = x; g.add(t); }
  return g;
}
// One saddle coil on a cylinder of radius r, centred on angle phi (in the Y–Z plane), from x0 to x1.
export function saddle(r, phi, x0, x1, mat, span = 1.1, rr = 0.045) {
  const pts = [], P = (x, a) => new THREE.Vector3(x, Math.sin(a) * r, Math.cos(a) * r);
  const n = 16;
  for (let i = 0; i <= n; i++) pts.push(P(x0, phi - span + (2 * span * i) / n));
  for (let i = 1; i <= 6; i++) pts.push(P(x0 + ((x1 - x0) * i) / 6, phi + span));
  for (let i = 1; i <= n; i++) pts.push(P(x1, phi + span - (2 * span * i) / n));
  for (let i = 1; i < 6; i++) pts.push(P(x1 - ((x1 - x0) * i) / 6, phi - span));
  return tube(pts, rr, mat, true, 240);
}
// A flat board that shows a canvas texture.
export function board(tex, w, h) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: THREE.DoubleSide }));
  return m;
}
export function frameBoard(g, w, h, title) {
  g.clearRect(0, 0, w, h);
  g.fillStyle = 'rgba(12,16,24,0.92)'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(142,240,255,0.35)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3);
  if (title) { g.fillStyle = '#e8eef8'; g.font = '600 30px Geist, system-ui, sans-serif'; g.fillText(title, 24, 44); }
}

// ---------------------------------------------------------------- the scanner
// Returns the parts so chapters can explode, X-ray or hide them.
export function makeScanner({ table = true, patient = true, headCoil = true } = {}) {
  const group = new THREE.Group();
  const at = new THREE.Group(); at.position.y = YC; group.add(at);   // everything round the bore axis

  // Cover: a rounded housing with flared bore openings.
  const coverMat = xmat(0xe9edf3, 'plastic', { roughness: 0.35 });
  const cover = latheX([[-3.45, 1.85], [-3.15, BORE_R], [3.15, BORE_R], [3.45, 1.85], [3.55, 3.9], [3.35, 4.3], [-3.35, 4.3], [-3.55, 3.9], [-3.45, 1.85]], coverMat, { seg: 96 });
  const coverG = new THREE.Group(); coverG.add(cover); at.add(coverG);
  const stripe = shell(3.5, 3.56, 2.3, 2.6, M.glow(0x8ef0ff, { transparent: true, opacity: 0.8 })); coverG.add(stripe);
  const foot = box(5.6, YC - 3.2, 6.2, M.matte(0x9aa3b1)); foot.position.set(0, (YC - 3.2) / 2 - YC, 0); coverG.add(foot);

  // Cryostat: the stainless-steel vacuum vessel, with the helium vessel and windings inside.
  const cryoMat = xmat(0xaab2bf, 'metal');
  const cryostat = shell(-3.2, 3.2, 2.25, 4.05, cryoMat); at.add(cryostat);
  const heMat = M.ghost(0x5b9dff, 0.22);
  const helium = shell(-2.95, 2.95, 2.42, 3.85, heMat); at.add(helium);
  const coilMat = M.metal(0xd9a441, { roughness: 0.35 });
  const windings = new THREE.Group(); at.add(windings);
  // Main coils: bigger at the ends, as real magnets are, to make the middle field even.
  [[-2.55, 0.55], [-1.45, 0.35], [-0.45, 0.3], [0.45, 0.3], [1.45, 0.35], [2.55, 0.55]].forEach(([x, w]) => windings.add(shell(x - w / 2, x + w / 2, 2.6, w > 0.4 ? 2.95 : 2.82, coilMat, 64)));
  const shieldCoils = new THREE.Group(); at.add(shieldCoils);
  [-2.2, 2.2].forEach((x) => shieldCoils.add(shell(x - 0.4, x + 0.4, 3.5, 3.68, M.metal(0xc98a3a, { roughness: 0.4 }), 64)));

  // Cold head and turret on top; the quench pipe leaves from the turret.
  const cold = new THREE.Group(); cold.position.set(-1.3, 4.05, 0); at.add(cold);
  cold.add(Object.assign(beam([0, 0, 0], [0, 1.5, 0], 0.42, M.metal(0x8b93a1), 32)));
  for (let i = 0; i < 5; i++) { const f = torus(0.45, 0.05, M.metal(0x6c7484), 32); f.rotation.x = Math.PI / 2; f.position.y = 0.35 + i * 0.22; cold.add(f); }
  cold.add(Object.assign(beam([0, 1.5, 0], [0, 1.9, 0], 0.28, M.metal(0x5a6170), 24)));
  const turret = beam([1.2, 3.95, 0], [1.2, 4.5, 0], 0.3, M.metal(0x8b93a1), 24); at.add(turret);

  // Gradient coils: a resin-filled tube just inside the magnet, holding three coil sets.
  const grad = new THREE.Group(); at.add(grad);
  const gradMat = xmat(0x3a4150, 'plastic', { roughness: 0.6 });
  const gradTube = shell(-2.9, 2.9, 1.62, 2.18, gradMat, 72); grad.add(gradTube);
  const gz = M.glow(0x5b8cff), gx = M.glow(0xff6b6b), gy = M.glow(0x5ce1a9);
  const zc = new THREE.Group(); grad.add(zc);
  for (const x of [-2.1, -1.1, 1.1, 2.1]) { const t = torus(1.9, 0.05, gz, 72); t.rotation.y = Math.PI / 2; t.position.x = x; zc.add(t); }
  const xc = new THREE.Group(), yc = new THREE.Group(); grad.add(xc, yc);
  for (const [x0, x1] of [[0.25, 2.5], [-2.5, -0.25]]) {
    xc.add(saddle(1.98, Math.PI / 2 - Math.PI / 2, x0, x1, gx), saddle(1.98, Math.PI, x0, x1, gx));
    yc.add(saddle(2.06, Math.PI / 2, x0, x1, gy), saddle(2.06, -Math.PI / 2, x0, x1, gy));
  }

  // RF body coil: a birdcage behind the bore liner.
  const body = birdcage(1.55, -1.5, 1.5, 16, M.metal(0xd07a45, { roughness: 0.3 })); at.add(body);
  const liner = shell(-3.1, 3.1, BORE_R - 0.03, BORE_R, M.clear(0xdfeaff, 0.12)); at.add(liner);

  const parts = { group, at, coverG, coverMat, cryostat, cryoMat, turret, helium, windings, shieldCoils, cold, grad, gradMat, zc, xc, yc, body, liner };

  if (table) {
    const t = new THREE.Group(); group.add(t);
    const TOPY = YC - 0.72;
    const top = box(13.5, 0.14, 1.9, M.plastic(0xdfe4ec)); top.position.set(3.25, TOPY - 0.07, 0); t.add(top);
    const pad = box(12.6, 0.12, 1.7, M.matte(0x4a6fa5)); pad.position.set(3.4, TOPY + 0.06, 0); t.add(pad);
    const base = box(4.6, TOPY - 0.3, 1.5, M.plastic(0xc9ced8)); base.position.set(7.4, (TOPY - 0.3) / 2, 0); t.add(base);
    const rail = box(9, 0.2, 1.2, M.metal(0x8b93a1)); rail.position.set(5.6, TOPY - 0.25, 0); t.add(rail);
    parts.table = t; parts.tableTop = TOPY;
    if (patient) {
      const p = new THREE.Group(); p.position.set(0, TOPY + 0.12, 0); t.add(p);
      const skin = M.matte(0xd9a88a), gown = M.matte(0x7f9fc9);
      const head = sphere(0.42, skin); head.scale.set(1.05, 0.95, 0.85); head.position.set(0, 0.45, 0); p.add(head);
      const neck = beam([0.35, 0.4, 0], [0.75, 0.4, 0], 0.2, skin); p.add(neck);
      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 2.3, 8, 24), gown); torso.rotation.z = Math.PI / 2; torso.scale.set(0.7, 1, 1.25); torso.position.set(2.2, 0.45, 0); torso.castShadow = true; p.add(torso);
      for (const z of [-0.36, 0.36]) {
        const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 3.1, 6, 16), gown); leg.rotation.z = Math.PI / 2; leg.scale.set(0.8, 1, 1); leg.position.set(5.2, 0.32, z); leg.castShadow = true; p.add(leg);
        const foot2 = box(0.25, 0.55, 0.3, skin); foot2.position.set(7.0, 0.5, z); p.add(foot2);
      }
      parts.patient = p;
    }
    if (headCoil) {
      const hc = new THREE.Group(); hc.position.set(0, TOPY + 0.55, 0); t.add(hc);
      hc.add(birdcage(0.62, -0.5, 0.55, 12, M.metal(0xd07a45, { roughness: 0.3 }), 0.025));
      const cage = shell(-0.55, 0.6, 0.66, 0.7, M.clear(0xe8eef8, 0.25)); hc.add(cage);
      parts.headCoil = hc;
    }
  }
  return parts;
}

// Faraday-cage walls: copper-coloured panels with a fine mesh of lines.
export function faradayWalls(stage, { x0 = -9, x1 = 12, z0 = -7.5, h = 12, zFront = 5 } = {}) {
  const g = new THREE.Group();
  const panel = (w, hh) => new THREE.Mesh(new THREE.PlaneGeometry(w, hh), M.ghost(0xc87533, 0.07));
  const back = panel(x1 - x0, h); back.position.set((x0 + x1) / 2, h / 2, z0); g.add(back);
  const side = panel(zFront - z0, h); side.rotation.y = Math.PI / 2; side.position.set(x0, h / 2, (z0 + zFront) / 2); g.add(side);
  const pts = [];
  for (let x = x0; x <= x1 + 1e-6; x += 1) pts.push(x, 0, z0, x, h, z0);
  for (let y = 0; y <= h + 1e-6; y += 1) pts.push(x0, y, z0, x1, y, z0, x0, y, z0, x0, y, zFront);
  for (let z = z0; z <= zFront + 1e-6; z += 1) pts.push(x0, 0, z, x0, h, z);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  g.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xc87533, transparent: true, opacity: 0.28 })));
  return g;
}

export const fmtHz = (f) => (f >= 1e6 ? (f / 1e6).toFixed(f >= 1e8 ? 1 : 1) + ' MHz' : f >= 1e3 ? (f / 1e3).toFixed(f >= 1e4 ? 0 : 1) + ' kHz' : f.toFixed(0) + ' Hz');
export const sci = (x, d = 1) => { const e = Math.floor(Math.log10(x)); return `${(x / 10 ** e).toFixed(d)} × 10<sup>${e}</sup>`; };

// On a phone the readout covers the top of a short stage, so nudge the picture down.
export function fitNarrow(stage) {
  const y = stage.host.clientWidth < 560 ? -0.2 : 0;
  if (stage._mriShift !== y) { stage._mriShift = y; stage.setShift(0, y); }
}

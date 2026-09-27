// Chapter 6: what else MRI can see. fMRI watches blood oxygen change as the brain works (BOLD),
// diffusion MRI follows water along nerve fibres, and angiography lights up flowing blood.
import { THREE, M, sphere, tube, swarm, canvasTexture, approach, clamp } from '../kit.js';
import { board, frameBoard, fitNarrow } from '../mri.js';

// The canonical haemodynamic response (SPM's double gamma): peak near 5 s, a small undershoot near 15 s.
// h(t) = t⁵e^(−t)/5! − (1/6)·t¹⁵e^(−t)/15!
const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));
const hrf = (t) => (t <= 0 ? 0 : (t ** 5 * Math.exp(-t)) / fact(5) - (t ** 15 * Math.exp(-t)) / (6 * fact(15)));
const HDT = 0.1, HLEN = 320, HSUM = Array.from({ length: HLEN }, (_, i) => hrf(i * HDT)).reduce((a, b) => a + b) * HDT;
const BOLD_PEAK = 2;             // % change for a long block of activity; typical 1–5% at 3 T
const WIN = 60;                  // seconds shown on the chart

const FIBRES = [];               // [points, colour] filled in build()

export default {
  id: 'uses',
  short: 'What MRI can see',
  title: 'Watching the brain work',
  subtitle: 'Blood oxygen, water on the move, and flowing blood, all without X-rays.',
  view: { pos: [3.6, 6.4, 11.6], target: [0.5, 5.1, 0] },
  learn: `<p>The same scanner can do far more than take still pictures.</p>
    <p><b>fMRI</b> watches the brain work. Active brain cells need more oxygen, and blood rushes in with more than they use. Blood's haemoglobin is slightly magnetic when it has given up its oxygen, and not when it carries it. So a busy area gets a little <b>brighter</b>, by a few percent, a few seconds later. This is the <b>BOLD</b> signal, discovered by Seiji Ogawa in 1990.</p>
    <p><b>Diffusion MRI</b> measures how far water molecules wander in a few thousandths of a second. In white matter, water moves more easily along nerve fibres than across them, so a computer can trace the brain's wiring: <b>tractography</b>. Diffusion scans also spot a stroke within minutes.</p>
    <p><b>MR angiography</b> makes flowing blood bright, often without any injected dye, to show arteries and aneurysms.</p>
    <p>MRI is the best tool for <b>soft tissue</b>: brain, spinal cord, joints, ligaments and many tumours. <b>CT</b> is better and much faster for <b>bone</b>, bleeding after an accident and the lungs, and it takes seconds instead of many minutes.</p>
    <p class="tip"><b>Try it:</b> in fMRI, start the flashing checkerboard, stop it after 20 seconds, and watch how late the signal rises and falls.</p>`,
  terms: [
    { t: 'fMRI', d: 'Functional MRI: a series of fast scans that shows which brain areas are working.' },
    { t: 'BOLD', d: 'Blood-oxygen-level-dependent signal. Areas with more oxygen-rich blood look slightly brighter.' },
    { t: 'Diffusion', d: 'The random wandering of molecules. In nerve fibres, water wanders further along than across.' },
    { t: 'Tractography', d: 'Tracing the paths of nerve-fibre bundles from diffusion scans.' },
    { t: 'Angiography', d: 'A picture of blood vessels.' },
  ],
  defaults: { mode: 'bold', stim: true, task: 'see' },
  controls: [
    { key: 'mode', type: 'seg', label: 'Show', options: [{ v: 'bold', label: 'fMRI' }, { v: 'dti', label: 'Diffusion' }, { v: 'mra', label: 'Angiography' }] },
    { key: 'task', type: 'seg', label: 'fMRI task', options: [{ v: 'see', label: 'Look at a checkerboard' }, { v: 'tap', label: 'Tap right fingers' }] },
    { key: 'stim', type: 'toggle', label: 'Task running', hint: 'fMRI only. Switch it off and on in blocks of about 20 s.' },
  ],
  quiz: [
    { q: 'What does the BOLD signal in fMRI actually measure?', options: ['Electrical sparks in neurons', 'Changes in blood oxygen near active brain areas', 'Brain temperature', 'Thoughts directly'], answer: 1, why: 'Deoxygenated haemoglobin is slightly magnetic. Extra oxygen-rich blood reaching busy areas changes the signal.' },
    { q: 'How does diffusion MRI trace nerve fibres?', options: ['It follows electric currents', 'Water moves more easily along fibres than across them', 'It injects dye into the nerves', 'It sees myelin as bright light'], answer: 1, why: 'The direction water spreads most shows the direction of the fibres.' },
    { q: 'Which is usually better for a broken bone after a road accident?', options: ['MRI', 'CT', 'fMRI', 'Neither'], answer: 1, why: 'CT is fast and shows bone and bleeding clearly. MRI is best for soft tissue.' },
  ],
  reel: [
    { ms: 5600, caption: 'fMRI sees the brain at work: oxygen-rich blood makes busy areas a little brighter.', set: { mode: 'bold', task: 'see', stim: true }, act: (s, inst) => inst.primeBold(9), view: { pos: [-2.4, 5.6, -7.2], target: [0.6, 4.0, 0.2] }, spin: 0.15 },
    { ms: 5200, caption: 'Diffusion MRI follows water along nerve fibres to map the brain’s wiring.', set: { mode: 'dti' }, view: { pos: [2.2, 5.4, 7.6], target: [0.9, 4.0, 0] }, spin: 0.35 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    // Head (see-through) and brain. x: left–right, y: up, z: towards the face.
    const head = sphere(1, M.ghost(0xd9a88a, 0.1)); head.scale.set(1.75, 2.1, 2.15); head.position.set(0, 4.1, 0.1); head.castShadow = false; root.add(head);
    const brainMat = M.plastic(0xe7a9b8, { transparent: true, opacity: 0.38, depthWrite: false, roughness: 0.6 });
    for (const x of [-0.56, 0.56]) { const h = sphere(1, brainMat, 40); h.scale.set(0.95, 1.05, 1.55); h.position.set(x, 4.45, 0); root.add(h); }
    const cb = sphere(1, brainMat); cb.scale.set(1.0, 0.45, 0.55); cb.position.set(0, 3.3, -1.1); root.add(cb);
    const stem = tube([[0, 3.8, -0.3], [0, 3.1, -0.45], [0, 2.1, -0.5]], 0.22, brainMat, false, 30); root.add(stem);
    stage.label('Front', [0, 4.2, 2.5], root);

    // --- fMRI: an activation blob.
    const blobMat = M.glow(0xff5a3c, { transparent: true, opacity: 0 });
    const blobs = { see: [[-0.4, 4.35, -1.45], [0.4, 4.35, -1.45]], tap: [[-0.75, 5.3, -0.1]] };
    const blobM = {};
    for (const k in blobs) blobM[k] = blobs[k].map((p) => { const b = sphere(0.36, blobMat.clone()); b.position.set(...p); b.scale.set(1, 0.8, 0.9); root.add(b); return b; });
    const lBlob = stage.label('', [0, 0, 0], root, 'hot');

    // --- Diffusion: fibre bundles in the standard colours (red left–right, green front–back, blue up–down).
    const fibres = new THREE.Group(); root.add(fibres);
    const bundles = [];
    const addB = (pts, col, n = 5, spread = 0.12) => {
      for (let k = 0; k < n; k++) {
        const o = [(k - (n - 1) / 2) * spread, ((k * 7) % 3 - 1) * spread * 0.6, ((k * 5) % 3 - 1) * spread * 0.6];
        const P = pts.map((p) => new THREE.Vector3(p[0] + o[0] * (Math.abs(p[0]) < 0.3 ? 0.4 : 1), p[1] + o[1], p[2] + o[2] + (col === 0xff5a5a ? o[0] * 1.5 : 0)));
        const curve = new THREE.CatmullRomCurve3(P);
        fibres.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.035, 6), M.glow(col, { transparent: true, opacity: 0.8 })));
        bundles.push({ curve, col });
      }
    };
    addB([[-1.35, 5.2, 0.2], [-0.9, 4.75, 0.1], [0, 4.45, 0.1], [0.9, 4.75, 0.1], [1.35, 5.2, 0.2]], 0xff5a5a, 7, 0.1);   // corpus callosum
    for (const s of [-1, 1]) addB([[s * 0.15, 2.3, -0.5], [s * 0.25, 3.3, -0.35], [s * 0.45, 4.3, -0.1], [s * 0.72, 5.3, 0.0]], 0x5b8cff, 5, 0.1);   // corticospinal tracts
    for (const s of [-1, 1]) addB([[s * 0.35, 4.9, 1.45], [s * 0.35, 5.15, 0.4], [s * 0.35, 5.0, -0.7], [s * 0.4, 4.5, -1.5]], 0x5ce1a9, 4, 0.1);   // cingulum
    const NDOT = 360, dots = swarm(NDOT, new THREE.SphereGeometry(0.045, 6, 4), M.glow(0xffffff));
    fibres.add(dots);
    const dotU = Array.from({ length: NDOT }, (_, i) => ({ b: i % bundles.length, u: (i * 0.618) % 1 }));
    FIBRES.length = 0;

    // --- Angiography: carotids, basilar, the circle of Willis and its main branches.
    const vessels = new THREE.Group(); root.add(vessels);
    const vMat = M.plastic(0xd8343c, { roughness: 0.35, emissive: new THREE.Color(0x5a0a10) });
    const paths = [];
    const V = (pts, r) => { const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))); vessels.add(new THREE.Mesh(new THREE.TubeGeometry(c, 60, r, 10), vMat)); paths.push(c); };
    const CW = 3.55;
    for (const s of [-1, 1]) {
      V([[s * 0.5, 1.2, 0.3], [s * 0.5, 2.4, 0.35], [s * 0.42, 3.1, 0.55], [s * 0.35, CW, 0.4]], 0.09);                         // internal carotid
      V([[s * 0.35, CW, 0.4], [s * 0.9, CW + 0.15, 0.35], [s * 1.3, CW + 0.7, 0.1], [s * 1.45, 4.6, -0.3]], 0.07);           // middle cerebral
      V([[s * 0.35, CW, 0.4], [s * 0.15, CW + 0.1, 0.8], [s * 0.1, 4.4, 1.5], [s * 0.1, 5.4, 0.9]], 0.055);                   // anterior cerebral
      V([[0, CW - 0.1, -0.35], [s * 0.4, CW, -0.4], [s * 0.7, 3.8, -1.1], [s * 0.6, 4.1, -1.7]], 0.055);                     // posterior cerebral
      V([[s * 0.35, CW, 0.4], [s * 0.38, CW, 0.0], [s * 0.4, CW, -0.4]], 0.04);                                              // posterior communicating
      V([[s * 0.35, 1.2, -0.6], [s * 0.2, 2.2, -0.5], [0, 2.8, -0.4]], 0.05);                                                // vertebral
    }
    V([[-0.15, CW, 0.75], [0.15, CW, 0.75]], 0.035);                                                                          // anterior communicating
    V([[0, 2.8, -0.4], [0, 3.2, -0.38], [0, CW - 0.1, -0.35]], 0.075);                                                        // basilar
    const NF = 300, flow = swarm(NF, new THREE.SphereGeometry(0.05, 6, 4), M.glow(0xffe0e0));
    vessels.add(flow);
    const flowU = Array.from({ length: NF }, (_, i) => ({ p: i % paths.length, u: (i * 0.618) % 1 }));

    // --- Board: the BOLD time course (fMRI), or a key (other modes).
    const W = 900, H = 520;
    const hist = new Float32Array(Math.round(WIN / HDT)).fill(0), stimH = new Uint8Array(hist.length);
    const stimQ = new Float32Array(HLEN).fill(0);      // recent stimulus, newest first
    let mode = '';
    const cv = canvasTexture(W, H, (g) => {
      if (mode === 'bold') {
        frameBoard(g, W, H, 'fMRI signal in the active area');
        const x0 = 70, y0 = 80, w = W - 110, h = H - 170, top = 3, bot = -1;
        const Y = (v) => y0 + ((top - v) / (top - bot)) * h;
        g.fillStyle = 'rgba(255,181,71,0.18)';
        for (let i = 0; i < stimH.length; i++) if (stimH[i]) g.fillRect(x0 + (i / stimH.length) * w, y0, w / stimH.length + 1, h);
        g.strokeStyle = '#3a4150'; g.lineWidth = 1; g.fillStyle = '#9aa3b1'; g.font = '22px Geist, system-ui, sans-serif';
        for (let v = -1; v <= 3; v++) { g.beginPath(); g.moveTo(x0, Y(v)); g.lineTo(x0 + w, Y(v)); g.stroke(); g.fillText((v > 0 ? '+' : '') + v + '%', 12, Y(v) + 7); }
        g.strokeStyle = '#ff5a3c'; g.lineWidth = 4; g.beginPath();
        for (let i = 0; i < hist.length; i++) { const x = x0 + (i / hist.length) * w, y = Y(hist[i]); i ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke();
        g.fillStyle = '#ffb547'; g.fillText('shaded: task running', x0, H - 50);
        g.fillStyle = '#9aa3b1'; g.fillText(`last ${WIN} s → now`, x0 + w - 190, H - 50);
      } else if (mode === 'dti') {
        frameBoard(g, W, H, 'Direction colours in a diffusion map');
        const row = (y, col, t, d) => { g.fillStyle = col; g.fillRect(60, y - 26, 40, 34); g.fillStyle = '#e8eef8'; g.font = '600 28px Geist, system-ui, sans-serif'; g.fillText(t, 120, y); g.fillStyle = '#9aa3b1'; g.font = '22px Geist, system-ui, sans-serif'; g.fillText(d, 120, y + 32); };
        row(140, '#ff5a5a', 'Red: left ↔ right', 'Corpus callosum joins the two halves');
        row(250, '#5ce1a9', 'Green: front ↔ back', 'Cingulum, along the middle of the brain');
        row(360, '#5b8cff', 'Blue: up ↕ down', 'Corticospinal tract, brain to spinal cord');
        g.fillStyle = '#9aa3b1'; g.font = '22px Geist, system-ui, sans-serif'; g.fillText('Water spreads furthest along the fibres.', 60, 460);
      } else {
        frameBoard(g, W, H, 'Time-of-flight angiography');
        g.fillStyle = '#e8eef8'; g.font = '26px Geist, system-ui, sans-serif';
        ['Rapid pulses tire out the spins in the slice,', 'so still tissue goes dark.', 'Fresh blood flowing in has not been pulsed yet,', 'so it arrives with its full signal: bright.', '', 'No injected dye needed.'].forEach((t, i) => g.fillText(t, 60, 130 + i * 50));
      }
    });
    const brd = board(cv.tex, 4.6, (4.6 * H) / W); brd.position.set(3.1, 6.1, -1.9); brd.rotation.y = -0.25; root.add(brd);

    let acc = 0, bold = 0, spin = 0;
    const stepBold = (on) => {
      stimQ.copyWithin(1, 0); stimQ[0] = on ? 1 : 0;
      let c = 0; for (let i = 0; i < HLEN; i++) c += stimQ[i] * hrf(i * HDT) * HDT;
      bold = (c / HSUM) * BOLD_PEAK;
      hist.copyWithin(0, 1); hist[hist.length - 1] = bold;
      stimH.copyWithin(0, 1); stimH[stimH.length - 1] = on ? 1 : 0;
    };
    const api = {
      // Fill the chart as if the task had been running for a while (used by the video).
      primeBold(sec = 9) { for (let i = 0; i < hist.length; i++) stepBold(i >= hist.length - sec / HDT); },
    };
    return {
      ...api,
      update(dt, s) {
        dt = Math.max(0, dt); fitNarrow(stage);
        if (s.mode !== mode) { mode = s.mode; cv.redraw(); }
        fibres.visible = s.mode === 'dti'; vessels.visible = s.mode === 'mra';
        // fMRI clock: the chart runs at real speed.
        acc += dt;
        let changed = false;
        while (acc >= HDT) { acc -= HDT; stepBold(s.stim && s.mode === 'bold'); changed = true; }
        if (s.mode === 'bold' && changed) cv.redraw();
        for (const k in blobM) blobM[k].forEach((b) => { b.material.opacity = s.mode === 'bold' && s.task === k ? clamp(bold / BOLD_PEAK, 0, 1) * 0.95 : 0; b.scale.setScalar(0.8 + 0.3 * clamp(bold / BOLD_PEAK, 0, 1)); });
        const bp = blobs[s.task][0];
        lBlob.position.set(bp[0] * (s.task === 'see' ? 0 : 1), bp[1] + 0.75, bp[2]);
        lBlob.element.textContent = s.task === 'see' ? 'Visual cortex' : 'Left motor cortex (right hand)';
        lBlob.visible = s.mode === 'bold';
        // Water along the fibres.
        if (s.mode === 'dti') {
          spin += dt;
          const p = new THREE.Vector3();
          dotU.forEach((d, i) => { d.u = (d.u + dt * 0.12 * (i % 2 ? 1 : -1) + 1) % 1; bundles[d.b].curve.getPointAt(d.u, p); dots.place(i, [p.x, p.y, p.z]); });
          dots.done();
        }
        if (s.mode === 'mra') {
          const p = new THREE.Vector3();
          flowU.forEach((d, i) => { d.u = (d.u + dt * 0.45) % 1; paths[d.p].getPointAt(d.u, p); flow.place(i, [p.x, p.y, p.z]); });
          flow.done();
        }
      },
      readout: (s) => {
        if (s.mode === 'bold') return `<div class="big">BOLD signal ${bold >= 0 ? '+' : ''}${bold.toFixed(1)}%</div>
          <div class="row"><span>Rises after the task starts</span><b>peaks about 5 s later</b></div>
          <div class="row"><span>Oxygen-rich blood</span><b>not magnetic (diamagnetic)</b></div>
          <div class="row"><span>Oxygen-poor blood</span><b>slightly magnetic (paramagnetic)</b></div>
          <small>Canonical haemodynamic response; about ${BOLD_PEAK}% for a long task at 3 T.</small>`;
        // Diffusion: rms distance in one direction, √(2·D·t), for t = 50 ms.
        if (s.mode === 'dti') {
          const d = (D) => Math.sqrt(2 * D * 1e-6 * 0.05) * 1e6;   // D in mm²/s → µm
          return `<div class="big">Water wanders ${d(3.0e-3).toFixed(0)} µm in 50 ms</div>
            <div class="row"><span>Free water, 37 °C</span><b>D = 3.0 × 10⁻³ mm²/s</b></div>
            <div class="row"><span>In brain tissue</span><b>about 0.8 × 10⁻³ mm²/s (${d(0.8e-3).toFixed(0)} µm)</b></div>
            <div class="row"><span>In a fresh stroke</span><b>drops by a third to a half</b></div>`;
        }
        return `<div class="big">Flowing blood lights up</div>
          <div class="row"><span>Blood in the middle cerebral artery</span><b>about 60 cm/s</b></div>
          <div class="row"><span>Dye needed</span><b>no (time-of-flight)</b></div>
          <div class="row"><span>Shows</span><b>narrowing, aneurysms, blockages</b></div>`;
      },
    };
  },
};

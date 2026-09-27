// Chapter 4: finding position. Gradient coils add a slope to the field, so each position
// sings at its own frequency. The scanner fills k-space one line at a time; the picture is
// its 2D inverse Fourier transform. The FFT here is real (128 × 128), run in your browser.
import { THREE, M, sphere, arrow, canvasTexture } from '../kit.js';
import { greys, drawBrain, fft2, board, frameBoard, NUCLEI, fitNarrow } from '../mri.js';

const N = 128, NP = 9;
const SPAN = 0.2;                 // the row of spins spans ±10 cm (0.2 m in all)
const CEN = 10;                   // "centre of k-space": |kx|, |ky| below this many steps

export default {
  id: 'gradients',
  short: 'Finding position',
  title: 'How the scanner knows where',
  subtitle: 'Tilt the field, and frequency tells you position. Then a Fourier transform.',
  view: { pos: [-0.6, 5.6, 15.6], target: [-2.0, 4.6, 0] },
  learn: `<p>If the field were the same everywhere, every proton would sing at the same frequency and the scanner couldn't tell where anything was. So three <b>gradient coils</b> add a gentle slope to the field: a little stronger on one side, a little weaker on the other.</p>
    <p>First a gradient along the bore picks one <b>slice</b>: only protons whose frequency matches the RF pulse get tipped over. Then, while the echo is read, a <b>frequency-encoding</b> gradient makes the left side sing lower and the right side higher, like keys on a piano. A brief <b>phase-encoding</b> gradient, different every time, twists the spins up and down the picture.</p>
    <p>Each echo fills one line of a grid called <b>k-space</b>. It doesn't look like a body at all. After 128 or 256 lines, a <b>Fourier transform</b> turns it into the picture. The centre of k-space holds the overall brightness and <b>contrast</b>; the edges hold the <b>fine detail</b>.</p>
    <p>Switching the gradients on and off thousands of times a second makes the coils shove against the magnet's field (a <b>Lorentz force</b>), so they flex and bang. That's the loud knocking, often above 100 dB, which is why you get earplugs or headphones.</p>
    <p class="tip"><b>Try it:</b> play the scan and watch the picture appear as k-space fills. Then keep only the centre, or only the edges.</p>`,
  terms: [
    { t: 'Gradient', d: 'A field that changes steadily with position, added on top of the main field.' },
    { t: 'Slice selection', d: 'Using a gradient during the RF pulse so only one thin slab of the body is tipped over.' },
    { t: 'k-space', d: 'The grid of raw measurements. Each point says how much of one stripe pattern the picture contains.' },
    { t: 'Fourier transform', d: 'The maths that turns a mix of waves into the picture they add up to, and back.' },
    { t: 'Lorentz force', d: 'The push on a wire carrying current in a magnetic field. It makes the gradient coils knock.' },
  ],
  defaults: { mode: 'scan', lines: 128, play: true, G: 20, TR: 500 },
  controls: [
    { key: 'mode', type: 'seg', label: 'k-space used', options: [{ v: 'scan', label: 'Scan line by line' }, { v: 'centre', label: 'Centre only' }, { v: 'edges', label: 'Edges only' }] },
    { key: 'play', type: 'toggle', label: 'Play the scan' },
    { key: 'lines', type: 'range', label: 'Lines filled', min: 0, max: N, step: 1, fmt: (v) => Math.round(v) + ' of ' + N },
    { key: 'G', type: 'range', label: 'Gradient strength', min: 0, max: 40, step: 1, ends: ['off', 'strong'], fmt: (v) => v + ' mT/m' },
  ],
  quiz: [
    { q: 'How do gradient coils tell the scanner where a signal came from?', options: ['They take a photo', 'They make the field vary with position, so frequency depends on position', 'They move the patient', 'They block signals from other places'], answer: 1, why: 'A sloping field gives each position its own Larmor frequency, like keys on a piano.' },
    { q: 'You keep only the centre of k-space. What does the picture look like?', options: ['Sharp edges only', 'Blurry, but with the right brightness and contrast', 'Completely black', 'Upside down'], answer: 1, why: 'The centre holds the broad shapes and contrast; the fine detail lives at the edges.' },
    { q: 'What makes the loud knocking in an MRI scanner?', options: ['The main magnet switching on and off', 'Gradient coils flexing as their current is switched in the strong field', 'The table motor', 'Helium bubbling'], answer: 1, why: 'Current in a magnetic field feels a force. Switched fast, the coils vibrate like a loudspeaker.' },
  ],
  reel: [
    { ms: 6000, caption: 'Gradient coils give each place its own frequency, and each echo fills one line of k-space.', set: { mode: 'scan', play: false, G: 30 }, anim: { lines: [0, 128] }, view: { pos: [0, 4.4, 12], target: [0, 3.6, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);

    // --- The phantom and its k-space (computed once).
    const pc = document.createElement('canvas'); pc.width = pc.height = N;
    const pg = pc.getContext('2d');
    drawBrain(pg, 0, 0, N, N, greys(4000, 100));
    const px = pg.getImageData(0, 0, N, N).data;
    const Kr = new Float64Array(N * N), Ki = new Float64Array(N * N);
    for (let i = 0; i < N * N; i++) Kr[i] = px[i * 4] / 255;
    fft2(Kr, Ki, N, false);
    // Shifted index: display row/col r,c (0..N-1, centre at N/2) ↔ FFT index.
    const sh = (r) => (r + N / 2) % N;
    const logMag = new Float32Array(N * N); let lmax = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const i = sh(r) * N + sh(c); const m = Math.log(1 + Math.hypot(Kr[i], Ki[i])); logMag[r * N + c] = m; lmax = Math.max(lmax, m); }

    const keep = (r, c, s) => {
      const kx = c - N / 2, ky = r - N / 2;
      if (s.mode === 'centre') return Math.abs(kx) < CEN && Math.abs(ky) < CEN;
      if (s.mode === 'edges') return !(Math.abs(kx) < CEN && Math.abs(ky) < CEN);
      return r < Math.round(s.lines);
    };
    const kImg = new ImageData(N, N), iImg = new ImageData(N, N);
    const kc = document.createElement('canvas'); kc.width = kc.height = N;
    const ic = document.createElement('canvas'); ic.width = ic.height = N;
    const Rr = new Float64Array(N * N), Ri = new Float64Array(N * N);
    let key = '', curLine = -1;
    const recompute = (s) => {
      Rr.fill(0); Ri.fill(0);
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const on = keep(r, c, s), d = (r * N + c) * 4;
        const v = on ? Math.round((logMag[r * N + c] / lmax) * 255) : 0;
        const hl = s.mode === 'scan' && r === curLine;
        kImg.data[d] = hl ? 255 : v * 0.55; kImg.data[d + 1] = hl ? 181 : v * 0.95; kImg.data[d + 2] = hl ? 71 : v; kImg.data[d + 3] = 255;
        if (on) { const i = sh(r) * N + sh(c); Rr[i] = Kr[i]; Ri[i] = Ki[i]; }
      }
      fft2(Rr, Ri, N, true);
      let max = 1e-9; const mag = new Float64Array(N * N);
      for (let i = 0; i < N * N; i++) { mag[i] = Math.hypot(Rr[i], Ri[i]); max = Math.max(max, mag[i]); }
      if (s.mode === 'scan') max = Math.max(max, 0.35);
      for (let i = 0; i < N * N; i++) { const v = Math.min(255, Math.round((mag[i] / max) * 255)); iImg.data[i * 4] = iImg.data[i * 4 + 1] = iImg.data[i * 4 + 2] = v; iImg.data[i * 4 + 3] = 255; }
      kc.getContext('2d').putImageData(kImg, 0, 0); ic.getContext('2d').putImageData(iImg, 0, 0);
      kB.redraw(); iB.redraw();
    };
    const W = 560, H = 640;
    const drawPanel = (src, title, sub) => (g) => {
      frameBoard(g, W, H, title);
      g.imageSmoothingEnabled = false;
      g.drawImage(src, 24, 70, 512, 512);
      g.fillStyle = '#9aa3b1'; g.font = '22px Geist, system-ui, sans-serif'; g.fillText(sub, 24, 616);
    };
    const kB = canvasTexture(W, H, drawPanel(kc, 'k-space (raw echoes)', 'Centre: contrast · edges: fine detail'));
    const iB = canvasTexture(W, H, drawPanel(ic, 'The picture', 'Inverse 2D Fourier transform, 128 × 128'));
    const kM = board(kB.tex, 3.5, 4); kM.position.set(-2.0, 5.3, -0.4); kM.rotation.y = 0.1; root.add(kM);
    const iM = board(iB.tex, 3.5, 4); iM.position.set(2.0, 5.3, -0.4); iM.rotation.y = -0.1; root.add(iM);
    const fArrow = arrow(0xffb547, 0.9, 0.25, 0.05); fArrow.rotation.z = -Math.PI / 2; fArrow.position.set(-0.45, 5.3, 0); root.add(fArrow);
    stage.label('FFT', [0, 5.75, 0], root, 'hot');

    // --- A row of spins across the head, with the field at each one.
    const spins = [], fields = [];
    const bar = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.06, 1.2), M.ghost(0x8ef0ff, 0.12)); bar.position.set(0, 0.9, 0); root.add(bar);
    for (let i = 0; i < NP; i++) {
      const x = -4 + i;
      const g = new THREE.Group(); g.position.set(x, 1.55, 0.6); root.add(g);
      g.add(sphere(0.16, M.plastic(0xff6b6b, { roughness: 0.3 }), 16));
      const a = arrow(0xffcf6b, 0.55, 0.18, 0.03); a.rotation.x = Math.PI / 2; const hold = new THREE.Group(); hold.add(a); g.add(hold);
      spins.push({ x: (i / (NP - 1) - 0.5) * SPAN, hold, phi: 0 });
      const f = arrow(0x8ef0ff, 1, 0.2, 0.03); f.position.set(x, 0.95, -0.35); root.add(f); fields.push(f);
    }
    const lLo = stage.label('', [-4, 0.45, 0.6], root);
    const lHi = stage.label('', [4, 0.45, 0.6], root, 'hot');
    stage.label('Field (exaggerated)', [-4.4, 2.2, -0.35], root);

    let acc = 0;
    return {
      update(dt, s) {
        dt = Math.max(0, dt); fitNarrow(stage);
        if (s.play && s.mode === 'scan') { acc += dt * 24; if (acc >= 1) { const n = Math.floor(acc); acc -= n; s.lines = s.lines >= N ? 0 : Math.min(N, s.lines + n); } }
        curLine = s.mode === 'scan' && s.lines < N ? Math.round(s.lines) : -1;
        const k = `${s.mode}|${Math.round(s.lines)}`;
        if (k !== key) { key = k; recompute(s); }
        // Spins in the frame that rides along at the centre frequency: the offset is γ·G·x.
        spins.forEach((p, i) => {
          const df = NUCLEI.H1.f * 1e6 * (s.G / 1000) * p.x;          // Hz
          p.phi -= df * 1.2e-4 * dt * Math.PI * 2;                       // drawn about 8,000 times slower
          p.hold.rotation.y = p.phi;
          fields[i].set(0.5 + 0.9 + (s.G / 40) * p.x * 12);
        });
        const edge = NUCLEI.H1.f * 1e6 * (s.G / 1000) * (SPAN / 2);
        lLo.element.textContent = s.G ? `−${(edge / 1000).toFixed(0)} kHz` : 'same frequency';
        lHi.element.textContent = s.G ? `+${(edge / 1000).toFixed(0)} kHz` : 'same frequency';
      },
      readout: (s) => {
        const perCm = NUCLEI.H1.f * 1e3 * (s.G / 1000) * 0.01;           // kHz per cm
        const lines = s.mode === 'scan' ? Math.round(s.lines) : s.mode === 'centre' ? 2 * CEN - 1 : N;
        return `<div class="big">${s.mode === 'scan' ? `${lines} of ${N} lines` : s.mode === 'centre' ? 'Centre only: contrast, no detail' : 'Edges only: detail, no contrast'}</div>
          <div class="row"><span>Gradient ${s.G} mT/m</span><b>${perCm.toFixed(1)} kHz per cm</b></div>
          <div class="row"><span>${N} lines × TR ${s.TR} ms</span><b>${Math.round((N * s.TR) / 1000)} s per scan</b></div>
          <div class="row"><span>Gradient knocking</span><b>often over 100 dB</b></div>`;
      },
    };
  },
};

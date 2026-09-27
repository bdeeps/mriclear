// Chapter 3: the radio pulse and the echo. A 90° pulse tips the magnetisation sideways; the spins
// fan out and the signal fades (T2) while the magnetisation grows back along the field (T1).
// A 180° pulse at TE/2 flips the fan so it refocuses into an echo at TE (Hahn, 1950).
// Picking TR and TE sets the contrast: S = PD·(1 − e^(−TR/T1))·e^(−TE/T2).
import { THREE, M, arrow, torus, beam, canvasTexture, approach, clamp } from '../kit.js';
import { TISSUES, signal, greys, drawBrain, board, frameBoard, fitNarrow } from '../mri.js';

const R = 2.1;                           // Bloch-sphere radius on screen
const NI = 9;                            // isochromats (little groups of spins) drawn
const weighting = (TR, TE) => (TR <= 900 && TE <= 30 ? 'T1-weighted' : TR >= 2000 && TE >= 70 ? 'T2-weighted' : TR >= 2000 && TE <= 30 ? 'Proton-density weighted' : 'Mixed contrast');

export default {
  id: 'echo',
  short: 'Pulse and echo',
  title: 'A radio pulse, and an echo',
  subtitle: 'Knock the spins over, listen as they fade and recover. Timing sets the contrast.',
  view: { pos: [-0.4, 6.0, 16.0], target: [-1.6, 5.0, 0] },
  learn: `<p>The scanner sends a short burst of radio waves, an <b>RF pulse</b>, at exactly the Larmor frequency. The spins soak it up, like a swing pushed in time, and their net magnetisation tips over by 90°. Now it spins sideways, and a spinning magnet makes a radio signal in the coil. That is the <b>MR signal</b>.</p>
    <p>It doesn't last. Neighbouring spins feel slightly different fields, so they drift out of step and fan out: the signal fades. That is <b>T2</b> decay. Meanwhile the magnetisation slowly grows back along the field: that is <b>T1</b> recovery. A second, 180° pulse flips the fan over so the spins catch up with each other and briefly line up again: a <b>spin echo</b>.</p>
    <p>Every tissue has its own T1 and T2. Fat recovers fast; the fluid round your brain (<b>CSF</b>) is slow to recover and slow to fade. The operator picks the <b>repetition time TR</b> and the <b>echo time TE</b>. Short TR and short TE make a <b>T1-weighted</b> image: fat bright, fluid dark. Long TR and long TE make a <b>T2-weighted</b> one: fluid bright.</p>
    <p class="tip"><b>Try it:</b> press T1-weighted, then T2-weighted, and watch the fluid in the brain picture flip from dark to bright.</p>`,
  terms: [
    { t: 'RF pulse', d: 'A short burst of radio waves at the Larmor frequency that tips the spins over.' },
    { t: 'T1 (recovery)', d: 'How quickly magnetisation grows back along the field. About 63% is back after one T1.' },
    { t: 'T2 (decay)', d: 'How quickly the sideways signal fades as spins drift out of step. About 37% is left after one T2.' },
    { t: 'TR and TE', d: 'Repetition time (between pulses) and echo time (pulse to echo). Together they set the contrast.' },
    { t: 'Spin echo', d: 'A 180° pulse makes fanned-out spins line up again, so the signal comes back briefly.' },
  ],
  defaults: { TR: 500, TE: 15, tissue: 'fat' },
  onChange(s) { s.TE = Math.min(s.TE, Math.round(s.TR / 2)); },
  controls: [
    { key: 'TR', type: 'log', label: 'Repetition time TR', min: 200, max: 5000, ends: ['short', 'long'], fmt: (v) => Math.round(v) + ' ms' },
    { key: 'TE', type: 'range', label: 'Echo time TE', min: 10, max: 200, step: 1, ends: ['short', 'long'], fmt: (v) => Math.round(v) + ' ms' },
    { key: 'tissue', type: 'seg', label: 'Spins shown', options: Object.entries(TISSUES).map(([v, t]) => ({ v, label: t.name.replace(' matter', '').replace('Fluid (CSF)', 'Fluid') })) },
    { type: 'buttons', label: 'Presets', items: [
      { label: 'T1-weighted', act: (s) => { s.TR = 500; s.TE = 15; } },
      { label: 'T2-weighted', act: (s) => { s.TR = 4000; s.TE = 100; } },
      { label: 'Proton density', act: (s) => { s.TR = 3000; s.TE = 15; } },
    ] },
  ],
  quiz: [
    { q: 'What does the 90° RF pulse do?', options: ['Heats the tissue to make it glow', 'Tips the net magnetisation sideways so it gives off a radio signal', 'Switches the magnet off', 'Takes an X-ray'], answer: 1, why: 'Tipped sideways, the magnetisation spins round the field and induces a signal in the coil.' },
    { q: 'On a T2-weighted scan, what does fluid such as CSF look like?', options: ['Bright', 'Black', 'Exactly like fat', 'Invisible'], answer: 0, why: 'CSF has a very long T2, so it still has plenty of signal at a long TE.' },
    { q: 'Why does the signal fade after the pulse?', options: ['The magnet weakens', 'Spins drift out of step and cancel each other (T2)', 'The patient moves', 'The coil runs out of battery'], answer: 1, why: 'Each spin feels a slightly different field, so they fan out and their signals cancel.' },
  ],
  reel: [
    { ms: 5600, caption: 'A radio pulse tips the spins over. They fan out and fade, then an echo brings them back.', set: { TR: 900, TE: 60, tissue: 'gm' }, act: (s, inst) => inst.restart(), view: { pos: [0.2, 6.2, 13.5], target: [0.2, 5.4, 0] }, spin: 0 },
    { ms: 5400, caption: 'Change the timing and the picture changes: fluid goes from dark to bright.', set: { TE: 15, tissue: 'csf' }, anim: { TR: [500, 4000, true], TE: [15, 100] }, act: (s, inst) => inst.restart(), view: { pos: [0.6, 5.2, 11.5], target: [0.6, 4.4, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    // The Bloch sphere: B0 up, the transverse plane as a ring.
    const C = new THREE.Vector3(-3.2, 3.0, 0);
    const bloch = new THREE.Group(); bloch.position.copy(C); root.add(bloch);
    const shellM = new THREE.Mesh(new THREE.SphereGeometry(R, 40, 20), M.ghost(0x8ef0ff, 0.05)); bloch.add(shellM);
    const ring = torus(R, 0.015, M.glow(0x8ef0ff, { transparent: true, opacity: 0.55 }), 96); ring.rotation.x = Math.PI / 2; bloch.add(ring);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(R, 64), M.ghost(0x8ef0ff, 0.07)); disc.rotation.x = -Math.PI / 2; bloch.add(disc);
    bloch.add(beam([0, -R, 0], [0, R, 0], 0.012, M.glow(0x5a6170)));
    const b0 = arrow(0x8ef0ff, 0.9, 0.22, 0.04); b0.position.set(0, R + 0.1, 0); bloch.add(b0);
    stage.label('<b>B₀</b>', [0.35, R + 0.8, 0], bloch, 'hot');
    stage.label('Sideways: this makes the signal', [0, -0.25, R + 0.3], bloch);
    const pulseRing = torus(R * 1.08, 0.06, M.glow(0xffb547, { transparent: true, opacity: 0 }), 96); pulseRing.rotation.x = Math.PI / 2; bloch.add(pulseRing);
    const isos = [];
    for (let i = 0; i < NI; i++) { const a = arrow(0xffcf6b, R, 0.28, 0.04); bloch.add(a); isos.push(a); }
    const sum = arrow(0xffffff, R, 0.34, 0.07); bloch.add(sum);
    const lEvent = stage.label('', [0, -R - 0.55, 0], bloch, 'hot');
    const lClock = stage.label('', [0, -R - 1.05, 0], bloch);

    // Board: T1 recovery and T2 decay curves on top, the brain picture below.
    const W = 1024, H = 1024;
    let cur = { TR: 0, TE: 0 };
    const cv = canvasTexture(W, H, (g) => {
      frameBoard(g, W, H, '');
      const { TR, TE } = cur;
      const plot = (x0, y0, w, h, tmax, fn, mark, title, xlab) => {
        g.fillStyle = '#e8eef8'; g.font = '600 28px Geist, system-ui, sans-serif'; g.fillText(title, x0, y0 - 16);
        g.strokeStyle = '#5a6170'; g.lineWidth = 2; g.strokeRect(x0, y0, w, h);
        for (const [k, t] of Object.entries(TISSUES)) {
          g.strokeStyle = t.color; g.lineWidth = 4; g.beginPath();
          for (let i = 0; i <= 120; i++) { const tt = (tmax * i) / 120, y = y0 + h - fn(t, tt) * h; i ? g.lineTo(x0 + (w * i) / 120, y) : g.moveTo(x0, y); }
          g.stroke();
          const mx = x0 + (w * Math.min(mark, tmax)) / tmax, my = y0 + h - fn(t, Math.min(mark, tmax)) * h;
          g.fillStyle = t.color; g.beginPath(); g.arc(mx, my, 9, 0, Math.PI * 2); g.fill();
        }
        const mx = x0 + (w * Math.min(mark, tmax)) / tmax;
        g.strokeStyle = '#ffffff'; g.setLineDash([8, 8]); g.lineWidth = 2; g.beginPath(); g.moveTo(mx, y0); g.lineTo(mx, y0 + h); g.stroke(); g.setLineDash([]);
        g.fillStyle = '#9aa3b1'; g.font = '22px Geist, system-ui, sans-serif'; g.fillText(xlab, x0, y0 + h + 30);
      };
      plot(50, 80, 430, 300, 5000, (t, tt) => t.PD * (1 - Math.exp(-tt / t.T1)), TR, 'T1: growing back', `0 → 5,000 ms · line at TR ${Math.round(TR)} ms`);
      plot(544, 80, 430, 300, 300, (t, tt) => signal(t, TR, tt), TE, 'T2: fading after the pulse', `0 → 300 ms · line at TE ${Math.round(TE)} ms`);
      // Legend.
      let lx = 50; g.font = '24px Geist, system-ui, sans-serif';
      for (const t of Object.values(TISSUES)) { g.fillStyle = t.color; g.fillRect(lx, 452, 22, 22); g.fillStyle = '#e8eef8'; g.fillText(t.name, lx + 30, 472); lx += g.measureText(t.name).width + 70; }
      // The picture.
      const v = greys(TR, TE);
      drawBrain(g, 60, 510, 440, 480, v);
      g.fillStyle = '#e8eef8'; g.font = '600 34px Geist, system-ui, sans-serif'; g.fillText(weighting(TR, TE), 540, 560);
      g.font = '24px Geist, system-ui, sans-serif'; g.fillStyle = '#9aa3b1'; g.fillText('Signal, brightest = 100%', 540, 600);
      let y = 640;
      for (const [k, t] of Object.entries(TISSUES)) {
        g.fillStyle = '#cfd8e6'; g.fillText(t.name, 540, y + 22);
        g.fillStyle = '#2a3140'; g.fillRect(720, y, 240, 30);
        const gv = Math.round(v[k] * 255); g.fillStyle = `rgb(${gv},${gv},${gv})`; g.fillRect(720, y, 240 * v[k], 30);
        g.strokeStyle = t.color; g.lineWidth = 2; g.strokeRect(720, y, 240, 30);
        y += 56;
      }
      g.fillStyle = '#9aa3b1'; g.font = '22px Geist, system-ui, sans-serif';
      g.fillText('Bone and air: almost no signal', 540, y + 20);
      g.fillText('S = PD · (1 − e^(−TR/T1)) · e^(−TE/T2)', 540, y + 60);
    });
    const brd = board(cv.tex, 6.6, 6.6); brd.position.set(3.6, 3.9, -0.6); brd.rotation.y = -0.18; root.add(brd);

    // The animation clock: a slowed-down pass through one TR. The first 1.5·TE takes 3 s, the rest 2.5 s.
    let clk = 0;
    const delta = Array.from({ length: NI }, (_, i) => (i - (NI - 1) / 2) / ((NI - 1) / 2));
    const up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), vs = new THREE.Vector3();
    const api = { restart() { clk = 0; } };
    return {
      ...api,
      update(dt, s) {
        dt = Math.max(0, dt); fitNarrow(stage);
        if (Math.round(s.TR) !== cur.TR || Math.round(s.TE) !== cur.TE) { cur = { TR: Math.round(s.TR), TE: Math.round(s.TE) }; cv.redraw(); }
        // On a tall screen (a phone video), stack the sphere above the board.
        const tall = stage.camera.aspect < 0.8;
        bloch.position.set(tall ? 0 : C.x, tall ? 8.6 : C.y, 0);
        brd.position.set(tall ? 0 : 3.6, tall ? 3.3 : 3.9, -0.6); brd.rotation.y = tall ? 0 : -0.18;
        const t = TISSUES[s.tissue] || TISSUES.fat, TE = s.TE, TR = s.TR;
        clk = (clk + dt) % 5.5;
        const tau = clk < 3 ? (clk / 3) * 1.5 * TE : 1.5 * TE + ((clk - 3) / 2.5) * (TR - 1.5 * TE);
        // Magnetisation just before the 90° pulse, in the steady state of a spin-echo train.
        const E1 = Math.exp(-TR / t.T1), Eh = Math.exp(-(TR - TE / 2) / t.T1);
        const Mz0 = 1 - 2 * Eh + E1;
        const Mxy = Mz0 * Math.exp(-tau / t.T2);
        let Mz;
        if (tau < TE / 2) Mz = 1 - Math.exp(-tau / t.T1);
        else { const mh = 1 - Math.exp(-TE / 2 / t.T1); Mz = 1 - (1 + mh) * Math.exp(-(tau - TE / 2) / t.T1); }
        // Fanning: each isochromat's phase grows with time; the 180° pulse at TE/2 mirrors it.
        const k = Math.PI / (TE / 2);
        vs.set(0, 0, 0);
        const tint = new THREE.Color(t.color);
        isos.forEach((a, i) => {
          const phi = tau < TE / 2 ? delta[i] * k * tau : delta[i] * k * (tau - TE);
          v.set(Math.sin(phi) * Mxy, Mz, Math.cos(phi) * Mxy);
          vs.add(v);
          const L = v.length();
          a.set(Math.max(0.03, L * R)); a.quaternion.setFromUnitVectors(up, v.clone().normalize());
          a.children.forEach((m) => m.material.color.copy(tint));
        });
        vs.multiplyScalar(1 / NI);
        sum.set(Math.max(0.03, vs.length() * R)); sum.quaternion.setFromUnitVectors(up, vs.clone().normalize());
        // Pulse flashes and the event label.
        const near = (x, w) => Math.abs(tau - x) < w;
        const flash = near(0, TE * 0.08) ? 1 : near(TE / 2, TE * 0.06) ? 0.8 : 0;
        pulseRing.material.opacity = approach(pulseRing.material.opacity, flash, 20, dt);
        lEvent.element.textContent = tau < TE * 0.12 ? '90° pulse: tipped over' : tau < TE / 2 - TE * 0.05 ? 'Fanning out (signal fades)' : tau < TE / 2 + TE * 0.08 ? '180° pulse: fan flipped' : tau < TE * 0.92 ? 'Catching up…' : tau < TE * 1.1 ? 'Echo! Signal read now' : 'Growing back along B₀ (T1)';
        lClock.element.textContent = `t = ${Math.round(tau)} ms of TR ${Math.round(TR)} ms`;
      },
      readout: (s) => {
        const v = greys(s.TR, s.TE);
        const order = Object.keys(TISSUES).sort((a, b) => v[b] - v[a]);
        return `<div class="big">${weighting(s.TR, s.TE)}</div>
          <div class="row"><span>TR / TE</span><b>${Math.round(s.TR)} / ${Math.round(s.TE)} ms</b></div>
          <div class="row"><span>Brightest</span><b>${TISSUES[order[0]].name}</b></div>
          <div class="row"><span>Darkest tissue</span><b>${TISSUES[order.at(-1)].name}</b></div>
          <small>Typical 1.5 T values, e.g. fat T1 250 ms, CSF T1 4,200 ms.</small>`;
      },
    };
  },
};

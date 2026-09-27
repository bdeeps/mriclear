// Chapter 2: protons are tiny spinning magnets. In a strong field a tiny excess lines up with it,
// and every one of them wobbles (precesses) at the Larmor frequency f = (γ/2π)·B.
import { THREE, M, sphere, arrow, canvasTexture, approach, clamp } from '../kit.js';
import { NUCLEI, EARTH, excess, PROTONS_PER_ML, GAMMA_H, board, frameBoard, fmtHz, sci, fitNarrow } from '../mri.js';

const NX = 5, NY = 3, NZ = 4, N = NX * NY * NZ;
const SPIN_VIS = 0.9;            // on-screen precession: 0.9 rad/s per tesla (the real thing is 400 million times faster)

export default {
  id: 'spins',
  short: 'Spinning protons',
  title: 'Your body is full of tiny magnets',
  subtitle: 'Hydrogen nuclei line up, very slightly, and wobble at a radio frequency.',
  view: { pos: [0.2, 6.6, 15.2], target: [-2.6, 4.9, 0] },
  learn: `<p>About two thirds of the atoms in your body are <b>hydrogen</b>, mostly in water and fat. The nucleus of a hydrogen atom is a single <b>proton</b>, and a proton behaves like a tiny spinning bar magnet.</p>
    <p>Normally these little magnets point every which way, so they cancel out. Put them in a strong field, <b>B₀</b>, and slightly more of them settle pointing along it than against it. Only slightly: at 1.5 T the excess is about <b>5 in every million</b>. But a millilitre of water holds about 67,000 billion billion protons, so even that tiny excess adds up to a measurable <b>net magnetisation</b>.</p>
    <p>The protons don't just line up. Like a spinning top leaning in gravity, each one <b>precesses</b>: it wobbles round the field direction. The wobble rate is the <b>Larmor frequency</b>, and it is set by the field: <b>f = 42.58 MHz per tesla × B₀</b>. That is 63.9 MHz at 1.5 T and 127.7 MHz at 3 T, right among FM radio and aircraft radio.</p>
    <p class="tip"><b>Try it:</b> slide the magnet from Earth's field up to 7 T. Watch the wobble speed up, and more spins lean the same way.</p>`,
  terms: [
    { t: 'Proton', d: 'The nucleus of a hydrogen atom. It spins and acts like a tiny magnet.' },
    { t: 'B₀', d: 'The strong, steady field of the main magnet. It points along the bore.' },
    { t: 'Precession', d: 'The wobble of a spinning thing round a direction, like a top leaning in gravity.' },
    { t: 'Larmor frequency', d: 'How many times a second the protons precess: 42.58 MHz for every tesla of field.' },
    { t: 'Net magnetisation', d: 'The sum of all the tiny magnets. It points along B₀ and grows with the field.' },
  ],
  defaults: { B0: 1.5, nuc: 'H1' },
  controls: [
    { key: 'B0', type: 'range', label: 'Magnet strength B₀', min: 0, max: 7, step: 0.05, ends: ['Earth only', '7 T'], fmt: (v) => (v < 0.01 ? 'Earth, 50 µT' : v.toFixed(2) + ' T') },
    { key: 'nuc', type: 'seg', label: 'Nucleus', options: Object.entries(NUCLEI).map(([v, n]) => ({ v, label: n.label })), fmt: (v) => NUCLEI[v].name },
    { type: 'buttons', label: 'Scanner sizes', items: [
      { label: '0.55 T', act: (s) => { s.B0 = 0.55; } },
      { label: '1.5 T', act: (s) => { s.B0 = 1.5; } },
      { label: '3 T', act: (s) => { s.B0 = 3; } },
      { label: '7 T', act: (s) => { s.B0 = 7; } },
    ] },
  ],
  quiz: [
    { q: 'What in your body does a standard MRI scan detect?', options: ['Electrons in your bones', 'Hydrogen nuclei (protons), mostly in water and fat', 'Iron in your blood only', 'Heat'], answer: 1, why: 'Hydrogen is everywhere in soft tissue, and each nucleus is a tiny magnet.' },
    { q: 'What is the Larmor frequency of protons in a 3 T scanner?', options: ['About 3 Hz', 'About 64 MHz', 'About 128 MHz', 'About 3 GHz'], answer: 2, why: '42.58 MHz per tesla × 3 T ≈ 127.7 MHz.' },
    { q: 'At 1.5 T, roughly how many extra protons in a million line up with the field?', options: ['About 5', 'About 500', 'About half a million', 'All of them'], answer: 0, why: 'Body heat jostles them. Only a few per million win, but there are so many protons that it adds up.' },
  ],
  reel: [
    { ms: 5200, caption: 'Every hydrogen nucleus in your body is a tiny spinning magnet.', set: { nuc: 'H1', B0: 0 }, view: { pos: [0.4, 6.2, 11.5], target: [-0.6, 4.3, 0] }, spin: 0.25 },
    { ms: 5600, caption: 'In the scanner a few per million line up, and all of them wobble at 64 million times a second.', set: { nuc: 'H1' }, anim: { B0: [0, 1.5] }, view: { pos: [0.4, 6.2, 11.5], target: [-0.6, 4.3, 0] }, spin: 0.2 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    // The protons.
    const P = [];
    const protonMat = M.plastic(0xff6b6b, { roughness: 0.3 });
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < N; i++) {
      const ix = i % NX, iy = Math.floor(i / NX) % NY, iz = Math.floor(i / (NX * NY));
      const g = new THREE.Group();
      g.position.set(-3.0 + ix * 1.3 + (rnd() - 0.5) * 0.3, 1.6 + iy * 1.5 + (rnd() - 0.5) * 0.3, -2.2 + iz * 1.45 + (rnd() - 0.5) * 0.3);
      const ball = sphere(0.17, protonMat, 16); g.add(ball);
      const holder = new THREE.Group(); g.add(holder);
      const a = arrow(0xffb547, 0.95, 0.24, 0.035); a.position.y = -0.45; holder.add(a);
      root.add(g);
      const c = 2 * rnd() - 1;
      P.push({ g, holder, c0: c, c, phi: rnd() * Math.PI * 2 });
    }
    // B0 arrow and the net magnetisation arrow.
    const bArrow = arrow(0x8ef0ff, 3, 0.5, 0.09); bArrow.position.set(-4.7, 1.2, 0); root.add(bArrow);
    const lB = stage.label('', [-4.7, 0.7, 0], root, 'hot');
    const mArrow = arrow(0xffcf6b, 1, 0.4, 0.1); mArrow.position.set(3.6, 1.2, 0); root.add(mArrow);
    const lM = stage.label('Net magnetisation M', [3.6, 0.7, 0], root);
    const lNote = stage.label('', [0, 0.4, 2.9], root);
    // A radio dial: where the Larmor frequency sits among everyday radio.
    const W = 1024, H = 300;
    let dial = { f: 63.9 };
    const cv = canvasTexture(W, H, (g) => {
      frameBoard(g, W, H, 'Where the signal sits on the radio dial');
      const x0 = 50, x1 = W - 40, y = 190, fmax = 320;
      const X = (f) => x0 + ((x1 - x0) * f) / fmax;
      const band = (a, b, col, t) => { g.fillStyle = col; g.fillRect(X(a), y - 50, X(b) - X(a), 50); g.fillStyle = '#cfd8e6'; g.font = '22px Geist, system-ui, sans-serif'; g.fillText(t, X(a) + 4, y - 60); };
      band(88, 108, 'rgba(196,155,255,0.45)', 'FM radio');
      band(108, 137, 'rgba(92,225,169,0.35)', 'Aircraft');
      band(174, 230, 'rgba(255,181,71,0.3)', 'DAB radio');
      g.strokeStyle = '#8b93a1'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
      g.fillStyle = '#8b93a1'; g.font = '20px Geist, system-ui, sans-serif';
      for (let f = 0; f <= fmax; f += 50) { g.fillRect(X(f) - 1, y, 2, 12); g.fillText(f + ' MHz', X(f) - 24, y + 36); }
      const fx = X(clamp(dial.f, 0, fmax));
      g.fillStyle = '#ff6b6b'; g.beginPath(); g.moveTo(fx, y + 4); g.lineTo(fx - 14, y + 30); g.lineTo(fx + 14, y + 30); g.fill();
      g.fillRect(fx - 2, y - 80, 4, 84);
      g.font = '600 26px Geist, system-ui, sans-serif'; g.fillText(dial.f > 0.1 ? dial.f.toFixed(1) + ' MHz' : fmtHz(dial.f * 1e6), Math.min(fx + 8, x1 - 130), y - 88);
    });
    const dialMesh = board(cv.tex, 7.2, 7.2 * H / W); dialMesh.position.set(1.6, 7.0, -3.6); root.add(dialMesh);

    let shownF = -1, b = 0, t = 0;
    const up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3();
    return {
      update(dt, s) {
        dt = Math.max(0, dt); fitNarrow(stage); t += dt;
        const nuc = NUCLEI[s.nuc] || NUCLEI.H1, rel = nuc.f / NUCLEI.H1.f;
        // How strongly the spins lean, drawn hugely exaggerated so it can be seen.
        b = approach(b, Math.min(0.8, s.B0 * 0.13 * rel), 1.5, dt);
        const w = s.B0 * SPIN_VIS * rel;
        for (const p of P) {
          p.c = (p.c0 + b) / (1 + b * p.c0);
          p.phi -= w * dt;                                   // protons precess clockwise seen from the tip of B0
          const sn = Math.sqrt(1 - p.c * p.c);
          v.set(sn * Math.cos(p.phi), p.c, sn * Math.sin(p.phi));
          p.holder.quaternion.setFromUnitVectors(up, v);
        }
        bArrow.set(1.2 + s.B0 * 0.55);
        lB.element.innerHTML = `<b>B₀</b> ${s.B0 < 0.01 ? 'Earth only' : s.B0.toFixed(2) + ' T'}`;
        mArrow.set(Math.max(0.03, s.B0 * 0.5 * rel * rel));
        lNote.element.textContent = s.B0 < 0.01 ? 'Random: the tiny magnets cancel out' : 'The lean is drawn tens of thousands of times bigger than real';
        const f = nuc.f * Math.max(s.B0, EARTH);
        if (Math.abs(f - shownF) > 0.05 || (s.B0 < 0.01 && shownF !== f)) { shownF = f; dial.f = f; cv.redraw(); }
      },
      readout: (s) => {
        const nuc = NUCLEI[s.nuc] || NUCLEI.H1, B = Math.max(s.B0, EARTH);
        const f = nuc.f * B * 1e6;
        const ex = excess(B, (GAMMA_H * nuc.f) / NUCLEI.H1.f);
        return `<div class="big">${nuc.label} precesses at ${fmtHz(f)}</div>
          <div class="row"><span>f = ${nuc.f.toFixed(2)} MHz/T × ${s.B0 < 0.01 ? '50 µT' : s.B0.toFixed(2) + ' T'}</span><b>${(f / 1e6 >= 1 ? (f / 1e6).toFixed(1) + ' million' : Math.round(f).toLocaleString('en-US')) + ' wobbles a second'}</b></div>
          <div class="row"><span>Extra spins along the field</span><b>${(ex * 1e6).toFixed(ex * 1e6 < 0.1 ? 4 : 1)} per million</b></div>
          ${s.nuc === 'H1' ? `<div class="row"><span>In 1 mL of water, that is</span><b>${sci(ex * PROTONS_PER_ML)} protons</b></div>` : `<small>${nuc.name}: ${nuc.note}.</small>`}
          ${s.B0 >= 0.01 ? `<div class="row"><span>Field vs Earth’s</span><b>${Math.round(s.B0 / EARTH).toLocaleString('en-US')}×</b></div>` : ''}`;
      },
    };
  },
};

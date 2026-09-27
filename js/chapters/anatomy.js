// Chapter 1: inside an MRI scanner. A superconducting magnet in a helium flask, gradient coils,
// RF coils, the bore and the table, all inside a copper-lined room.
import { THREE, M, tube, exploder, approach } from '../kit.js';
import { makeScanner, faradayWalls, YC, NUCLEI, EARTH, fitNarrow } from '../mri.js';

export default {
  id: 'anatomy',
  short: 'Inside the scanner',
  title: 'Inside an MRI scanner',
  subtitle: 'A giant magnet that is always on, three coils that tilt its field, and a radio.',
  view: { pos: [5.0, 8.3, 20.5], target: [-2.6, 5.5, -0.6] },
  learn: `<p>An MRI scanner is a huge <b>magnet</b> with a tunnel through it, called the <b>bore</b>. It is about 70 cm wide. You lie on a <b>table</b> that slides you in.</p>
    <p>The magnet is made of coils of <b>niobium-titanium</b> wire. Cooled in <b>liquid helium</b> to about 4 K (−269 °C), the wire becomes a <b>superconductor</b>: current flows round it with no resistance at all, so the magnet stays on day and night without a power supply. The helium sits in a giant vacuum flask, the <b>cryostat</b>, and a <b>cold head</b> on top keeps it from boiling away. A clinical magnet makes <b>1.5 or 3 tesla</b>, roughly 30,000 to 60,000 times Earth's field.</p>
    <p>Inside the magnet sit three <b>gradient coils</b> (x, y and z) that tilt the field slightly so the scanner can tell where signals come from. Inside those is the <b>RF body coil</b>, a radio antenna that sends pulses and listens for echoes. A smaller <b>head coil</b> listens closely to your head.</p>
    <p>The whole room is a <b>Faraday cage</b> lined with copper, so that taxi radios and FM stations don't leak in. A <b>quench pipe</b> runs to the roof, ready to vent helium gas safely.</p>
    <p class="tip"><b>Try it:</b> take the scanner apart, then switch on <b>Scanning</b> and watch the coils work.</p>`,
  terms: [
    { t: 'Tesla (T)', d: 'The unit of magnetic field strength. Earth’s field is about 0.00005 T; a hospital MRI is 1.5 or 3 T.' },
    { t: 'Superconductor', d: 'A material that, when cold enough, carries electric current with zero resistance.' },
    { t: 'Cryostat', d: 'A giant vacuum flask that keeps the magnet’s coils bathed in liquid helium.' },
    { t: 'Gradient coils', d: 'Three coils that make the field slightly stronger on one side than the other, to encode position.' },
    { t: 'RF coil', d: 'A radio antenna that sends pulses into the body and picks up the faint signal that comes back.' },
  ],
  defaults: { explode: 0, xray: true, scan: true, room: true, B0: 1.5 },
  controls: [
    { key: 'explode', type: 'range', label: 'Take it apart', min: 0, max: 1, step: 0.01, ends: ['together', 'exploded'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'xray', type: 'toggle', label: 'X-ray the covers', hint: 'See through the plastic cover and the steel cryostat.' },
    { key: 'scan', type: 'toggle', label: 'Scanning', hint: 'The gradient coils pulse and the RF coils send and listen.' },
    { key: 'room', type: 'toggle', label: 'Show the Faraday cage' },
    { key: 'B0', type: 'seg', label: 'Magnet', options: [{ v: 1.5, label: '1.5 T' }, { v: 3, label: '3 T' }] },
  ],
  quiz: [
    { q: 'Why is the magnet’s wire kept in liquid helium?', options: ['To stop it rusting', 'So it becomes a superconductor with zero resistance', 'To make the patient cooler', 'Helium makes the images brighter'], answer: 1, why: 'At about 4 K, niobium-titanium superconducts. The current flows forever without a power supply.' },
    { q: 'How strong is a 1.5 T scanner compared with Earth’s magnetic field?', options: ['About 2 times', 'About 300 times', 'About 30,000 times', 'About the same'], answer: 2, why: 'Earth’s field is about 50 microtesla, so 1.5 T is about 30,000 times stronger.' },
    { q: 'Why is the scanner room lined with copper?', options: ['To hold the magnet in place', 'To keep outside radio signals from spoiling the faint MRI signal', 'To keep the room warm', 'For decoration'], answer: 1, why: 'MRI signals are radio waves in the same range as FM radio. The Faraday cage keeps outside radio out.' },
  ],
  reel: [
    { ms: 5200, caption: 'An MRI scanner is a giant magnet, 30,000 times stronger than Earth’s, that never switches off.', set: { xray: false, scan: false, room: true, explode: 0 }, view: { pos: [6.5, 7.5, 15.5], target: [1.8, 4.6, 0] }, spin: 0.35 },
    { ms: 5600, caption: 'Inside: superconducting coils in liquid helium at −269 °C, then gradient coils and a radio antenna.', set: { xray: true, scan: true, room: false }, anim: { explode: [0, 1] }, view: { pos: [9.5, 8.5, 13.5], target: [-3.2, 4.8, 0] }, spin: 0.15 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const sc = makeScanner(); root.add(sc.group);
    const walls = faradayWalls(stage, { x0: -15, x1: 12, z0: -10.5, h: 12, zFront: 5 }); root.add(walls);
    // Quench pipe: from the turret up through the ceiling and out through the wall.
    const pipe = tube([[1.2, YC + 4.5, 0], [1.2, 11.2, 0], [1.2, 11.75, -0.55], [1.2, 11.8, -2], [1.2, 11.8, -10.5]], 0.22, M.metal(0xb9bec8), false, 80);
    root.add(pipe);

    const setExplode = exploder([
      { obj: sc.coverG, off: [0, 1.5, -6] },
      { obj: sc.cold, off: [0, 1.2, 0] },
      { obj: sc.grad, off: [-7.2, 0, 0] },
      { obj: sc.body, off: [-12.2, 0, 0] },
      { obj: sc.liner, off: [-12.2, 0, 0] },
      { obj: sc.table, off: [3.2, 0, 0] },
    ]);

    // Labels. On a narrow screen only the main ones show.
    const minor = [];
    const L = (t, obj, p, cls, main) => { const l = stage.label(t, p, obj, cls); if (!main) minor.push(l); return l; };
    L('Superconducting windings, 4 K', sc.windings, [0.4, 3.25, 1.2], 'hot', true);
    L('Liquid helium', sc.helium, [-2.2, -3.6, 1.5]);
    L('Cryostat (vacuum flask)', sc.cryostat, [2.4, -3.2, 2.6]);
    L('Shield coils', sc.shieldCoils, [2.4, 3.9, 0.6]);
    L('Cold head', sc.cold, [0, 2.3, 0]);
    L('Quench pipe', root, [1.2, 10.4, 0.3]);
    const lGrad = L('Gradient coils <b style="color:#ff6b6b">x</b> <b style="color:#5ce1a9">y</b> <b style="color:#5b8cff">z</b>', sc.grad, [-1.4, -2.55, 1.2], '', true);
    L('RF body coil', sc.body, [0.9, 1.9, 0.3], '', true);
    L('Bore, 70 cm', sc.liner, [2.6, -0.9, 0.3]);
    if (sc.headCoil) L('Head coil', sc.headCoil, [0, 0.9, 0.3]);
    L('Patient table', sc.table, [7.4, 2.0, 1.1], '', true);
    const lRoom = L('Faraday cage: copper-lined walls', walls, [-14.9, 2.2, -3]);

    let t = 0, glow = 0;
    const gMats = [sc.zc, sc.xc, sc.yc].map((g) => g.children[0].material);
    const rfMat = sc.body.children[0].material;
    const hcMat = sc.headCoil.children[0].children[0].material;
    rfMat.emissive = new THREE.Color(0xffb547); hcMat.emissive = new THREE.Color(0xffb547);
    const base = gMats.map((m) => m.color.clone());
    return {
      update(dt, s) {
        dt = Math.max(0, dt); fitNarrow(stage);
        t += dt;
        setExplode(s.explode);
        const narrow = stage.host.clientWidth < 560;
        minor.forEach((l) => { l.visible = !narrow; });
        sc.coverMat.setXray(s.xray, 0.08); sc.cryoMat.setXray(s.xray, 0.14); sc.gradMat.setXray(s.xray || s.explode > 0.3, 0.25);
        walls.visible = s.room; lRoom.visible = s.room && !narrow;
        glow = approach(glow, s.scan ? 1 : 0, 4, dt);
        // A pulse sequence in miniature: z gradient, RF blip, y gradient steps, x gradient readout.
        const ph = (t * 1.2) % 1;
        const on = [ph < 0.25 ? 1 : 0.15, ph > 0.6 ? 1 : 0.15, ph > 0.35 && ph < 0.55 ? 1 : 0.15];
        gMats.forEach((m, i) => m.color.copy(base[i]).multiplyScalar(0.25 + 0.75 * (glow > 0.5 ? on[i] : 1)));
        const rf = glow * (ph > 0.05 && ph < 0.12 ? 1 : ph > 0.6 && ph < 0.9 ? 0.35 : 0);
        rfMat.emissiveIntensity = rf; hcMat.emissiveIntensity = rf * 1.4;
        // Gradient switching shakes the coil tube a tiny bit: that is the knocking you hear.
        sc.grad.position.y = (glow > 0.5 ? Math.sin(t * 90) * 0.012 : 0) + sc.grad.userData.home.y;
      },
      readout: (s) => {
        const f = NUCLEI.H1.f * s.B0;
        return `<div class="big">${s.B0} T: about ${Math.round(s.B0 / EARTH).toLocaleString('en-US')}× Earth’s field</div>
          <div class="row"><span>Coils</span><b>NbTi at 4 K (−269 °C)</b></div>
          <div class="row"><span>Power to stay on</span><b>none</b></div>
          <div class="row"><span>Radio frequency</span><b>${f.toFixed(1)} MHz</b></div>
          <small>Earth’s field taken as 50 µT.</small>`;
      },
    };
  },
};

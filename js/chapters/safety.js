// Chapter 5: safety. No ionising radiation, but the magnet is always on. Steel near the bore is
// pulled with many times its own weight; in a quench the helium boils off up the quench pipe.
import { THREE, M, rod, tube, arrow, swarm, approach, clamp } from '../kit.js';
import { makeScanner, faradayWalls, fieldAt, gradAt, reachOf, pull, YC, U, EARTH, fitNarrow } from '../mri.js';

// Objects that might be wheeled in. Steel: saturation magnetisation μ0·Ms ≈ 1.6 T, shape factor N ≈ 0.1
// for a long cylinder along the field. Aluminium is weakly paramagnetic, χ ≈ 2.2 × 10⁻⁵ (CRC Handbook).
const OBJ = {
  steel: { name: 'Steel oxygen cylinder', kg: 3.6, rho: 7850, Ms: 1.6, N: 0.1, color: 0x2a2d33 },
  alu: { name: 'Aluminium oxygen cylinder (MR Conditional)', kg: 2.2, rho: 2700, chi: 2.2e-5, color: 0xb9bec8 },
};
const G = 9.81;
const QUENCH_S = 6;               // the field is shown falling over 6 s (a real quench takes tens of seconds)

export default {
  id: 'safety',
  short: 'Is it safe?',
  title: 'The magnet is always on',
  subtitle: 'No X-rays, but a field strong enough to turn a steel cylinder into a missile.',
  view: { pos: [6.5, 9.0, 25], target: [3.6, 7.0, 0] },
  learn: `<p>MRI uses <b>no ionising radiation</b>: no X-rays, nothing that can damage DNA. Its risks come from the magnet and the radio waves, and hospitals manage them with strict rules.</p>
    <p>The magnet is <b>always on</b>, even at night. Near the bore the field changes very steeply, and anything made of iron or ordinary steel gets yanked in: the <b>projectile effect</b>. A steel oxygen cylinder can fly across the room. So everyone is <b>screened</b> before going in, and equipment is labelled <b>MR Safe</b>, <b>MR Conditional</b> or <b>MR Unsafe</b>. Some pacemakers, implants and metal fragments can move, heat up or stop working, so doctors check each one first.</p>
    <p>The radio pulses deposit a little heat in your body. The scanner watches the <b>SAR</b> (specific absorption rate) and keeps it under limits set by the IEC 60601-2-33 standard: 2 W/kg averaged over the whole body in normal mode, and 4 W/kg in first-level mode, which needs closer watching.</p>
    <p>In an emergency the magnet can be <b>quenched</b>: its coils are made to stop superconducting, the stored energy heats the helium, and it boils off as a huge cloud of gas that the <b>quench pipe</b> carries out through the roof.</p>
    <p class="tip"><b>Try it:</b> walk the steel cylinder towards the bore and watch the pull grow. Then swap to aluminium, and switch off the shielding.</p>`,
  terms: [
    { t: 'Ionising radiation', d: 'Radiation energetic enough to knock electrons off atoms, like X-rays. MRI uses none.' },
    { t: 'Projectile effect', d: 'Magnetic objects being pulled into the scanner at high speed.' },
    { t: 'Fringe field', d: 'The part of the magnet’s field that leaks out around it.' },
    { t: 'SAR', d: 'Specific absorption rate: how much radio energy the body soaks up, in watts per kilogram.' },
    { t: 'Quench', d: 'When the magnet stops superconducting and its liquid helium boils away.' },
  ],
  defaults: { obj: 'steel', d: 1.25, B0: 1.5, shield: true, quench: false },
  controls: [
    { key: 'obj', type: 'seg', label: 'Object', options: [{ v: 'steel', label: 'Steel cylinder' }, { v: 'alu', label: 'Aluminium cylinder' }] },
    { key: 'd', type: 'range', label: 'Distance from the centre of the magnet', min: 0.9, max: 4, step: 0.01, ends: ['bore mouth', 'far'], fmt: (v) => v.toFixed(2) + ' m' },
    { key: 'B0', type: 'seg', label: 'Magnet', options: [{ v: 1.5, label: '1.5 T' }, { v: 3, label: '3 T' }] },
    { key: 'shield', type: 'toggle', label: 'Active shielding', hint: 'Outer coils that cancel most of the field outside the magnet.' },
    { type: 'buttons', label: 'Emergency', items: [
      { label: 'Quench the magnet', act: (s) => { s.quench = true; } },
      { label: 'Ramp it back up', act: (s) => { s.quench = false; } },
    ] },
  ],
  quiz: [
    { q: 'Does an MRI scan use ionising radiation like X-rays?', options: ['Yes, a lot', 'Yes, a little', 'No: it uses a magnetic field and radio waves', 'Only for the head'], answer: 2, why: 'MRI uses a strong magnet and radio waves, which don’t damage DNA the way X-rays can.' },
    { q: 'Why must a steel oxygen cylinder never go into the scanner room?', options: ['It spoils the picture a little', 'The magnet is always on and can pull it in with great force', 'Oxygen is flammable near radio waves', 'It is too heavy for the floor'], answer: 1, why: 'Near the bore, the steep field can pull steel with many times its own weight.' },
    { q: 'What comes out of the quench pipe during a quench?', options: ['Water', 'Helium gas from the boiling liquid helium', 'Smoke', 'Radio waves'], answer: 1, why: 'The magnet’s energy boils the liquid helium, and the pipe vents the gas safely outside.' },
  ],
  reel: [
    { ms: 5600, caption: 'The magnet is always on. Near the bore, steel is pulled with many times its own weight.', set: { obj: 'steel', shield: true, B0: 1.5, quench: false }, anim: { d: [2.2, 1.0] }, view: { pos: [7.5, 7.5, 17], target: [3.2, 5.0, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const sc = makeScanner({ table: false }); root.add(sc.group);
    sc.coverMat.setXray(false);
    const walls = faradayWalls(stage, { x0: -6, x1: 22, z0: -7, h: 12, zFront: 6 }); root.add(walls);
    const pipe = tube([[1.2, YC + 4.5, 0], [1.2, 11.2, 0], [1.2, 11.75, -0.55], [1.2, 11.8, -2], [1.2, 11.8, -7]], 0.22, M.metal(0xb9bec8), false, 80);
    root.add(pipe);

    // The 5-gauss (0.5 mT) line on the floor, where screening zones usually start.
    const ringMat = new THREE.LineBasicMaterial({ color: 0xffb547 });
    const ring = new THREE.LineLoop(new THREE.BufferGeometry(), ringMat); ring.position.y = 0.03; root.add(ring);
    const lRing = stage.label('', [0, 0.3, 0], root, 'hot');
    const setRing = (a, b) => {
      const pts = []; for (let i = 0; i < 128; i++) { const t = (i / 128) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(t) * a, 0, Math.sin(t) * b)); }
      ring.geometry.dispose(); ring.geometry = new THREE.BufferGeometry().setFromPoints(pts);
      lRing.position.set(Math.min(a, 20), 0.3, 0.8);
    };

    // The cylinder, lying along the bore axis, and the pull on it.
    const cyl = new THREE.Group(); root.add(cyl);
    const bodyMat = M.metal(0x2a2d33, { roughness: 0.45 });
    cyl.add(rod(-1.1, 1.0, 0.42, 0.42, bodyMat), rod(-1.45, -1.1, 0.2, 0.42, M.plastic(0xf2f4f7)), rod(-1.75, -1.45, 0.1, 0.12, M.metal(0xc9ced8)));
    const pullA = arrow(0xff6b6b, 1, 0.45, 0.09); pullA.rotation.z = Math.PI / 2; root.add(pullA);
    const wA = arrow(0x8ef0ff, 1, 0.3, 0.05); wA.rotation.z = Math.PI; root.add(wA);
    const lObj = stage.label('', [0, 1.2, 0], cyl);
    const lPull = stage.label('', [0, 0, 0], root, 'hot');

    // Helium boiling off out of the quench pipe outside.
    const NG = 260, gas = swarm(NG, new THREE.SphereGeometry(0.18, 8, 6), M.ghost(0xeef6ff, 0.5));
    root.add(gas);
    const gasP = Array.from({ length: NG }, (_, i) => ({ life: -((i * 0.618) % 1) * 3, x: 0, y: 0, z: 0 }));
    const lQ = stage.label('Helium gas vents outside', [1.2, 12.9, -6.5], root);

    let q = 1, drift = 0, seed = 99;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    let ringKey = '';
    return {
      update(dt, s) {
        dt = Math.max(0, dt); fitNarrow(stage);
        q = s.quench ? Math.max(0, q - dt / QUENCH_S) : approach(q, 1, 0.8, dt);
        const B0 = s.B0 * q, o = OBJ[s.obj];
        const rk = `${s.B0}|${s.shield}`;
        if (rk !== ringKey) {
          ringKey = rk;
          const a = reachOf(5e-4, s.B0, s.shield) / U;
          setRing(a, a * (s.shield ? 0.62 : 0.79));
          lRing.element.textContent = `5-gauss line, ${(a * U).toFixed(1)} m`;
        }
        ring.visible = lRing.visible = q > 0.5;
        bodyMat.color.setHex(o.color);
        const x = s.d / U;
        cyl.position.set(x + 1.75, YC, 0);
        const F = q > 0.001 ? pull(o, s.d, B0, s.shield) : 0, W = o.kg * G, ratio = F / W;
        const L = F > 0.01 ? clamp(1 + Math.log10(Math.max(1, ratio * 10)) * 1.6, 0.6, 5) : 0;
        pullA.position.set(x - 0.2, YC + 1.25, 0); pullA.set(L); pullA.visible = L > 0.05;
        wA.position.set(x + 1.75, YC - 0.6, 0); wA.set(1);
        lObj.element.textContent = o.name;
        lPull.position.set(x - 0.2 - L / 2, YC + 2.0, 0);
        lPull.element.textContent = ratio >= 1 ? `Pulled with ${ratio >= 10 ? Math.round(ratio) : ratio.toFixed(1)}× its weight` : ratio > 0.01 ? `Pull: ${Math.round(ratio * 100)}% of its weight` : 'Almost no pull';
        // A gentle wobble when the pull beats gravity, as if it is about to fly.
        drift += dt;
        cyl.rotation.z = ratio > 1 ? Math.sin(drift * 20) * 0.02 * Math.min(1, ratio / 20) : 0;
        // Helium plume.
        const venting = s.quench && q > 0.02;
        for (let i = 0; i < NG; i++) {
          const p = gasP[i]; p.life += dt;
          if (p.life > 3) { p.life = venting ? 0 : -0.5; p.x = 1.2 + (rnd() - 0.5) * 0.3; p.y = 11.8; p.z = -7.1; }
          if (p.life < 0 || !(venting || p.life < 3)) { gas.place(i, [0, -10, 0], null, 0.001); continue; }
          p.y += (2.2 + rnd() * 0.5) * dt; p.z -= 1.2 * dt; p.x += (rnd() - 0.5) * 0.8 * dt;
          gas.place(i, [p.x, p.y, p.z], null, 0.6 + p.life * 1.2);
        }
        gas.done();
        lQ.visible = venting;
      },
      readout: (s) => {
        const B0 = s.B0 * q, o = OBJ[s.obj];
        const B = Math.abs(fieldAt(s.d, B0, s.shield)), Gr = gradAt(s.d, B0, s.shield);
        const F = q > 0.001 ? pull(o, s.d, B0, s.shield) : 0, ratio = F / (o.kg * G);
        const big = q < 0.02 ? 'Quenched: the field is gone' : ratio >= 1 ? `Pull: ${ratio >= 10 ? Math.round(ratio) : ratio.toFixed(1)}× its own weight` : `Pull: ${(ratio * 100).toFixed(ratio < 0.01 ? 3 : 0)}% of its weight`;
        return `<div class="big ${ratio >= 1 && q > 0.02 ? 'no' : ''}">${big}</div>
          <div class="row"><span>Field at ${s.d.toFixed(2)} m</span><b>${B >= 0.01 ? B.toFixed(2) + ' T' : (B * 1000).toFixed(1) + ' mT'} (${Math.round(B / EARTH).toLocaleString('en-US')}× Earth)</b></div>
          <div class="row"><span>How fast it changes</span><b>${Gr.toFixed(2)} T per metre</b></div>
          <div class="row"><span>5-gauss line</span><b>${reachOf(5e-4, s.B0, s.shield).toFixed(1)} m from the centre</b></div>
          <small>Simple model magnet, along the bore axis. ${o.kg} kg ${s.obj === 'steel' ? 'steel' : 'aluminium'}.</small>`;
      },
    };
  },
};

import * as THREE from "three";

/* Chibi-style Maneki-neko (lucky cat) matching the app's 2D mascot:
   oversized round head, triangle ears with pink inners, crescent-spark
   eyes, ω mouth, whiskers, blush cheeks, red collar with a gold bell,
   one raised beckoning paw with pink pads, the other paw holding a
   gold koban coin, calico patches, sitting pose with tail.
   Built from primitives — no external model files.
   Rig exposes what the animator needs: head (turn), eyes (blink),
   waveArm (beckoning), bell (swing), body (breathing). */

export interface LuckyCatRig {
  group: THREE.Group;
  head: THREE.Group;
  eyeL: THREE.Group;
  eyeR: THREE.Group;
  body: THREE.Mesh;
  waveArm: THREE.Group;
  bell: THREE.Group;
}

const CREAM = 0xfff8f0;
const CALICO = 0xf2b267;
const PINK = 0xffb3c1;
const DARK = 0x2b2a33;
const RED = 0xd94f4f;
const GOLD = 0xf4b740;
const GOLD_DARK = 0xd99a2b;

function mat(color: number, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...extra });
}

function goldMat() {
  return new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.35, metalness: 0.75 });
}

export function buildLuckyCat(): LuckyCatRig {
  const group = new THREE.Group();
  const cream = mat(CREAM);
  const calico = mat(CALICO);
  const pink = mat(PINK, { roughness: 0.7 });
  const dark = mat(DARK, { roughness: 0.4 });
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // ---- body (small, chibi, sitting) ----
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 28, 28), cream);
  body.scale.set(1, 0.95, 0.85);
  body.position.y = 0.42;
  group.add(body);

  // calico patch on the body flank
  const flank = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), calico);
  flank.scale.set(0.9, 1.1, 0.45);
  flank.position.set(-0.3, 0.42, 0.22);
  flank.rotation.z = 0.4;
  group.add(flank);

  // ---- sitting legs with pink paw pads ----
  const legGeo = new THREE.SphereGeometry(0.18, 20, 20);
  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(legGeo, cream);
    leg.scale.set(1, 0.7, 1.25);
    leg.position.set(0.27 * sx, 0.13, 0.24);
    group.add(leg);
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 14), pink);
    pad.scale.set(1.1, 1.3, 0.4);
    pad.position.set(0.27 * sx, 0.11, 0.45);
    group.add(pad);
    for (let i = -1; i <= 1; i++) {
      const toe = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 10), pink);
      toe.scale.set(1, 1.2, 0.4);
      toe.position.set(0.27 * sx + 0.055 * i, 0.21, 0.455);
      group.add(toe);
    }
  }

  // ---- tail curling on the right ----
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.07, 12, 20, Math.PI * 1.2), cream);
  tail.position.set(0.42, 0.28, -0.12);
  tail.rotation.set(0.2, 0.5, -0.6);
  group.add(tail);
  const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), calico);
  tailTip.position.set(0.52, 0.44, -0.16);
  group.add(tailTip);

  // ---- left arm resting down, holding a koban coin ----
  const restArm = new THREE.Group();
  restArm.position.set(-0.36, 0.62, 0.12);
  const restUpper = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.26, 6, 14), cream);
  restUpper.position.y = -0.16;
  restUpper.rotation.z = 0.25;
  restArm.add(restUpper);
  const restPaw = new THREE.Mesh(new THREE.SphereGeometry(0.115, 18, 18), cream);
  restPaw.position.set(-0.09, -0.36, 0.06);
  restArm.add(restPaw);
  // koban coin (gold oval) held against the paw
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.045, 24), goldMat());
  coin.rotation.x = Math.PI / 2 - 0.25;
  coin.position.set(-0.09, -0.33, 0.17);
  restArm.add(coin);
  const coinMark = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 12, 12),
    new THREE.MeshStandardMaterial({ color: GOLD_DARK, roughness: 0.5, metalness: 0.4 })
  );
  coinMark.scale.set(1, 1.25, 0.25);
  coinMark.position.set(-0.09, -0.31, 0.195);
  restArm.add(coinMark);
  group.add(restArm);

  // ---- right arm RAISED — the beckoning paw (pivot at the shoulder) ----
  const waveArm = new THREE.Group();
  waveArm.position.set(0.37, 0.68, 0.1);
  group.add(waveArm);
  const waveUpper = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.3, 6, 14), cream);
  waveUpper.position.y = 0.2;
  waveArm.add(waveUpper);
  // calico patch on the raised arm
  const armPatch = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), calico);
  armPatch.scale.set(0.9, 1.1, 0.7);
  armPatch.position.set(0.03, 0.22, 0.07);
  waveArm.add(armPatch);
  // the paw
  const paw = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 18), cream);
  paw.position.y = 0.44;
  waveArm.add(paw);
  // big pink pad facing forward + three toe beans
  const bigPad = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), pink);
  bigPad.scale.set(1.1, 1.3, 0.45);
  bigPad.position.set(0, 0.42, 0.115);
  waveArm.add(bigPad);
  for (let i = -1; i <= 1; i++) {
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 10), pink);
    toe.scale.set(1, 1.2, 0.45);
    toe.position.set(0.052 * i, 0.53, 0.115);
    waveArm.add(toe);
  }

  // ---- red collar + gold bell ----
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 12, 28), mat(RED, { roughness: 0.6 }));
  collar.position.y = 0.8;
  collar.rotation.x = Math.PI / 2 - 0.12;
  group.add(collar);
  const bell = new THREE.Group();
  bell.position.set(0, 0.72, 0.31);
  const bellBall = new THREE.Mesh(new THREE.SphereGeometry(0.095, 18, 18), goldMat());
  bell.add(bellBall);
  const bellBand = new THREE.Mesh(
    new THREE.TorusGeometry(0.095, 0.018, 8, 20),
    new THREE.MeshStandardMaterial({ color: GOLD_DARK, roughness: 0.5, metalness: 0.4 })
  );
  bellBand.rotation.x = Math.PI / 2;
  bell.add(bellBand);
  group.add(bell);

  // ---- head (pivot at the neck) ----
  const head = new THREE.Group();
  head.position.y = 1.02;
  group.add(head);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.52, 36, 36), cream);
  skull.position.y = 0.22;
  skull.scale.set(1, 0.95, 0.92);
  head.add(skull);

  // calico patch on the head
  const headPatch = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), calico);
  headPatch.scale.set(1, 0.75, 0.55);
  headPatch.position.set(-0.28, 0.52, 0.18);
  headPatch.rotation.z = 0.5;
  head.add(headPatch);

  // triangle ears with pink inners
  const earGeo = new THREE.ConeGeometry(0.17, 0.3, 4);
  const innerGeo = new THREE.ConeGeometry(0.09, 0.17, 4);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(earGeo, cream);
    ear.position.set(0.34 * sx, 0.62, -0.02);
    ear.rotation.y = Math.PI / 4;
    ear.rotation.z = -0.18 * sx;
    head.add(ear);
    const inner = new THREE.Mesh(innerGeo, pink);
    inner.position.set(0.33 * sx, 0.6, 0.06);
    inner.rotation.y = Math.PI / 4;
    inner.rotation.z = -0.18 * sx;
    head.add(inner);
  }

  // eyes (grouped for blinking) with crescent sparks
  const makeEye = (x: number) => {
    const eye = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 18), dark);
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 10), sparkMat);
    spark.position.set(0.026, 0.028, 0.055);
    const spark2 = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 8), sparkMat);
    spark2.position.set(-0.03, -0.025, 0.06);
    eye.add(ball, spark, spark2);
    eye.position.set(x, 0.28, 0.44);
    return eye;
  };
  const eyeL = makeEye(-0.21);
  const eyeR = makeEye(0.21);
  head.add(eyeL, eyeR);

  // blush cheeks
  for (const sx of [-1, 1]) {
    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), pink);
    blush.scale.set(1.3, 0.8, 0.4);
    blush.position.set(0.33 * sx, 0.1, 0.38);
    head.add(blush);
  }

  // tiny pink nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), pink);
  nose.scale.set(1.3, 0.9, 0.8);
  nose.position.set(0, 0.14, 0.5);
  head.add(nose);

  // ω mouth: two small U arcs
  const mouthGeo = new THREE.TorusGeometry(0.045, 0.013, 8, 14, Math.PI);
  for (const sx of [-1, 1]) {
    const arc = new THREE.Mesh(mouthGeo, dark);
    arc.position.set(0.045 * sx, 0.05, 0.49);
    arc.rotation.z = Math.PI; // ∪ shape
    head.add(arc);
  }

  // whiskers: three thin cylinders per side
  const whiskerGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.3, 6);
  const whiskerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const w = new THREE.Mesh(whiskerGeo, whiskerMat);
      w.position.set(0.42 * sx, (0.12 - i * 0.055), 0.32);
      w.rotation.z = Math.PI / 2 + (0.12 - i * 0.12) * sx;
      w.rotation.y = 0.35 * sx;
      head.add(w);
    }
  }

  return { group, head, eyeL, eyeR, body, waveArm, bell };
}

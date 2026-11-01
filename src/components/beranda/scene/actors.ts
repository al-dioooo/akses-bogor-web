// Kendaraan dan orang: angkot dan sedan, pejalan bertongkat putih, pengguna kursi roda, yang menunggu dan duduk di
// halte, pejalan di plaza, dan dua penumpang lift. Semuanya digerakkan story.ts, jadi tidak digabung.
import { BoxGeometry, CapsuleGeometry, CylinderGeometry, Group, Object3D, SphereGeometry, TorusGeometry } from "three";
import { H } from "./ground";
import type { Kit } from "./kit";
import { C } from "./palette";

type PersonSpec = { skin: string; top: string; bottom?: string; hair?: string; hijab?: string; skirt?: boolean; seated?: boolean; seatY?: number };
export type Person = { g: Group; legs: Group[]; arms: Group[] };
export type Vehicle = { g: Group; wheels: Object3D[] };

const dynamic = () => {
  const g = new Group();
  g.userData.dynamic = true;
  return g;
};
const capsule = (r: number, l: number) => new CapsuleGeometry(r, l, 4, 10);

export function buildActors(kit: Kit, root: Object3D, cabin: Object3D) {
  const { bx, rod, put, mat } = kit;

  function angkot(): Vehicle {
    const g = dynamic();
    root.add(g);
    const body = mat(C.angkot);
    const glass = mat(C.vehicleGlass, { rough: 0.2 });
    bx(g, [-2.1, 2.1], [0.32, 1.25], [-0.85, 0.85], body, { r: 0.18 });
    bx(g, [-1.75, 2.05], [1.1, 1.95], [-0.8, 0.8], body, { r: 0.18 });
    bx(g, [-1.7, 1.95], [1.25, 1.75], [-0.82, 0.82], glass, { r: 0.08, cast: false });
    bx(g, [-1.95, -1.6], [1.15, 1.8], [-0.72, 0.72], glass, { cast: false, rz: -0.35 });
    bx(g, [-2.12, 2.12], [0.62, 0.72], [-0.87, 0.87], C.cream, { cast: false });
    bx(g, [-1.25, -0.4], [0.4, 1.75], [0.8, 0.87], C.ink, { cast: false });
    bx(g, [-1.6, 2.0], [1.95, 2.02], [-0.6, 0.6], C.angkotDeep);
    bx(g, [-2.2, -2.05], [0.3, 0.5], [-0.8, 0.8], C.ink);
    bx(g, [2.05, 2.2], [0.3, 0.5], [-0.8, 0.8], C.ink);
    const headlight = mat(C.warm.headlightBody, { glow: C.warm.headlight, glowI: 0.4 });
    for (const z of [-0.55, 0.55]) put(g, new SphereGeometry(0.09, 10, 8), headlight, -2.12, 0.85, z);
    const wheels: Object3D[] = [];
    for (const x of [-1.35, 1.35])
      for (const z of [-0.82, 0.82]) {
        const w = put(g, new CylinderGeometry(0.33, 0.33, 0.24, 18), C.ink, x, 0.33, z, { rx: Math.PI / 2 });
        put(w, new CylinderGeometry(0.15, 0.15, 0.26, 12), C.cream, 0, 0, 0);
        wheels.push(w);
      }
    return { g, wheels };
  }

  function car(color: string): Vehicle {
    const g = dynamic();
    root.add(g);
    bx(g, [-1.9, 1.9], [0.3, 0.95], [-0.82, 0.82], color, { r: 0.22 });
    bx(g, [-1.0, 1.1], [0.9, 1.5], [-0.72, 0.72], color, { r: 0.2 });
    bx(g, [-0.95, 1.05], [1.0, 1.4], [-0.74, 0.74], mat(C.vehicleGlass, { rough: 0.2 }), { r: 0.1, cast: false });
    const wheels: Object3D[] = [];
    for (const x of [-1.2, 1.2]) for (const z of [-0.78, 0.78]) wheels.push(put(g, new CylinderGeometry(0.3, 0.3, 0.2, 16), C.ink, x, 0.3, z, { rx: Math.PI / 2 }));
    return { g, wheels };
  }

  /** Orang dari kapsul: kaki dan lengan berengsel di pinggul dan bahu supaya bisa melangkah. */
  function person(p: PersonSpec): Person {
    const g = dynamic();
    const skin = mat(p.skin);
    const top = mat(p.top);
    const bottom = mat(p.bottom ?? C.ink);
    const legs: Group[] = [];
    const arms: Group[] = [];
    const seatY = p.seatY ?? 0;
    let hipY = 0.86;
    if (p.seated) {
      hipY = seatY + 0.06;
      for (const s of [-1, 1]) {
        put(g, capsule(0.085, 0.32), bottom, s * 0.1, hipY, 0.17, { rx: Math.PI / 2 });
        put(g, capsule(0.075, seatY - 0.2), bottom, s * 0.1, (seatY - 0.02) / 2, 0.36);
      }
    } else if (p.skirt) {
      put(g, new CylinderGeometry(0.15, 0.25, 0.9, 14), bottom, 0, 0.45, 0);
      for (const s of [-1, 1]) {
        const hip = new Group();
        hip.position.set(s * 0.09, 0.2, 0);
        g.add(hip);
        put(hip, capsule(0.07, 0.1), C.ink, 0, -0.12, 0.02);
        legs.push(hip);
      }
    } else {
      for (const s of [-1, 1]) {
        const hip = new Group();
        hip.position.set(s * 0.1, hipY, 0);
        g.add(hip);
        put(hip, capsule(0.088, 0.62), bottom, 0, -0.42, 0);
        legs.push(hip);
      }
    }
    const torsoY = hipY + 0.28;
    put(g, capsule(0.175, 0.3), top, 0, torsoY, 0);
    const headY = torsoY + 0.45;
    if (p.hijab) {
      put(g, new SphereGeometry(0.155, 16, 12), p.hijab, 0, headY + 0.005, -0.02);
      put(g, new CylinderGeometry(0.12, 0.27, 0.3, 16), p.hijab, 0, headY - 0.2, 0);
      put(g, new SphereGeometry(0.1, 14, 10), skin, 0, headY - 0.01, 0.07);
    } else {
      put(g, new SphereGeometry(0.13, 16, 12), skin, 0, headY, 0);
      put(g, new SphereGeometry(0.138, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), p.hair ?? C.hair, 0, headY + 0.01, -0.015, { rx: -0.25 });
    }
    for (const s of [-1, 1]) {
      const shoulder = new Group();
      shoulder.position.set(s * 0.23, torsoY + 0.2, 0);
      g.add(shoulder);
      put(shoulder, capsule(0.058, 0.4), top, 0, -0.25, 0);
      put(shoulder, new SphereGeometry(0.06, 10, 8), skin, 0, -0.5, 0);
      arms.push(shoulder);
    }
    return { g, legs, arms };
  }

  /** Kursi roda manual dengan penumpangnya; roda besar berputar saat berjalan. */
  function wheelchair(p: PersonSpec) {
    const g = dynamic();
    const frame = mat(C.violetDeep);
    bx(g, [-0.25, 0.25], [0.46, 0.52], [-0.24, 0.22], C.ink, { r: 0.02 });
    bx(g, [-0.25, 0.25], [0.52, 1.0], [-0.28, -0.23], C.ink, { r: 0.02, rx: -0.12 });
    rod(g, [-0.24, 0.12, 0.3], [-0.24, 0.46, 0.15], 0.02, frame);
    rod(g, [0.24, 0.12, 0.3], [0.24, 0.46, 0.15], 0.02, frame);
    bx(g, [-0.2, 0.2], [0.1, 0.13], [0.3, 0.44], frame);
    const wheels: Group[] = [];
    for (const s of [-1, 1]) {
      const w = new Group();
      w.position.set(s * 0.31, 0.32, -0.06);
      g.add(w);
      put(w, new TorusGeometry(0.3, 0.03, 8, 28), C.ink, 0, 0, 0, { ry: Math.PI / 2 });
      put(w, new TorusGeometry(0.255, 0.012, 6, 28), frame, s * 0.03, 0, 0, { ry: Math.PI / 2 });
      for (let k = 0; k < 3; k++) put(w, new BoxGeometry(0.012, 0.56, 0.012), C.cream, 0, 0, 0, { rx: (k * Math.PI) / 3, cast: false });
      wheels.push(w);
      put(g, new CylinderGeometry(0.07, 0.07, 0.04, 12), C.ink, s * 0.22, 0.07, 0.3, { rz: Math.PI / 2 });
    }
    const rider = person({ ...p, seated: true, seatY: 0.52 });
    for (const a of rider.arms) a.rotation.x = 0.35;
    g.add(rider.g);
    return { g, wheels, rider };
  }

  const bus = angkot();
  const sedan = car(C.lavender);

  const walker = person({ skin: C.skin[1], top: C.cloth.blue, bottom: C.trousers.slate });
  root.add(walker.g);
  const canePivot = new Group();
  canePivot.position.set(0.25, 0.95, 0.1);
  walker.g.add(canePivot);
  rod(canePivot, [0, 0, 0], [0.05, -0.93, 0.62], 0.014, C.white, { cast: false });
  rod(canePivot, [0.043, -0.8, 0.53], [0.05, -0.93, 0.62], 0.017, C.cloth.red, { cast: false });
  put(walker.g, new BoxGeometry(0.2, 0.05, 0.03), C.ink, 0, 1.6, 0.12, { cast: false });

  const chair = wheelchair({ skin: C.skin[0], top: C.cloth.teal, bottom: C.trousers.navy });
  root.add(chair.g);

  const waiting = person({ skin: C.skin[0], top: C.cloth.pink, bottom: C.trousers.lilac, hijab: C.lavender, skirt: true });
  waiting.g.position.set(-4.6, H, 8.6);
  waiting.g.rotation.y = Math.PI / 2;
  waiting.arms[1].rotation.x = -0.5;
  root.add(waiting.g);
  const sitter = person({ skin: C.skin[2], top: C.cloth.mustard, bottom: C.trousers.charcoal, seated: true, seatY: 0.62 });
  sitter.g.position.set(-6.6, H, 9.0);
  root.add(sitter.g);
  const stroller = person({ skin: C.skin[1], top: C.cloth.red, bottom: C.trousers.slate });
  stroller.g.position.set(14.8, H, -5.8);
  stroller.g.rotation.y = -Math.PI / 2;
  stroller.legs[0].rotation.x = 0.4;
  stroller.legs[1].rotation.x = -0.4;
  stroller.arms[0].rotation.x = -0.3;
  stroller.arms[1].rotation.x = 0.3;
  root.add(stroller.g);
  const liftChair = wheelchair({ skin: C.skin[2], top: C.cloth.olive, bottom: C.trousers.navy });
  liftChair.g.position.set(-0.2, 0.12, 0.2);
  liftChair.g.rotation.y = 0.5;
  cabin.add(liftChair.g);
  const liftGran = person({ skin: C.skin[1], top: C.cloth.plum, bottom: C.trousers.indigo, hijab: C.cream, skirt: true });
  liftGran.g.position.set(0.7, 0.12, 0.5);
  liftGran.g.rotation.y = -0.6;
  cabin.add(liftGran.g);

  return { bus, sedan, walker, canePivot, chair };
}

export type Actors = ReturnType<typeof buildActors>;

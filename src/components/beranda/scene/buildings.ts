// Bangunan: halte, gedung dengan pintu kaca dan ruang toilet difabel yang dinding depannya dipotong, tangga dan ramp,
// menara lift kaca dengan kabinnya, dan rumah kaca. Kabin lift bergerak; sisanya statis.
import { CylinderGeometry, Group, IcosahedronGeometry, MeshStandardMaterial, Object3D, RingGeometry, SphereGeometry, TorusGeometry } from "three";
import { H } from "./ground";
import type { Kit } from "./kit";
import { C, type Rand } from "./palette";

export function buildBuildings(kit: Kit, root: Object3D, rand: Rand) {
  // Material yang menyala pada malam hari; intensitasnya diatur `setNight` di index.ts.
  const windows = kit.mat(C.glass, { rough: 0.25, glow: C.warm.window, glowI: 0 });
  const ceiling = kit.mat(C.white, { glow: C.warm.ceiling, glowI: 0.6 });
  buildHalte(kit, root);
  buildOffice(kit, root, windows, ceiling);
  buildEntrance(kit, root);
  const cabin = buildLift(kit, root);
  buildGlasshouse(kit, root, rand);
  return { cabin, lit: { windows, ceiling } };
}

/** Halte beratap ungu dengan dinding kaca lavender, bangku, dan rambu bus. */
function buildHalte(kit: Kit, root: Object3D) {
  const { bx, rod, plate, mat } = kit;
  const g = new Group();
  root.add(g);
  for (const x of [-8.1, -3.0]) for (const z of [7.75, 9.55]) rod(g, [x, H, z], [x, 2.62, z], 0.07, C.violetDeep);
  bx(g, [-8.7, -2.4], [2.6, 2.84], [7.3, 9.9], C.violet, { r: 0.1, rx: 0.04 });
  const pane = mat(C.lavender, { opacity: 0.45, rough: 0.25 });
  bx(g, [-8.0, -3.1], [0.45, 2.3], [9.5, 9.56], pane, { cast: false });
  bx(g, [-8.15, -8.09], [0.45, 2.3], [7.9, 9.5], pane, { cast: false });
  bx(g, [-7.6, -3.6], [0.56, 0.64], [8.85, 9.35], C.cream, { r: 0.03 });
  for (const x of [-7.3, -3.9]) bx(g, [x - 0.04, x + 0.04], [H, 0.56], [8.95, 9.25], C.violetDeep);
  rod(g, [-2.1, H, 7.7], [-2.1, 2.9, 7.7], 0.045, C.violetDeep);
  plate(g, kit.tex.bus, 0.55, -2.1, 2.55, 7.76);
}

/** Gedung dua lantai: plin krim, jendela berbingkai ungu, pintu kaca berkanopi, taman atap, dan panel surya. */
function buildOffice(kit: Kit, root: Object3D, windows: MeshStandardMaterial, ceiling: MeshStandardMaterial) {
  const { bx, rod, put, plate, mat } = kit;
  const g = new Group();
  root.add(g);
  const W = C.wall;
  const P = C.violet;
  bx(g, [-9, 13], [0, 0.9], [-17, -9], C.creamDeep);
  bx(g, [-9, 13], [4.4, 7.9], [-17, -9], W);
  bx(g, [-9, 13], [0.9, 4.4], [-17, -13], W);
  bx(g, [-9, 8.5], [0.9, 4.4], [-13, -9], W);
  bx(g, [12.75, 13], [0.9, 4.4], [-13, -9], W);
  // Lis atap dan lis antarlantai.
  bx(g, [-9.1, 13.1], [7.9, 8.3], [-9.15, -8.9], P);
  bx(g, [-9.1, 13.1], [7.9, 8.3], [-17.1, -16.85], P);
  bx(g, [-9.1, -8.85], [7.9, 8.3], [-17.1, -8.9], P);
  bx(g, [12.85, 13.1], [7.9, 8.3], [-17.1, -8.9], P);
  bx(g, [-9.05, 13.05], [4.32, 4.48], [-9.08, -8.94], C.lavender);
  // Pita jendela dengan tiang pembagi.
  const band = (x0: number, x1: number, y0: number, y1: number, step: number) => {
    bx(g, [x0, x1], [y0, y1], [-9.06, -8.96], windows, { cast: false });
    for (let x = x0; x <= x1 + 0.01; x += step) bx(g, [x - 0.06, x + 0.06], [y0, y1], [-9.0, -8.88], P);
    bx(g, [x0 - 0.06, x1 + 0.06], [y0 - 0.1, y0], [-9.0, -8.82], P);
    bx(g, [x0 - 0.06, x1 + 0.06], [y1, y1 + 0.08], [-9.0, -8.9], P);
  };
  band(-8.2, 12.2, 5.0, 7.2, (12.2 + 8.2) / 12);
  band(-8.2, 3.0, 1.7, 3.8, 11.2 / 6);
  bx(g, [12.96, 13.06], [5.0, 7.2], [-16.4, -14.4], windows, { cast: false });
  // Pintu kaca, plat simbol akses, dan kanopi.
  bx(g, [4, 7], [0.9, 3.4], [-9.08, -8.98], mat(C.glass, { rough: 0.2 }), { cast: false });
  bx(g, [3.86, 4.0], [0.9, 3.5], [-9.02, -8.86], P);
  bx(g, [7.0, 7.14], [0.9, 3.5], [-9.02, -8.86], P);
  bx(g, [3.86, 7.14], [3.4, 3.54], [-9.02, -8.86], P);
  bx(g, [5.46, 5.54], [0.9, 3.4], [-9.0, -8.9], P);
  plate(g, kit.tex.isa, 0.42, 7.6, 2.4, -8.95);
  bx(g, [3.0, 8.0], [3.66, 3.86], [-9.0, -6.7], P, { r: 0.06 });
  rod(g, [3.25, 0.9, -6.95], [3.25, 3.66, -6.95], 0.06, C.violetDeep);
  rod(g, [7.75, 0.9, -6.95], [7.75, 3.66, -6.95], 0.06, C.violetDeep);
  // Taman atap dan panel surya.
  for (const [x, z] of [
    [-6, -14.5],
    [-1, -12],
    [6, -15],
  ]) {
    bx(g, [x - 1.2, x + 1.2], [7.9, 8.35], [z - 0.6, z + 0.6], C.creamDeep, { r: 0.05 });
    for (let i = -1; i <= 1; i++) put(g, new IcosahedronGeometry(0.42, 1), mat(C.leaf[(i + 3) % 5], { flat: true }), x + i * 0.7, 8.6, z);
  }
  for (let i = 0; i < 4; i++) bx(g, [8 + i * 1.1, 8.9 + i * 1.1], [8.0, 8.4], [-12.6, -11.2], mat(C.solar, { rough: 0.35 }), { rx: -0.35 });
  buildToilet(kit, g, ceiling);
}

/** Ruang toilet difabel di sudut kanan depan, terlihat lewat dinding yang dipotong: kloset dengan pegangan, wastafel rendah, cermin, dan lingkar putar. */
function buildToilet(kit: Kit, g: Object3D, ceiling: MeshStandardMaterial) {
  const { bx, rod, put, plate, mat } = kit;
  bx(g, [8.5, 12.75], [0.9, 0.93], [-13, -9], mat(C.white, { map: kit.tex.tile, rough: 0.5 }), { cast: false });
  bx(g, [8.5, 12.75], [0.93, 2.1], [-13, -12.96], C.lavenderPale, { cast: false });
  bx(g, [12.71, 12.75], [0.93, 2.1], [-13, -9.1], C.lavenderPale, { cast: false });
  const TX = 9.25;
  bx(g, [TX - 0.3, TX + 0.3], [1.3, 1.78], [-12.96, -12.72], C.white, { r: 0.05 });
  put(g, new CylinderGeometry(0.21, 0.16, 0.44, 16), C.white, TX, 1.15, -12.45);
  put(g, new CylinderGeometry(0.23, 0.23, 0.05, 16), C.lavenderPale, TX, 1.39, -12.42);
  rod(g, [8.58, 1.66, -12.95], [8.58, 1.66, -12.0], 0.03, C.violet);
  rod(g, [8.58, 1.66, -12.95], [8.58, 2.4, -12.95], 0.03, C.violet);
  rod(g, [TX + 0.55, 1.66, -12.95], [TX + 0.55, 1.66, -12.1], 0.03, C.violet);
  rod(g, [TX + 0.55, 1.66, -12.1], [TX + 0.55, 1.4, -12.1], 0.03, C.violet);
  bx(g, [11.3, 12.0], [1.62, 1.78], [-12.96, -12.5], C.white, { r: 0.06 });
  bx(g, [11.35, 11.95], [2.0, 2.85], [-12.97, -12.94], mat(C.glass, { rough: 0.1 }), { cast: false });
  rod(g, [11.2, 1.85, -12.95], [11.2, 1.85, -12.5], 0.025, C.violet);
  put(g, new RingGeometry(0.72, 0.8, 48), C.violet, 10.9, 0.94, -10.9, { rx: -Math.PI / 2, cast: false });
  bx(g, [8.5, 8.53], [0.93, 3.0], [-11.9, -10.7], C.ink, { cast: false });
  plate(g, kit.tex.isa, 0.42, 8.54, 2.45, -10.2, Math.PI / 2);
  bx(g, [9.5, 11.8], [4.36, 4.4], [-11.6, -10.6], ceiling, { cast: false });
}

/** Peron pintu masuk dengan enam anak tangga berpegangan, dan ramp 1:11 sejajar fasad dengan pegangan dua tinggi. */
function buildEntrance(kit: Kit, root: Object3D) {
  const { bx, rod, profileX } = kit;
  const g = new Group();
  root.add(g);
  bx(g, [2.5, 8.5], [0, 0.9], [-9, -6.5], C.cream);
  bx(g, [2.5, 8.5], [0.9, 0.93], [-6.62, -6.5], C.kerb, { cast: false });
  for (let i = 0; i < 6; i++) bx(g, [3.5, 7.5], [H, H + 0.125 * (i + 1)], [-6.5, -4.4 - 0.35 * i], C.cream);
  for (const x of [3.42, 7.58]) {
    rod(g, [x, H + 0.95, -4.4], [x, 1.85, -6.5], 0.035, C.violet);
    rod(g, [x, H, -4.4], [x, H + 0.95, -4.4], 0.035, C.violet);
  }
  const slope: [number, number][] = [
    [-7.5, 0],
    [2.5, 0],
    [2.5, 0.9],
    [-7.5, H],
  ];
  profileX(g, slope, -8.8, -7.2, C.ramp);
  const edge: [number, number][] = [
    [-7.5, H],
    [2.5, 0.9],
    [2.5, 1.0],
    [-7.5, H + 0.1],
  ];
  profileX(g, edge, -7.3, -7.2, C.violet);
  profileX(g, edge, -8.8, -8.7, C.violet);
  const yAt = (x: number) => H + ((x + 7.5) / 10) * (0.9 - H);
  for (const z of [-7.25, -8.75]) {
    rod(g, [-7.5, yAt(-7.5) + 0.9, z], [2.5, 1.8, z], 0.035, C.violet);
    rod(g, [-7.5, yAt(-7.5) + 0.55, z], [2.5, 0.9 + 0.55, z], 0.022, C.violet);
    for (let x = -7.5; x <= 2.51; x += 2.5) rod(g, [x, yAt(x), z], [x, yAt(x) + 0.9, z], 0.03, C.violetDeep);
  }
  for (const [x0, x1, post] of [
    [2.5, 3.5, 2.5],
    [7.5, 8.5, 8.5],
  ]) {
    rod(g, [x0, 1.8, -6.55], [x1, 1.8, -6.55], 0.035, C.violet);
    rod(g, [post, 0.9, -6.55], [post, 1.8, -6.55], 0.03, C.violetDeep);
  }
}

/** Menara lift kaca berbingkai ungu di sisi kanan gedung. Mengembalikan kabin yang digerakkan cerita. */
function buildLift(kit: Kit, root: Object3D) {
  const { bx, rod, mat } = kit;
  const g = new Group();
  root.add(g);
  bx(g, [13, 16], [0, 0.9], [-14, -10.5], C.creamDeep);
  bx(g, [13.05, 15.95], [0.9, 8.4], [-13.95, -10.55], mat(C.glass, { opacity: 0.28, rough: 0.15 }), { cast: false, receive: false });
  for (const [x, z] of [
    [13.05, -10.55],
    [15.95, -10.55],
    [15.95, -13.95],
  ])
    bx(g, [x - 0.1, x + 0.1], [0.9, 8.4], [z - 0.1, z + 0.1], C.violet);
  for (const y of [0.9, 4.4, 7.9]) {
    bx(g, [13, 16], [y - 0.07, y + 0.07], [-10.66, -10.46], C.violet);
    bx(g, [15.86, 16.06], [y - 0.07, y + 0.07], [-14, -10.5], C.violet);
  }
  bx(g, [12.9, 16.15], [8.4, 8.8], [-14.15, -10.35], C.violet, { r: 0.08 });
  const cabin = new Group();
  cabin.position.set(14.5, 0.9, -12.25);
  cabin.userData.dynamic = true;
  g.add(cabin);
  bx(cabin, [-1.3, 1.3], [0, 0.12], [-1.55, 1.55], C.cream);
  bx(cabin, [-1.3, 1.3], [0.12, 2.5], [-1.55, -1.45], C.lavenderPale);
  bx(cabin, [1.2, 1.3], [0.12, 2.5], [-1.55, 1.55], C.lavenderPale);
  bx(cabin, [-1.3, 1.3], [2.5, 2.62], [-1.55, 1.55], C.white);
  rod(cabin, [-1.1, 0.95, -1.4], [1.1, 0.95, -1.4], 0.025, C.violet);
  bx(cabin, [1.12, 1.2], [0.85, 1.15], [0.2, 0.45], C.violet);
  return cabin;
}

/** Rumah kaca berkubah ala Kebun Raya di belakang kiri. */
function buildGlasshouse(kit: Kit, root: Object3D, rand: Rand) {
  const { put, mat } = kit;
  const g = new Group();
  g.position.set(-12.6, 0, -14.6);
  root.add(g);
  put(g, new CylinderGeometry(3.05, 3.15, 0.35, 32), C.cream, 0, 0.175, 0);
  put(g, new SphereGeometry(2.9, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(C.glass, { opacity: 0.4, rough: 0.15 }), 0, 0.35, 0, { cast: false });
  for (let i = 0; i < 6; i++) put(g, new TorusGeometry(2.9, 0.05, 6, 28, Math.PI), C.violet, 0, 0.35, 0, { ry: (i * Math.PI) / 6 });
  for (const phi of [0.45, 0.95]) put(g, new TorusGeometry(2.9 * Math.cos(phi), 0.045, 6, 40), C.violet, 0, 0.35 + 2.9 * Math.sin(phi), 0, { rx: Math.PI / 2 });
  put(g, new SphereGeometry(0.16, 12, 8), C.violet, 0, 3.3, 0);
  for (let i = 0; i < 5; i++) {
    const leaf = mat(C.leaf[i % 5], { flat: true });
    put(g, new IcosahedronGeometry(0.5 + rand() * 0.4, 1), leaf, (rand() - 0.5) * 3, 0.8 + rand() * 0.6, (rand() - 0.5) * 3, { cast: false });
  }
}

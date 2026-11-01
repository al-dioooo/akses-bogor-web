// Pepohonan ala Kebun Raya, semak, lampu jalan, bangku, awan, dan hujan. Tajuk pohon di dekat jalan bergoyang;
// hutan di latar belakang statis supaya bisa digabung per material.
import { BufferAttribute, BufferGeometry, ConeGeometry, CylinderGeometry, Group, IcosahedronGeometry, LineBasicMaterial, LineSegments, Object3D } from "three";
import { H } from "./ground";
import type { Kit, Vec3 } from "./kit";
import { C, type Rand } from "./palette";

export type Sway = { crown: Group; phase: number; amp: number };
export const DROPS = 180;

export function buildNature(kit: Kit, root: Object3D, rand: Rand) {
  const { bx, rod, put, mat } = kit;
  const sway: Sway[] = [];
  const trunk = mat(C.trunk, { flat: true });
  const leaf = (i: number) => mat(C.leaf[i % 5], { flat: true });

  function tree(x: number, z: number, s = 1, kind: "big" | "cone" | "round" = "round", moves = true) {
    const g = new Group();
    g.position.set(x, 0, z);
    root.add(g);
    const crown = new Group();
    g.add(crown);
    if (kind === "big") {
      put(g, new CylinderGeometry(0.22 * s, 0.38 * s, 4.4 * s, 8), trunk, 0, 2.2 * s, 0);
      rod(g, [0, 3.2 * s, 0], [1.4 * s, 4.6 * s, 0.3 * s], 0.13 * s, trunk);
      rod(g, [0, 3.0 * s, 0], [-1.3 * s, 4.4 * s, -0.4 * s], 0.13 * s, trunk);
      crown.position.y = 5.0 * s;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + rand();
        const geo = new IcosahedronGeometry((1.6 + rand() * 1.0) * s, 1);
        geo.scale(1, 0.62, 1);
        put(crown, geo, leaf(i), Math.cos(a) * 1.5 * s, rand() * 0.8 * s, Math.sin(a) * 1.5 * s);
      }
      put(crown, new IcosahedronGeometry(1.9 * s, 1).scale(1, 0.6, 1), leaf(1), 0, 0.9 * s, 0);
    } else if (kind === "cone") {
      put(g, new CylinderGeometry(0.1 * s, 0.14 * s, 1.0 * s, 6), trunk, 0, 0.5 * s, 0);
      crown.position.y = 0.8 * s;
      put(crown, new ConeGeometry(0.9 * s, 2.6 * s, 7), leaf(3), 0, 1.3 * s, 0);
    } else {
      put(g, new CylinderGeometry(0.11 * s, 0.16 * s, 1.5 * s, 7), trunk, 0, 0.75 * s, 0);
      crown.position.y = 1.9 * s;
      const n = 2 + Math.floor(rand() * 2);
      for (let i = 0; i < n; i++) {
        const geo = new IcosahedronGeometry((0.85 + rand() * 0.45) * s, 1);
        put(crown, geo, leaf(Math.floor(rand() * 5)), (rand() - 0.5) * 0.9 * s, rand() * 0.6 * s, (rand() - 0.5) * 0.9 * s);
      }
    }
    if (moves) {
      crown.userData.dynamic = true;
      sway.push({ crown, phase: rand() * 6.28, amp: kind === "big" ? 0.015 : 0.03 });
    }
  }
  function shrub(x: number, z: number, s = 1) {
    const geo = new IcosahedronGeometry(0.5 * s, 1);
    geo.scale(1, 0.75, 1);
    put(root, geo, leaf(Math.floor(rand() * 5)), x, 0.3 * s, z);
  }

  const big: [number, number, number][] = [
    [-7, -19.5, 1.15],
    [3, -20, 1.25],
    [12, -19.8, 1.05],
  ];
  for (const [x, z, s] of big) tree(x, z, s, "big");
  const round: [number, number, number][] = [
    [-14.5, -19.5, 1.1],
    [-2, -19.2, 0.9],
    [7.5, -19.5, 1],
    [17, -19.5, 1.2],
    [18.6, -14.5, 1],
    [18.8, -8.5, 1.15],
    [-15, -8.5, 1],
    [-15.2, -4.5, 0.9],
    [-14, 11, 0.9],
    [-9.5, 11.2, 0.8],
    [10, 9.4, 0.85],
    [15, 9.4, 0.9],
    [19.6, 10.8, 1],
  ];
  for (const [x, z, s] of round) tree(x, z, s);
  const cone: [number, number, number][] = [
    [19.5, -17.5, 0.9],
    [-15.5, -12.2, 0.8],
    [17.5, -5, 0.9],
  ];
  for (const [x, z, s] of cone) tree(x, z, s, "cone");
  for (let i = 0; i < 26; i++) {
    const side = i % 3;
    if (side === 0) shrub(-16 + rand() * 36, 10.6 + rand() * 1.0, 0.8 + rand() * 0.5);
    else if (side === 1) shrub(-12.5 + rand() * 3, -8.5 + rand() * 5, 0.8 + rand() * 0.4);
    else shrub(16.5 + rand() * 4, -16 + rand() * 12, 0.8 + rand() * 0.5);
  }
  for (const x of [-11, -1, 9.5, 15.5]) for (let i = 0; i < 3; i++) shrub(x + i * 0.75, -9.75, 0.7);
  // Hutan di belakang dan kanan, menjauh dari sisi kiri supaya judul tetap tenang.
  for (let i = 0; i < 70; i++) {
    const x = -40 + rand() * 120;
    const z = -24 - rand() * 40;
    if (x < 10 && z > -34) continue;
    tree(x, z, 0.9 + rand() * 0.6, rand() < 0.25 ? "big" : rand() < 0.3 ? "cone" : "round", false);
  }

  // Lampu jalan; kepalanya menyala pada malam hari.
  const lamp = mat(C.cream, { glow: C.warm.lamp, glowI: 0 });
  const lampHeads: Vec3[] = [];
  for (const [x, z, dir] of [
    [11.5, 9.7, -1],
    [18, 9.7, -1],
    [-10.5, -2.2, 1],
    [16.8, -2.2, 1],
  ]) {
    rod(root, [x, H, z], [x, 4.3, z], 0.06, C.violetDeep);
    rod(root, [x, 4.3, z], [x, 4.3, z + dir * 0.9], 0.045, C.violetDeep);
    bx(root, [x - 0.18, x + 0.18], [4.12, 4.3], [z + dir * 0.9 - 0.3, z + dir * 0.9 + 0.3], lamp, { r: 0.05 });
    lampHeads.push([x, 3.9, z + dir * 0.9]);
  }
  for (const x of [-6, 10.5]) {
    bx(root, [x - 0.9, x + 0.9], [0.5, 0.58], [-4.3, -3.85], C.cream, { r: 0.03 });
    bx(root, [x - 0.9, x + 0.9], [0.58, 0.95], [-3.9, -3.82], C.cream, { r: 0.03 });
    for (const dx of [-0.7, 0.7]) bx(root, [x + dx - 0.04, x + dx + 0.04], [H, 0.5], [-4.25, -3.9], C.violetDeep);
  }

  // Awan hujan kecil di kanan atas.
  const cloud = new Group();
  cloud.position.set(17.5, 11.5, -18.5);
  root.add(cloud);
  for (const [x, y, z, r] of [
    [0, 0, 0, 1.6],
    [1.6, -0.2, 0.3, 1.25],
    [-1.5, -0.3, 0.2, 1.15],
    [0.6, 0.6, -0.5, 1.2],
    [-0.5, -0.4, 1.0, 0.95],
    [2.6, -0.5, -0.4, 0.8],
  ]) {
    const geo = new IcosahedronGeometry(r, 1);
    geo.scale(1, 0.8, 1);
    put(cloud, geo, mat(C.white, { flat: true, rough: 1 }), x, y, z, { cast: false });
  }
  const rain = new Float32Array(DROPS * 6);
  const drops: [number, number, number][] = [];
  for (let i = 0; i < DROPS; i++) drops.push([15 + rand() * 6, -21 + rand() * 5, rand()]);
  const rainGeo = new BufferGeometry();
  rainGeo.setAttribute("position", new BufferAttribute(rain, 3));
  const lines = new LineSegments(rainGeo, new LineBasicMaterial({ color: C.rain, transparent: true, opacity: 0.55 }));
  lines.frustumCulled = false;
  root.add(lines);

  return { sway, lampHeads, lit: { lamp }, rain: { geo: rainGeo, data: rain, drops } };
}

export type Nature = ReturnType<typeof buildNature>;

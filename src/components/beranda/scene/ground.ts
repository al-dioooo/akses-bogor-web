// Tanah: rumput sampai kabut, bukit di kejauhan, jalan dua lajur, zebra cross dengan kerb landai, trotoar, plaza di
// depan gedung, dan guiding block dari halte sampai tangga. Semuanya statis.
import { BoxGeometry, CircleGeometry, CylinderGeometry, InstancedMesh, Object3D, SphereGeometry } from "three";
import type { Kit } from "./kit";
import { C } from "./palette";

/** Tinggi trotoar dari aspal. */
export const H = 0.15;
/** Jalan memanjang jauh melewati kabut di kedua sisi. */
const ROAD_X = [-110, 130] as const;

export function buildGround(kit: Kit, root: Object3D) {
  const { bx, put, mat, profileZ } = kit;

  const grass = put(root, new CircleGeometry(200, 48), C.grass, 0, -0.01, 0, { rx: -Math.PI / 2, cast: false });
  grass.receiveShadow = true;
  // Bukit dan Gunung Salak di kejauhan, setengah bola yang dipipihkan.
  const hill = (x: number, z: number, r: number, h: number, color: string) => {
    const geo = new SphereGeometry(r, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    geo.scale(1, h / r, 1);
    put(root, geo, mat(color, { flat: true }), x, 0, z, { cast: false });
  };
  hill(30, -70, 34, 22, C.hills[0]);
  hill(-10, -80, 40, 14, C.hills[1]);
  hill(70, -85, 42, 30, C.hills[2]);
  hill(-60, -70, 30, 12, C.hills[3]);
  hill(10, -50, 18, 6, C.hills[4]);

  // Jalan: z 1 sampai 6.5, marka putus-putus di tengah, zebra cross di x 4 sampai 7.
  const [X0, X1] = ROAD_X;
  bx(root, [X0, X1], [-0.02, 0.03], [1, 6.5], C.asphalt, { cast: false });
  for (let x = X0 + 0.6; x < X1 - 1.4; x += 2.6) {
    if (x > 2.4 && x < 7.6) continue;
    bx(root, [x, x + 1.3], [0.03, 0.04], [3.68, 3.82], C.line, { cast: false });
  }
  for (let i = 0; i < 6; i++) {
    const z = 1.45 + i * 0.93;
    bx(root, [4, 7], [0.03, 0.04], [z - 0.24, z + 0.24], C.white, { cast: false });
  }

  // Trotoar di kedua sisi jalan, dengan kerb putih dan kerb landai di ujung zebra cross.
  const sidewalk = (z0: number, z1: number, kerbZ: number) => {
    bx(root, [X0, 4], [0, H], [z0, z1], C.pave, { cast: false });
    bx(root, [7, X1], [0, H], [z0, z1], C.pave, { cast: false });
    bx(root, [X0, 4], [0, H + 0.01], [kerbZ - 0.12, kerbZ + 0.12], C.kerb, { cast: false });
    bx(root, [7, X1], [0, H + 0.01], [kerbZ - 0.12, kerbZ + 0.12], C.kerb, { cast: false });
  };
  sidewalk(6.5, 10, 6.62);
  bx(root, [4, 7], [0, H], [7.7, 10], C.pave, { cast: false });
  profileZ(
    root,
    [
      [6.5, 0],
      [7.7, 0],
      [7.7, H],
      [6.5, 0.03],
    ],
    4,
    7,
    C.pave2,
    { cast: false },
  );
  sidewalk(-2.5, 1, 0.88);
  bx(root, [4, 7], [0, H], [-2.5, -0.2], C.pave, { cast: false });
  profileZ(
    root,
    [
      [-0.2, 0],
      [1, 0],
      [1, 0.03],
      [-0.2, H],
    ],
    4,
    7,
    C.pave2,
    { cast: false },
  );
  // Plaza di depan gedung.
  bx(root, [-13, 17.5], [0, H], [-9.4, -2.5], C.pave2, { cast: false });

  buildGuidingBlock(kit, root);
}

/** Ubin pemandu 40 cm: ubin garis sepanjang jalur, ubin titik di belokan dan sebelum zebra cross, sebagai instance. */
function buildGuidingBlock(kit: Kit, root: Object3D) {
  const T = 0.4;
  const lineTiles: [number, number, boolean][] = [];
  const dotTiles: [number, number][] = [[-2.8, 8.4]];
  for (let x = -2.4; x < 5.2; x += T) lineTiles.push([x, 8.4, false]);
  dotTiles.push([5.5, 8.4], [5.5, 8.0], [5.5, -0.4]);
  for (let z = -0.8; z > -3.7; z -= T) lineTiles.push([5.5, z, true]);
  dotTiles.push([5.5, -4.0]);

  const all = [...lineTiles, ...dotTiles];
  const yellow = kit.mat(C.yellow);
  const base = new InstancedMesh(new BoxGeometry(T - 0.03, 0.03, T - 0.03), yellow, all.length);
  const bars = new InstancedMesh(new BoxGeometry(0.05, 0.022, T - 0.08), yellow, lineTiles.length * 4);
  const dots = new InstancedMesh(new CylinderGeometry(0.028, 0.034, 0.022, 8), yellow, dotTiles.length * 9);
  const o = new Object3D();
  all.forEach(([x, z], i) => {
    o.position.set(x, H + 0.015, z);
    o.rotation.set(0, 0, 0);
    o.updateMatrix();
    base.setMatrixAt(i, o.matrix);
  });
  let k = 0;
  for (const [x, z, along] of lineTiles)
    for (let b = 0; b < 4; b++) {
      const off = -0.135 + b * 0.09;
      o.position.set(along ? x + off : x, H + 0.04, along ? z : z + off);
      o.rotation.set(0, along ? 0 : Math.PI / 2, 0);
      o.updateMatrix();
      bars.setMatrixAt(k++, o.matrix);
    }
  k = 0;
  for (const [x, z] of dotTiles)
    for (let a = -1; a <= 1; a++)
      for (let b = -1; b <= 1; b++) {
        o.position.set(x + a * 0.11, H + 0.04, z + b * 0.11);
        o.rotation.set(0, 0, 0);
        o.updateMatrix();
        dots.setMatrixAt(k++, o.matrix);
      }
  for (const im of [base, bars, dots]) {
    im.receiveShadow = true;
    im.castShadow = false;
    root.add(im);
  }
}

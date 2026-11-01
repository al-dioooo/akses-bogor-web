// Cerita 32 detik dan gerak latar: angkot ngetem di halte, pejalan bertongkat putih turun lalu mengikuti guiding
// block menyeberang zebra cross sampai pintu, pengguna kursi roda naik ramp, lift naik turun, pohon bergoyang, hujan.
import { Object3D, Vector3 } from "three";
import type { Actors } from "./actors";
import { H } from "./ground";
import type { Vec3 } from "./kit";
import type { Nature } from "./nature";
import { DROPS } from "./nature";
import { PERIOD } from "./palette";

type Key = [number, number, ("in" | "out" | "io")?];

/** Nilai pada waktu t dari daftar [waktu, nilai, easing]; di luar daftar memakai nilai ujungnya. */
function keys(list: Key[], t: number) {
  if (t <= list[0][0]) return list[0][1];
  for (let i = 1; i < list.length; i++) {
    const [t1, v1, ease] = list[i];
    const [t0, v0] = list[i - 1];
    if (t <= t1) {
      let f = (t - t0) / (t1 - t0);
      if (ease === "out") f = 1 - (1 - f) * (1 - f);
      if (ease === "in") f = f * f;
      if (ease === "io") f = f * f * (3 - 2 * f);
      return v0 + (v1 - v0) * f;
    }
  }
  return list[list.length - 1][1];
}

/** Lintasan patah-patah; `at(d)` memberi posisi dan arah hadap pada jarak d dari awal. */
function path(points: Vec3[]) {
  const v = points.map((p) => new Vector3(...p));
  const len = [0];
  for (let i = 1; i < v.length; i++) len.push(len[i - 1] + v[i].distanceTo(v[i - 1]));
  const total = len[len.length - 1];
  return {
    len,
    total,
    at(d: number) {
      d = Math.max(0, Math.min(d, total));
      let i = 1;
      while (i < len.length - 1 && len[i] < d) i++;
      const f = (d - len[i - 1]) / (len[i] - len[i - 1] || 1);
      const dir = v[i].clone().sub(v[i - 1]);
      return { pos: v[i - 1].clone().lerp(v[i], f), yaw: Math.atan2(dir.x, dir.z) };
    },
  };
}

export function createStory(a: Actors, cabin: Object3D, n: Nature) {
  // Dari pintu angkot ke guiding block, menyeberang, lalu menaiki tangga sampai pintu.
  const walkPath = path([
    [-1.3, 0.03, 6.15],
    [-1.3, H, 7.2],
    [-0.5, H, 8.4],
    [5.5, H, 8.4],
    [5.5, H, 7.75],
    [5.5, 0.03, 6.5],
    [5.5, 0.03, 1],
    [5.5, H, -0.2],
    [5.5, H, -4.35],
    [5.5, 0.9, -6.55],
    [5.5, 0.9, -9.6],
  ]);
  // Dari kiri sepanjang trotoar, naik ramp, lalu ke pintu.
  const chairPath = path([
    [-40, H, -1.4],
    [-9.6, H, -1.4],
    [-9.6, H, -8],
    [-7.5, H, -8],
    [2.5, 0.9, -8],
    [5.5, 0.9, -8],
    [5.5, 0.9, -9.7],
  ]);
  const L = walkPath.len;
  const walkKeys: Key[] = [
    [9, 0],
    [16.6, L[4]],
    [17.3, L[4]],
    [22.9, L[7]],
    [25.9, L[8]],
    [28.3, L[9]],
    [30.5, L[10]],
  ];
  const busKeys: Key[] = [
    [0, 26],
    [3, 26],
    [8, -0.5, "out"],
    [24, -0.5],
    [28, -26, "in"],
    [32, -26],
  ];
  const liftKeys: Key[] = [
    [0, 0.9],
    [4, 0.9],
    [7, 4.4, "io"],
    [11, 4.4],
    [14, 0.9, "io"],
    [16, 0.9],
  ];

  /** `t` waktu latar (pohon, hujan) dan `storyT` waktu cerita, keduanya dalam detik; cerita berulang tiap PERIOD. */
  return function update(t: number, storyT: number) {
    const T = ((storyT % PERIOD) + PERIOD) % PERIOD;
    const busX = keys(busKeys, T);
    a.bus.g.position.set(busX, 0, 5.1);
    for (const w of a.bus.wheels) w.rotation.set(Math.PI / 2, busX / 0.33, 0);
    const sedanX = keys(
      [
        [0, -22],
        [6, 26],
        [32, 26],
      ],
      T,
    );
    a.sedan.g.position.set(sedanX, 0, 2.4);
    for (const w of a.sedan.wheels) w.rotation.set(Math.PI / 2, -sedanX / 0.3, 0);

    a.walker.g.visible = T >= 9 && T < 30.5;
    const dW = keys(walkKeys, T);
    const w = walkPath.at(dW);
    a.walker.g.position.copy(w.pos);
    a.walker.g.rotation.y = w.yaw;
    const stepping = !(T > 16.6 && T < 17.3);
    const ph = (dW / 0.62) * Math.PI;
    a.walker.legs[0].rotation.x = stepping ? Math.sin(ph) * 0.45 : 0;
    a.walker.legs[1].rotation.x = stepping ? -Math.sin(ph) * 0.45 : 0;
    a.walker.arms[0].rotation.x = stepping ? -Math.sin(ph) * 0.35 : 0;
    a.walker.arms[1].rotation.x = -0.35;
    a.canePivot.rotation.y = Math.sin(ph * 0.5) * 0.35;

    const dC = (T / PERIOD) * chairPath.total;
    const c = chairPath.at(dC);
    a.chair.g.position.copy(c.pos);
    a.chair.g.rotation.y = c.yaw;
    a.chair.g.visible = dC < chairPath.total - 0.05;
    for (const wh of a.chair.wheels) wh.rotation.x = dC / 0.3;

    cabin.position.y = keys(liftKeys, T % 16);

    for (const s of n.sway) {
      s.crown.rotation.z = Math.sin(t * 0.9 + s.phase) * s.amp;
      s.crown.rotation.x = Math.cos(t * 0.7 + s.phase) * s.amp * 0.6;
    }
    for (let i = 0; i < DROPS; i++) {
      const [x, z, o] = n.rain.drops[i];
      const y = 10.2 - ((t * 0.9 + o) % 1) * 9.6;
      n.rain.data.set([x, y, z, x - 0.04, y - 0.45, z], i * 6);
    }
    n.rain.geo.attributes.position.needsUpdate = true;
  };
}

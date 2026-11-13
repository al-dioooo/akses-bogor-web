// Adegan "Halte ke pintu" (ADR-0028): satu adegan untuk hero Beranda, bagian "Rute ke pintu", dan render diam.
// Dibangun dari kode tanpa berkas model; kameranya memakai sudut tetap per titik. Modul ini dan three.js dimuat
// malas oleh komponen, jadi hanya kelas yang dipakai yang masuk bundel.
import { DirectionalLight, Fog, Group, HemisphereLight, Mesh, PerspectiveCamera, PointLight, Scene, Vector3 } from "three";
import { buildActors } from "./actors";
import { buildBuildings } from "./buildings";
import { buildGround } from "./ground";
import { createKit, type Vec3 } from "./kit";
import { mergeStatic } from "./merge";
import { buildNature } from "./nature";
import { rng } from "./palette";
import { createStory } from "./story";

export type View = { target: Vec3; az: number; el: number; dist: number; fov: number; shift?: number };
/** Potongan bingkai yang tampil, pecahan 0..1 dari bingkai penuh, seperti `object-fit: cover`. */
export type Crop = { x: number; y: number; w: number; h: number };

/** Sudut kamera: `hero` untuk poster dan hero (bingkai 2:1, isi digeser ke kanan), lalu satu per fasilitas, kuncinya sama dengan `ROUTE`. */
export const VIEWS = {
  hero: { target: [3.2, 0.5, -4.8], az: 34, el: 33, dist: 92, fov: 24, shift: 0.2 },
  guiding_block: { target: [2.6, 0.5, 7.0], az: 30, el: 30, dist: 25, fov: 22 },
  ramp: { target: [-2.0, 1.2, -8.3], az: 24, el: 21, dist: 22, fov: 22 },
  toilet_difabel: { target: [10.6, 2.0, -11.2], az: 6, el: 16, dist: 21, fov: 22 },
  lift: { target: [14.4, 2.8, -12.0], az: 28, el: 16, dist: 27, fov: 22 },
} satisfies Record<string, View>;
export type ViewName = keyof typeof VIEWS;

/** Waktu cerita yang menampilkan pelaku tiap titik: pejalan di guiding block, kursi roda di ramp, lift di lantai dasar. */
export const STOP_TIME: Record<Exclude<ViewName, "hero">, number> = { guiding_block: 14, ramp: 26, toilet_difabel: 14, lift: 2 };

/** Titik pin 01–04 di adegan, urut seperti `ROUTE`. */
const PINS: Vec3[] = [
  [5.5, 0.9, 8.2],
  [-2.5, 2.2, -8],
  [10.6, 2.7, -10.4],
  [14.5, 9.6, -12.2],
];

const DEG = Math.PI / 180;

/** Campuran dua sudut kamera, untuk perpindahan antar titik. */
export function mixView(a: View, b: View, f: number): View {
  const m = (p: number, q: number) => p + (q - p) * f;
  return { target: [m(a.target[0], b.target[0]), m(a.target[1], b.target[1]), m(a.target[2], b.target[2])], az: m(a.az, b.az), el: m(a.el, b.el), dist: m(a.dist, b.dist), fov: m(a.fov, b.fov), shift: m(a.shift ?? 0, b.shift ?? 0) };
}

export function buildScene({ shadowSize = 2048 } = {}) {
  const scene = new Scene();
  const root = new Group();
  scene.add(root);
  const kit = createKit();
  const rand = rng(7);
  buildGround(kit, root);
  const buildings = buildBuildings(kit, root, rand);
  const nature = buildNature(kit, root, rand);
  const actors = buildActors(kit, root, buildings.cabin);
  const update = createStory(actors, buildings.cabin, nature);
  mergeStatic(root);

  const hemi = new HemisphereLight();
  const sun = new DirectionalLight();
  sun.position.set(-20, 36, 22);
  sun.target.position.set(2, 0, -5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 30, bottom: -30, near: 5, far: 110 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 3;
  const fill = new DirectionalLight();
  fill.position.set(30, 14, -6);
  // Lampu ruang toilet dan kabin lift menyala siang dan malam; lampu jalan, halte, dan pintu hanya malam.
  const room = new PointLight("#FFF3DE", 7, 7, 1.4);
  room.position.set(10.6, 3.8, -10.6);
  const cabinLight = new PointLight("#FFF3DE", 7, 7, 1.4);
  cabinLight.position.set(0, 2.3, 0.6);
  buildings.cabin.add(cabinLight);
  const nightLights = nature.lampHeads.map(([x, y, z]) => {
    const l = new PointLight("#FFD08A", 14, 9, 1.6);
    l.position.set(x, y, z);
    return l;
  });
  for (const [x, y, z] of [
    [-5.5, 2.4, 8.6],
    [5.5, 3.4, -7.8],
  ]) {
    const l = new PointLight("#FFE1A8", 10, 8, 1.6);
    l.position.set(x, y, z);
    nightLights.push(l);
  }
  const fog = new Fog("#F9F9F7", 82, 150);
  scene.fog = fog;
  scene.add(hemi, sun, sun.target, fill, room, ...nightLights);

  /** Siang atau malam (mode Gelap); `background` warna latar halaman supaya kabut menyatu dengannya. */
  function setNight(night: boolean, background: string) {
    hemi.color.set(night ? "#6F78C8" : "#FFFFFF");
    hemi.groundColor.set(night ? "#2B2747" : "#E9DFC8");
    hemi.intensity = night ? 1.1 : 1.55;
    sun.color.set(night ? "#AFC0FF" : "#FFF4E2");
    sun.intensity = night ? 0.9 : 2.7;
    fill.color.set(night ? "#8C6CFF" : "#E4DDFF");
    fill.intensity = night ? 0.5 : 0.55;
    buildings.lit.windows.emissiveIntensity = night ? 0.75 : 0;
    buildings.lit.ceiling.emissiveIntensity = night ? 1.4 : 0.6;
    nature.lit.lamp.emissiveIntensity = night ? 1.6 : 0;
    room.intensity = cabinLight.intensity = night ? 10 : 7;
    for (const l of nightLights) l.visible = night;
    fog.color.set(background);
  }
  setNight(false, "#F9F9F7");

  /**
   * Memasang kamera pada sudut `view`. `aspect` rasio bingkai penuh; `crop` bagian bingkai yang digambar ke kanvas,
   * jadi kanvas harus berasio `crop.w * aspect / crop.h`.
   */
  function frame(camera: PerspectiveCamera, view: View, aspect: number, crop?: Crop) {
    const az = view.az * DEG;
    const el = view.el * DEG;
    const target = new Vector3(...view.target);
    camera.fov = view.fov;
    camera.aspect = aspect;
    camera.position.set(target.x + Math.sin(az) * Math.cos(el) * view.dist, target.y + Math.sin(el) * view.dist, target.z + Math.cos(az) * Math.cos(el) * view.dist);
    camera.lookAt(target);
    const shift = view.shift ?? 0;
    if (shift || crop) {
      const c = crop ?? { x: 0, y: 0, w: 1, h: 1 };
      const W = 1000;
      const Hh = W / aspect;
      camera.setViewOffset(W, Hh, (c.x - shift) * W, c.y * Hh, c.w * W, c.h * Hh);
    } else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }

  function dispose() {
    scene.traverse((o) => {
      if (o instanceof Mesh) o.geometry.dispose();
    });
    for (const m of kit.materials()) m.dispose();
    for (const t of Object.values(kit.tex)) t.dispose();
  }

  return { scene, update, frame, setNight, dispose, pins: PINS.map((p) => new Vector3(...p)) };
}

export type Built = ReturnType<typeof buildScene>;

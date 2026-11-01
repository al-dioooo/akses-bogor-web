// Alat bantu membangun adegan: material matte yang di-cache, kotak dari batasnya, batang antara dua titik, prisma dari
// profil, dan piktogram yang digambar ke canvas. Satuan 1 = 1 meter, Y ke atas.
import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  FrontSide,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
  Texture,
  Vector2,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { C } from "./palette";

export type Span = [number, number];
export type Vec3 = [number, number, number];
export type MatOptions = { rough?: number; flat?: boolean; opacity?: number; glow?: string; glowI?: number; double?: boolean; map?: Texture };
export type Paint = string | Material;
export type MeshOptions = { m?: MatOptions; rx?: number; ry?: number; rz?: number; cast?: boolean; receive?: boolean };

const UP = new Vector3(0, 1, 0);

export function createKit() {
  const cache = new Map<string, MeshStandardMaterial>();

  /** Material "clay". Opsi yang sama mengembalikan objek yang sama, supaya geometri statis bisa digabung per material. */
  function mat(color: string, o: MatOptions = {}) {
    const key = [color, o.rough, o.flat, o.opacity, o.glow, o.glowI, o.double, o.map?.uuid].join("|");
    let m = cache.get(key);
    if (!m) {
      m = new MeshStandardMaterial({
        color,
        roughness: o.rough ?? 0.88,
        metalness: 0,
        flatShading: !!o.flat,
        transparent: o.opacity != null,
        opacity: o.opacity ?? 1,
        depthWrite: o.opacity == null,
        emissive: o.glow ?? "#000000",
        emissiveIntensity: o.glowI ?? 1,
        side: o.double ? DoubleSide : FrontSide,
        map: o.map ?? null,
      });
      cache.set(key, m);
    }
    return m;
  }
  const paint = (p: Paint, o?: MatOptions) => (typeof p === "string" ? mat(p, o) : p);

  function put(parent: Object3D, geo: BufferGeometry, material: Paint, x = 0, y = 0, z = 0, o: MeshOptions = {}) {
    const m = new Mesh(geo, paint(material, o.m));
    m.position.set(x, y, z);
    m.rotation.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
    m.castShadow = o.cast ?? true;
    m.receiveShadow = o.receive ?? true;
    parent.add(m);
    return m;
  }

  /** Kotak dari batas [x0, x1], [y0, y1], [z0, z1]; `r` membulatkan sudutnya. */
  function bx(parent: Object3D, [x0, x1]: Span, [y0, y1]: Span, [z0, z1]: Span, material: Paint, o: MeshOptions & { r?: number } = {}) {
    const w = x1 - x0;
    const h = y1 - y0;
    const d = z1 - z0;
    const r = o.r ? Math.min(o.r, w / 2.01, h / 2.01, d / 2.01) : 0;
    const geo = r > 0 ? new RoundedBoxGeometry(w, h, d, 2, r) : new BoxGeometry(w, h, d);
    return put(parent, geo, material, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, o);
  }

  /** Silinder dari titik a ke b, untuk tiang, pegangan, dan dahan. */
  function rod(parent: Object3D, a: Vec3, b: Vec3, r: number, material: Paint, o: MeshOptions & { seg?: number } = {}) {
    const va = new Vector3(...a);
    const vb = new Vector3(...b);
    const dir = vb.clone().sub(va);
    const m = put(parent, new CylinderGeometry(r, r, dir.length(), o.seg ?? 8), material, 0, 0, 0, o);
    m.position.copy(va).add(vb).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(UP, dir.normalize());
    return m;
  }

  /** Prisma: profil di bidang (x, y) diekstrusi dari z0 ke z1, mis. ramp dan kerb landai. */
  function profileX(parent: Object3D, pts: [number, number][], z0: number, z1: number, material: Paint, o: MeshOptions = {}) {
    const geo = new ExtrudeGeometry(new Shape(pts.map(([x, y]) => new Vector2(x, y))), { depth: z1 - z0, bevelEnabled: false });
    geo.translate(0, 0, z0);
    return put(parent, geo, material, 0, 0, 0, o);
  }

  /** Prisma: profil di bidang (z, y) diekstrusi dari x0 ke x1. */
  function profileZ(parent: Object3D, pts: [number, number][], x0: number, x1: number, material: Paint, o: MeshOptions = {}) {
    const geo = new ExtrudeGeometry(new Shape(pts.map(([z, y]) => new Vector2(z, y))), { depth: x1 - x0, bevelEnabled: false });
    geo.rotateY(-Math.PI / 2);
    geo.translate(x1, 0, 0);
    return put(parent, geo, material, 0, 0, 0, o);
  }

  function canvasTex(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    draw(c.getContext("2d")!, size);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }
  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  };

  // Simbol akses internasional, tanpa teks.
  const isa = canvasTex(256, (ctx, s) => {
    const u = s / 256;
    ctx.fillStyle = C.violet;
    roundRect(ctx, 0, 0, s, s, 40 * u);
    ctx.fillStyle = ctx.strokeStyle = C.white;
    ctx.lineCap = ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.arc(116 * u, 54 * u, 20 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 22 * u;
    ctx.beginPath();
    ctx.moveTo(110 * u, 92 * u);
    ctx.lineTo(110 * u, 150 * u);
    ctx.lineTo(166 * u, 150 * u);
    ctx.lineTo(190 * u, 204 * u);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(110 * u, 116 * u);
    ctx.lineTo(156 * u, 116 * u);
    ctx.stroke();
    ctx.lineWidth = 17 * u;
    ctx.beginPath();
    ctx.arc(112 * u, 172 * u, 50 * u, 0.12 * Math.PI, 1.38 * Math.PI);
    ctx.stroke();
  });
  // Piktogram bus untuk rambu halte.
  const bus = canvasTex(256, (ctx, s) => {
    const u = s / 256;
    ctx.fillStyle = C.violet;
    roundRect(ctx, 0, 0, s, s, 40 * u);
    ctx.fillStyle = C.white;
    roundRect(ctx, 52 * u, 50 * u, 152 * u, 132 * u, 22 * u);
    ctx.fillStyle = C.violet;
    roundRect(ctx, 68 * u, 70 * u, 120 * u, 50 * u, 8 * u);
    ctx.fillStyle = C.white;
    ctx.beginPath();
    ctx.arc(88 * u, 190 * u, 18 * u, 0, Math.PI * 2);
    ctx.arc(168 * u, 190 * u, 18 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.violet;
    ctx.beginPath();
    ctx.arc(84 * u, 152 * u, 9 * u, 0, Math.PI * 2);
    ctx.arc(172 * u, 152 * u, 9 * u, 0, Math.PI * 2);
    ctx.fill();
  });
  // Ubin lantai toilet, papan catur putih dan lavender.
  const tile = canvasTex(256, (ctx, s) => {
    const n = 4;
    const q = s / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        ctx.fillStyle = (i + j) % 2 ? C.lavenderPale : C.white;
        ctx.fillRect(i * q, j * q, q, q);
      }
    ctx.strokeStyle = "#D9D0F5";
    ctx.lineWidth = 3;
    for (let i = 0; i <= n; i++) {
      ctx.beginPath();
      ctx.moveTo(i * q, 0);
      ctx.lineTo(i * q, s);
      ctx.moveTo(0, i * q);
      ctx.lineTo(s, i * q);
      ctx.stroke();
    }
  });
  tile.wrapS = tile.wrapT = RepeatWrapping;
  tile.repeat.set(2.2, 2);

  /** Papan persegi bertekstur, mis. rambu bus dan plat simbol akses. */
  function plate(parent: Object3D, tex: Texture, size: number, x: number, y: number, z: number, ry = 0) {
    return put(parent, new PlaneGeometry(size, size), mat(C.white, { map: tex, rough: 0.6 }), x, y, z, { ry, cast: false });
  }

  return { mat, put, bx, rod, profileX, profileZ, plate, tex: { isa, bus, tile }, materials: () => cache.values() };
}

export type Kit = ReturnType<typeof createKit>;

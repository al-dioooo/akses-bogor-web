// Menggabungkan mesh statis per material supaya jumlah draw call turun dari ratusan menjadi puluhan. Subpohon
// bertanda `userData.dynamic` (kendaraan, orang, kabin lift, tajuk pohon dekat), instance, dan garis dilewati.
import { BufferGeometry, InstancedMesh, Material, Mesh, Object3D } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

type Bucket = { material: Material; cast: boolean; receive: boolean; geos: BufferGeometry[] };
const KEEP = ["position", "normal", "uv"];

export function mergeStatic(root: Object3D) {
  root.updateMatrixWorld(true);
  const buckets = new Map<string, Bucket>();
  const merged: Mesh[] = [];
  const walk = (o: Object3D) => {
    if (o.userData.dynamic) return;
    if (o instanceof Mesh && !(o instanceof InstancedMesh) && !Array.isArray(o.material)) {
      const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const name of Object.keys(geo.attributes)) if (!KEEP.includes(name)) geo.deleteAttribute(name);
      geo.applyMatrix4(o.matrixWorld);
      const key = `${o.material.uuid}|${o.castShadow}|${o.receiveShadow}`;
      const bucket: Bucket = buckets.get(key) ?? { material: o.material, cast: o.castShadow, receive: o.receiveShadow, geos: [] };
      bucket.geos.push(geo);
      buckets.set(key, bucket);
      merged.push(o);
    }
    for (const child of o.children) walk(child);
  };
  walk(root);
  for (const m of merged) {
    m.removeFromParent();
    m.geometry.dispose();
  }
  for (const { material, cast, receive, geos } of buckets.values()) {
    const geo = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!geo) continue;
    const mesh = new Mesh(geo, material);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    root.add(mesh);
  }
}

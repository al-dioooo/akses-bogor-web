// API tiruan untuk tes Playwright, supaya CI tidak butuh akses-bogor-api dan database.
// Datanya salinan respons API dari seed pengembangan (fixtures.json); filter meniru GET /places.
// Pencarian "galat-tiruan" menjawab 500, untuk menguji keadaan galat di web.
// GET /_tiruan/pengunjung?ip=... menjawab rahasia server web terakhir yang dikirim bersama IP pengunjung itu.
import { readFileSync } from "node:fs";
import { createServer } from "node:http";

const { districts, places } = JSON.parse(readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"));
const port = Number(process.env.PORT ?? 3101);
const secretsByVisitor = new Map();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const listItem = ({ id, name, category, district, status, summary, location, lastVerifiedAt, photos }) => ({
  id,
  name,
  category,
  district,
  status,
  summary,
  location,
  lastVerifiedAt,
  coverPhoto: photos.find((photo) => photo.tag === "pintu_masuk") ?? photos[0] ?? null,
});

const answer = (place, facility) => place.facilities.find((f) => f.facility === facility)?.answer;
const csv = (value) => (value ? value.split(",").filter(Boolean) : []);

function filterPlaces(query) {
  const q = query.get("q")?.toLowerCase();
  const [category, district, facility, status] = ["category", "district", "facility", "status"].map((key) =>
    csv(query.get(key)),
  );
  return places
    .filter((p) => !q || p.name.toLowerCase().includes(q))
    .filter((p) => !category.length || category.includes(p.category))
    .filter((p) => !district.length || district.includes(p.district.slug))
    .filter((p) => facility.every((f) => answer(p, f) === "tersedia"))
    .filter((p) => !status.length || status.includes(p.status))
    .sort((a, b) => a.name.localeCompare(b.name, "id"));
}

function route(url) {
  const { pathname, searchParams } = url;
  if (pathname === "/healthz") return [200, { status: "ok" }];
  if (pathname === "/_tiruan/pengunjung") return [200, { secret: secretsByVisitor.get(searchParams.get("ip")) ?? null }];
  if (pathname === "/districts") {
    return [200, districts.map((d) => ({ ...d, places: places.filter((p) => p.district.slug === d.slug).length }))];
  }
  if (pathname === "/places/stats") {
    const byCategory = { kampus: 0, masjid: 0, halte: 0, rumah_sakit: 0 };
    for (const p of places) byCategory[p.category] += 1;
    const stepFree = places.filter((p) => ["tersedia", "tidak_perlu"].includes(answer(p, "ramp"))).length;
    return [200, { places: places.length, byCategory, stepFreeEntrance: stepFree, contributors: 3 }];
  }
  if (pathname === "/places") {
    if (searchParams.get("q") === "galat-tiruan") return [500, { galat: "galat_server", pesan: "Galat tiruan." }];
    const limit = Number(searchParams.get("limit") ?? 20);
    const offset = Number(searchParams.get("offset") ?? 0);
    const found = filterPlaces(searchParams);
    return [200, { total: found.length, limit, offset, items: found.slice(offset, offset + limit).map(listItem) }];
  }
  const id = pathname.match(/^\/places\/([^/]+)$/)?.[1];
  if (id) {
    if (!UUID.test(id)) return [400, { galat: "permintaan_tidak_valid", pesan: "Id lokasi tidak valid." }];
    const place = places.find((p) => p.id === id);
    return place ? [200, place] : [404, { galat: "lokasi_tidak_ditemukan", pesan: "Lokasi tidak ditemukan." }];
  }
  return [404, { galat: "tidak_ditemukan", pesan: "Alamat tidak ditemukan." }];
}

createServer((request, response) => {
  const visitorIp = request.headers["x-visitor-ip"];
  if (visitorIp) secretsByVisitor.set(visitorIp, request.headers["x-web-server-secret"]);
  const [status, body] = route(new URL(request.url ?? "/", `http://localhost:${port}`));
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}).listen(port, () => console.log(`API tiruan di http://localhost:${port}`));

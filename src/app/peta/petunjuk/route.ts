import { ApiError, getProviderHints } from "@/lib/api";

// Isi penyedia tidak boleh disimpan browser atau Cloudflare (ADR-0052).
const NO_STORE = { "cache-control": "private, no-store" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OSM = /^(node|way|relation)\/([1-9][0-9]{0,15})$/;

/**
 * Petunjuk aksesibilitas dari Mapbox dan Google untuk Detail lokasi dan kartu Peta (ADR-0052), diteruskan dari API
 * bersama IP pengunjung supaya batas per pengunjung di API berlaku. `?lokasi=<id>` untuk lokasi AksesBogor dan
 * `?osm=<tipe>/<id>` untuk kandidat OSM. Jawabannya `{ hints, off }`; `off` berarti petunjuk dimatikan di API.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lokasi = params.get("lokasi");
  const osm = params.get("osm")?.match(OSM);
  if (lokasi ? !UUID.test(lokasi) : !osm) return Response.json({ galat: "permintaan_tidak_valid" }, { status: 400, headers: NO_STORE });
  try {
    const hints = await getProviderHints(lokasi ? { lokasi } : { osm: { type: osm![1]!, id: Number(osm![2]) } });
    return Response.json(hints, { headers: NO_STORE });
  } catch (error) {
    const galat = error instanceof ApiError ? error.galat : "galat_api";
    const status = error instanceof ApiError && error.status === 429 ? 429 : 503;
    return Response.json({ galat }, { status, headers: NO_STORE });
  }
}

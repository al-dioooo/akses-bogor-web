import { ApiError, getDistrictBoundaries } from "@/lib/api";

/**
 * Batas kecamatan untuk lapisan prioritas di Peta (ADR-0034), diteruskan dari API karena browser tidak memanggil API
 * langsung. Data OpenStreetMap yang jarang berubah, jadi boleh disimpan browser sehari.
 */
export async function GET() {
  try {
    return Response.json(await getDistrictBoundaries(), { headers: { "cache-control": "public, max-age=86400" } });
  } catch (error) {
    const galat = error instanceof ApiError ? error.galat : "galat_api";
    return Response.json({ galat }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}

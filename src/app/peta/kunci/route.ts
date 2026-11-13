import { ApiError, getMapToken } from "@/lib/api";

const NO_STORE = { "cache-control": "no-store" };

/**
 * Token Mapbox sementara untuk peta di browser (ADR-0016), diteruskan dari API karena browser tidak memanggil API
 * langsung. Dipanggil saat peta dibuka dan sebelum token kedaluwarsa.
 */
export async function GET() {
  try {
    return Response.json(await getMapToken(), { headers: NO_STORE });
  } catch (error) {
    const galat = error instanceof ApiError ? error.galat : "galat_api";
    return Response.json({ galat }, { status: 503, headers: NO_STORE });
  }
}

import { ApiError, getDistrictAccessibility } from "@/lib/api";

// Angkanya memuat salinan Google Maps, jadi tidak disimpan browser atau Cloudflare, sama seperti petunjuk (ADR-0052).
const NO_STORE = { "cache-control": "private, no-store" };

/**
 * Kecamatan paling aksesibel untuk lapisan tematik Peta (ADR-0053), diteruskan dari API karena browser tidak memanggil
 * API langsung. Dimuat saat lapisannya dipilih.
 */
export async function GET() {
  try {
    return Response.json(await getDistrictAccessibility(), { headers: NO_STORE });
  } catch (error) {
    const galat = error instanceof ApiError ? error.galat : "galat_api";
    return Response.json({ galat }, { status: 503, headers: NO_STORE });
  }
}

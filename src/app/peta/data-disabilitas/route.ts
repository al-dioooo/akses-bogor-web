import { ApiError, getDisabilityCounts } from "@/lib/api";

// Tidak disimpan, supaya lapisan langsung hilang begitu API menutup data disabilitas lagi (ADR-0043).
const NO_STORE = { "cache-control": "no-store" };

/**
 * Jumlah penyandang disabilitas terdaftar per kecamatan, jenis, dan tahun untuk lapisan Persebaran disabilitas di Peta
 * (ADR-0053), diteruskan dari API karena browser tidak memanggil API langsung. Dimuat saat lapisannya dipilih.
 */
export async function GET() {
  try {
    return Response.json(await getDisabilityCounts(), { headers: NO_STORE });
  } catch (error) {
    const galat = error instanceof ApiError ? error.galat : "galat_api";
    return Response.json({ galat }, { status: 503, headers: NO_STORE });
  }
}

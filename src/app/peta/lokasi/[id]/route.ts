import { ApiError, getPlace, type FacilitySummary, type PlaceListItem } from "@/lib/api";

/**
 * Isi tambahan kartu lokasi di Peta: kecamatan, ringkasan "X dari Y fasilitas" (ADR-0018), dan asal datanya untuk
 * label verifikasi (ADR-0051, ADR-0057).
 */
export type PlaceCardDetail = { district: string; summary: FacilitySummary } & Pick<PlaceListItem, "lastVerifiedAt" | "verifiedBy" | "verificationSource" | "streetViewImageDate">;

const NO_STORE = { "cache-control": "no-store" };

/**
 * Ringkasan lokasi yang dipilih di Peta, diteruskan dari API karena browser tidak memanggil API langsung. Data titik
 * peta tidak memuat ringkasan fasilitas, jadi diambil saat lokasi dipilih. Hanya data publik yang sudah terbit.
 */
export async function GET(_request: Request, { params }: RouteContext<"/peta/lokasi/[id]">) {
  const { id } = await params;
  try {
    const place = await getPlace(id);
    if (!place) return Response.json({ galat: "lokasi_tidak_ditemukan" }, { status: 404, headers: NO_STORE });
    const detail: PlaceCardDetail = {
      district: place.district.name,
      summary: place.summary,
      lastVerifiedAt: place.lastVerifiedAt,
      verifiedBy: place.verifiedBy,
      verificationSource: place.verificationSource,
      streetViewImageDate: place.streetViewImageDate,
    };
    return Response.json(detail, { headers: { "cache-control": "public, max-age=60" } });
  } catch (error) {
    const galat = error instanceof ApiError ? error.galat : "galat_api";
    return Response.json({ galat }, { status: 503, headers: NO_STORE });
  }
}

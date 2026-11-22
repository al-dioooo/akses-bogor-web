import { ImageResponse } from "next/og";
import { getFormatter, getTranslations } from "next-intl/server";
import messages from "../../../../messages/id.json";
import { PlaceCard } from "@/components/berbagi/kartu";
import { OG_SIZE } from "@/components/berbagi/ukuran";
import { getPlace } from "@/lib/api";
import { placeFacts } from "@/lib/metadata";
import { siteUrl } from "@/lib/situs";

/**
 * Gambar berbagi Detail lokasi (issue #114), dibuat saat request dari data tempat yang sudah diverifikasi: nama,
 * kategori, kecamatan, status, ringkasan fasilitas, dan tanggal verifikasi. Tidak ada klaim lain.
 */
export const alt = messages.Berbagi.placeAlt;
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const place = await getPlace(id);
  if (!place) return new Response(null, { status: 404 });
  const [t, detail, site, category, status, card, format] = await Promise.all([
    getTranslations("Berbagi"),
    getTranslations("Detail"),
    getTranslations("Metadata"),
    getTranslations("Kategori"),
    getTranslations("Status"),
    getTranslations("Lokasi"),
    getFormatter(),
  ]);
  const { summary, date } = placeFacts(place, card, format);
  return new ImageResponse(
    <PlaceCard
      siteName={site("title")}
      host={siteUrl().host}
      name={place.name}
      place={t("place", { category: category(place.category), district: place.district.name })}
      status={place.status}
      statusLabel={status(place.status)}
      facts={[summary, detail("verified", { date })]}
    />,
    size,
  );
}

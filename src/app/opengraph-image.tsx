import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import messages from "../../messages/id.json";
import { SiteCard } from "@/components/berbagi/kartu";
import { OG_SIZE } from "@/components/berbagi/ukuran";
import { FACILITIES } from "@/lib/api";
import { siteUrl } from "@/lib/situs";

/** Gambar berbagi bawaan untuk semua halaman (issue #114). Dibuat saat build karena tidak membaca data request. */
export const alt = messages.Berbagi.siteAlt;
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const [site, home, facility] = await Promise.all([getTranslations("Metadata"), getTranslations("Beranda"), getTranslations("Fasilitas")]);
  return new ImageResponse(
    <SiteCard
      siteName={site("title")}
      eyebrow={home("eyebrow")}
      lead={home("titleLead")}
      accent={home("titleAccent")}
      facilities={FACILITIES.map((key) => facility(key))}
      host={siteUrl().host}
    />,
    size,
  );
}

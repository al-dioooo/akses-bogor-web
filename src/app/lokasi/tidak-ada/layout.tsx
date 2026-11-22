import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

/** Metadata ditaruh di layout karena metadata halaman tidak dipakai saat halaman memanggil `notFound()`. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Detail.notFound");
  // Tanpa gambar berbagi, termasuk kartu situs bawaan: tidak ada lokasi untuk dibagikan.
  return { title: t("metaTitle"), openGraph: { images: [] }, twitter: { images: [] } };
}

export default function LokasiTidakAdaLayout({ children }: LayoutProps<"/lokasi/tidak-ada">) {
  return children;
}

import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { OG_SIZE } from "@/components/berbagi/ukuran";
import type { PlaceDetail } from "@/lib/api";
import { publicRobots } from "@/lib/situs";

type PublicPage = {
  /** Judul halaman tanpa nama situs; template root layout menambahkan " · AksesBogor". */
  title: string;
  /** Judul utuh tanpa template, untuk Beranda. */
  absoluteTitle?: boolean;
  description: string;
  /** Path kanonis tanpa query, mis. `/jelajahi`. Filter dan halaman hasil memakai URL kanonis yang sama. */
  path: string;
  siteName: string;
  /**
   * Teks alternatif gambar berbagi bawaan (`app/opengraph-image`). Objek `openGraph` halaman menggantikan gambar dari
   * segmen root, jadi halaman statis menyebutnya lagi. Detail lokasi tidak mengisinya: gambar di segmennya sendiri
   * yang dipakai.
   */
  defaultImageAlt?: string;
};

/**
 * Metadata halaman publik (issue #114): judul, deskripsi, URL kanonis, OpenGraph, kartu Twitter, dan izin indeks dari
 * saklar `SITE_INDEXABLE`. URL relatif dilengkapi `metadataBase` dari root layout.
 */
export function publicMetadata({ title, absoluteTitle = false, description, path, siteName, defaultImageAlt }: PublicPage): Metadata {
  // Kunci `images` hanya diisi bila ada gambar: `images: undefined` pun menimpa gambar dari berkas di segmen halaman.
  const images = defaultImageAlt
    ? { images: [{ url: "/opengraph-image", width: OG_SIZE.width, height: OG_SIZE.height, type: "image/png", alt: defaultImageAlt }] }
    : {};
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", locale: "id_ID", siteName, url: path, title, description, ...images },
    twitter: { card: "summary_large_image", title, description, ...images },
    robots: publicRobots(),
  };
}

/** Namespace pesan halaman publik yang punya `metaTitle` dan `metaDescription`. */
type PageNamespace =
  | "Beranda"
  | "Jelajahi"
  | "Peta"
  | "Aksesibilitas"
  | "Disabilitas"
  | "Tips"
  | "Tentang"
  | "KebijakanPrivasi"
  | "SyaratLayanan";

/** Metadata halaman publik statis dari `metaTitle` dan `metaDescription` di namespace-nya. */
export async function pageMetadata(namespace: PageNamespace, path: string): Promise<Metadata> {
  const [t, site, share] = await Promise.all([getTranslations(namespace), getTranslations("Metadata"), getTranslations("Berbagi")]);
  return publicMetadata({
    title: t("metaTitle"),
    absoluteTitle: path === "/",
    description: t("metaDescription"),
    path,
    siteName: site("title"),
    defaultImageAlt: share("siteAlt"),
  });
}

/**
 * Metadata Detail lokasi dari data tempat yang sudah diverifikasi: nama, kategori, kecamatan, status dalam kata-kata,
 * ringkasan fasilitas, dan tanggal verifikasi, seperti yang tampil di halamannya. Tidak ada klaim di luar data itu.
 */
export async function placeMetadata(place: PlaceDetail): Promise<Metadata> {
  const [t, site, description] = await Promise.all([getTranslations("Detail"), getTranslations("Metadata"), placeDescription(place)]);
  return publicMetadata({
    title: t("metaTitle", { name: place.name, district: place.district.name }),
    description,
    path: `/lokasi/${encodeURIComponent(place.id)}`,
    siteName: site("title"),
  });
}

/** Deskripsi Detail lokasi, dipakai untuk meta description dan JSON-LD `Place`. */
export async function placeDescription(place: PlaceDetail) {
  const [t, category, status, card, format] = await Promise.all([
    getTranslations("Detail"),
    getTranslations("Kategori"),
    getTranslations("Status"),
    getTranslations("Lokasi"),
    getFormatter(),
  ]);
  const { summary, date } = placeFacts(place, card, format);
  const description = t("metaDescription", {
    category: category(place.category),
    district: place.district.name,
    status: status(place.status),
    summary,
    date,
  });
  return place.needsRecheck ? `${description} ${t("metaRecheck")}` : description;
}

/**
 * Ringkasan fasilitas ("2 dari 3 fasilitas tersedia, 1 belum diketahui") dan tanggal verifikasi dalam teks, sama
 * dengan yang tampil di halaman lokasi. Dipakai untuk deskripsi dan gambar berbagi Detail lokasi.
 */
export function placeFacts(
  place: Pick<PlaceDetail, "summary" | "lastVerifiedAt">,
  card: Awaited<ReturnType<typeof getTranslations<"Lokasi">>>,
  format: Awaited<ReturnType<typeof getFormatter>>,
) {
  const { available, relevant, unknown } = place.summary;
  return {
    summary: [card("summary", { available, relevant }), unknown > 0 ? card("unknown", { count: unknown }) : null].filter(Boolean).join(", "),
    date: format.dateTime(new Date(place.lastVerifiedAt), { dateStyle: "long" }),
  };
}

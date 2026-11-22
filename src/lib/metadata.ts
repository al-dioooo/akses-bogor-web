import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
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
};

/**
 * Metadata halaman publik (issue #114): judul, deskripsi, URL kanonis, OpenGraph, kartu Twitter, dan izin indeks dari
 * saklar `SITE_INDEXABLE`. URL relatif dilengkapi `metadataBase` dari root layout. Gambar berbagi berasal dari berkas
 * `opengraph-image` terdekat, jadi tidak diisi di sini.
 */
export function publicMetadata({ title, absoluteTitle = false, description, path, siteName }: PublicPage): Metadata {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", locale: "id_ID", siteName, url: path, title, description },
    twitter: { card: "summary_large_image", title, description },
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
  const [t, site] = await Promise.all([getTranslations(namespace), getTranslations("Metadata")]);
  return publicMetadata({
    title: t("metaTitle"),
    absoluteTitle: path === "/",
    description: t("metaDescription"),
    path,
    siteName: site("title"),
  });
}

/**
 * Metadata Detail lokasi dari data tempat yang sudah diverifikasi: nama, kategori, kecamatan, status dalam kata-kata,
 * ringkasan fasilitas, dan tanggal verifikasi, seperti yang tampil di halamannya. Tidak ada klaim di luar data itu.
 */
export async function placeMetadata(place: PlaceDetail): Promise<Metadata> {
  const [t, category, status, card, site, format] = await Promise.all([
    getTranslations("Detail"),
    getTranslations("Kategori"),
    getTranslations("Status"),
    getTranslations("Lokasi"),
    getTranslations("Metadata"),
    getFormatter(),
  ]);
  const { available, relevant, unknown } = place.summary;
  const summary = [card("summary", { available, relevant }), unknown > 0 ? card("unknown", { count: unknown }) : null]
    .filter(Boolean)
    .join(", ");
  const description = t("metaDescription", {
    category: category(place.category),
    district: place.district.name,
    status: status(place.status),
    summary,
    date: format.dateTime(new Date(place.lastVerifiedAt), { dateStyle: "long" }),
  });
  return publicMetadata({
    title: t("metaTitle", { name: place.name, district: place.district.name }),
    description: place.needsRecheck ? `${description} ${t("metaRecheck")}` : description,
    path: `/lokasi/${encodeURIComponent(place.id)}`,
    siteName: site("title"),
  });
}

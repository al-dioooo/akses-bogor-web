import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
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


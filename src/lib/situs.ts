import type { Metadata } from "next";

/**
 * Alamat situs dan saklar pengindeksan (issue #114). Nilainya dibaca dari environment: saat build untuk halaman statis,
 * saat request untuk halaman dinamis dan sitemap. Setelah `SITE_URL` atau `SITE_INDEXABLE` diubah di Vercel, deploy
 * ulang supaya semua halaman memakai nilai yang sama.
 */

type Env = Record<string, string | undefined>;

/** Halaman publik yang boleh diindeks dan masuk sitemap, selain Detail lokasi. Halaman lain selalu `noindex`. */
export const PUBLIC_PATHS = [
  "/",
  "/jelajahi",
  "/peta",
  "/aksesibilitas",
  "/disabilitas",
  "/tips",
  "/tentang",
  "/kebijakan-privasi",
  "/syarat",
] as const;

/**
 * Asal situs untuk URL kanonis, OpenGraph, dan sitemap: `SITE_URL` bila diisi. Tanpa itu, urutannya sama dengan
 * bawaan Next.js: domain produksi Vercel di deploy produksi, alamat branch atau deploy di preview, lalu localhost.
 * Host dari request sengaja tidak dipakai: halaman statis dirender saat build, dan header `Host` bisa dipalsukan.
 */
export function siteUrl(env: Env = process.env): URL {
  const configured = env.SITE_URL?.trim();
  if (configured) {
    let url: URL;
    try {
      url = new URL(configured);
    } catch {
      throw new Error(`SITE_URL bukan URL yang valid: "${configured}". Contoh: https://akses-bogor.aldio.dev`);
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error(`SITE_URL harus diawali https:// atau http://, bukan "${configured}".`);
    }
    return new URL(url.origin);
  }
  const vercelHost = env.VERCEL_ENV === "production" ? env.VERCEL_PROJECT_PRODUCTION_URL : env.VERCEL_BRANCH_URL || env.VERCEL_URL;
  if (vercelHost) return new URL(`https://${vercelHost}`);
  // Sengaja tidak membaca PORT: `next start --port` mengisinya hanya saat runtime, sehingga metadata hasil build dan
  // hasil request berbeda dan halaman mendapat dua URL kanonis.
  return new URL("http://localhost:3000");
}

/** URL lengkap untuk sebuah path di situs, mis. `/lokasi/123` menjadi `https://akses-bogor.aldio.dev/lokasi/123`. */
export function absoluteUrl(path: string, env: Env = process.env) {
  return new URL(path, siteUrl(env)).href;
}

/**
 * Situs boleh diindeks hanya bila `SITE_INDEXABLE=true` dan `SITE_URL` diisi, supaya alamat cadangan (vercel.app atau
 * preview) tidak pernah diindeks. Bawaannya mati: staging belum boleh diindeks sebelum domain produksi dipilih.
 */
export function isIndexable(env: Env = process.env) {
  return env.SITE_INDEXABLE?.trim().toLowerCase() === "true" && Boolean(env.SITE_URL?.trim());
}

/** Tanda robots untuk halaman yang tidak boleh diindeks. Root layout memasangnya untuk semua halaman. */
export const NOINDEX: Metadata["robots"] = { index: false, follow: false };

/** Tanda robots untuk halaman publik: boleh diindeks hanya bila saklarnya menyala. */
export function publicRobots(env: Env = process.env): Metadata["robots"] {
  return isIndexable(env) ? { index: true, follow: true } : NOINDEX;
}

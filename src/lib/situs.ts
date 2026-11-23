import type { Metadata } from "next";

/**
 * Alamat situs dan saklar pengindeksan (issue #114). Nilainya dibaca dari environment: saat build untuk halaman statis,
 * saat request untuk halaman dinamis dan sitemap. Di server, keduanya ada di `/etc/akses-bogor/web.env`, dan perubahannya
 * membuat deploy berikutnya membangun ulang semua halaman.
 */

type Env = Record<string, string | undefined>;

/** Halaman publik yang boleh diindeks dan masuk sitemap, selain Detail lokasi. Halaman lain selalu `noindex`. */
export const PUBLIC_PATHS = [
  "/",
  "/jelajahi",
  "/peta",
  "/aksesibilitas",
  "/tanya-rute",
  "/tentang",
  "/kebijakan-privasi",
  "/syarat",
] as const;

// Penanda di globalThis, karena bundle route handler dan bundle halaman masing-masing memuat salinan modul ini.
const WARNED = Symbol.for("aksesbogor.situs.siteUrlKosong");

/**
 * Server produksi tanpa `SITE_URL` menulis URL kanonis dan sitemap ke localhost tanpa terlihat salah, jadi beri tahu di
 * log, sekali per proses. Saat build tidak: CI dan tes lokal sengaja tanpa `SITE_URL`, dan skrip deploy sudah menolak
 * build tanpa nilai itu.
 */
function warnMissingSiteUrl(env: Env) {
  const flags = globalThis as { [WARNED]?: boolean };
  if (flags[WARNED] || env.NODE_ENV !== "production" || env.NEXT_PHASE === "phase-production-build") return;
  flags[WARNED] = true;
  console.warn(
    "SITE_URL kosong: URL kanonis, OpenGraph, sitemap, dan robots.txt memakai http://localhost:3000. " +
      "Isi SITE_URL di /etc/akses-bogor/web.env, lalu deploy ulang.",
  );
}

/**
 * Asal situs untuk URL kanonis, OpenGraph, dan sitemap: `SITE_URL` bila diisi, selain itu `http://localhost:3000`.
 * Host dari request sengaja tidak dipakai: halaman statis dirender saat build, dan header `Host` bisa dipalsukan.
 */
export function siteUrl(env: Env = process.env): URL {
  const configured = configuredSiteUrl(env);
  if (configured) return configured;
  warnMissingSiteUrl(env);
  // Sengaja tidak membaca PORT: `next start --port` mengisinya hanya saat runtime, sehingga metadata hasil build dan
  // hasil request berbeda dan halaman mendapat dua URL kanonis.
  return new URL("http://localhost:3000");
}

/** Asal dari `SITE_URL`, atau null bila kosong (tanpa alamat cadangan). Melempar galat bila nilainya tidak valid. */
export function configuredSiteUrl(env: Env = process.env): URL | null {
  const configured = env.SITE_URL?.trim();
  if (!configured) return null;
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

/** URL lengkap untuk sebuah path di situs, mis. `/lokasi/123` menjadi `https://akses-bogor.aldio.dev/lokasi/123`. */
export function absoluteUrl(path: string, env: Env = process.env) {
  return new URL(path, siteUrl(env)).href;
}

/**
 * Situs boleh diindeks hanya bila `SITE_INDEXABLE=true` dan `SITE_URL` diisi, supaya alamat cadangan (localhost) tidak
 * pernah diindeks. Bawaannya mati: staging belum boleh diindeks sebelum domain produksi dipilih.
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

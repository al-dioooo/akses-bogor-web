import type { MetadataRoute } from "next";
import { absoluteUrl, isIndexable } from "@/lib/situs";

/**
 * robots.txt (issue #114). Selama saklar pengindeksan mati, semua crawler dilarang. Saat menyala, crawler boleh
 * membuka semua halaman dan diarahkan ke sitemap. Halaman akun, masuk, Laporkan, dan verifikasi tidak diblokir di sini
 * supaya crawler bisa membaca tanda `noindex` di halamannya. Hanya `/peta/kunci` yang diblokir, karena setiap
 * panggilannya membuat token Mapbox sementara.
 */
export default function robots(): MetadataRoute.Robots {
  if (!isIndexable()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/peta/kunci" },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}

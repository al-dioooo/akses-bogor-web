import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // src/proxy.ts menerima URL apa adanya, sama dengan yang dipakai router (issue #156). Tanpa ini Next.js mengganti
  // 127.0.0.1 (alamat bind di Evergarden, ADR-0048) dengan localhost, sehingga rewrite ke /lokasi/tidak-ada dianggap
  // eksternal dan diproxy lewat https di balik Cloudflare Tunnel. Header `rsc` juga tidak lagi dibuang dari proxy.
  skipProxyUrlNormalize: true,
  // Halaman Disabilitas dan Tips dihapus (issue #200). Tautan lama yang sudah dibagikan dialihkan permanen (308) ke
  // Aksesibilitas, halaman edukasi yang tersisa.
  async redirects() {
    return [
      { source: "/disabilitas", destination: "/aksesibilitas", permanent: true },
      { source: "/tips", destination: "/aksesibilitas", permanent: true },
      // Tanya rute dan Bantu memetakan digabung menjadi Agen AI (ADR-0054). Query tetap ikut, jadi
      // /tanya-rute?tempat=<id> membuka Agen AI dengan tempat itu. Route handler di bawah kedua path tidak ikut dialihkan.
      { source: "/tanya-rute", destination: "/agen", permanent: true },
      { source: "/laporkan/bantu-memetakan", destination: "/agen", permanent: true },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // src/proxy.ts menerima URL apa adanya, sama dengan yang dipakai router (issue #156). Tanpa ini Next.js mengganti
  // 127.0.0.1 (alamat bind di Evergarden, ADR-0048) dengan localhost, sehingga rewrite ke /lokasi/tidak-ada dianggap
  // eksternal dan diproxy lewat https di balik Cloudflare Tunnel. Header `rsc` juga tidak lagi dibuang dari proxy.
  skipProxyUrlNormalize: true,
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

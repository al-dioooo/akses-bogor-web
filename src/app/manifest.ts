import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";
import { tokenColor } from "@/components/berbagi/token";

/**
 * Web app manifest (issue #114). Warna dari token mode Terang: latar kanvas dan Ungu Inklusi. Ikon dibuat oleh
 * scripts/ikon.mjs (issue #127); yang maskable punya ruang aman untuk bentuk ikon Android.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations("Metadata");
  return {
    name: t("title"),
    short_name: t("title"),
    description: t("description"),
    lang: "id",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: tokenColor("color/bg/canvas"),
    theme_color: tokenColor("color/brand/fill"),
    icons: [
      { src: "/ikon/ikon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/ikon/ikon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/ikon/ikon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";
import { tokenColor } from "@/components/berbagi/token";

/**
 * Web app manifest (issue #114). Warna dari token mode Terang: latar kanvas dan Ungu Inklusi. Ikon ditambahkan setelah
 * konsep ikon dipilih.
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
  };
}

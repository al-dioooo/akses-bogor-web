import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalDocument } from "@/components/legal/legal-document";
import { TERMS_VERSION } from "@/lib/kebijakan";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("SyaratLayanan");
  return { title: t("metaTitle") };
}

/** Syarat Layanan (FR-50), disalin dari akses-bogor-docs (product/syarat-layanan.md). Halaman statis tanpa data dari API. */
export default function SyaratLayanan() {
  return <LegalDocument namespace="SyaratLayanan" version={TERMS_VERSION} />;
}

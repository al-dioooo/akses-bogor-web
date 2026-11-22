import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";
import { TERMS_VERSION } from "@/lib/kebijakan";
import { pageMetadata } from "@/lib/metadata";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("SyaratLayanan", "/syarat");
}

/** Syarat Layanan (FR-50), disalin dari akses-bogor-docs (product/syarat-layanan.md). Halaman statis tanpa data dari API. */
export default function SyaratLayanan() {
  return <LegalDocument namespace="SyaratLayanan" version={TERMS_VERSION} />;
}

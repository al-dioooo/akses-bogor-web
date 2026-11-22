import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";
import { PRIVACY_POLICY_VERSION } from "@/lib/kebijakan";
import { pageMetadata } from "@/lib/metadata";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("KebijakanPrivasi", "/kebijakan-privasi");
}

/**
 * Kebijakan Privasi (FR-11, FR-50), disalin dari akses-bogor-docs (product/kebijakan-privasi.md). Versinya sama dengan
 * yang disetujui di Lengkapi Akun. Halaman statis tanpa data dari API.
 */
export default function KebijakanPrivasi() {
  return <LegalDocument namespace="KebijakanPrivasi" version={PRIVACY_POLICY_VERSION} />;
}

import type { Metadata } from "next";

// Panel verifikator tidak diindeks mesin pencari dan tidak ada di navigasi publik (ADR-0035).
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function VerifikasiLayout({ children }: LayoutProps<"/verifikasi">) {
  return children;
}

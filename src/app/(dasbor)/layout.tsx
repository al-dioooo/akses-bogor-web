import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { DashboardSidebar, SidebarSkeleton } from "@/components/dasbor/sidebar";

// Halaman akun tidak berguna di mesin pencari; panel verifikator memang noindex sejak ADR-0035.
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Kerangka dasbor untuk semua halaman yang butuh akun (ADR-0046): sidebar di layar lebar, menu ringkas di ponsel,
 * lalu isi halaman di `main`. Header, footer, dan Bottom nav tetap dari root layout. Setiap halaman tetap memeriksa
 * sesi dan perannya sendiri.
 */
export default function DasborLayout({ children }: { children: ReactNode }) {
  return (
    <div className="page-width flex flex-1 flex-col gap-6 pt-4 pb-10 sm:pt-6 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-12 lg:pt-8 lg:pb-16">
      <Suspense fallback={<SidebarSkeleton />}>
        <DashboardSidebar />
      </Suspense>
      <main id="konten" className="flex min-w-0 flex-col gap-8">
        {children}
      </main>
    </div>
  );
}

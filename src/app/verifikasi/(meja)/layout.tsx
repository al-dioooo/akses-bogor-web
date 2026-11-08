import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { DeskNav } from "@/components/verifikasi/desk-nav";
import { NoAccess } from "@/components/verifikasi/no-access";
import { verifierSession } from "@/lib/verifikator";
import { SectionHeading } from "@/ui/section-heading";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Verifikasi");
  return { title: t("metaTitle") };
}

/** Meja verifikasi (FR-30, FR-38, ADR-0035): antrean, laporan yang menunggu jawaban, cek ulang, dan Tim untuk admin. */
export default async function MejaLayout({ children }: LayoutProps<"/verifikasi">) {
  const t = await getTranslations("Verifikasi");
  return (
    <main id="konten" className="page-width flex flex-1 flex-col gap-8 py-10 sm:py-16">
      <SectionHeading id="judul-meja" level={1} label={t("eyebrow")} title={t("title")} accent={t("accent")} intro={t("intro")} />
      <Suspense fallback={<p role="status">{t("queue.loading")}</p>}>
        <Gate>{children}</Gate>
      </Suspense>
    </main>
  );
}

async function Gate({ children }: { children: React.ReactNode }) {
  const session = await verifierSession("/verifikasi");
  // Halaman di bawahnya tetap dirender, tetapi tidak memuat apa pun untuk akun tanpa peran verifikator.
  if (!session) {
    return (
      <>
        <NoAccess />
        {children}
      </>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <DeskNav admin={session.user.role === "admin"} />
      {children}
    </div>
  );
}

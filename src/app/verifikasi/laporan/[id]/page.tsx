import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { NoAccess } from "@/components/verifikasi/no-access";
import { ReviewHeader } from "@/components/verifikasi/periksa/review-header";
import { ReviewSheet } from "@/components/verifikasi/periksa/review-sheet";
import { ApiError } from "@/lib/api";
import { getReview } from "@/lib/verifikasi";
import { verifierSession } from "@/lib/verifikator";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Pemeriksaan");
  return { title: t("metaTitle") };
}

/** Halaman pemeriksaan satu laporan (FR-31 sampai FR-34). */
export default async function Periksa({ params }: PageProps<"/verifikasi/laporan/[id]">) {
  const t = await getTranslations("Pemeriksaan");
  return (
    <main id="konten" className="page-width flex flex-1 flex-col gap-10 py-10 sm:py-16">
      <Suspense fallback={<p role="status">{t("loading")}</p>}>
        <Sheet params={params} />
      </Suspense>
    </main>
  );
}

async function Sheet({ params }: { params: PageProps<"/verifikasi/laporan/[id]">["params"] }) {
  const { id } = await params;
  const session = await verifierSession(`/verifikasi/laporan/${id}`);
  if (!session) return <NoAccess />;
  const t = await getTranslations("Pemeriksaan.own");
  // Verifikator tidak memeriksa laporannya sendiri (FR-37); API menjawab 403 `laporan_sendiri`.
  const review = await getReview(session.token, id).catch((error: unknown) => {
    if (error instanceof ApiError && error.galat === "laporan_sendiri") return "sendiri" as const;
    throw error;
  });
  if (!review) notFound();
  if (review === "sendiri") {
    return (
      <section aria-labelledby="laporan-sendiri" className="flex max-w-xl flex-col gap-3 rounded-3xl bg-bg-sunken p-6 sm:p-8">
        <h1 id="laporan-sendiri" className="font-heading text-2xl font-bold">
          {t("title")}
        </h1>
        <p className="text-text-secondary">{t("body")}</p>
      </section>
    );
  }
  return (
    <>
      <ReviewHeader review={review} now={new Date()} />
      <ReviewSheet review={review} />
    </>
  );
}

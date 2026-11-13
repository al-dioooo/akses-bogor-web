import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ReportForm } from "@/components/laporkan/report-form";
import { getPlace } from "@/lib/api";
import type { ReportKind } from "@/lib/laporan";
import { hasSession } from "@/lib/sesi";
import { LoadErrorBoundary } from "@/ui/load-error";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Laporkan");
  return { title: t("metaTitle") };
}

/**
 * Laporkan (FR-20 sampai FR-27). Formulir bisa diisi tanpa akun; masuk diminta saat "Kirim laporan" (ADR-0033).
 * `?lokasi=<id>` membuka Edit lokasi, dan `&jenis=kekurangan` membuka Laporkan kekurangan, terisi data saat ini (FR-27).
 */
export default async function LaporkanPage({ searchParams }: PageProps<"/laporkan">) {
  const t = await getTranslations("Laporkan");
  return (
    <main id="konten" className="page-width flex flex-1 flex-col items-center py-8 sm:py-12">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <LoadErrorBoundary>
          <Suspense
            fallback={
              <p role="status" className="rounded-3xl bg-bg-sunken p-6 text-text-secondary">
                {t("loading")}
              </p>
            }
          >
            <Report searchParams={searchParams} />
          </Suspense>
        </LoadErrorBoundary>
      </div>
    </main>
  );
}

async function Report({ searchParams }: { searchParams: PageProps<"/laporkan">["searchParams"] }) {
  const [params, t, signedIn] = await Promise.all([searchParams, getTranslations("Laporkan"), hasSession()]);
  const placeId = typeof params.lokasi === "string" ? params.lokasi : null;
  const place = placeId ? await getPlace(placeId) : null;
  if (placeId && !place) notFound();
  const kind: ReportKind = place ? (params.jenis === "kekurangan" ? "kekurangan" : "perubahan") : "baru";
  return (
    <>
      <div className="flex flex-col items-start gap-3">
        <p className="lbl">{t("eyebrow")}</p>
        <h1 className="display text-[clamp(2.25rem,1.6rem+2.4vw,3.25rem)] leading-none">
          {t(`title.${kind}`)}
          {place && <span className="accent"> {place.name}</span>}
        </h1>
        <p className="text-lg text-text-secondary">{t(`intro.${kind}`, { name: place?.name ?? "" })}</p>
      </div>
      <ReportForm kind={kind} place={place} signedIn={signedIn} />
    </>
  );
}

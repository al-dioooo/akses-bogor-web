import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ReportForm } from "@/components/laporkan/report-form";
import { agentEnabled } from "@/lib/agen-rute";
import { getPlace } from "@/lib/api";
import { parseCandidatePrefill } from "@/lib/kandidat";
import type { ReportKind } from "@/lib/laporan";
import { hasSession } from "@/lib/sesi";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconCompass } from "@/ui/icons";
import { LoadErrorBoundary } from "@/ui/load-error";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Laporkan");
  return { title: t("metaTitle") };
}

/**
 * Laporkan (FR-20 sampai FR-27). Formulir bisa diisi tanpa akun; masuk diminta saat "Kirim laporan" (ADR-0033).
 * `?lokasi=<id>` membuka Edit lokasi, dan `&jenis=kekurangan` membuka Laporkan kekurangan, terisi data saat ini (FR-27).
 * `?osm=<tipe>/<id>&nama=&kategori=&lat=&lng=` membuka laporan baru dari kandidat OpenStreetMap di Peta (ADR-0049).
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
  const prefill = placeId ? null : parseCandidatePrefill(params);
  // Bantu memetakan hanya ditawarkan untuk laporan baru, kepada akun yang sudah masuk, selama API membuka agen.
  const helper = kind === "baru" && signedIn && (await agentEnabled());
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
      {helper && <MappingHelper />}
      <ReportForm kind={kind} place={place} prefill={prefill} signedIn={signedIn} />
    </>
  );
}

/** Jalan ke Bantu memetakan (ADR-0043) untuk pelapor yang belum tahu tempat mana yang perlu didata. */
async function MappingHelper() {
  const t = await getTranslations("BantuMemetakan.entry");
  return (
    <aside aria-labelledby="bantu-memetakan-judul" className="flex flex-col items-start gap-3 rounded-3xl bg-surface-brand-subtle p-5">
      <h2 id="bantu-memetakan-judul" className="flex items-start gap-2 font-heading text-lg font-bold">
        <Icon icon={IconCompass} className="mt-0.5 size-5 shrink-0 text-icon-brand" />
        {t("title")}
      </h2>
      <p>{t("body")}</p>
      <Link href="/laporkan/bantu-memetakan" className={buttonClass("outline", "sm")}>
        {t("link")}
      </Link>
    </aside>
  );
}

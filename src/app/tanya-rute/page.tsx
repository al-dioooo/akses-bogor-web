import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { RouteAssistant } from "@/components/tanya-rute/route-assistant";
import { isPlaceId } from "@/lib/agen-rute-isian";
import { getPlace } from "@/lib/api";
import { pageMetadata } from "@/lib/metadata";
import { assistantStatus } from "@/lib/tanya-rute";
import { Icon } from "@/ui/icon";
import { IconInfoCircle } from "@/ui/icons";
import { LoadErrorBoundary } from "@/ui/load-error";
import { SectionHeading } from "@/ui/section-heading";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("TanyaRute", "/tanya-rute");
}

/**
 * Tanya rute (ADR-0050): asisten rute publik untuk siapa pun, juga tanpa akun. Judul tampil langsung; status asisten
 * dan lokasi dari `?tempat=` dibaca saat request. Selama API belum membuka asisten, halaman hanya memberi tahu bahwa
 * fitur ini belum dibuka.
 */
export default async function TanyaRutePage({ searchParams }: PageProps<"/tanya-rute">) {
  const t = await getTranslations("TanyaRute");
  return (
    <main id="konten" className="page-width flex flex-1 flex-col gap-8 pt-8 sm:pt-12">
      <SectionHeading id="judul-tanya-rute" level={1} label={t("eyebrow")} title={t("title")} accent={t("accent")} intro={t("intro")} />
      <LoadErrorBoundary>
        <Suspense
          fallback={
            <p role="status" className="max-w-3xl rounded-3xl bg-bg-sunken p-6 text-text-secondary">
              {t("loading")}
            </p>
          }
        >
          <Assistant searchParams={searchParams} />
        </Suspense>
      </LoadErrorBoundary>
    </main>
  );
}

async function Assistant({ searchParams }: { searchParams: PageProps<"/tanya-rute">["searchParams"] }) {
  const [status, params, t] = await Promise.all([assistantStatus(), searchParams, getTranslations("TanyaRute")]);
  if (!status?.enabled) {
    return (
      <div className="flex max-w-3xl gap-3 rounded-3xl bg-bg-sunken p-5">
        <Icon icon={IconInfoCircle} className="mt-0.5 size-6 shrink-0 text-icon-brand" />
        <p>
          <strong className="block font-heading text-lg">{t("unavailable.title")}</strong>
          {t("unavailable.body")}
        </p>
      </div>
    );
  }
  // Lokasi dari "Tanya rute ke sini". Id yang salah, lokasi yang tidak ada, atau API yang galat hanya membuat halaman
  // tampil tanpa tujuan terpilih.
  const id = typeof params.tempat === "string" && isPlaceId(params.tempat) ? params.tempat : undefined;
  const place = id ? await getPlace(id).catch(() => null) : null;
  return <RouteAssistant place={place ? { id: place.id, name: place.name } : undefined} questionsPerDay={status.questionsPerDay} />;
}

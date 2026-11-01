import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PlaceDetail } from "@/components/lokasi/place-detail";
import { getPlace } from "@/lib/api";
import { Icon } from "@/ui/icon";
import { IconArrowLeft } from "@/ui/icons";
import { LoadErrorBoundary } from "@/ui/load-error";

export async function generateMetadata({ params }: PageProps<"/lokasi/[id]">): Promise<Metadata> {
  const [{ id }, t] = await Promise.all([params, getTranslations("Detail.notFound")]);
  const place = await getPlace(id);
  return { title: place?.name ?? t("metaTitle") };
}

/** Detail lokasi (ADR-0027). Tautan kembali tampil langsung; isi lokasi diambil saat request. */
export default async function LokasiPage({ params }: PageProps<"/lokasi/[id]">) {
  const t = await getTranslations("Detail");
  return (
    <main id="konten" className="page-width flex flex-1 flex-col gap-6 pt-6 sm:pt-8">
      <Link
        href="/jelajahi"
        className="-ml-3 inline-flex min-h-11 items-center gap-2 self-start rounded-full px-3 font-bold hover:bg-surface-hover"
      >
        <Icon icon={IconArrowLeft} />
        {t("back")}
      </Link>
      <LoadErrorBoundary>
        <Suspense fallback={<DetailSkeleton label={t("loading")} />}>
          <Place params={params} />
        </Suspense>
      </LoadErrorBoundary>
    </main>
  );
}

async function Place({ params }: { params: PageProps<"/lokasi/[id]">["params"] }) {
  const { id } = await params;
  const place = await getPlace(id);
  if (!place) notFound();
  return <PlaceDetail place={place} />;
}

function DetailSkeleton({ label }: { label: string }) {
  return (
    <div role="status" className="grid items-end gap-8 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="flex flex-col gap-4">
        <span className="h-4 w-40 rounded-sm bg-bg-sunken" />
        <span className="h-16 w-4/5 rounded-lg bg-bg-sunken" />
      </div>
      <div aria-hidden="true" className="h-72 rounded-[1.75rem] bg-bg-sunken" />
    </div>
  );
}

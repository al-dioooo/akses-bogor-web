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

/** Detail lokasi (Detail · DS v1). Tautan kembali tampil langsung; isi lokasi diambil saat request. */
export default async function LokasiPage({ params }: PageProps<"/lokasi/[id]">) {
  const t = await getTranslations("Detail");
  return (
    <main id="konten" className="page-width flex flex-1 flex-col gap-6 pt-8 sm:pt-10">
      <Link
        href="/jelajahi"
        className="-ml-3 inline-flex min-h-11 items-center gap-2 self-start rounded-full px-3 font-semibold text-text-brand hover:bg-surface-hover"
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
    <div role="status" className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="flex flex-col gap-4">
        <span className="h-8 w-32 rounded-full bg-surface-brand-subtle" />
        <span className="h-14 w-4/5 rounded-lg bg-surface-brand-subtle" />
        <span className="h-6 w-1/2 rounded-sm bg-surface-brand-subtle" />
      </div>
      <div aria-hidden="true" className="panel aspect-[16/10] rounded-2xl" />
    </div>
  );
}

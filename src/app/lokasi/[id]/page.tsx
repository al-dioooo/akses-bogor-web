import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { cache, Suspense } from "react";
import { JsonLd } from "@/components/json-ld";
import { PlaceDetail } from "@/components/lokasi/place-detail";
import { getPlace } from "@/lib/api";
import { placeJsonLd } from "@/lib/json-ld";
import { placeDescription, placeMetadata } from "@/lib/metadata";
import { absoluteUrl } from "@/lib/situs";
import { Icon } from "@/ui/icon";
import { IconArrowLeft } from "@/ui/icons";
import { LoadErrorBoundary } from "@/ui/load-error";

/** Metadata dan isi halaman memakai satu permintaan API yang sama. */
const findPlace = cache(getPlace);

/** Tanpa gambar berbagi: gambar segmen ini hanya ada untuk lokasi yang tayang. */
const NO_SHARE_IMAGE = { openGraph: { images: [] }, twitter: { images: [] } } satisfies Metadata;

export async function generateMetadata({ params }: PageProps<"/lokasi/[id]">): Promise<Metadata> {
  const { id } = await params;
  try {
    const place = await findPlace(id);
    if (place) return placeMetadata(place);
    const t = await getTranslations("Detail.notFound");
    return { title: t("metaTitle"), ...NO_SHARE_IMAGE };
  } catch {
    // Hanya terjadi saat navigasi di dalam aplikasi: LoadErrorBoundary menampilkan galatnya. Permintaan halaman biasa
    // sudah dijawab 503 oleh src/proxy.ts sebelum render (issue #150).
    const t = await getTranslations("GagalMemuat");
    return { title: t("title"), ...NO_SHARE_IMAGE };
  }
}

/**
 * Detail lokasi (ADR-0027). Tautan kembali tampil langsung; isi lokasi diambil saat request. Status 404 dan 503 diatur
 * src/proxy.ts sebelum render, karena status 200 sudah terkirim bersama kerangka halaman.
 */
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
  const place = await findPlace(id);
  if (!place) notFound();
  const [facility, description] = await Promise.all([getTranslations("Fasilitas"), placeDescription(place)]);
  const url = absoluteUrl(`/lokasi/${encodeURIComponent(place.id)}`);
  return (
    <>
      <JsonLd data={placeJsonLd(place, { url, description, facility: (key) => facility(key) })} />
      <PlaceDetail place={place} />
    </>
  );
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

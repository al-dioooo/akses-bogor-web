import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ContributorChat } from "@/components/bantu-memetakan/contributor-chat";
import { agentEnabled } from "@/lib/agen-rute";
import { requireAccount } from "@/lib/sesi";
import { Icon } from "@/ui/icon";
import { IconArrowLeft, IconInfoCircle } from "@/ui/icons";
import { LoadErrorBoundary } from "@/ui/load-error";
import { SectionHeading } from "@/ui/section-heading";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("BantuMemetakan");
  return { title: t("metaTitle") };
}

/**
 * Bantu memetakan (FR-60, ADR-0042, ADR-0043): agen membantu kontributor menemukan fasilitas publik yang belum punya
 * data AksesBogor, diurutkan menurut prioritas kecamatan. Hanya untuk akun yang sudah masuk; selama API belum membuka
 * agen, halaman hanya memberi tahu bahwa fitur ini belum dibuka.
 */
export default async function BantuMemetakanPage() {
  const t = await getTranslations("BantuMemetakan");
  return (
    <main id="konten" className="page-width flex flex-1 flex-col items-center py-6 sm:py-8">
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <Link href="/laporkan" className="-ml-3 inline-flex min-h-11 items-center gap-2 self-start rounded-full px-3 font-bold hover:bg-surface-hover">
          <Icon icon={IconArrowLeft} />
          {t("back")}
        </Link>
        <SectionHeading id="judul-bantu" level={1} label={t("eyebrow")} title={t("title")} accent={t("accent")} />
        <LoadErrorBoundary>
          <Suspense
            fallback={
              <p role="status" className="rounded-3xl bg-bg-sunken p-6 text-text-secondary">
                {t("loading")}
              </p>
            }
          >
            <Agent />
          </Suspense>
        </LoadErrorBoundary>
      </div>
    </main>
  );
}

async function Agent() {
  await requireAccount("/laporkan/bantu-memetakan");
  const [enabled, t] = await Promise.all([agentEnabled(), getTranslations("BantuMemetakan")]);
  if (!enabled) {
    return (
      <div className="flex gap-3 rounded-3xl bg-bg-sunken p-5">
        <Icon icon={IconInfoCircle} className="mt-0.5 size-6 shrink-0 text-icon-brand" />
        <p>
          <strong className="block font-heading text-lg">{t("unavailable.title")}</strong>
          {t("unavailable.body")}
        </p>
      </div>
    );
  }
  return (
    <>
      <p className="text-lg text-text-secondary">{t("intro")}</p>
      <ContributorChat />
    </>
  );
}

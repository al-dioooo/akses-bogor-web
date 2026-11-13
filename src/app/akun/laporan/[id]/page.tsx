import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ClarificationAnswer } from "@/components/akun/clarification-answer";
import { ClarificationThread } from "@/components/verifikasi/periksa/clarification-thread";
import { getMyReport } from "@/lib/akun";
import { requireAccount } from "@/lib/sesi";
import { Icon } from "@/ui/icon";
import { IconArrowLeft } from "@/ui/icons";
import { SectionHeading } from "@/ui/section-heading";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("JawabKlarifikasi");
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

/** Halaman jawab klarifikasi, ditautkan dari email dan Laporan saya (FR-41, ADR-0036). */
export default async function JawabKlarifikasi({ params }: PageProps<"/akun/laporan/[id]">) {
  const t = await getTranslations("JawabKlarifikasi");
  return (
    <main id="konten" className="page-width flex flex-1 flex-col gap-8 py-10 sm:py-16">
      <Link href="/akun" className="inline-flex min-h-11 items-center gap-2 self-start font-semibold underline-offset-2 hover:underline">
        <Icon icon={IconArrowLeft} className="size-5" />
        {t("back")}
      </Link>
      <SectionHeading id="judul-klarifikasi" level={1} label={t("eyebrow")} title={t("title")} accent={t("accent")} />
      <Suspense fallback={<p role="status">{t("loading")}</p>}>
        <Answer params={params} />
      </Suspense>
    </main>
  );
}

async function Answer({ params }: { params: PageProps<"/akun/laporan/[id]">["params"] }) {
  const { id } = await params;
  const { token } = await requireAccount(`/akun/laporan/${id}`);
  const [t, format, report] = await Promise.all([getTranslations("JawabKlarifikasi"), getFormatter(), getMyReport(token, id)]);
  if (!report) notFound();
  const open = report.status === "klarifikasi" ? report.clarifications.findLast((item) => !item.answer && new Date(item.dueAt) > new Date()) : undefined;
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <p className="text-lg">{t("about", { name: report.placeName })}</p>
      <ClarificationThread items={report.clarifications} />
      {open ? (
        <>
          <p className="rounded-2xl bg-status-partial-bg p-4 font-semibold text-status-partial-fg">
            {t("due", { date: format.dateTime(new Date(open.dueAt), { dateStyle: "long", timeStyle: "short" }) })}
          </p>
          <ClarificationAnswer reportId={report.id} remaining={Math.max(0, 10 - report.photos)} />
        </>
      ) : (
        <p className="rounded-2xl bg-bg-sunken p-4">{t("closed")}</p>
      )}
    </div>
  );
}

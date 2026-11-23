import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ReportStatusBadge } from "@/components/akun/my-reports";
import { getMyReports } from "@/lib/akun";
import { FACILITIES } from "@/lib/api";
import { requireAccount } from "@/lib/sesi";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconArrowRight, IconCircleCheck, IconCirclePlus, IconList } from "@/ui/icons";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Laporkan.terkirim");
  return { title: t("metaTitle") };
}

type Query = PageProps<"/laporkan/terkirim">["searchParams"];

/**
 * Laporan Berhasil (FR-26): konfirmasi, laporan yang baru masuk beserta statusnya, dan langkah selanjutnya. Setelah admin
 * menerbitkan langsung (ADR-0050), halaman yang sama menyebut bahwa tempatnya sudah tayang dengan label admin.
 */
export default async function Terkirim({ searchParams }: { searchParams: Query }) {
  return (
    <main id="konten" className="page-width flex flex-1 flex-col items-center py-10 sm:py-16">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <Suspense fallback={<Heading direct={false} />}>
          <Body searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function Heading({ direct }: { direct: boolean }) {
  const t = await getTranslations("Laporkan.terkirim");
  return (
    <div className="flex flex-col items-start gap-4">
      <span className="grid size-14 place-items-center rounded-2xl bg-status-accessible-bg text-status-accessible-fg">
        <Icon icon={IconCircleCheck} className="size-8" />
      </span>
      <p className="lbl">{t(direct ? "direct.eyebrow" : "eyebrow")}</p>
      <h1 className="display text-[clamp(2.25rem,1.6rem+2.4vw,3.25rem)] leading-none">
        {t(direct ? "direct.title" : "title")}
        <span className="accent"> {t(direct ? "direct.accent" : "accent")}</span>
      </h1>
      <p className="text-lg text-text-secondary">{t(direct ? "direct.intro" : "intro")}</p>
    </div>
  );
}

async function Body({ searchParams }: { searchParams: Query }) {
  const query = await searchParams;
  const direct = query.langsung === "1";
  const t = await getTranslations("Laporkan.terkirim");
  const next = t.raw("next") as string[];
  return (
    <>
      <Heading direct={direct} />
      <Suspense fallback={<p role="status">{t("loading")}</p>}>
        <Sent laporan={typeof query.laporan === "string" ? query.laporan : undefined} direct={direct} lowered={String(query.belum ?? "")} />
      </Suspense>

      {!direct && (
        <section aria-labelledby="selanjutnya" className="panel flex flex-col gap-4 rounded-3xl p-5 sm:p-7">
          <h2 id="selanjutnya" className="font-heading text-xl font-bold">
            {t("nextTitle")}
          </h2>
          <ol className="flex flex-col gap-3">
            {next.map((item, index) => (
              <li key={item} className="flex gap-3">
                <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-bg-sunken font-mono text-sm font-semibold">
                  {index + 1}
                </span>
                <span className="pt-1">{item}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/akun/laporan" className={buttonClass("primary", "md")}>
          <Icon icon={IconList} />
          {t("mine")}
        </Link>
        <Link href="/laporkan" className={buttonClass("outline", "md")}>
          <Icon icon={IconCirclePlus} />
          {t("another")}
        </Link>
      </div>
    </>
  );
}

/** Laporan yang baru dikirim, dibaca dari Laporan saya; tidak tampil bila tidak ditemukan. */
async function Sent({ laporan, direct, lowered }: { laporan?: string; direct: boolean; lowered: string }) {
  const { token } = await requireAccount(`/laporkan/terkirim${laporan ? `?laporan=${encodeURIComponent(laporan)}` : ""}`);
  const [t, tl, tf, format] = await Promise.all([getTranslations("Laporkan.terkirim"), getTranslations("LaporanSaya"), getTranslations("Fasilitas"), getFormatter()]);
  const report = laporan ? (await getMyReports(token).catch(() => ({ items: [] }))).items.find((item) => item.id === laporan) : undefined;
  if (!report) return null;
  const unknown = lowered.split(",").filter((f): f is (typeof FACILITIES)[number] => (FACILITIES as readonly string[]).includes(f));
  return (
    <div className="flex flex-col items-start gap-2 rounded-3xl bg-bg-sunken p-5">
      <p className="text-sm font-semibold text-text-secondary">{tl(`kind.${report.kind}`)}</p>
      <p className="font-heading text-xl font-bold">{report.placeName ?? tl("unnamed")}</p>
      <ReportStatusBadge status={report.status} />
      <p className="text-sm text-text-secondary">{t("submitted", { date: format.dateTime(new Date(report.submittedAt), { dateStyle: "long", timeStyle: "short" }) })}</p>
      {direct && unknown.length > 0 && <p>{t("direct.unknown", { facilities: unknown.map((f) => tf(f)).join(", ") })}</p>}
      {direct && report.status === "diterbitkan" && report.placeId && (
        <div className="flex flex-wrap gap-2 pt-2">
          <Link href={`/lokasi/${report.placeId}`} className={buttonClass("outline", "sm")}>
            {t("direct.view")}
            <Icon icon={IconArrowRight} />
          </Link>
          <Link href={`/verifikasi/tempat/${report.placeId}`} className={buttonClass("ghost", "sm")}>
            {t("direct.manage")}
          </Link>
        </div>
      )}
    </div>
  );
}

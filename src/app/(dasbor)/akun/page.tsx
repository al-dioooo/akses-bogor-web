import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { DashboardHeading } from "@/components/dasbor/dashboard-heading";
import { Agenda } from "@/components/dasbor/ringkasan/agenda";
import { ReportSummary } from "@/components/dasbor/ringkasan/report-summary";
import { Part } from "@/components/dasbor/ringkasan/section";
import { firstName } from "@/lib/dasbor";
import { requireAccount } from "@/lib/sesi";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dasbor.ringkasan");
  return { title: t("metaTitle") };
}

/**
 * Ringkasan dasbor (ADR-0046): yang menunggu pemilik akun dan laporan sendiri. Setiap bagian dimuat sendiri, jadi satu
 * panggilan API yang gagal hanya mengganti bagian itu dengan pesan galat.
 */
export default async function Ringkasan() {
  const t = await getTranslations("Dasbor.ringkasan");
  return (
    <Suspense fallback={<HomeSkeleton label={t("loading")} />}>
      <Home />
    </Suspense>
  );
}

async function Home() {
  const { token, user } = await requireAccount("/akun");
  const [t, format] = await Promise.all([getTranslations("Dasbor.ringkasan"), getFormatter()]);
  const now = new Date();
  return (
    <>
      <DashboardHeading
        id="judul-ringkasan"
        label={format.dateTime(now, { weekday: "long", day: "numeric", month: "long" })}
        title={t("greeting")}
        accent={`${firstName(user.displayName)}.`}
        intro={t(`intro.${user.role}`)}
      />
      <Part label={t("agenda.loading")} rows={1}>
        <Agenda token={token} now={now} />
      </Part>
      <Part label={t("reports.loading")} rows={2}>
        <ReportSummary token={token} />
      </Part>
    </>
  );
}

function HomeSkeleton({ label }: { label: string }) {
  return (
    <div role="status" className="flex flex-col gap-8">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="flex flex-col gap-3">
        <span className="h-4 w-32 rounded-full bg-bg-sunken" />
        <span className="h-11 w-64 rounded-2xl bg-bg-sunken" />
      </div>
      <span aria-hidden="true" className="h-24 rounded-3xl bg-bg-sunken" />
      <span aria-hidden="true" className="h-40 rounded-3xl bg-bg-sunken" />
    </div>
  );
}

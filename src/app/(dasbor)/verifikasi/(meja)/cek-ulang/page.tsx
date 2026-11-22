import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { Empty } from "@/components/verifikasi/empty";
import { RecheckList } from "@/components/verifikasi/recheck-list";
import { getRecheck } from "@/lib/verifikasi";
import { verifierSession } from "@/lib/verifikator";
import { IconRefresh } from "@/ui/icons";

/** Lokasi yang terakhir diverifikasi lebih dari 12 bulan lalu (FR-38, ADR-0035). */
export default async function CekUlang() {
  const t = await getTranslations("Verifikasi.queue");
  return (
    <Suspense fallback={<p role="status">{t("loading")}</p>}>
      <Recheck />
    </Suspense>
  );
}

async function Recheck() {
  await connection();
  const session = await verifierSession("/verifikasi/cek-ulang");
  if (!session) return null;
  const [t, recheck] = await Promise.all([getTranslations("Verifikasi.recheck"), getRecheck(session.token)]);
  return (
    <section aria-labelledby="isi-meja" className="flex flex-col gap-4">
      <h2 id="isi-meja" className="font-heading text-2xl font-bold">
        {t("heading", { count: recheck.total })}
      </h2>
      <p className="max-w-prose text-text-secondary">{t("intro")}</p>
      {recheck.items.length === 0 ? <Empty icon={IconRefresh} title={t("emptyTitle")} body={t("emptyBody")} /> : <RecheckList items={recheck.items} now={new Date()} />}
    </section>
  );
}

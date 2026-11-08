import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { getQueue, type QueueStatus } from "@/lib/verifikasi";
import { verifierSession } from "@/lib/verifikator";
import { IconClipboardCheck, IconMessage } from "@/ui/icons";
import { Empty } from "./empty";
import { QueueList } from "./queue-list";

/** Isi tab Antrean dan Menunggu jawaban. Laporan sendiri sudah disaring API (FR-37). */
export async function QueuePage(props: { status: QueueStatus; path: string }) {
  const t = await getTranslations("Verifikasi.queue");
  return (
    <Suspense fallback={<p role="status">{t("loading")}</p>}>
      <Queue {...props} />
    </Suspense>
  );
}

async function Queue({ status, path }: { status: QueueStatus; path: string }) {
  await connection();
  const session = await verifierSession(path);
  if (!session) return null;
  const [t, queue] = await Promise.all([getTranslations("Verifikasi.queue"), getQueue(session.token, status)]);
  const empty = status === "menunggu" ? { title: t("emptyTitle"), body: t("emptyBody"), icon: IconClipboardCheck } : { title: t("waitingEmptyTitle"), body: t("waitingEmptyBody"), icon: IconMessage };
  return (
    <section aria-labelledby="isi-meja" className="flex flex-col gap-4">
      <h2 id="isi-meja" className="font-heading text-2xl font-bold">
        {t("heading", { count: queue.total })}
      </h2>
      {queue.items.length === 0 ? <Empty {...empty} /> : <QueueList items={queue.items} now={new Date()} />}
      {queue.total > queue.items.length && <p className="text-text-secondary">{t("truncated", { total: queue.total })}</p>}
    </section>
  );
}

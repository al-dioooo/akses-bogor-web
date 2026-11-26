import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { deskSummary } from "@/lib/dasbor";
import { TARGET_WORKING_DAYS } from "@/lib/verifikator";
import { Icon } from "@/ui/icon";
import { IconAlertTriangle, IconClipboardCheck, IconMessage, IconRefresh, type Glyph } from "@/ui/icons";
import { queue, recheck } from "./data";
import { SectionTitle } from "./section";

type Tile = { key: string; href: string; icon: Glyph; label: string; total: number; detail: string; alert?: string };

/**
 * Meja verifikasi di Ringkasan untuk verifikator dan admin (ADR-0046): antrean dengan umur laporan terlama terhadap target
 * 3 hari kerja (ADR-0019), laporan yang menunggu jawaban dengan tenggat terdekat, dan lokasi yang perlu dicek ulang.
 */
export async function DeskSummary({ token, now }: { token: string; now: Date }) {
  const [t, format, waiting, pending, stale] = await Promise.all([
    getTranslations("Dasbor.ringkasan.meja"),
    getFormatter(),
    queue(token, "menunggu"),
    queue(token, "klarifikasi"),
    recheck(token),
  ]);
  const desk = deskSummary(waiting, pending, stale, now);
  const date = (value: string) => format.dateTime(new Date(value), { dateStyle: "medium" });
  const tiles: Tile[] = [
    {
      key: "antrean",
      href: "/verifikasi",
      icon: IconClipboardCheck,
      label: t("queue"),
      total: desk.queue.total,
      // Laporan sendiri tidak ada di antrean (FR-37), jadi antrean kosong belum tentu berarti semuanya sudah diperiksa.
      detail: desk.queue.oldest ? t("oldest", { days: desk.queue.oldest.workingDays }) : desk.queue.own > 0 ? t("queueOwn", { count: desk.queue.own }) : t("queueEmpty"),
      alert: desk.queue.overdue > 0 ? t("overdue", { count: desk.queue.overdue, target: TARGET_WORKING_DAYS }) : undefined,
    },
    {
      key: "jawaban",
      href: "/verifikasi/jawaban",
      icon: IconMessage,
      label: t("waiting"),
      total: desk.waiting.total,
      detail: desk.waiting.nextDueAt ? t("nextDue", { date: date(desk.waiting.nextDueAt) }) : desk.waiting.own > 0 ? t("waitingOwn", { count: desk.waiting.own }) : t("waitingEmpty"),
    },
    {
      key: "cek-ulang",
      href: "/verifikasi/cek-ulang",
      icon: IconRefresh,
      label: t("recheck"),
      total: desk.recheck.total,
      detail: desk.recheck.oldestVerifiedAt ? t("oldestVerified", { date: date(desk.recheck.oldestVerifiedAt) }) : t("recheckEmpty"),
    },
  ];
  return (
    <section aria-labelledby="ringkasan-meja" className="flex flex-col gap-4">
      <SectionTitle id="ringkasan-meja" title={t("title")} action={{ href: "/verifikasi", label: t("open") }} />
      <ul className="grid gap-3 md:grid-cols-3">
        {tiles.map((tile) => (
          <li key={tile.key} className="flex">
            {/* Di ponsel satu baris: label dan keterangan di kiri, angka di kanan. Mulai 768 px kartu bertumpuk. */}
            <Link
              href={tile.href}
              className="panel flex flex-1 flex-col gap-3 rounded-3xl p-5 transition-colors duration-200 hover:border-border-strong max-md:grid max-md:grid-cols-[1fr_auto] max-md:items-center max-md:gap-x-4 max-md:gap-y-1 max-md:p-4"
            >
              <span className="flex items-center gap-2 font-semibold">
                <Icon icon={tile.icon} className="size-5 text-icon-brand" />
                {tile.label}
              </span>
              <span className="display text-5xl leading-none tabular-nums max-md:col-start-2 max-md:row-span-2 max-md:row-start-1 max-md:text-4xl">
                {format.number(tile.total)}
              </span>
              <span className="flex flex-col items-start gap-2 text-sm text-text-secondary max-md:col-start-1">
                {tile.detail}
                {tile.alert && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-status-inaccessible-bg px-2.5 py-0.5 font-bold text-status-inaccessible-fg">
                    <Icon icon={IconAlertTriangle} className="size-4" />
                    {tile.alert}
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

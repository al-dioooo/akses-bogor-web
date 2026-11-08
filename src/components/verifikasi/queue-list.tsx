import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import type { QueueItem } from "@/lib/verifikasi";
import { daysWaiting, TARGET_WORKING_DAYS, workingDaysWaiting } from "@/lib/verifikator";
import { Icon } from "@/ui/icon";
import { IconAlertTriangle, IconClock, IconMessage, IconPhoto, IconTrendingDown, type Glyph } from "@/ui/icons";
import { CATEGORY_ICON } from "@/ui/place-icons";

function Flag({ icon, tone, children }: { icon: Glyph; tone: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold ${tone}`}>
      <Icon icon={icon} className="size-4" />
      {children}
    </span>
  );
}

/**
 * Antrean sebagai tumpukan tiket, terlama di atas (FR-30). Sobekan kiri menunjukkan berapa hari laporan menunggu, dan
 * berubah merah setelah lewat target 3 hari kerja. Penanda selalu teks dan ikon, bukan warna saja.
 */
export async function QueueList({ items, now }: { items: QueueItem[]; now: Date }) {
  const [t, tk, format] = await Promise.all([getTranslations("Verifikasi.queue"), getTranslations("Kategori"), getFormatter()]);
  return (
    <ol className="flex flex-col gap-3">
      {items.map((item, index) => {
        const days = daysWaiting(item.submittedAt, now);
        const overdue = item.status === "menunggu" && workingDaysWaiting(item.submittedAt, now) > TARGET_WORKING_DAYS;
        return (
          <li key={item.id}>
            <Link
              href={`/verifikasi/laporan/${item.id}`}
              className="group grid grid-cols-[5rem_minmax(0,1fr)] overflow-hidden rounded-3xl border-2 border-border-subtle bg-surface-raised transition-colors hover:border-border-strong sm:grid-cols-[7rem_minmax(0,1fr)]"
            >
              <span
                className={`flex flex-col items-center justify-center gap-1 border-r-2 border-dashed border-border-subtle px-2 py-4 text-center ${
                  overdue ? "bg-status-inaccessible-bg text-status-inaccessible-fg" : "bg-bg-sunken"
                }`}
              >
                <span className="sr-only">{t("position", { position: index + 1 })}</span>
                <span className="font-mono text-3xl leading-none font-medium sm:text-4xl">{days}</span>
                <span className="text-xs leading-tight font-semibold">{t("dayUnit")}</span>
              </span>
              <span className="flex min-w-0 flex-col gap-2 p-4 sm:p-5">
                <span className="lbl flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>{t(`kind.${item.kind}`)}</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Icon icon={CATEGORY_ICON[item.category]} className="size-4" />
                    {tk(item.category)}
                  </span>
                </span>
                <span className="font-heading text-lg leading-snug font-bold break-words group-hover:underline sm:text-xl">{item.name}</span>
                <span className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-text-secondary">
                  <span>{item.district.name}</span>
                  <span>{t("reporter", { name: item.reporterName })}</span>
                  <span className="inline-flex items-center gap-1">
                    <Icon icon={IconPhoto} className="size-4" />
                    {t("photos", { count: item.photos })}
                  </span>
                </span>
                {(overdue || item.worsens || item.answered || item.clarificationDueAt) && (
                  <span className="flex flex-wrap gap-2">
                    {overdue && (
                      <Flag icon={IconAlertTriangle} tone="bg-status-inaccessible-bg text-status-inaccessible-fg">
                        {t("overdue")}
                      </Flag>
                    )}
                    {item.worsens && (
                      <Flag icon={IconTrendingDown} tone="bg-status-partial-bg text-status-partial-fg">
                        {t("worsens")}
                      </Flag>
                    )}
                    {item.answered && item.status === "menunggu" && (
                      <Flag icon={IconMessage} tone="bg-status-accessible-bg text-status-accessible-fg">
                        {t("answered")}
                      </Flag>
                    )}
                    {item.status === "klarifikasi" && item.clarificationDueAt && (
                      <Flag icon={IconClock} tone="bg-status-unknown-bg text-status-unknown-fg">
                        {t("due", { date: format.dateTime(new Date(item.clarificationDueAt), { dateStyle: "long" }) })}
                      </Flag>
                    )}
                  </span>
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

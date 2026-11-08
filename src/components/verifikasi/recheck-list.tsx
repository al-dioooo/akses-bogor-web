import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import type { RecheckItem } from "@/lib/verifikasi";
import { Icon } from "@/ui/icon";
import { IconChevronRight } from "@/ui/icons";
import { CATEGORY_ICON } from "@/ui/place-icons";
import { StatusBadge } from "@/ui/status-badge";

const MONTH_MS = 30.44 * 24 * 60 * 60 * 1000;

/** Lokasi yang perlu dicek ulang (FR-38), terlama dulu, dengan tautan ke Detail tempat Edit lokasi berada. */
export async function RecheckList({ items, now }: { items: RecheckItem[]; now: Date }) {
  const [t, tk, format] = await Promise.all([getTranslations("Verifikasi.recheck"), getTranslations("Kategori"), getFormatter()]);
  return (
    <ul className="flex flex-col divide-y-2 divide-border-subtle rounded-3xl border-2 border-border-subtle bg-surface-raised">
      {items.map((place) => (
        <li key={place.id}>
          <Link href={`/lokasi/${place.id}`} className="group flex items-center gap-4 p-4 sm:p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-bg-sunken text-icon-brand">
              <Icon icon={CATEGORY_ICON[place.category]} className="size-5.5" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="font-heading text-lg font-bold break-words group-hover:underline">{place.name}</span>
              <span className="text-sm text-text-secondary">
                {tk(place.category)} · {place.district.name} · {t("verified", { date: format.dateTime(new Date(place.lastVerifiedAt), { dateStyle: "long" }) })} (
                {t("ago", { months: Math.floor((now.getTime() - new Date(place.lastVerifiedAt).getTime()) / MONTH_MS) })})
              </span>
            </span>
            <span className="max-sm:hidden">
              <StatusBadge status={place.status} size="sm" />
            </span>
            <Icon icon={IconChevronRight} className="size-5 text-icon-secondary" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

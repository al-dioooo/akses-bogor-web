import Image from "next/image";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import type { PlaceListItem } from "@/lib/api";
import { Icon } from "@/ui/icon";
import { IconCalendarCheck, IconMapPin } from "@/ui/icons";
import { CATEGORY_ICON } from "@/ui/place-icons";
import { StatusBadge } from "@/ui/status-badge";

/** Location card (Explore · DS v1). Satu tautan per kartu; seluruh kartu bisa diklik lewat tautan judul. */
export function LocationCard({ place }: { place: PlaceListItem }) {
  const t = useTranslations("Lokasi");
  const tk = useTranslations("Kategori");
  const format = useFormatter();
  return (
    <article className="group glass card-lift relative flex h-full flex-col overflow-hidden rounded-2xl">
      <div className="relative aspect-[16/9] overflow-hidden">
        {place.coverPhoto?.url ? (
          <Image src={place.coverPhoto.url} alt={place.coverPhoto.alt} fill unoptimized className="object-cover" />
        ) : (
          <CategoryArt place={place} />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <StatusBadge status={place.status} size="sm" />
        <h2 className="font-heading text-lg leading-snug font-bold tracking-[-0.02em]">
          <Link href={`/lokasi/${place.id}`} className="after:absolute after:inset-0 after:rounded-2xl">
            {place.name}
          </Link>
        </h2>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <Icon icon={CATEGORY_ICON[place.category]} className="size-4" />
            {tk(place.category)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Icon icon={IconMapPin} className="size-4" />
            {place.district.name}
          </span>
        </p>
        <p className="font-semibold">
          {t("summary", { available: place.summary.available, relevant: place.summary.relevant })}
          {place.summary.unknown > 0 && (
            <span className="font-normal text-text-secondary"> · {t("unknown", { count: place.summary.unknown })}</span>
          )}
        </p>
        <p className="mt-auto inline-flex items-center gap-1.5 text-sm text-text-secondary">
          <Icon icon={IconCalendarCheck} className="size-4" />
          {t("verified", { date: format.dateTime(new Date(place.lastVerifiedAt), { dateStyle: "medium" }) })}
        </p>
      </div>
    </article>
  );
}

/** Pengganti foto: ikon kategori di atas gradasi aurora. Hiasan saja. */
function CategoryArt({ place }: { place: PlaceListItem }) {
  return (
    <div
      aria-hidden="true"
      className="grid size-full place-items-center bg-[linear-gradient(135deg,var(--color-bg-aurora-inclusion),var(--color-bg-aurora-rain)_55%,var(--color-bg-aurora-garden))]"
    >
      <span className="grid size-16 -rotate-6 place-items-center rounded-xl bg-surface-glass-strong text-icon-brand shadow-[0_8px_24px_var(--color-shadow-glass)] transition-transform duration-300 ease-out-expo group-hover:rotate-0">
        <Icon icon={CATEGORY_ICON[place.category]} className="size-8" />
      </span>
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import type { PlaceListItem } from "@/lib/api";
import { FacilityMeter } from "@/ui/facility-meter";
import { Icon } from "@/ui/icon";
import { IconArrowRight, IconMapPin } from "@/ui/icons";
import { CATEGORY_ICON } from "@/ui/place-icons";
import { StatusBadge } from "@/ui/status-badge";

/** Location card (ADR-0027). Satu tautan per kartu; seluruh kartu bisa diklik lewat tautan judul. */
export function LocationCard({ place }: { place: PlaceListItem }) {
  const t = useTranslations("Lokasi");
  const tk = useTranslations("Kategori");
  const format = useFormatter();
  return (
    <article className="group card-lift relative flex h-full flex-col overflow-hidden rounded-3xl border border-border-subtle bg-surface-raised">
      {place.coverPhoto?.url && (
        <span className="relative block aspect-[16/10] overflow-hidden border-b border-border-subtle">
          <Image src={place.coverPhoto.url} alt={place.coverPhoto.alt} fill unoptimized className="object-cover" />
        </span>
      )}
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary">
            <span className="inline-flex items-center gap-1.5 font-semibold text-text-primary">
              <Icon icon={CATEGORY_ICON[place.category]} className="size-4.5 text-icon-brand" />
              {tk(place.category)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon icon={IconMapPin} className="size-4" />
              {place.district.name}
            </span>
          </p>
        </div>
        <h2 className="display text-[1.625rem] leading-[1.05] tracking-[-0.025em]">
          <Link href={`/lokasi/${place.id}`} className="after:absolute after:inset-0 after:rounded-3xl">
            {place.name}
          </Link>
        </h2>
        <span className="flex">
          <StatusBadge status={place.status} size="sm" />
        </span>
        <div className="mt-auto flex flex-col gap-2.5 pt-2">
          <p className="font-semibold">
            {t("summary", { available: place.summary.available, relevant: place.summary.relevant })}
            {place.summary.unknown > 0 && (
              <span className="font-normal text-text-secondary"> · {t("unknown", { count: place.summary.unknown })}</span>
            )}
          </p>
          <FacilityMeter summary={place.summary} status={place.status} />
        </div>
        <p className="flex items-center justify-between border-t border-border-subtle pt-4 font-mono text-xs text-text-secondary">
          {t("verified", { date: format.dateTime(new Date(place.lastVerifiedAt), { dateStyle: "medium" }) })}
          <Icon icon={IconArrowRight} className="size-4.5 text-icon-primary transition-transform duration-200 group-hover:translate-x-0.5" />
        </p>
      </div>
    </article>
  );
}

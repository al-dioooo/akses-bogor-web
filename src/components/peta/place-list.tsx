import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "@/ui/icon";
import { IconMapPin } from "@/ui/icons";
import { CATEGORY_ICON } from "@/ui/place-icons";
import { StatusBadge } from "@/ui/status-badge";
import { PlacePin } from "@/ui/place-pin";
import type { MapPlace } from "./places";

/**
 * Daftar lokasi Peta, alternatif setara untuk peta (ADR-0016): nama, kategori, dan status sebagai teks, dengan tautan
 * ke Detail. `onShow` menambah tombol untuk memilih lokasi itu di peta.
 */
export function PlaceList({ places, labelledBy, onShow }: { places: MapPlace[]; labelledBy: string; onShow?: (id: string) => void }) {
  const t = useTranslations("Peta");
  const tk = useTranslations("Kategori");
  return (
    <ul aria-labelledby={labelledBy} className="flex flex-col">
      {places.map((place) => (
        <li key={place.id} className="flex items-center gap-3 border-t border-border-subtle py-3 first:border-t-0">
          <PlacePin place={place} className="size-8" />
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
            <h3 className="font-heading text-base leading-snug font-bold">
              <Link href={`/lokasi/${place.id}`} className="underline-offset-4 hover:underline">
                {place.name}
              </Link>
            </h3>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-secondary">
              <span className="inline-flex items-center gap-1">
                <Icon icon={CATEGORY_ICON[place.category]} className="size-4 text-icon-brand" />
                {tk(place.category)}
              </span>
              <StatusBadge status={place.status} size="sm" />
            </p>
          </div>
          {onShow && (
            <button
              type="button"
              onClick={() => onShow(place.id)}
              data-tunjukkan={place.id}
              aria-label={t("list.showPlace", { name: place.name })}
              className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-border-subtle hover:border-border-strong hover:bg-surface-hover"
            >
              <Icon icon={IconMapPin} />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

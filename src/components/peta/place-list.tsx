import Link from "next/link";
import { useTranslations } from "next-intl";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconMapPin } from "@/ui/icons";
import { CATEGORY_ICON } from "@/ui/place-icons";
import { StatusBadge } from "@/ui/status-badge";
import type { MapPlace } from "./places";

/**
 * Daftar lokasi Peta, alternatif setara untuk peta (ADR-0016): nama, kategori, dan status sebagai teks, dengan tautan
 * ke Detail. `onShow` menambah tombol untuk memilih lokasi itu di peta.
 */
export function PlaceList({ places, onShow }: { places: MapPlace[]; onShow?: (id: string) => void }) {
  const t = useTranslations("Peta");
  const tk = useTranslations("Kategori");
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {places.map((place) => (
        <li key={place.id} className="flex flex-col items-start gap-3 rounded-2xl border border-border-subtle bg-surface-raised p-5">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <Icon icon={CATEGORY_ICON[place.category]} className="size-4.5 text-icon-brand" />
            {tk(place.category)}
          </p>
          <h3 className="font-heading text-xl leading-tight font-bold">
            <Link href={`/lokasi/${place.id}`} className="underline-offset-4 hover:underline">
              {place.name}
            </Link>
          </h3>
          <StatusBadge status={place.status} size="sm" />
          {onShow && (
            <button type="button" onClick={() => onShow(place.id)} className={buttonClass("outline", "sm", "mt-auto")}>
              <Icon icon={IconMapPin} />
              {t("list.show")}
              <span className="sr-only">: {place.name}</span>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

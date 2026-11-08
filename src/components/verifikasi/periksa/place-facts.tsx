import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import type { Review } from "@/lib/verifikasi";
import { Icon } from "@/ui/icon";
import { IconAlertTriangle } from "@/ui/icons";
import { ChangeMark } from "./parts";

type Row = { key: string; label: string; current?: string | null; reported: string | null };

/** Nama, kategori, kecamatan, patokan, dan titik: laporan di samping data saat ini (FR-31), lalu lokasi mirip (FR-23). */
export function PlaceFacts({ review }: { review: Review }) {
  const t = useTranslations("Pemeriksaan");
  const tk = useTranslations("Kategori");
  const format = useFormatter();
  const { submission: s, place } = review;
  const point = (p: { lat: number; lng: number }) =>
    t("place.coordinates", { lat: format.number(p.lat, { maximumFractionDigits: 5 }), lng: format.number(p.lng, { maximumFractionDigits: 5 }) });
  const rows: Row[] = [
    { key: "name", label: t("place.name"), current: place?.name, reported: s.name },
    { key: "category", label: t("place.category"), current: place && tk(place.category), reported: tk(s.category) },
    { key: "district", label: t("place.district"), current: place?.district.name, reported: s.district.name },
    { key: "landmark", label: t("place.landmark"), current: place?.landmark, reported: s.landmark },
    { key: "point", label: t("place.point"), current: place && point(place.location), reported: point(s.location) },
  ];
  return (
    <div className="flex flex-col gap-4">
      {review.kind === "kekurangan" && <p className="text-text-secondary">{t("place.fixed")}</p>}
      <dl className="flex flex-col gap-px overflow-hidden rounded-3xl border-2 border-border-subtle bg-border-subtle">
        {rows.map((row) => (
          <div key={row.key} className={`grid gap-x-6 gap-y-2 bg-surface-raised p-4 ${place ? "sm:grid-cols-[9rem_1fr_1fr]" : "sm:grid-cols-[9rem_1fr]"}`}>
            <dt className="font-semibold">{row.label}</dt>
            {place && (
              <dd className="flex min-w-0 flex-col gap-1">
                <span className="lbl text-text-secondary">{t("compare.current")}</span>
                <span className="break-words">{row.current ?? t("place.empty")}</span>
              </dd>
            )}
            <dd className="flex min-w-0 flex-col items-start gap-1">
              <span className="lbl flex items-center gap-2 text-text-secondary">
                {t("compare.reported")}
                {place && <ChangeMark changed={(row.current ?? null) !== row.reported} />}
              </span>
              <span className="break-words">{row.reported ?? t("place.empty")}</span>
            </dd>
          </div>
        ))}
      </dl>
      {review.nearby.length > 0 && (
        <div role="note" className="flex flex-col gap-2 rounded-2xl bg-status-partial-bg p-4 text-status-partial-fg">
          <p className="flex items-center gap-2 font-bold">
            <Icon icon={IconAlertTriangle} />
            {t("place.nearbyTitle")}
          </p>
          <p>{t("place.nearbyBody")}</p>
          <ul className="flex flex-col gap-1">
            {review.nearby.map((near) => (
              <li key={near.id}>
                <Link href={`/lokasi/${near.id}`} className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2">
                  {near.name}
                </Link>{" "}
                · {t("place.distance", { meters: near.distanceMeters })}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

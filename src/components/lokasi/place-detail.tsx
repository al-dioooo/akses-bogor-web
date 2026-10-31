import Image from "next/image";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import type { PlaceDetail as Place } from "@/lib/api";
import { buttonClass } from "@/ui/button-styles";
import { FacilityMeter } from "@/ui/facility-meter";
import { Icon } from "@/ui/icon";
import { IconAlertTriangle, IconMessageReport, IconPencil, IconPhotoOff } from "@/ui/icons";
import { STATUS_ICON, STATUS_TONE } from "@/ui/place-icons";
import { StatusBadge } from "@/ui/status-badge";
import { FacilityList } from "./facility-list";

/** Detail lokasi (FR-06, FR-07, FR-38): status dengan alasannya, ringkasan X dari Y, fasilitas, foto, dan verifikasi. */
export async function PlaceDetail({ place }: { place: Place }) {
  const [t, tk, tf, tj, ta, ts, tr, format] = await Promise.all([
    getTranslations("Detail"),
    getTranslations("Kategori"),
    getTranslations("Fasilitas"),
    getTranslations("Jawaban"),
    getTranslations("Alasan"),
    getTranslations("Status"),
    getTranslations("Rute"),
    getFormatter(),
  ]);
  const lower = (text: string) => text.toLocaleLowerCase("id");
  // Kalimat alasan status, mis. "Sebagian: Guiding Block tidak tersedia (tidak sesuai)" (ADR-0018, ADR-0022).
  const reasons = place.because.map(
    (item) => `${tf(item.facility)} ${lower(tj(item.answer))}${item.reason ? ` (${lower(ta(item.reason))})` : ""}`,
  );
  const sentence = `${ts(place.status)}: ${reasons.length ? format.list(reasons, { type: "conjunction" }) : t("allAvailable")}`;
  const photos = place.photos.filter((photo) => photo.url);

  return (
    <article className="flex flex-col gap-(--spacing-3xl)">
      <header className="grid items-end gap-8 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
        <div className="flex flex-col items-start gap-4">
          <p className="lbl">
            {tk(place.category)} · {place.district.name}
          </p>
          <h1 className="display text-[clamp(2.6rem,1.4rem+3.6vw,5rem)] leading-[0.95]">{place.name}</h1>
          {place.landmark && (
            <p className="text-lg text-text-secondary">
              <span className="font-semibold text-text-primary">{t("landmark")}:</span> {place.landmark}
            </p>
          )}
        </div>
        <section aria-labelledby="judul-ringkasan" className={`flex flex-col items-start gap-4 rounded-[1.75rem] p-6 sm:p-7 ${STATUS_TONE[place.status]}`}>
          <h2 id="judul-ringkasan" className="sr-only">
            {t("summaryTitle")}
          </h2>
          <StatusBadge status={place.status} raised />
          {place.summary.relevant > 0 ? (
            <p className="flex flex-wrap items-baseline gap-x-3 text-text-primary">
              <span className="display text-7xl leading-none tabular-nums">{place.summary.available}</span>{" "}
              <span className="text-lg font-bold">{t("ofRelevant", { relevant: place.summary.relevant })}</span>
            </p>
          ) : (
            <p className="text-lg font-bold text-text-primary">{t("summary", { available: 0, relevant: 0 })}</p>
          )}
          <FacilityMeter summary={place.summary} status={place.status} className="w-full max-w-xs" />
          {place.summary.unknown > 0 && <p className="text-text-secondary">{t("unknown", { count: place.summary.unknown })}</p>}
          <p className="flex gap-2.5 font-semibold">
            <Icon icon={STATUS_ICON[place.status]} className="mt-0.5 size-5" />
            {sentence}
          </p>
          <p className="font-mono text-xs tracking-[0.06em] text-text-secondary uppercase">
            {t("verified", { date: format.dateTime(new Date(place.lastVerifiedAt), { dateStyle: "long" }) })}
          </p>
          {place.needsRecheck && (
            <div className="flex gap-3 rounded-2xl bg-surface-raised p-4 text-text-primary">
              <Icon icon={IconAlertTriangle} className="mt-0.5 size-5 text-status-partial-fg" />
              <p>
                <strong className="block">{t("recheckTitle")}</strong>
                {t("recheckBody")}
              </p>
            </div>
          )}
        </section>
      </header>

      <section aria-labelledby="judul-fasilitas" className="flex flex-col gap-6">
        <div className="flex flex-col items-start gap-3">
          <p className="lbl">{tr("label")}</p>
          <h2 id="judul-fasilitas" className="display text-[clamp(2rem,1.4rem+1.6vw,2.75rem)] leading-none">
            {t("facilitiesTitle")}
          </h2>
        </div>
        <FacilityList facilities={place.facilities} />
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href={`/laporkan?lokasi=${place.id}`} className={buttonClass("outline", "md")}>
            <Icon icon={IconPencil} />
            {t("edit")}
          </Link>
          <Link href={`/laporkan?lokasi=${place.id}&jenis=kekurangan`} className={buttonClass("outline", "md")}>
            <Icon icon={IconMessageReport} />
            {t("report")}
          </Link>
        </div>
      </section>

      {place.description && (
        <section aria-labelledby="judul-deskripsi" className="flex max-w-3xl flex-col gap-3">
          <h2 id="judul-deskripsi" className="display text-3xl">
            {t("descriptionTitle")}
          </h2>
          <p className="text-lg text-text-secondary">{place.description}</p>
        </section>
      )}

      <section aria-labelledby="judul-foto" className="flex flex-col gap-4">
        <h2 id="judul-foto" className="display text-3xl">
          {t("photosTitle")}
        </h2>
        {photos.length ? (
          <ul className="flex gap-4 overflow-x-auto pb-2">
            {photos.map((photo) => (
              <li key={photo.id} className="w-72 shrink-0">
                <figure className="flex flex-col gap-2">
                  <span className="relative block aspect-[4/3] overflow-hidden rounded-3xl">
                    <Image src={photo.url as string} alt={photo.alt} fill unoptimized className="object-cover" />
                  </span>
                  {photo.caption && <figcaption className="text-sm text-text-secondary">{photo.caption}</figcaption>}
                </figure>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-3 rounded-3xl bg-bg-sunken p-6 text-text-secondary">
            <Icon icon={IconPhotoOff} className="size-6" />
            {t("noPhotos")}
          </p>
        )}
      </section>
    </article>
  );
}

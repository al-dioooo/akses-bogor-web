import Image from "next/image";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import type { PlaceDetail as Place } from "@/lib/api";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconAlertTriangle, IconCalendarCheck, IconMapPin, IconMessageReport, IconPencil, IconPhotoOff } from "@/ui/icons";
import { CATEGORY_ICON, STATUS_ICON, STATUS_TONE } from "@/ui/place-icons";
import { StatusBadge } from "@/ui/status-badge";
import { FacilityList } from "./facility-list";
import { ScoreRing } from "./score-ring";

/** Detail lokasi (FR-06, FR-07, FR-38): status dengan alasannya, ringkasan X dari Y, fasilitas, foto, dan verifikasi. */
export async function PlaceDetail({ place }: { place: Place }) {
  const [t, tk, tf, tj, ta, ts, format] = await Promise.all([
    getTranslations("Detail"),
    getTranslations("Kategori"),
    getTranslations("Fasilitas"),
    getTranslations("Jawaban"),
    getTranslations("Alasan"),
    getTranslations("Status"),
    getFormatter(),
  ]);
  const lower = (text: string) => text.toLocaleLowerCase("id");
  // Kalimat alasan status, mis. "Sebagian: Guiding Block tidak tersedia (tidak sesuai)" (ADR-0018, ADR-0022).
  const reasons = place.because.map(
    (item) => `${tf(item.facility)} ${lower(tj(item.answer))}${item.reason ? ` (${lower(ta(item.reason))})` : ""}`,
  );
  const sentence = `${ts(place.status)}: ${reasons.length ? format.list(reasons, { type: "conjunction" }) : t("allAvailable")}`;
  const cover = place.photos.find((photo) => photo.url);

  return (
    <article className="flex flex-col gap-10">
      <header className="grid items-center gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col items-start gap-4">
          <StatusBadge status={place.status} />
          <h1 className="font-heading text-[clamp(2rem,1.5rem+2.2vw,3.25rem)] leading-[1.06] font-extrabold tracking-[-0.035em]">
            {place.name}
          </h1>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <Icon icon={CATEGORY_ICON[place.category]} />
              {tk(place.category)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon icon={IconMapPin} />
              {place.district.name}
            </span>
          </p>
          {place.landmark && (
            <p>
              <span className="font-semibold">{t("landmark")}:</span> {place.landmark}
            </p>
          )}
        </div>
        <div aria-hidden={!cover} className="relative aspect-[16/10] overflow-hidden rounded-2xl">
          {cover?.url ? (
            <Image src={cover.url} alt={cover.alt} fill unoptimized className="object-cover" />
          ) : (
            <div className="grid size-full place-items-center bg-[linear-gradient(135deg,var(--color-bg-aurora-inclusion),var(--color-bg-aurora-rain)_55%,var(--color-bg-aurora-garden))]">
              <span className="grid size-24 -rotate-6 place-items-center rounded-2xl bg-surface-glass-strong text-icon-brand shadow-[0_12px_32px_var(--color-shadow-glass)]">
                <Icon icon={CATEGORY_ICON[place.category]} className="size-12" />
              </span>
            </div>
          )}
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.3fr]">
        <section aria-labelledby="judul-ringkasan" className="glass flex flex-col gap-5 rounded-2xl p-6 lg:sticky lg:top-24">
          <h2 id="judul-ringkasan" className="font-heading text-lg font-bold tracking-[-0.02em]">
            {t("summaryTitle")}
          </h2>
          <div className="flex items-center gap-5">
            <ScoreRing summary={place.summary} status={place.status} ofLabel={t("ringOf", { relevant: place.summary.relevant })} />
            <div className="flex flex-col gap-1">
              <p className="text-lg font-semibold">
                {t("summary", { available: place.summary.available, relevant: place.summary.relevant })}
              </p>
              {place.summary.unknown > 0 && <p className="text-text-secondary">{t("unknown", { count: place.summary.unknown })}</p>}
            </div>
          </div>
          <p className={`flex gap-2.5 rounded-lg p-4 font-medium ${STATUS_TONE[place.status]}`}>
            <Icon icon={STATUS_ICON[place.status]} className="mt-0.5 size-5" />
            {sentence}
          </p>
          <p className="inline-flex items-center gap-2 text-sm text-text-secondary">
            <Icon icon={IconCalendarCheck} className="size-4.5" />
            {t("verified", { date: format.dateTime(new Date(place.lastVerifiedAt), { dateStyle: "long" }) })}
          </p>
          {place.needsRecheck && (
            <div className="flex gap-3 rounded-lg border border-status-partial-fg/30 bg-status-partial-bg p-4 text-status-partial-fg">
              <Icon icon={IconAlertTriangle} className="mt-0.5 size-5" />
              <p>
                <strong className="block">{t("recheckTitle")}</strong>
                {t("recheckBody")}
              </p>
            </div>
          )}
        </section>

        <section aria-labelledby="judul-fasilitas" className="flex flex-col gap-4">
          <h2 id="judul-fasilitas" className="font-heading text-lg font-bold tracking-[-0.02em]">
            {t("facilitiesTitle")}
          </h2>
          <FacilityList facilities={place.facilities} />
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href={`/laporkan?lokasi=${place.id}`} className={buttonClass("glass", "md")}>
              <Icon icon={IconPencil} />
              {t("edit")}
            </Link>
            <Link href={`/laporkan?lokasi=${place.id}&jenis=kekurangan`} className={buttonClass("glass", "md")}>
              <Icon icon={IconMessageReport} />
              {t("report")}
            </Link>
          </div>
        </section>
      </div>

      {place.description && (
        <section aria-labelledby="judul-deskripsi" className="flex max-w-3xl flex-col gap-3">
          <h2 id="judul-deskripsi" className="font-heading text-lg font-bold tracking-[-0.02em]">
            {t("descriptionTitle")}
          </h2>
          <p className="text-lg text-text-secondary">{place.description}</p>
        </section>
      )}

      <section aria-labelledby="judul-foto" className="flex flex-col gap-3">
        <h2 id="judul-foto" className="font-heading text-lg font-bold tracking-[-0.02em]">
          {t("photosTitle")}
        </h2>
        {place.photos.some((photo) => photo.url) ? (
          <ul className="flex gap-3 overflow-x-auto pb-2">
            {place.photos
              .filter((photo) => photo.url)
              .map((photo) => (
                <li key={photo.id} className="w-64 shrink-0">
                  <figure className="flex flex-col gap-2">
                    <span className="relative block aspect-[4/3] overflow-hidden rounded-lg">
                      <Image src={photo.url as string} alt={photo.alt} fill unoptimized className="object-cover" />
                    </span>
                    {photo.caption && <figcaption className="text-sm text-text-secondary">{photo.caption}</figcaption>}
                  </figure>
                </li>
              ))}
          </ul>
        ) : (
          <p className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-border-subtle p-5 text-text-secondary">
            <Icon icon={IconPhotoOff} className="size-6" />
            {t("noPhotos")}
          </p>
        )}
      </section>
    </article>
  );
}

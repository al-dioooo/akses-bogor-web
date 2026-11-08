import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { Review, ReviewPhoto } from "@/lib/verifikasi";
import { Icon } from "@/ui/icon";
import { IconBlur, IconEyeOff, IconMessage } from "@/ui/icons";

/** Alamat foto laporan lewat server web; pratinjau kabur bila ada area (ADR-0037). */
export const reviewPhotoSrc = (photo: Pick<ReviewPhoto, "id" | "blur">, version = 0) =>
  `/verifikasi/foto/${photo.id}?versi=${photo.blur.length ? "kabur" : "asli"}${version ? `&v=${version}` : ""}`;

/**
 * Foto laporan untuk diperiksa (FR-31, FR-34), dengan tag, keterangan, dan penanda foto dari jawaban klarifikasi,
 * disembunyikan, atau dikaburkan. `controls` adalah tempat moderasi per foto.
 */
export function PhotoGallery({ review, controls }: { review: Review; controls?: (photo: ReviewPhoto, index: number) => ReactNode }) {
  const t = useTranslations("Pemeriksaan.photos");
  const tags = useTranslations("Laporkan.foto.tags");
  if (review.photos.length === 0) return <p className="rounded-2xl bg-bg-sunken p-4">{t("none")}</p>;
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {review.photos.map((photo, index) => (
        <li key={photo.id}>
          <figure className="flex h-full flex-col overflow-hidden rounded-3xl border-2 border-border-subtle bg-surface-raised">
            <a href={reviewPhotoSrc(photo)} target="_blank" rel="noopener" className="block bg-bg-sunken">
              {/* Foto privat dari route handler sendiri; tidak lewat optimasi gambar Next supaya tidak tersimpan di cache. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={reviewPhotoSrc(photo)}
                alt={photo.alt || tags(photo.tag)}
                width={photo.width}
                height={photo.height}
                className={`aspect-4/3 w-full object-contain ${photo.hidden ? "opacity-40" : ""}`}
              />
              <span className="sr-only">{t("open", { number: index + 1 })}</span>
            </a>
            <figcaption className="flex flex-1 flex-col gap-2 p-4">
              <span className="lbl">{tags(photo.tag)}</span>
              {photo.caption && <span className="break-words">{photo.caption}</span>}
              <span className="flex flex-wrap gap-2 text-sm font-semibold">
                {photo.clarificationId && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-status-accessible-bg px-2.5 py-1 text-status-accessible-fg">
                    <Icon icon={IconMessage} className="size-4" />
                    {t("fromAnswer")}
                  </span>
                )}
                {photo.hidden && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-status-unknown-bg px-2.5 py-1 text-status-unknown-fg">
                    <Icon icon={IconEyeOff} className="size-4" />
                    {t("hidden")}
                  </span>
                )}
                {photo.blur.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-brand-subtle px-2.5 py-1">
                    <Icon icon={IconBlur} className="size-4" />
                    {t("blurred", { count: photo.blur.length })}
                  </span>
                )}
              </span>
              {controls?.(photo, index)}
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  );
}

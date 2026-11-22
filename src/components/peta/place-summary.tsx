"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { RefObject } from "react";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconArrowRight, IconX } from "@/ui/icons";
import { CATEGORY_ICON } from "@/ui/place-icons";
import { StatusBadge } from "@/ui/status-badge";
import type { MapPlace } from "./places";

/** Ringkasan lokasi yang dipilih di peta, di dalam panel daftar. Judulnya menerima fokus saat lokasi dipilih. */
export function PlaceSummary({ place, headingRef, onClose }: { place: MapPlace; headingRef: RefObject<HTMLHeadingElement | null>; onClose: () => void }) {
  const t = useTranslations("Peta");
  const tk = useTranslations("Kategori");
  return (
    <section aria-labelledby="judul-ringkasan" className="relative flex flex-col items-start gap-3 px-5 pt-1 pb-5">
      <p className="inline-flex items-center gap-1.5 pr-12 text-sm font-semibold">
        <Icon icon={CATEGORY_ICON[place.category]} className="size-4.5 text-icon-brand" />
        {tk(place.category)}
      </p>
      <h3 id="judul-ringkasan" ref={headingRef} tabIndex={-1} className="pr-12 font-heading text-2xl leading-tight font-bold">
        {place.name}
      </h3>
      <StatusBadge status={place.status} />
      <Link href={`/lokasi/${place.id}`} className={buttonClass("primary", "sm", "mt-1")}>
        {t("summary.detail")}
        <Icon icon={IconArrowRight} />
      </Link>
      <button
        type="button"
        onClick={onClose}
        aria-label={t("summary.close")}
        className="absolute top-0 right-3 grid size-11 place-items-center rounded-full border-2 border-border-subtle hover:border-border-strong hover:bg-surface-hover"
      >
        <Icon icon={IconX} />
      </button>
    </section>
  );
}
